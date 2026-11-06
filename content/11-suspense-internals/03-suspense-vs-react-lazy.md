---
title: "How is Suspense different from React.lazy()?"
tags: ["suspense", "react-lazy", "code-splitting", "comparison"]
difficulty: "easy"
---

## Short answer

They are two halves of one feature. `React.lazy()` creates a component whose code is loaded on demand with a dynamic `import()`; it is something that **suspends**. `Suspense` is the boundary that **catches** that suspension and shows a fallback. `lazy` without a `Suspense` above it has nowhere to show a loading state, while `Suspense` also works for many other things besides `lazy`, like data read with `use`.

## Explanation

Analogy: `lazy` is a delivery that might be late; `Suspense` is the person at the door saying "it's on its way" until it arrives.

| Aspect | `React.lazy()` | `<Suspense>` |
|---|---|---|
| Type | Function that returns a component | Built-in component |
| Role | Producer of a suspension | Consumer / boundary for suspensions |
| Purpose | Code splitting | Declaring loading UI for a region |
| Input | `() => import("./X")` returning a module with a default export | `fallback` + children |
| Works alone? | No, needs a Suspense ancestor | Yes, but useless if nothing suspends |
| Other sources | Only code | Code, `use(promise)`, Server Components, Suspense-enabled libraries |

### How lazy works

```text
first render of <LazyChart/>
   -> status "uninitialized": call import(), get promise -> suspend (throw)
   -> nearest Suspense shows fallback
module loads -> status "resolved" -> retry render
   -> renders module.default
later renders -> already resolved, renders immediately
```

The loader runs only once; the result is cached on the lazy object. That's why `lazy()` must be called at module top level, not inside a component.

## Example

```jsx
import { Suspense, lazy, useState } from "react";

// Top level: created once
const SettingsPanel = lazy(() => import("./SettingsPanel"));
// Named export: map it to default
const Editor = lazy(() =>
  import("./Editor").then((m) => ({ default: m.Editor }))
);

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open settings</button>
      <Suspense fallback={<p>Loading...</p>}>
        {open && <SettingsPanel />}
        <Editor />
      </Suspense>
    </>
  );
}
```

## Common mistakes

- Declaring `lazy()` inside a component; every render creates a new lazy type, remounting and refetching.
- Lazy-loading a named export directly; `lazy` expects a default export.
- No error boundary; a failed chunk load (e.g. after a deployment) crashes the tree.
- Lazy-loading tiny, always-needed components, adding a network round trip for no benefit.

## Follow-up questions

- **How do you preload a lazy component?** Call the same `import("./X")` early (e.g. on hover); the browser and bundler cache the module so `lazy` resolves instantly.
- **Does `React.lazy` work with SSR?** Yes, with React 18+ streaming renderers (`renderToPipeableStream`); the old `renderToString` doesn't support suspending.
- **How do frameworks do it?** Next.js offers `next/dynamic` and splits by route automatically; React Router supports a route-level `lazy` property.

## Quick recap

- `lazy` = suspending component for code splitting.
- `Suspense` = boundary that shows fallback.
- `lazy` needs a Suspense ancestor; Suspense handles more than `lazy`.
- Declare `lazy` at top level with a default export.
- Add an error boundary for failed chunk loads.
