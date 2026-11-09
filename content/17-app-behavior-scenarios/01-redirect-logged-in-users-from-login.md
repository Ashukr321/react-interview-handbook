---
title: "How do you prevent a login page from being accessible after the user is logged in?"
tags: ["auth", "routing", "react-router", "guards"]
difficulty: "medium"
---

## Short answer

Add a **guest-only guard** to the login route: if the user is already authenticated, redirect them (with `replace`) to the dashboard or the page they came from. In React Router v6.4+/v7 the cleanest place is a route `loader` that throws `redirect()`, or a small `GuestRoute` wrapper that renders `Navigate`. In Next.js, do it in middleware or the server component before rendering. Also make sure the auth state is known before deciding, to avoid a flash of the login form.

## Why it happens

- Routes are just URLs; nothing stops a logged-in user from typing `/login` or pressing Back.
- After login, `navigate("/dashboard")` without `replace` leaves `/login` in history, so Back returns to it.
- Auth state often loads asynchronously (token refresh, `/me` call). If the guard checks before it's loaded, it sees "logged out" and shows the form briefly.

## How to fix it

1. **Keep a single source of truth for auth** (context, Redux slice, or query cache) with a `status`: `"loading" | "authenticated" | "guest"`.
2. **Guard the route** with a loader redirect or a wrapper component.
3. **Use `replace`** when redirecting after login so `/login` isn't in history.
4. **Redirect back** to the original page using a `from` value or `?redirectTo=`, validated to be a same-site path.
5. **Mirror it on the server** for SSR apps so the HTML for `/login` is never sent to logged-in users.

```jsx
// Option A: component guard (React Router v6/v7)
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./auth";

export function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "authenticated") {
    const to = location.state?.from?.pathname ?? "/dashboard";
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}

// routes
// { element: <GuestRoute />, children: [{ path: "/login", element: <Login /> }] }
```

```jsx
// Option B: data router loader (runs before rendering, no flash)
import { redirect } from "react-router";

export async function loginLoader() {
  const user = await getCurrentUser(); // cached / reads session
  if (user) throw redirect("/dashboard");
  return null;
}
```

```js
// Option C: Next.js middleware
import { NextResponse } from "next/server";

export function middleware(req) {
  const hasSession = req.cookies.has("session");
  if (hasSession && req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
export const config = { matcher: ["/login", "/signup"] };
```

After a successful login:

```jsx
navigate(redirectTo ?? "/dashboard", { replace: true });
```

## How to verify

- Log in, then type `/login` in the address bar: you land on the dashboard.
- Log in, then press Back: you don't see the login form.
- Hard-refresh `/login` while logged in: no flash of the form.
- Try `?redirectTo=https://evil.com`: it should be rejected (open-redirect check).
- Log out: `/login` is reachable again.

## Follow-up questions

- **Is a client-side guard secure?** No, it's UX only. The API must still authorize every request; guards just decide what to show.
- **Where do you store the token?** Prefer an httpOnly, Secure, SameSite cookie set by the server over `localStorage`, to limit XSS token theft.
- **How do you protect private routes?** The mirror image: a `ProtectedRoute` that redirects guests to `/login` with `state={{ from: location }}`.

## Quick recap

- Guest-only guard on `/login` and `/signup`.
- Wait for auth status before deciding.
- Redirect with `replace` to keep history clean.
- Prefer loader or middleware redirects to avoid flashes.
- Server-side authorization is still required.
