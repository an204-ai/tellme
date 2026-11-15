import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const handlers = new Map(), stores = new Map();
let now = 1_800_000_000_000, downloads = 0, claimed = 0, activated = 0, pushes = 0;
const open = async (name) => {
  if (!stores.has(name)) stores.set(name, new Map());
  const store = stores.get(name), key = (request) => typeof request === "string" ? request : request.url;
  return {
    async match(request) { return store.get(key(request))?.clone(); },
    async put(request, response) { store.set(key(request), response.clone()); },
    async keys() { return [...store.keys()].map((url) => new Request(url)); },
    async delete(request) { return store.delete(key(request)); },
  };
};
const context = vm.createContext({
  URL, Request, Response, Headers, Date: { now: () => now },
  caches: { open, keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name) },
  fetch: async (request) => { downloads++; return new Response("image-fixture", { headers: { "Content-Type": request.url.includes("wrong-type") ? "text/html" : "image/png" } }); },
  self: {
    location: { origin: "https://tellme.test" },
    addEventListener: (name, handler) => handlers.set(name, handler),
    skipWaiting: async () => { activated++; },
    clients: { claim: async () => { claimed++; }, matchAll: async () => [] },
    registration: { showNotification: async () => { pushes++; } },
  },
});
vm.runInContext(await readFile(new URL("../public/sw.js", import.meta.url), "utf8"), context);
async function event(name, props = {}) {
  const pending = [];
  let response;
  handlers.get(name)({ ...props, waitUntil: (job) => pending.push(job), respondWith: (job) => { response = job; } });
  const result = response && await response;
  await Promise.all(pending);
  return result;
}
const request = (path) => new Request(new URL(path, "https://tellme.test"));
stores.set("tellme-public-images-old", new Map()); stores.set("unrelated-cache", new Map());
await event("install"); await event("activate");
assert.equal(activated, 1); assert.equal(claimed, 1);
assert(!stores.has("tellme-public-images-old")); assert(stores.has("unrelated-cache"));
const image = request("/brand/stickers/tellme-hello.png");
assert.equal(await (await event("fetch", { request: image })).text(), "image-fixture");
const first = downloads;
await event("fetch", { request: image }); assert.equal(downloads, first, "Repeat render uses local artwork without a network request");
for (const path of ["/api/media/images/private-key", "/api/bootstrap", "/community/today?_rsc=abc", "/_next/image?url=%2Fapi%2Fmedia%2Fimages%2Fkey&w=128&q=75", "/_next/image?url=http%3A%2F%2F%5B", "https://other.test/images/a.png"]) {
  assert.equal(await event("fetch", { request: request(path) }), undefined, `Never intercept ${path}`);
}
const optimized = request("/_next/image?url=%2Fimages%2Freactions%2Flove.png&w=96&q=75");
await event("fetch", { request: optimized }); const before = downloads;
await event("fetch", { request: optimized }); assert.equal(downloads, before);
now += 86400001;
await event("fetch", { request: image }); assert.equal(downloads, before + 1, "Expired artwork refreshes");
await event("fetch", { request: request("/images/wrong-type.png") }); const wrong = downloads;
await event("fetch", { request: request("/images/wrong-type.png") }); assert.equal(downloads, wrong + 1, "Do not cache HTML/error fallbacks as an image");
for (let index = 0; index < 100; index++) await event("fetch", { request: request(`/images/fixture-${index}.png`) });
assert.equal((await (await open("tellme-public-images-v1")).keys()).length, 96, "Storage stays bounded");
await event("push", { data: { json: () => ({ tag: "tellme-system-old", title: "old reminder" }) } });
assert.equal(pushes, 0, "Old scheduled push jobs stay hidden");
await event("push", { data: { json: () => ({ tag: "tellme-like-fixture", title: "Person activity" }) } });
assert.equal(pushes, 1, "User activity still shows push notifications");
console.log("PASS: public artwork cache hits/expiry/limits, private media/API/RSC exclusion, cache migration, and legacy reminder suppression.");
