---
title: "How would you implement code splitting in a React application?"
tags: ["performance", "code-splitting", "lazy", "suspense"]
difficulty: "medium"
---

## Short answer

Code splitting breaks the JavaScript bundle into smaller chunks that load on demand. In React you use dynamic `import()` with `React.lazy` and wrap the lazy component in `<Suspense>` to show a fallback while it loads. The highest-impact place is **route-level** splitting, followed by heavy components (charts, editors, modals) and large libraries. Frameworks like Next.js split per route automatically.

## Explanation

It is like a streaming service: instead of downloading the whole season before you watch, you get episode one now and the rest as you need it.

### Where to split

| Level | Example | Benefit |
|-------|---------|---------|
| Route | `/dashboard`, `/settings` | Biggest win, users load only the page they visit |
| Component | Rich text editor, chart, map, modal | Defer heavy UI until shown |
| Library | `import("xlsx")` inside an export handler | Load only when a feature is used |

### How it works

```text
 Initial load: main.js (app shell)
 User navigates to /reports
   -> import("./Reports") triggers network request for reports.[hash].js
   -> Suspense shows fallback
   -> chunk arrives, component renders
```

Bundlers (Vite/Rollup, webpack) see `import()` and emit a separate chunk automatically.

### Improving the experience

- **Preload** on hover or when the route is likely: call the import function early.
- Use **React Router v6.4+/v7** `lazy` route property so code and data load in parallel.
- Wrap lazy areas in an **error boundary** to handle chunk load failures (e.g. after a deploy).
- Use `startTransition` for navigation so the old UI stays visible instead of flashing a fallback.

## Example

```jsx
import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router";

// Route-level splitting
const Home = lazy(() => import("./pages/Home"));
const Reports = lazy(() => import("./pages/Reports"));

// Component-level splitting
const ChartModal = lazy(() => import("./components/ChartModal"));

function Dashboard() {
  const [open, setOpen] = useState(false);
  const preload = () => import("./components/ChartModal"); // warm the cache

  return (
    <>
      <button onMouseEnter={preload} onClick={() => setOpen(true)}>Show chart</button>
      {open && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <ChartModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p>Loading page...</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

Library-level split inside a handler:

```js
async function exportToExcel(rows) {
  const XLSX = await import("xlsx");
  // use XLSX only when the user clicks export
}
```

## Common mistakes

- Declaring `lazy()` inside a component, which creates a new component type every render and resets state.
- `React.lazy` requires a **default export**; for named exports use `import("./X").then(m => ({ default: m.X }))`.
- Splitting tiny components, creating many network requests with no real gain.
- No error boundary, so a failed chunk download crashes the app.

## Follow-up questions

- **How do you measure the benefit?** Bundle analyser (`rollup-plugin-visualizer`), Lighthouse, and Core Web Vitals such as LCP and INP.
- **How does Next.js handle it?** Automatic per-route splitting; `next/dynamic` for component-level splitting; Server Components ship no client JS at all.
- **Does `React.lazy` work with SSR?** Yes, in React 18+ with streaming SSR and Suspense.

## Quick recap

- `import()` + `React.lazy` + `<Suspense>`.
- Split by route first, then heavy components and libraries.
- Preload likely chunks; add error boundaries.
- Define lazy components at module level.
