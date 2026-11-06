---
title: "What happens when we hit a URL in the browser?"
tags: ["browser", "networking", "dns", "rendering"]
difficulty: "medium"
---

## Short answer

The browser parses the URL, checks caches (HSTS, service worker, HTTP cache), resolves the domain to an IP via DNS, opens a TCP connection (or QUIC for HTTP/3), performs a TLS handshake, sends an HTTP request, and receives the response. It then parses the HTML into the DOM, fetches CSS and JS, builds the CSSOM, runs scripts, builds the render tree, computes layout, paints and composites pixels to the screen. For a React SPA, the HTML is mostly an empty `div`, so the content appears only after the JS bundle downloads and React renders.

## Explanation

It is like ordering from a restaurant you have never visited: look up the address (DNS), drive there (TCP), prove who you are at the door (TLS), place the order (HTTP request), receive ingredients (HTML/CSS/JS) and finally cook and plate the dish (rendering).

### Step by step

```text
1. URL parsing        "example.com" → https://example.com/ (HSTS may force https)
2. Cache checks       Service Worker → memory/disk HTTP cache
3. DNS lookup         browser → OS → router → resolver → root → .com → authoritative
4. Connection         TCP 3-way handshake (or QUIC for HTTP/3)
5. TLS handshake      certificate check, key exchange (TLS 1.3: 1 round trip)
6. HTTP request       GET / with headers and cookies
7. Server             CDN / load balancer → app server → response (or 301/302 redirect)
8. Response           status, headers, body streamed back
9. Parsing            HTML → DOM, CSS → CSSOM, scripts block or defer
10. Render tree       DOM + CSSOM (visible nodes only)
11. Layout            compute sizes and positions
12. Paint/Composite   draw pixels, layers to GPU
13. Interactivity     JS runs, React hydrates or renders, event handlers attached
```

### Key details interviewers like

- **DNS caching** at several levels (browser, OS, resolver) with TTLs.
- **Preconnect / dns-prefetch** hints skip DNS and TCP for known third-party origins.
- **Redirects** add full round trips; `http → https → www` is two extra hops.
- **Render-blocking**: CSS in the head blocks rendering; synchronous scripts block parsing.
- **Events**: `DOMContentLoaded` fires after HTML is parsed and deferred scripts run; `load` after all resources (images, iframes) finish.

### SPA vs SSR

| | Client-rendered SPA | Server-rendered (Next.js) |
|---|---|---|
| First HTML | Empty shell | Full content |
| First meaningful paint | After JS downloads and runs | After HTML and CSS |
| Interactivity | Same time as content | After hydration |

## Example

You can inspect most of these phases yourself with the Navigation Timing API:

```js
const [nav] = performance.getEntriesByType("navigation");
console.table({
  dns: nav.domainLookupEnd - nav.domainLookupStart,
  tcpAndTls: nav.connectEnd - nav.connectStart,
  tls: nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
  ttfb: nav.responseStart - nav.requestStart,
  download: nav.responseEnd - nav.responseStart,
  domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
  load: nav.loadEventEnd - nav.startTime,
});
```

## Common mistakes

- Skipping the TLS handshake or caching steps in your explanation.
- Saying "the browser downloads HTML, then renders". Parsing is incremental and streaming; the browser starts fetching CSS and JS while still parsing.
- Confusing DOM with render tree (`display: none` elements are in the DOM but not the render tree).
- Forgetting that React SPAs show nothing meaningful until the bundle executes.

## Follow-up questions

- **How would you make this faster?** CDN, HTTP/2 or 3, fewer redirects, preconnect, compression, caching headers, critical CSS, deferred JS, SSR or static generation.
- **What is TTFB?** Time to First Byte: from sending the request to receiving the first byte of the response; it reflects network latency and server time.
- **Where does the service worker fit?** It can intercept the navigation request before the network and answer from cache, enabling offline loads.

## Quick recap

- URL → cache → DNS → TCP/QUIC → TLS → HTTP.
- Server responds; browser streams and parses.
- DOM + CSSOM → render tree → layout → paint → composite.
- JS runs; React renders (SPA) or hydrates (SSR).
