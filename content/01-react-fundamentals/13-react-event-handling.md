---
title: "How does React handle events differently from standard DOM events?"
tags: ["events", "synthetic-events", "event-delegation"]
difficulty: "medium"
---

## Short answer

React wraps native browser events in a cross-browser **SyntheticEvent** object and attaches handlers using **event delegation**: instead of one listener per element, React registers listeners once on the root container (since React 17; on `document` before that). Handlers use camelCase names, receive functions rather than strings, and you must call `e.preventDefault()` explicitly instead of returning `false`.

## Explanation

Delegation is like a hotel reception desk. Instead of a doorbell on every room, all visitors go to reception, which knows which room each visitor wants and forwards them.

### Key differences

| Aspect | DOM | React |
|--------|-----|-------|
| Naming | `onclick` (lowercase) | `onClick` (camelCase) |
| Handler value | String `"handle()"` or `addEventListener` | Function reference `{handle}` |
| Prevent default | `return false` works in inline handlers | Must call `e.preventDefault()` |
| Event object | Native `Event` | `SyntheticEvent` wrapping `e.nativeEvent` |
| Attachment | Per element | Delegated to the React root |
| Cleanup | Manual `removeEventListener` | Automatic on unmount |
| `onChange` on inputs | Fires on blur | Fires on every keystroke (like `input`) |

### SyntheticEvent

- Same interface as native events: `target`, `currentTarget`, `stopPropagation()`, `preventDefault()`.
- Normalises browser inconsistencies.
- Event pooling was removed in React 17, so you can safely use `e` asynchronously.
- Access the raw event via `e.nativeEvent`.

### Propagation

React events bubble through the **React tree**, not just the DOM tree. That means an event inside a portal bubbles to its React parent even though the DOM node lives elsewhere. Capture-phase handlers use the `Capture` suffix: `onClickCapture`.

### Some events behave differently

- `onScroll` does not bubble in React 17+ (matches the browser).
- `onFocus`/`onBlur` use `focusin`/`focusout` under the hood, so they bubble.

## Example

```jsx
export default function Toolbar() {
  function handleSave(e) {
    e.preventDefault();          // stop form submit / link navigation
    e.stopPropagation();         // do not trigger the parent's onClick
    console.log(e.type, e.nativeEvent instanceof MouseEvent); // "click" true
  }

  return (
    <div onClick={() => console.log("toolbar clicked")}>
      <a href="/save" onClick={handleSave}>Save</a>
      {/* pass an argument with an inline arrow */}
      <button onClick={() => console.log("delete", 42)}>Delete</button>
    </div>
  );
}
```

## Common mistakes

- Writing `onClick={handleClick()}`, which calls the function during render instead of on click.
- Expecting `return false` to prevent default behaviour.
- Mixing native `addEventListener` on `document` with React handlers and being surprised by ordering; native listeners on the root may run in a different order than expected.
- Forgetting to remove native listeners added in `useEffect`.

## Follow-up questions

- **Why did React 17 move delegation from `document` to the root?** So multiple React versions or apps can coexist on one page and `stopPropagation` works predictably with non-React code.
- **When would you use a native listener?** For events on `window`/`document` (resize, keydown shortcuts) or non-React DOM, added in `useEffect` with cleanup.
- **Do events from portals bubble to React parents?** Yes, propagation follows the React component tree.

## Quick recap

- SyntheticEvent wraps native events with a consistent API.
- One delegated listener per root, not per element.
- camelCase handlers, function references, explicit `preventDefault()`.
- Events bubble through the React tree, including portals.
