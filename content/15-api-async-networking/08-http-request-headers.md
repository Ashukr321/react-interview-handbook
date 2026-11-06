---
title: "What is the use of the headers in the HTTP request?"
tags: ["http", "headers", "networking", "basics"]
difficulty: "easy"
---

## Short answer

Headers are key-value metadata sent alongside an HTTP request or response. They tell the other side **how** to interpret the message without being part of the body: who you are (`Authorization`, `Cookie`), what you are sending (`Content-Type`), what you accept back (`Accept`, `Accept-Encoding`), caching rules (`Cache-Control`, `If-None-Match`), and security policies (`Origin`, CORS and CSP headers). The body is the parcel; headers are the shipping label.

## Explanation

When you post a package, the label says who it is from, who it is for, whether it is fragile, and how to handle it. The courier never opens the box; it reads the label. Servers, proxies, CDNs and browsers all read headers in the same way.

### Common request headers

| Header | Purpose | Example |
|---|---|---|
| `Content-Type` | Format of the request body | `application/json` |
| `Accept` | Formats the client can handle | `application/json` |
| `Authorization` | Credentials | `Bearer eyJ...` |
| `Cookie` | Cookies the browser attaches | `session=abc` |
| `Accept-Encoding` | Compression supported | `gzip, br` |
| `Accept-Language` | Preferred language | `en-IN,en;q=0.9` |
| `If-None-Match` / `If-Modified-Since` | Conditional request for caching | `"etag-123"` |
| `Origin` / `Referer` | Where the request came from | `https://app.example.com` |
| `User-Agent` | Client software | browser string |
| Custom (`X-Request-Id`) | App-specific metadata | tracing IDs |

### Common response headers

| Header | Purpose |
|---|---|
| `Content-Type` | Format of the response |
| `Cache-Control`, `ETag` | Caching behavior |
| `Set-Cookie` | Store a cookie (with `HttpOnly`, `Secure`, `SameSite`) |
| `Access-Control-Allow-Origin` | CORS permission |
| `Content-Security-Policy`, `Strict-Transport-Security` | Security policies |
| `Retry-After` | When to retry after 429/503 |
| `Location` | Redirect target |

### Things worth knowing

- Header names are case-insensitive. HTTP/2 and HTTP/3 send them lowercase and compress them (HPACK/QPACK).
- Some headers are **forbidden** for JS to set (`Cookie`, `Host`, `Origin`, `Content-Length`); the browser controls them.
- Adding custom headers or `Content-Type: application/json` on cross-origin requests triggers a **CORS preflight** (`OPTIONS`).
- To read custom response headers cross-origin, the server must list them in `Access-Control-Expose-Headers`.

## Example

```jsx
async function createTodo(title, token) {
  const res = await fetch("https://api.example.com/todos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // body is JSON
      Accept: "application/json", // we want JSON back
      Authorization: `Bearer ${token}`, // who we are
      "Idempotency-Key": crypto.randomUUID(), // safe retries
    },
    body: JSON.stringify({ title }),
  });

  console.log(res.headers.get("content-type")); // read a response header
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}
```

## Common mistakes

- Forgetting `Content-Type: application/json`, so the server cannot parse the body.
- Setting `Content-Type` manually when sending `FormData`; the browser must set it to include the multipart boundary.
- Putting secrets in custom headers to third-party domains, or tokens in URLs instead of headers.
- Not understanding why a custom header suddenly causes a CORS preflight failure.

## Follow-up questions

- **What is a CORS preflight?** An automatic `OPTIONS` request the browser sends before a "non-simple" cross-origin request to check that the server allows the method and headers.
- **How do `ETag` and `If-None-Match` work?** The server sends an `ETag`; the browser sends it back on the next request, and the server replies `304 Not Modified` with no body if nothing changed.
- **Why can't fetch set the `Cookie` header?** It is a forbidden header; use `credentials: "include"` and let the browser attach cookies.

## Quick recap

- Headers are metadata: the label, not the parcel.
- They handle content negotiation, auth, caching, compression and security.
- Some headers are browser-controlled.
- Custom headers on cross-origin calls trigger CORS preflights.
