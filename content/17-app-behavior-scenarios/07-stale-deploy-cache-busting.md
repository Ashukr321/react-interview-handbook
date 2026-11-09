---
title: "Production is not getting the latest deployed update unless in incognito mode. How do you solve this?"
tags: ["caching", "deployment", "service-worker", "cdn"]
difficulty: "hard"
---

## Short answer

Incognito works because it has no HTTP cache and no registered service worker, so the problem is client-side caching of the **entry HTML** (or an old service worker serving it). Fix it by serving `index.html` with `Cache-Control: no-cache`, serving content-hashed JS/CSS with long `immutable` caching, purging the CDN for HTML on deploy, and handling service worker updates (prompt or `skipWaiting`, or unregister a leftover worker). Also handle chunk-load errors so users with an old tab recover by reloading.

## Why it happens

```text
User's browser
  |-- service worker (old) --> serves precached old index.html
  |-- HTTP cache         --> index.html cached with max-age
  |-- CDN edge           --> still holds old index.html
                                  |
old index.html references old hashed bundles (main.abc123.js)
  -> user keeps running the old app
```

Common culprits:

| Cause | Clue |
|---|---|
| Service worker precaching the shell (e.g. old CRA template, PWA plugin) | Application tab shows an active worker; "Update on reload" fixes it |
| `index.html` served with `max-age` or `immutable` | Response headers on the HTML |
| CDN not invalidated | `Age` / `x-cache: HIT` headers on the HTML |
| Non-hashed filenames (`main.js`) with long caching | Bundle URLs don't change between releases |

## How to fix it

1. **Set correct cache headers:**

| File | Header |
|---|---|
| `index.html` (and other HTML) | `Cache-Control: no-cache` (revalidate every time) |
| `/assets/*.[hash].js`, `.css`, fonts | `Cache-Control: public, max-age=31536000, immutable` |
| `sw.js` itself | `Cache-Control: no-cache` |

2. **Use content hashes** in filenames (Vite, webpack and Next.js do this by default).
3. **Invalidate the CDN** for HTML paths as part of the deploy pipeline.
4. **Fix the service worker lifecycle**: show "New version available" when a worker is waiting, then call `skipWaiting` and reload. If you don't need a worker anymore, ship a self-unregistering one at the same URL.
5. **Recover from missing chunks**: users with an open tab may request old chunks that no longer exist. Catch the failed dynamic import and reload once.

Example `vercel.json` (similar rules exist for Netlify, nginx and S3/CloudFront):

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*).html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

```jsx
// Prompt users to update (vite-plugin-pwa React helper)
import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div role="status">
      A new version is available.
      <button onClick={() => updateServiceWorker(true)}>Reload</button>
    </div>
  );
}
```

```js
// Recover from stale chunks after a deploy (Vite emits this event)
window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem("reloaded-after-deploy")) {
    sessionStorage.setItem("reloaded-after-deploy", "1");
    window.location.reload();
  }
});
```

## How to verify

- DevTools Network: `index.html` shows `no-cache` and returns 200/304 with the new bundle names after deploy.
- Application tab: no stale service worker, or the update prompt appears.
- `curl -I https://your-site/` to inspect headers and CDN cache status.
- Deploy twice in a row with an open tab and confirm it updates without incognito or a hard reload.

## Follow-up questions

- **Why not `no-store` on everything?** It disables caching for hashed assets too, making every visit slower; only HTML needs revalidation.
- **What does `no-cache` actually mean?** The browser may store the file but must revalidate with the server (ETag/Last-Modified) before using it.
- **How do you force an update for users stuck on an old worker?** Deploy a new `sw.js` that calls `self.registration.unregister()` and clears caches; browsers check `sw.js` for updates on navigation.

## Quick recap

- Incognito working points to HTTP cache or service worker.
- HTML: `no-cache`; hashed assets: long-lived `immutable`.
- Purge CDN HTML on every deploy.
- Handle service worker updates explicitly.
- Reload once on chunk-load errors.
