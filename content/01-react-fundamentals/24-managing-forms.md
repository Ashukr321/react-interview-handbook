---
title: "How would you manage forms in a React application efficiently?"
tags: ["forms", "react-hook-form", "validation", "actions"]
difficulty: "medium"
---

## Short answer

For small forms, controlled inputs with `useState` (or a single state object) are fine. For larger forms I use **React Hook Form** with a schema validator like **Zod**, because it keeps inputs uncontrolled and avoids re-rendering on every keystroke. In React 19, simple forms that submit to a server can use **form Actions** with `useActionState` and `useFormStatus`, reading values from `FormData` without per-field state.

## Explanation

Managing forms is like running a checkout counter. A tiny shop can check every item by hand (controlled state). A supermarket needs a scanner system (a form library) that handles many items without the cashier re-counting the whole basket every time one item is added.

### Options

| Approach | Good for | Trade-off |
|----------|----------|-----------|
| Controlled `useState` | 1-5 fields, live formatting | Re-render per keystroke |
| Uncontrolled + `FormData` | Simple submit-and-forget forms | Less live feedback |
| React 19 form Actions | Server mutations, progressive enhancement | Validation UX is up to you |
| React Hook Form + Zod | Large, dynamic, validated forms | Extra dependency |
| Formik | Legacy codebases | Controlled, slower on big forms |

### What makes a form efficient

- **Minimise re-renders**: uncontrolled inputs or isolated field components.
- **Schema validation**: one Zod schema shared by client and server, with inferred TypeScript types.
- **Validate on blur or submit**, not on every keystroke, unless the UX needs it.
- **Accessible errors**: `aria-invalid`, `aria-describedby`, focus the first invalid field.
- **Pending state**: disable submit and show progress to prevent double submits.
- **Server validation stays mandatory**; client validation is for UX only.

## Example

```jsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    await fetch("/api/login", { method: "POST", body: JSON.stringify(data) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" {...register("email")} aria-invalid={!!errors.email} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="password">Password</label>
      <input id="password" type="password" {...register("password")} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <button disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}
```

React 19 Action version:

```jsx
import { useActionState } from "react";

async function subscribe(prevState, formData) {
  const email = formData.get("email");
  if (!email.includes("@")) return { error: "Invalid email" };
  await fetch("/api/subscribe", { method: "POST", body: formData });
  return { success: true };
}

export function Newsletter() {
  const [state, formAction, isPending] = useActionState(subscribe, {});
  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <button disabled={isPending}>Subscribe</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p>Thanks!</p>}
    </form>
  );
}
```

## Common mistakes

- Holding a big form in one top-level `useState` object, re-rendering every field on each keystroke.
- Trusting client-side validation alone.
- Missing labels and error announcements.
- Not disabling the submit button while pending, causing duplicate submissions.

## Follow-up questions

- **Why is React Hook Form fast?** It registers inputs via refs and subscribes only to the form state you read, so typing does not re-render the whole form.
- **How do you handle dynamic field lists?** `useFieldArray` in React Hook Form, keyed by stable IDs.
- **How do you share validation with the server?** Export the same Zod schema and parse the request body with it.

## Quick recap

- Small forms: controlled state; big forms: React Hook Form + Zod.
- React 19 Actions simplify server-submitting forms.
- Minimise re-renders, validate with a schema, show pending state.
- Always validate on the server too.
