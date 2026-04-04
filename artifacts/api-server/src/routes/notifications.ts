import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  solapiConfigTable,
  notificationRulesTable,
  notificationLogTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, count, isNotNull, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getSolapiConfig, fetchSolapiTemplates, sendAlimtalkBatch, sendSmsBatch } from "../lib/solapiHelper";

const router: IRouter = Router();

const DEFAULT_OFFSETS = [
  { offsetMinutes: -1440, label: "1일 전" },
  { offsetMinutes: -180, label: "3시간 전" },
  { offsetMinutes: -60, label: "1시간 전" },
  { offsetMinutes: -30, label: "30분 전" },
  { offsetMinutes: -10, label: "10분 전" },
  { offsetMinutes: 10, label: "시작 10분 후" },
];

/* ── Solapi Config ──────────────────────────────────── */

router.get("/settings/solapi", async (_req: Request, res: Response) => {
  try {
    const config = await getSolapiConfig();
    if (!config) {
      return res.json({ apiKey: null, senderPhone: null, senderKey: null, configured: false });
    }
    return res.json({
      apiKey: config.apiKey,
      senderPhone: config.senderPhone,
      senderKey: config.senderKey,
      configured: !!(config.apiKey && config.apiSecret && config.senderPhone && config.senderKey),
    });
  } catch (err) {
    logger.error({ err }, "GET /settings/solapi failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings/solapi", async (req: Request, res: Response) => {
  try {
    const { apiKey, apiSecret, senderPhone, senderKey } = req.body as {
      apiKey?: string; apiSecret?: string; senderPhone?: string; senderKey?: string;
    };
    const existing = await getSolapiConfig();
    if (existing) {
      await db.update(solapiConfigTable)
        .set({
          apiKey: apiKey ?? existing.apiKey,
          apiSecret: apiSecret && apiSecret.trim() !== "" ? apiSecret : existing.apiSecret,
          senderPhone: senderPhone ?? existing.senderPhone,
          senderKey: senderKey ?? existing.senderKey,
          updatedAt: new Date(),
        })
        .where(eq(solapiConfigTable.id, existing.id));
    } else {
      await db.insert(solapiConfigTable).values({ apiKey, apiSecret, senderPhone, senderKey });
    }
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "PUT /settings/solapi failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Solapi Templates ───────────────────────────────── */

router.get("/solapi/templates", async (_req: Request, res: Response) => {
  try {
    const config = await getSolapiConfig();
    if (!config?.apiKey || !config?.apiSecret) {
      return res.status(400).json({ error: "Solapi credentials not configured" });
    }
    const templates = await fetchSolapiTemplates(config.apiKey, config.apiSecret);
    return res.json(templates);
  } catch (err) {
    logger.error({ err }, "GET /solapi/templates failed");
    return res.status(500).json({ error: String(err) });
  }
});

/* ── Notification Rules ─────────────────────────────── */

router.get("/lives/:id/notification-rules", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    let rules = await db.select().from(notificationRulesTable)
      .where(eq(notificationRulesTable.liveId, liveId))
      .orderBy(notificationRulesTable.offsetMinutes);

    if (rules.length === 0) {
      const defaultRules = DEFAULT_OFFSETS.map((o) => ({
        liveId,
        offsetMinutes: o.offsetMinutes,
        templateId: null,
        templateName: null,
        enabled: false,
      }));
      const inserted = await db.insert(notificationRulesTable).values(defaultRules).returning();
      rules = inserted.sort((a, b) => a.offsetMinutes - b.offsetMinutes);
    }

    return res.json(rules);
  } catch (err) {
    logger.error({ err }, "GET /lives/:id/notification-rules failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lives/:id/notification-rules", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const updates = req.body as {
      id: number; offsetMinutes: number; messageType?: string;
      templateId: string | null; templateName: string | null;
      messageBody?: string | null; enabled: boolean;
    }[];

    for (const u of updates) {
      await db.update(notificationRulesTable)
        .set({
          messageType: u.messageType ?? "alimtalk",
          templateId: u.templateId,
          templateName: u.templateName,
          messageBody: u.messageBody ?? null,
          enabled: u.enabled,
        })
        .where(and(eq(notificationRulesTable.id, u.id), eq(notificationRulesTable.liveId, liveId)));
    }

    const rules = await db.select().from(notificationRulesTable)
      .where(eq(notificationRulesTable.liveId, liveId))
      .orderBy(notificationRulesTable.offsetMinutes);

    return res.json(rules);
  } catch (err) {
    logger.error({ err }, "PUT /lives/:id/notification-rules failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Immediate Send ─────────────────────────────────── */

router.post("/lives/:id/send-now", async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const { messageType = "alimtalk", templateId, templateName, messageBody } = req.body as {
      messageType?: string; templateId?: string; templateName?: string; messageBody?: string;
    };
    const isSms = messageType === "sms";

    if (!isSms && !templateId) return res.status(400).json({ error: "templateId is required for alimtalk" });
    if (isSms && !messageBody) return res.status(400).json({ error: "messageBody is required for sms" });

    const config = await getSolapiConfig();
    if (!config?.apiKey || !config?.apiSecret || !config?.senderPhone) {
      return res.status(400).json({ error: "Solapi credentials not configured" });
    }
    if (!isSms && !config.senderKey) {
      return res.status(400).json({ error: "Solapi senderKey (pfId) not configured for alimtalk" });
    }

    const regs = await db.select().from(registrationsTable).where(eq(registrationsTable.liveId, liveId));
    if (regs.length === 0) {
      return res.json({ success: true, recipientCount: 0, successCount: 0, message: "No registrants" });
    }

    const { successCount, failCount } = isSms
      ? await sendSmsBatch(config.apiKey, config.apiSecret, config.senderPhone, messageBody!, regs.map((r) => ({ phone: r.phone, name: r.name })))
      : await sendAlimtalkBatch(config.apiKey, config.apiSecret, config.senderKey!, config.senderPhone, templateId!, regs.map((r) => ({ phone: r.phone, name: r.name })));

    await db.insert(notificationLogTable).values({
      liveId,
      templateId: isSms ? null : (templateId ?? null),
      templateName: isSms ? `[SMS] ${(messageBody ?? "").substring(0, 30)}` : (templateName ?? null),
      recipientCount: regs.length,
      successCount,
      status: failCount === 0 ? "sent" : successCount > 0 ? "partial_fail" : "failed",
      isImmediate: true,
    });

    return res.json({ success: true, recipientCount: regs.length, successCount, failCount });
  } catch (err) {
    logger.error({ err }, "POST /lives/:id/send-now failed");
    return res.status(500).json({ error: String(err) });
  }
});

/* ── Notification Schedule (upcoming + past) ────────── */

router.get("/notifications/schedule", async (_req: Request, res: Response) => {
  try {
    const rules = await db
      .select({
        ruleId: notificationRulesTable.id,
        liveId: livesTable.id,
        liveTitle: livesTable.title,
        liveScheduledAt: livesTable.scheduledAt,
        offsetMinutes: notificationRulesTable.offsetMinutes,
        templateId: notificationRulesTable.templateId,
        templateName: notificationRulesTable.templateName,
        enabled: notificationRulesTable.enabled,
      })
      .from(notificationRulesTable)
      .innerJoin(livesTable, eq(notificationRulesTable.liveId, livesTable.id))
      .where(and(isNotNull(livesTable.scheduledAt), eq(notificationRulesTable.enabled, true)));

    const liveIds = [...new Set(rules.map((r) => r.liveId))];
    const regCounts = liveIds.length > 0
      ? await db.select({ liveId: registrationsTable.liveId, cnt: count(registrationsTable.id) })
          .from(registrationsTable)
          .where(inArray(registrationsTable.liveId, liveIds))
          .groupBy(registrationsTable.liveId)
      : [];
    const regCountMap = Object.fromEntries(regCounts.map((r) => [r.liveId, r.cnt]));

    const logs = await db.select().from(notificationLogTable).where(isNotNull(notificationLogTable.ruleId));
    const sentRuleIds = new Set(logs.map((l) => l.ruleId).filter(Boolean));

    const schedule = rules.map((r) => {
      const fireAt = r.liveScheduledAt
        ? new Date(r.liveScheduledAt.getTime() + r.offsetMinutes * 60 * 1000)
        : null;
      const isSent = sentRuleIds.has(r.ruleId);
      const sentLog = isSent ? logs.find((l) => l.ruleId === r.ruleId) : null;
      return {
        ruleId: r.ruleId,
        liveId: r.liveId,
        liveTitle: r.liveTitle,
        offsetMinutes: r.offsetMinutes,
        offsetLabel: DEFAULT_OFFSETS.find((o) => o.offsetMinutes === r.offsetMinutes)?.label ?? `${r.offsetMinutes}분`,
        templateId: r.templateId,
        templateName: r.templateName,
        fireAt: fireAt?.toISOString() ?? null,
        recipientCount: regCountMap[r.liveId] ?? 0,
        status: isSent ? "sent" : fireAt && fireAt < new Date() ? "overdue" : "pending",
        sentAt: sentLog?.sentAt ?? null,
        successCount: sentLog?.successCount ?? null,
      };
    });

    schedule.sort((a, b) => (a.fireAt ?? "").localeCompare(b.fireAt ?? ""));

    return res.json(schedule);
  } catch (err) {
    logger.error({ err }, "GET /notifications/schedule failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Notification Log ───────────────────────────────── */

router.get("/notifications/log", async (req: Request, res: Response) => {
  try {
    const liveId = req.query.liveId ? parseInt(String(req.query.liveId), 10) : null;
    const conditions = liveId ? [eq(notificationLogTable.liveId, liveId)] : [];

    const logs = await db.select({
      id: notificationLogTable.id,
      liveId: notificationLogTable.liveId,
      liveTitle: livesTable.title,
      templateId: notificationLogTable.templateId,
      templateName: notificationLogTable.templateName,
      recipientCount: notificationLogTable.recipientCount,
      successCount: notificationLogTable.successCount,
      sentAt: notificationLogTable.sentAt,
      status: notificationLogTable.status,
      isImmediate: notificationLogTable.isImmediate,
      ruleId: notificationLogTable.ruleId,
    })
      .from(notificationLogTable)
      .innerJoin(livesTable, eq(notificationLogTable.liveId, livesTable.id))
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(notificationLogTable.sentAt);

    return res.json(logs.reverse());
  } catch (err) {
    logger.error({ err }, "GET /notifications/log failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
