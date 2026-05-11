import { Router, type IRouter } from "express";
import { supabaseAnon } from "../lib/supabase.js";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "../middleware/userAuth.js";

const SEED_ADMIN_EMAILS = new Set<string>([
  "yunjadong101@gmail.com",
  "ceo@yunjadong.com",
]);

const router: IRouter = Router();

router.get("/me", requireUser, (req, res) => {
  res.json({ user: req.user });
});

router.post("/auth/sync", async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({ error: "토큰이 없습니다." });
    return;
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Supabase 세션이 유효하지 않습니다." });
    return;
  }

  const supaUser = data.user;
  const email = supaUser.email;
  if (!email) {
    res.status(400).json({ error: "이메일 정보가 없는 계정입니다." });
    return;
  }

  const name =
    (supaUser.user_metadata?.full_name as string | undefined) ??
    (supaUser.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl = (supaUser.user_metadata?.avatar_url as string | undefined) ?? null;
  const isSeedAdmin = SEED_ADMIN_EMAILS.has(email.toLowerCase());

  const existing = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, supaUser.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(usersTable).values({
      id: supaUser.id,
      email,
      name,
      avatarUrl,
      role: isSeedAdmin ? "admin" : "user",
    });
  } else {
    const nextRole = isSeedAdmin ? "admin" : existing[0].role;
    await db
      .update(usersTable)
      .set({
        email,
        name,
        avatarUrl,
        role: nextRole,
        updatedAt: sql`now()`,
      })
      .where(eq(usersTable.id, supaUser.id));
  }

  const [row] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, supaUser.id))
    .limit(1);

  res.json({ user: row });
});

export default router;
