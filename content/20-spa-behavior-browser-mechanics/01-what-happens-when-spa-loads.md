---
title: "What happens behind the scenes when a Single Page Application loads?"
tags: ["spa", "browser", "lifecycle", "hydration"]
difficulty: "medium"
---

## Short answer

The browser requests the URL and gets a small HTML shell with an empty root element and script/style tags. It downloads and parses the CSS and JS bundles, the JS runs `createRoot(...).render(<App />)`, the router reads the current URL, components render and fetch data, and React commits the DOM. From then on, navigation is handled in JavaScript with the History API; the HTML document is never requested again until a hard refresh.

## Explanation

Think of an SPA as a theatre: the building (HTML shell) is opened once, and after that only the scenery (components) changes between acts.

```text
 1. User opens https://app.com/orders/42
        |
 2. DNS -> TCP -> TLS -> GET /orders/42
        |   (server or CDN returns index.html for every app route)
        v
 3. index.html: <div id="root"></div> + <link css> + <script type="module" src=main.js>
        |
 4. Parse HTML, download CSS (render-blocking) and JS (deferred) in parallel
        |
 5. JS executes: createRoot(root).render(<App />)
        |
 6. Router reads location.pathname = /orders/42 -> matches <OrderPage>
        |
 7. Render phase: components return JSX -> React builds the fiber tree
        |
 8. Commit phase: React creates DOM nodes, browser paints
        |
 9. Effects / loaders fetch data -> state updates -> re-render with real data
        |
10. App is interactive. Link clicks -> history.pushState -> re-render, no new HTML
```

### Key points

- **Server fallback**: every route must return `index.html` (history API fallback); otherwise deep links 404.
- **Blank time**: steps 2-8 show nothing useful in pure client-side rendering, which is why SPAs show skeletons or use SSR.
- **Lazy chunks**: routes split with `React.lazy` download only when first visited.
- **With SSR/SSG** (Next.js, React Router framework mode) step 3 already contains the HTML for the page, and step 5 becomes `hydrateRoot`, which attaches event handlers to existing markup instead of creating it.

## Example

```jsx
// main.jsx: the entry point the bundle executes
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App";
import OrderPage from "./OrderPage";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/orders/:id" element={<OrderPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

## Common mistakes

- Saying the server renders the page in a classic SPA; it only serves static files and API data.
- Forgetting the server rewrite to `index.html`, so refreshing `/orders/42` returns 404.
- Assuming the app is interactive at first paint; with SSR, it becomes interactive only after hydration.
- Fetching data only after all JS loads, creating a waterfall (HTML -> JS -> data).

## Follow-up questions

- **How can you shorten this waterfall?** Code splitting, preloading critical chunks, starting data fetches in route loaders instead of effects, or SSR.
- **What does the browser cache on the second visit?** Hashed JS/CSS from the HTTP cache (or a service worker), so only the small HTML is revalidated.
- **What is hydration?** React reusing server-rendered HTML and attaching listeners and state to it, instead of building the DOM from scratch.

## Quick recap

- Browser loads one HTML shell, then CSS and JS bundles.
- JS mounts React into the root; router renders the component for the URL.
- Data loads, React re-renders and the app becomes interactive.
- Later navigation uses the History API, not new HTML documents.
