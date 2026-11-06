---
title: "What are stateless and stateful components in React?"
tags: ["components", "state"]
difficulty: "easy"
---

## Short answer

A **stateful** component owns and manages data that changes over time (via `useState`, `useReducer`, or `this.state`). A **stateless** component holds no state of its own; it simply renders based on the props it receives. Good design keeps most components stateless and concentrates state in a few owners.

## Explanation

Think of a TV and a remote. The remote (stateful) remembers the current channel and volume. The TV screen (stateless) just shows whatever signal it is given.

| | Stateless | Stateful |
|---|-----------|----------|
| Owns data | No | Yes |
| Output depends on | Props only | Props + internal state |
| Re-renders when | Parent re-renders / props change | Its state changes or parent re-renders |
| Reusability | Very high | Lower, tied to its logic |
| Testing | Easy: given props, expect output | Need to simulate interactions |
| Also called | Presentational, "dumb", pure | Container, "smart" |

### Why it matters

- Stateless components are predictable: same props, same output. That makes them easy to reuse, test and memoise.
- Stateful components are where behaviour lives. Keeping that logic in fewer places makes the data flow easier to follow.
- Custom hooks blur the old "container vs presentational" split: you can move stateful logic into a hook and keep the component visually focused.

> **💡 Interview tip:** "Stateless" is about *component* state. A stateless component can still read context or call hooks like `useContext`; it just does not own changing data.

## Example

```jsx
import { useState } from "react";

// Stateless: renders from props only
function Greeting({ name, onRename }) {
  return (
    <div>
      <h2>Hello, {name}</h2>
      <button onClick={() => onRename("Ada")}>Rename to Ada</button>
    </div>
  );
}

// Stateful: owns `name` and passes it down
export default function Profile() {
  const [name, setName] = useState("Guest");
  return <Greeting name={name} onRename={setName} />;
}
```

## Common mistakes

- Making every component stateful "just in case", which duplicates data and causes sync bugs.
- Storing derived values (e.g. `fullName` from `first` + `last`) in state instead of computing during render.
- Calling all function components "stateless". Function components with hooks can be fully stateful.

## Follow-up questions

- **Where should state live?** In the closest common ancestor of all components that need it (lifting state up).
- **Are stateless components faster?** Not inherently, but they are easier to wrap in `React.memo` because their output depends only on props.
- **Is a component that uses `useRef` stateful?** It holds mutable instance data, but changing a ref does not trigger a re-render, so it is not "state" in React's sense.

## Quick recap

- Stateful = owns changing data; stateless = renders props.
- Keep most components stateless, state in a few owners.
- Stateless components are easier to reuse, test and memoise.
- Do not store values you can derive.
