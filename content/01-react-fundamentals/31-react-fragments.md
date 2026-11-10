---
title: "What is a React Fragment and why use it?"
tags: ["fragment", "jsx", "dom"]
difficulty: "easy"
asked_as: ["Difference between <> and React.Fragment", "Why not just wrap in a div?", "Can a Fragment take a key?"]
---

## Short answer

A Fragment lets a component return **several elements without adding an extra DOM node**. You write it as `<>...</>` (short syntax) or `<Fragment>...</Fragment>` (imported from `react`). Use the long form when you need a `key`, for example when mapping a list where each item renders more than one element.

## Explanation

A component must return a single value. Before Fragments, the usual fix was to wrap siblings in a `<div>`. That extra `<div>` is not harmless:

- It can **break valid HTML**: `<tr>` must contain `<td>` directly, `<ul>` must contain `<li>`, `<dl>` must contain `<dt>`/`<dd>`.
- It can **break CSS layouts**: a wrapper becomes the flex or grid item instead of the children.
- It adds **DOM nodes** for nothing, which matters in large lists.

A Fragment exists only in the React tree. When React commits to the DOM, the children are inserted directly into the parent.

```text
 JSX:                          DOM:
 <tr>                          <tr>
   <Columns />                   <td>Name</td>
 </tr>                           <td>Age</td>
                               </tr>
 Columns returns <>...</>      (no wrapper node)
```

### `<>` vs `<Fragment>`

| | `<>...</>` | `<Fragment>...</Fragment>` |
| --- | --- | --- |
| Import needed | No | Yes (`import { Fragment } from "react"`) |
| Accepts `key` | No | Yes |
| Other props | None | None (only `key`) |

## Example

```jsx
import { Fragment } from "react";

function Columns() {
  // Short syntax: two <td> without a wrapper, so the table stays valid.
  return (
    <>
      <td>Name</td>
      <td>Age</td>
    </>
  );
}

function Glossary({ items }) {
  // Long syntax: each item renders two siblings and needs a key.
  return (
    <dl>
      {items.map((item) => (
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

## Common mistakes

- Using `<>` inside `.map()` and getting the "each child should have a unique key" warning. The short syntax cannot hold a `key`; switch to `<Fragment key={...}>`.
- Trying to put `className`, `style` or an event handler on a Fragment. There is no DOM node, so there is nothing to style or attach to. Use a real element if you need one.
- Wrapping a single child in a Fragment. It adds noise and does nothing.
- Expecting a Fragment to help with performance on its own. It saves a DOM node, but it does not stop re-renders.

## Follow-up questions

- **Does a Fragment appear in the Fiber tree?** Yes. React creates a Fiber for a keyed Fragment so it can reconcile it, but no host (DOM) node is created.
- **Is returning an array the same as a Fragment?** Almost. `return [<li key="a" />, <li key="b" />]` works, but every item needs a key, and the Fragment syntax is easier to read.
- **Can I give a Fragment a ref?** Not in stable React. There is no DOM node to point to; put the ref on a real element instead.

## Quick recap

- Fragments group children without adding a DOM node.
- `<>...</>` is the short form; `<Fragment>` is needed for a `key`.
- They keep HTML valid (`table`, `ul`, `dl`) and flex/grid layouts intact.
- No props other than `key`, so no styling and no events.
