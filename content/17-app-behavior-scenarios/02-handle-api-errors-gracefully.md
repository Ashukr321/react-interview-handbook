---
title: "How do you handle API errors gracefully in the UI?"
tags: ["error-handling", "ux", "error-boundary", "react-query"]
difficulty: "medium"
---

## Short answer

Treat errors as a normal UI state. Catch them where the request happens, turn them into a **user-friendly message with a next step** (retry, sign in again, fix the form), and keep the rest of the page working. Use error boundaries (or the router's `errorElement`) for failures that break rendering, inline messages for field and section errors, toasts for background actions, and automatic retries for transient network failures. Log the technical details to a monitoring service, not to the user.

## Why it happens

- `fetch` doesn't reject on HTTP errors like 404 or 500; code that only uses `.catch` treats them as success and crashes on bad data.
- Error boundaries don't catch errors in event handlers, async code or effects, so many API errors bypass them.
- Without explicit error state, components render `undefined` data and the whole tree crashes (white screen).
- Different errors need different responses: a 401 isn't fixed by "Retry".

## How to fix it

1. **Normalize errors in one API client.** Check `res.ok`, parse the error body, and throw a typed error.
2. **Model the state**: `loading | error | success` (or use TanStack Query, which gives `isError`, `error`, `refetch`, and retries).
3. **Map status to UX:**

| Status | User experience |
|---|---|
| Network / timeout | "You seem to be offline", Retry button, auto-retry with backoff |
| 400 / 422 | Field-level validation messages |
| 401 | Refresh token or redirect to login, preserving the current page |
| 403 | "You don't have access" with a way back |
| 404 | Not-found view for that resource |
| 429 | "Too many requests", retry after delay |
| 5xx | Friendly message, Retry, error ID for support |

4. **Contain the damage** with error boundaries per section, so one failed widget doesn't blank the page.
5. **Report** to Sentry or similar, including request ID.

```js
// apiClient.js
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? "Request failed", body);
  }
  return res.json();
}
```

```jsx
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

function Orders() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api("/api/orders"),
    retry: (count, err) => err.status >= 500 && count < 3, // retry only transient errors
  });

  if (isPending) return <OrdersSkeleton />;
  if (isError) {
    return (
      <div role="alert">
        <p>{error.status === 403 ? "You can't view orders." : "Couldn't load orders."}</p>
        <button onClick={() => refetch()}>Try again</button>
      </div>
    );
  }
  return <OrderTable rows={data} />;
}

export function OrdersSection() {
  return (
    <ErrorBoundary fallback={<p role="alert">This section crashed.</p>}>
      <Orders />
    </ErrorBoundary>
  );
}
```

## How to verify

- Use DevTools network throttling and "Offline" to trigger network errors.
- Mock 401, 403, 422, 500 responses (MSW is great for this) and check each UX path.
- Confirm the rest of the page stays usable when one section fails.
- Check screen readers announce errors (`role="alert"`).
- Confirm errors appear in your monitoring tool with useful context.

## Follow-up questions

- **Why don't error boundaries catch async errors?** They only catch errors during rendering and lifecycle methods. Rethrow into render (TanStack Query's `throwOnError`) or set error state.
- **How do you handle mutation errors?** Show inline or toast messages, roll back optimistic updates in `onError`, keep the user's input.
- **What did React 19 add?** Root options `onCaughtError` and `onUncaughtError` for centralized error reporting.

## Quick recap

- Check `res.ok`; normalize errors in one client.
- Map status codes to specific UX.
- Error boundaries per section, plus inline error states.
- Retry transient errors only.
- Log details, show humans a next step.
