import { randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import { createAdminFixture } from "./admin-fixtures.js";
const fixture = await createAdminFixture();
const { db, ids } = fixture;
const template = (await db.posts.findOne({ _id: ids.post }))!;
for (let index = 1; index <= 13; index++) {
  const at = new Date(Date.now() - index * 86400000).toISOString();
  for (let offset = 0; offset < 1 + index % 4; offset++) await db.posts.insertOne({ ...template, _id: randomUUID(), content: `[QA] Chuyện đi làm ngày ${index} · ${offset + 1}`, createdAt: at, comments: [] });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
  await db.activityDays.insertOne({ _id: `${day}:${ids.user}`, userId: ids.user, day, at: new Date(at) });
}
const stopLogs = db.startLogWriter();
const server = serve({ fetch: fixture.app.fetch, hostname: "127.0.0.1", port: 4111 });
let stopping = false;
async function stop() { if (stopping) return; stopping = true; server.close(); stopLogs(); await db.flushServerLogs(); await fixture.cleanup(); process.exit(0); }
process.once("SIGINT", () => { void stop(); }); process.once("SIGTERM", () => { void stop(); });
console.log("Isolated admin QA API: http://127.0.0.1:4111. Login admin@tellme-qa.example / Tellme-QA-only-2026! (test credentials only).");
