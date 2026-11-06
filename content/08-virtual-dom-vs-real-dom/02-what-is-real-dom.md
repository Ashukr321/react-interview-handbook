---
title: "What is the Real DOM?"
tags: ["dom", "browser", "basics"]
difficulty: "easy"
---

## Short answer

The Real DOM (Document Object Model) is the browser's live, tree-shaped object model of the page. Each HTML element becomes a node object with properties, methods and event handling, and changes to it are reflected on screen. It's what `document.querySelector` and `element.appendChild` operate on, and changing it can trigger style recalculation, layout and paint.

## Explanation

When the browser parses HTML, it builds the DOM tree. Combined with the CSSOM (CSS rules), it produces the render tree, which is laid out and painted.

```text
HTML -> DOM tree --\
                    +--> render tree -> layout (reflow) -> paint -> composite
CSS  -> CSSOM -----/
```

### Why DOM work is "expensive"

DOM node objects themselves aren't magically slow. The cost comes from what changes trigger:

| Operation | Potential cost |
|---|---|
| Changing text or a class | Style recalculation, maybe layout and paint |
| Changing size/position (width, top) | Layout (reflow) of affected elements, then paint |
| Changing `transform`/`opacity` | Often only compositing, cheapest |
| Reading layout (`offsetHeight`) after a write | Forces synchronous layout ("layout thrashing") |
| Creating/removing many nodes | Allocation, style, layout and GC |

Analogy: the Real DOM is the actual furniture in a room. Moving a sofa means everything around it may need rearranging, whereas sketching the new layout on paper (Virtual DOM) is cheap.

### Real DOM vs Virtual DOM

| | Real DOM | Virtual DOM (React elements) |
|---|---|---|
| Owner | Browser | React (JavaScript) |
| Updates screen directly | Yes | No |
| Cost per change | Can trigger style/layout/paint | Just object creation |
| API | `appendChild`, `setAttribute`, events | JSX, components |
| Mutability | Mutable | Immutable elements, recreated every render |

## Example

```jsx
// Imperative Real DOM manipulation
const list = document.getElementById("list");
["Apple", "Banana"].forEach((fruit) => {
  const li = document.createElement("li");
  li.textContent = fruit;
  list.appendChild(li);
});

// Declarative React: describe the result, React performs the DOM calls
export function FruitList({ fruits }) {
  return (
    <ul>
      {fruits.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}
```

When you do need the Real DOM in React (focus, measurement, third-party widgets), use a ref:

```jsx
import { useRef } from "react";

export function SearchBox() {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  );
}
```

## Common mistakes

- Saying "the DOM is slow" without nuance. Layout and paint are the expensive parts; single targeted updates are fast.
- Manually mutating DOM nodes that React owns (e.g. removing a child React rendered), which desyncs React's fiber tree and causes errors.
- Interleaving DOM reads and writes in loops, causing forced reflows.

## Follow-up questions

- **What is reflow vs repaint?** Reflow recalculates geometry; repaint redraws pixels without geometry changes. Reflow is more costly.
- **Is the Shadow DOM related to the Virtual DOM?** No. Shadow DOM is a browser feature for encapsulating Web Components' DOM and styles.
- **When should React code touch the DOM directly?** Through refs, in effects or event handlers, for focus, measurement, media, and integrating non-React libraries.

## Quick recap

- Real DOM = browser's live object tree for the page.
- Changes can trigger style, layout and paint.
- React manages it declaratively and touches it only in commit.
- Use refs for the rare direct access.
