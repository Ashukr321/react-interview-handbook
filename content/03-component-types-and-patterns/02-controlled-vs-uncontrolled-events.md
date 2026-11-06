---
title: "What are controlled & uncontrolled events?"
tags: ["events", "forms", "controlled", "uncontrolled"]
difficulty: "medium"
---

## Short answer

"Controlled vs uncontrolled events" is not an official React term; interviewers usually mean **who handles the event and owns the resulting state**. In a *controlled* flow, a React handler (like `onChange`) receives every event and pushes the change into state, which then drives the UI. In an *uncontrolled* flow, the browser handles the event natively and React only reads the result later (via a ref or `FormData`), or the event is handled by a native listener React does not manage.

## Explanation

Picture a shop. In a controlled shop, every customer request goes through the manager (React state) before anything happens. In an uncontrolled shop, staff (the DOM) act on their own and the manager just checks the till at closing time.

### Controlled event flow

1. User types a key.
2. React calls your `onChange` with a synthetic event.
3. You call `setState(e.target.value)` (or decide not to).
4. React re-renders and writes the new value back to the input.

You can intercept, transform or reject every change.

### Uncontrolled event flow

1. User types a key.
2. The browser updates the input's value itself. No React state changes, no re-render.
3. On submit (or whenever needed), you read `ref.current.value` or `new FormData(form)`.

A second meaning interviewers sometimes have in mind: events attached with `addEventListener` in an effect are "outside" React. They do not use the synthetic event system, are not automatically cleaned up, and you must remove them yourself.

| | Controlled | Uncontrolled |
|---|---|---|
| Who reacts to each event | Your React handler | The browser |
| State location | React state | DOM |
| Can block/transform input | Yes | Not easily |
| Re-render per event | Yes | No |

## Example

```jsx
import { useState, useRef, useEffect } from "react";

function Quantity() {
  // Controlled: every change passes through the handler
  const [qty, setQty] = useState("1");
  const handleChange = (e) => {
    if (/^\d*$/.test(e.target.value)) setQty(e.target.value); // reject non-digits
  };
  return <input value={qty} onChange={handleChange} />;
}

function Comment() {
  // Uncontrolled: the browser handles typing, React reads on submit
  const formAction = (formData) => console.log(formData.get("comment"));
  return (
    <form action={formAction}>
      <textarea name="comment" defaultValue="" />
      <button>Post</button>
    </form>
  );
}

function WindowWidth() {
  // Native listener outside React's event system: clean it up yourself
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return <p>{w}px</p>;
}
```

## Common mistakes

- Thinking `onChange` in React equals the native `change` event. React's `onChange` fires on every keystroke (native `input` event semantics).
- Adding native listeners in effects without a cleanup, causing leaks and duplicate handlers in Strict Mode.
- Mixing both styles on one input (`value` and `defaultValue` together), which React warns about.

## Follow-up questions

- **Which is better for performance?** Uncontrolled, because typing does not re-render. Controlled is better when the UI must respond to each change.
- **When must you use a native listener instead of a React prop?** For `window`/`document` events, or when you need `{ passive: false }` to call `preventDefault()` on `wheel`/`touchmove`.

## Quick recap

- Not an official term: it is about who owns the event's result.
- Controlled: React handler + state on every event.
- Uncontrolled: browser handles it, React reads later.
- Native listeners live outside React and need manual cleanup.
