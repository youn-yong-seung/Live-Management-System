/**
 * 캠페인 발송의 공통 로직.
 *
 * cron과 [테스트 발송] 버튼이 같은 코드를 쓰도록 한 군데로 모아둔다.
 * - 룰 select할 때 timestamp without tz를 EPOCH로 받아 timezone 모호성 제거.
 * - autoVars 빌드 / customVariables 머지 / Solapi send 한 묶음.
 */
import { db } from "@workspace/db";
import {
  notificationRulesTable,
  livesTable,
  registrationTriggersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendAlimtalkBatch, sendSmsBatch } from "./solapiHelper";

const FALLBACK_LIVE_LINK = "https://yunjadong-live-class.vercel.app/lives";

export interface RuleSnapshot {
  ruleId: number;
  liveId: number;
  liveTitle: string;
  liveScheduledAt: Date;
  liveYoutubeUrl: string | null;
  offsetMinutes: number;
  messageType: string;
  templateId: string | null;
  templateName: string | null;
  messageBody: string | null;
  customTime: string | null;
  customVariables: Record<string, string> | null;
}

export interface TriggerSnapshot {
  liveId: number;
  liveTitle: string;
  liveScheduledAt: Date;
  liveYoutubeUrl: string | null;
  messageType: string;
  templateId: string | null;
  templateName: string | null;
  messageBody: string | null;
}

/* ── 공통 SELECT (EPOCH로 timezone 안전) ───────────── */

const ruleSelect = {
  ruleId: notificationRulesTable.id,
  liveId: livesTable.id,
  liveTitle: livesTable.title,
  liveScheduledAtEpoch: sql<string>`EXTRACT(EPOCH FROM ${livesTable.scheduledAt})`.as("live_scheduled_epoch"),
  liveYoutubeUrl: livesTable.youtubeUrl,
  offsetMinutes: notificationRulesTable.offsetMinutes,
  messageType: notificationRulesTable.messageType,
  templateId: notificationRulesTable.templateId,
  templateName: notificationRulesTable.templateName,
  messageBody: notificationRulesTable.messageBody,
  customTime: notificationRulesTable.customTime,
  customVariables: notificationRulesTable.customVariables,
};

function rowToRuleSnapshot(row: Record<string, unknown>): RuleSnapshot | null {
  const epoch = row.liveScheduledAtEpoch != null ? parseFloat(String(row.liveScheduledAtEpoch)) : NaN;
  if (!Number.isFinite(epoch)) return null;
  return {
    ruleId: row.ruleId as number,
    liveId: row.liveId as number,
    liveTitle: row.liveTitle as string,
    liveScheduledAt: new Date(epoch * 1000),
    liveYoutubeUrl: (row.liveYoutubeUrl as string | null) ?? null,
    offsetMinutes: row.offsetMinutes as number,
    messageType: (row.messageType as string) ?? "alimtalk",
    templateId: (row.templateId as string | null) ?? null,
    templateName: (row.templateName as string | null) ?? null,
    messageBody: (row.messageBody as string | null) ?? null,
    customTime: (row.customTime as string | null) ?? null,
    customVariables: (row.customVariables as Record<string, string> | null) ?? null,
  };
}

export async function loadAllEnabledRules(): Promise<RuleSnapshot[]> {
  const rows = await db
    .select(ruleSelect)
    .from(notificationRulesTable)
    .innerJoin(livesTable, eq(notificationRulesTable.liveId, livesTable.id))
    .where(eq(notificationRulesTable.enabled, true));
  return rows.map(rowToRuleSnapshot).filter((r): r is RuleSnapshot => r !== null);
}

export async function loadRuleSnapshot(ruleId: number): Promise<RuleSnapshot | null> {
  const rows = await db
    .select(ruleSelect)
    .from(notificationRulesTable)
    .innerJoin(livesTable, eq(notificationRulesTable.liveId, livesTable.id))
    .where(eq(notificationRulesTable.id, ruleId))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToRuleSnapshot(rows[0]);
}

export async function loadTriggerSnapshot(liveId: number): Promise<TriggerSnapshot | null> {
  const rows = await db
    .select({
      liveId: livesTable.id,
      liveTitle: livesTable.title,
      liveScheduledAtEpoch: sql<string>`EXTRACT(EPOCH FROM ${livesTable.scheduledAt})`.as("live_scheduled_epoch"),
      liveYoutubeUrl: livesTable.youtubeUrl,
      messageType: registrationTriggersTable.messageType,
      templateId: registrationTriggersTable.templateId,
      templateName: registrationTriggersTable.templateName,
      messageBody: registrationTriggersTable.messageBody,
    })
    .from(registrationTriggersTable)
    .innerJoin(livesTable, eq(registrationTriggersTable.liveId, livesTable.id))
    .where(eq(registrationTriggersTable.liveId, liveId))
    .limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  const epoch = row.liveScheduledAtEpoch != null ? parseFloat(String(row.liveScheduledAtEpoch)) : NaN;
  if (!Number.isFinite(epoch)) return null;
  return {
    liveId: row.liveId,
    liveTitle: row.liveTitle,
    liveScheduledAt: new Date(epoch * 1000),
    liveYoutubeUrl: row.liveYoutubeUrl ?? null,
    messageType: row.messageType ?? "alimtalk",
    templateId: row.templateId ?? null,
    templateName: row.templateName ?? null,
    messageBody: row.messageBody ?? null,
  };
}

