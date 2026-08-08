import assert from "node:assert/strict";
import test from "node:test";

import {
  detectPhotoMimeType,
  mediaContentHeaders,
  sanitizeDownloadFilename,
} from "./media-security.ts";

test("detects image signatures instead of trusting the declared MIME type", () => {
  assert.equal(
    detectPhotoMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])),
    "image/jpeg",
  );
  assert.equal(
    detectPhotoMimeType(
      Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]),
    ),
    "image/png",
  );
  assert.equal(
    detectPhotoMimeType(new TextEncoder().encode("<script>alert(1)</script>")),
    null,
  );
});

test("removes header and path control characters from download names", () => {
  assert.equal(
    sanitizeDownloadFilename('..\\photo"\r\nContent-Type: text/html'),
    ".._photo___Content-Type: text_html",
  );
});

test("mediaContentHeaders sets nosniff + attachment disposition", () => {
  const headers = mediaContentHeaders({
    mimeType: "image/jpeg",
    filename: 'evil"\r\nname.jpg',
    download: true,
  });
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Content-Type"], "image/jpeg");
  assert.match(headers["Content-Disposition"], /^attachment; filename="/);
  assert.doesNotMatch(headers["Content-Disposition"], /[\r\n]/);
  assert.equal(
    headers["Content-Disposition"],
    'attachment; filename="evil___name.jpg"',
  );
});
