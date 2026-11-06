---
title: "How do you optimize assets? What is image compression? WebP vs PNG vs JPG"
tags: ["performance", "images", "assets", "core-web-vitals"]
difficulty: "medium"
---

## Short answer

Optimizing assets means sending fewer, smaller and better-timed bytes: compress and resize images into modern formats, split and minify JS, purge and inline critical CSS, subset fonts, serve with Brotli over a CDN, and cache hashed files long-term. Image compression reduces file size either losslessly (no quality change) or lossily (discarding detail the eye barely notices). JPG is lossy for photos, PNG is lossless with transparency for graphics, and WebP (or AVIF) does both jobs at roughly 25-35% smaller sizes.

## Explanation

### Image formats

| Format | Compression | Transparency | Animation | Best for |
|---|---|---|---|---|
| JPG / JPEG | Lossy | No | No | Photos, universal fallback |
| PNG | Lossless | Yes | No (APNG aside) | Logos, screenshots, UI with sharp edges |
| WebP | Lossy and lossless | Yes | Yes | Default for web photos and graphics |
| AVIF | Lossy and lossless | Yes | Yes | Smallest files, slower to encode |
| SVG | Vector (text) | Yes | Via CSS | Icons, logos, illustrations |

Lossy compression is like summarizing a book: smaller, mostly the same story. Lossless is like zipping it: every word is still there.

### Image checklist

- Right size: never send a 4000px image into a 400px box; use `srcset` and `sizes`.
- Right format: AVIF/WebP with JPG fallback via `<picture>`, or an image CDN that negotiates format.
- Quality around 70-80 for lossy photos is usually indistinguishable.
- Set `width` and `height` (or `aspect-ratio`) to prevent layout shift (CLS).
- `loading="lazy"` for below-the-fold images; `fetchpriority="high"` and no lazy loading for the LCP image.

### Other assets

| Asset | Optimizations |
|---|---|
| JavaScript | Code splitting per route, tree shaking, minification, remove unused deps, defer third-party scripts |
| CSS | Remove unused CSS (Tailwind JIT), inline critical CSS, minify |
| Fonts | WOFF2, subset to used characters, `font-display: swap`, preload the main font, fewer weights |
| Transfer | Brotli/gzip, HTTP/2 or HTTP/3, CDN close to users |
| Caching | `[contenthash]` file names with `max-age=31536000, immutable` |

## Example

```jsx
export function Hero() {
  return (
    <picture>
      <source type="image/avif" srcSet="/hero-800.avif 800w, /hero-1600.avif 1600w" sizes="100vw" />
      <source type="image/webp" srcSet="/hero-800.webp 800w, /hero-1600.webp 1600w" sizes="100vw" />
      <img
        src="/hero-1600.jpg"
        alt="Team working together"
        width={1600}
        height={900}
        fetchPriority="high"
        decoding="async"
      />
    </picture>
  );
}

// In Next.js, next/image handles resizing, format negotiation and lazy loading:
// <Image src="/hero.jpg" alt="..." width={1600} height={900} priority />
```

## Common mistakes

- Lazy loading the LCP image, which delays the most important paint.
- Saving photos as PNG, producing files several times larger than JPG/WebP.
- Compressing JPGs repeatedly; each lossy save loses more quality.
- Forgetting dimensions, causing content to jump when images load.

## Follow-up questions

- **How do you automate this?** An image CDN (Cloudinary, imgix, Vercel/Next.js image optimization) or build plugins (sharp, vite-imagetools).
- **When is PNG still right?** Pixel-perfect screenshots, small UI graphics or when an editing pipeline needs lossless files; for the web, lossless WebP is usually smaller.
- **Which metrics do asset optimizations affect?** Mostly LCP (images, fonts, CSS), CLS (dimensions, font swaps) and INP (less JS on the main thread).

## Quick recap

- Fewer, smaller, later bytes: resize, compress, split, cache.
- JPG for lossy photos, PNG for lossless graphics, WebP/AVIF smaller for both.
- Use `srcset`, `<picture>`, dimensions and lazy loading correctly.
- Optimize JS, CSS and fonts too, and serve with Brotli over a CDN.
