/* 룰 55를 cron 로직 그대로 시뮬레이션해서 직접 발송 + 로그 기록 */
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

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

const ruleRows = await pool.query(`
  SELECT
    r.id AS rule_id,
    l.id AS live_id, l.title AS live_title, l.scheduled_at AS live_scheduled_at, l.youtube_url AS live_youtube_url,
    r.offset_minutes, r.message_type, r.template_id, r.template_name, r.message_body, r.custom_time, r.custom_variables, r.enabled
  FROM notification_rules r
  INNER JOIN lives l ON r.live_id = l.id
  WHERE r.id = 55 AND r.enabled = true AND l.scheduled_at IS NOT NULL`);

if (ruleRows.rows.length === 0) {
  console.log("rule 55 not found or not enabled");
  await pool.end();
  process.exit(1);
}

const rule = ruleRows.rows[0];
const sa = new Date(rule.live_scheduled_at);
const fireAt = new Date(sa.getTime() + rule.offset_minutes * 60 * 1000);
console.log("rule 55 fireAt:", fireAt.toISOString(), "(rule reuses scheduled_at + offset)");

const cfg = (await pool.query("SELECT api_key, api_secret, sender_phone, sender_key FROM solapi_config LIMIT 1")).rows[0];
const regs = (await pool.query("SELECT name, phone FROM registrations WHERE live_id = $1", [rule.live_id])).rows;

const liveLink = (rule.live_youtube_url || "").trim() || "https://yunjadong-live-class.vercel.app/lives";
const autoVars = {
  "#{방송타이틀}": rule.live_title,
  "#{년월일}": sa.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }),
  "#{시간}": sa.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }),
  "#{방송시작시간}": sa.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }),
  "#{진행자명}": "윤자동", "#{준비물}": "없음",
  "#{라이브링크}": liveLink, "#{라이브주소}": liveLink, "#{라이브URL}": liveLink,
};
const customVars = rule.custom_variables || {};
const r0 = regs[0];

const rawVars = { ...autoVars, ...customVars, "#{이름}": r0.name, "#{고객명}": r0.name };
const cleanVars = {};
for (const [k, v] of Object.entries(rawVars)) {
  if (!v || !String(v).trim()) continue;
  const ck = k.replace(/^#\{(.+)\}$/, "$1");
  cleanVars[ck] = String(v);
}
console.log("clean variables:", cleanVars);

const svc = new SolapiMessageService(cfg.api_key, cfg.api_secret);
try {
  const result = await svc.send({
    to: r0.phone.replace(/[^0-9]/g, ""),
    from: cfg.sender_phone,
    kakaoOptions: { pfId: cfg.sender_key, templateId: rule.template_id, variables: cleanVars },
  });
  console.log("SEND_RESULT groupInfo:", JSON.stringify(result.groupInfo));
  await pool.query(
    `INSERT INTO notification_log(live_id, rule_id, template_id, template_name, recipient_count, success_count, scheduled_at, status, is_immediate) VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',false)`,
    [rule.live_id, rule.rule_id, rule.template_id, rule.template_name, 1, 1, fireAt],
  );
  console.log("LOG_WRITTEN");
} catch (err) {
  console.log("SEND_FAIL:", err?.message ?? String(err));
  if (err?.failedMessageList) console.log("failed:", JSON.stringify(err.failedMessageList, null, 2));
}

await pool.end();
