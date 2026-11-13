/** Route-level regression checks. Every database operation is in memory; no service is contacted. */
import assert from "node:assert/strict";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Writable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";

Object.assign(process.env, {
  NODE_ENV: "test", MONGODB_URI: "mongodb://127.0.0.1:1", MONGODB_DB: "tellme_close_friends_test",
  REDIS_URL: "redis://127.0.0.1:1", CLOUDINARY_URL: "cloudinary://test:test@tellme-tests",
  SMTP_URL: "", VAPID_PUBLIC_KEY: "", VAPID_PRIVATE_KEY: "", OPENWEATHER_API_KEY: "",
});
const db = await import("../src/backend/database.js");
const { defaults } = await import("../src/backend/models.js");
const { registerFriendRoutes } = await import("../src/modules/user/friend.routes.js");
const { registerUserRoutes } = await import("../src/modules/user/user.routes.js");
const { registerStoryRoutes } = await import("../src/modules/story/story.routes.js");
const { registerMediaRoutes } = await import("../src/modules/media/media.routes.js");
const { protectedMediaUrl } = await import("@tellme/database");
const { canViewMoment, storyDTO } = await import("../src/backend/domain.js");
const { isMomentReaction } = await import("@tellme/shared/reactions");
const { normalizeReaction } = await import("../src/backend/social-assets.js");
const { momentSchema, settingsSchema, reaction: reactionSchema } = await import("../src/backend/validation.js");
const { canView } = await import("../../web/src/lib/visibility.ts");

