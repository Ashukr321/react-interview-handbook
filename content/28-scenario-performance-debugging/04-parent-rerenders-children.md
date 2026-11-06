---
title: "A parent component re-renders frequently, causing all child components to re-render. How would you optimize it?"
tags: ["re-renders", "memo", "composition", "useCallback"]
difficulty: "medium"
---

## Short answer

First I check why the parent re-renders and whether that state belongs lower. The cheapest fixes are structural: move the changing state into a smaller component, or pass expensive children as `children` so they are created outside the re-rendering component. If children still need to skip renders, I wrap them in `React.memo` and keep their props stable with `useMemo`/`useCallback` (or let the React Compiler do it).

## Why it happens

When a component re-renders, React re-renders all its children by default, whether or not their props changed. That is usually fine, but becomes slow when the parent updates often (timer, mouse move, input typing, scroll) and the children are expensive.

```text
Parent (mouse position updates 60x/sec)
  |-- Header        re-renders 60x/sec
  |-- HeavyChart    re-renders 60x/sec  <- the problem
  |-- Tooltip       actually needs the position
```

## How to fix it

### 1. Move state down

```jsx
// Before: the entire page re-renders on every keystroke
function Page() {
  const [text, setText] = useState("");
  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <HeavyChart />
    </>
  );
}

// After: only SearchInput re-renders
function SearchInput() {
  const [text, setText] = useState("");
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}
function Page() {
  return (<><SearchInput /><HeavyChart /></>);
}
```

### 2. Lift content up (children as props)

```jsx
function MouseTracker({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>
      <Tooltip pos={pos} />
      {children}   {/* created by the parent of MouseTracker, so not re-rendered */}
    </div>
  );
}

<MouseTracker><HeavyChart /></MouseTracker>
```

### 3. Memoize the child and stabilize props

```jsx
const HeavyChart = memo(function HeavyChart({ data, onPointClick }) {
  /* expensive render */
});

function Parent({ raw }) {
  const [tick, setTick] = useState(0); // changes often, e.g. from a timer
  const data = useMemo(() => transform(raw), [raw]);
  const onPointClick = useCallback((p) => console.log(p), []);
  return <HeavyChart data={data} onPointClick={onPointClick} />;
}
```

| Technique | Cost | When |
| --- | --- | --- |
| Move state down | Free | State used by a small part |
| Children as props | Free | Wrapper owns fast state |
| `memo` + stable props | Some memory/compare cost | Expensive child, props rarely change |

> **💡 Interview tip:** Mention that a re-render is not a DOM update. React only touches the DOM if output changes; memoize only when the render itself is measurably expensive.

## How to verify

- Profiler "Why did this render?" no longer lists "parent rendered" for the heavy child.
- Highlight updates shows only the small component flashing.
- Commit duration for the frequent update drops.

## Follow-up questions

- **Why does `memo` fail with inline functions?** A new function each render fails the shallow prop comparison.
- **Does `memo` stop re-renders from context?** No; a memoized component still re-renders when a context it reads changes.
- **What does the React Compiler change?** It memoizes components and values automatically at build time, so manual `useMemo`/`useCallback` is rarely needed.

## Quick recap

- Default: parent render re-renders all children.
- Move state down, or pass children as props.
- `memo` + stable props for genuinely expensive children.
- Confirm with the Profiler, not by guessing.
