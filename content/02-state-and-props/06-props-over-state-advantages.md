---
title: "What is the advantage of choosing props over states?"
tags: ["props", "state", "design", "reusability"]
difficulty: "easy"
---

## Short answer

Driving a component with props instead of internal state makes it **predictable, reusable and easy to test**: given the same props it renders the same output, it has no hidden behaviour, and the parent stays the single source of truth. Fewer stateful components also means fewer places for data to fall out of sync. Use state only for data that truly belongs to the component and changes over time.

## Explanation

A props-driven component is like a calculator: put in the same numbers, always get the same answer. A stateful one is like a calculator with memory: useful, but its answer depends on history you cannot see.

### Advantages of props

| Advantage | Why |
|-----------|-----|
| Reusability | The same component works in many contexts by passing different props |
| Predictability | Output depends only on inputs, like a pure function |
| Single source of truth | Data lives in one owner; no duplicate copies to sync |
| Easier testing | Render with props, assert output; no interaction setup needed |
| Easier memoization | `React.memo` works well when output depends only on props |
| Parent control | Parent can reset, validate or coordinate values (controlled components) |
| Simpler debugging | Fewer moving parts; React DevTools shows props flowing from one place |

### When state is still the right choice

- UI-only, local concerns nobody else needs: whether a dropdown is open, hover state, a text field's draft value.
- Data that changes over time due to user interaction and is not derived from props.

A good pattern: make reusable components support both, i.e. **controlled** (`value` + `onChange` props) with an optional **uncontrolled** fallback (`defaultValue` + internal state), like native inputs.

## Example

```jsx
import { useState } from "react";

// Props-driven: reusable, testable, parent controls it
function Rating({ value, max = 5, onChange }) {
  return (
    <div role="radiogroup" aria-label="Rating">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          role="radio"
          aria-checked={i + 1 === value}
          onClick={() => onChange(i + 1)}
        >
          {i < value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm() {
  const [rating, setRating] = useState(0); // state lives in one owner
  return (
    <>
      <Rating value={rating} onChange={setRating} />
      <button disabled={rating === 0}>Submit {rating}/5</button>
    </>
  );
}
```

If `Rating` kept its own state, the form could not disable the submit button or reset the rating without awkward workarounds.

## Common mistakes

- Turning every piece of UI data into state "for flexibility", which duplicates data and causes sync bugs.
- Making everything props, so state gets lifted too high and causes prop drilling and broad re-renders.
- Copying props into state to "make them editable" instead of using a controlled pattern.

## Follow-up questions

- **Isn't props-only just moving state somewhere else?** Yes, deliberately: state lives in the component that actually owns the decision, and presentational components stay simple.
- **How do you avoid prop drilling with this approach?** Use composition (`children`), Context, or a store for widely shared values.
- **What is a pure component?** One whose output depends only on props (and state), with no side effects in render; `React.memo` can skip re-rendering it.

## Quick recap

- Props make components predictable and reusable.
- One owner of state avoids sync bugs.
- Props-driven components are easier to test and memoize.
- Keep state for local, changing, UI-only data.
