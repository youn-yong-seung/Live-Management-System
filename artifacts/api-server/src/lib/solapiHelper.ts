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

export async function sendAlimtalkBatch(
  apiKey: string,
  apiSecret: string,
  senderKey: string,
  senderPhone: string,
  templateId: string,
  recipients: { phone: string; name: string; variables?: Record<string, string> }[]
): Promise<{ successCount: number; failCount: number }> {
  const messages = recipients.map((r) => ({
    to: r.phone,
    from: senderPhone,
    kakaoOptions: {
      pfId: senderKey,
      templateId,
      variables: {
        "#{이름}": r.name,
        ...(r.variables ?? {}),
      },
    },
  }));

  const { SolapiMessageService } = await import("solapi");
  const service = new SolapiMessageService(apiKey, apiSecret);

  let successCount = 0;
  let failCount = 0;

  for (const msg of messages) {
    try {
      await service.send(msg);
      successCount++;
    } catch {
      failCount++;
    }
  }

  return { successCount, failCount };
}
