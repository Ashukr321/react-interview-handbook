---
title: "How to handle multiple events in React?"
tags: ["events", "forms", "handlers"]
difficulty: "easy"
---

## Short answer

There are three common meanings and answers. **Several event types on one element**: add several props (`onClick`, `onMouseEnter`, `onKeyDown`). **Several actions on one event**: call multiple functions inside one handler. **Many similar inputs**: use one generic handler that reads `e.target.name` (or `e.type`) to decide what to update.

## Explanation

Think of a reception desk that handles phone calls, emails and walk-ins (multiple event types), or one call that triggers logging, a reply and a calendar entry (multiple actions per event).

### 1. Multiple event types on one element

Just add each prop. React delegates all of them at the root.

### 2. Multiple actions for one event

React accepts one function per prop. Compose inside it:

```jsx
<button onClick={() => { save(); track("save"); close(); }}>Save</button>
```

Prefer a named handler when the body grows.

### 3. One handler for many inputs

Use `name` attributes and computed property keys. This keeps a form with 10 fields from needing 10 handlers.

### 4. One handler for several event types

Switch on `e.type` when the logic is mostly shared (e.g. `onFocus` and `onBlur` toggling a flag).

### 5. Combining a parent's handler with your own

When building reusable components, call both the internal and the user-provided handler, and respect `e.defaultPrevented` if you want consumers to be able to cancel your default behaviour.

## Example

```jsx
import { useState } from "react";

export default function SignupForm({ onFocusChange }) {
  const [form, setForm] = useState({ email: "", password: "", newsletter: false });
  const [focused, setFocused] = useState(null);

  // One handler for all inputs
  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  // One handler for two event types
  function handleFocus(e) {
    const next = e.type === "focus" ? e.target.name : null;
    setFocused(next);
    onFocusChange?.(next); // also call the consumer's callback
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); console.log(form); }}>
      <input name="email" value={form.email} onChange={handleChange}
             onFocus={handleFocus} onBlur={handleFocus} />
      <input name="password" type="password" value={form.password} onChange={handleChange}
             onFocus={handleFocus} onBlur={handleFocus} />
      <label>
        <input name="newsletter" type="checkbox" checked={form.newsletter} onChange={handleChange} />
        Newsletter
      </label>
      <p>Focused: {focused ?? "none"}</p>
      <button
        type="submit"
        onMouseEnter={() => console.log("hover")}
        onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
      >
        Sign up
      </button>
    </form>
  );
}
```

## Common mistakes

- Writing the same prop twice (`onClick={a} onClick={b}`); the last one wins silently.
- Forgetting `name` attributes so the generic handler cannot tell fields apart.
- Using `e.target.value` for checkboxes instead of `e.target.checked`.
- Spreading `...props` after your own `onClick` in a reusable component, so the consumer's handler replaces yours instead of running alongside.

## Follow-up questions

- **Do many event props slow React down?** No, they share root-level listeners; each prop just adds an entry React checks during dispatch.
- **How do you merge handlers in a reusable component?** Create `handleClick = (e) => { props.onClick?.(e); if (!e.defaultPrevented) internalLogic(); }`.
- **When is `useReducer` better for forms?** When updates have more logic than "set field", such as validation or dependent fields.

## Quick recap

- Many event types: many props.
- Many actions: one handler that calls several functions.
- Many inputs: one handler using `name` and computed keys.
- In reusable components, merge consumer and internal handlers deliberately.
