---
title: "What are higher-order components (HOCs) and how do they compare to render props?"
tags: ["patterns", "hoc", "render-props", "custom-hooks"]
difficulty: "medium"
---

## Short answer

A **higher-order component** is a function that takes a component and returns a new, enhanced component (`withAuth(Profile)`). A **render prop** is a component that takes a function prop and calls it to decide what to render (`<Mouse render={(pos) => ...} />`). Both share stateful logic between components. Today **custom hooks** cover most of these use cases more simply, but HOCs are still common for cross-cutting wrappers and in older libraries.

## Explanation

An HOC is like gift-wrapping: you hand over a present (component) and get back the same present with extra wrapping (props, behaviour). A render prop is like a vending machine with a slot: it does the work and hands you the result, and you decide what to do with it.

| Aspect | HOC | Render props | Custom hook |
|--------|-----|--------------|-------------|
| Shape | `withX(Component)` | `<X>{(data) => ...}</X>` | `const data = useX()` |
| Where logic lives | Wrapper component | Provider component | Function |
| Prop collisions | Possible (two HOCs inject `data`) | None, you name things | None |
| Source of props | Hidden, hard to trace | Explicit in JSX | Explicit |
| Nesting | "Wrapper hell" in DevTools | "Callback pyramid" in JSX | Flat |
| Static typing | Awkward generics | Fine | Easiest |
| Still useful for | Auth gates, logging, `React.memo`, `connect` | Headless UI libs, virtualised lists | Most logic reuse |

## Example

```jsx
import { useEffect, useState } from "react";

// 1. HOC
function withWindowWidth(Component) {
  function WithWindowWidth(props) {
    const width = useWindowWidth();
    return <Component {...props} width={width} />;
  }
  WithWindowWidth.displayName = `withWindowWidth(${Component.displayName || Component.name})`;
  return WithWindowWidth;
}

const Banner = withWindowWidth(({ width }) => <p>Width: {width}px</p>);

// 2. Render prop
function WindowWidth({ children }) {
  const width = useWindowWidth();
  return children(width);
}

function Footer() {
  return <WindowWidth>{(width) => <p>{width > 600 ? "Desktop" : "Mobile"}</p>}</WindowWidth>;
}

// 3. Custom hook (shared by both above)
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}
```

## Common mistakes

- Applying an HOC inside a render function, creating a new component type each render and losing state.
- Not forwarding unrelated props (`{...props}`) or refs through the HOC. In React 19, `ref` is a normal prop for function components, so spreading props forwards it.
- Forgetting to set `displayName`, making DevTools hard to read.
- Mutating the wrapped component (e.g. adding methods to its prototype) instead of composing.

## Follow-up questions

- **Why did hooks largely replace these patterns?** Hooks share logic without adding components to the tree, avoid prop collisions and are easier to type.
- **Give a real-world HOC.** `React.memo`, Redux's legacy `connect`, `withRouter` (React Router v5), auth guards.
- **When would you still choose render props?** When the consumer must control rendering of internal state, e.g. headless components or list virtualisation row renderers.

## Quick recap

- HOC: function that wraps a component and injects props.
- Render prop: component calls a function child/prop to render.
- Both share logic; custom hooks are now the default choice.
- HOCs still fit cross-cutting wrappers; render props fit headless UI.
