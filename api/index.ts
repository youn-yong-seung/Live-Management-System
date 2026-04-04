import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../artifacts/api-server/src/app";
import { seedAdminConfig } from "../artifacts/api-server/src/routes/admin";

let seeded = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seed admin config once per cold start
  if (!seeded) {
    await seedAdminConfig();
    seeded = true;
  }

  // Delegate to the Express app
  return app(req as any, res as any);
}
