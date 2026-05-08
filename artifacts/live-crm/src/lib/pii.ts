import { useEffect, useState } from "react";

/* ── PII visibility store (sessionStorage + listeners) ────────────
   디폴트: 숨김. 관리자 페이지 사이드바 토글로 임시 노출. 새로고침해도
   유지되지만 브라우저 닫으면 리셋(세션 단위). */

const STORAGE_KEY = "admin_show_pii";

let _show = false;
const listeners = new Set<() => void>();

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

_show = readInitial();

export function getShowPII(): boolean {
  return _show;
}

export function setShowPII(value: boolean): void {
  _show = value;
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function togglePII(): boolean {
  setShowPII(!_show);
  return _show;
}

export function usePIIVisible(): boolean {
  const [v, setV] = useState<boolean>(_show);
  useEffect(() => {
    const cb = () => setV(_show);
    listeners.add(cb);
    cb();
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return v;
}

/* ── Masking helpers ─────────────────────────────────────── */

export function maskName(name: string | null | undefined, show: boolean): string {
  if (!name) return "";
  if (show) return name;
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";
  const first = Array.from(trimmed)[0];
  const restLen = Math.max(1, Array.from(trimmed).length - 1);
  return `${first}${"*".repeat(Math.min(3, restLen))}`;
}

export function maskPhone(phone: string | null | undefined, show: boolean): string {
  if (!phone) return "";
  if (show) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  // 010-1234-5678 → 010-****-5678 (앞 3 + 뒤 4 노출, 가운데 마스킹)
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  // 원본이 하이픈을 포함하면 비슷한 패턴 유지
  if (phone.includes("-")) return `${head}-****-${tail}`;
  return `${head}****${tail}`;
}

export function maskEmail(email: string | null | undefined, show: boolean): string {
  if (!email) return "";
  if (show) return email;
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const user = email.slice(0, at);
  const domain = email.slice(at);
  const head = user.charAt(0);
  return `${head}${"*".repeat(Math.min(4, Math.max(2, user.length - 1)))}${domain}`;
}

// 자유 입력 텍스트(메시지·자유답변)는 통째로 가림. 길이 힌트만 노출.
export function maskFreeText(text: string | null | undefined, show: boolean): string {
  if (text === null || text === undefined) return "";
  if (show) return String(text);
  const s = String(text).trim();
  if (s.length === 0) return "";
  return `(가림 · ${s.length}자)`;
}
