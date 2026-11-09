---
title: "How do you prevent XSS and CSRF attacks?"
tags: ["security", "xss", "csrf", "cookies"]
difficulty: "medium"
---

## Short answer

XSS and CSRF are opposite problems. XSS means the attacker's code runs **inside** your site, so you prevent it by escaping output, sanitizing HTML, and adding CSP. CSRF means another site makes the user's browser send a request **to** your site with their cookies, so you prevent it with `SameSite` cookies, CSRF tokens and Origin checks. They interact: a CSRF token stops CSRF only if there is no XSS, because injected script can read the token.

## Explanation

XSS is a burglar who got inside your house. CSRF is a con artist outside who tricks you into opening the door yourself. Locking the door (CSRF tokens) does nothing once the burglar is already inside (XSS), so XSS is the more fundamental fix.

### Side by side

| | XSS | CSRF |
|---|---|---|
| What the attacker does | Runs JS in your origin | Sends forged requests from another origin |
| Exploits | Trust the user has in your site's content | Trust your server has in the browser's cookies |
| Can read responses? | Yes | No (same-origin policy) |
| Main defenses | Output escaping, DOMPurify, CSP, Trusted Types | `SameSite` cookies, CSRF tokens, Origin/Referer checks |
| Helped by HttpOnly? | Stops cookie theft, not in-page actions | No |
| Applies when using bearer tokens in headers? | Yes, and tokens in JS are stealable | Not for classic CSRF |

### Combined strategy

1. **Render safely**: JSX/templating escaping, sanitize any HTML, validate URLs.
2. **CSP**: no `'unsafe-inline'`, nonces or hashes for scripts.
3. **Cookies**: `HttpOnly; Secure; SameSite=Lax` (or `Strict`).
4. **CSRF token** on every state-changing request when auth uses cookies.
5. **Never change state on GET**.
6. **Check `Origin`** on the server for POST/PUT/PATCH/DELETE.
7. **Re-authenticate** for critical actions (password change, payments).

## Example

Express server with both defenses:

```js
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";

const app = express();
app.use(helmet()); // CSP, nosniff, frameguard and more (tune the CSP for your app)
app.use(cookieParser());
app.use(express.json());

// issue a CSRF token tied to the session (double-submit pattern)
app.get("/api/csrf", (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie("csrf", token, { secure: true, sameSite: "strict" }); // readable by our JS on purpose
  res.json({ token });
});

// verify on every state-changing request
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== "https://app.example.com") return res.sendStatus(403);
  const header = req.get("x-csrf-token");
  if (!header || header !== req.cookies.csrf) return res.sendStatus(403);
  next();
});
```

React side:

```jsx
export async function updateEmail(email, csrfToken) {
  const res = await fetch("/api/account/email", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Update failed");
}

export function EmailPreview({ email }) {
  return <p>New email: {email}</p>; // escaped by React, no XSS
}
```

## Common mistakes

- Believing CORS stops CSRF; simple form posts are still sent cross-site.
- Believing HttpOnly cookies stop XSS; they only stop cookie theft.
- Adding CSRF tokens while leaving an XSS hole, which makes the tokens readable.
- Using `SameSite=None` without a CSRF token.

## Follow-up questions

- **Why is a plain double-submit cookie weaker than a synchronizer token?** An attacker who can set cookies on a sibling subdomain can plant a matching cookie; signing the token with the session ID (or using `__Host-` cookies) fixes that.
- **Do SPAs with JWT headers need CSRF protection?** Not classic CSRF, but then the token is in JS, so XSS defenses matter even more.
- **What is the single highest-impact change?** Fixing XSS, because it defeats almost every other client-side control.

## Quick recap

- XSS: attacker code inside your page; escape, sanitize, CSP.
- CSRF: forged requests riding on cookies; SameSite, tokens, Origin checks.
- HttpOnly helps XSS impact but not CSRF.
- XSS breaks CSRF defenses, so fix XSS first.
