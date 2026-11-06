---
title: "How does hydration work?"
tags: ["hydration", "ssr", "react-dom", "internals"]
difficulty: "hard"
---

## Short answer

Hydration is the process of attaching React to HTML that was already rendered on the server. The server sends HTML so the user sees content fast; on the client, `hydrateRoot` renders the same component tree, **reuses the existing DOM nodes instead of creating new ones**, attaches event listeners and runs effects. If the client render doesn't match the server HTML, React reports a hydration mismatch and patches up (or re-renders) the affected part on the client.

## Explanation

Analogy: the server delivers a fully furnished room (HTML). Hydration is the electrician arriving to wire up the switches. The furniture stays in place; it just becomes functional.

### Step by step

```text
Server: renderToPipeableStream(<App />) -> HTML (+ serialized data)
                         |
Browser: paints HTML (visible, not interactive)
                         |
Browser: downloads JS bundle
                         |
hydrateRoot(container, <App />)
   -> render components on client
   -> walk existing DOM in parallel, claim matching nodes
   -> attach event listeners (delegated at the root container)
   -> commit: run layout effects, then effects
                         |
Page is interactive
```

### React 18+ improvements

- **Selective hydration**: content inside `Suspense` boundaries hydrates independently. A slow comments section doesn't block hydrating the header.
- **Prioritized by interaction**: if the user clicks inside a not-yet-hydrated boundary, React hydrates that boundary first and replays the event.
- **Streaming**: HTML for suspended parts arrives later in the same response; hydration can start before all HTML arrives.
- **React 19**: clearer mismatch errors showing a diff, and tolerance for extra tags injected into `head`/`body` by browser extensions or third-party scripts.

### Common mismatch causes

| Cause | Fix |
|---|---|
| `Date.now()`, `Math.random()` in render | Compute in an effect, or pass from server |
| `typeof window !== "undefined"` branches | Render the same markup, switch in `useEffect` |
| Locale / timezone formatting differences | Format on the server and pass the string, or use a fixed locale |
| Invalid HTML nesting (`div` inside `p`) | Fix markup; the browser rewrites it before React sees it |
| Generated IDs | Use `useId` |

## Example

```jsx
// entry.client.jsx
import { hydrateRoot } from "react-dom/client";
import App from "./App";

hydrateRoot(document.getElementById("root"), <App />, {
  onRecoverableError(error) {
    console.warn("Hydration recovered:", error);
  },
});
```

```jsx
import { useEffect, useState, useId } from "react";

function LocalTime({ iso }) {
  const [text, setText] = useState(iso); // same on server and first client render
  const id = useId(); // stable across server and client

  useEffect(() => {
    setText(new Date(iso).toLocaleTimeString()); // client-only value after hydration
  }, [iso]);

  return <time id={id} dateTime={iso}>{text}</time>;
}
```

## Common mistakes

- Using `createRoot` on server-rendered HTML. It throws the HTML away and re-renders from scratch.
- Rendering browser-only values during the first render.
- Silencing all mismatches with `suppressHydrationWarning`. It only works one level deep, on text content and attributes, and is meant for unavoidable cases like timestamps.
- Assuming hydrated means fast. Large bundles still delay interactivity; split code and use Server Components.

## Follow-up questions

- **What is partial hydration vs selective hydration?** Selective hydration (React) still hydrates everything, just in prioritized chunks. With React Server Components, server-only components ship no JS and are never hydrated.
- **What happens on a mismatch in React 18+?** React throws away the server HTML for the nearest Suspense boundary (or root) and client-renders it, reporting via `onRecoverableError`.
- **Why are events "replayed"?** Clicks on not-yet-hydrated content are captured and dispatched once that part hydrates, so the click isn't lost.

## Quick recap

- Hydration attaches React to server HTML by reusing DOM nodes.
- Use `hydrateRoot`, not `createRoot`.
- Client's first render must match server output.
- Suspense enables selective, interaction-prioritized hydration.
- React 19 gives better mismatch diffs.