type Doc = Record<string, any>;
const ids = [1, 2, 3, 4].map((n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
let people: Doc[] = ["alice.01", "bob.11", "charlie.03", "daisy.04"].map((username, i) => ({
  _id: ids[i], username, name: username.split(".")[0], avatar: "", cover: "private cover", bio: "private biography", location: "private location",
  following: [], blocked: [], settings: { ...defaults }, createdAt: "2026-11-13T00:00:00.000Z",
}));
let pending: Doc[] = [];
const mediaRecords: Doc[] = [];
const moments = ["public", "connections", "private"].map((privacy, i) => ({ id: `moment-${i}`, image: `image-${i}`, caption: privacy, at: "2026-11-13T00:00:00Z", privacy, reactions: {} }));
let stories: Doc[] = [{ _id: "bob-day", userId: ids[1], privacy: "public", day: "2026-11-13", items: moments, updatedAt: "2026-11-13T00:00:00Z" }, { _id: "bob-private", userId: ids[1], privacy: "private", day: "2026-11-12", items: [moments[0]], updatedAt: "2026-11-12T00:00:00Z" }];
const field = (doc: any, path: string): any => path.split(".").reduce((value, part) => Array.isArray(value) ? value.map((entry) => entry?.[part]) : value?.[part], doc);
const has = (value: any, expected: any) => Array.isArray(value) ? value.includes(expected) : value === expected;
function match(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$and") return cond.every((entry: Doc) => match(doc, entry));
    if (key === "$or") return cond.some((entry: Doc) => match(doc, entry));
    const value = field(doc, key);
    if (cond && typeof cond === "object" && !Array.isArray(cond)) return Object.entries(cond).every(([op, expected]: [string, any]) => op === "$elemMatch" ? Array.isArray(value) && value.some((entry) => match(entry, expected)) : op === "$in" ? expected.some((entry: any) => has(value, entry)) : op === "$nin" ? !expected.some((entry: any) => has(value, entry)) : op === "$ne" ? !has(value, expected) : op === "$exists" ? (value !== undefined) === expected : false);
    return has(value, cond);
  });
}
function stub(collection: any, get: () => Doc[]) {
  collection.insertOne = async (doc: Doc) => { get().push(structuredClone(doc)); return { insertedId: doc._id }; };
  collection.find = (filter: Doc = {}) => {
    let result = get().filter((entry) => match(entry, filter));
    const cursor: any = { sort: () => cursor, skip: (n: number) => { result = result.slice(n); return cursor; }, limit: (n: number) => { result = result.slice(0, n); return cursor; }, toArray: async () => structuredClone(result) };
    return cursor;
  };
  collection.findOne = async (filter: Doc) => structuredClone(get().find((entry) => match(entry, filter)) || null);
  collection.countDocuments = async (filter: Doc) => get().filter((entry) => match(entry, filter)).length;
  collection.updateOne = async (filter: Doc, update: Doc, options: Doc = {}) => {
    let doc = get().find((entry) => match(entry, filter));
    let inserted = false;
    if (!doc && options.upsert) { doc = { ...filter, ...update.$setOnInsert }; get().push(doc); inserted = true; }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    for (const [key, value] of Object.entries(update.$set || {})) {
      if (!key.includes(".")) { doc[key] = value; continue; }
      const parts = key.split("."); let target = doc;
      for (const [index, part] of parts.entries()) {
        const name = part === "$" ? String(doc.items.findIndex((entry: Doc) => entry.id === filter["items.id"])) : part;
        if (index === parts.length - 1) target[name] = value;
        else target = target[name] ||= {};
      }
    }
    for (const [key, value] of Object.entries(update.$addToSet || {})) if (!doc[key].includes(value)) doc[key].push(value);
    for (const [key, value] of Object.entries(update.$pull || {})) doc[key] = doc[key].filter((entry: unknown) => entry !== value);
    return { matchedCount: inserted ? 0 : 1, modifiedCount: 1 };
  };
  collection.deleteOne = async (filter: Doc) => {
    const index = get().findIndex((entry) => match(entry, filter));
    if (index >= 0) get().splice(index, 1);
    return { deletedCount: Number(index >= 0) };
  };
  collection.findOneAndDelete = async (filter: Doc) => {
    const index = get().findIndex((entry) => match(entry, filter));
    return index < 0 ? null : structuredClone(get().splice(index, 1)[0]);
  };
}
stub(db.users, () => people); stub(db.friendRequests, () => pending); stub(db.stories, () => stories);
stub(db.media, () => mediaRecords); stub(db.conversations, () => []);
const jobs: Doc[] = []; stub(db.outbox, () => jobs);
(db.stories as any).aggregate = (pipeline: Doc[]) => {
  let result = structuredClone(stories);
  for (const stage of pipeline) {
    if (stage.$match) result = result.filter((doc) => match(doc, stage.$match));
    else if (stage.$unwind) { const key = stage.$unwind.slice(1); result = result.flatMap((doc) => doc[key].map((entry: Doc) => ({ ...doc, [key]: entry }))); }
    else if (stage.$count) result = result.length ? [{ [stage.$count]: result.length }] : [];
    else throw new Error("Unexpected aggregation stage in the isolated count test");
  }
  return { next: async () => result[0] || null };
};
(db.mongo as any).startSession = () => ({
  withTransaction: async (run: () => Promise<unknown>) => {
    const original = structuredClone({ people, pending, stories });
    try { return await run(); } catch (error) { people = original.people; pending = original.pending; stories = original.stories; throw error; }
  }, endSession: async () => {},
});
const api = new Hono<any>();
api.use("*", async (c, next) => { c.set("user", people.find((person) => person._id === c.req.header("x-test-user"))!); await next(); });
api.onError((error, c) => error instanceof HTTPException ? c.json({ error: error.message }, error.status) : c.json({ error: error.message }, 500));
registerFriendRoutes(api); registerUserRoutes(api); registerStoryRoutes(api); registerMediaRoutes(api);
api.notFound((c) => c.json({ error: "not found" }, 404));
async function call(actor: number, path: string, method = "GET", body?: unknown, expected = 200) {
  const response = await api.request(path, { method, headers: { "x-test-user": ids[actor]!, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result: any = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
  return result;
}
// The retired bulk-delete endpoint must stay absent; individual photo deletion remains registered.
await call(0, "/stories/bob-day", "DELETE", undefined, 404);
const musicCatalog = await import("../src/modules/music/catalog.js");
const { config: musicConfig } = await import("../src/backend/config.js");
const savedEnvironment = musicConfig.NODE_ENV, savedMusicKey = musicConfig.EPIDEMIC_SOUND_API_KEY;
const savedFetch = globalThis.fetch;
let musicUpstreamCalls = 0;
try {
  musicConfig.NODE_ENV = "production"; musicConfig.EPIDEMIC_SOUND_API_KEY = "test-only-key";
  globalThis.fetch = (async () => { musicUpstreamCalls++; throw new Error("No upstream requests are allowed"); }) as typeof fetch;
  assert.equal(musicCatalog.musicAvailability().enabled, false);
  await assert.rejects(musicCatalog.searchMusic("", "0", ids[0]!), (error: unknown) => error instanceof HTTPException && error.status === 503);
  await assert.rejects(musicCatalog.getMusicStream("test-track", ids[0]!), (error: unknown) => error instanceof HTTPException && error.status === 503);
  assert.equal(musicUpstreamCalls, 0, "Production never calls the prototype music provider");
  assert.equal(musicCatalog.musicProviderSchema.safeParse("youtube").success, false);
} finally { musicConfig.NODE_ENV = savedEnvironment; musicConfig.EPIDEMIC_SOUND_API_KEY = savedMusicKey; globalThis.fetch = savedFetch; }

const pair = (a: number, b: number) => encodeURIComponent([ids[a], ids[b]].sort().join(":"));

await call(0, "/users/bob.11", "GET", undefined, 404);
await call(0, "/stories/bob-day", "GET", undefined, 404);
await call(0, "/friends/lookup?id=bob", "GET", undefined, 404);
const lookup = await call(0, "/friends/lookup?id=%40BOB.11");
assert.equal(lookup.relationship, "none"); assert.deepEqual(Object.keys(lookup.person).sort(), ["avatar", "id", "name", "username"]);
await call(0, `/users/${ids[1]}/follow`, "PUT", { following: true }, 404);
await call(0, "/friends/requests", "POST", { tellmeId: "bob.11" }, 201);
assert.deepEqual(people[0]!.following, []); assert.deepEqual(people[1]!.following, []);
await call(1, "/friends/requests", "POST", { tellmeId: "alice.01" }, 409);
await call(0, `/friends/requests/${pair(0, 1)}`, "PUT", { accept: true }, 404);
await call(2, `/friends/requests/${pair(0, 1)}`, "PUT", { accept: true }, 404);
await call(0, "/stories/bob-day", "GET", undefined, 404);
await call(1, `/friends/requests/${pair(0, 1)}`, "PUT", { accept: true });
assert.deepEqual(people[0]!.following, [ids[1]]); assert.deepEqual(people[1]!.following, [ids[0]]); assert.equal(pending.length, 0);
const profile = await call(0, "/users/bob.11"); assert.equal(profile.bio, "private biography"); assert.equal("momentsCount" in profile, false); assert.equal("friendsCount" in profile, false); assert.equal("location" in profile, false);
await call(0, "/archive", "GET", undefined, 404);
await call(0, "/stories/bob-day/saved", "PUT", { saved: true }, 404);
await call(0, "/stories/bob-day/hidden", "PUT", undefined, 404);
const day = await call(0, "/stories/bob-day"); assert.equal(day.privacy, "connections"); assert.deepEqual(day.items.map((item: Doc) => item.caption), ["public", "connections"]);
await call(0, "/stories/bob-private", "GET", undefined, 404);
assert.equal(await canViewMoment(stories[1] as any, "moment-0", people[0] as any), false);
const privateDay = await call(1, "/stories/bob-private"); assert.equal(privateDay.items.length, 1);
await call(0, `/friends/${ids[1]}`, "DELETE");
await call(0, "/users/bob.11", "GET", undefined, 404); await call(0, "/stories/bob-day", "GET", undefined, 404);
assert.deepEqual(people[1]!.following, []);
assert.equal(canView(ids[1]!, "public", { connections: [], blocked: [] }), false, "Legacy public cache must not bypass friendship");

await call(2, "/friends/requests", "POST", { tellmeId: "daisy.04" }, 201);
people[3]!.blocked.push(ids[2]);
await call(3, `/friends/requests/${pair(2, 3)}`, "PUT", { accept: true }, 404);
assert.deepEqual(people[2]!.following, []); assert.deepEqual(people[3]!.following, []);
await call(2, "/friends/lookup?id=daisy.04", "GET", undefined, 404);
await call(0, "/friends/requests", "POST", { tellmeId: "charlie.03" }, 201);
await call(2, `/friends/requests/${pair(0, 2)}`, "PUT", { accept: false });
assert.equal(pending.some((entry) => entry.fromId === ids[0]), false);

// A copied image URL checks the current friendship on every request.
for (const i of [0, 2]) {
  const mediaId = `tellme/${ids[1]}/asset-${i}`;
  const url = protectedMediaUrl(mediaId);
  mediaRecords.push({ _id: mediaId, ownerId: ids[1], url, deliveryType: "authenticated", state: "active" });
  stories[0]!.items[i].image = url;
}
await call(0, "/friends/requests", "POST", { tellmeId: "bob.11" }, 201);
await call(1, `/friends/requests/${pair(0, 1)}`, "PUT", { accept: true });
const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
globalThis.fetch = async (input) => {
  assert.match(String(input), /\/image\/authenticated\/s--/);
  upstreamCalls++;
  return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/webp" } });
};
try {
  const requestImage = (actor: number, index: number) => api.request(mediaRecords[index]!.url.replace(/^\/api/, ""), { headers: { "x-test-user": ids[actor]! } });
  const shared = await requestImage(0, 0);
  assert.equal(shared.status, 200); assert.equal(shared.headers.get("cache-control"), "private, no-store"); assert.equal(shared.headers.get("location"), null); await shared.arrayBuffer();
  assert.equal((await requestImage(0, 1)).status, 404, "A private photo remains private inside an otherwise shared day");
  const own = await requestImage(1, 1); assert.equal(own.status, 200); await own.arrayBuffer();
  await call(0, `/friends/${ids[1]}`, "DELETE");
  assert.equal((await requestImage(0, 0)).status, 404, "An old image link closes after unfriending");
  assert.equal(upstreamCalls, 2, "Denied requests never fetch image bytes");
} finally { globalThis.fetch = originalFetch; }

for (const emoji of ["🥹", "🇻🇳", "👩🏽‍💻", "👨‍👩‍👧‍👦", "❤️", "1️⃣"]) {
  const value = `emoji:${emoji}`;
  assert.equal(isMomentReaction(value), true, emoji);
  assert.equal(reactionSchema.safeParse(value).success, true);
  assert.equal(normalizeReaction(value), value);
}
for (const invalid of ["emoji:", "emoji:hello", "emoji:😀😀", "emoji:<script>", "😀", "emoji:😀text"]) assert.equal(isMomentReaction(invalid), false, invalid);
await call(0, "/friends/requests", "POST", { tellmeId: "bob.11" }, 201);
await call(1, `/friends/requests/${pair(0, 1)}`, "PUT", { accept: true });
await call(0, "/stories/bob-day/moments/moment-0/reaction", "PUT", { reaction: "emoji:👩🏽‍💻" });
const reactedDay = await call(0, "/stories/bob-day");
assert.equal(reactedDay.items[0].reaction, "emoji:👩🏽‍💻", "A native emoji survives the API write/read roundtrip");
await call(1, "/stories/bob-day/moments/moment-0/reaction", "PUT", { reaction: "emoji:❤️" }, 403);

assert.equal(momentSchema.safeParse({ id: ids[0], storyId: ids[1], image: "owned-image", caption: "", storyPrivacy: "public" }).success, false);
assert.equal(settingsSchema.safeParse({ ...defaults, audience: "public" }).success, false);
assert.equal(storyDTO(stories[0] as any, people[2] as any, []).items.length, 0);
// Upload uses the real route and multipart decoding, with only the Cloudinary transport replaced.
const originalUpload = cloudinary.uploader.upload_stream;
let uploadOptions: Doc | undefined;
(cloudinary.uploader as any).upload_stream = (options: Doc, callback: (error: unknown, result?: unknown) => void) => {
  uploadOptions = options;
  return new Writable({ write(_chunk, _encoding, done) { done(); }, final(done) { callback(null, { public_id: options.public_id, secure_url: "https://example.invalid/private.png", format: "png" }); done(); } });
};
try {
  const form = new FormData();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/le0AAAAASUVORK5CYII=", "base64");
  form.set("file", new File([png], "capture.png", { type: "image/png" }));
  const uploaded = await api.request("/media/upload", { method: "POST", headers: { "x-test-user": ids[0]! }, body: form });
  assert.equal(uploaded.status, 201);
  assert.equal(uploadOptions?.type, "authenticated"); assert.equal(uploadOptions?.overwrite, false);
  const body = await uploaded.json() as Doc;
  assert.match(body.url, /^\/api\/media\/images\//); assert.equal(body.url.includes("cloudinary"), false);
  assert.equal(mediaRecords.find((entry) => entry.url === body.url)?.deliveryType, "authenticated");
} finally { cloudinary.uploader.upload_stream = originalUpload; }

const { app } = await import("../src/backend/routes.js");
for (const path of ["/api/bootstrap", "/api/session", "/api/stories", "/api/stories/bob-day", "/api/users/bob.11", "/api/friends/lookup?id=bob.11", mediaRecords[0]!.url]) assert.equal((await app.request(path)).status, 401, `Guests cannot read ${path}`);
// Session validation is the server-rendering boundary: a cookie alone never grants access.
const { createHash } = await import("node:crypto");
const validSession = createHash("sha256").update("valid-session").digest("hex");
(db.sessions as any).findOne = async (filter: Doc) => filter._id === validSession && filter.expiresAt?.$gt instanceof Date
  ? { userId: ids[0], expiresAt: new Date(Date.now() + 60000) } : null;
for (const token of ["forged-session", "expired-session"]) {
  assert.equal((await app.request("/api/session", { headers: { cookie: `tellme_qa_session=${token}` } })).status, 401);
}
const session = await app.request("/api/session", { headers: { cookie: "tellme_qa_session=valid-session" } });
assert.equal(session.status, 200); assert.equal(session.headers.get("Cache-Control"), "private, no-store");
assert.deepEqual(await session.json(), { authenticated: true });
assert.equal((await app.request("/api/session", { headers: { cookie: "tellme_session=valid-session" } })).status, 401, "QA API must not consume a production session cookie");
console.log("PASS: exact-ID lookup, pending requests, recipient-only acceptance, reciprocal request handling, two-way friendship, legacy-public privacy, private legacy moments, revocation, blocking, rejection, authenticated image bytes, image-link revocation, native emoji validation/roundtrip, authenticated upload transport, server session validation, retired bulk deletion, production music gating, and guest access. All storage is in memory.");
