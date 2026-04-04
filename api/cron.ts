import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db/src/index";
import {
  notificationRulesTable,
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "../lib/db/src/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getSolapiConfig, sendAlimtalkBatch, sendSmsBatch } from "../artifacts/api-server/src/lib/solapiHelper";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is called by Vercel Cron (not external)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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

    let sentCount = 0;

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

      const config = await getSolapiConfig();
      if (!config?.apiKey || !config?.apiSecret || !config?.senderPhone) continue;
      if (!isSms && !config.senderKey) continue;

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

      sentCount++;
    }

    return res.status(200).json({ ok: true, sentCount });
  } catch (err) {
    console.error("Cron scheduler error:", err);
    return res.status(500).json({ error: "Scheduler failed" });
  }
}
