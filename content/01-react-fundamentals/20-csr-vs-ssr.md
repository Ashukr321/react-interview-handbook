---
title: "Explain the difference between client-side and server-side rendering in React"
tags: ["ssr", "csr", "rendering", "nextjs"]
difficulty: "medium"
---

## Short answer

With **client-side rendering (CSR)** the server sends a nearly empty HTML shell plus a JavaScript bundle, and React builds the UI in the browser. With **server-side rendering (SSR)** React renders the components to HTML on the server for each request, so the browser shows content immediately, then React **hydrates** it to make it interactive. SSR improves first paint and SEO; CSR is simpler and cheaper to host.

## Explanation

CSR is flat-pack furniture: you get the parts and assemble at home (the browser). SSR is delivered pre-assembled: usable to look at immediately, then the electrician (hydration) wires up the lights.

```text
 CSR:  request -> empty HTML -> download JS -> run React -> fetch data -> content visible
 SSR:  request -> server fetches data + renders HTML -> content visible
                -> download JS -> hydrate -> interactive
```

| | CSR | SSR |
|---|-----|-----|
| First contentful paint | Slower (waits for JS) | Faster (HTML ready) |
| SEO / link previews | Weaker | Strong |
| Time to interactive | After JS runs | After hydration |
| Server cost | Static hosting / CDN | Needs a Node/edge server |
| Complexity | Lower | Higher (no `window` on server, hydration mismatches) |
| Best for | Dashboards, apps behind login | Marketing, e-commerce, content sites |

### Related strategies

- **SSG** (static site generation): render to HTML at build time. Fastest, but data can be stale.
- **ISR** (incremental static regeneration): static pages re-generated in the background.
- **Streaming SSR**: React 18+ `renderToPipeableStream` sends HTML in chunks as Suspense boundaries resolve.
- **React Server Components**: components that run only on the server and send no JS, combined with Client Components for interactivity (Next.js App Router, React Router v7).

## Example

```jsx
// CSR entry (Vite)
import { createRoot } from "react-dom/client";
import App from "./App";
createRoot(document.getElementById("root")).render(<App />);
```

```jsx
// SSR with Next.js App Router: a Server Component by default
export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await fetch(`https://api.example.com/products/${id}`, {
    cache: "no-store", // render fresh on each request
  }).then((r) => r.json());

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </main>
  );
}
```

```jsx
// Manual SSR + hydration (simplified)
// server.js
import { renderToString } from "react-dom/server";
const html = renderToString(<App />);
// client.js
import { hydrateRoot } from "react-dom/client";
hydrateRoot(document.getElementById("root"), <App />);
```

## Common mistakes

- Accessing `window`, `localStorage` or `document` during render in SSR code.
- Assuming SSR means "faster everything". It can increase server time (TTFB) and still needs JS for interactivity.
- Rendering different content on server and client (dates, random IDs), causing hydration mismatches.
- Using SSR for private dashboards where SEO does not matter.

## Follow-up questions

- **What is hydration?** Attaching React's event handlers and state to server-rendered HTML so it becomes interactive.
- **SSR vs SSG?** SSR renders per request; SSG renders once at build time.
- **How do Server Components differ from SSR?** SSR renders the whole tree to HTML and still ships all component JS; Server Components never ship their code to the client.

## Quick recap

- CSR renders in the browser; SSR renders HTML on the server.
- SSR wins on first paint and SEO, costs server complexity.
- Hydration makes SSR HTML interactive.
- SSG, ISR, streaming and RSC are variations on the trade-off.
