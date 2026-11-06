---
title: "If a token is saved in localStorage, anyone can misuse it — what should you do?"
tags: ["security", "auth", "localstorage", "tokens"]
difficulty: "medium"
---

## Short answer

Move the token out of `localStorage`. Keep the refresh token in an `HttpOnly; Secure; SameSite` cookie set by the server, and keep the access token short-lived and in memory. If you cannot change storage right away, reduce the blast radius: short expiry, refresh token rotation with reuse detection, server-side revocation, a strict CSP, and fewer third-party scripts. And make sure the server validates every token on every request.

## Explanation

"Anyone" in practice means: any XSS payload, any compromised npm package or third-party script, any browser extension with page access, and anyone with physical access to an unlocked machine. They can all run `localStorage.getItem("token")` and replay the token from their own computer.

### Fix plan, in order of impact

| Step | What it does |
|---|---|
| HttpOnly cookie for refresh token | JS (and XSS) cannot read it |
| Access token in memory, 5-15 min expiry | A stolen token dies quickly |
| Refresh token rotation | Each refresh issues a new token; reuse of an old one revokes the session |
| BFF / server session | Browser holds only a session cookie; tokens live on your server |
| CSP + XSS hygiene | Makes the theft itself harder |
| Server-side revocation list / short sessions | Lets you kill compromised sessions |
| Bind tokens (DPoP / sender-constrained) | Stolen tokens are useless without the private key |

### What "misuse" the server must also prevent

Even a legitimately stored token can be misused by its owner, for example by changing a user ID in a request. The server must check **authorization** on every call: does this token's user own resource 42? Hiding a button in React is not security.

> **💡 Interview tip:** Mention the trade-off: moving to cookies introduces CSRF risk, so pair it with `SameSite` and a CSRF token. That shows you see the whole picture.

## Example

Before:

```js
// ❌ readable by any script on the page
localStorage.setItem("token", data.token);
fetch("/api/orders", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
```

After:

```jsx
// tokenStore.js: access token only in memory
let accessToken = null;
export const tokenStore = {
  get: () => accessToken,
  set: (t) => { accessToken = t; },
  clear: () => { accessToken = null; },
};

// login: server sets the HttpOnly refresh cookie, returns a short-lived access token
export async function login(credentials) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) throw new Error("Login failed");
  const { accessToken } = await res.json();
  tokenStore.set(accessToken);
}

// one-time migration: remove the old token for users who already have one
localStorage.removeItem("token");
```

On reload, the app calls `/api/auth/refresh` (the cookie is sent automatically) to get a new access token.

## Common mistakes

- "Encrypting" the token in localStorage; the key ships in the same bundle.
- Moving to cookies without adding CSRF protection.
- Keeping long-lived (days or weeks) access tokens.
- Forgetting to revoke tokens server-side on logout or password change.

## Follow-up questions

- **What if the backend is third-party and only accepts bearer tokens?** Put a thin proxy (BFF) in front of it that stores the token server-side and attaches it.
- **How do you detect a stolen refresh token?** Rotation with reuse detection: if an already-used refresh token shows up again, revoke the whole token family.
- **Is sessionStorage a fix?** No, it is equally readable by XSS; it only shortens the lifetime.

## Quick recap

- localStorage is readable by every script on the origin.
- Refresh token in HttpOnly cookie, access token in memory and short-lived.
- Rotate, revoke and authorize every request on the server.
- Add CSP and CSRF protection as part of the move.
