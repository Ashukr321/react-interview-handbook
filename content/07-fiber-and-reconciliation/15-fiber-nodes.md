---
title: "What are Fiber nodes?"
tags: ["fiber", "internals", "data-structures"]
difficulty: "hard"
---

## Short answer

A Fiber node is a plain JavaScript object that represents one piece of the UI (a component, DOM element, text node, fragment, Suspense boundary, etc.) and the work needed for it. It stores the element's type and props, its state (hooks list), pointers to its parent, first child and next sibling, the pending update lanes, effect flags, and an `alternate` pointer to its twin in the other tree. Fibers are mutable and reused across renders.

## Explanation

### Important fields

| Field | Purpose |
|---|---|
| `tag` | Kind of fiber: FunctionComponent, ClassComponent, HostComponent, HostText, HostRoot, SuspenseComponent… |
| `type` / `elementType` | The function, class or string (`"div"`) |
| `key` | Identity for reconciliation |
| `stateNode` | The DOM node (host), class instance, or FiberRoot |
| `return`, `child`, `sibling` | Parent, first child, next sibling pointers |
| `index` | Position among siblings |
| `pendingProps` / `memoizedProps` | New props for this render / props used last render |
| `memoizedState` | Class state, or the linked list of hooks for function components |
| `updateQueue` | Pending class updates, or effect list for function components |
| `dependencies` | Contexts this fiber reads |
| `lanes` / `childLanes` | Pending work on this fiber / in its subtree |
| `flags` / `subtreeFlags` / `deletions` | What to do in commit (Placement, Update, ChildDeletion, Ref, Passive…) |
| `ref` | The ref to attach in commit |
| `mode` | ConcurrentMode, StrictMode bits |
| `alternate` | The matching fiber in the other tree |

### Shape of the tree

Fibers use a child/sibling/return linked list, not a `children` array, which makes iterative depth-first traversal possible without recursion:

```text
        App
         | child
        div ---------------------------- (return pointers go back up)
         | child
       Header --sibling--> Main --sibling--> Footer
                            | child
                           List
```

### Double buffering

Each fiber can have an `alternate`. The `current` tree reflects the screen; the `workInProgress` tree is built from alternates (`createWorkInProgress` reuses the alternate object instead of allocating). On commit, `root.current` points at the finished tree, and the old one becomes the next WIP buffer.

### Hooks live on the fiber

For a function component, `memoizedState` points to the first hook. Each hook object has `memoizedState`, `queue` and `next`. That's why hooks must be called in the same order every render: React walks this list positionally.

## Example

```jsx
import { useState, useRef, useEffect } from "react";

// For this component, the fiber's memoizedState list is:
// hook1 (useState: count) -> hook2 (useRef: box) -> hook3 (useEffect: effect object)
export default function Counter() {
  const [count, setCount] = useState(0);
  const box = useRef(null);
  useEffect(() => {
    box.current.textContent = `Clicked ${count} times`;
  }, [count]);

  // Breaking hook order (e.g. `if (count > 2) useState()`) corrupts this list.
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <span ref={box} />
    </div>
  );
}
```

## Common mistakes

- Confusing fibers with React elements. Elements are immutable, created every render; fibers are mutable and persist.
- Thinking there's one fiber per component class/function. It's one per **instance** in the tree.
- Assuming you can read fiber internals in app code. Fields like `_reactInternals` are private and change between versions.

> **💡 Interview tip:** Mentioning `child`/`sibling`/`return` pointers and `alternate` shows you understand why Fiber can iterate and pause without the call stack.

## Follow-up questions

- **What is the FiberRoot vs HostRoot fiber?** FiberRoot (from `createRoot`) holds global state like `pendingLanes` and `current`; the HostRoot fiber is the top node of the fiber tree.
- **Are DOM nodes linked to fibers?** Yes, React stores an internal key on DOM nodes pointing back to their fiber, used for event handling.
- **Why are fibers reused?** To reduce allocations and garbage collection during frequent renders.

## Quick recap

- A fiber = one UI instance + its unit of work.
- Linked via `child`, `sibling`, `return`.
- Holds props, hooks state, lanes and effect flags.
- `alternate` links current and workInProgress twins.
