---
title: "How do you handle a form with 20+ fields efficiently?"
tags: ["forms", "performance", "react-hook-form", "validation"]
difficulty: "medium"
---

## Short answer

Don't keep 20+ fields in one big `useState` object that re-renders the whole form on every keystroke. Use a form library built on **uncontrolled inputs and subscriptions**, typically React Hook Form with a schema validator like Zod, so typing in one field re-renders nothing or only that field. Split the form into sections or steps, validate on blur/submit, and drive repetitive fields from config or field arrays.

## Why it happens

- A single controlled `values` object means each keystroke calls `setValues`, re-rendering the form component and all 20+ inputs, plus any validation and derived logic.
- Validation on every change over the whole form multiplies the cost.
- Inline handlers and objects defeat `memo`, so even memoized field components re-render.
- Large forms also cause maintenance pain: copy-pasted inputs, scattered validation, and inconsistent error messages.

## How to fix it

1. **Use React Hook Form** (`register` for native inputs, `Controller` for UI-library inputs). Values live in refs; React re-renders only what subscribes.
2. **Centralize validation in a schema** (Zod/Yup via `@hookform/resolvers`) so rules and TypeScript types come from one place.
3. **Choose validation timing**: `mode: "onBlur"` or `"onSubmit"`, then re-validate on change after the first error.
4. **Split the UI**: sections or a multi-step wizard; each step can validate its own fields with `trigger([...])`.
5. **Subscribe narrowly**: `useWatch({ name: "country" })` in the component that needs it, not `watch()` at the top.
6. **Generate repetitive fields** from a config array or `useFieldArray` for dynamic lists.

```jsx
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  country: z.string().min(1, "Required"),
  vatNumber: z.string().optional(),
  // ...15 more fields
});

const fields = [
  { name: "firstName", label: "First name" },
  { name: "lastName", label: "Last name" },
  { name: "email", label: "Email", type: "email" },
];

export function CustomerForm({ onSave }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), mode: "onBlur" });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          <input type={f.type ?? "text"} {...register(f.name)} aria-invalid={!!errors[f.name]} />
          {errors[f.name] && <span role="alert">{errors[f.name].message}</span>}
        </label>
      ))}
      <select {...register("country")}>
        <option value="">Select</option>
        <option value="DE">Germany</option>
        <option value="IN">India</option>
      </select>
      <VatField control={control} register={register} />
      <button disabled={isSubmitting}>Save</button>
    </form>
  );
}

// Only this component re-renders when "country" changes
function VatField({ control, register }) {
  const country = useWatch({ control, name: "country" });
  if (country !== "DE") return null;
  return <input placeholder="VAT number" {...register("vatNumber")} />;
}
```

React 19 alternative for simple, submit-only forms: `form action={fn}` with `FormData` and `useActionState`, which needs no per-field state at all.

## How to verify

- React DevTools Profiler: type in one field and confirm only it (or nothing) renders.
- Test with CPU throttling (4x/6x) to make sure typing stays smooth.
- Test validation messages, focus on first error, and keyboard navigation.
- Check accessibility: every input has a label, errors are linked with `aria-invalid` / `aria-describedby`.

## Follow-up questions

- **Why not Formik?** It works, but it's controlled by default and re-renders more; React Hook Form is the common choice for large forms today.
- **How do you save drafts?** Debounce `watch` output into `localStorage` or an autosave API call.
- **How do you handle server validation errors?** Map them to fields with `setError("email", { message })`.

## Quick recap

- Avoid one giant controlled state object.
- React Hook Form + Zod schema.
- Validate on blur/submit, subscribe narrowly with `useWatch`.
- Split into sections or steps; generate fields from config.
- Verify with the Profiler and CPU throttling.
