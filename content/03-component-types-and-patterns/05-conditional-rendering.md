---
title: "What is conditional rendering in React?"
asked_as: ["How would you conditionally render a component in render function?"]
tags: ["jsx", "conditional-rendering", "rendering"]
difficulty: "easy"
---

## Short answer

Conditional rendering means showing different UI depending on state or props, using plain JavaScript: `if`/early `return`, the ternary `cond ? <A /> : <B />`, logical AND `cond && <A />`, or a lookup object for many cases. Returning `null` renders nothing. JSX is just expressions, so any JavaScript that produces an element (or `null`) works.

## Explanation

Think of a traffic light: the same component shows red, yellow or green based on its state. React does not have a special `v-if` directive; you use JavaScript.

| Technique | Best for | Example |
|---|---|---|
| Early `return` | Loading/error/empty guards at the top | `if (loading) return <Spinner />;` |
| Ternary | Either/or inside JSX | `{isAdmin ? <Admin /> : <User />}` |
| `&&` | Show or show nothing | `{error && <Error msg={error} />}` |
| Variable | Complex logic kept out of JSX | `let content; if (...) content = ...` |
| Object/map lookup | Many states (status, tabs) | `{views[status]}` |
| Return `null` | Component hides itself | `if (!open) return null;` |

### Effect on state

Conditional rendering mounts and unmounts components. When `<Modal />` disappears, its state is destroyed. If you want to keep state while hidden, hide it with CSS or use React 19.2's `<Activity mode="hidden">`, which preserves state while hiding the UI.

Also note: `{cond ? <Form /> : <Form />}` at the same position keeps the same component instance (same type, same position), so state carries over. Add different `key`s to force a reset.

## Example

```jsx
function OrderStatus({ status, items, error }) {
  // 1. Early returns for guard states
  if (status === "loading") return <p>Loading...</p>;
  if (error) return <p role="alert">{error}</p>;

  // 2. Lookup object for many cases
  const badge = {
    paid: <span className="green">Paid</span>,
    pending: <span className="amber">Pending</span>,
    refunded: <span className="grey">Refunded</span>,
  }[status];

  return (
    <section>
      {badge}
      {/* 3. && with a real boolean */}
      {items.length > 0 && <ul>{items.map((i) => <li key={i.id}>{i.name}</li>)}</ul>}
      {/* 4. Ternary for either/or */}
      {items.length === 0 ? <p>No items</p> : <p>{items.length} items</p>}
    </section>
  );
}
```

## Common mistakes

- `{count && <List />}` when `count` is `0`: React renders the `0`. Use `count > 0 &&` or `!!count &&`.
- Deeply nested ternaries that nobody can read. Use early returns, a variable or a lookup object instead.
- Calling hooks inside a condition (`if (x) useState()`). Conditions go around JSX, never around hooks.
- Expecting a hidden component to keep its state after it is conditionally removed.

## Follow-up questions

- **What does a component render if it returns `undefined`?** Since React 18 it is allowed and renders nothing, but returning `null` is clearer.
- **Do `false`, `null`, `undefined` and `true` render anything?** No. Only `0`, `NaN` and strings among falsy-looking values show up.
- **How do you keep a tab's state when switching tabs?** Keep all tabs mounted and hide inactive ones (CSS or `<Activity>`), or lift the state up.

## Quick recap

- Use plain JS: `if`, ternary, `&&`, variables, lookup objects.
- Return `null` to render nothing.
- Beware `0 &&`; use real booleans.
- Removing a component destroys its state.
