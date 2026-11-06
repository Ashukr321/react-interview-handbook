---
title: "How do you securely store JWT tokens in a React app?"
tags: ["security", "jwt", "cookies", "auth"]
difficulty: "medium"
---

## Short answer

The safest common pattern is: keep the long-lived refresh token in an `HttpOnly; Secure; SameSite` cookie that JavaScript cannot read, and keep a short-lived access token only in memory (a variable or React state). On page reload, call a `/refresh` endpoint to get a new access token. Avoid putting tokens in `localStorage`, because any XSS can read and exfiltrate them.

## Explanation

Think of it as a hotel: the refresh token is your passport locked in the hotel safe (HttpOnly cookie), and the access token is the room key card in your pocket (memory). Losing the key card is annoying but it expires in 15 minutes; the passport never leaves the safe.

### Options compared

| Storage | Readable by JS / XSS | Sent automatically | Survives reload | CSRF risk |
|---|---|---|---|---|
| `localStorage` | Yes | No | Yes | No |
| `sessionStorage` | Yes | No | Per tab | No |
| In-memory variable | Only while XSS runs | No | No | No |
| HttpOnly cookie | No | Yes | Yes | Yes, needs `SameSite` + CSRF token |

### Recommended setup

- **Access token**: 5-15 minute lifetime, held in memory, sent as `Authorization: Bearer ...`.
- **Refresh token**: HttpOnly, `Secure`, `SameSite=Strict` or `Lax`, scoped with `Path=/auth/refresh`, rotated on every use.
- **BFF (Backend-for-Frontend)**: even better, let a server you own hold the tokens and give the browser only a session cookie. This is the pattern Next.js and OAuth security best practices push towards.

> **💡 Interview tip:** No browser storage is immune to XSS. HttpOnly cookies stop token **theft**, but an attacker running script can still make authenticated requests while the user is on the page. Say this out loud; it shows you understand the real boundary.

## Example

```jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
let accessToken = null; // module-level memory, not localStorage

export function getAccessToken() {
  return accessToken;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // refresh cookie is sent automatically; JS never sees it
    fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        accessToken = data?.accessToken ?? null;
        setUser(data?.user ?? null);
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <p>Loading…</p>;
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

## Common mistakes

- Storing the refresh token in `localStorage` "because the access token is short-lived anyway".
- Putting secrets or PII inside the JWT payload. JWTs are signed, not encrypted; anyone can base64-decode them.
- Forgetting `credentials: "include"` (fetch) or `withCredentials: true` (Axios), so the cookie is never sent.
- Using HttpOnly cookies without any CSRF protection.

## Follow-up questions

- **Why not just store the access token in a cookie too?** You can (pure cookie sessions), but then every API call is cookie-authenticated and needs CSRF defenses; header tokens avoid that.
- **How do you log out?** Clear the in-memory token and call a server endpoint that revokes the refresh token and clears the cookie with an expired `Set-Cookie`.
- **How do multiple tabs stay in sync?** Each tab refreshes on load; use `BroadcastChannel` to broadcast logout.

## Quick recap

- Refresh token in HttpOnly + Secure + SameSite cookie.
- Access token short-lived and in memory.
- Rotate refresh tokens and revoke on logout.
- A BFF keeps tokens out of the browser entirely.
