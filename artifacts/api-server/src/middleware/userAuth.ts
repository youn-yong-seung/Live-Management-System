import type { Request, Response, NextFunction } from "express";
import { supabaseAnon } from "../lib/supabase.js";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthedUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

async function resolveUserFromToken(token: string): Promise<AuthedUser | null> {
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return null;

  const supaUser = data.user;
  const [row] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, supaUser.id))
    .limit(1);

  if (!row) return null;
  return { id: row.id, email: row.email, role: row.role };
}

export async function optionalUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearer(req);
  if (!token) return next();
  const user = await resolveUserFromToken(token);
  if (user) req.user = user;
  next();
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }
  const user = await resolveUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "세션이 유효하지 않습니다." });
    return;
  }
  req.user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireUser(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "관리자 권한이 필요합니다." });
      return;
    }
    next();
  });
}
