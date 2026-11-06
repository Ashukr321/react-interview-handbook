---
title: "What is CSRF (Cross-Site Request Forgery) and how do you mitigate it?"
tags: ["security", "csrf", "cookies", "samesite"]
difficulty: "medium"
---

## Short answer

CSRF tricks a logged-in user's browser into sending a request your server trusts, because the browser attaches cookies automatically. A malicious site can submit a hidden form to `bank.com/transfer` and the session cookie rides along. You mitigate it with `SameSite` cookies, CSRF tokens (synchronizer or double-submit), and checking `Origin`/`Referer` on state-changing requests.

## Explanation

Imagine your house key is clipped to your belt and every door you walk past opens automatically. CSRF is a stranger steering you past your own front door. The attacker never sees the key; they just make you use it.

CSRF only matters when authentication is **ambient**, meaning the browser sends it without your code asking: cookies, HTTP Basic auth, client certificates. If your React app sends a token in an `Authorization` header that it attaches manually, a cross-site form cannot add that header, so classic CSRF does not apply (but XSS becomes the bigger risk).

### Mitigations

| Defense | How it works | Notes |
|---|---|---|
| `SameSite=Lax` / `Strict` cookie | Browser does not send the cookie on cross-site sub-requests | `Lax` still sends on top-level GET navigation, so never change state on GET |
| Synchronizer token | Server stores a random token in the session, client sends it in a header or form field | Attacker cannot read it because of the same-origin policy |
| Double-submit cookie | Token in a readable cookie and in a header; server checks they match | Sign the token or bind it to the session to avoid cookie injection |
| Origin / Referer check | Reject state-changing requests from foreign origins | Cheap, good extra layer |
| Custom header requirement | e.g. `X-Requested-With`; cross-site forms cannot set custom headers | Works with a strict CORS policy |

### React-side responsibilities

React does not handle CSRF for you. Your job is to read the token the server provides (meta tag, cookie, or `/csrf` endpoint) and attach it to every mutating request, usually in an Axios or fetch wrapper.

## Example

```jsx
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // send the session cookie
  xsrfCookieName: "XSRF-TOKEN", // Axios reads this cookie...
  xsrfHeaderName: "X-XSRF-TOKEN", // ...and sends it in this header
});

export function DeleteAccountButton() {
  async function handleClick() {
    await api.post("/account/delete"); // header added automatically for same-origin requests
  }
  return <button onClick={handleClick}>Delete account</button>;
}
```

The server must still verify that `X-XSRF-TOKEN` matches the token tied to the session.

## Common mistakes

- Thinking CORS prevents CSRF. CORS controls who can **read** responses; a simple cross-site form POST is still sent.
- Changing state with GET requests, which `SameSite=Lax` does not protect.
- Relying on `SameSite` alone. Older browsers and same-site subdomains (a compromised `evil.example.com`) can bypass it.
- Putting the CSRF token in a URL query string, where it leaks into logs and Referer headers.

## Follow-up questions

- **Does a JWT in localStorage need CSRF protection?** Not for classic CSRF, because the browser does not send it automatically, but it is readable by any XSS.
- **What is the difference between `Lax` and `Strict`?** `Strict` never sends the cookie cross-site, even on link clicks (users appear logged out when arriving from another site); `Lax` sends it on top-level GET navigations.
- **Is `SameSite=None` ever needed?** Yes, for genuinely cross-site embeds or third-party flows; it requires `Secure` and should come with a CSRF token.

## Quick recap

- CSRF abuses automatically attached credentials, usually cookies.
- Use `SameSite`, CSRF tokens, and Origin checks together.
- Never mutate state on GET.
- React only attaches the token; the server enforces it.
