---
title: "What is useFormStatus and why must it be in a child component?"
tags: ["react-19", "useformstatus", "forms", "react-dom", "hooks"]
difficulty: "easy"
asked_as: ["How do you disable a submit button while a form is submitting?", "Why does useFormStatus always return pending false?"]
---

## Short answer

`useFormStatus()` from **`react-dom`** returns `{ pending, data, method, action }` for the **parent `<form>`** that is currently submitting an Action. It lets a reusable component, like a submit button, show a loading state **without prop drilling**. It only reads a form rendered **above** it in the tree, so calling it in the same component that renders the `<form>` always returns `pending: false`.

## Explanation

`useFormStatus` works like a context that each `<form>` provides automatically. A component deep inside the form can ask, "is my form submitting right now?"

| Field | Meaning |
| --- | --- |
| `pending` | `true` while the parent form's action is running |
| `data` | The `FormData` being submitted (or `null`) |
| `method` | `"get"` or `"post"` |
| `action` | The function passed to the form's `action` prop (or `null`) |

This makes design-system components simple: one `<SubmitButton>` works in every form of the app and disables itself automatically.

## Example

```jsx
import { useFormStatus } from "react-dom";

function SubmitButton({ children }) {
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? `Saving ${data?.get("title") ?? ""}...` : children}
    </button>
  );
}

export default function NewPost({ createPost }) {
  // useFormStatus here would NOT see this form; it must be in a child.
  return (
    <form action={createPost}>
      <input name="title" />
      <textarea name="body" />
      <SubmitButton>Publish</SubmitButton>
    </form>
  );
}
```

## Common mistakes

- Calling `useFormStatus` in the component that renders the `<form>`. Move it into a child component.
- Importing it from `react`. It comes from `react-dom`.
- Expecting it to work with `onSubmit`. It only tracks forms submitted through an Action (`action={fn}`).
- Expecting it to return a result or error. It only reports status; use `useActionState` for the result.

## Follow-up questions

- **Can it read a form that isn't its parent?** No. It always reads the closest parent form.
- **How is it different from `isPending` in `useActionState`?** `isPending` is available where the hook is called (usually the form owner). `useFormStatus` is for children that don't have access to that value.
- **Does it work with Server Functions?** Yes. Any function passed to `action`, client or server, is tracked.

## Quick recap

- `useFormStatus()` from `react-dom` gives `pending`, `data`, `method` and `action`.
- It reads only the parent `<form>`, so put it in a child component.
- Great for reusable submit buttons with no prop drilling.
- Status only; use `useActionState` for results.
