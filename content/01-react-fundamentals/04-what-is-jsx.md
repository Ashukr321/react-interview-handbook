---
title: "What is JSX?"
tags: ["jsx", "basics"]
difficulty: "easy"
---

## Short answer

JSX (JavaScript XML) is a syntax extension that lets you write HTML-like markup inside JavaScript. It is not valid JavaScript on its own: a compiler (Babel, SWC, esbuild) turns it into function calls (`jsx()` from `react/jsx-runtime`, or `React.createElement` in older setups) that produce plain JavaScript objects called React elements.

## Explanation

JSX is like writing a recipe in a friendly format that a translator (the compiler) converts into precise instructions for the kitchen (React).

### What it compiles to

```jsx
const el = <h1 className="title">Hello {name}</h1>;
```

becomes roughly:

```js
import { jsx as _jsx } from "react/jsx-runtime";
const el = _jsx("h1", { className: "title", children: ["Hello ", name] });
```

which returns an object like `{ type: "h1", props: { className: "title", children: [...] } }`.

### Key rules

| Rule | Example |
|------|---------|
| Return a single root (or a Fragment) | `<>...</>` |
| Use `className`, `htmlFor` | not `class`, `for` |
| camelCase attributes and events | `onClick`, `tabIndex` |
| Embed expressions with `{}` | `{user.name}`, `{items.length > 0 && <List />}` |
| Close every tag | `<img />`, `<br />` |
| Capitalise components | `<Card />` is a component, `<card />` is an HTML tag |
| Inline styles are objects | `style={{ marginTop: 8 }}` |

### Why JSX is useful

- Markup and logic for a component live together.
- It is just JavaScript, so you use `map`, ternaries and variables instead of a template language.
- Values in `{}` are **escaped** automatically, which helps prevent XSS.
- Since React 17's new JSX transform, you no longer need `import React` in every file.

## Example

```jsx
function UserList({ users }) {
  if (users.length === 0) return <p>No users yet.</p>;

  return (
    <ul className="user-list">
      {users.map((user) => (
        <li key={user.id} style={{ fontWeight: user.isAdmin ? 700 : 400 }}>
          {user.name}
        </li>
      ))}
    </ul>
  );
}
```

## Common mistakes

- Using `if` statements directly inside JSX. Use ternaries, `&&`, or compute the value before `return`.
- `{count && <Badge />}` renders `0` when `count` is 0. Use `count > 0 &&`.
- Forgetting `key` when rendering lists.
- Thinking JSX is required. It is optional sugar; `createElement` works without it.

## Follow-up questions

- **Is JSX safe from XSS?** Text in `{}` is escaped. `dangerouslySetInnerHTML` bypasses this and needs sanitised input.
- **What is a Fragment?** A wrapper (`<>...</>` or `<Fragment key=...>`) that groups children without adding a DOM node.
- **Can browsers run JSX directly?** No. It must be compiled to JavaScript first.

## Quick recap

- JSX is HTML-like syntax that compiles to `jsx()` / `createElement` calls.
- The result is a plain object describing UI (a React element).
- Use `{}` for expressions, camelCase props, one root element.
- JSX escapes values by default.
