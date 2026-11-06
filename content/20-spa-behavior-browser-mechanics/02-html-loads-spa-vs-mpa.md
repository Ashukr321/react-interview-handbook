---
title: "How many times does the HTML file load in an SPA vs an MPA?"
tags: ["spa", "mpa", "browser", "navigation"]
difficulty: "easy"
---

## Short answer

In an SPA, the HTML document loads once per full page load: the first visit, a manual refresh, or typing a URL. Every in-app navigation after that only fetches JS chunks and JSON data. In an MPA (Multi-Page Application), every navigation requests and loads a new HTML document from the server, so the HTML loads once per page visited.

## Explanation

An MPA is like reading a series of separate printed letters: each page is a new letter delivered by post. An SPA is like a whiteboard: you carry it in once, then erase and redraw parts of it.

### Network view

```text
 MPA: Home -> Products -> Cart
   GET /          -> home.html      (full document, CSS, JS re-evaluated)
   GET /products  -> products.html  (full document again)
   GET /cart      -> cart.html      (full document again)
   => 3 HTML loads

 SPA: Home -> Products -> Cart
   GET /                    -> index.html + main.js + main.css
   click Products: pushState("/products"), GET /api/products (JSON)
   click Cart:     pushState("/cart"),     GET /api/cart     (JSON)
   => 1 HTML load
```

### Comparison

| Aspect | SPA | MPA |
|---|---|---|
| HTML documents loaded | 1 (until refresh or hard navigation) | 1 per navigation |
| What changes on navigation | Part of the DOM, via JS | Whole document is replaced |
| JS state between pages | Preserved in memory | Lost (unless stored) |
| First load | Heavier (app bundle) | Lighter per page |
| Later navigations | Fast, only data | Full round trip, white flash (reduced by browser bfcache and view transitions) |
| SEO by default | Weaker | Strong |

### Edge cases interviewers like

- **Refresh** in an SPA reloads the HTML and restarts the app; in-memory state is lost.
- **A plain anchor or `window.location.href = ...`** inside an SPA causes a full reload, defeating the SPA.
- **Next.js App Router** is a hybrid: the first request returns server-rendered HTML; later `<Link>` navigations fetch an RSC payload, not a new HTML document.
- **Back/forward** in an SPA is handled by `popstate`; in an MPA the browser may restore the page from the back/forward cache.

## Example

```jsx
import { Link } from "react-router";

function Nav() {
  return (
    <nav>
      {/* Client-side: no new HTML document */}
      <Link to="/products">Products</Link>

      {/* Full page load: browser requests a new HTML document */}
      <a href="/products">Products (full reload)</a>
    </nav>
  );
}
```

## Common mistakes

- Saying "an SPA never reloads HTML"; a refresh or external link always does.
- Using plain anchors for internal links in an SPA and losing state.
- Assuming MPAs are outdated; frameworks like Astro and many e-commerce sites deliberately use MPAs for speed and SEO.

## Follow-up questions

- **How can you confirm this?** DevTools Network tab, filter by "Doc": an SPA shows one document request, an MPA shows one per navigation.
- **Can an MPA feel like an SPA?** Yes, with prefetching, Speculation Rules prerendering and cross-document View Transitions.
- **Why does the SPA's first load cost more?** It must download the code for routing and rendering the whole app (or at least its shell) up front.

## Quick recap

- SPA: HTML loads once per full page load; navigation fetches data only.
- MPA: a new HTML document per navigation.
- Refresh or plain anchors reload the SPA document.
- Next.js mixes both: HTML first, RSC payloads afterwards.
