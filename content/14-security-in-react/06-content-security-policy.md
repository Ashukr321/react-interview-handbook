---
title: "Explain Content Security Policy (CSP) and its role in React security."
tags: ["security", "csp", "xss", "headers"]
difficulty: "hard"
---

## Short answer

CSP is an HTTP response header that tells the browser which sources of scripts, styles, images, frames and network connections are allowed on a page. It is a second line of defense against XSS: even if an attacker injects `<script>` or an inline handler, the browser refuses to run it unless it matches the policy. For React apps, a nonce- or hash-based `script-src` with `'strict-dynamic'` and no `'unsafe-inline'` is the modern recommendation.

## Explanation

If sanitization is the bouncer at the door, CSP is the guest list taped inside every room. Someone who sneaks past the bouncer still cannot do anything in a room where they are not on the list.

### Key directives

| Directive | Controls | Typical value |
|---|---|---|
| `default-src` | Fallback for everything | `'self'` |
| `script-src` | JS sources | `'self' 'nonce-abc123' 'strict-dynamic'` |
| `style-src` | CSS | `'self'` (CSS-in-JS may need a nonce) |
| `img-src` | Images | `'self' data: https://cdn.example.com` |
| `connect-src` | fetch/XHR/WebSocket | `'self' https://api.example.com wss://rt.example.com` |
| `frame-ancestors` | Who can frame you | `'none'` (clickjacking) |
| `object-src` | Plugins | `'none'` |
| `base-uri` | `<base>` tag | `'self'` |
| `report-to` / `report-uri` | Where violations are reported | your endpoint |

### Nonces and hashes

- **Nonce**: the server generates a random value per response, puts it in the header and on each allowed `<script nonce="...">`. Injected scripts do not know it.
- **Hash**: the header lists the SHA-256 of an allowed inline script. Good for static sites.
- **`'strict-dynamic'`**: scripts loaded by a trusted (nonced) script are also trusted, so bundlers' code-split chunks work without listing every URL.

### React specifics

- Client-only SPAs (Vite) served statically cannot generate per-request nonces; use hashes or a strict `'self'` allow-list.
- Next.js App Router supports nonces: generate one in middleware, set the header, and Next applies it to its own scripts.
- CSS-in-JS libraries inject `<style>` tags at runtime and may need a nonce or `'unsafe-inline'` for styles.
- Avoid `'unsafe-eval'`; some old libraries need it, which is a reason to replace them.

### Rollout

Start with `Content-Security-Policy-Report-Only` to collect violations without breaking anything, fix them, then enforce.

## Example

Next.js middleware generating a nonce:

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
```

## Common mistakes

- Adding `'unsafe-inline'` to `script-src` to "make it work", which removes most of the XSS protection.
- Reusing the same nonce across responses; it must be unpredictable per request.
- Forgetting `connect-src`, so API or WebSocket calls break in production only.
- Treating CSP as a replacement for escaping and sanitization.

## Follow-up questions

- **Can CSP be set in a meta tag?** Yes, most directives can, but `frame-ancestors`, `report-uri` and sandbox cannot; headers are preferred.
- **What are Trusted Types?** A CSP feature (`require-trusted-types-for 'script'`) that forces DOM sinks like `innerHTML` to accept only typed, sanitized values, catching DOM XSS at the source.
- **How does CSP help against data exfiltration?** A strict `connect-src` and `img-src` limit where injected code can send stolen data.

## Quick recap

- CSP is a header that allow-lists content sources.
- It limits the damage of XSS; it does not replace sanitization.
- Use nonces/hashes plus `'strict-dynamic'`, avoid `'unsafe-inline'`.
- Roll out with Report-Only first.
