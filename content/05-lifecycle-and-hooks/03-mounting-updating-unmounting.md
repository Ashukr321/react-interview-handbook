---
title: "Mounting vs Updating vs Unmounting"
tags: ["lifecycle", "rendering", "useEffect"]
difficulty: "easy"
---

## Short answer

**Mounting** is when React creates a component instance for the first time and inserts its DOM. **Updating** is any later re-render of that same instance, triggered by new props, state or context. **Unmounting** is when React removes the instance from the tree, destroying its state and running cleanups. Whether a re-render is an update or a remount depends on whether the component keeps the **same type at the same position with the same `key`**.

## Explanation

A theatre analogy: an actor walks on stage (mount), changes costumes and lines during the play (updates), and leaves the stage (unmount). A different actor in the same role is not an update; it is a new mount.

| | Mounting | Updating | Unmounting |
|---|---|---|---|
| Trigger | Component appears in the tree | Props/state/context change, parent re-renders | Component removed, type changes, or `key` changes |
| State | Initialised (`useState(init)`) | Preserved | Destroyed |
| DOM | Created and inserted | Patched (only diffs) | Removed |
| Refs | Attached | Kept (re-attached if callback changes) | Set to `null` / ref cleanup |
| `useEffect(fn, [])` | Runs | Does not run | Cleanup runs |
| `useEffect(fn, [dep])` | Runs | Cleanup + rerun if `dep` changed | Cleanup runs |
| Class methods | `constructor`, `render`, `componentDidMount` | `shouldComponentUpdate`, `render`, `getSnapshotBeforeUpdate`, `componentDidUpdate` | `componentWillUnmount` |

### When does React remount instead of update?

- The **element type** at that position changes (`<input>` to `<textarea>`, `<Profile>` to `<Settings>`).
- The **key** changes (`<Profile key={userId} />` with a new `userId`).
- The component is conditionally removed and later re-added.
- A component is **defined inside another component**, so its type is new on every render (a classic bug).

Using a `key` to deliberately reset a subtree is a useful pattern: switching users resets the form state without effects.

## Example

```jsx
import { useEffect, useState } from "react";

function Profile({ userId }) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    console.log("mounted for", userId);
    return () => console.log("unmounted", userId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log("userId effect:", userId); // mount + every userId update
  }, [userId]);

  return <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Note for ${userId}`} />;
}

export default function App() {
  const [userId, setUserId] = useState(1);
  const [show, setShow] = useState(true);

  return (
    <>
      <button onClick={() => setUserId((id) => id + 1)}>Next user</button>
      <button onClick={() => setShow((s) => !s)}>Toggle</button>

      {/* Update: same instance, draft text survives user change */}
      {show && <Profile userId={userId} />}

      {/* Remount: new key -> fresh state for each user */}
      {show && <Profile key={userId} userId={userId} />}
    </>
  );
}
```

## Common mistakes

- Expecting `useState(props.value)` to update when the prop changes; the initial value is only used on mount. Use a `key` or derive the value.
- Declaring components inside other components, so every parent render remounts them and wipes state.
- Using array index as `key` in reorderable lists, causing state to attach to the wrong item.
- Assuming one mount in development; Strict Mode simulates mount-unmount-mount.

## Follow-up questions

- **Does a parent re-render unmount its children?** No, children update (re-render) unless their type/key/position changes.
- **How do you run code only on updates, not mount?** Track a ref flag such as `isFirstRender`, but first ask whether the logic belongs in an event handler instead.
- **What happens to state when a component is hidden with `<Activity mode="hidden">`?** It is preserved; effects are cleaned up and re-created when it becomes visible again.

## Quick recap

- Mount = first appearance; update = re-render of the same instance; unmount = removal.
- Same type + position + key = update; otherwise remount.
- Change `key` to reset state on purpose.
- Cleanups run on unmount and before re-running effects.
