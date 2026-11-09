---
title: "Scenario-based questions from React lifecycle"
tags: ["lifecycle", "useEffect", "scenarios", "debugging"]
difficulty: "medium"
---

## Short answer

Lifecycle scenario questions give you a small bug ("the effect runs twice", "state resets", "old data flashes") and expect you to name the phase involved and the fix. Most answers come down to five ideas: Strict Mode's mount-unmount-mount, dependency arrays, cleanup, remounting via type/key changes, and effect timing (`useEffect` after paint vs `useLayoutEffect` before paint).

## Explanation

### Scenario 1: "My API is called twice on page load"

**Cause:** In development, Strict Mode mounts, unmounts and re-mounts every component to test cleanup. Production calls it once.
**Fix:** Do not remove Strict Mode. Abort the first request in cleanup, or use a data library (TanStack Query, RTK Query, framework loaders) that dedupes.

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/user/${id}`, { signal: controller.signal })
    .then((r) => r.json()).then(setUser)
    .catch((e) => { if (e.name !== "AbortError") setError(e); });
  return () => controller.abort();
}, [id]);
```

### Scenario 2: "Switching between profiles shows the previous user's data for a moment"

**Cause:** The component updates instead of remounting; a slow old response may also arrive after a newer one (race condition).
**Fix:** Ignore stale responses with an abort/`ignore` flag in cleanup, and reset state with `key={userId}` if the whole subtree should start fresh.

### Scenario 3: "The form inside a child loses everything I typed whenever the parent re-renders"

**Cause:** The child component is defined inside the parent's body, so it is a new type each render and gets unmounted/remounted.
**Fix:** Move the component definition to module scope.

```jsx
// Bad: function Parent() { const Field = () => <input />; return <Field />; }
const Field = () => <input />;            // good: stable type
function Parent() { return <Field />; }
```

### Scenario 4: "A tooltip flickers in the wrong place before jumping to the right position"

**Cause:** Position is measured in `useEffect`, which runs after the browser paints, so the user sees one frame at the old position.
**Fix:** Measure and set position in `useLayoutEffect`, which runs after DOM mutation but before paint.

### Scenario 5: "My interval counter is stuck at 1"

**Cause:** `useEffect(() => { setInterval(() => setCount(count + 1), 1000) }, [])` closes over `count = 0` forever (stale closure).
**Fix:** Use the updater form and clean up.

```jsx
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

### Scenario 6: "Prop changed but my state didn't"

**Cause:** `useState(props.initialValue)` reads the prop only on mount.
**Fix:** If the value should follow the prop, do not copy it into state; use the prop directly. If you need an editable copy that resets when the prop's identity changes, give the component a `key`.

## Common mistakes

- Blaming React for double calls and disabling Strict Mode instead of writing cleanup.
- Adding `// eslint-disable` for exhaustive-deps instead of fixing the stale closure.
- Using effects to sync state from props, causing an extra render and flicker.
- Defining components inside components.

## Follow-up questions

- **How would you log every mount and unmount of a component?** `useEffect(() => { log("mount"); return () => log("unmount"); }, [])`, remembering the dev double run.
- **A child's effect and a parent's effect: which runs first?** The child's. Effects run bottom-up after commit, mirroring `componentDidMount`.
- **How do you run an effect only when a value changes, not on mount?** Track the previous value in a ref and compare, but first check whether the logic belongs in the event handler that caused the change.

## Quick recap

- Double calls in dev = Strict Mode; fix with cleanup.
- Races and stale data = abort/ignore in cleanup, `key` to reset.
- Lost state = component type changed (inline definition or key).
- Visual flicker from measurement = `useLayoutEffect`.
- Stale values in timers = updater functions and correct deps.
