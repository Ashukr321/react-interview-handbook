---
title: "What are ETag, Cache-Control and DocumentFragment?"
tags: ["caching", "http", "dom", "performance"]
difficulty: "medium"
---

## Short answer

`Cache-Control` is an HTTP header that tells browsers and CDNs whether and how long a response may be cached. An `ETag` is a version identifier for a response; the browser sends it back in `If-None-Match`, and if nothing changed the server answers `304 Not Modified` with no body. `DocumentFragment` is unrelated to HTTP: it is an in-memory DOM container used to build many nodes and insert them into the page in one operation, reducing layout work.

## Explanation

### Cache-Control: the rules

| Directive | Meaning |
|---|---|
| `max-age=N` | Fresh for N seconds; use without asking the server |
| `s-maxage=N` | Same, but only for shared caches (CDN) |
| `no-cache` | May store, but must revalidate before every use |
| `no-store` | Never store (sensitive data) |
| `public` / `private` | Can a shared cache (CDN) store it, or only the user's browser |
| `immutable` | Will never change; skip revalidation even on reload |
| `stale-while-revalidate=N` | Serve stale for N seconds while refreshing in background |

### ETag: the version check

Like asking a librarian "is this still edition 3?" instead of borrowing the whole book again.

```text
 1st request
   GET /api/products
   <- 200 OK
      ETag: "v42-a1b2"
      Cache-Control: no-cache
      [body]

 Later request (cache must revalidate)
   GET /api/products
   If-None-Match: "v42-a1b2"
   <- 304 Not Modified      (no body, browser reuses cached copy)
   or
   <- 200 OK  ETag: "v43-c3d4"  [new body]
```

`Last-Modified` / `If-Modified-Since` is the older, timestamp-based equivalent. `Cache-Control` decides **when** to ask; ETag makes the asking **cheap**.

### DocumentFragment: batching DOM inserts

Appending 1,000 nodes one by one into a live list can trigger repeated style and layout work, especially if code reads layout in between. A fragment is not part of the page, so you fill it freely and then insert it once; the fragment's children move into the DOM and the fragment becomes empty.

React does not need this in app code: it computes changes during render and applies them in a single commit phase. You meet `DocumentFragment` in vanilla JS, in `<template>` content, and in libraries.

## Example

```js
// Vanilla JS: build off-DOM, insert once
const list = document.querySelector("#list");
const fragment = document.createDocumentFragment();

for (const item of items) {
  const li = document.createElement("li");
  li.textContent = item.name;
  fragment.appendChild(li);
}
list.appendChild(fragment); // one insertion into the live DOM
```

```js
// Express: ETag + revalidation for an API response
app.set("etag", "strong"); // Express generates ETags automatically
app.get("/api/products", (req, res) => {
  res.set("Cache-Control", "private, no-cache");
  res.json(products); // Express returns 304 if If-None-Match matches
});
```

## Common mistakes

- Treating `no-cache` as "do not cache"; it means "check first".
- Thinking ETag alone stops requests; the request still happens, only the body is skipped. To avoid the request, use `max-age`.
- Different ETags per server behind a load balancer (e.g. based on inode), causing needless 200s.
- Confusing `DocumentFragment` with React's `<Fragment>`; React's Fragment only groups JSX children without a wrapper element.

## Follow-up questions

- **Strong vs weak ETag?** `W/"..."` is weak: semantically equivalent content, not byte-identical; strong ETags require byte equality.
- **Does a 304 save time?** It saves bandwidth and parsing, but still costs a round trip.
- **Is innerHTML faster than a fragment?** It can be for large static markup, but it is an XSS risk with untrusted data and destroys existing nodes and listeners.

## Quick recap

- `Cache-Control` sets caching rules and lifetime.
- ETag + `If-None-Match` enables cheap `304` revalidation.
- `no-cache` = revalidate; `no-store` = never store.
- `DocumentFragment` builds DOM off-page and inserts it in one go.
- React's commit phase already batches DOM writes.
