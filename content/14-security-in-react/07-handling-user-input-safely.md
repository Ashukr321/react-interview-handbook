---
title: "How do you handle user input safely in React forms?"
tags: ["security", "forms", "validation", "sanitization"]
difficulty: "medium"
---

## Short answer

Treat all user input as untrusted. In React, render input as text through JSX (never via `dangerouslySetInnerHTML`), validate it on the client for UX with a schema (Zod, Yup, HTML constraints), and always validate and sanitize again on the server, because client checks can be bypassed. Sanitize for the context where the data ends up: HTML, URL, SQL, shell, or file path.

## Explanation

Client-side validation is a polite sign on the door saying "please wipe your feet". It helps honest users. The server is the security guard who actually checks bags. An attacker never uses your form; they call the API directly with `curl`.

### Layers of safe input handling

| Layer | Purpose | Tooling |
|---|---|---|
| Input constraints | Fast feedback | `type="email"`, `maxLength`, `required`, `pattern` |
| Schema validation | Shape, types, ranges | Zod, Yup, Valibot with React Hook Form |
| Rendering | Prevent XSS | JSX text, DOMPurify only if HTML is required |
| Server validation | Real enforcement | Same schema shared server-side |
| Output encoding | Context-specific | Parameterized SQL, URL encoding, escaping |

### Rules of thumb

- **Validate, do not "clean" silently**: reject bad input with a clear message instead of guessing what the user meant.
- **Allow-list over block-list**: define what is valid (e.g. `^[a-z0-9_]{3,20}$`) instead of trying to block every bad character.
- **Never build HTML strings** from input. If users need formatting, use Markdown rendered to React elements, or sanitize the HTML output.
- **URLs**: only accept `http`/`https`.
- **Files**: check type and size on the client for UX, but the server must verify content and store files outside the web root.
- **Do not trust hidden fields** or disabled inputs; they are editable in DevTools.

## Example

```jsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// share this schema with the server so both sides enforce the same rules
const schema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,20}$/, "3-20 lowercase letters, digits or _"),
  website: z.string().url().refine((u) => /^https?:\/\//.test(u), "Only http(s) links").optional(),
  bio: z.string().max(280),
});

export function ProfileForm({ onSave }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  const bio = watch("bio") ?? "";

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <input {...register("username")} autoComplete="username" />
      {errors.username && <p role="alert">{errors.username.message}</p>}

      <input {...register("website")} type="url" />
      {errors.website && <p role="alert">{errors.website.message}</p>}

      <textarea {...register("bio")} maxLength={280} />
      {/* preview rendered as text: any <script> shows up literally */}
      <p>{bio}</p>

      <button type="submit">Save</button>
    </form>
  );
}
```

## Common mistakes

- Relying only on client-side validation.
- Using `dangerouslySetInnerHTML` for a "live preview" of rich text without sanitizing.
- Escaping HTML before storing it, then double-escaping or forgetting other contexts (SQL, CSV injection with leading `=`).
- Showing raw server error messages that echo the input back unescaped.

## Follow-up questions

- **Controlled or uncontrolled inputs: does it matter for security?** No. Both deliver strings; security depends on how you validate and render them.
- **What is CSV/formula injection?** A cell starting with `=`, `+`, `-` or `@` can run formulas when an exported CSV opens in Excel; prefix or escape such values on export.
- **Should you trim and normalize input?** Yes, normalize (trim, Unicode NFC, lowercase emails) before validating so checks are consistent.

## Quick recap

- All input is untrusted; the server is the real gate.
- Validate with a shared schema, allow-list where possible.
- Render as JSX text; sanitize only when HTML is unavoidable.
- Encode output for the context it is used in.