/* ── autoVars 빌드 ────────────────────────────────── */

export function buildAutoVars(args: {
  liveTitle: string;
  liveScheduledAt: Date | null;
  liveYoutubeUrl: string | null;
  /** "남은시간" 계산 기준점. cron은 fireAt, 즉시발송/테스트는 now. */
  referenceTime: Date;
}): Record<string, string> {
  const autoVars: Record<string, string> = {};
  autoVars["#{방송타이틀}"] = args.liveTitle;
  if (args.liveScheduledAt) {
    const sa = args.liveScheduledAt;
    const ref = args.referenceTime;
    const diffMs = sa.getTime() - ref.getTime();
    const diffH = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const diffM = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
    const diffD = Math.floor(diffH / 24); const diffHr = diffH % 24;
    autoVars["#{남은시간}"] = diffMs > 0 ? (diffD > 0 ? `${diffD}일 ${diffHr}시간 ${diffM}분` : `${diffHr}시간 ${diffM}분`) : "곧";
    autoVars["#{방송시작시간}"] = sa.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
    autoVars["#{년월일}"] = sa.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });
    autoVars["#{시간}"] = sa.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
  }
  autoVars["#{진행자명}"] = "윤자동";
  autoVars["#{준비물}"] = "없음";
  const liveLink = args.liveYoutubeUrl?.trim() || FALLBACK_LIVE_LINK;
  autoVars["#{라이브링크}"] = liveLink;
  autoVars["#{라이브주소}"] = liveLink;
  autoVars["#{라이브URL}"] = liveLink;
  return autoVars;
}

/* ── 발송 helper ──────────────────────────────────── */

export interface FireRecipient {
  phone: string;
  name: string;
}

export interface FireOptions {
  /** Solapi config */
  apiKey: string;
  apiSecret: string;
  senderPhone: string;
  senderKey?: string | null;
  /** "남은시간" 계산 기준 (cron=fireAt, test/즉시=now) */
  referenceTime: Date;
}

/** 룰 1개를 받아 알림톡/문자 발송. 변수는 autoVars + customVariables(룰) + #{고객명}=name 머지. */
export async function fireRuleOnce(
  rule: Pick<
    RuleSnapshot,
    "messageType" | "templateId" | "templateName" | "messageBody" | "customVariables" |
    "liveTitle" | "liveScheduledAt" | "liveYoutubeUrl"
  >,
  recipients: FireRecipient[],
  opts: FireOptions,
): Promise<{ successCount: number; failCount: number }> {
  const isSms = rule.messageType === "sms";
  if (!isSms && !rule.templateId) throw new Error("templateId required for alimtalk");
  if (isSms && !rule.messageBody) throw new Error("messageBody required for sms");
  if (recipients.length === 0) return { successCount: 0, failCount: 0 };

  if (isSms) {
    return sendSmsBatch(opts.apiKey, opts.apiSecret, opts.senderPhone, rule.messageBody!, recipients);
  }

  const autoVars = buildAutoVars({
    liveTitle: rule.liveTitle,
    liveScheduledAt: rule.liveScheduledAt,
    liveYoutubeUrl: rule.liveYoutubeUrl,
    referenceTime: opts.referenceTime,
  });
  const customVars = rule.customVariables ?? {};

  return sendAlimtalkBatch(
    opts.apiKey,
    opts.apiSecret,
    opts.senderKey!,
    opts.senderPhone,
    rule.templateId!,
    recipients.map((r) => ({
      phone: r.phone,
      name: r.name,
      variables: { ...autoVars, ...customVars, "#{고객명}": r.name },
    })),
  );
}

/* ── fireAt 계산 (cron이 사용) ────────────────────── */

export function computeFireAt(scheduledAt: Date, offsetMinutes: number, customTime: string | null): Date {
  let fireAt = new Date(scheduledAt.getTime() + offsetMinutes * 60 * 1000);
  if (customTime && /^\d{2}:\d{2}$/.test(customTime)) {
    const [hh, mm] = customTime.split(":").map(Number);
    fireAt = new Date(fireAt);
    fireAt.setHours(hh, mm, 0, 0);
  }
  return fireAt;
}
