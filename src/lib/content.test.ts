// Runs against the real notes: `npm test` (Node's built-in runner, native TS strip).
import { test } from "node:test";
import assert from "node:assert/strict";
import { getSearchIndex, getSections, getTopic } from "./content.ts";

const sections = getSections();
const hrefs = getSearchIndex().map((i) => i.href);

test("every section and topic has a title", () => {
  assert.ok(sections.length > 0);
  for (const s of sections) {
    assert.ok(s.title, s.slug);
    for (const t of s.topics) assert.ok(t.title, `${s.slug}/${t.slug}`);
  }
});

test("URLs are unique and URL-safe", () => {
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const h of hrefs) assert.match(h, /^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/);
});

test("getTopic resolves real topics and returns null for missing ones", () => {
  const s = sections[0];
  const data = getTopic(s.slug, s.topics[0].slug);
  assert.ok(data && data.body.length > 0);
  assert.equal(data.prev, null);
  assert.equal(getTopic(s.slug, "does-not-exist"), null);
  assert.equal(getTopic("nope", "nope"), null);
});

test("search index covers every page", () => {
  const pages = sections.reduce((n, s) => n + 1 + s.topics.length, 0);
  assert.equal(hrefs.length, pages);
});
