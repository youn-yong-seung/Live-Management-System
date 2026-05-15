import { format } from "date-fns";
import { ko } from "date-fns/locale";

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "yyyy년 MM월 dd일 HH:mm", { locale: ko });
  } catch (e) {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MM/dd HH:mm", { locale: ko });
  } catch (e) {
    return dateStr;
  }
}

/** YouTube 댓글 스타일 — "방금 전 / 12분 전 / 5시간 전 / 3일 전 / 2주 전 / 4개월 전 / 1년 전" */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const now = Date.now();
    const t = new Date(dateStr).getTime();
    const diff = Math.max(0, now - t);
    const s = Math.floor(diff / 1000);
    if (s < 60) return "방금 전";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}일 전`;
    const w = Math.floor(d / 7);
    if (w < 5) return `${w}주 전`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}개월 전`;
    const y = Math.floor(d / 365);
    return `${y}년 전`;
  } catch {
    return "";
  }
}
