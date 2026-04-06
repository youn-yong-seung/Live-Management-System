import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { solapiConfigTable } from "@workspace/db";

export function solapiAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).substring(2, 12);
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function getSolapiConfig() {
  const rows = await db.select().from(solapiConfigTable).limit(1);
  return rows[0] ?? null;
}

export interface SolapiTemplate {
  templateId: string;
  name: string;
  content: string;
  status: string;
  emphasizeTitle?: string;
  emphasizeSubTitle?: string;
}

export async function fetchSolapiTemplates(apiKey: string, apiSecret: string): Promise<SolapiTemplate[]> {
  const res = await fetch("https://api.solapi.com/kakao/v1/templates?status=APPROVED&limit=100", {
    headers: { Authorization: solapiAuthHeader(apiKey, apiSecret) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Solapi API error ${res.status}: ${text}`);
  }
  const data = await res.json() as { templateList?: SolapiTemplate[] };
  return data.templateList ?? [];
}

export async function sendSmsBatch(
  apiKey: string,
  apiSecret: string,
  senderPhone: string,
  messageBody: string,
  recipients: { phone: string; name: string }[]
): Promise<{ successCount: number; failCount: number }> {
  const { SolapiMessageService } = await import("solapi");
  const service = new SolapiMessageService(apiKey, apiSecret);
  const byteLen = Buffer.byteLength(messageBody, "utf8");
  const msgType = byteLen > 90 ? "LMS" : "SMS";

  let successCount = 0;
  let failCount = 0;

  for (const r of recipients) {
    try {
      await service.send({ to: r.phone, from: senderPhone, text: messageBody, type: msgType as "SMS" | "LMS" });
      successCount++;
    } catch {
      failCount++;
    }
  }

  return { successCount, failCount };
}

export async function sendAlimtalkBatch(
  apiKey: string,
  apiSecret: string,
  senderKey: string,
  senderPhone: string,
  templateId: string,
  recipients: { phone: string; name: string; variables?: Record<string, string> }[]
): Promise<{ successCount: number; failCount: number }> {
  const { SolapiMessageService } = await import("solapi");
  const service = new SolapiMessageService(apiKey, apiSecret);

  let successCount = 0;
  let failCount = 0;

  for (const r of recipients) {
    // Build variables — merge auto + custom, ensure all values are non-empty strings
    // IMPORTANT: Solapi SDK v5 auto-wraps keys in #{}, so we must strip #{} from keys
    const rawVars: Record<string, string> = {
      "#{이름}": r.name,
      "#{고객명}": r.name,
      ...(r.variables ?? {}),
    };

    // Strip #{} from keys and remove empty values
    const cleanVars: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawVars)) {
      if (!v || !v.trim()) continue;
      // Strip #{...} wrapper — SDK adds it automatically
      const cleanKey = k.replace(/^#\{(.+)\}$/, "$1");
      cleanVars[cleanKey] = v;
    }

    const msg = {
      to: r.phone,
      from: senderPhone,
      kakaoOptions: {
        pfId: senderKey,
        templateId,
        variables: cleanVars,
      },
    };

    try {
      await service.send(msg);
      successCount++;
    } catch (err) {
      console.error(`[Alimtalk] Failed to send to ${r.phone}:`, err, JSON.stringify(msg.kakaoOptions));
      failCount++;
    }
  }

  return { successCount, failCount };
}
