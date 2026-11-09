---
title: "What is srcset in HTML?"
tags: ["html", "images", "responsive", "performance"]
difficulty: "easy"
---

## Short answer

`srcset` is an `<img>` (and `<source>`) attribute that lists several versions of the same image at different widths or pixel densities, so the browser can download the most appropriate one for the device's screen size and resolution. Combined with the `sizes` attribute, which tells the browser how wide the image will be displayed, it avoids sending a 2000px image to a 375px phone. It is the main tool for responsive images.

## Explanation

It is like a clothing store offering S, M, L and XL. You tell the store your measurements (`sizes`), and the store hands you the right size (`srcset` choice) instead of everyone getting XL.

### Two forms

| Form | Syntax | Use when |
|---|---|---|
| Width descriptors | `srcset="a-400.jpg 400w, a-800.jpg 800w"` + `sizes` | Image width changes with the layout (most cases) |
| Density descriptors | `srcset="logo.png 1x, logo@2x.png 2x"` | Fixed-size image, such as a logo or icon |

### How the browser chooses (width descriptors)

1. Read `sizes` to find the display width, e.g. `100vw` on mobile, `50vw` on desktop.
2. Multiply by the device pixel ratio (a 375px-wide slot on a 2x screen needs ~750px).
3. Pick the smallest candidate that is large enough (browsers may also consider cached files or data saver).

Without `sizes`, the browser assumes `100vw`, which often downloads images that are too large.

### `srcset` vs `<picture>`

- `srcset` = same image, different resolutions; the **browser** decides.
- `<picture>` with `<source media>` = **art direction** (a different crop on mobile) or **format fallback** (AVIF → WebP → JPEG); **you** decide.

### Performance pairing

- `width` and `height` attributes prevent layout shift (CLS).
- `loading="lazy"` for below-the-fold images; `fetchpriority="high"` for the LCP hero image.
- Next.js `<Image>` generates `srcset` and `sizes` automatically.

## Example

```jsx
export function ProductImage({ name }) {
  return (
    <img
      src={`/img/${name}-800.jpg`} // fallback for old browsers
      srcSet={`/img/${name}-400.jpg 400w, /img/${name}-800.jpg 800w, /img/${name}-1600.jpg 1600w`}
      sizes="(max-width: 768px) 100vw, 50vw"
      width={800}
      height={600}
      alt={name}
      loading="lazy"
      decoding="async"
    />
  );
}
```

Art direction and modern formats with `<picture>`:

```html
<picture>
  <source media="(max-width: 600px)" srcset="/hero-mobile.avif" type="image/avif" />
  <source srcset="/hero-desktop.avif" type="image/avif" />
  <source srcset="/hero-desktop.webp" type="image/webp" />
  <img src="/hero-desktop.jpg" alt="Summer collection" width="1600" height="700" fetchpriority="high" />
</picture>
```

## Common mistakes

- Using `srcset` with `w` descriptors but no `sizes`, so the browser assumes full viewport width.
- Writing `srcset` instead of `srcSet` in JSX (React warns about the wrong casing).
- Expecting the browser to switch to a smaller file when the window shrinks; once it has a larger image cached, it may keep using it.
- Lazy-loading the hero image, which hurts LCP.

## Follow-up questions

- **How does `next/image` help?** It generates multiple sizes on demand, serves modern formats, sets `srcset`/`sizes`, and reserves space to prevent layout shift.
- **Can CSS backgrounds be responsive?** Yes, with media queries or `image-set()`.
- **What does `decoding="async"` do?** It hints that the image can be decoded off the main thread without delaying other content.

## Quick recap

- `srcset` offers multiple image resolutions; the browser picks one.
- Use `w` descriptors with `sizes`, or `x` descriptors for fixed sizes.
- `<picture>` is for art direction and format fallback.
- Add dimensions, lazy loading and priority hints.
