---
title: "Explain the React component lifecycle"
asked_as: ["Lifecycle methods in ReactJS."]
tags: ["lifecycle", "class-components", "hooks", "useEffect"]
difficulty: "medium"
---

## Short answer

Every component goes through three phases: **mounting** (created and inserted into the DOM), **updating** (re-rendered because props, state or context changed) and **unmounting** (removed from the DOM). Class components expose these as lifecycle methods like `componentDidMount`, `componentDidUpdate` and `componentWillUnmount`. Function components express the same moments with hooks, mainly `useEffect` and its cleanup function.

## Explanation

Think of a shop: it opens (mount), changes its window display many times (update) and finally closes (unmount). Each phase has jobs: set up the till when opening, refresh displays when stock changes, lock up when closing.

Internally each update has a **render phase** (pure, can be paused or repeated) and a **commit phase** (DOM changes, then lifecycle methods / effects).

### Class lifecycle methods

```text
MOUNTING              UPDATING                          UNMOUNTING
constructor           static getDerivedStateFromProps   componentWillUnmount
static getDerived...  shouldComponentUpdate
  StateFromProps      render
render                getSnapshotBeforeUpdate
componentDidMount     componentDidUpdate

ERRORS: static getDerivedStateFromError, componentDidCatch
```

| Method | Phase | Typical use |
|---|---|---|
| `constructor` | Mount | Initialise state, bind methods |
| `getDerivedStateFromProps` | Mount + update | Rare: derive state from props |
| `shouldComponentUpdate` | Update | Skip re-render (performance) |
| `render` | Mount + update | Return JSX, must be pure |
| `getSnapshotBeforeUpdate` | Update | Read DOM (e.g. scroll position) before changes |
| `componentDidMount` | Mount | Fetch data, subscribe, measure DOM |
| `componentDidUpdate` | Update | React to prop/state changes |
| `componentWillUnmount` | Unmount | Cleanup timers, subscriptions |
| `getDerivedStateFromError` / `componentDidCatch` | Error | Error boundaries (still class-only) |

Removed/unsafe: `componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate` (now `UNSAFE_` prefixed) because they break with concurrent rendering.

### Hook equivalents

| Class | Function component |
|---|---|
| `constructor` state | `useState` / `useReducer` initialiser |
| `componentDidMount` | `useEffect(fn, [])` |
| `componentDidUpdate` | `useEffect(fn, [deps])` |
| `componentWillUnmount` | Cleanup returned from `useEffect` |
| `shouldComponentUpdate` | `React.memo` |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` (approximate) |

Effects are better thought of as **synchronising with something external** than as lifecycle callbacks: "keep this subscription in sync with `roomId`".

## Example

```jsx
import { Component, useEffect, useState } from "react";

class ClockClass extends Component {
  state = { now: new Date() };
  componentDidMount() {
    this.id = setInterval(() => this.setState({ now: new Date() }), 1000);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.label !== this.props.label) document.title = this.props.label;
  }
  componentWillUnmount() {
    clearInterval(this.id);
  }
  render() {
    return <p>{this.props.label}: {this.state.now.toLocaleTimeString()}</p>;
  }
}

function Clock({ label }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000); // mount
    return () => clearInterval(id);                          // unmount
  }, []);

  useEffect(() => {
    document.title = label; // mount + whenever label changes
  }, [label]);

  return <p>{label}: {now.toLocaleTimeString()}</p>;
}
```

## Common mistakes

- Treating `useEffect(fn, [])` as an exact `componentDidMount`; in development Strict Mode it runs, cleans up and runs again.
- Fetching or subscribing in `render` or the constructor instead of after mount.
- Forgetting cleanup, causing leaks and duplicated subscriptions.
- Using effects to compute derived values that could be calculated during render.

## Follow-up questions

- **Can function components be error boundaries?** No, error boundaries still need a class (or a library like `react-error-boundary`).
- **Why were `componentWillMount` & co deprecated?** Render-phase methods can run multiple times in concurrent rendering, so side effects there are unsafe.
- **In what order do parent and child mount?** Children's `componentDidMount`/effects run before the parent's.

## Quick recap

- Three phases: mount, update, unmount (+ error handling).
- Render phase is pure; commit phase runs side effects.
- `useEffect` + cleanup covers mount/update/unmount in function components.
- Legacy `componentWill*` methods are unsafe.
