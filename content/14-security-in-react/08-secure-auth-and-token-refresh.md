---
title: "How do you implement secure authentication and token refresh flow in React?"
tags: ["security", "auth", "axios", "interceptors", "refresh-token"]
difficulty: "hard"
---

## Short answer

Use a short-lived access token held in memory and a long-lived, rotating refresh token in an HttpOnly cookie. An Axios response interceptor catches `401` errors, calls `/auth/refresh` once (queuing any other failing requests while it runs), stores the new access token, and retries the original requests. If refresh fails, clear state and redirect to login.

## Explanation

It works like a gym membership: the day pass (access token) gets you in for a short time; when it expires, the front desk checks your membership card (refresh token) and prints a new day pass. If the card is revoked, you are sent back to sign up.

### Flow

```text
Request ──> API ──> 401 Unauthorized
                     │
                     ▼
        Is a refresh already running?
          │ yes                │ no
          ▼                    ▼
   wait in queue        POST /auth/refresh (cookie sent)
          │                    │
          │            ┌───────┴────────┐
          │            ▼                ▼
          │        200: new token    401: logout
          │            │
          └──────> retry queued requests with new token
```

### Security points

- **Refresh token rotation**: each refresh returns a new refresh token and invalidates the old one. If an old one is reused, the server revokes the whole token family (theft detected).
- **Single-flight refresh**: without a shared promise, ten parallel 401s fire ten refresh calls, which breaks rotation.
- **Retry once**: mark retried requests so a broken token cannot cause an infinite loop.
- **Never refresh on the refresh endpoint itself**.
- **Proactive refresh** (optional): refresh shortly before `exp` to avoid user-visible 401s.
- **Logout** revokes the refresh token server-side and clears the cookie.

## Example

```js
import axios from "axios";

let accessToken = null;
let refreshPromise = null;

export const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (error.response?.status !== 401 || original._retry || isRefreshCall) {
      return Promise.reject(error);
    }
    original._retry = true;

    try {
      // single-flight: every concurrent 401 awaits the same refresh
      refreshPromise ??= api.post("/auth/refresh").finally(() => { refreshPromise = null; });
      const { data } = await refreshPromise;
      accessToken = data.accessToken;
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      accessToken = null;
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshError);
    }
  }
);

export const setAccessToken = (t) => { accessToken = t; };
```

```jsx
import { useEffect } from "react";
import { useNavigate } from "react-router";

export function useLogoutListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const onLogout = () => navigate("/login", { replace: true });
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [navigate]);
}
```

## Common mistakes

- Storing both tokens in `localStorage`.
- No single-flight lock, causing refresh races and rotated tokens being invalidated.
- Retrying forever on 401 because `_retry` was never set.
- Trusting the decoded JWT on the client for authorization; the server must check permissions on every request.

## Follow-up questions

- **Interceptor vs fetch wrapper?** Same idea; with fetch you write a wrapper function that checks `res.status === 401`, refreshes, and retries.
- **How do you handle multiple tabs?** Use `BroadcastChannel` to share logout events; each tab keeps its own in-memory access token.
- **What about OAuth/OIDC with a third-party IdP?** Use Authorization Code + PKCE, ideally through a BFF so tokens never touch the browser.

## Quick recap

- Access token in memory, refresh token in HttpOnly cookie.
- Interceptor: catch 401, refresh once, retry queued requests.
- Rotate refresh tokens and detect reuse.
- On refresh failure, clear state and redirect to login.
