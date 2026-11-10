---
title: "How does React 19 handle document metadata, stylesheets and resource preloading?"
tags: ["react-19", "metadata", "seo", "stylesheets", "preload", "react-dom"]
difficulty: "medium"
asked_as: ["Do you still need react-helmet in React 19?", "What does the precedence prop on a stylesheet do?", "What are preload and preinit?"]
---

## Short answer

In React 19 you can render `<title>`, `<meta>` and `<link>` **anywhere in your components**, and React **hoists them into `<head>`**, both on the client and during SSR, so libraries like `react-helmet` are mostly unnecessary. Stylesheets with a **`precedence`** prop are inserted in the right order, **de-duplicated**, and React **waits for them to load** before showing the content that needs them. `<script async>` tags are de-duplicated too. New functions in `react-dom` (`preload`, `preinit`, `preconnect`, `prefetchDNS` and the module versions) tell the browser about resources early.

## Explanation

### Metadata

The component that knows the page title (say, a blog post) can render it directly. React moves it into `<head>`.

### Stylesheets

| Without `precedence` | With `precedence="default"` (or `"high"`, etc.) |
| --- | --- |
| Rendered where you put it, no ordering, can flash unstyled content | Hoisted to `<head>`, ordered by precedence, loaded once even if many components render it |
| No coordination with Suspense | Content that depends on it is not revealed until it has loaded |

### Resource preloading APIs (`react-dom`)

| Function | What it tells the browser |
| --- | --- |
| `prefetchDNS(href)` | Look up the DNS for this host |
| `preconnect(href)` | Open a connection to this host now |
| `preload(href, { as })` | Download this font, image, style or script soon |
| `preloadModule(href)` | Download this ES module soon |
| `preinit(href, { as })` | Download *and run* this script or stylesheet |
| `preinitModule(href)` | Download and run this ES module |

During SSR these become `<link>` tags in the HTML head, so the browser starts downloading before any JavaScript runs.

## Example

```jsx
import { preload, preconnect } from "react-dom";

export default function BlogPost({ post }) {
  preconnect("https://cdn.example.com");
  preload("https://cdn.example.com/fonts/inter.woff2", { as: "font", type: "font/woff2" });

  return (
    <article>
      {/* hoisted into <head> */}
      <title>{`${post.title} | My Blog`}</title>
      <meta name="description" content={post.summary} />
      <link rel="canonical" href={`https://example.com/blog/${post.slug}`} />

      {/* hoisted, de-duplicated, and blocks reveal until loaded */}
      <link rel="stylesheet" href="/styles/prose.css" precedence="default" />

      {/* rendered once even if many components include it */}
      <script async src="https://widgets.example.com/embed.js" />

      <h1>{post.title}</h1>
      <div>{post.body}</div>
    </article>
  );
}
```

## Common mistakes

- Expecting full SEO tooling. React hoists tags but doesn't merge or override duplicates across nested routes. Frameworks like Next.js still provide a metadata API for that.
- Forgetting `precedence` on a stylesheet and then wondering why it wasn't hoisted or de-duplicated.
- Rendering several `<title>` tags at once. Only render one per page.
- Calling `preload` for everything. Preloading too much competes with critical resources and can slow the page down.

## Follow-up questions

- **Does this work with streaming SSR?** Yes. Hoisted tags and preloads are sent early in the stream.
- **Is `react-helmet` dead?** For simple apps, yes. Frameworks with metadata APIs are still better for complex, per-route SEO rules.
- **Where can you call `preload`?** In render or event handlers. React de-duplicates repeated calls.

## Quick recap

- `<title>`, `<meta>` and `<link>` can be rendered anywhere and are hoisted to `<head>`.
- Stylesheets with `precedence` are ordered, de-duplicated and coordinated with Suspense.
- `async` scripts are de-duplicated.
- `preload`, `preinit`, `preconnect` and `prefetchDNS` start downloads early.
