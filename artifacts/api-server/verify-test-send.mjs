/* 라이브 70 발송 메시지 본문을 Solapi에서 조회해 링크 변수가 정상 렌더됐는지 검증 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pg = require("/Users/yun_mini/Desktop/Live-Management-System/lib/db/node_modules/pg");
const { SolapiMessageService } = await import("/Users/yun_mini/Desktop/Live-Management-System/artifacts/api-server/node_modules/solapi/dist/index.mjs");
import fs from "fs";
const env = fs.readFileSync(new URL("../../.env", import.meta.url), "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const targetLiveId = parseInt(process.argv[2] ?? "70", 10);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

const cfg = (await pool.query("SELECT api_key, api_secret, sender_phone FROM solapi_config LIMIT 1")).rows[0];
if (!cfg?.api_key) { console.error("solapi config missing"); process.exit(1); }

const live = (await pool.query("SELECT id, title, youtube_url FROM lives WHERE id = $1", [targetLiveId])).rows[0];
const reg = (await pool.query("SELECT id, name, phone FROM registrations WHERE live_id = $1 ORDER BY id LIMIT 1", [targetLiveId])).rows[0];
const log = (await pool.query("SELECT id, sent_at, success_count, recipient_count, status FROM notification_log WHERE live_id = $1 ORDER BY id DESC LIMIT 1", [targetLiveId])).rows[0];

console.log(JSON.stringify({ live, reg, log }, null, 2));

if (!log) { console.error("no log yet"); await pool.end(); process.exit(2); }

const svc = new SolapiMessageService(cfg.api_key, cfg.api_secret);
// node-pg returns timestamp-without-tz as if local; DB stores UTC. Just use wide window from now.
const nowMs = Date.now();
const startDate = new Date(nowMs - 30 * 60 * 1000);
const endDate = new Date(nowMs + 5 * 60 * 1000);

const cleanedPhone = reg.phone.replace(/[^0-9]/g, "");
const result = await svc.getMessages({
  to: cleanedPhone,
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  limit: 20,
});

const messages = Object.values(result.messageList ?? {});
console.log(`\n=== Found ${messages.length} messages to ${cleanedPhone} in window ===\n`);
for (const m of messages) {
  console.log(`messageId=${m.messageId} status=${m.statusCode} type=${m.type} from=${m.from}`);
  if (m.text) {
    console.log("--- text ---");
    console.log(m.text);
    console.log("------------");
    const expected = (live.youtube_url ?? "").trim();
    if (expected && m.text.includes(expected)) {
      console.log(`✅ LINK FOUND: "${expected}" present in message body`);
    } else {
      console.log(`❌ LINK MISSING: expected "${expected}" not in message body`);
    }
  }
  console.log();
}

await pool.end();
