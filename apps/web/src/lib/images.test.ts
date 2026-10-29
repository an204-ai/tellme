import { test } from "node:test";
import assert from "node:assert/strict";
import { validateImage } from "./images.ts";

test("phone images with an empty or generic MIME type remain selectable", () => {
  for (const name of ["IMG_1234.HEIC", "IMG_1234.heif", "photo.avif", "scan.tiff", "camera.jfif", "photo.bmp", "animation.gif"])
    assert.doesNotThrow(() => validateImage(new File(["image"], name, { type: "application/octet-stream" })));
  assert.throws(() => validateImage(new File(["file"], "document.pdf", { type: "application/pdf" })));
  assert.throws(() => validateImage(new File(["svg"], "image.svg", { type: "image/svg+xml" })));
});

test("a 50 MiB image is allowed while empty files and the next byte over the limit are rejected", () => {
  const boundary = new File([new Uint8Array(50 * 1024 * 1024)], "photo.jpg");
  assert.doesNotThrow(() => validateImage(boundary));
  assert.throws(() => validateImage(new File([boundary, "x"], "photo.jpg")), /50 MB/);
  assert.throws(() => validateImage(new File([], "photo.jpg")), /trống/);
});
