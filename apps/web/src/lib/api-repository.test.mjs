import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Transpile the real adapter in memory; mock only HTTP, never its update logic.
const source = await readFile(new URL("./api-repository.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replaceAll('"./images"', JSON.stringify(new URL("./images.ts", import.meta.url).href))
  .replaceAll('"./visibility"', JSON.stringify(new URL("./visibility.ts", import.meta.url).href));
const { apiRepository } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

test("post and moment reactions use one write and one entity read, without bootstrap", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(`${options.method || "GET"} ${url}`);
    if (options.method === "PUT") return json({ ok: true });
    return json(String(url).startsWith("/api/posts/") ? { id: "p1", reaction: "love", comments: [] } : { id: "s1", day: "2026-11-03", items: [] });
  };
  try {
    await apiRepository.reactToPost("p1", "love");
    await apiRepository.reactToMoment("s1", "m1", "wow");
    assert.deepEqual(calls, ["PUT /api/posts/p1/reaction", "GET /api/posts/p1", "PUT /api/stories/s1/moments/m1/reaction", "GET /api/stories/s1"]);
    assert.equal(apiRepository.peekStory("s1").id, "s1");
  } finally { globalThis.fetch = original; apiRepository.clear(); }
});

test("concurrent reactions stay serialized and a rejected write does not poison the queue", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  globalThis.fetch = async (url, options) => {
    calls.push(`${options.method || "GET"} ${url}`);
    if (url === "/api/posts/p1/reaction") { await gate; return json({ error: "Forbidden" }, 403); }
    return json(options.method === "PUT" ? { ok: true } : { id: "p2", reaction: "like", comments: [] });
  };
  try {
    const first = assert.rejects(apiRepository.reactToPost("p1", "love"), /Forbidden/);
    const second = apiRepository.reactToPost("p2", "like");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ["PUT /api/posts/p1/reaction"]);
    release();
    await first;
    assert.equal((await second).id, "p2");
    assert.deepEqual(calls, ["PUT /api/posts/p1/reaction", "PUT /api/posts/p2/reaction", "GET /api/posts/p2"]);
  } finally { globalThis.fetch = original; apiRepository.clear(); }
});
