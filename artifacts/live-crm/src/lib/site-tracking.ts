/**
 * 사이트 전체 트래킹 — 페이지뷰 / 클릭 / 세션
 *
 *  - visitor_id: localStorage 영구 UUID
 *  - session_id: sessionStorage UUID, 30분 비활성 시 갱신
 *  - 클릭 위임: data-track 속성 + 주요 인터랙티브 요소(a, button)
 *  - 배치 큐 5초마다 flush, 페이지 떠날 때 sendBeacon
 *  - /admin 하위는 모니터링에서 제외 (자기 클릭 노이즈 방지)
 */

const STORAGE_VISITOR = "yjd_visitor_id";
const STORAGE_SESSION = "yjd_session";
const STORAGE_SESSION_LAST = "yjd_session_last";
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30분
const FLUSH_INTERVAL_MS = 5000;
const ENDPOINT = "/api/site-events";
const MAX_QUEUE = 100;

type EventType = "page_view" | "click" | "session_start" | "session_end" | "page_leave";

interface TrackEvent {
  eventType: EventType;
  path?: string;
  target?: string;
  targetLabel?: string;
  visitorId: string;
  sessionId: string;
  referrer?: string;
  viewport?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
  createdAt: string;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getVisitorId(): string {
  try {
    let v = localStorage.getItem(STORAGE_VISITOR);
    if (!v) {
      v = uuid();
      localStorage.setItem(STORAGE_VISITOR, v);
    }
    return v;
  } catch {
    return "v-anon-" + uuid();
  }
}

function getSessionId(): { id: string; isNew: boolean } {
  try {
    const now = Date.now();
    const lastTouchStr = sessionStorage.getItem(STORAGE_SESSION_LAST);
    const lastTouch = lastTouchStr ? parseInt(lastTouchStr, 10) : 0;
    const idle = now - lastTouch;

    let id = sessionStorage.getItem(STORAGE_SESSION);
    let isNew = false;

    if (!id || idle > SESSION_IDLE_MS) {
      id = uuid();
      sessionStorage.setItem(STORAGE_SESSION, id);
      isNew = true;
    }
    sessionStorage.setItem(STORAGE_SESSION_LAST, String(now));
    return { id, isNew };
  } catch {
    return { id: "s-anon-" + uuid(), isNew: true };
  }
}

function shouldSkip(path: string): boolean {
  if (!path) return true;
  // 어드민 페이지는 자기 자신 트래킹 안 함
  if (path.startsWith("/admin")) return true;
  if (path.startsWith("/editor")) return true;
  if (path.startsWith("/auth/callback")) return true;
  return false;
}

class TrackingClient {
  private queue: TrackEvent[] = [];
  private timer: number | null = null;
  private currentPath = "";
  private pageEnteredAt = 0;
  private bound = false;

  init() {
    if (this.bound) return;
    if (typeof window === "undefined") return;
    this.bound = true;

    const { id: sessionId, isNew } = getSessionId();
    const visitorId = getVisitorId();

    if (isNew) {
      this.enqueue({
        eventType: "session_start",
        visitorId, sessionId,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || "",
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        createdAt: new Date().toISOString(),
      });
    }

    // 초기 페이지뷰
    this.trackPageView();

    // 클릭 위임
    document.addEventListener("click", this.onClick, { capture: true });

    // 페이지 떠날 때 flush
    window.addEventListener("beforeunload", this.handleUnload);
    document.addEventListener("visibilitychange", this.handleVisibility);

    // wouter는 history pushState로 동작 → patch
    this.patchHistory();
    window.addEventListener("popstate", this.handleRouteChange);

    // 5초 주기 flush
    this.timer = window.setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private patchHistory() {
    const self = this;
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      const ret = origPush.apply(this, args as any);
      window.dispatchEvent(new Event("yjd:routechange"));
      return ret;
    };
    history.replaceState = function (...args) {
      const ret = origReplace.apply(this, args as any);
      window.dispatchEvent(new Event("yjd:routechange"));
      return ret;
    };
    window.addEventListener("yjd:routechange", () => self.handleRouteChange());
  }

  private handleRouteChange = () => {
    // micro-tick — pushState 후 path가 갱신된 다음 처리
    setTimeout(() => this.trackPageView(), 0);
  };

