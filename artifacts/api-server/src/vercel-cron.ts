import { db } from "@workspace/db";
import {
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, isNotNull, lte } from "drizzle-orm";
import { getSolapiConfig } from "./lib/solapiHelper";
import { computeFireAt, fireRuleOnce, loadAllEnabledRules } from "./lib/firing";
import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const now = new Date();
    await db.update(livesTable)
      .set({ status: "live" })
      .where(and(
        eq(livesTable.status, "scheduled"),
        isNotNull(livesTable.scheduledAt),
        lte(livesTable.scheduledAt, now)
      ));

    const windowStart = new Date(now.getTime() - 2 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 30 * 1000);

    const rules = await loadAllEnabledRules();

    let sentCount = 0;
    const debug: Array<Record<string, unknown>> = [];

    for (const rule of rules) {
      const dbg: Record<string, unknown> = {
        ruleId: rule.ruleId, liveId: rule.liveId, offset: rule.offsetMinutes, customTime: rule.customTime,
        scheduledAt: rule.liveScheduledAt.toISOString(),
      };

      const isSms = rule.messageType === "sms";
      if (!isSms && !rule.templateId) { dbg.skip = "no-template"; debug.push(dbg); continue; }
      if (isSms && !rule.messageBody) { dbg.skip = "no-body"; debug.push(dbg); continue; }

      const fireAt = computeFireAt(rule.liveScheduledAt, rule.offsetMinutes, rule.customTime);
      dbg.fireAt = fireAt.toISOString();
      dbg.windowStart = windowStart.toISOString();
      dbg.windowEnd = windowEnd.toISOString();

      if (fireAt < windowStart || fireAt > windowEnd) { dbg.skip = "out-of-window"; debug.push(dbg); continue; }

      const alreadySent = await db
        .select()
        .from(notificationLogTable)
        .where(eq(notificationLogTable.ruleId, rule.ruleId))
        .limit(1);
      if (alreadySent.length > 0) { dbg.skip = "already-sent"; debug.push(dbg); continue; }

      const config = await getSolapiConfig();
      if (!config?.apiKey || !config?.apiSecret || !config?.senderPhone) { dbg.skip = "no-solapi"; debug.push(dbg); continue; }
      if (!isSms && !config.senderKey) { dbg.skip = "no-senderkey"; debug.push(dbg); continue; }

      const regs = await db
        .select()
        .from(registrationsTable)
        .where(eq(registrationsTable.liveId, rule.liveId));
      dbg.regs = regs.length;

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
        dbg.skip = "no-regs-empty-log-written";
        debug.push(dbg);
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

      dbg.fired = true;
      dbg.successCount = successCount;
      dbg.failCount = failCount;
      debug.push(dbg);
      sentCount++;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      ok: true,
      sentCount,
      debug,
      ruleCount: rules.length,
      now: now.toISOString(),
    }));
  } catch (err) {
    console.error("Cron scheduler error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Scheduler failed" }));
  }
}
