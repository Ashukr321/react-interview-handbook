---
title: "What is event delegation?"
tags: ["events", "dom", "delegation", "bubbling"]
difficulty: "easy"
---

## Short answer

Event delegation is a DOM technique where you attach **one listener to a common ancestor** instead of one listener per child. Because most events bubble, a click on any child reaches the ancestor, and the handler uses `event.target` (often with `closest()`) to figure out which child was clicked. It saves memory and automatically works for children added later.

## Explanation

Think of an apartment building with one reception desk instead of a doorbell on every flat. Every visitor goes through reception, which checks who they want and routes them. Adding a new flat does not need a new doorbell.

### Why use it

- **Fewer listeners**: one handler for 1,000 list items instead of 1,000.
- **Dynamic content**: items added after setup are handled automatically.
- **Simpler cleanup**: one listener to remove.

### How it works

```text
click on <button data-id="3">
        |
   target phase (button)
        |
   bubbles up -> <li> -> <ul>  <-- single listener here
                               reads event.target.closest("button").dataset.id
```

### Limitations

- Only works for events that bubble. `focus`, `blur`, `mouseenter` and `mouseleave` do not bubble; use `focusin`/`focusout` or `mouseover`/`mouseout` instead.
- If a child calls `stopPropagation()`, the ancestor never sees the event.
- `event.target` may be a nested element (an icon inside the button), so use `closest()`.
- `event.currentTarget` is the element the listener is on; `event.target` is where the event started.

### Relation to React

React itself is built on delegation: it attaches listeners to the root container once, and dispatches to your `onClick` props internally (covered in "How event delegation works in React"). In your own React code you rarely need manual delegation, but it is still useful for huge lists or non-React DOM.

## Example

```html
<ul id="todo-list">
  <li><span>Buy milk</span> <button data-id="1">Delete</button></li>
  <li><span>Walk dog</span> <button data-id="2">Delete</button></li>
</ul>

<script>
  const list = document.getElementById("todo-list");

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button || !list.contains(button)) return; // ignore clicks elsewhere
    button.closest("li").remove();
    console.log("Deleted item", button.dataset.id);
  });
</script>
```

## Common mistakes

- Using `event.target` directly when the click may land on a nested `<svg>` or `<span>`.
- Delegating non-bubbling events like `focus` and wondering why nothing fires.
- Confusing `target` (origin) with `currentTarget` (the delegating element).
- Delegating to `document` for everything, making handlers run for every click on the page.

## Follow-up questions

- **Which events do not bubble?** `focus`, `blur`, `mouseenter`, `mouseleave`, `load`, `scroll` on elements (it bubbles only from document to window). Use bubbling alternatives where available.
- **Can you delegate in the capture phase?** Yes, with `addEventListener(type, fn, true)`, which also catches non-bubbling events like `focus` on ancestors.
- **Is delegation always faster?** It saves listener setup and memory; the per-event cost is a bit higher because of the target lookup, which is negligible in practice.

## Quick recap

- One listener on an ancestor handles events from many children.
- Relies on bubbling; use `event.target.closest()` to find the source.
- Works for dynamically added elements.
- React uses delegation internally at the root container.
