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
