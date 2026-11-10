---
title: "What is useId and when should you use it?"
tags: ["useid", "hooks", "accessibility", "ssr", "hydration"]
difficulty: "easy"
asked_as: ["How do you generate unique IDs in React?", "Can useId be used for list keys?", "Why not use Math.random() for IDs?"]
---

## Short answer

`useId()` returns a **unique ID string that stays the same on the server and the client**. Use it to connect elements for accessibility, such as `<label htmlFor>` with an `<input id>`, or `aria-describedby` with a hint. Do **not** use it for list `key`s; keys should come from your data.

## Explanation

Accessible forms need matching IDs: a label points to an input by `id`. Hardcoding `id="email"` breaks when the component renders twice on the same page, because IDs must be unique in the document.

The usual workarounds fail in different ways:

| Approach | Problem |
| --- | --- |
| Hardcoded `id="email"` | Duplicate IDs when the component is used more than once |
| `Math.random()` or `crypto.randomUUID()` | Different value on server and client, which causes a hydration mismatch; also a new value on every render |
| A global counter `id++` | Server and client can count in a different order, which also causes a mismatch |

`useId` builds the ID from the component's **position in the React tree**, which is the same on the server and the client, so hydration matches. It is stable across re-renders of the same component.

## Example

```jsx
import { useId } from "react";

function PasswordField() {
  const id = useId();
  const hintId = `${id}-hint`; // one useId call, several related IDs

  return (
    <div>
      <label htmlFor={id}>Password</label>
      <input id={id} type="password" aria-describedby={hintId} />
      <p id={hintId}>At least 12 characters.</p>
    </div>
  );
}

export default function SignupForm() {
  // Two instances, no duplicate IDs.
  return (
    <form>
      <PasswordField />
      <PasswordField />
    </form>
  );
}
```

## Common mistakes

- Using `useId` for list keys. Keys must identify the data item, so they come from the data (for example `item.id`).
- Calling `useId` inside a loop to get many IDs. Hooks cannot be called in loops; call it once and add suffixes.
- Querying the ID with `document.querySelector("#" + id)`. The generated ID contains characters that are not valid in a CSS selector. Use `document.getElementById(id)` or a ref instead.
- Depending on the exact format of the ID string. It is an internal detail and has changed between React versions.

## Follow-up questions

- **What if two separate React apps run on one page?** Their IDs could clash. Pass `identifierPrefix` to `createRoot` or `hydrateRoot` (and to the server renderer) to give each app its own prefix.
- **Does useId work without SSR?** Yes. It still gives unique, stable IDs; SSR safety is a bonus.
- **Is useId the same as a ref?** No. A ref holds a mutable value; `useId` gives a read-only string, mainly for HTML attributes.

## Quick recap

- `useId` gives a unique ID that matches between server and client.
- Use it for `htmlFor`, `aria-*` and other attributes that link elements.
- Call it once per component and add suffixes for related IDs.
- Never use it for list keys.
