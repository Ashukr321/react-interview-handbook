---
title: "How do you ensure secure handling of sensitive user data on the client side?"
tags: ["security", "xss", "auth", "privacy"]
difficulty: "hard"
---

## Short answer

I treat the browser as untrusted: keep as little sensitive data there as possible, never hard-code secrets, store session tokens in `HttpOnly`, `Secure`, `SameSite` cookies instead of `localStorage`, and defend against XSS with React's escaping, a strict Content Security Policy and careful sanitizing. All real authorization and validation happens on the server, and sensitive data is kept out of logs, URLs and analytics.

## Why it happens

Data leaks on the client usually come from:

- **XSS**: injected script reads `localStorage`, the DOM or makes requests as the user.
- **Over-fetching**: API returns full user objects, so PII sits in memory and DevTools.
- **Leaky channels**: tokens in URLs, PII in error logs, analytics or session replay.
- **Secrets in the bundle**: API keys in `NEXT_PUBLIC_` / `VITE_` variables are public.
- **Third-party scripts** with full access to the page.

## How to fix it

### 1. Store sessions safely

```text
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax; Path=/
```

JavaScript cannot read an `HttpOnly` cookie, so XSS cannot steal it. Add CSRF protection (SameSite plus a CSRF token for unsafe methods).

### 2. Block XSS

```jsx
import DOMPurify from "dompurify";

function Comment({ html, url }) {
  const safeHref = /^https?:\/\//.test(url) ? url : "#"; // block javascript: URLs
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
      <a href={safeHref} rel="noopener noreferrer">Link</a>
    </>
  );
}
```

Add a strict CSP header (nonce-based `script-src`, no `unsafe-inline`) and Subresource Integrity for CDN scripts.

### 3. Minimize and mask data

- APIs return only the fields the screen needs (masked card `**** 4242`).
- Clear sensitive state on logout, and avoid persisting it in Redux persist or `localStorage`.
- Use `autocomplete="off"` / `one-time-code` appropriately, and never echo passwords.

### 4. Keep it out of side channels

```js
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  beforeSend(event) {
    delete event.request?.cookies;
    return event;
  },
});
```

Mask inputs in session replay tools and never put tokens or emails in query strings.

> **💡 Interview tip:** Say clearly that anything shipped to the browser is public. Client checks are UX; the server enforces security.

## How to verify

- Run security headers checks (CSP, HSTS) and dependency audits (`npm audit`, Snyk) in CI.
- Pen test or automated scanners (OWASP ZAP) for XSS.
- Grep the production bundle for keys; review logs and analytics payloads for PII.

## Follow-up questions

- **Is `localStorage` encrypted?** No. Any script on the origin can read it, so do not keep tokens there.
- **Does React prevent XSS?** It escapes text in JSX, but not `dangerouslySetInnerHTML`, `javascript:` URLs or direct DOM APIs.
- **Should you encrypt data in the browser?** Rarely useful, since the key must also live in the browser; rely on HTTPS and server-side storage.

## Quick recap

- Browser is untrusted; keep sensitive data minimal and short-lived.
- `HttpOnly` cookies for sessions, plus CSRF protection.
- React escaping + sanitizing + strict CSP against XSS.
- No secrets in bundles, no PII in URLs, logs or analytics.
