---
title: "Why are SPAs less SEO-friendly by default?"
tags: ["seo", "spa", "csr", "crawlers"]
difficulty: "easy"
---

## Short answer

Because a client-rendered SPA sends an almost empty HTML document; the real content, title and meta tags appear only after JavaScript runs. Googlebot can render JS but does it later in a separate, budgeted pass, and many other crawlers and link-preview bots (social networks, chat apps, some search engines) do not run JS at all. On top of that, SPAs often share one title for all routes, return `200` for missing pages and have slower LCP, all of which hurt ranking.

## Explanation

Imagine a shop window that is empty until a staff member arrives to arrange the goods. A busy passer-by (crawler) may look, see nothing, and move on.

### What a crawler receives from a pure SPA

```html
<!doctype html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-a1b2.js"></script>
  </body>
</html>
```

### The specific problems

| Problem | Why it hurts |
|---|---|
| Empty initial HTML | Crawlers that do not execute JS index nothing |
| Delayed rendering | Google queues pages for rendering; indexing is slower and can miss content behind data fetches |
| Same `title`/meta for every route | Pages look like duplicates; poor search snippets |
| No Open Graph tags in HTML | Link previews on social and chat apps show nothing useful |
| Soft 404s | Unknown routes return `200` with a "Not found" component |
| Links as `onClick` handlers | Crawlers follow `href`, not click handlers, so pages are not discovered |
| Slow LCP / heavy JS | Core Web Vitals are a ranking signal |
| Content behind interactions | Tabs or infinite scroll loaded only on user action may never be seen |

```text
 Classic site:  crawl HTML -> index content immediately
 SPA:           crawl HTML (empty) -> queue for render -> run JS -> fetch data -> index (maybe)
```

## Example

Patterns that make an SPA worse for SEO:

```jsx
import { useNavigate } from "react-router";

function ProductCard({ product }) {
  const navigate = useNavigate();
  // Bad: no href, crawlers cannot discover /products/:id
  return <div onClick={() => navigate(`/products/${product.id}`)}>{product.name}</div>;
}

function NotFound() {
  // Bad in a pure SPA: the server already returned 200 for this URL
  return <h1>Page not found</h1>;
}
```

## Common mistakes

- Claiming "Google cannot index SPAs at all"; it can, but slower and less reliably, and other crawlers often cannot.
- Forgetting that social previews are a separate problem from search ranking.
- Updating the title only in `useEffect` and assuming every crawler sees it.
- Ignoring performance, which affects ranking regardless of rendering approach.

## Follow-up questions

- **Does it matter for every app?** No. Dashboards and apps behind login do not need SEO; marketing pages, blogs and product pages do.
- **How do you check what Google sees?** URL Inspection in Google Search Console shows the rendered HTML and screenshot.
- **Does `robots.txt` blocking JS files matter?** Yes; if bundles are blocked, Google cannot render the content at all.

## Quick recap

- Initial HTML is empty; content needs JS.
- Rendering by crawlers is delayed or absent.
- Shared titles, missing OG tags and soft 404s add problems.
- Real `href` links and good Core Web Vitals still matter.
