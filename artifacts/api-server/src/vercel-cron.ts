import { db } from "@workspace/db";
import {
  notificationRulesTable,
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, isNotNull, lte } from "drizzle-orm";
import { getSolapiConfig, sendAlimtalkBatch, sendSmsBatch } from "./lib/solapiHelper";
import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    // Auto-promote: scheduled → live when time has passed
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

      // Auto-compute variables
      const autoVars: Record<string, string> = {};
      autoVars["#{방송타이틀}"] = rule.liveTitle;
      if (rule.liveScheduledAt) {
        const sa = rule.liveScheduledAt;
        const nowTs = new Date();
        const diffMs = sa.getTime() - nowTs.getTime();
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

      sentCount++;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, sentCount }));
  } catch (err) {
    console.error("Cron scheduler error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Scheduler failed" }));
  }
}
