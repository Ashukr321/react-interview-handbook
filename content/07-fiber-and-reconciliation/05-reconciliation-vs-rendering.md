---
title: "What is the difference between reconciliation and rendering?"
tags: ["reconciliation", "rendering", "internals"]
difficulty: "medium"
---

## Short answer

"Rendering" in React means calling your components to get React elements describing the UI. "Reconciliation" is the diffing step that compares those elements with the current fiber tree to work out what changed. Both happen inside React's **render phase**. Actually changing the screen is a separate step, the **commit phase**, performed by a renderer such as `react-dom` or React Native.

## Explanation

The words get blurred because "render" means different things in different contexts.

| Term | What it is | Touches DOM? |
|---|---|---|
| Rendering (component) | Running `App()` and getting elements back | No |
| Reconciliation | Diffing new elements vs current fibers, marking flags | No |
| Commit | Applying flagged changes to the host (DOM) | Yes |
| Browser paint | The browser drawing pixels after commit | Yes (browser) |

### How they interleave

React does not render the whole tree first and then reconcile it. For each fiber, `beginWork` calls the component (rendering) and immediately reconciles its returned children into child fibers. Then it moves to the next fiber.

```text
render phase (per fiber):
  beginWork(fiber)
    -> call component -> new elements            (rendering)
    -> reconcileChildren(current, elements)      (reconciliation)
  completeWork(fiber)
    -> prepare host instance / diff host props
commit phase (once):
  apply DOM mutations -> swap root.current -> run layout effects
```

### Reconciler vs renderer

The architecture is split into packages:

- **Reconciler** (`react-reconciler`): platform-agnostic Fiber, diffing, scheduling.
- **Renderers** (`react-dom`, `react-native`, `react-three-fiber`, Ink): implement host operations like `createInstance`, `appendChild`, `commitUpdate`.

Analogy: an architect (reconciler) draws the change plan, and a construction crew (renderer) executes it on a specific kind of site.

## Example

```jsx
import { useState } from "react";

export default function Counter() {
  const [n, setN] = useState(0);
  console.log("render"); // logs on every render, even if output is identical

  return (
    // Clicking "Same" calls setN(0) when n is already 0.
    // React may still render once, reconcile, find no changes, and commit nothing.
    <>
      <p>{n}</p>
      <button onClick={() => setN(n + 1)}>+1</button>
      <button onClick={() => setN(0)}>Same</button>
    </>
  );
}
```

## Common mistakes

- Saying "render updates the DOM". Rendering just produces a description.
- Treating reconciliation as a separate pass after rendering the full tree. It happens fiber by fiber.
- Putting side effects in the render body. Render can run multiple times or be thrown away (StrictMode double-invokes it in development to expose this).

## Follow-up questions

- **Which part is interruptible?** The render phase (rendering + reconciliation). Commit is synchronous.
- **Can I write my own renderer?** Yes, with `react-reconciler` and a host config, which is how custom renderers like react-three-fiber work.
- **Does a render always lead to a commit?** No. Interrupted or abandoned renders never commit, and a commit with no flagged changes leaves the DOM untouched.

## Quick recap

- Rendering = calling components to get elements.
- Reconciliation = diffing those elements against current fibers.
- Both are in the render phase; DOM changes happen in commit.
- Reconciler is shared; renderers are platform-specific.
