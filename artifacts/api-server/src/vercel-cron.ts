import { db } from "@workspace/db";
import {
  notificationRulesTable,
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, isNotNull, lte, sql } from "drizzle-orm";
import { getSolapiConfig, sendAlimtalkBatch, sendSmsBatch } from "./lib/solapiHelper";
import type { IncomingMessage, ServerResponse } from "http";

const FALLBACK_LIVE_LINK = "https://yunjadong-live-class.vercel.app/lives";

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
        liveScheduledAtEpoch: sql<string>`EXTRACT(EPOCH FROM ${livesTable.scheduledAt})`.as("live_scheduled_epoch"),
        liveYoutubeUrl: livesTable.youtubeUrl,
        offsetMinutes: notificationRulesTable.offsetMinutes,
        messageType: notificationRulesTable.messageType,
        templateId: notificationRulesTable.templateId,
        templateName: notificationRulesTable.templateName,
        messageBody: notificationRulesTable.messageBody,
        customTime: notificationRulesTable.customTime,
        customVariables: notificationRulesTable.customVariables,
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
    const debug: Array<Record<string, unknown>> = [];

    for (const rule of rules) {
      const dbg: Record<string, unknown> = { ruleId: rule.ruleId, liveId: rule.liveId, offset: rule.offsetMinutes, customTime: rule.customTime };
      const epochSec = rule.liveScheduledAtEpoch != null ? parseFloat(String(rule.liveScheduledAtEpoch)) : NaN;
      if (!Number.isFinite(epochSec)) { dbg.skip = "no-scheduled"; debug.push(dbg); continue; }
      const liveScheduledAt = new Date(epochSec * 1000);
      dbg.scheduledAt = liveScheduledAt.toISOString();

      const isSms = rule.messageType === "sms";
      if (!isSms && !rule.templateId) { dbg.skip = "no-template"; debug.push(dbg); continue; }
      if (isSms && !rule.messageBody) { dbg.skip = "no-body"; debug.push(dbg); continue; }

      let fireAt = new Date(liveScheduledAt.getTime() + rule.offsetMinutes * 60 * 1000);
      if (rule.customTime && /^\d{2}:\d{2}$/.test(rule.customTime)) {
        const [hh, mm] = rule.customTime.split(":").map(Number);
        fireAt = new Date(fireAt);
        fireAt.setHours(hh, mm, 0, 0);
      }
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
      if (!config?.apiKey || !config?.apiSecret || !config?.senderPhone) continue;
      if (!isSms && !config.senderKey) continue;

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

      // Auto-compute variables
      const autoVars: Record<string, string> = {};
      autoVars["#{방송타이틀}"] = rule.liveTitle;
      {
        const sa = liveScheduledAt;
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
      const liveLink = rule.liveYoutubeUrl?.trim() || FALLBACK_LIVE_LINK;
      autoVars["#{라이브링크}"] = liveLink;
      autoVars["#{라이브주소}"] = liveLink;
      autoVars["#{라이브URL}"] = liveLink;

      const customVars = rule.customVariables ?? {};

      const { successCount, failCount } = isSms
        ? await sendSmsBatch(config.apiKey, config.apiSecret, config.senderPhone, rule.messageBody!, regs.map((r) => ({ phone: r.phone, name: r.name })))
        : await sendAlimtalkBatch(config.apiKey, config.apiSecret, config.senderKey!, config.senderPhone, rule.templateId!, regs.map((r) => ({ phone: r.phone, name: r.name, variables: { ...autoVars, ...customVars, "#{고객명}": r.name } })));

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
      env: {
        TZ: process.env.TZ ?? null,
        nodeNow: new Date().toString(),
      },
    }));
  } catch (err) {
    console.error("Cron scheduler error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Scheduler failed" }));
  }
}
