/** Route-level regression checks. Every database operation is in memory; no service is contacted. */
import assert from "node:assert/strict";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Writable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { ZodError } from "zod";

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
const { registerPhotoGroupRoutes } = await import("../src/modules/story/photo-group.routes.js");
const { registerMediaRoutes } = await import("../src/modules/media/media.routes.js");
const { protectedMediaUrl, MediaUnavailable, cleanMedia } = await import("@tellme/database");
const { canViewMoment, storyDTO, personDTO } = await import("../src/backend/domain.js");
const { isMomentReaction } = await import("@tellme/shared/reactions");
const { normalizeReaction } = await import("../src/backend/social-assets.js");
const { profileSchema, momentSchema, momentCaptionSchema, settingsSchema, reaction: reactionSchema } = await import("../src/backend/validation.js");
const { canView } = await import("../../web/src/lib/visibility.ts");

type Doc = Record<string, any>;
const ids = [1, 2, 3, 4].map((n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
let people: Doc[] = ["alice.01", "bob.11", "charlie.03", "daisy.04"].map((username, i) => ({
  _id: ids[i], username, name: username.split(".")[0], avatar: "", cover: "private cover", bio: "private biography", location: "private location",
  following: [], blocked: [], settings: { ...defaults }, createdAt: "2026-11-13T00:00:00.000Z",
}));
for (const number of [1, 100]) assert.equal(personDTO({ ...people[0], memberNumber: number } as any, people[0] as any).foundingMember, true);
for (const number of [undefined, 0, 101, 1.5]) assert.equal(personDTO({ ...people[0], memberNumber: number } as any, people[0] as any).foundingMember, false);
assert.equal("memberNumber" in profileSchema.parse({ ...people[0], memberNumber: 1 }), false, "A profile update cannot award the founding mark");
assert.equal(momentCaptionSchema.safeParse('một hai ba bốn năm sáu bảy tám').success, true);
assert.equal(momentCaptionSchema.safeParse('a b c d e f g h i').success, false, 'API rejects a ninth caption word');
assert.equal(momentCaptionSchema.safeParse('a'.repeat(41)).success, false, 'API rejects overlong one-word captions');
assert.equal(momentCaptionSchema.parse('một\nhai'), 'một hai', 'API normalizes captions onto one line');
let pending: Doc[] = [];
const mediaRecords: Doc[] = [];
const moments = ["public", "connections", "private"].map((privacy, i) => ({ id: `moment-${i}`, image: `image-${i}`, caption: privacy, at: "2026-11-13T00:00:00Z", privacy, reactions: {} }));
let albums: Doc[] = [], albumPhotos: Doc[] = [];
let stories: Doc[] = [{ _id: "bob-day", userId: ids[1], privacy: "public", day: "2026-11-13", items: moments, updatedAt: "2026-11-13T00:00:00Z" }, { _id: "bob-private", userId: ids[1], privacy: "private", day: "2026-11-12", items: [moments[0]], updatedAt: "2026-11-12T00:00:00Z" }];
const field = (doc: any, path: string): any => path.split(".").reduce((value, part) => Array.isArray(value) && !/^\d+$/.test(part) ? value.map((entry) => entry?.[part]) : value?.[part], doc);
const has = (value: any, expected: any) => Array.isArray(value) ? value.includes(expected) : value === expected;
function match(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$and") return cond.every((entry: Doc) => match(doc, entry));
    if (key === "$or") return cond.some((entry: Doc) => match(doc, entry));
    const value = field(doc, key);
    if (cond && typeof cond === "object" && !Array.isArray(cond)) return Object.entries(cond).every(([op, expected]: [string, any]) => op === "$elemMatch" ? Array.isArray(value) && value.some((entry) => match(entry, expected)) : op === "$in" ? expected.some((entry: any) => has(value, entry)) : op === "$nin" ? !expected.some((entry: any) => has(value, entry)) : op === "$ne" ? !has(value, expected) : op === "$lte" ? value <= expected : op === "$lt" ? value < expected : op === "$gt" ? value > expected : op === "$exists" ? (value !== undefined) === expected : false);
    return has(value, cond);
  });
}
function stub(collection: any, get: () => Doc[]) {
  collection.insertOne = async (doc: Doc) => { get().push(structuredClone(doc)); return { insertedId: doc._id }; };
  collection.find = (filter: Doc = {}) => {
    let result = get().filter((entry) => match(entry, filter));
    const cursor: any = { sort: (order: Doc) => { result.sort((a, b) => { for (const [key, direction] of Object.entries(order)) { const diff = String(a[key]).localeCompare(String(b[key])) * Number(direction); if (diff) return diff; } return 0; }); return cursor; }, skip: (n: number) => { result = result.slice(n); return cursor; }, limit: (n: number) => { result = result.slice(0, n); return cursor; }, toArray: async () => structuredClone(result) };
    return cursor;
  };
  collection.findOne = async (filter: Doc) => structuredClone(get().find((entry) => match(entry, filter)) || null);
  collection.countDocuments = async (filter: Doc) => get().filter((entry) => match(entry, filter)).length;
  collection.updateOne = async (filter: Doc, update: Doc, options: Doc = {}) => {
    let doc = get().find((entry) => match(entry, filter));
    let inserted = false;
    if (!doc && options.upsert) { doc = { ...filter, ...update.$setOnInsert }; get().push(doc); inserted = true; }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    if (collection === db.photoGroups && update.$addToSet?.activeMemberIds && albums.some((g) => g._id !== doc!._id && g.activeMemberIds?.includes(update.$addToSet.activeMemberIds))) throw Object.assign(new Error("duplicate group reservation"), { code: 11000 });
    for (const [key, value] of Object.entries(update.$set || {})) {
      if (!key.includes(".")) { doc[key] = value; continue; }
      const parts = key.split("."); let target = doc;
      for (const [index, part] of parts.entries()) {
        const name = part === "$" ? String(doc.items.findIndex((entry: Doc) => entry.id === filter["items.id"])) : part;
        if (index === parts.length - 1) target[name] = value;
        else target = target[name] ||= {};
      }
    }
    for (const key of Object.keys(update.$unset || {})) delete doc[key];
    for (const [key, value] of Object.entries(update.$addToSet || {})) { doc[key] ||= []; for (const v of (value && typeof value === "object" && "$each" in value ? (value as Doc).$each : [value])) if (!doc[key].includes(v)) doc[key].push(v); }
    for (const [key, value] of Object.entries(update.$push || {})) (doc[key] ||= []).push(value);
    for (const [key, value] of Object.entries(update.$pull || {})) doc[key] = (doc[key] || []).filter((entry: unknown) => value && typeof value === "object" ? !match(entry as Doc, value as Doc) : entry !== value);
    return { matchedCount: inserted ? 0 : 1, modifiedCount: 1, upsertedCount: Number(inserted) };
  };
  collection.updateMany = async (filter: Doc, update: Doc) => { for (const doc of get().filter((entry) => match(entry, filter))) await collection.updateOne({ _id: doc._id }, update); return { modifiedCount: 1 }; };
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
stub(db.photoGroups, () => albums); stub(db.groupPhotos, () => albumPhotos);
(db.photoGroups as any).insertOne = async (doc: Doc) => {
  if (albums.some((group) => group._id === doc._id || group.activeMemberIds?.some((id: string) => doc.activeMemberIds?.includes(id)))) throw Object.assign(new Error("duplicate group reservation"), { code: 11000 });
  albums.push(structuredClone(doc)); return { insertedId: doc._id };
};
(db.media as any).findOneAndUpdate = async (filter: Doc, update: Doc) => { const item = mediaRecords.find((row) => match(row, filter)); if (!item) return null; Object.assign(item, update.$set); return structuredClone(item); };
(db.groupPhotos as any).aggregate = (pipeline: Doc[]) => {
  const filter = pipeline[0].$match;
  const rows = albumPhotos.filter((photo) => match(photo, filter)).sort((a, b) => b.at.localeCompare(a.at) || b._id.localeCompare(a._id));
  const byGroup = new Map<string, Doc>();
  for (const photo of rows) { const summary = byGroup.get(photo.groupId); if (summary) summary.count++; else byGroup.set(photo.groupId, { _id: photo.groupId, latest: photo, count: 1 }); }
  return { toArray: async () => structuredClone([...byGroup.values()]) };
};
const jobs: Doc[] = []; stub(db.outbox, () => jobs);
function expression(value: any, doc: Doc, vars: Doc = {}): any {
  if (typeof value === "string") return value.startsWith("$$") ? field(vars, value.slice(2)) : value.startsWith("$") ? field(doc, value.slice(1)) : value;
  if (Array.isArray(value)) return value.map((item) => expression(item, doc, vars));
  if (!value || typeof value !== "object") return value;
  const [op, args] = Object.entries(value)[0]!;
  if (op === "$filter") { const spec: any = args; return expression(spec.input, doc, vars).filter((item: Doc) => expression(spec.cond, doc, { ...vars, [spec.as]: item })); }
  const values = expression(args, doc, vars);
  if (op === "$ifNull") return values[0] ?? values[1];
  if (op === "$eq") return values[0] === values[1];
  if (op === "$in") return values[1].includes(values[0]);
  if (op === "$or") return values.some(Boolean);
  if (op === "$and") return values.every(Boolean);
  if (op === "$max") return [...values].sort().at(-1);
  throw new Error(`Unexpected expression ${op}`);
}
(db.stories as any).aggregate = (pipeline: Doc[]) => {
  let result = structuredClone(stories);
  for (const stage of pipeline) {
    if (stage.$match) result = result.filter((doc) => match(doc, stage.$match));
    else if (stage.$set) result = result.map((doc) => ({ ...doc, ...Object.fromEntries(Object.entries(stage.$set).map(([key, value]) => [key, expression(value, doc)])) }));
    else if (stage.$sort) result.sort((a, b) => { for (const [key, direction] of Object.entries(stage.$sort)) { const order = String(a[key]).localeCompare(String(b[key])) * Number(direction); if (order) return order; } return 0; });
    else if (stage.$skip !== undefined) result = result.slice(stage.$skip);
    else if (stage.$limit !== undefined) result = result.slice(0, stage.$limit);
    else if (stage.$unwind) { const key = stage.$unwind.slice(1); result = result.flatMap((doc) => doc[key].map((entry: Doc) => ({ ...doc, [key]: entry }))); }
    else if (stage.$count) result = result.length ? [{ [stage.$count]: result.length }] : [];
    else throw new Error("Unexpected aggregation stage");
  }
  return { next: async () => result[0] || null, toArray: async () => result };
};
(db.mongo as any).startSession = () => ({
  withTransaction: async (run: () => Promise<unknown>) => {
    const original = structuredClone({ people, pending, stories, albums, albumPhotos });
    try { return await run(); } catch (error) { people = original.people; pending = original.pending; stories = original.stories; albums = original.albums; albumPhotos = original.albumPhotos; throw error; }
  }, endSession: async () => {},
});
const api = new Hono<any>();
api.use("*", async (c, next) => { c.set("user", people.find((person) => person._id === c.req.header("x-test-user"))!); await next(); });
api.onError((error, c) => error instanceof HTTPException ? c.json({ error: error.message }, error.status) : error instanceof ZodError || error instanceof MediaUnavailable ? c.json({ error: error.message }, 400) : c.json({ error: error.message }, 500));
registerFriendRoutes(api); registerUserRoutes(api); registerStoryRoutes(api); registerPhotoGroupRoutes(api); registerMediaRoutes(api);
api.notFound((c) => c.json({ error: "not found" }, 404));
async function call(actor: number, path: string, method = "GET", body?: unknown, expected = 200) {
  const response = await api.request(path, { method, headers: { "x-test-user": ids[actor]!, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result: any = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
  return result;
}
// The welcome belongs only to the authenticated founding account, and can be claimed once.
people[0]!.memberNumber = 1;
assert.equal((await call(0, "/users/me/founding-welcome", "POST")).celebrate, true);
const welcomedAt = people[0]!.foundingWelcomedAt;
assert.equal((await call(0, "/users/me/founding-welcome", "POST")).celebrate, false);
assert.equal(people[0]!.foundingWelcomedAt, welcomedAt);
assert.equal((await call(1, "/users/me/founding-welcome", "POST")).celebrate, false);
assert.equal(people[1]!.foundingWelcomedAt, undefined);
assert.equal(personDTO(people[0] as any, people[0] as any).foundingWelcomePending, false);
assert.equal("foundingWelcomePending" in personDTO(people[0] as any, people[1] as any), false);
assert.equal("foundingWelcomedAt" in profileSchema.parse({ ...people[0], foundingWelcomedAt: "forged" }), false);
// The retired bulk-delete endpoint must stay absent; individual photo deletion remains registered.
await call(0, "/stories/bob-day", "DELETE", undefined, 404);
const postedMomentsBeforeEdit = structuredClone(moments);
await call(1, "/stories/bob-day/moments/moment-0", "PATCH", { caption: "Đổi chú thích" }, 404);
assert.deepEqual(moments, postedMomentsBeforeEdit, "Posted photos cannot be edited, even by their author");
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
// Author selection paginates that friend's visible days, never a sparse all-feed page.
const savedStories = structuredClone(stories);
for (const [id, userId, at] of [["bob-older", ids[1], "2026-11-10T12:00:00Z"], ["alice-new", ids[0], "2026-11-14T12:00:00Z"], ["charlie-new", ids[2], "2026-11-15T12:00:00Z"]]) stories.push({ _id: id, userId, privacy: "connections", day: at!.slice(0, 10), items: [{ ...moments[0], at }], updatedAt: "2099-01-01T00:00:00Z" });
const firstFriendPage = await call(0, `/stories?author=${ids[1]}&limit=1`);
assert.deepEqual(firstFriendPage.items.map((story: Doc) => story.id), ["bob-day"], "Newest photo wins even if an older day was edited later");
assert.deepEqual(firstFriendPage.items[0].items.map((item: Doc) => item.caption), ["public", "connections"], "Private moments remain excluded");
assert.equal(firstFriendPage.nextCursor, 1);
const nextFriendPage = await call(0, `/stories?author=${ids[1]}&limit=1&cursor=1`);
assert.deepEqual(nextFriendPage.items.map((story: Doc) => story.id), ["bob-older"]);
assert.equal(nextFriendPage.nextCursor, null);
assert.deepEqual((await call(0, `/stories?author=${ids[2]}`)).items, [], "Filtering cannot expose a non-friend");
people[0]!.blocked.push(ids[1]);
assert.deepEqual((await call(0, `/stories?author=${ids[1]}`)).items, [], "Filtering cannot expose a blocked account");
people[0]!.blocked.pop();
assert.deepEqual((await call(0, "/stories?author=me")).items.map((story: Doc) => story.id), ["alice-new"]);
stories = savedStories;

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
for (const path of ["/api/bootstrap", "/api/session", "/api/stories", "/api/photo-groups", "/api/stories/bob-day", "/api/users/bob.11", "/api/friends/lookup?id=bob.11", mediaRecords[0]!.url]) assert.equal((await app.request(path)).status, 401, `Guests cannot read ${path}`);
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
// Group photos have their own membership and media boundary, not the normal friend feed.
const groupId = "10000000-0000-4000-8000-000000000001";
const groupInput = { id: groupId, title: "Hội đi ăn", avatar: "/images/group-avatars/group-friends.png", memberIds: [ids[1]] };
await call(0, "/photo-groups", "POST", { ...groupInput, memberIds: [ids[2]] }, 403);
await call(0, "/photo-groups", "POST", groupInput, 201);
await call(0, "/photo-groups", "POST", groupInput, 201);
assert.equal(albums.length, 1, "Retrying group creation is idempotent");
assert.deepEqual((await call(2, "/photo-groups")).items, []);
assert.equal((await call(1, "/photo-groups")).items.length, 0, "An invitation does not expose group membership or history");
assert.equal((await call(1, "/photo-groups")).invitations.length, 1);
assert.deepEqual(albums[0]!.memberIds, [ids[0]]);
assert.deepEqual(albums[0]!.activeMemberIds, [ids[0]], "Pending invitations do not reserve the invitee");
await call(1, `/photo-groups/${groupId}/photos`, "GET", undefined, 404);
await call(2, `/photo-groups/${groupId}/invitations/accept`, "POST", undefined, 404);
await call(1, `/photo-groups/${groupId}/invitations/accept`, "POST");
await call(1, `/photo-groups/${groupId}/invitations/accept`, "POST");
assert.equal((await call(1, "/photo-groups")).items[0].count, 0);
assert.equal((await call(1, "/photo-groups")).invitations.length, 0);
const groupMediaId = `tellme/${ids[1]}/group-only`;
const groupImage = protectedMediaUrl(groupMediaId);
mediaRecords.push({ _id: groupMediaId, ownerId: ids[1], url: groupImage, deliveryType: "authenticated", state: "active" });
const photoId = "20000000-0000-4000-8000-000000000001";
const photoInput = { id: photoId, image: groupImage, caption: "Cả nhóm đi ăn" };
const regularBeforeGroup = structuredClone(stories);
await call(2, `/photo-groups/${groupId}/photos`, "POST", photoInput, 404);
await call(0, `/photo-groups/${groupId}/photos`, "POST", photoInput, 400); // Media belongs to Bob, not Alice.
await call(1, `/photo-groups/${groupId}/photos`, "POST", { ...photoInput, userId: ids[0] }, 400);
await call(1, `/photo-groups/${groupId}/photos`, "POST", photoInput, 201);
await call(1, `/photo-groups/${groupId}/photos`, "POST", { ...photoInput, caption: "Không được đổi" }, 201);
assert.equal(albumPhotos[0]!.caption, photoInput.caption, "Retry cannot edit a posted photo");
assert.equal(albumPhotos.length, 1);
assert.deepEqual(stories, regularBeforeGroup, "Group uploads do not enter ordinary stories");
assert.equal((await call(0, `/photo-groups/${groupId}/photos`)).items[0].userId, ids[1]);
await call(2, `/photo-groups/${groupId}/photos`, "GET", undefined, 404);
await call(0, `/photo-groups/${groupId}/photos/${photoId}`, "DELETE", undefined, 404);
await call(1, `/photo-groups/${groupId}/photos/${photoId}`, "PATCH", { caption: "Edited" }, 404);
// Pagination is newest-first even when timestamps tie, with no repeats across cursors.
for (let n = 2; n <= 25; n++) albumPhotos.push({ _id: `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`, groupId, userId: ids[1], image: groupImage, caption: `${n}`, at: albumPhotos[0]!.at });
const groupPage1 = await call(0, `/photo-groups/${groupId}/photos`);
assert.equal(groupPage1.items.length, 20); assert.equal(groupPage1.items[0].caption, "25");
const groupPage2 = await call(0, `/photo-groups/${groupId}/photos?cursor=${encodeURIComponent(groupPage1.nextCursor)}`);
assert.equal(groupPage2.items.length, 5); assert.equal(groupPage2.nextCursor, null);
assert.equal(new Set([...groupPage1.items, ...groupPage2.items].map((p: Doc) => p.id)).size, 25);
const groupSummary = (await call(0, "/photo-groups")).items[0];
assert.equal(groupSummary.latest.id, groupPage1.items[0].id); assert.equal(groupSummary.count, 25);
assert.equal(groupSummary.members.length, 2);
// Membership survives unfriending, but neither friendship alone nor a copied URL grants membership.
people[0]!.following = []; people[1]!.following = [ids[2]]; people[2]!.following = [ids[1]];
globalThis.fetch = async () => new Response(new Uint8Array([1]), { headers: { "content-type": "image/webp" } });
try {
  const imageAs = (actor: number) => api.request(groupImage.replace(/^\/api/, ""), { headers: { "x-test-user": ids[actor]! } });
  assert.equal((await imageAs(0)).status, 200, "Current members can read photos after unfriending");
  assert.equal((await imageAs(2)).status, 404, "Friends outside the group cannot read group-only bytes");
  albums[0]!.memberIds = [ids[1]];
  assert.equal((await imageAs(0)).status, 404, "Removing membership revokes copied image links");
  albums[0]!.memberIds = [ids[0], ids[1]];
  people[1]!.blocked.push(ids[0]);
  await call(0, `/photo-groups/${groupId}/photos`, "GET", undefined, 404);
  const blockedGroup = (await call(0, "/photo-groups")).items[0];
  assert.equal(blockedGroup.title, "Nhóm không khả dụng"); assert.equal(blockedGroup.canPost, false); assert.equal(blockedGroup.isJoined, true); assert.equal(blockedGroup.latest, undefined);
  assert.equal((await imageAs(0)).status, 404, "A reverse block also revokes group media");
  people[1]!.blocked = [];
} finally { globalThis.fetch = originalFetch; }
const originalDestroy = cloudinary.uploader.destroy;
let destroyed = false;
(cloudinary.uploader as any).destroy = async () => { destroyed = true; return { result: "ok" }; };
try { await cleanMedia(ids[1]!, groupImage); assert.equal(destroyed, false, "Cleanup preserves media referenced only by a group photo"); }
finally { cloudinary.uploader.destroy = originalDestroy; }
await call(1, `/photo-groups/${groupId}/photos/${photoId}`, "DELETE");
assert.equal(albumPhotos.length, 24); assert.equal(jobs.some((job) => job.kind === "media.cleanup" && job.data?.url === groupImage), true);
// Timed membership is exclusive, while expired/cancelled/left group history remains private and readable.
people = people.map((person) => ({ ...person, following: ids.filter((id) => id !== person._id), blocked: [] }));
await call(0, "/photo-groups", "POST", { ...groupInput, id: "10000000-0000-4000-8000-000000000002", durationDays: 2 }, 400);
await call(0, "/photo-groups", "POST", { ...groupInput, id: "10000000-0000-4000-8000-000000000002", durationDays: 3 }, 409);
await call(1, `/photo-groups/${groupId}/end`, "POST", undefined, 404);
assert.equal((Date.parse(albums[0]!.expiresAt) - Date.parse(albums[0]!.createdAt)) / 86400000, 1);
albums[0]!.expiresAt = new Date(Date.now() - 1).toISOString();
assert.equal((await call(0, "/photo-groups")).items[0].canPost, false);
await call(1, `/photo-groups/${groupId}/photos`, "POST", { ...photoInput, id: "20000000-0000-4000-8000-000000000030" }, 409);
await call(1, `/photo-groups/${groupId}/photos`, "POST", { ...photoInput, id: groupPage1.items[0].id }, 201); // A completed retry remains truthful after expiry.
assert.equal((await call(0, `/photo-groups/${groupId}/photos`)).items.length, 20);
await call(0, `/photo-groups/${groupId}/leave`, "POST");
assert.equal(albums[0]!.activeMemberIds, undefined, "Expired leave unsets all reservations instead of creating an empty sparse-index array");
const keptPhotos = structuredClone(albumPhotos), keptJobs = jobs.length;
const secondGroupId = "10000000-0000-4000-8000-000000000002";
await call(0, "/photo-groups", "POST", { ...groupInput, id: secondGroupId, durationDays: 3 }, 201);
assert.equal(albums[0]!.activeMemberIds, undefined, "Expired reservations are released without deleting the album");
assert.equal((Date.parse(albums[1]!.expiresAt) - Date.parse(albums[1]!.createdAt)) / 86400000, 3);
await call(0, `/photo-groups/${secondGroupId}/leave`, "POST", undefined, 400);
await call(1, `/photo-groups/${secondGroupId}/invitations/accept`, "POST");
await call(1, `/photo-groups/${secondGroupId}/leave`, "POST");
await call(1, `/photo-groups/${secondGroupId}/photos`, "POST", { ...photoInput, id: "20000000-0000-4000-8000-000000000031" }, 409);
const thirdGroupId = "10000000-0000-4000-8000-000000000003";
await call(1, "/photo-groups", "POST", { ...groupInput, id: thirdGroupId, memberIds: [ids[2]], durationDays: 7 }, 201);
await call(2, `/photo-groups/${thirdGroupId}/invitations/accept`, "POST");
assert.equal((Date.parse(albums[2]!.expiresAt) - Date.parse(albums[2]!.createdAt)) / 86400000, 7);
await call(0, "/photo-groups", "POST", { ...groupInput, id: "10000000-0000-4000-8000-000000000004", memberIds: [ids[2]] }, 409);
await call(1, `/photo-groups/${thirdGroupId}/end`, "POST");
await call(0, `/photo-groups/${secondGroupId}/end`, "POST");
await call(0, `/photo-groups/${secondGroupId}/end`, "POST");
assert.deepEqual(albumPhotos, keptPhotos, "Ending/expiry/leaving never removes already posted photos");
assert.equal(jobs.length, keptJobs, "Ending a group does not enqueue media cleanup");
globalThis.fetch = async () => new Response(new Uint8Array([1]), { headers: { "content-type": "image/webp" } });
try { assert.equal((await api.request(groupImage.replace(/^\/api/, ""), { headers: { "x-test-user": ids[0]! } })).status, 200, "An archived stack retains protected image access"); } finally { globalThis.fetch = originalFetch; }
// Uploaded avatar references are owned, protected and retained for archives; invitees can see identity only.
const avatarGroup = "10000000-0000-4000-8000-000000000006";
const uploadedAvatar = protectedMediaUrl(`tellme/${ids[0]}/album-avatar`);
mediaRecords.push({ _id: `tellme/${ids[0]}/album-avatar`, ownerId: ids[0], url: uploadedAvatar, state: "active", deliveryType: "authenticated" });
await call(0, "/photo-groups", "POST", { ...groupInput, id: avatarGroup, avatar: "https://example.invalid/not-owned.jpg" }, 400);
await call(0, "/photo-groups", "POST", { ...groupInput, id: avatarGroup, avatar: uploadedAvatar }, 201);
assert.equal(albums.find((g) => g._id === avatarGroup)!.avatar, uploadedAvatar);
assert.equal((await call(1, "/photo-groups")).invitations.length, 1);
globalThis.fetch = async () => new Response(new Uint8Array([1]), { headers: { "content-type": "image/webp" } });
try {
  assert.equal((await api.request(uploadedAvatar.replace(/^\/api/, ""), { headers: { "x-test-user": ids[1]! } })).status, 200, "Pending invite grants avatar identity only");
  assert.equal((await api.request(uploadedAvatar.replace(/^\/api/, ""), { headers: { "x-test-user": ids[2]! } })).status, 404);
} finally { globalThis.fetch = originalFetch; }
await call(1, `/photo-groups/${avatarGroup}/photos`, "GET", undefined, 404);
await call(1, `/photo-groups/${avatarGroup}/avatar`, "PATCH", { avatar: uploadedAvatar }, 404);
await call(0, `/photo-groups/${avatarGroup}/avatar`, "PATCH", { avatar: groupImage }, 400);
await call(0, `/photo-groups/${avatarGroup}/avatar`, "PATCH", { avatar: "/images/group-avatars/group-reading.png" });
assert.equal(albums.find((g) => g._id === avatarGroup)!.avatar, "/images/group-avatars/group-reading.png");
await call(0, `/photo-groups/${avatarGroup}/avatar`, "PATCH", { avatar: uploadedAvatar });
await call(0, `/photo-groups/${avatarGroup}/invitations`, "POST", { memberIds: [ids[2]] });
await call(2, `/photo-groups/${avatarGroup}/invitations/decline`, "POST");
await call(2, `/photo-groups/${avatarGroup}/invitations/decline`, "POST");
await call(2, `/photo-groups/${avatarGroup}/invitations/accept`, "POST", undefined, 404);
await call(0, `/photo-groups/${avatarGroup}/invitations`, "POST", { memberIds: [ids[2]] });
const competingGroup = "10000000-0000-4000-8000-000000000007";
await call(1, "/photo-groups", "POST", { ...groupInput, id: competingGroup, memberIds: [ids[2]] }, 201);
assert.equal((await call(2, "/photo-groups")).invitations.length, 2, "Pending invites may coexist without occupying a slot");
const acceptRaces = await Promise.all([avatarGroup, competingGroup].map((id) => api.request(`/photo-groups/${id}/invitations/accept`, { method: "POST", headers: { "x-test-user": ids[2]! } })));
assert.deepEqual(acceptRaces.map((r) => r.status).sort(), [200, 409], "Only one concurrent accept reserves membership");
const joined = albums.find((g) => g.activeMemberIds?.includes(ids[2]));
people[2]!.blocked.push(ids[1]);
const otherInvite = joined!._id === avatarGroup ? competingGroup : avatarGroup;
await call(2, `/photo-groups/${otherInvite}/invitations/accept`, "POST", undefined, otherInvite === competingGroup ? 403 : 409);
people[2]!.blocked = [];
await call(0, `/photo-groups/${avatarGroup}/end`, "POST");
await call(1, `/photo-groups/${competingGroup}/end`, "POST");
assert.equal((await call(1, "/photo-groups")).invitations.length, 0);
await call(1, `/photo-groups/${avatarGroup}/invitations/accept`, "POST", undefined, 404);
const originalAvatarDestroy = cloudinary.uploader.destroy;
let avatarDestroyed = false;
(cloudinary.uploader as any).destroy = async () => { avatarDestroyed = true; return { result: "ok" }; };
try { await cleanMedia(ids[0]!, uploadedAvatar); assert.equal(avatarDestroyed, false, "Archive keeps its uploaded avatar"); }
finally { cloudinary.uploader.destroy = originalAvatarDestroy; }
console.log("PASS: invitation consent/decline/access, simultaneous acceptance exclusivity, owned avatar upload and retained avatar references.");
const expiredInvitationGroup = "10000000-0000-4000-8000-000000000009";
await call(1, "/photo-groups", "POST", { ...groupInput, id: expiredInvitationGroup, memberIds: [ids[2]] }, 201);
albums.find((g) => g._id === expiredInvitationGroup)!.expiresAt = new Date(Date.now() - 1).toISOString();
assert.equal((await call(2, "/photo-groups")).invitations.length, 0, "Expired invites leave the receiver inbox");
assert.deepEqual((await call(1, "/photo-groups")).items.find((g: Doc) => g.id === expiredInvitationGroup).pendingMembers, [], "Archive does not claim invitations are still pending");
await call(2, `/photo-groups/${expiredInvitationGroup}/invitations/accept`, "POST", undefined, 409);
const races = await Promise.all([4, 5].map((n) => api.request("/photo-groups", { method: "POST", headers: { "x-test-user": ids[0]!, "Content-Type": "application/json" }, body: JSON.stringify({ ...groupInput, id: `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`, durationDays: 1 }) })));
assert.deepEqual(races.map((response) => response.status).sort(), [201, 409], "The unique membership reservation rejects concurrent overlap");
assert.equal(albums.filter((group) => group.activeMemberIds?.includes(ids[0])).length, 1);
console.log("PASS: timed exclusive membership (1/3/7 days), expiry, owner cancellation, member leave, archived photos/media, completed retries and overlapping creation races.");
console.log("PASS: friendship/privacy/media/auth regressions plus private photo-group creation, membership, immutable author uploads, idempotent retry, isolated normal feed, newest-first pagination, ownership deletion and copied-media revocation. All storage is in memory.");

/** Explicit local visual-QA entry point; never imported by the application. */
export function seedPhotoGroupReview() {
  const at = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
  people = people.map((p, i) => ({ ...p, name: ["Bạn thử nghiệm", "An", "Vy", "Linh"][i], avatar: `/images/group-avatars/group-${["friends", "reading", "family", "gamers"][i]}.png`, cover: "", bio: "", memberNumber: undefined, following: ids.filter((id) => id !== p._id), blocked: [] }));
  albums = [{ _id: groupId, title: "Hội cà phê · Nhóm thử", avatar: "/images/group-avatars/group-noodles.png", ownerId: ids[0], memberIds: ids.slice(0, 3), activeMemberIds: ids.slice(0, 3), durationDays: 3, expiresAt: at(-48), createdAt: at(24), updatedAt: at(1) }];
  albums.push({ _id: "10000000-0000-4000-8000-000000000008", title: "Cuối tuần cùng nhau", avatar: "/images/group-avatars/group-seaside.png", ownerId: ids[3], memberIds: [ids[3]], activeMemberIds: [ids[3]], pendingMemberIds: [ids[0]], durationDays: 7, expiresAt: at(-144), createdAt: at(1), updatedAt: at(1) });
  albumPhotos = [0, 1, 2].map((n) => ({ _id: `30000000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`, groupId, userId: ids[n], image: `/images/group-avatars/group-${["noodles", "seaside", "reading"][n]}.png`, caption: ["Một chút hôm nay", "Chuyến đi cùng nhau", "Góc nhỏ của nhóm"][n], at: at(n + 1) }));
  stories = [{ _id: "40000000-0000-4000-8000-000000000001", userId: ids[1], privacy: "connections", day: at(4).slice(0, 10), updatedAt: at(4), items: [{ id: "50000000-0000-4000-8000-000000000001", image: "/images/group-avatars/group-family.png", caption: "Ảnh thường · thử", at: at(4), reactions: {} }] }];
  pending = []; mediaRecords.length = 0; jobs.length = 0;
  return { api, db, me: ids[0]!, mediaRecords, bootstrap: () => ({ version: 1, authenticated: true, features: { pushPublicKey: null, emailEnabled: false }, people: people.map((p) => personDTO(p as any, people[0] as any)), stories: stories.map((s) => storyDTO(s as any, people[0] as any, ids.slice(1))), conversations: [], notifications: [], connections: ids.slice(1), blocked: [], settings: { ...defaults, notifySystem: false }, friendRequests: { incoming: [], outgoing: [] } }) };
}
