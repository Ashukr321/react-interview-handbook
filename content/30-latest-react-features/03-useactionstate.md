---
title: "What is useActionState and how do you use it?"
tags: ["react-19", "useactionstate", "actions", "forms", "hooks"]
difficulty: "medium"
asked_as: ["useActionState vs useState", "What happened to useFormState?", "How do you show server validation errors in React 19?"]
---

## Short answer

`useActionState(action, initialState)` returns `[state, dispatchAction, isPending]`. You pass `dispatchAction` to a form (or call it inside a transition). When it runs, React calls `action(previousState, payload)`, and **whatever the action returns becomes the new `state`**. It is the standard way to show the result of a form submit, such as a validation error or success message, together with a pending flag. It replaced the canary-only `useFormState`.

## Explanation

Think of it as `useReducer` for async work: the action receives the previous state and some input, and returns the next state. The difference is that it can be async, and React gives you `isPending` while it runs.

```text
 submit form
     |
     v
 action(prevState, formData)  --await-->  return newState
     |                                          |
  isPending = true                       state = newState, isPending = false
```

### Signature

```js
const [state, dispatchAction, isPending] = useActionState(
  action,        // async (previousState, payload) => nextState
  initialState,  // used until the first action finishes
  permalink      // optional: URL for progressive enhancement with Server Functions
);
```

### Behavior worth knowing

- Calls are **queued**: if the user submits twice, the second action receives the first one's result as `previousState`.
- When used as a form `action`, the payload is the `FormData`.
- Calling `dispatchAction` manually (not from a form) must happen inside `startTransition`, otherwise React warns and `isPending` doesn't update.

## Example

```jsx
import { useActionState } from "react";

async function signup(prevState, formData) {
  const email = formData.get("email");
  if (!email.includes("@")) {
    return { error: "Enter a valid email", email };
  }
  const res = await fetch("/api/signup", { method: "POST", body: formData });
  if (!res.ok) return { error: "Signup failed, try again", email };
  return { error: null, success: true, email: "" };
}

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, {
    error: null,
    email: "",
  });

  if (state.success) return <p>Check your inbox!</p>;

  return (
    <form action={formAction}>
      {/* defaultValue keeps what the user typed after a failed submit */}
      <input name="email" defaultValue={state.email} />
      <button disabled={isPending}>{isPending ? "Signing up..." : "Sign up"}</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

## Common mistakes

- Forgetting that the action's **first** argument is the previous state, so `formData` is the second. Writing `async (formData) => ...` gives you the state object instead.
- Throwing for expected errors like validation. A thrown error goes to the error boundary; return an error value instead.
- Calling `dispatchAction()` in an `onClick` without `startTransition`.
- Importing it from `react-dom`. It is in `react`; only `useFormStatus` is in `react-dom`.

## Follow-up questions

- **`useActionState` vs `useTransition`?** `useTransition` only gives `isPending`. `useActionState` also stores the action's result and passes the previous state along.
- **What is the permalink for?** With a Server Function and progressive enhancement, if the form submits before JavaScript loads, the browser navigates to that URL.
- **Can it work with Server Functions?** Yes. Pass a `"use server"` function as the action; the returned value is sent back to the client.

## Quick recap

- Returns `[state, dispatchAction, isPending]`.
- The action gets `(previousState, payload)` and returns the next state.
- Return errors as state; throw only for unexpected failures.
- It replaced `useFormState` and lives in `react`.
