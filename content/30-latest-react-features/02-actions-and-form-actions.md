---
title: "What are Actions in React 19?"
tags: ["react-19", "actions", "forms", "transitions"]
difficulty: "medium"
asked_as: ["How do form actions work in React 19?", "What is an async transition?", "How does <form action={fn}> differ from onSubmit?"]
---

## Short answer

An **Action** is a function, usually async, that runs inside a transition. You can pass one to `<form action={fn}>`, `<button formAction={fn}>` or `startTransition(async () => ...)`. React then handles the parts you used to write by hand: it tracks **pending state**, keeps the UI responsive, sends **errors** to the nearest error boundary, works with **optimistic updates**, and **resets uncontrolled form fields** after a successful submit.

## Explanation

Before React 19, a form submit usually looked like this: `e.preventDefault()`, `setLoading(true)`, `try/await/catch`, `setError`, `setLoading(false)`, then reset the inputs. Every form repeated the same steps.

React 19 lets transitions accept **async functions**. While the function runs, `isPending` is `true`, and the UI stays interactive because the work is low priority.

### Ways to run an Action

| Where | What the function receives |
| --- | --- |
| `<form action={fn}>` | `FormData` of the form |
| `<button formAction={fn}>` | `FormData`; overrides the form's action for that button |
| `startTransition(async () => ...)` | Nothing; you call it yourself |
| `useActionState(fn, initial)` | `(previousState, payload)` |

### What React does for form actions

- Calls `fn(formData)`; there is no need for `preventDefault`.
- Wraps the call in a transition, so `useFormStatus` and `useActionState` can show pending state.
- After the action succeeds, it **resets uncontrolled fields**. Call `requestFormReset(form)` from `react-dom` to reset manually.
- If a Server Function is used as the action, the form can even **submit before JavaScript loads** (progressive enhancement).

## Example

```jsx
import { useState, useTransition } from "react";

// 1. Async transition with useTransition
function UpdateName({ updateName }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const err = await updateName(name);
      // State updates after an await must be wrapped again (current limitation).
      startTransition(() => setError(err));
    });
  };

  return (
    <>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleSubmit} disabled={isPending}>Update</button>
      {error && <p>{error}</p>}
    </>
  );
}

// 2. Form action: FormData in, fields reset after success
function Newsletter({ subscribe }) {
  async function action(formData) {
    await subscribe(formData.get("email"));
  }
  return (
    <form action={action}>
      <input name="email" type="email" required />
      <button>Subscribe</button>
    </form>
  );
}
```

## Common mistakes

- Still calling `e.preventDefault()`. With `action={fn}`, React already prevents the native navigation.
- Using controlled inputs and expecting the automatic reset. The reset only clears uncontrolled fields; controlled values come from your state.
- Forgetting that state updates after an `await` inside `startTransition` are not part of the transition yet. Wrap them in another `startTransition`.
- Treating a thrown error as a silent failure. Errors in Actions go to the nearest error boundary; return an error value (for example with `useActionState`) if you want to show it inline.

## Follow-up questions

- **Is `onSubmit` deprecated?** No. Use it when you need full control, such as client-side validation libraries. Actions are the simpler default.
- **How does this work with Server Functions?** A `"use server"` function can be passed straight to `action`. React sends the form data to the server and runs it there.
- **Why use transitions for this?** They are interruptible, so typing in another input stays responsive while the action is pending.

## Quick recap

- An Action is an async function run in a transition.
- Use it with `<form action>`, `formAction`, `startTransition` or `useActionState`.
- React tracks pending state, errors and form resets for you.
- Wrap state updates after `await` in another `startTransition`.
