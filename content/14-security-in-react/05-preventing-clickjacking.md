---
title: "How do you prevent clickjacking attacks in React apps?"
tags: ["security", "clickjacking", "csp", "headers"]
difficulty: "medium"
---

## Short answer

Clickjacking loads your site inside an invisible `iframe` on an attacker's page and tricks the user into clicking your real buttons ("Delete account", "Transfer"). You prevent it with HTTP response headers that forbid framing: `Content-Security-Policy: frame-ancestors 'none'` (modern) and `X-Frame-Options: DENY` (legacy fallback). This is a server/hosting concern, not something React code can reliably fix.

## Explanation

Picture a "Win a free phone!" button drawn on a sheet of glass, with your bank's real "Confirm payment" button sitting exactly underneath at 0% opacity. The user thinks they click the prize; they actually click your app, while logged in.

### Headers

| Header | Value | Meaning |
|---|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'` | No one may frame this page |
| `Content-Security-Policy` | `frame-ancestors 'self' https://partner.com` | Only self and a listed partner |
| `X-Frame-Options` | `DENY` | Legacy: no framing at all |
| `X-Frame-Options` | `SAMEORIGIN` | Legacy: same origin only |

`frame-ancestors` overrides `X-Frame-Options` in modern browsers and supports allow-lists, so send both for older browsers. `frame-ancestors` does **not** work in a `<meta>` CSP tag; it must be a real HTTP header.

### Why React cannot fix it alone

A React SPA is static files served by a CDN or server, so the headers must be set there (Nginx, Vercel, Netlify, Express, Next.js config). Old "frame-busting" JavaScript (`if (top !== self) top.location = self.location`) can be defeated by the `sandbox` attribute on the attacker's iframe.

### Extra layers

- Require re-authentication or a confirmation step for destructive actions.
- `SameSite` cookies reduce the impact, because a cross-site frame will not get the session cookie with `Strict` (and `Lax` blocks it for iframes too).

## Example

Next.js App Router project (`next.config.js`):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

Express server serving a Vite/CRA build:

```js
import express from "express";
import helmet from "helmet";

const app = express();
app.use(helmet({ frameguard: { action: "deny" } })); // sets X-Frame-Options
app.use(express.static("dist"));
```

## Common mistakes

- Putting `frame-ancestors` in a `<meta http-equiv>` tag; browsers ignore it there.
- Setting the header on the API but not on the HTML document, which is what actually gets framed.
- Using `ALLOW-FROM` in `X-Frame-Options`; it is obsolete and unsupported in modern browsers.
- Blocking all framing when the product legitimately needs embedding (widgets); use an explicit allow-list instead.

## Follow-up questions

- **How do you test it?** Create a local HTML page with `<iframe src="https://your-app">` and check the browser console for a refusal, or inspect response headers in DevTools.
- **What if part of the app must be embeddable?** Apply `frame-ancestors` per route: strict on the main app, an allow-list on the embed route.
- **Is clickjacking related to CSRF?** Both abuse the logged-in session, but clickjacking uses the user's real clicks, so CSRF tokens do not stop it.

## Quick recap

- Clickjacking = your page in a hidden iframe, user clicks hijacked.
- Use `CSP frame-ancestors` plus `X-Frame-Options`.
- Set them as HTTP headers on the HTML response.
- JS frame-busting is unreliable.
