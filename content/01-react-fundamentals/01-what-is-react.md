---
title: "What is React?"
tags: ["basics", "fundamentals"]
difficulty: "easy"
---

## Short answer

React is an open-source JavaScript library, maintained by Meta, for building user interfaces out of reusable **components**. You describe what the UI should look like for a given state, and React efficiently updates the real DOM when that state changes. It is declarative, component-based, and renders to many targets (web via `react-dom`, mobile via React Native, servers via Server Components).

## Explanation

### The three big ideas

| Idea | What it means |
|------|---------------|
| **Declarative** | You write "the UI for this state", not step-by-step DOM instructions. |
| **Component-based** | UI is split into small, isolated pieces (`Button`, `Navbar`, `Cart`) that compose like Lego bricks. |
| **Learn once, write anywhere** | The same component model runs in the browser, on the server, and on native devices. |

Think of React like a spreadsheet: you define formulas (components) once, and when an input cell (state) changes, the dependent cells (UI) update automatically. You never manually repaint a cell.

### Library, not a framework

React itself only handles the view layer: rendering, state and composition. Routing, data fetching, and bundling come from the ecosystem or from frameworks built on React such as **Next.js** or **React Router v7** (framework mode). The React team now recommends starting new apps with a framework.

### Why teams pick React

- Huge ecosystem and hiring pool.
- One-way data flow makes apps predictable and easier to debug.
- Hooks let you reuse stateful logic without classes.
- Modern features: concurrent rendering, Suspense, Server Components, Actions (React 19), and the React Compiler for automatic memoization.

## Example

```jsx
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  // Declarative: describe the UI for the current `count`
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

React figures out that only the button text changed and updates just that text node.

## Common mistakes

- Calling React a "framework" without nuance. It is a UI library; frameworks like Next.js are built on top of it.
- Saying React is fast "because of the virtual DOM". The real win is the declarative model; the virtual DOM is how React makes that model reasonably efficient.
- Assuming React is only for the web. React Native and other renderers use the same core.

## Follow-up questions

- **Who maintains React and when was it released?** Meta (Facebook) open-sourced it in 2013; it is now also stewarded by the React Foundation.
- **What does "declarative" mean compared to "imperative"?** Declarative describes the desired result; imperative lists the steps (e.g. `document.createElement`, `appendChild`) to reach it.
- **What is the difference between `react` and `react-dom`?** `react` holds the core component and hooks API; `react-dom` is the renderer that turns components into browser DOM.

## Quick recap

- React is a declarative, component-based UI library.
- You describe UI as a function of state; React updates the DOM for you.
- It handles the view layer; frameworks add routing, data and builds.
- Same model runs on web, server and native.
