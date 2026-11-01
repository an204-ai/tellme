import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../packages/database/package.json", import.meta.url));
const { generateVAPIDKeys, setVapidDetails } = require("web-push");
const envPath = new URL("../../.env", import.meta.url);
let source = readFileSync(envPath, "utf8");
const value = (key) => source.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim().replace(/^['"]|['"]$/g, "");
const hasPublic = !!value("VAPID_PUBLIC_KEY"), hasPrivate = !!value("VAPID_PRIVATE_KEY");
if (hasPublic !== hasPrivate) throw new Error("VAPID chỉ có một nửa cặp khóa. Cần kiểm tra trước khi thay khóa đã dùng.");
if (hasPublic) { setVapidDetails(value("VAPID_SUBJECT") || "mailto:hello@tellme.local", value("VAPID_PUBLIC_KEY"), value("VAPID_PRIVATE_KEY")); console.log("VAPID đã có cặp khóa; giữ nguyên để không làm hỏng subscription."); process.exit(0); }
const keys = generateVAPIDKeys();
for (const [key, val] of Object.entries({ VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey })) {
  const line = `${key}=${val}`;
  source = new RegExp(`^${key}=.*$`, "m").test(source) ? source.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${source.trimEnd()}\n${line}\n`;
}
if (!value("VAPID_SUBJECT") || value("VAPID_SUBJECT") === "mailto:hello@tellme.local") {
  const subject = "mailto:hello@tellme.local";
  source = /^VAPID_SUBJECT=.*$/m.test(source) ? source.replace(/^VAPID_SUBJECT=.*$/m, `VAPID_SUBJECT=${subject}`) : `${source.trimEnd()}\nVAPID_SUBJECT=${subject}\n`;
}
writeFileSync(envPath, source, { mode: 0o600 });
console.log("Đã lưu cặp VAPID vào .env gốc. Không in khóa ra terminal.");
