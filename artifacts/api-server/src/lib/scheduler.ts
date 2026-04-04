import { db } from "@workspace/db";
import {
  notificationRulesTable,
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { getSolapiConfig, sendAlimtalkBatch } from "./solapiHelper";

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
        templateId: notificationRulesTable.templateId,
        templateName: notificationRulesTable.templateName,
      })
      .from(notificationRulesTable)
      .innerJoin(livesTable, eq(notificationRulesTable.liveId, livesTable.id))
      .where(
        and(
          eq(notificationRulesTable.enabled, true),
          isNotNull(notificationRulesTable.templateId),
          isNotNull(livesTable.scheduledAt)
        )
      );

    for (const rule of rules) {
      if (!rule.liveScheduledAt || !rule.templateId) continue;

      const fireAt = new Date(rule.liveScheduledAt.getTime() + rule.offsetMinutes * 60 * 1000);

      if (fireAt < windowStart || fireAt > windowEnd) continue;

      const alreadySent = await db
        .select()
        .from(notificationLogTable)
        .where(eq(notificationLogTable.ruleId, rule.ruleId))
        .limit(1);

      if (alreadySent.length > 0) continue;

      logger.info({ ruleId: rule.ruleId, liveId: rule.liveId, fireAt }, "Firing scheduled notification");

      const config = await getSolapiConfig();
      if (!config?.apiKey || !config?.apiSecret || !config?.senderPhone || !config?.senderKey) {
        logger.warn("Solapi credentials not configured — skipping scheduled send");
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

      const { successCount, failCount } = await sendAlimtalkBatch(
        config.apiKey,
        config.apiSecret,
        config.senderKey,
        config.senderPhone,
        rule.templateId,
        regs.map((r) => ({ phone: r.phone, name: r.name }))
      );

      await db.insert(notificationLogTable).values({
        liveId: rule.liveId,
        ruleId: rule.ruleId,
        templateId: rule.templateId,
        templateName: rule.templateName,
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
