import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  livesTable,
  registrationsTable,
  insertLiveSchema,
  insertRegistrationSchema,
} from "@workspace/db";
import { eq, count, sql, and, gte, lte } from "drizzle-orm";
import {
  GetLivesQueryParams,
  CreateLiveBody,
  UpdateLiveBody,
  GetLiveParams,
  UpdateLiveParams,
  DeleteLiveParams,
  GetRegistrationsParams,
  CreateRegistrationParams,
  CreateRegistrationBody,
} from "@workspace/api-zod";
import { sendKakaoAlimtalk } from "../lib/solapi";

const router: IRouter = Router();

router.get("/lives", async (req: Request, res: Response) => {
  try {
    const query = GetLivesQueryParams.parse(req.query);

    const conditions = [];
    if (query.status) {
      conditions.push(eq(livesTable.status, query.status));
    }

    const lives = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(livesTable.id)
      .orderBy(sql`${livesTable.scheduledAt} DESC NULLS LAST, ${livesTable.createdAt} DESC`);

    res.json(lives);
  } catch (error) {
    req.log.error({ error }, "Error fetching lives");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lives", async (req: Request, res: Response) => {
  try {
    const body = CreateLiveBody.parse(req.body);
    const insertData = insertLiveSchema.parse({
      title: body.title,
      description: body.description ?? null,
      youtubeUrl: body.youtubeUrl ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.status,
      thumbnailUrl: body.thumbnailUrl ?? null,
    });

    const [live] = await db.insert(livesTable).values(insertData).returning();

    const [result] = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(eq(livesTable.id, live.id))
      .groupBy(livesTable.id);

    res.status(201).json(result);
  } catch (error) {
    req.log.error({ error }, "Error creating live");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/lives/:id", async (req: Request, res: Response) => {
  try {
    const { id } = GetLiveParams.parse({ id: parseInt(req.params.id, 10) });

    const [live] = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(eq(livesTable.id, id))
      .groupBy(livesTable.id);

    if (!live) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    res.json(live);
  } catch (error) {
    req.log.error({ error }, "Error fetching live");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lives/:id", async (req: Request, res: Response) => {
  try {
    const { id } = UpdateLiveParams.parse({ id: parseInt(req.params.id, 10) });
    const body = UpdateLiveBody.parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description ?? null;
    if (body.youtubeUrl !== undefined)
      updateData.youtubeUrl = body.youtubeUrl ?? null;
    if (body.scheduledAt !== undefined)
      updateData.scheduledAt = body.scheduledAt
        ? new Date(body.scheduledAt)
        : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.thumbnailUrl !== undefined)
      updateData.thumbnailUrl = body.thumbnailUrl ?? null;

    const [updated] = await db
      .update(livesTable)
      .set(updateData)
      .where(eq(livesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    const [result] = await db
      .select({
        id: livesTable.id,
        title: livesTable.title,
        description: livesTable.description,
        youtubeUrl: livesTable.youtubeUrl,
        scheduledAt: livesTable.scheduledAt,
        status: livesTable.status,
        thumbnailUrl: livesTable.thumbnailUrl,
        createdAt: livesTable.createdAt,
        registrationCount: count(registrationsTable.id),
      })
      .from(livesTable)
      .leftJoin(registrationsTable, eq(livesTable.id, registrationsTable.liveId))
      .where(eq(livesTable.id, id))
      .groupBy(livesTable.id);

    res.json(result);
  } catch (error) {
    req.log.error({ error }, "Error updating live");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/lives/:id", async (req: Request, res: Response) => {
  try {
    const { id } = DeleteLiveParams.parse({ id: parseInt(req.params.id, 10) });

    const [deleted] = await db
      .delete(livesTable)
      .where(eq(livesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Live not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Error deleting live");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/lives/:liveId/registrations",
  async (req: Request, res: Response) => {
    try {
      const { liveId } = GetRegistrationsParams.parse({
        liveId: parseInt(req.params.liveId, 10),
      });

      const [live] = await db
        .select({ id: livesTable.id })
        .from(livesTable)
        .where(eq(livesTable.id, liveId));

      if (!live) {
        res.status(404).json({ error: "Live not found" });
        return;
      }

      const registrations = await db
        .select()
        .from(registrationsTable)
        .where(eq(registrationsTable.liveId, liveId))
        .orderBy(sql`${registrationsTable.createdAt} DESC`);

      res.json(registrations);
    } catch (error) {
      req.log.error({ error }, "Error fetching registrations");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/lives/:liveId/registrations",
  async (req: Request, res: Response) => {
    try {
      const { liveId } = CreateRegistrationParams.parse({
        liveId: parseInt(req.params.liveId, 10),
      });
      const body = CreateRegistrationBody.parse(req.body);

      const [live] = await db
        .select()
        .from(livesTable)
        .where(eq(livesTable.id, liveId));

      if (!live) {
        res.status(404).json({ error: "Live not found" });
        return;
      }

      const insertData = insertRegistrationSchema.parse({
        liveId,
        name: body.name,
        phone: body.phone,
        email: body.email ?? null,
        message: body.message ?? null,
      });

      const [registration] = await db
        .insert(registrationsTable)
        .values(insertData)
        .returning();

      sendKakaoAlimtalk({
        phone: body.phone,
        name: body.name,
        liveTitle: live.title,
        scheduledAt: live.scheduledAt,
      }).catch((err) => {
        req.log.error({ err }, "Failed to send KakaoTalk notification");
      });

      res.status(201).json(registration);
    } catch (error) {
      req.log.error({ error }, "Error creating registration");
      res.status(400).json({ error: "Bad request" });
    }
  },
);

router.get("/dashboard-summary", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [[activeLivesResult], [upcomingResult], [totalRegResult], [totalLivesResult]] =
      await Promise.all([
        db
          .select({ count: count() })
          .from(livesTable)
          .where(eq(livesTable.status, "live")),
        db
          .select({ count: count() })
          .from(livesTable)
          .where(
            and(
              eq(livesTable.status, "scheduled"),
              gte(livesTable.scheduledAt, now),
              lte(livesTable.scheduledAt, weekEnd),
            ),
          ),
        db.select({ count: count() }).from(registrationsTable),
        db.select({ count: count() }).from(livesTable),
      ]);

    res.json({
      activeLivesCount: activeLivesResult.count,
      upcomingThisWeekCount: upcomingResult.count,
      totalRegistrationsCount: totalRegResult.count,
      totalLivesCount: totalLivesResult.count,
    });
  } catch (error) {
    _req.log.error({ error }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
