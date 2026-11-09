---
title: "Difference between SSR and CSR?"
tags: ["ssr", "csr", "rendering", "nextjs"]
difficulty: "medium"
---

## Short answer

In Client-Side Rendering (CSR), the server sends a nearly empty HTML shell plus a JS bundle, and the browser builds the UI by running React. In Server-Side Rendering (SSR), the server runs React per request and sends fully formed HTML, so users see content sooner and crawlers get real markup; the browser then hydrates it to make it interactive. CSR is simpler and cheaper to host; SSR gives faster first content and better SEO at the cost of server work and hydration.

## Explanation

CSR is like flat-pack furniture: you get a box of parts (JS) and assemble it at home. SSR is like furniture delivered assembled: you can use it right away, but the delivery takes more effort from the store, and someone still has to plug in the lamp (hydration) before it works.

### Comparison

| | CSR (Vite SPA) | SSR (Next.js, React Router framework mode) |
|---|---|---|
| Initial HTML | `<div id="root"></div>` | Full content |
| First Contentful Paint | Slower (wait for JS) | Faster |
| Time to Interactive | Same moment content appears | After hydration |
| SEO / link previews | Weaker; crawlers must run JS | Strong |
| Server cost | Static hosting / CDN | Server or edge compute per request |
| Data fetching | In the browser after load | On the server, close to the database |
| Complexity | Low | Higher (server vs client code, hydration mismatches) |
| Best for | Dashboards, apps behind login | Marketing, e-commerce, content, public pages |

### Flow

```text
CSR:  request → empty HTML → download JS → run React → fetch data → render content
SSR:  request → server fetches data + renders HTML → browser shows content
                → download JS → hydrate → interactive
```

### Related strategies

- **SSG** (static generation): HTML rendered at build time, served from a CDN.
- **ISR**: static pages regenerated in the background after a time or on demand.
- **Streaming SSR**: send HTML in chunks as `Suspense` boundaries resolve (`renderToPipeableStream`).
- **React Server Components**: components that run only on the server and ship no JS; the default in the Next.js App Router.

## Example

CSR entry point:

```jsx
// main.jsx (Vite)
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")).render(<App />);
```

SSR with Next.js App Router (a Server Component):

```tsx
// app/products/page.tsx: runs on the server, HTML arrives with data
export default async function ProductsPage() {
  const res = await fetch("https://api.example.com/products", { next: { revalidate: 60 } });
  const products: { id: string; name: string }[] = await res.json();

  return (
    <ul>
      {products.map((p) => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

## Common mistakes

- Saying SSR makes the page interactive sooner; it shows content sooner, but interactivity still waits for JS and hydration.
- Accessing `window` or `localStorage` during server render, which crashes or causes hydration mismatches.
- Using SSR for a logged-in dashboard where SEO does not matter, paying server cost for little benefit.
- Forgetting that SSR increases TTFB if the server waits on slow data (use streaming and `Suspense`).

## Follow-up questions

- **What is hydration?** React attaching event handlers and state to server-rendered HTML instead of recreating it.
- **Can you mix SSR and CSR?** Yes. Next.js lets each route be static, dynamic or client-heavy, and `"use client"` marks interactive parts.
- **Does Google index CSR pages?** Usually yes, with a delayed rendering pass, but other crawlers and link previews often do not run JS.

## Quick recap

- CSR: browser renders from JS; simple, slower first paint.
- SSR: server sends HTML; faster content, better SEO, needs hydration.
- SSG, ISR, streaming and RSC are variations on the trade-off.
- Pick per route based on SEO, data freshness and cost.