  trackPageView() {
    const path = window.location.pathname + window.location.search;
    if (path === this.currentPath) return;

    // 이전 페이지 leave (duration_ms)
    if (this.currentPath && !shouldSkip(this.currentPath)) {
      const duration = this.pageEnteredAt ? Date.now() - this.pageEnteredAt : 0;
      if (duration > 500) {
        this.enqueueBase("page_leave", {
          path: this.currentPath,
          durationMs: duration,
        });
      }
    }

    this.currentPath = path;
    this.pageEnteredAt = Date.now();
    if (shouldSkip(path)) return;

    this.enqueueBase("page_view", {
      path,
      referrer: document.referrer || "",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
  }

  private onClick = (e: MouseEvent) => {
    const path = window.location.pathname + window.location.search;
    if (shouldSkip(path)) return;

    const target = e.target as Element | null;
    if (!target) return;

    // data-track 우선, 없으면 가장 가까운 a/button
    const tracked = target.closest("[data-track]") as HTMLElement | null;
    const interactive = target.closest("a, button, [role='button']") as HTMLElement | null;
    const el = tracked || interactive;
    if (!el) return;

    const trackKey = tracked?.getAttribute("data-track") || undefined;
    const trackLabel = tracked?.getAttribute("data-track-label") || undefined;

    let key: string;
    let label: string;
    if (trackKey) {
      key = trackKey;
      label = trackLabel || trackKey;
    } else if (el.tagName === "A") {
      const href = (el as HTMLAnchorElement).getAttribute("href") || "";
      key = "link:" + href;
      label = (el.textContent || href).trim().slice(0, 100) || href;
    } else {
      const text = (el.textContent || "").trim().slice(0, 60);
      const aria = el.getAttribute("aria-label") || "";
      key = "button:" + (aria || text || "(unnamed)");
      label = aria || text || "(unnamed)";
    }

    this.enqueueBase("click", {
      path,
      target: key.slice(0, 500),
      targetLabel: label.slice(0, 200),
    });
  };

  private handleVisibility = () => {
    if (document.visibilityState === "hidden") {
      // 현재 페이지 체류시간 마감
      if (this.currentPath && !shouldSkip(this.currentPath) && this.pageEnteredAt) {
        const duration = Date.now() - this.pageEnteredAt;
        if (duration > 500) {
          this.enqueueBase("page_leave", { path: this.currentPath, durationMs: duration });
          this.pageEnteredAt = Date.now(); // reset 누계 방지
        }
      }
      this.flush(true);
    } else if (document.visibilityState === "visible") {
      // 30분 이상 idle이면 새 세션
      const { id: sid, isNew } = getSessionId();
      if (isNew) {
        const visitorId = getVisitorId();
        this.enqueue({
          eventType: "session_start",
          visitorId, sessionId: sid,
          path: window.location.pathname + window.location.search,
          referrer: document.referrer || "",
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          createdAt: new Date().toISOString(),
        });
      }
      this.pageEnteredAt = Date.now();
    }
  };

  private handleUnload = () => {
    if (this.currentPath && !shouldSkip(this.currentPath) && this.pageEnteredAt) {
      const duration = Date.now() - this.pageEnteredAt;
      if (duration > 500) {
        this.enqueueBase("page_leave", { path: this.currentPath, durationMs: duration });
      }
    }
    this.flush(true);
  };

  private enqueueBase(eventType: EventType, extra: Partial<TrackEvent>) {
    const { id: sessionId } = getSessionId();
    const visitorId = getVisitorId();
    this.enqueue({
      eventType,
      visitorId,
      sessionId,
      createdAt: new Date().toISOString(),
      ...extra,
    });
  }

  private enqueue(ev: TrackEvent) {
    if (this.queue.length >= MAX_QUEUE) this.queue.shift();
    this.queue.push(ev);
    if (ev.eventType === "click") this.flush(); // 클릭은 즉시 flush
  }

  flush(useBeacon = false) {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    const payload = JSON.stringify({ events: batch });
    try {
      if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(ENDPOINT, blob);
      } else {
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // 실패 시 다시 큐에
          this.queue.unshift(...batch);
        });
      }
    } catch {
      this.queue.unshift(...batch);
    }
  }
}

export const tracker = new TrackingClient();

/** App.tsx에서 한 번만 호출 */
export function startSiteTracking() {
  if (typeof window === "undefined") return;
  // 트래킹 옵트아웃 (DNT)
  if (navigator.doNotTrack === "1") return;
  tracker.init();
}
