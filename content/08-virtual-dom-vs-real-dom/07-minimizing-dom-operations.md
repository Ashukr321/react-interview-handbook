---
title: "How does React minimize DOM operations?"
tags: ["virtual-dom", "performance", "reconciliation", "batching"]
difficulty: "medium"
---

## Short answer

React computes changes in memory first and only writes the differences. It reuses existing DOM nodes when type and key match, diffs props so only changed attributes are set, uses keys to move list items instead of recreating them, batches multiple state updates into one render and one commit, and skips subtrees that didn't change via bailouts. All DOM writes happen together in a single synchronous commit.

## Explanation

### Techniques React uses

| Technique | Effect on the DOM |
|---|---|
| Diffing by type and key | Same type → reuse node; different → replace subtree only |
| Prop diffing in `completeWork` | Only changed attributes/styles/listeners are written |
| Keyed list reconciliation | Moves existing nodes; `lastPlacedIndex` minimizes moves |
| Automatic batching (React 18+) | Many `setState` calls → one render, one commit |
| Bailouts (`lanes`, `childLanes`, `memo`) | Unchanged subtrees aren't even rendered |
| `subtreeFlags` | Commit only walks branches that contain changes |
| Single commit | Writes grouped together; no read/write interleaving by React itself |
| Event delegation | One listener per event type on the root, not one per element |
| Off-screen building | New subtrees are built detached, then inserted with one `appendChild`/`insertBefore` |

The last point matters: when mounting a new subtree, `completeWork` creates DOM nodes and appends children to them while they're detached. Only the top node is inserted into the document during commit, so the browser does layout once.

```text
render phase:  build <ul><li/><li/><li/></ul> in memory (detached)
commit phase:  container.appendChild(ul)   <- one insertion into the live DOM
```

Analogy: a mover who packs a whole room into one box and carries it in one trip, instead of walking each item in separately.

### What React does not do

- It doesn't detect moves across different parents.
- It doesn't skip renders of children by default; that's what `memo` or React Compiler adds.
- It doesn't protect you from layout thrashing in your own effects.

## Example

```jsx
import { useState } from "react";

export default function Filters() {
  const [color, setColor] = useState("red");
  const [size, setSize] = useState("M");
  const [page, setPage] = useState(1);

  const reset = () => {
    // Batched: one render, one commit, even inside async code in React 18+
    setColor("red");
    setSize("M");
    setPage(1);
  };

  return (
    <div className={`filters ${color}`} data-size={size}>
      {/* On color change only the class attribute is written */}
      <p>Page {page}</p>
      <button onClick={() => setColor("blue")}>Blue</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## Common mistakes

- Changing the parent element type conditionally (`isMobile ? <div> : <section>`), forcing a full subtree rebuild.
- Unstable or index keys in dynamic lists, causing extra updates or remounts.
- Rendering thousands of rows; even minimal diffs can't fix too many nodes. Use virtualization (TanStack Virtual, react-window).

## Follow-up questions

- **How do I opt out of batching?** Wrap an update in `flushSync` to commit it immediately.
- **Why does event delegation help?** Fewer listeners to attach/detach on mount, unmount and re-render.
- **Does React reorder DOM writes for performance?** It applies them in tree order during commit; the optimization is in doing fewer of them.

## Quick recap

- Diff in memory, write only differences.
- Reuse nodes by type and key; diff props attribute by attribute.
- Batch updates into one commit.
- Bail out of unchanged subtrees; insert new subtrees in one operation.
