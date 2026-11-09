---
title: "What are the different data types available in React.PropTypes?"
asked_as: ["What are different types of PropTypes?"]
tags: ["proptypes", "props", "validation", "typescript"]
difficulty: "easy"
---

## Short answer

The `prop-types` package (formerly `React.PropTypes`) provides validators for **primitives** (`string`, `number`, `bool`, `func`, `array`, `object`, `symbol`, `bigint`), **renderables** (`node`, `element`, `elementType`), **specific values** (`oneOf`, `instanceOf`), **compound shapes** (`oneOfType`, `arrayOf`, `objectOf`, `shape`, `exact`), and `any`. Any validator can be chained with `.isRequired`. In modern React 19 code, the same constraints are expressed with TypeScript types.

## Explanation

PropTypes are like labels on storage boxes: "books only", "fragile", "must not be empty". They do not stop you from packing the wrong thing, but they warn you (in development) when you do.

### Validator reference

| Validator | Accepts | TypeScript equivalent |
|-----------|---------|-----------------------|
| `PropTypes.string` | String | `string` |
| `PropTypes.number` | Number | `number` |
| `PropTypes.bool` | Boolean | `boolean` |
| `PropTypes.func` | Function | `() => void` |
| `PropTypes.array` | Any array | `unknown[]` |
| `PropTypes.object` | Any object | `object` / `Record<string, unknown>` |
| `PropTypes.symbol` | Symbol | `symbol` |
| `PropTypes.bigint` | BigInt | `bigint` |
| `PropTypes.node` | Anything renderable (string, number, element, array, fragment) | `React.ReactNode` |
| `PropTypes.element` | A single React element | `React.ReactElement` |
| `PropTypes.elementType` | A component type (`Button`, `"a"`) | `React.ElementType` |
| `PropTypes.instanceOf(Date)` | Instance of a class | `Date` |
| `PropTypes.oneOf(["sm", "md"])` | One of listed values (enum) | `"sm" \| "md"` |
| `PropTypes.oneOfType([...])` | One of several types | `string \| number` |
| `PropTypes.arrayOf(PropTypes.number)` | Array of a type | `number[]` |
| `PropTypes.objectOf(PropTypes.number)` | Object with values of a type | `Record<string, number>` |
| `PropTypes.shape({...})` | Object with known keys (extra keys allowed) | `{ id: number; name?: string }` |
| `PropTypes.exact({...})` | Object with exactly these keys | Exact object type |
| `PropTypes.any` | Anything | `any` / `unknown` |
| `.isRequired` | Makes any validator required | Non-optional property |

You can also write a **custom validator**: a function `(props, propName, componentName)` that returns an `Error` when invalid.

> **⚠️ Gotcha:** React 19 removed `propTypes` checking from React, so these warnings no longer appear for function components. Know them for legacy codebases and interviews, but use TypeScript for new code.

## Example

```jsx
import PropTypes from "prop-types";

function ProductCard({ title, price, tags, status, author, onBuy, icon: Icon, footer }) {
  return (
    <article>
      {Icon && <Icon aria-hidden />}
      <h3>{title}</h3>
      <p>${price.toFixed(2)} - {status}</p>
      <p>By {author.name}</p>
      <ul>{tags.map((t) => <li key={t}>{t}</li>)}</ul>
      <button onClick={onBuy}>Buy</button>
      {footer}
    </article>
  );
}

ProductCard.propTypes = {
  title: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.oneOf(["in-stock", "sold-out"]),
  author: PropTypes.shape({
    name: PropTypes.string.isRequired,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onBuy: PropTypes.func.isRequired,
  icon: PropTypes.elementType,
  footer: PropTypes.node,
  sku(props, propName, componentName) {
    if (props[propName] && !/^[A-Z]{3}-\d+$/.test(props[propName])) {
      return new Error(`Invalid ${propName} supplied to ${componentName}`);
    }
    return null;
  },
};
```

## Common mistakes

- Writing `PropTypes.boolean` or `PropTypes.function`; the correct names are `bool` and `func`.
- Confusing `element` (a single element) with `node` (anything renderable, including strings and arrays).
- Using `shape` when you need to reject extra keys; that is `exact`.
- Importing from `react` (`React.PropTypes`) instead of the `prop-types` package.

## Follow-up questions

- **`element` vs `elementType`?** `element` is a rendered instance like `<Icon />`; `elementType` is the component itself, like `Icon`, that you render later.
- **Do PropTypes add bundle size in production?** The package was small and checks were skipped in production; tools like `babel-plugin-transform-react-remove-prop-types` stripped them entirely.
- **Why did the ecosystem move to TypeScript?** Compile-time errors, editor autocompletion and no runtime cost, with richer types than PropTypes can express.

## Quick recap

- Primitives: `string`, `number`, `bool`, `func`, `array`, `object`, `symbol`, `bigint`.
- Renderables: `node`, `element`, `elementType`.
- Structured: `oneOf`, `oneOfType`, `arrayOf`, `objectOf`, `shape`, `exact`, `instanceOf`.
- Chain `.isRequired`; use TypeScript in React 19 projects.
