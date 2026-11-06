---
title: "What is a synthetic event in React?"
tags: ["events", "synthetic-events"]
difficulty: "easy"
---

## Short answer

A SyntheticEvent is React's **cross-browser wrapper around the native DOM event**. Every handler like `onClick` receives one. It has the same interface as a native event (`target`, `currentTarget`, `type`, `preventDefault()`, `stopPropagation()`), behaves consistently across browsers, and exposes the original event as `e.nativeEvent`.

## Explanation

A synthetic event is like a universal travel adapter: whatever the socket (browser), your plug (handler code) fits the same way.

### What it gives you

- **Consistent API**: normalized properties across browsers (for example `e.key` for keyboard events).
- **Propagation through the React tree**: `stopPropagation()` stops other React handlers, including across portals.
- **Specialized types**: `MouseEvent`, `KeyboardEvent`, `ChangeEvent`, `FocusEvent`, `PointerEvent`, etc. (in TypeScript: `React.MouseEvent<HTMLButtonElement>`).
- **Access to the real event**: `e.nativeEvent` when you need something React does not expose.

### Useful properties

| Property / method | Meaning |
|---|---|
| `e.target` | Element where the event started |
| `e.currentTarget` | Element whose handler is running |
| `e.type` | `"click"`, `"keydown"`, ... |
| `e.preventDefault()` | Stop the browser's default action |
| `e.stopPropagation()` | Stop bubbling to other React handlers |
| `e.isDefaultPrevented()` / `e.isPropagationStopped()` | Check flags |
| `e.nativeEvent` | The underlying browser event |
| `e.persist()` | No-op since React 17 (pooling removed) |

### Small behavioural differences from native

- `onChange` fires on every keystroke, not on blur.
- `onMouseEnter`/`onMouseLeave` are emulated with `mouseout`/`mouseover` so they work with delegation.
- `onFocus`/`onBlur` use `focusin`/`focusout` under the hood so they bubble in React.
- `onScroll` does not bubble (since React 17).

## Example

```tsx
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";

export default function Demo() {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault(); // stop navigation
    console.log(e.currentTarget.href, e.nativeEvent.type); // "click"
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") console.log("submit", e.currentTarget.value);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setTimeout(() => console.log(e.target.value), 100); // safe since React 17
  }

  return (
    <>
      <a href="/docs" onClick={handleClick}>Docs</a>
      <input onKeyDown={handleKey} onChange={handleChange} />
    </>
  );
}
```

## Common mistakes

- Calling `e.persist()` thinking it is still needed; it does nothing in React 17+.
- Returning `false` from a handler to prevent default (works in old HTML attributes, not in React).
- Confusing `e.target` and `e.currentTarget` in handlers on containers.
- Calling `e.nativeEvent.stopImmediatePropagation()` expecting it to stop other React handlers. Use `e.stopPropagation()`.

## Follow-up questions

- **How do you get the native event?** `e.nativeEvent`.
- **Is the synthetic event the same object across handlers?** Within one dispatch, handlers along the path usually share one synthetic object, with `currentTarget` updated per handler. Treat that as an implementation detail and rely on its fields, not its identity.
- **Why does `onMouseEnter` not bubble?** It mirrors browser semantics; React emulates it so it fires on each entered element only.

## Quick recap

- SyntheticEvent = React wrapper over the native event.
- Same API as DOM events, consistent across browsers.
- `e.nativeEvent` gives the original.
- No pooling since React 17; `persist()` is a no-op.
