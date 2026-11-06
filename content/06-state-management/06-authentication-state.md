---
title: "How will you manage authentication in a React application?"
tags: ["authentication", "security", "context", "protected-routes"]
difficulty: "medium"
---

## Short answer

I keep the session token in an **HttpOnly, Secure, SameSite cookie** set by the server, not in `localStorage`. On app load I call a `/me` endpoint to get the current user and store it in an `AuthProvider` (Context or a Redux slice) with `user`, `status` and `login`/`logout` actions. Routes are guarded by a protected-route wrapper or a router loader, and an API layer handles 401s by refreshing the token or logging out. The server always enforces authorization; the client only decides what to show.

## Explanation

Auth state is like a hotel key card. The front desk (server) issues it and can revoke it. The card itself should not be readable by every guest walking past (JavaScript), and every door (API) checks it independently. The lobby display showing "Welcome, Asha" (React state) is just a convenience.

### Pieces of an auth setup

| Concern | Recommended approach |
|---|---|
| Token storage | HttpOnly cookie (immune to XSS reads); if you must use a bearer token, keep the access token in memory and the refresh token in an HttpOnly cookie |
| Current user | Fetch `/me` on startup; store in Context or a Redux `auth` slice |
| Loading state | A `status` of `checking`, `authenticated` or `anonymous` so you do not flash the login page |
| Route protection | `ProtectedRoute` component, React Router loader redirect, or Next.js middleware |
| Token refresh | Interceptor that retries once after `/refresh` on 401, with a single in-flight refresh promise |
| Logout | Call server to clear cookie, reset store, clear query caches |
| Roles/permissions | Keep `roles` on the user; hide UI by role, but the server must enforce |
| Multi-tab | `BroadcastChannel` or `storage` event to sync logout across tabs |

### Flow

```text
App start -> GET /me (cookie sent automatically)
   |-- 200 -> status = authenticated, user = data
   |-- 401 -> status = anonymous
Protected route -> status checking? show spinner
               -> anonymous? redirect to /login?next=/current
API call 401 -> POST /refresh -> retry once -> still 401 -> logout
```

## Example

```jsx
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "checking", user: null });

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => setState({ status: user ? "authenticated" : "anonymous", user }));
  }, []);

  async function login(email, password) {
    const r = await fetch("/api/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error("Invalid credentials");
    setState({ status: "authenticated", user: await r.json() });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setState({ status: "anonymous", user: null });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "checking") return <p>Loading...</p>;
  if (status === "anonymous") return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
```

> **⚠️ Gotcha:** Any token in `localStorage` can be stolen by a single XSS bug. HttpOnly cookies need CSRF protection (SameSite=Lax/Strict plus a CSRF token for unsafe methods), but they keep the token out of JavaScript entirely.

## Common mistakes

- Storing JWTs in `localStorage` and calling it secure.
- Relying on hidden buttons or client-side route guards as the only authorization.
- No "checking" state, so logged-in users briefly see the login page on refresh.
- Firing several refresh requests in parallel when many API calls get 401 together.

## Follow-up questions

- **Context or Redux for auth?** Context is enough because auth changes rarely; use a Redux slice if the app already uses Redux and other slices react to login/logout.
- **How do you protect routes in Next.js App Router?** Check the session in `middleware.ts` or in a server component/layout and `redirect()` before rendering.
- **How do you clear cached data on logout?** Reset the store (root reducer on `logout`) and call `queryClient.clear()` or `api.util.resetApiState()`.

## Quick recap

- Token in an HttpOnly cookie; user object in React state.
- Bootstrap with `/me` and track a `checking` status.
- Guard routes on the client, enforce on the server.
- Centralize refresh-on-401 and clear all caches on logout.
