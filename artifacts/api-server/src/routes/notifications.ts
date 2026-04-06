import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  solapiConfigTable,
  notificationRulesTable,
  notificationLogTable,
  registrationTriggersTable,
  livesTable,
  registrationsTable,
} from "@workspace/db";
import { eq, and, count, isNotNull, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getSolapiConfig, fetchSolapiTemplates, sendAlimtalkBatch, sendSmsBatch } from "../lib/solapiHelper";
import { requireAdminAuth } from "../middleware/adminAuth";

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

router.get("/settings/solapi", requireAdminAuth, async (_req: Request, res: Response) => {
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

router.put("/settings/solapi", requireAdminAuth, async (req: Request, res: Response) => {
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

router.get("/solapi/templates", requireAdminAuth, async (_req: Request, res: Response) => {
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

router.get("/lives/:id/notification-rules", requireAdminAuth, async (req: Request, res: Response) => {
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

router.put("/lives/:id/notification-rules", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const updates = req.body as {
      id: number; offsetMinutes: number; messageType?: string;
      templateId: string | null; templateName: string | null;
      messageBody?: string | null; customTime?: string | null; enabled: boolean;
    }[];

    for (const u of updates) {
      await db.update(notificationRulesTable)
        .set({
          offsetMinutes: u.offsetMinutes,
          messageType: u.messageType ?? "alimtalk",
          templateId: u.templateId,
          templateName: u.templateName,
          messageBody: u.messageBody ?? null,
          customTime: u.customTime && u.customTime.trim() !== "" ? u.customTime.trim() : null,
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

router.post("/lives/:id/send-now", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const { messageType = "alimtalk", templateId, templateName, messageBody, variables } = req.body as {
      messageType?: string; templateId?: string; templateName?: string; messageBody?: string;
      variables?: Record<string, string>;
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

    // Get live info for auto-filling variables
    const [live] = await db.select().from(livesTable).where(eq(livesTable.id, liveId));

    const regs = await db.select().from(registrationsTable).where(eq(registrationsTable.liveId, liveId));
    if (regs.length === 0) {
      return res.json({ success: true, recipientCount: 0, successCount: 0, message: "No registrants" });
    }

    // Auto-compute variables from live data
    const autoVars: Record<string, string> = {};
    if (live) {
      autoVars["#{방송타이틀}"] = live.title;
      if (live.scheduledAt) {
        const sa = new Date(live.scheduledAt);
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
      if (live.youtubeUrl) autoVars["#{라이브링크}"] = live.youtubeUrl;
    }
    // Defaults
    autoVars["#{진행자명}"] = variables?.["#{진행자명}"] || "윤자동";
    autoVars["#{준비물}"] = variables?.["#{준비물}"] || "없음";

    const { successCount, failCount } = isSms
      ? await sendSmsBatch(config.apiKey, config.apiSecret, config.senderPhone, messageBody!, regs.map((r) => ({ phone: r.phone, name: r.name })))
      : await sendAlimtalkBatch(config.apiKey, config.apiSecret, config.senderKey!, config.senderPhone, templateId!, regs.map((r) => ({
          phone: r.phone,
          name: r.name,
          variables: {
            ...autoVars,
            ...variables,
            "#{고객명}": r.name,
          },
        })));

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

router.get("/notifications/schedule", requireAdminAuth, async (_req: Request, res: Response) => {
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
        customTime: notificationRulesTable.customTime,
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
      let fireAt = r.liveScheduledAt
        ? new Date(r.liveScheduledAt.getTime() + r.offsetMinutes * 60 * 1000)
        : null;
      if (fireAt && r.customTime && /^\d{2}:\d{2}$/.test(r.customTime)) {
        const [hh, mm] = r.customTime.split(":").map(Number);
        fireAt = new Date(fireAt);
        fireAt.setHours(hh, mm, 0, 0);
      }
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

/* ── Registration Trigger ───────────────────────────── */

router.get("/lives/:id/registration-trigger", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db.select().from(registrationTriggersTable)
      .where(eq(registrationTriggersTable.liveId, liveId));

    if (!row) {
      return res.json({ liveId, messageType: "alimtalk", templateId: null, templateName: null, messageBody: null, enabled: false });
    }
    return res.json(row);
  } catch (err) {
    logger.error({ err }, "GET /lives/:id/registration-trigger failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lives/:id/registration-trigger", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const liveId = parseInt(String(req.params.id), 10);
    if (isNaN(liveId)) return res.status(400).json({ error: "Invalid id" });

    const { messageType = "alimtalk", templateId, templateName, messageBody, enabled } = req.body as {
      messageType?: string; templateId?: string | null; templateName?: string | null;
      messageBody?: string | null; enabled?: boolean;
    };

    const [existing] = await db.select().from(registrationTriggersTable)
      .where(eq(registrationTriggersTable.liveId, liveId));

    if (existing) {
      await db.update(registrationTriggersTable).set({
        messageType,
        templateId: templateId ?? null,
        templateName: templateName ?? null,
        messageBody: messageBody ?? null,
        enabled: enabled ?? false,
        updatedAt: new Date(),
      }).where(eq(registrationTriggersTable.liveId, liveId));
    } else {
      await db.insert(registrationTriggersTable).values({
        liveId,
        messageType,
        templateId: templateId ?? null,
        templateName: templateName ?? null,
        messageBody: messageBody ?? null,
        enabled: enabled ?? false,
      });
    }

    const [updated] = await db.select().from(registrationTriggersTable)
      .where(eq(registrationTriggersTable.liveId, liveId));
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /lives/:id/registration-trigger failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Registration trigger fire helper (called from lives router) ──── */

export async function fireRegistrationTrigger(
  liveId: number,
  registrant: { phone: string; name: string },
): Promise<void> {
  try {
    const [trigger] = await db.select().from(registrationTriggersTable)
      .where(eq(registrationTriggersTable.liveId, liveId));
    if (!trigger?.enabled) return;

    const config = await getSolapiConfig();
    if (!config?.apiKey || !config?.apiSecret || !config?.senderPhone) return;

    const isSms = trigger.messageType === "sms";
    if (!isSms && (!trigger.templateId || !config.senderKey)) return;
    if (isSms && !trigger.messageBody) return;

    const { successCount, failCount } = isSms
      ? await sendSmsBatch(config.apiKey, config.apiSecret, config.senderPhone, trigger.messageBody!, [registrant])
      : await sendAlimtalkBatch(config.apiKey, config.apiSecret, config.senderKey!, config.senderPhone, trigger.templateId!, [registrant]);

    await db.insert(notificationLogTable).values({
      liveId,
      templateId: isSms ? null : (trigger.templateId ?? null),
      templateName: isSms
        ? `[신청트리거:SMS] ${(trigger.messageBody ?? "").substring(0, 20)}`
        : `[신청트리거] ${trigger.templateName ?? trigger.templateId ?? ""}`,
      recipientCount: 1,
      successCount,
      status: failCount === 0 ? "sent" : "failed",
      isImmediate: true,
    });
  } catch (err) {
    logger.error({ err }, "fireRegistrationTrigger failed");
  }
}

/* ── Notification Log ───────────────────────────────── */

router.get("/notifications/log", requireAdminAuth, async (req: Request, res: Response) => {
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
