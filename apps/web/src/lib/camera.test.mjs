import assert from "node:assert/strict";
import test from "node:test";
import { cameraCrop, capturePhoto } from "./camera.ts";

test("landscape and portrait camera frames keep a centered 4:3 crop", () => {
  assert.deepEqual(cameraCrop(1200, 900), {
    x: 0, y: 0, sourceWidth: 1200, sourceHeight: 900, width: 1200, height: 900,
  });
  const portrait = cameraCrop(900, 1200);
  assert.equal(portrait.x, 0);
  assert.equal(portrait.y, 262.5);
  assert.equal(portrait.sourceWidth / portrait.sourceHeight, 4 / 3);
});

test("2x digital zoom crops the center instead of stretching the photo", () => {
  assert.deepEqual(cameraCrop(1200, 900, 2), {
    x: 300, y: 225, sourceWidth: 600, sourceHeight: 450, width: 600, height: 450,
  });
});

test("output stays bounded and unavailable or invalid zoom never invents a wider lens", () => {
  assert.equal(cameraCrop(4000, 3000).width, 1600);
  for (const zoom of [0, -.5, .5, NaN, Infinity]) {
    assert.deepEqual(cameraCrop(1200, 900, zoom), cameraCrop(1200, 900));
  }
  assert.throws(() => cameraCrop(0, 0), /sẵn sàng/);
});

test("selfie capture applies the same mirror and zoom as the viewfinder", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const calls = [];
  const context = {
    translate: (...args) => calls.push(["translate", ...args]),
    scale: (...args) => calls.push(["scale", ...args]),
    drawImage: (...args) => calls.push(["drawImage", ...args]),
  };
  const canvas = { width: 0, height: 0, getContext: () => context,
    toBlob: (callback) => callback(new Blob(["test-frame"], { type: "image/jpeg" })),
  };
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
  try {
    const video = { readyState: 2, videoWidth: 1200, videoHeight: 900 };
    const file = await capturePhoto(video, true, 2);
    assert.equal(file.type, "image/jpeg");
    assert.deepEqual([canvas.width, canvas.height], [600, 450]);
    assert.deepEqual(calls, [
      ["translate", 600, 0], ["scale", -1, 1],
      ["drawImage", video, 300, 225, 600, 450, 0, 0, 600, 450],
    ]);
    await assert.rejects(capturePhoto({ ...video, readyState: 0 }), /sẵn sàng/);
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete globalThis.document;
  }
});
