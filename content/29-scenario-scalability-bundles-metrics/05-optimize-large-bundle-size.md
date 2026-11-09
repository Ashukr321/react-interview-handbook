---
title: "How do you optimize large bundle size in a React application?"
asked_as: ["How do you reduce bundle size in a frontend application?"]
tags: ["bundle-size", "code-splitting", "tree-shaking", "build"]
difficulty: "medium"
---

## Short answer

I first analyze the bundle with a visualizer to see which modules are big and why they are included. Then I split code by route and lazy-load heavy features, replace or trim large dependencies (import only what I use, choose lighter libraries, rely on native APIs), make sure tree shaking works (ES modules, `sideEffects`), and serve minified, Brotli-compressed, long-cached chunks. A size budget in CI stops it from growing back.

## Why it happens

- **One big entry chunk**: every route and feature bundled together.
- **Heavy libraries**: `moment` with all locales, full `lodash`, chart/editor/PDF libraries on every page.
- **Imports that defeat tree shaking**: `import _ from "lodash"`, CommonJS packages, barrel files with side effects.
- **Duplicate dependencies**: two versions of the same library pulled in transitively.
- **Polyfills for old browsers** sent to everyone.
- **Large assets inlined** into JS (base64 images, JSON data).

## How to fix it

### 1. Analyze

```bash
# Vite
npx vite-bundle-visualizer
# Next.js
ANALYZE=true npm run build   # with @next/bundle-analyzer
# Any bundle with source maps
npx source-map-explorer dist/assets/*.js
```

Look at the largest boxes and ask "is this needed on first load?"

### 2. Split code

```jsx
import { lazy } from "react";
const AdminPage = lazy(() => import("./pages/AdminPage"));
const RichEditor = lazy(() => import("./components/RichEditor"));
```

Load rarely used libraries on demand:

```js
async function exportPdf(data) {
  const { jsPDF } = await import("jspdf"); // only when the user clicks Export
  const doc = new jsPDF();
  doc.text(JSON.stringify(data), 10, 10);
  doc.save("report.pdf");
}
```

### 3. Trim dependencies

| Instead of | Use |
| --- | --- |
| `import _ from "lodash"` | `import debounce from "lodash-es/debounce"` or native code |
| `moment` | `date-fns`, `dayjs`, or `Intl.DateTimeFormat` |
| Full icon packs | Per-icon imports |
| `axios` for simple calls | `fetch` |

Check cost before installing (bundlephobia, pkg-size) and dedupe versions (`npm ls`, `npm dedupe`).

### 4. Enable tree shaking

Use ES module builds, mark packages side-effect free with `"sideEffects": false` (list CSS files if any), and avoid barrel files that re-export everything in large internal libraries.

### 5. Ship it efficiently

- Production mode, minification, Brotli/gzip.
- Modern browser targets (Browserslist) so less transpiling and fewer polyfills.
- Hashed filenames with long-lived cache; vendor chunks that change rarely.
- In Next.js App Router, keep components as Server Components where possible: their code is not sent to the client.

> **💡 Interview tip:** Mention both total size and initial-route size. Users mostly feel the JavaScript needed for the first page.

## How to verify

- Bundle visualizer shows smaller initial chunk; compare compressed (gzip/Brotli) sizes.
- Lighthouse "Reduce unused JavaScript" warning shrinks; TBT and LCP improve.
- `size-limit` or bundle budget check fails PRs that add too much.

## Follow-up questions

- **Why are barrel files a problem?** `index.ts` re-exports can force the bundler to include or evaluate modules you do not use, especially if any have side effects.
- **What is the cost of JS vs images of the same size?** JS also has to be parsed, compiled and executed, so it costs more CPU.
- **How do Server Components reduce bundle size?** Their code runs on the server and only the rendered output is sent to the browser.

## Quick recap

- Analyze before optimizing.
- Split by route and lazy-load heavy features and libraries.
- Replace heavy dependencies and make tree shaking work.
- Compress, cache, target modern browsers, and enforce budgets.
