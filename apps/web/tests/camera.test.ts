import assert from "node:assert/strict";
import { cameraCrop } from "../src/lib/camera.ts";

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
