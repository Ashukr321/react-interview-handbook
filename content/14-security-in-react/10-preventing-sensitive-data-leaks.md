---
title: "How do you prevent sensitive data leaks in client-side logs or error messages?"
tags: ["security", "logging", "error-handling", "privacy"]
difficulty: "medium"
---

## Short answer

Assume everything in the browser is public: the bundle, the console, network responses and error reports. Strip `console` calls in production builds, scrub tokens and PII before sending anything to monitoring tools like Sentry, show users generic error messages while logging details server-side with a correlation ID, and never put secrets in client environment variables. Source maps should not be publicly served.

## Explanation

A frontend app is like a shop window: anything you put in it, anyone walking by can see. Logs and errors are the most common way secrets end up in that window by accident.

### Where leaks happen

| Leak source | Example | Fix |
|---|---|---|
| `console.log` | Logging the whole `user` or Axios `config` (with `Authorization` header) | Remove logs in prod, log only IDs |
| Error UI | Showing `err.message` from the server with SQL or stack traces | Generic message + error ID |
| Error monitoring | Sentry captures request bodies, headers, URLs | `beforeSend` scrubber, server-side data scrubbing |
| Env variables | `VITE_STRIPE_SECRET`, `NEXT_PUBLIC_API_KEY` | Only public keys use public prefixes; secrets stay on the server |
| URLs | Tokens or emails in query strings end up in history, logs and `Referer` | Use POST bodies or headers |
| Source maps | Full original code exposed | Upload privately to Sentry, do not deploy publicly |
| Redux DevTools / state | Tokens visible in state snapshots | Keep secrets out of global state, disable DevTools in prod |
| API over-fetching | Endpoint returns full user record, UI shows only name | Return only needed fields from the server |

### Principles

- **Data minimization**: if the client never receives it, it cannot leak it.
- **Allow-list fields** to log, rather than trying to block-list sensitive ones.
- **Correlation IDs**: the user sees "Something went wrong (ref: 7f3a)", and support looks up the full detail on the server.

## Example

```jsx
import * as Sentry from "@sentry/react";

const SENSITIVE = /authorization|cookie|password|token|secret|ssn|card/i;

function scrub(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrub);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, SENSITIVE.test(k) ? "[REDACTED]" : scrub(v)])
  );
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // DSN is public by design
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) event.request = scrub(event.request);
    if (event.extra) event.extra = scrub(event.extra);
    return event;
  },
});

export function ErrorFallback({ error, eventId }) {
  // do not render error.message: it may contain server internals
  return (
    <div role="alert">
      <p>Something went wrong. Please try again.</p>
      {eventId && <p>Reference: {eventId}</p>}
    </div>
  );
}
```

Strip console calls in a Vite production build:

```js
// vite.config.js
export default {
  esbuild: { drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [] },
};
```

## Common mistakes

- Believing env variables are secret in a frontend build. Anything prefixed `VITE_` or `NEXT_PUBLIC_` is baked into the JS bundle.
- Logging full Axios error objects, which include request headers with the bearer token.
- Showing raw backend errors to users.
- Disabling `console` but leaving verbose error reporting that sends full payloads to a third party.

## Follow-up questions

- **How do you handle errors in React specifically?** Use error boundaries (or `react-error-boundary`) to show a safe fallback and report a scrubbed error with an ID.
- **Are API keys in the bundle ever okay?** Only keys designed to be public (Stripe publishable key, Firebase config, Sentry DSN) with restrictions set on the provider side.
- **Does minification hide secrets?** No. Minified code is trivially searchable for strings.

## Quick recap

- Everything shipped to the browser is public.
- Remove console logs and scrub monitoring payloads.
- Generic user-facing errors, detailed server-side logs with an ID.
- No secrets in client env vars, URLs or public source maps.
