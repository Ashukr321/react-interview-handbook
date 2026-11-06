---
title: "How many types of components are there in React? (Functional vs Class)"
tags: ["components", "class-components", "function-components"]
difficulty: "easy"
---

## Short answer

There are two main ways to write components: **function components** (plain functions that return JSX and use hooks) and **class components** (ES6 classes extending `React.Component` with a `render` method and lifecycle methods). Function components with hooks are the modern standard; class components still work but are mostly found in legacy code. You may also hear about Server vs Client Components, which is a different axis (where the component runs).

## Explanation

### Side-by-side

| Aspect | Function component | Class component |
|--------|--------------------|-----------------|
| Syntax | `function Card(props) {}` | `class Card extends Component {}` |
| State | `useState`, `useReducer` | `this.state`, `this.setState` |
| Side effects | `useEffect`, `useLayoutEffect` | `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` |
| `this` binding | Not needed | Must bind handlers or use arrow fields |
| Logic reuse | Custom hooks | HOCs, render props |
| Boilerplate | Minimal | More verbose |
| Error boundaries | Not possible yet | Required (`componentDidCatch`, `getDerivedStateFromError`) |
| React Compiler support | Yes | No |

A function component is like a stateless recipe card that React re-reads every render, with hooks acting as labelled jars on a shelf where React keeps the ingredients between reads. A class component is a whole kitchen object that carries its own state and methods around.

### Other categories interviewers might mean

- **Stateful vs stateless** (covered in the next question).
- **Presentational vs container**: UI-only components vs ones that fetch or manage data.
- **Server vs Client Components** (React 19 / Next.js App Router): Server Components run only on the server and ship no JS; Client Components (`"use client"`) are interactive.
- **Pure components**: `React.PureComponent` or `React.memo` skip re-rendering when props are shallowly equal.

## Example

```jsx
import { Component, useState } from "react";

// Function component
function CounterFn() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}

// Class component
class CounterClass extends Component {
  state = { count: 0 };

  increment = () => {
    this.setState((prev) => ({ count: prev.count + 1 }));
  };

  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}
```

## Common mistakes

- Saying class components are deprecated. They are still supported, just not recommended for new code.
- Claiming function components cannot have state. That was true before hooks (React 16.8).
- Forgetting that error boundaries still require a class (or a library like `react-error-boundary`).

## Follow-up questions

- **Why did React move to function components?** Hooks make logic reuse simpler, remove `this` confusion, group related logic together and are easier for tools like the compiler to optimise.
- **Can you use hooks in a class component?** No. Wrap the class with a function component or convert it.
- **How do you migrate a class to a function?** Move state to `useState`, lifecycle logic to `useEffect` (grouped by concern), and instance fields to `useRef`.

## Quick recap

- Two syntaxes: function components (modern) and class components (legacy).
- Hooks give function components state and effects.
- Classes are still needed for error boundaries.
- Server vs Client Components is about where code runs, not syntax.
