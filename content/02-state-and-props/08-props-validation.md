---
title: "What is Props Validation?"
asked_as: ["How do you validate props in a React component?"]
tags: ["props", "proptypes", "typescript", "validation"]
difficulty: "easy"
---

## Short answer

Props validation means checking that a component receives props of the expected **type and shape**, and that required props are present, so mistakes are caught early. Traditionally this was done at runtime with the **`prop-types`** package (`Component.propTypes = {...}`), which logged console warnings in development. Today the standard is **TypeScript**, which validates props at compile time. In React 19, `propTypes` checks were removed from React itself and are silently ignored, so TypeScript (plus runtime schema validation like Zod for external data) is the recommended approach.

## Explanation

Props validation is like a form at a passport office: if you write your birth date in the name field, the clerk rejects it before it causes problems later.

### Approaches compared

| Approach | When it checks | Status | Notes |
|----------|----------------|--------|-------|
| `React.PropTypes` | Runtime (dev) | Removed in React 16 | Moved to `prop-types` package in v15.5 |
| `prop-types` package | Runtime (dev) | Ignored by React 19 | Still found in legacy code |
| TypeScript | Compile time, in the editor | Recommended | Zero runtime cost, autocompletion |
| Zod / Valibot | Runtime | Use for untrusted data | Validate API responses, form input, URL params |

### What validation gives you

- Clear errors when a prop is missing or the wrong type.
- Self-documenting component APIs.
- Safer refactoring: renaming a prop flags every caller.

### Default values

- Function components: default parameters in destructuring.
- `defaultProps` is no longer supported for function components in React 19 (classes still support it).

## Example

TypeScript (modern):

```tsx
type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick: () => void;
};

export function Button({ label, variant = "primary", disabled = false, onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

// <Button label={42} />  -> compile error: number is not assignable to string,
//                           and onClick is missing
```

`prop-types` (legacy, works only before React 19 or in class components with older React):

```jsx
import PropTypes from "prop-types";

function Avatar({ src, size }) {
  return <img src={src} width={size} height={size} alt="" />;
}

Avatar.propTypes = {
  src: PropTypes.string.isRequired,
  size: PropTypes.number,
};
```

Runtime validation of external data:

```ts
import { z } from "zod";

const UserSchema = z.object({ id: z.number(), name: z.string() });
const user = UserSchema.parse(await res.json()); // throws if the API shape is wrong
```

## Common mistakes

- Still writing `React.PropTypes`; it was removed years ago.
- Assuming `propTypes` warnings will show in a React 19 app.
- Relying on TypeScript for data coming from APIs; types are erased at runtime, so validate with a schema.
- Using `any` or overly loose types, which defeats the purpose.

## Follow-up questions

- **Does prop validation run in production?** `prop-types` checks only ran in development; TypeScript has no runtime cost at all.
- **How do you type `children`?** Use `React.ReactNode` for anything renderable.
- **How do you migrate from PropTypes?** Convert each `propTypes` object to a TypeScript type, then remove the `prop-types` import; codemods can help.

## Quick recap

- Props validation catches wrong or missing props early.
- `prop-types` was the runtime tool; React 19 ignores it.
- TypeScript is the modern, compile-time standard.
- Validate untrusted runtime data with a schema library.
