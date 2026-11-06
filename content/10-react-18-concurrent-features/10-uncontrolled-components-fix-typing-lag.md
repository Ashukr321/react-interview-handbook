---
title: "Why do uncontrolled components fix typing lag?"
tags: ["forms", "performance", "uncontrolled", "re-render"]
difficulty: "medium"
---

## Short answer

In a controlled input every keystroke calls `setState`, which re-renders the component that owns that state and, unless memoized, all its children. If that tree is large, each keypress waits for a render. An uncontrolled input keeps its value in the DOM, so typing triggers **no React render at all**; you read the value with a ref or `FormData` only when you need it.

## Explanation

Controlled input flow on every key:

```text
keydown -> onChange -> setState -> render owner + children -> diff -> commit -> value painted
```

Uncontrolled input flow:

```text
keydown -> browser updates the input's value -> painted
(React not involved until submit / blur / ref read)
```

Analogy: a controlled input is like asking a manager to approve every letter you type. An uncontrolled input lets you type freely and hand in the finished form.

### When controlled inputs lag

- The state lives high up (a big form component or context) and the whole page re-renders.
- Expensive children aren't memoized.
- Validation or derived computations run on every render.

### Options to fix lag

| Approach | Typing cost | When to use |
|---|---|---|
| Uncontrolled input + ref / `FormData` | Zero renders | Submit-time values, large forms |
| React Hook Form (`register`) | Zero renders per key, subscribed updates | Real-world forms with validation |
| Colocate state in a small input component | Renders only that component | Live preview needed nearby |
| `useDeferredValue` for the heavy part | Urgent render is small | Live filtering of big lists |

React 19 pushes uncontrolled forms further: `form action={fn}` receives a `FormData` object, and `useActionState` handles pending and result state.

## Example

```jsx
import { useRef } from "react";

// Uncontrolled: no re-render while typing
function ProfileForm({ onSave }) {
  const nameRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSave({ name: nameRef.current.value, bio: data.get("bio") });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} name="name" defaultValue="Ada" />
      <textarea name="bio" defaultValue="" />
      <button type="submit">Save</button>
    </form>
  );
}

// React 19 form action
function NewsletterForm({ subscribe }) {
  return (
    <form action={async (formData) => subscribe(formData.get("email"))}>
      <input name="email" type="email" required />
      <button>Subscribe</button>
    </form>
  );
}
```

## Common mistakes

- Using `value` without `onChange` (React warns and the field becomes read-only). Uncontrolled inputs use `defaultValue` / `defaultChecked`.
- Switching an input between controlled and uncontrolled (e.g. `value={undefined}` then a string).
- Going uncontrolled when you actually need live formatting (e.g. credit-card masking) on every key.
- Blaming the input when the real cause is state stored too high in the tree.

## Follow-up questions

- **How do you reset an uncontrolled form?** Call `formRef.current.reset()`, or change the form's `key` to remount it. React 19 resets forms automatically after a successful `action`.
- **How do you validate uncontrolled inputs?** Use native constraints (`required`, `pattern`) or a library like React Hook Form with a Zod resolver.
- **Is controlled always bad?** No. Small forms are fine; profile before switching.

## Quick recap

- Controlled = render per keystroke; uncontrolled = none.
- DOM holds the value; read via ref or `FormData`.
- Use `defaultValue`, not `value`.
- React Hook Form and React 19 form actions build on this idea.
- Colocating state is the other big fix.
