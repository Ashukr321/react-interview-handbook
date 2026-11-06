---
title: "Can you share multiple ways to intercept API requests in React projects?"
tags: ["interceptors", "axios", "fetch", "middleware", "msw"]
difficulty: "medium"
---

## Short answer

The common options are: Axios interceptors (`interceptors.request` / `interceptors.response`), a custom `fetch` wrapper module, RTK Query's `prepareHeaders` / custom `baseQuery`, TanStack Query's global `QueryCache`/`MutationCache` callbacks, Redux middleware for action-driven calls, Next.js middleware or route handlers on the server, Service Workers for network-level interception, and MSW for mocking in tests. Use them to attach auth headers, refresh tokens, log, normalize errors, and retry.

## Explanation

An interceptor is a checkpoint every request passes through, like airport security: one place to stamp the passport (add headers) and one place on the way back to check bags (handle errors). Without it, every component repeats the same logic.

### Options compared

| Approach | Layer | Good for |
|---|---|---|
| Axios interceptors | Client, per Axios instance | Auth headers, 401 refresh, error mapping |
| `fetch` wrapper (`apiFetch`) | Client, your own module | Zero-dependency equivalent of interceptors |
| RTK Query `prepareHeaders` / `baseQueryWithReauth` | Redux Toolkit | Auth + re-auth for all endpoints |
| TanStack Query `QueryCache({ onError })` | Data cache | Global toasts, logout on 401 |
| Redux middleware | State layer | Logging, analytics, API calls triggered by actions |
| Service Worker `fetch` event | Browser network | Offline caching, request rewriting |
| Next.js middleware / Route Handlers / BFF | Server | Auth checks, hiding API keys, proxying |
| MSW (Mock Service Worker) | Test / dev | Mocking APIs without changing app code |

Monkey-patching `window.fetch` also works, but it is global, hard to test and affects third-party code, so prefer a wrapper.

## Example

Axios:

```js
import axios from "axios";
import { tokenStore } from "./tokenStore";

export const api = axios.create({ baseURL: "/api", timeout: 10_000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Request-Id"] = crypto.randomUUID();
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message ?? "Network error";
    return Promise.reject(Object.assign(error, { userMessage: message }));
  }
);
```

Plain fetch wrapper:

```js
export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) window.dispatchEvent(new Event("auth:logout"));
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}
```

RTK Query:

```js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: () => ({}),
});
```

## Common mistakes

- Registering interceptors inside a component's render or effect without ejecting them, creating duplicates on every mount.
- Swallowing errors in the response interceptor (returning instead of rejecting), so callers think the request succeeded.
- Adding `Authorization` headers to third-party URLs and leaking the token to other domains.
- Infinite loops when the refresh call itself goes through the 401 interceptor.

## Follow-up questions

- **How do you remove an Axios interceptor?** `const id = api.interceptors.request.use(fn)` then `api.interceptors.request.eject(id)`, e.g. in an effect cleanup.
- **Why use MSW instead of mocking Axios?** MSW intercepts at the network level, so tests exercise your real fetch/Axios code.
- **Where should API keys be added?** On the server (proxy or route handler), never in a client interceptor.

## Quick recap

- Interceptors centralize headers, auth, errors and logging.
- Axios interceptors or a fetch wrapper on the client.
- RTK Query / TanStack Query have their own hooks for this.
- Service Workers, server middleware and MSW intercept at other layers.
