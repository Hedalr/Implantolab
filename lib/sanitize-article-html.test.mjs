import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeArticleHtml } from "./sanitize-article-html.ts";

test("removes executable HTML and unsafe URL schemes", () => {
  const result = sanitizeArticleHtml(`
    <img src="https://images.example/photo.jpg" onerror="alert(1)">
    <a href="javascript:alert(1)" onclick="alert(2)">Piège</a>
    <script>alert(3)</script>
  `);

  assert.match(result, /src="https:\/\/images\.example\/photo\.jpg"/);
  assert.doesNotMatch(result, /onerror|onclick|javascript:|<script/i);
});

test("keeps safe article formatting and relative links", () => {
  const result = sanitizeArticleHtml(
    '<h2>Titre</h2><p><a href="/contact">Contact</a> <strong>maintenant</strong>.</p>',
  );

  assert.equal(
    result,
    '<h2>Titre</h2><p><a href="/contact">Contact</a> <strong>maintenant</strong>.</p>',
  );
});
