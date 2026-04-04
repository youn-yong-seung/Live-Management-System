import { db } from "@workspace/db";
import {
  notificationRulesTable,
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { getSolapiConfig, sendAlimtalkBatch, sendSmsBatch } from "./solapiHelper";

async function runScheduler(): Promise<void> {
  try {
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

      const fireAt = new Date(rule.liveScheduledAt.getTime() + rule.offsetMinutes * 60 * 1000);

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

      const { successCount, failCount } = isSms
        ? await sendSmsBatch(config.apiKey, config.apiSecret, config.senderPhone, rule.messageBody!, regs.map((r) => ({ phone: r.phone, name: r.name })))
        : await sendAlimtalkBatch(config.apiKey, config.apiSecret, config.senderKey!, config.senderPhone, rule.templateId!, regs.map((r) => ({ phone: r.phone, name: r.name })));

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
