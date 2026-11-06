---
title: "What is the difference between HttpOnly and Secure cookies?"
tags: ["security", "cookies", "httponly", "https"]
difficulty: "easy"
---

## Short answer

They are two independent cookie flags that protect against different threats. `HttpOnly` hides the cookie from JavaScript (`document.cookie` cannot read it), which protects it from theft via XSS. `Secure` makes the browser send the cookie only over HTTPS, which protects it from being sniffed on the network. A session or refresh token cookie should have both, plus `SameSite`.

## Explanation

Think of a cookie as a letter. `HttpOnly` means "do not let anyone in the house open this letter, just deliver it". `Secure` means "only send this letter in a sealed, armored envelope". One stops people inside the house (scripts); the other stops people on the road (network attackers).

### Comparison

| | `HttpOnly` | `Secure` |
|---|---|---|
| Protects against | XSS reading the cookie | Man-in-the-middle on HTTP |
| Effect | Not exposed to `document.cookie` or JS APIs | Only sent on `https://` requests (and localhost) |
| Still sent with requests? | Yes, automatically | Yes, over HTTPS only |
| Can JS set it? | No, only the server via `Set-Cookie` | JS can set a `Secure` cookie on HTTPS pages |
| Stops CSRF? | No | No |

### The full cookie checklist

- `HttpOnly`: JS cannot read it.
- `Secure`: HTTPS only.
- `SameSite=Lax` or `Strict`: limits cross-site sending (CSRF defense). `SameSite=None` requires `Secure`.
- `Path` and `Domain`: scope as narrowly as possible; omit `Domain` to keep it host-only.
- `Max-Age` / `Expires`: give it a sensible lifetime.
- `__Host-` prefix: forces `Secure`, `Path=/` and no `Domain`, preventing subdomains from overwriting it.

## Example

Express server setting a refresh token cookie:

```js
app.post("/api/auth/login", async (req, res) => {
  const { accessToken, refreshToken } = await login(req.body);

  res.cookie("__Host-refresh", refreshToken, {
    httpOnly: true, // not readable by JS
    secure: true, // HTTPS only
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({ accessToken });
});
```

Resulting header:

```text
Set-Cookie: __Host-refresh=abc...; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Strict
```

In React you never read this cookie. You just send requests with `credentials: "include"` (fetch) or `withCredentials: true` (Axios).

## Common mistakes

- Thinking `HttpOnly` makes the cookie safe from CSRF. It is still sent automatically.
- Thinking `Secure` encrypts the cookie value. It only restricts the transport; the value itself is plain.
- Trying to read an HttpOnly cookie in React to "check if logged in". Call a `/me` endpoint instead.
- Forgetting `Secure` in production because local development runs on HTTP (browsers treat `localhost` as secure, so it usually works anyway).

## Follow-up questions

- **Can a React app set an HttpOnly cookie?** No. Only the server can, through the `Set-Cookie` response header.
- **How does the client know the user is logged in then?** Call a `/me` or `/session` endpoint, or have the server set a separate non-sensitive, readable flag cookie.
- **Does HttpOnly stop all XSS damage?** No. It stops cookie theft, but injected script can still make authenticated requests from the page.

## Quick recap

- `HttpOnly` = hidden from JavaScript (anti-XSS theft).
- `Secure` = HTTPS only (anti-sniffing).
- Neither stops CSRF; add `SameSite` and tokens.
- Auth cookies need `HttpOnly; Secure; SameSite`.
