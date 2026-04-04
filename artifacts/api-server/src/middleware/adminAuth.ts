import { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export const adminSessions = new Map<string, number>(); // token → expiry

export function createAdminSession(): string {
  const token = randomUUID();
  adminSessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

export function invalidateAdminSession(token: string): void {
  adminSessions.delete(token);
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "인증이 필요합니다." });
    return;
  }
  const expiry = adminSessions.get(token);
  if (!expiry || expiry < Date.now()) {
    adminSessions.delete(token);
    res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인하세요." });
    return;
  }
  next();
}
