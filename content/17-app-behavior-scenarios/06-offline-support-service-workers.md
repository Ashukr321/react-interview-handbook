---
title: "How do you handle offline and online state gracefully in React with service workers?"
tags: ["pwa", "offline", "service-worker", "network"]
difficulty: "hard"
---

## Short answer

Split it into two jobs. A **service worker** (usually generated with Workbox or `vite-plugin-pwa`) caches the app shell and chosen API responses so the app loads and shows data offline. In React, an **online-status hook** (built on `navigator.onLine` plus `online`/`offline` events via `useSyncExternalStore`) drives the UI: an offline banner, disabled actions, and a queue of writes that syncs when the connection returns. Data libraries like TanStack Query pause and resume requests automatically.

## Why it happens

Without explicit handling, going offline causes:

- A browser "no internet" page on reload, because nothing is cached.
- Endless spinners and generic errors from failed fetches.
- Lost user input when a save fails.
- Confusing state when the connection comes back and nothing retries.

Also note: `navigator.onLine === true` only means a network interface is connected, not that your API is reachable. Treat failed requests as the real signal.

## How to fix it

1. **Register a service worker** with caching strategies:

| Resource | Strategy |
|---|---|
| App shell (HTML, JS, CSS) | Precache, update in background |
| Static assets (images, fonts) | Cache first |
| API GET data | Network first, fall back to cache (or stale-while-revalidate) |
| API writes (POST/PUT) | Don't cache; queue and retry |

2. **Expose online state** to React.
3. **Show status in the UI**: a non-blocking banner, "saved offline, will sync" labels, disabled actions that require the network.
4. **Queue mutations**: TanStack Query pauses mutations offline and resumes them; Workbox Background Sync can replay failed requests (Chromium only), so keep a fallback that retries on the `online` event.
5. **Handle updates**: prompt "New version available, reload" when a new service worker is waiting.

```js
// sw config via vite-plugin-pwa (vite.config.js)
import { VitePWA } from "vite-plugin-pwa";

export default {
  plugins: [
    VitePWA({
      registerType: "prompt",
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: { cacheName: "api", networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
};
```

```jsx
import { useSyncExternalStore } from "react";

function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true // server snapshot
  );
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="banner">
      You're offline. Changes will sync when you reconnect.
    </div>
  );
}
```

```jsx
// TanStack Query: offline-aware by default (networkMode "online")
const mutation = useMutation({
  mutationFn: saveNote,
  // paused while offline, resumed automatically when back online
});
```

## How to verify

- DevTools, Application tab: check the service worker is active and caches are filled.
- Network tab "Offline": reload the app; the shell loads and cached data appears.
- Make an edit offline, go online, and confirm it syncs exactly once.
- Lighthouse PWA/installability checks.
- Deploy a new version and confirm the update prompt appears and works.

## Follow-up questions

- **Why `useSyncExternalStore` instead of `useState` + `useEffect`?** It's the official way to subscribe to external sources, avoids tearing in concurrent rendering, and supports a server snapshot.
- **Where do you store offline data?** IndexedDB (via `idb` or a persisted query cache), not `localStorage`, for larger or structured data.
- **How do you handle conflicts?** Use timestamps or versions on the server and show a merge or "keep mine / keep theirs" choice.

## Quick recap

- Service worker caches the shell and selected data.
- `useSyncExternalStore` hook for online status.
- Non-blocking offline UI and queued writes.
- `navigator.onLine` isn't proof the API is reachable.
- Handle service worker updates explicitly.
