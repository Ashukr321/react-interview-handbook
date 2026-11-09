---
title: "How do you cancel an API request when a component unmounts?"
asked_as: ["Cancel API request when leaving page."]
tags: ["useEffect", "abortcontroller", "data-fetching", "cleanup"]
difficulty: "medium"
---

## Short answer

Create an **`AbortController`** inside the effect, pass its `signal` to `fetch` (or axios), and call `controller.abort()` in the effect's **cleanup**. React runs the cleanup when the component unmounts (for example when the user leaves the page) and before the effect re-runs with new dependencies, so outdated requests are cancelled and their results never overwrite newer data. Ignore the resulting `AbortError`.

## Explanation

It is like cancelling a food delivery when you leave the restaurant: there is no point paying the driver (network, parsing) or receiving food at a table you no longer sit at (state on an unmounted component).

### Why cancel

- **Race conditions**: user switches from product 1 to product 2; if response 1 arrives late it would overwrite product 2's data.
- **Wasted bandwidth and server work** for data nobody will see.
- **Leaks and side effects**: callbacks running after unmount.

```text
mount (id=1)  -> fetch #1 starts
id changes    -> cleanup: abort #1 -> fetch #2 starts
leave page    -> cleanup: abort #2
```

### Options by stack

| Approach | How cancellation works |
|---|---|
| `fetch` | `fetch(url, { signal })`, rejects with `AbortError` |
| axios (v0.22+) | `axios.get(url, { signal })`; check `axios.isCancel(err)` |
| TanStack Query | `queryFn: ({ signal }) => fetch(url, { signal })`; cancelled when the query is unused |
| RTK Query | Handles `signal` internally; `abort()` on lazy query/mutation promises |
| React Router loaders (v6.4+/v7) | `loader({ request })` and `fetch(url, { signal: request.signal })`; aborted on navigation away |
| Next.js App Router | Server Components fetch on the server; client fetching uses one of the above |

If you cannot abort (e.g. a library without signal support), use an `ignore` flag in cleanup so the late result is discarded.

## Example

```jsx
import { useEffect, useState } from "react";

export default function Product({ id }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setError(null);

    async function load() {
      try {
        const res = await fetch(`/api/products/${id}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setProduct(await res.json());
      } catch (err) {
        if (err.name === "AbortError") return; // expected on unmount / id change
        setError(err.message);
      }
    }

    load();
    return () => controller.abort(); // runs on unmount and before the next id
  }, [id]);

  if (error) return <p role="alert">{error}</p>;
  if (!product) return <p>Loading...</p>;
  return <h2>{product.name}</h2>;
}
```

Same idea with a React Router loader:

```jsx
export async function loader({ params, request }) {
  const res = await fetch(`/api/products/${params.id}`, { signal: request.signal });
  return res.json(); // aborted automatically if the user navigates away
}
```

## Common mistakes

- Creating the `AbortController` outside the effect (or in a ref shared across runs), so one abort cancels the wrong request.
- Treating `AbortError` as a real error and showing an error message.
- Making the effect callback itself `async`; it must return a cleanup function, not a promise.
- Using an `isMounted` flag only: it hides the update but does not stop the network request.

## Follow-up questions

- **Does aborting stop the server from processing?** Not necessarily; it closes the connection from the client. The server may finish unless it listens for the disconnect.
- **How do you cancel a debounced search request?** Abort the previous controller each time a new search starts, then clear the debounce timer in cleanup.
- **Why does Strict Mode show a cancelled request in the Network tab?** Dev mount-unmount-mount aborts the first request; that proves your cleanup works.

## Quick recap

- `AbortController` + `signal` + `abort()` in cleanup.
- Cancels on unmount and on dependency change, preventing races.
- Ignore `AbortError`.
- Libraries and routers (TanStack Query, RTK Query, React Router loaders) expose `signal` for you.
