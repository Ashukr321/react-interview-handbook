---
title: "What is setState in React?"
tags: ["state", "setState", "class-components", "batching"]
difficulty: "easy"
---

## Short answer

`setState` is the method class components use to update `this.state` and ask React to re-render. It **schedules** an update rather than changing state immediately, **shallowly merges** the object you pass into the existing state, and can take an **updater function** `(prevState, props) => newState` when the new value depends on the old one. In function components, the equivalent is the setter returned by `useState`, which replaces the value instead of merging.

## Explanation

`setState` is like dropping a letter in a post box rather than handing it over in person. The letter (update) is collected and delivered with others in a batch, so you cannot read the result the moment you post it.

### Key behaviours

| Behaviour | Detail |
|-----------|--------|
| Asynchronous / batched | Multiple calls in one event (and, since React 18, in timeouts and promises) are batched into one render |
| Shallow merge (class) | `setState({ a: 1 })` keeps other top-level keys |
| Replace (hooks) | `setUser({ name })` replaces the whole value; spread to keep other fields |
| Updater function | `setState(prev => ...)` always gets the latest state |
| Callback (class) | Second argument runs after the update is committed |
| Bail-out (hooks) | If the new value is `Object.is` equal to the old one, React may skip the re-render |

### Why updater functions matter

```text
 count = 0
 setState({ count: this.state.count + 1 })  -> queued: 0 + 1
 setState({ count: this.state.count + 1 })  -> queued: 0 + 1
 result: 1   (both read the same stale value)

 setState(prev => ({ count: prev.count + 1 }))  -> 0 -> 1
 setState(prev => ({ count: prev.count + 1 }))  -> 1 -> 2
 result: 2
```

## Example

```jsx
import { Component, useState } from "react";

class CounterClass extends Component {
  state = { count: 0, label: "Clicks" };

  addTwo = () => {
    this.setState((prev) => ({ count: prev.count + 1 }));
    this.setState(
      (prev) => ({ count: prev.count + 1 }), // label is preserved by merge
      () => console.log("committed:", this.state.count) // runs after update
    );
  };

  render() {
    return (
      <button onClick={this.addTwo}>
        {this.state.label}: {this.state.count}
      </button>
    );
  }
}

function CounterHooks() {
  const [state, setState] = useState({ count: 0, label: "Clicks" });

  const addTwo = () => {
    // hooks do not merge: spread the previous object
    setState((prev) => ({ ...prev, count: prev.count + 1 }));
    setState((prev) => ({ ...prev, count: prev.count + 1 }));
  };

  return <button onClick={addTwo}>{state.label}: {state.count}</button>;
}
```

## Common mistakes

- Reading `this.state` right after `setState` and expecting the new value.
- Mutating state directly (`this.state.count++`), which does not trigger a render and can be overwritten.
- Forgetting that the `useState` setter replaces rather than merges objects.
- Calling `setState` in `render` or unconditionally in `componentDidUpdate`, causing infinite loops.

## Follow-up questions

- **Is `setState` synchronous or asynchronous?** It is neither strictly; updates are queued and batched, then processed during the next render. `flushSync` forces a synchronous update when truly needed.
- **How do you run code after state updates in function components?** Use `useEffect` that depends on that state, or compute the next value in a variable and use it directly.
- **What is `forceUpdate`?** A class method that re-renders without changing state; it is an escape hatch to avoid.

## Quick recap

- `setState` schedules an update and re-render.
- Updates are batched; read the result in the next render.
- Class `setState` merges; hook setters replace.
- Use updater functions when depending on previous state.
