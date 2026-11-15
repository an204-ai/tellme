import assert from "node:assert/strict";
import { cameraCrop, clampCameraZoom, capturePhoto } from "../src/lib/camera.ts";

for (const [width, height] of [[4000, 3000], [1080, 1920], [1200, 1200], [640, 480]]) {
  for (const zoom of [1, 2, 3]) {
    const crop = cameraCrop(width!, height!, zoom);
    assert.equal(crop.sourceWidth, Math.min(width!, height!) / zoom);
    assert.equal(crop.sourceWidth, crop.sourceHeight);
    assert.equal(crop.width, crop.height);
    assert(crop.width <= 1600);
    assert.equal(crop.x * 2 + crop.sourceWidth, width);
    assert.equal(crop.y * 2 + crop.sourceHeight, height);
  }
}
assert.deepEqual(cameraCrop(1000, 800, NaN), cameraCrop(1000, 800));
assert.throws(() => cameraCrop(0, 1000));
console.log("PASS: square camera output, centered crop, portrait/landscape sources, zoom and invalid dimensions.");

assert.equal(clampCameraZoom(8, { min: .5, max: 3 }), 3, "Pinch cannot exceed camera maximum");
assert.equal(clampCameraZoom(.1, { min: .5, max: 3 }), .5, "Pinch respects wide-angle minimum");
assert.equal(clampCameraZoom(1.4, { min: 1, max: 2 }), 1.4, "Digital fallback preserves the requested crop");
assert.equal(clampCameraZoom(NaN, { min: 1, max: 2 }), 1);

// No transform operations are available: source orientation must survive capture.
let drawn: unknown[] = [];
const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: (...args: unknown[]) => { drawn = args; } }), toBlob: (done: (blob: Blob) => void) => done(new Blob(["test-frame"], { type: "image/jpeg" })) };
Object.assign(globalThis, { document: { createElement: () => canvas } });
const video = { readyState: 2, videoWidth: 800, videoHeight: 800 } as HTMLVideoElement;
const photo = await capturePhoto(video, 2);
assert.equal(photo.type, "image/jpeg");
assert.deepEqual(drawn, [video, 200, 200, 400, 400, 0, 0, 400, 400]);
assert.deepEqual([canvas.width, canvas.height], [400, 400]);
console.log("PASS: un-reversed capture preserves source orientation and zoom crop.");
