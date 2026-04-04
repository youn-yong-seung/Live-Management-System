import { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { adminSessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function createAdminSession(): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Clean up expired sessions occasionally
  await db.delete(adminSessionsTable).where(lt(adminSessionsTable.expiresAt, new Date()));

  await db.insert(adminSessionsTable).values({ token, expiresAt });
  return token;
}

export async function invalidateAdminSession(token: string): Promise<void> {
  await db.delete(adminSessionsTable).where(eq(adminSessionsTable.token, token));
}

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "인증이 필요합니다." });
    return;
  }

  const [session] = await db
    .select()
    .from(adminSessionsTable)
    .where(eq(adminSessionsTable.token, token))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.delete(adminSessionsTable).where(eq(adminSessionsTable.token, token));
    }
    res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인하세요." });
    return;
  }

  next();
}
