import app from "./app";
import { seedAdminConfig } from "./routes/admin";
import type { IncomingMessage, ServerResponse } from "http";

let seeded = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!seeded) {
    await seedAdminConfig();
    seeded = true;
  }
  return app(req as any, res as any);
}
