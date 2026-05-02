import { db } from "@workspace/db";
import {
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, isNotNull, lte } from "drizzle-orm";
import { logger } from "./logger";
import { getSolapiConfig } from "./solapiHelper";
import { computeFireAt, fireRuleOnce, loadAllEnabledRules } from "./firing";

async function autoPromoteLives(): Promise<void> {
  try {
    const now = new Date();
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

    const rules = await loadAllEnabledRules();

    for (const rule of rules) {
      const isSms = rule.messageType === "sms";
      if (!isSms && !rule.templateId) continue;
      if (isSms && !rule.messageBody) continue;

      const fireAt = computeFireAt(rule.liveScheduledAt, rule.offsetMinutes, rule.customTime);
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

      const { successCount, failCount } = await fireRuleOnce(
        rule,
        regs.map((r) => ({ phone: r.phone, name: r.name })),
        {
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          senderPhone: config.senderPhone,
          senderKey: config.senderKey,
          referenceTime: fireAt,
        },
      );

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
