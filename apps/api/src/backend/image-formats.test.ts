import { test } from "node:test";
import assert from "node:assert/strict";
import { imageFormat } from "./image-formats.js";

test("recognizes phone and raster formats from bytes without trusting MIME or file extension", () => {
  const header = (hex: string) => Buffer.from(hex.padEnd(64, "0"), "hex");
  assert.equal(imageFormat(header("ffd8ff")), "jpg");
  assert.equal(imageFormat(header("89504e470d0a1a0a")), "png");
  assert.equal(imageFormat(header("474946383961")), "gif");
  assert.equal(imageFormat(Buffer.from("RIFF0000WEBP0000")), "webp");
  assert.equal(imageFormat(header("424d")), "bmp");
  assert.equal(imageFormat(header("49492a00")), "tiff");
  assert.equal(imageFormat(header("4d4d002a")), "tiff");
  assert.equal(imageFormat(Buffer.from("000000186674797068656963000000006d69663168656963", "hex")), "heic");
  assert.equal(imageFormat(Buffer.from("000000186674797061766966000000006d69663161766966", "hex")), "avif");
});

test("rejects SVG, PDF, HTML, video brands, empty and truncated files", () => {
  for (const value of ["<svg xmlns='http://www.w3.org/2000/svg'>", "%PDF-1.5 picture.jpg", "<html>image.png</html>", "0000ftypmp420000mp42", "", "GIF89a"])
    assert.equal(imageFormat(Buffer.from(value)), undefined);
});
