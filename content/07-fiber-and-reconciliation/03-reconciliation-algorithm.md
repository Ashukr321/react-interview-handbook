---
title: "Explain React's reconciliation algorithm."
tags: ["reconciliation", "diffing", "internals"]
difficulty: "medium"
---

## Short answer

Reconciliation is how React figures out what changed between the UI on screen and the new UI your components return. A generic tree diff is O(n³), so React uses an O(n) heuristic built on two assumptions: elements of different types produce different trees, and keys identify which children are stable across renders. The result is a set of effect flags on fibers (Placement, Update, Deletion) that the commit phase applies to the DOM.

## Explanation

When state changes, React re-runs the affected components to get new React elements, then walks the `current` fiber tree alongside those elements to build a `workInProgress` tree.

### The core heuristics

1. **Different type at the same position → replace.** `<div>` becoming `<section>`, or `<Profile>` becoming `<Settings>`, unmounts the old subtree (state lost, cleanup effects run) and mounts a new one.
2. **Same DOM element type → keep the node, diff attributes.** Only changed props/styles are updated.
3. **Same component type → keep the instance, pass new props.** State and hooks are preserved; the component renders again.
4. **Children lists → match by key** (or by index when no keys).

### How lists are diffed (simplified)

```text
Pass 1: walk old and new children in order while keys match -> update in place
Pass 2: put remaining old fibers in a Map keyed by key (or index)
        for each new child: reuse from Map if key+type match, else create
        track lastPlacedIndex to decide which reused nodes must move
Leftovers in Map -> marked for deletion
```

React does not detect subtree moves across different parents, and it compares level by level only.

### Where it fits

| Step | Phase |
|---|---|
| Call components, diff children, set flags | Render (interruptible) |
| Insert/update/delete DOM nodes, run layout effects | Commit (synchronous) |

## Example

```jsx
function Panel({ isEditing }) {
  // Same position, different type: the <input> state is destroyed on toggle.
  return isEditing ? <EditForm /> : <ReadOnlyView />;
}

function Field({ multiline }) {
  // Same component type: React keeps Field's state and only updates props.
  return multiline ? <textarea className="f" /> : <input className="f" />;
  // ...but here the HOST type changes (textarea vs input), so the DOM node is replaced.
}

function List({ users }) {
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li> // stable keys -> moves instead of rebuilds
      ))}
    </ul>
  );
}
```

## Common mistakes

- Defining a component inside another component. Each render creates a new function type, so React unmounts and remounts it every time, losing state.
- Believing React diffs the whole app on every update. It starts from the fiber that scheduled the update and bails out of unchanged subtrees.
- Thinking React diffs against "the previous Virtual DOM". It diffs new elements against the **current fiber tree**.

> **💡 Interview tip:** Mention the O(n³) vs O(n) trade-off and the two assumptions (type and key). That is what interviewers listen for.

## Follow-up questions

- **How can you force a remount on purpose?** Change the `key`, e.g. `<Form key={userId} />` resets its state when the user changes.
- **Does reconciliation touch the DOM?** No. It only computes and records changes; the commit phase applies them.
- **Is the algorithm the same in React Native?** Yes, the reconciler is shared; only the host operations differ.

## Quick recap

- Reconciliation = diffing new elements against the current fiber tree.
- O(n) heuristic: different type → replace; same type → update.
- Keys match children in lists; order-only diffs need keys to avoid rebuilds.
- Output is effect flags, applied later in the commit phase.
