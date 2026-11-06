---
title: "Describe the component lifecycle in both class and functional components"
tags: ["lifecycle", "useEffect", "class-components"]
difficulty: "medium"
---

## Short answer

Every component goes through **mounting** (added to the DOM), **updating** (re-rendered due to new props or state) and **unmounting** (removed). Class components expose these as methods like `componentDidMount`, `componentDidUpdate` and `componentWillUnmount`. Function components have no lifecycle methods; instead `useEffect` (and `useLayoutEffect`) synchronise with external systems after render, with cleanup functions handling teardown.

## Explanation

### Class component lifecycle

```text
 MOUNT                       UPDATE                          UNMOUNT
 constructor                 getDerivedStateFromProps        componentWillUnmount
 getDerivedStateFromProps    shouldComponentUpdate
 render                      render
 [DOM updated]               getSnapshotBeforeUpdate
 componentDidMount           [DOM updated]
                             componentDidUpdate
 ERRORS: getDerivedStateFromError, componentDidCatch
```

### Function component equivalents

| Class method | Hook equivalent |
|--------------|-----------------|
| `constructor` | `useState` initialiser, `useRef` |
| `componentDidMount` | `useEffect(fn, [])` |
| `componentDidUpdate` | `useEffect(fn, [deps])` |
| `componentWillUnmount` | cleanup returned from `useEffect` |
| `shouldComponentUpdate` | `React.memo` |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` (approximately) |
| `componentDidCatch` | No hook yet; use a class error boundary |

### Think in synchronisation, not lifecycle

The modern mental model: an effect says "keep this external thing in sync with these values". React runs it after commit, and whenever dependencies change it runs the previous cleanup first, then the effect again. Unmount is just the final cleanup.

```text
 render -> commit -> effect runs
 deps change -> render -> commit -> cleanup(old) -> effect(new)
 unmount -> cleanup
```

It is like a hotel check-in: every time the guest (dependency) changes, you check out the old one (cleanup) before checking in the new one.

## Example

```jsx
import { Component, useEffect, useState } from "react";

// Class version
class ChatRoomClass extends Component {
  componentDidMount() {
    this.conn = connect(this.props.roomId);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.roomId !== this.props.roomId) {
      this.conn.disconnect();
      this.conn = connect(this.props.roomId);
    }
  }
  componentWillUnmount() {
    this.conn.disconnect();
  }
  render() {
    return <h2>Room: {this.props.roomId}</h2>;
  }
}

// Function version: one effect covers mount, update and unmount
function ChatRoom({ roomId }) {
  useEffect(() => {
    const conn = connect(roomId);
    return () => conn.disconnect();
  }, [roomId]);

  return <h2>Room: {roomId}</h2>;
}

function connect(roomId) {
  console.log("connect", roomId);
  return { disconnect: () => console.log("disconnect", roomId) };
}
```

## Common mistakes

- Treating `useEffect(fn, [])` as an exact `componentDidMount` replacement and then reading stale props inside it.
- Forgetting cleanup, causing memory leaks or duplicate subscriptions (visible in `StrictMode`, which mounts, unmounts and remounts in development).
- Splitting one concern across several class methods instead of grouping by concern with separate effects.
- Using deprecated `componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate` (now `UNSAFE_` prefixed).

## Follow-up questions

- **`useEffect` vs `useLayoutEffect`?** `useLayoutEffect` runs synchronously after DOM mutation but before paint, useful for measuring layout; `useEffect` runs after paint and does not block it.
- **Why does my effect run twice in development?** `StrictMode` deliberately remounts to verify your cleanup works.
- **How do you build an error boundary today?** With a class implementing `getDerivedStateFromError`/`componentDidCatch`, or the `react-error-boundary` package.

## Quick recap

- Phases: mount, update, unmount (plus error handling).
- Classes use lifecycle methods; functions use effects and cleanups.
- One `useEffect` can replace three class methods for one concern.
- Think "synchronise with deps", not "run on mount".
