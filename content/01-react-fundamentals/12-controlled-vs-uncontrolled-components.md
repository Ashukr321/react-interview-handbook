---
title: "What are controlled vs. uncontrolled components?"
tags: ["forms", "controlled", "uncontrolled", "refs"]
difficulty: "easy"
---

## Short answer

A **controlled** component's form value lives in React state: you pass `value` and update it in `onChange`, so React is the single source of truth. An **uncontrolled** component lets the DOM keep its own value; you set an initial `defaultValue` and read the value when needed via a ref or `FormData`. Controlled gives fine-grained control; uncontrolled is simpler and avoids re-rendering on every keystroke.

## Explanation

Controlled is like a puppet: every move goes through the puppeteer (React). Uncontrolled is like a pet: it moves on its own and you check on it when you need to.

| | Controlled | Uncontrolled |
|---|------------|--------------|
| Source of truth | React state | The DOM |
| Props | `value` + `onChange` | `defaultValue` / `defaultChecked` |
| Read value | From state, anytime | Ref, `FormData`, or form action |
| Re-render per keystroke | Yes | No |
| Instant validation / formatting | Easy | Harder |
| Best for | Dynamic UIs, dependent fields, live validation | Simple forms, file inputs, large forms, React 19 form actions |

### React 19 makes uncontrolled forms first-class

With form **Actions**, you can pass a function to `<form action={fn}>`. React gives you a `FormData` object on submit, so many forms no longer need state per field. Combine with `useActionState` for result and pending state.

### File inputs

`<input type="file">` is always uncontrolled because its value is read-only for security reasons.

## Example

```jsx
import { useRef, useState } from "react";

// Controlled
function ControlledName() {
  const [name, setName] = useState("");
  return (
    <>
      <input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
      <p>Preview: {name}</p>
    </>
  );
}

// Uncontrolled with a ref
function UncontrolledName() {
  const inputRef = useRef(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(inputRef.current.value);
  };
  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="Guest" />
      <button type="submit">Save</button>
    </form>
  );
}

// Uncontrolled with a React 19 form action
function SignupForm() {
  async function signup(formData) {
    console.log(formData.get("email"));
  }
  return (
    <form action={signup}>
      <input name="email" type="email" required />
      <button type="submit">Sign up</button>
    </form>
  );
}
```

## Common mistakes

- Passing `value` without `onChange`, producing a read-only input and a console warning.
- Switching between controlled and uncontrolled (e.g. `value={undefined}` then a string). Initialise with `""`.
- Using both `value` and `defaultValue` on the same input.
- Making a 50-field form fully controlled with top-level state, causing sluggish typing.

## Follow-up questions

- **Which one do form libraries use?** React Hook Form is uncontrolled by default (refs) for performance; Formik is controlled.
- **How do you reset an uncontrolled form?** Call `formRef.current.reset()`, change the component `key`, or rely on React 19 auto-reset after a successful form action.
- **Can a component be both?** A reusable input can support both modes by using `value` if provided, otherwise internal state.

## Quick recap

- Controlled: React state owns the value (`value` + `onChange`).
- Uncontrolled: DOM owns it (`defaultValue` + ref/`FormData`).
- Controlled for live validation; uncontrolled for simplicity and performance.
- React 19 form actions make uncontrolled forms easy.
