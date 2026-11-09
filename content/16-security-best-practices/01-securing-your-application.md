---
title: "How do you secure your application from attacks?"
tags: ["security", "owasp", "best-practices", "defense-in-depth"]
difficulty: "medium"
---

## Short answer

I use defense in depth: several independent layers, so one failure does not mean a breach. On the frontend: escape output and sanitize any HTML (XSS), keep tokens in HttpOnly cookies, set security headers (CSP, HSTS, `frame-ancestors`), and keep secrets out of the bundle. On the backend: authenticate and authorize every request, validate all input, use CSRF protection and rate limiting. Across the stack: HTTPS everywhere, dependency scanning, least privilege, logging and monitoring.

## Explanation

Securing an app is like securing a building. You do not rely on just the front-door lock. You also have a guard who checks ID (authentication), keycards for each floor (authorization), cameras (logging), fire doors (isolation), and you check the contractors you let in (dependencies).

### Layered checklist

| Layer | Practices |
|---|---|
| Transport | HTTPS only, HSTS, TLS 1.2+ |
| Frontend rendering | JSX escaping, DOMPurify for HTML, URL allow-lists, no `eval` |
| Headers | CSP, `frame-ancestors`/`X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| Auth | HttpOnly + Secure + SameSite cookies, short-lived tokens, rotation, MFA, PKCE for OAuth |
| Authorization | Checked on the server on every request; hiding a button is not access control |
| Input | Schema validation on the server, parameterized queries, file upload checks |
| CSRF | SameSite cookies, CSRF tokens, Origin checks |
| Abuse | Rate limiting, CAPTCHA on sensitive flows, account lockout |
| Secrets | Server-side env vars and secret managers, never `NEXT_PUBLIC_`/`VITE_` |
| Dependencies | `npm audit`, Dependabot/Renovate, lockfiles, fewer third-party scripts, SRI for CDN scripts |
| Observability | Audit logs, alerting, scrubbed error reporting |

### Frontend-specific points

- The client is never trusted. Anything in the browser can be read or modified, including Redux state, hidden fields and API calls.
- Minimize what the API returns; do not send fields the UI does not need.
- Third-party scripts (analytics, chat widgets) run with full page access, so load as few as possible.

> **💡 Interview tip:** Mention OWASP Top 10 and give one concrete example from your own work, such as "we moved tokens from localStorage to HttpOnly cookies and added a CSP in report-only mode first."

## Example

Security headers in Next.js:

```js
// next.config.js
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'" },
];

module.exports = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

Server-side authorization (never trust the client):

```ts
// app/api/orders/[id]/route.ts
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const order = await db.order.findUnique({ where: { id } });
  if (!order || order.userId !== user.id) return new Response("Not found", { status: 404 });

  return Response.json({ id: order.id, total: order.total, status: order.status });
}
```

## Common mistakes

- Relying on frontend checks (disabled buttons, route guards) for authorization.
- Treating one control, like CSP or HTTPS, as "we are secure".
- Shipping API keys in the client bundle.
- Never updating dependencies, or adding packages without checking maintenance and downloads.

## Follow-up questions

- **What is the OWASP Top 10?** A regularly updated list of the most critical web risks, such as broken access control, injection, and security misconfiguration.
- **What is SRI?** Subresource Integrity: an `integrity` hash on `<script>`/`<link>` tags so the browser refuses a CDN file that was tampered with.
- **How do you test security?** Dependency scans in CI, SAST/linting rules, DAST tools such as OWASP ZAP, header checks, and periodic penetration tests.

## Quick recap

- Defense in depth: many independent layers.
- The server enforces auth, authorization and validation.
- Frontend: escape, sanitize, set headers, keep secrets and tokens out of JS reach.
- Keep dependencies updated and monitor everything.
