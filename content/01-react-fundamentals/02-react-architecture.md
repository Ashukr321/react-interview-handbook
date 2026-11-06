---
title: "React Architecture"
tags: ["architecture", "internals", "fiber"]
difficulty: "medium"
---

## Short answer

React's architecture has three layers: **components** that describe UI, the **reconciler** (Fiber) that works out what changed between renders, and a **renderer** (`react-dom`, React Native, etc.) that applies those changes to the host platform. Data flows one way, from parent to child via props, and updates are triggered by state changes.

## Explanation

### The layers

```text
 Your components (JSX + hooks)
            |
            v
 +------------------------+
 |  React core (react)    |  createElement, hooks, context
 +------------------------+
            |
            v
 +------------------------+
 |  Reconciler (Fiber)    |  builds fiber tree, diffs, schedules work
 +------------------------+
            |
            v
 +------------------------+
 |  Renderer              |  react-dom / react-native / react-server
 +------------------------+
            |
            v
     Real DOM / native views
```

- **Components**: pure-ish functions that take props and return React elements.
- **Reconciler (Fiber)**: since React 16 every element is backed by a "fiber" node. Fiber lets React split rendering into small units of work, pause, prioritise urgent updates and resume. This powers concurrent features.
- **Renderer**: platform-specific code that knows how to create and update nodes. The reconciler is shared; only the renderer differs.

### Render and commit phases

1. **Trigger**: initial `root.render()` or a `setState`.
2. **Render phase**: React calls your components and builds a new fiber tree. This is pure and can be interrupted.
3. **Commit phase**: React applies the minimal DOM changes synchronously, then runs layout effects and later passive effects (`useEffect`).

A restaurant analogy: components are the menu, the reconciler is the head chef deciding what needs cooking for this order, and the renderer is the waiter who actually puts plates on the table.

### Application-level architecture

On top of the core, a typical app adds a router, a state layer (local state, Context, Redux Toolkit or Zustand), a server-state cache (TanStack Query) and, in frameworks like Next.js App Router, a split between **Server Components** (run on the server, no JS shipped) and **Client Components** (interactive, marked `"use client"`).

## Example

```jsx
import { createRoot } from "react-dom/client"; // renderer
import { useState } from "react";               // core

function App() {
  const [on, setOn] = useState(false); // state change triggers reconciliation
  return <button onClick={() => setOn(!on)}>{on ? "ON" : "OFF"}</button>;
}

createRoot(document.getElementById("root")).render(<App />);
```

## Common mistakes

- Confusing the virtual DOM with the whole architecture. It is just the element/fiber tree the reconciler compares.
- Thinking side effects belong in the render phase. Render must be pure; effects run after commit.
- Assuming the reconciler is web-specific. It is renderer-agnostic.

## Follow-up questions

- **What is a fiber?** A JavaScript object representing one unit of work for a component, holding its type, props, state, effects and links to parent, child and sibling.
- **Why can the render phase be interrupted but not the commit phase?** Render produces no visible output, so throwing it away is safe; commit mutates the DOM and must be atomic to avoid a half-updated UI.
- **Where do Server Components fit?** They render on the server into a serialized payload that the client reconciler merges into the tree.

## Quick recap

- Components describe, the reconciler diffs, the renderer applies.
- Fiber enables interruptible, prioritised rendering.
- Updates go through render (pure) then commit (DOM mutation).
- One-way data flow keeps the architecture predictable.
