---
title: "What are the strategies to make SPAs SEO-compatible?"
tags: ["seo", "ssr", "ssg", "nextjs", "meta-tags"]
difficulty: "medium"
---

## Short answer

Put real content in the first HTML response: server-side render (Next.js, React Router framework mode) or pre-render at build time (SSG/ISR) for pages that need ranking. Then give every route its own title, description, canonical and Open Graph tags, return correct status codes, use real anchor links, publish a sitemap and robots.txt, add structured data, and keep Core Web Vitals healthy. Pure client rendering plus dynamic meta tags is the weakest option.

## Explanation

### Rendering strategies

| Strategy | How it works | Best for |
|---|---|---|
| SSR | HTML rendered per request on the server, then hydrated | Personalized or frequently changing pages |
| SSG | HTML generated at build time | Blogs, docs, marketing pages |
| ISR / revalidation | Static HTML regenerated after a time or on demand | Large catalogs, product pages |
| Pre-rendering an SPA | Build step crawls routes and saves HTML (e.g. React Router `prerender`, Vite SSG plugins) | Existing SPA with mostly static public pages |
| Dynamic rendering | Serve pre-rendered HTML only to bots | Legacy workaround; Google no longer recommends it |
| CSR + dynamic meta | Update title/meta with JS | Apps where SEO barely matters |

```text
 SSR / SSG response:
   <title>Red Sneakers | Shop</title>
   <meta name="description" ...> <meta property="og:image" ...>
   <h1>Red Sneakers</h1> ... full content ...
   <script> (hydrates later)
 => crawlers and link previews see everything immediately
```

### On-page and technical checklist

- Unique `title`, `meta description` and `link rel="canonical"` per route.
- Open Graph and Twitter card tags for link previews.
- Real anchors with `href` for all internal links.
- Correct status codes: `404` for missing pages, `301` for moved ones (needs server rendering or edge rules).
- `sitemap.xml`, `robots.txt` that does not block JS/CSS.
- Structured data (JSON-LD) for products, articles, FAQs.
- Fast LCP, low CLS and good INP.

## Example

Next.js App Router: server-rendered page with per-route metadata and a real 404.

```tsx
// app/products/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

async function getProduct(slug: string) {
  const res = await fetch(`https://api.example.com/products/${slug}`, { next: { revalidate: 3600 } });
  return res.ok ? res.json() : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} | Shop`,
    description: product.summary,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { images: [product.image] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound(); // real 404 status
  return <h1>{product.name}</h1>;
}
```

In a plain React 19 SPA you can render metadata inside components; React hoists it into the head (useful for browsers and Google's renderer, but not for non-JS bots):

```jsx
function ProductPage({ product }) {
  return (
    <>
      <title>{`${product.name} | Shop`}</title>
      <meta name="description" content={product.summary} />
      <h1>{product.name}</h1>
    </>
  );
}
```

## Common mistakes

- Relying on client-side meta tags for social previews; those bots read only the initial HTML.
- SSR with a huge hydration bundle, fixing SEO but hurting INP.
- Duplicate content without canonical URLs (filters, tracking params).
- Forgetting to update the sitemap when routes are generated dynamically.

## Follow-up questions

- **SSR or SSG?** SSG (or ISR) when content is the same for everyone and changes rarely; SSR when it is per-request or changes constantly.
- **Do Server Components help SEO?** Yes: content is rendered on the server and less JS is shipped, which helps both indexing and performance.
- **What about react-helmet?** `react-helmet-async` was the classic SPA solution; React 19 native metadata and framework metadata APIs replace it.

## Quick recap

- Send real HTML first: SSR, SSG/ISR or build-time pre-rendering.
- Unique title, description, canonical and OG tags per route.
- Real links, correct status codes, sitemap, robots.txt, JSON-LD.
- Performance (Core Web Vitals) is part of SEO.
