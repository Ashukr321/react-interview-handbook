---
title: "What is Service Worker?"
tags: ["pwa", "service-worker", "offline", "caching"]
difficulty: "medium"
---

## Short answer

A service worker is a JavaScript file that the browser runs in the background, separate from the page, acting as a programmable network proxy for your origin. It can intercept every `fetch` the page makes and answer from a cache, which enables offline support, faster repeat loads, push notifications and background sync. It is the core technology behind Progressive Web Apps (PWAs), and it only works over HTTPS (or localhost).

## Explanation

A service worker is like a personal assistant sitting between you and the post office. When you ask for a letter, the assistant can hand you a copy from the filing cabinet (cache), go to the post office (network), or both. It keeps working even when you are not at your desk (push and sync events).

### Key characteristics

- Runs on its own thread; **no DOM access**. It talks to pages via `postMessage`.
- Event-driven: the browser starts it for an event and stops it when idle, so do not keep state in global variables.
- Scoped to a path (by default, the folder of the script).
- Requires HTTPS.

### Lifecycle

```text
register() → install (pre-cache assets) → waiting (old SW still controls pages)
          → activate (clean old caches) → controls pages → fetch / push / sync events
```

A new version waits until all tabs using the old one close, unless you call `self.skipWaiting()` and `clients.claim()`.

### Caching strategies

| Strategy | How it works | Use for |
|---|---|---|
| Cache first | Cache, fall back to network | Hashed static assets, fonts |
| Network first | Network, fall back to cache | HTML, API data that should be fresh |
| Stale-while-revalidate | Serve cache now, update in background | Avatars, non-critical API data |
| Network only | Always network | Payments, auth |

In practice most teams use **Workbox** (or `vite-plugin-pwa`) instead of writing caching logic by hand.

## Example

Registering from React:

```jsx
import { useEffect } from "react";

export function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW failed", err));
  }, []);
}
```

A minimal `public/sw.js`:

```js
const CACHE = "app-v2";
const ASSETS = ["/", "/index.html", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    // network first for pages, offline page as fallback
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request)));
});
```

## Common mistakes

- Caching `index.html` cache-first, so users are stuck on an old version forever.
- Not versioning caches or cleaning old ones in `activate`.
- Caching authenticated API responses that may leak between users on shared devices.
- Confusing service workers with Web Workers; Web Workers are for CPU work tied to one page, service workers are network proxies for the whole origin.

## Follow-up questions

- **What makes an app a PWA?** HTTPS, a web app manifest (name, icons, `display`), and a service worker, which together allow installation and offline use.
- **How do you tell users a new version is available?** Listen for the new worker reaching `waiting`, show a "Refresh to update" prompt, then send it a message to call `skipWaiting()`.
- **Do service workers work in all browsers?** Yes in all modern browsers; push notifications on iOS require the PWA to be installed to the home screen.

## Quick recap

- Background script that proxies network requests for an origin.
- Enables offline, caching, push and background sync.
- Lifecycle: install → waiting → activate → fetch.
- Use Workbox and version your caches.
