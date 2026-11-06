---
title: "What are controlled and uncontrolled components?"
tags: ["forms", "controlled", "uncontrolled", "refs"]
difficulty: "easy"
---

## Short answer

A **controlled component** is a form element whose value lives in React state: you pass `value` and update it in `onChange`, so React is the single source of truth. An **uncontrolled component** keeps its value inside the DOM itself; you give it an optional `defaultValue` and read the value when you need it, usually with a ref or from `FormData` on submit.

## Explanation

Think of a controlled input as a puppet: it shows exactly what React tells it to show, and every keystroke is a request ("the user typed *a*") that React may accept, change or reject. An uncontrolled input is a normal HTML input that React leaves alone, like a notepad you only read at the end.

| | Controlled | Uncontrolled |
|---|---|---|
| Source of truth | React state | The DOM |
| Props used | `value` / `checked` + `onChange` | `defaultValue` / `defaultChecked` |
| Read value | From state, any time | Ref or `FormData`, on demand |
| Re-renders per keystroke | Yes | No |
| Live validation, formatting, dependent fields | Easy | Awkward |
| Best for | Dynamic forms, instant feedback | Simple forms, file inputs, wrapping non-React widgets |

### When to choose which

- Use **controlled** when the UI reacts to the value as the user types: validation messages, disabling a button, masking a phone number, syncing two fields.
- Use **uncontrolled** when you only need the value on submit. React 19 form Actions (`<form action={fn}>`) make this style very natural because the action receives `FormData` directly.
- `<input type="file">` is always uncontrolled because its value is read-only for security reasons.
- Libraries like React Hook Form are mostly uncontrolled under the hood for performance.

## Example

```jsx
import { useState, useRef } from "react";

// Controlled: React owns the value
function ControlledName() {
  const [name, setName] = useState("");
  return (
    <>
      <input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
      <p>Hello, {name || "stranger"}</p>
    </>
  );
}

// Uncontrolled: the DOM owns the value
function UncontrolledName() {
  const inputRef = useRef(null);
  function handleSubmit(e) {
    e.preventDefault();
    alert(inputRef.current.value);
  }
  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="Ada" />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Common mistakes

- Passing `value` without `onChange`: the input becomes read-only and React warns. Use `defaultValue` or add a handler (or `readOnly`).
- Switching from uncontrolled to controlled by starting with `value={undefined}` and later setting a string. Initialise state with `""`, not `undefined` or `null`.
- Using `defaultValue` and expecting it to update when props change. It is only read on mount; change the `key` to reset it.
- Making huge forms fully controlled at the top level, causing the whole form to re-render on every keystroke.

## Follow-up questions

- **How do you reset an uncontrolled form?** Call `formRef.current.reset()` or remount it by changing its `key`. React 19 also resets forms automatically after a successful form Action.
- **Can a component be partly controlled?** Yes. A custom component can accept an optional `value` prop and fall back to internal state when it is absent, like many design-system inputs do.
- **Why is a controlled input sometimes laggy?** Every keystroke re-renders the owning component; move state down, split the form, or use `useDeferredValue` for expensive derived UI.

## Quick recap

- Controlled = value in React state, `value` + `onChange`.
- Uncontrolled = value in the DOM, `defaultValue` + ref or `FormData`.
- Controlled gives control; uncontrolled gives simplicity and fewer renders.
- File inputs are always uncontrolled.
