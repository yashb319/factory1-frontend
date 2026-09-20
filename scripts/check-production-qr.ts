/**
 * Run: node --experimental-strip-types scripts/check-production-qr.ts
 * Bounded, offline checks; no browser, camera, network, or production mutations.
 */
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library";
import {
  parseProductionOrderInput,
  productionLoginPath,
  productionOrderPath,
  productionOrderUrl,
  safeProductionReturnPath,
} from "../src/lib/productionOrderLink.ts";

const uuid = "a0123456-b789-4cde-8f01-23456789abcd";
const origin = "https://factory.example";
const path = `/production?orderId=${uuid}`;
const url = origin + path;
assert.equal(productionOrderPath(uuid.toUpperCase()), path);
assert.equal(productionOrderUrl(uuid, origin), url);
assert.equal(productionOrderUrl(uuid.toUpperCase(), origin + "/"), url);
assert.equal(productionOrderUrl(uuid, origin), productionOrderUrl(uuid, origin));

for (const input of [uuid, uuid.toUpperCase(), path, url, `  ${url}  `]) {
  assert.equal(parseProductionOrderInput(input, origin), uuid, input);
}
assert.equal(parseProductionOrderInput(`https://FACTORY.example:443${path}`, origin), uuid);
assert.equal(parseProductionOrderInput(`http://localhost:3000${path}`, "http://localhost:3000"), uuid);

const forbidden = [
  "", "not-a-uuid", "/production", "/Production?orderId=" + uuid,
  "/production?orderid=" + uuid, `/production/?orderId=${uuid}`,
  `//factory.example${path}`, `https://foreign.example${path}`,
  `http://factory.example${path}`, `https://factory.example:444${path}`,
  `javascript:${url}`, `data:text/plain,${url}`, `file://${path}`,
  `https://user:pass@factory.example${path}`, `https://@factory.example${path}`,
  `https://factory.example@foreign.example${path}`,
  `https://factory.example/../production?orderId=${uuid}`,
  `https://factory.example/x/../production?orderId=${uuid}`,
  `https://factory.example\\${path}`, `\\production?orderId=${uuid}`,
  `${path}#`, `${path}#details`, `${path}&orderId=${uuid}`,
  `${path}&quantity=4`, `${path}&`, `${path}&token=secret`,
  `/production?orderId=%61${uuid.slice(1)}`, `/production?orderId=%ZZ`,
  `/production?orderId=%`, `/production?orderId=%252F`,
  `/production?%6FrderId=${uuid}`, `/%70roduction?orderId=${uuid}`,
  `/production?orderId=${uuid}%0a`, `${path}\n`, `${path}\t`,
  `${path}\u0000`, `${path} extra`, "x".repeat(2049),
];
for (const input of forbidden) {
  assert.throws(() => parseProductionOrderInput(input, origin), Error, input);
}
for (const badOrigin of [
  "null", "", "file://host", "javascript:alert(1)", "https://factory.example/path",
  "https://user:pass@factory.example", "https://factory.example?x=1",
  "https://factory.example#", "https://factory.example\\",
  "https://factory.example\n", "https://%66actory.example",
]) {
  assert.throws(() => productionOrderUrl(uuid, badOrigin), Error, badOrigin);
  assert.throws(() => parseProductionOrderInput(uuid, badOrigin), Error, badOrigin);
}
for (const badUuid of ["", "123", uuid + "\n", uuid + "?token=secret", `{${uuid}}`]) {
  assert.throws(() => productionOrderPath(badUuid), Error, badUuid);
}
assert.equal(safeProductionReturnPath(path), path);
assert.equal(safeProductionReturnPath(`/production?orderId=${uuid.toUpperCase()}`), path);
assert.equal(safeProductionReturnPath("/production"), "/production");
assert.equal(productionLoginPath(path), `/login?next=${encodeURIComponent(path)}`);
assert.equal(productionLoginPath("/production"), "/login?next=%2Fproduction");
for (const input of [undefined, null, url, uuid, "/admin", " " + path, path + " ", ...forbidden.filter((s) => s !== "/production")]) {
  assert.equal(safeProductionReturnPath(input), undefined, String(input));
  if (typeof input === "string") assert.equal(productionLoginPath(input), "/login");
}

// Render QR modules into luminance pixels, including the same four-module quiet
// zone as the SVG label, then decode with the scanner's installed ZXing library.
for (const payload of [url, productionOrderUrl(uuid, "http://localhost:3000")]) {
  const { modules } = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const scale = 4;
  const width = (modules.size + 8) * scale;
  const pixels = new Uint8ClampedArray(width * width).fill(255);
  for (let y = 0; y < modules.size; y += 1) {
    for (let x = 0; x < modules.size; x += 1) {
      if (!modules.get(y, x)) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          pixels[((y + 4) * scale + dy) * width + (x + 4) * scale + dx] = 0;
        }
      }
    }
  }
  const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, width)));
  const decoded = new QRCodeReader().decode(bitmap).getText();
  assert.equal(decoded, payload);
  assert.equal(parseProductionOrderInput(decoded, new URL(payload).origin), uuid);
}

console.log(`Production QR checks passed: parsing, ${forbidden.length} forbidden payloads, redirect safety, stable URLs, and 2 local QR roundtrips.`);
