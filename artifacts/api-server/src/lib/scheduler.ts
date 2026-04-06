import { db } from "@workspace/db";
import {
  notificationRulesTable,
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, isNotNull, lte } from "drizzle-orm";
import { logger } from "./logger";
import { getSolapiConfig, sendAlimtalkBatch, sendSmsBatch } from "./solapiHelper";

async function autoPromoteLives(): Promise<void> {
  try {
    const now = new Date();
    // scheduled → live: when scheduledAt has passed
    await db.update(livesTable)
      .set({ status: "live" })
      .where(and(
        eq(livesTable.status, "scheduled"),
        isNotNull(livesTable.scheduledAt),
        lte(livesTable.scheduledAt, now)
      ));
  } catch (err) {
    logger.error({ err }, "Auto-promote lives error");
  }
}

async function runScheduler(): Promise<void> {
  try {
    await autoPromoteLives();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 30 * 1000);

    const rules = await db
      .select({
        ruleId: notificationRulesTable.id,
        liveId: livesTable.id,
        liveTitle: livesTable.title,
        liveScheduledAt: livesTable.scheduledAt,
        offsetMinutes: notificationRulesTable.offsetMinutes,
        messageType: notificationRulesTable.messageType,
        templateId: notificationRulesTable.templateId,
        templateName: notificationRulesTable.templateName,
        messageBody: notificationRulesTable.messageBody,
        customTime: notificationRulesTable.customTime,
      })
      .from(notificationRulesTable)
      .innerJoin(livesTable, eq(notificationRulesTable.liveId, livesTable.id))
      .where(
        and(
          eq(notificationRulesTable.enabled, true),
          isNotNull(livesTable.scheduledAt)
        )
      );

    for (const rule of rules) {
      if (!rule.liveScheduledAt) continue;

      const isSms = rule.messageType === "sms";
      if (!isSms && !rule.templateId) continue;
      if (isSms && !rule.messageBody) continue;

      let fireAt = new Date(rule.liveScheduledAt.getTime() + rule.offsetMinutes * 60 * 1000);
      if (rule.customTime && /^\d{2}:\d{2}$/.test(rule.customTime)) {
        const [hh, mm] = rule.customTime.split(":").map(Number);
        fireAt = new Date(fireAt);
        fireAt.setHours(hh, mm, 0, 0);
      }

      if (fireAt < windowStart || fireAt > windowEnd) continue;

      const alreadySent = await db
        .select()
        .from(notificationLogTable)
        .where(eq(notificationLogTable.ruleId, rule.ruleId))
        .limit(1);

      if (alreadySent.length > 0) continue;

      logger.info({ ruleId: rule.ruleId, liveId: rule.liveId, fireAt, messageType: rule.messageType }, "Firing scheduled notification");

      const config = await getSolapiConfig();
      if (!config?.apiKey || !config?.apiSecret || !config?.senderPhone) {
        logger.warn("Solapi credentials not configured — skipping scheduled send");
        continue;
      }
      if (!isSms && !config.senderKey) {
        logger.warn("Solapi senderKey not configured for alimtalk — skipping");
        continue;
      }

      const regs = await db
        .select()
        .from(registrationsTable)
        .where(eq(registrationsTable.liveId, rule.liveId));

      if (regs.length === 0) {
        await db.insert(notificationLogTable).values({
          liveId: rule.liveId,
          ruleId: rule.ruleId,
          templateId: rule.templateId,
          templateName: rule.templateName,
          recipientCount: 0,
          successCount: 0,
          scheduledAt: fireAt,
          status: "sent",
          isImmediate: false,
        });
        continue;
      }

      // Auto-compute variables
      const autoVars: Record<string, string> = {};
      autoVars["#{방송타이틀}"] = rule.liveTitle;
      if (rule.liveScheduledAt) {
        const sa = rule.liveScheduledAt;
        const now = new Date();
        const diffMs = sa.getTime() - now.getTime();
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

      const { successCount, failCount } = isSms
        ? await sendSmsBatch(config.apiKey, config.apiSecret, config.senderPhone, rule.messageBody!, regs.map((r) => ({ phone: r.phone, name: r.name })))
        : await sendAlimtalkBatch(config.apiKey, config.apiSecret, config.senderKey!, config.senderPhone, rule.templateId!, regs.map((r) => ({ phone: r.phone, name: r.name, variables: { ...autoVars, "#{고객명}": r.name } })));

      await db.insert(notificationLogTable).values({
        liveId: rule.liveId,
        ruleId: rule.ruleId,
        templateId: isSms ? null : rule.templateId,
        templateName: isSms ? `[SMS] ${(rule.messageBody ?? "").substring(0, 30)}` : rule.templateName,
        recipientCount: regs.length,
        successCount,
        scheduledAt: fireAt,
        status: failCount === 0 ? "sent" : successCount > 0 ? "partial_fail" : "failed",
        isImmediate: false,
      });

      logger.info(
        { ruleId: rule.ruleId, liveId: rule.liveId, successCount, failCount },
        "Scheduled notification sent"
      );
    }
  } catch (err) {
    logger.error({ err }, "Scheduler error");
  }
}

export function startScheduler(): void {
  logger.info("Notification scheduler started (60s interval)");
  runScheduler();
  setInterval(runScheduler, 60 * 1000);
}
