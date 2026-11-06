---
title: "If you use document.querySelector() and update a DOM element, does the page reload in traditional apps?"
tags: ["dom", "browser", "javascript", "spa"]
difficulty: "easy"
---

## Short answer

No. Changing the DOM with `document.querySelector()` and properties like `textContent` never reloads the page, in any kind of app. The browser just recalculates style, layout and paint for the affected area. Page reloads come from navigation: clicking a normal link, submitting a form without `preventDefault()`, setting `window.location`, or calling `location.reload()`.

## Explanation

The DOM is a live, in-memory tree of the page. Editing it is like moving furniture inside your house; a reload is like moving to a new house. Traditional (multi-page) apps reload because users navigate to new URLs and the server returns new HTML, not because JavaScript touched the DOM.

### What happens after a DOM update

```text
 element.textContent = "Updated"
        |
        v
 DOM tree changes in memory (no network request)
        |
        v
 Browser marks style/layout as dirty
        |
        v
 Next frame: recalc style -> layout (reflow) -> paint -> composite
```

### What actually reloads the page

| Action | Reload? |
|---|---|
| `el.textContent = "x"`, `el.classList.add()`, `appendChild()` | No |
| `<a href="/about">` click | Yes (new document) |
| `<form>` submit without `preventDefault()` | Yes |
| `window.location.href = "/x"` / `location.reload()` | Yes |
| `history.pushState({}, "", "/x")` | No, only the URL changes |
| `fetch("/api")` | No |

This is exactly the foundation SPAs are built on: fetch data with JS, update the DOM, change the URL with `pushState`, and never request a new document.

## Example

```js
// Vanilla JS: updates text and URL with no reload
const title = document.querySelector("#title");
title.textContent = "Updated without reload";

document.querySelector("#search-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // without this, the browser navigates and reloads
  const q = new FormData(e.target).get("q");
  const results = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json());
  document.querySelector("#results").textContent = `${results.length} results`;
});
```

In React, avoid editing nodes React owns with `querySelector`; React will overwrite them on the next render or get confused during reconciliation. Use state for content and `useRef` for imperative needs like focus.

```jsx
import { useRef, useState } from "react";

function Title() {
  const [text, setText] = useState("Hello");
  const inputRef = useRef(null);
  return (
    <>
      <h1>{text}</h1>
      <input ref={inputRef} />
      <button onClick={() => { setText("Updated"); inputRef.current.focus(); }}>Update</button>
    </>
  );
}
```

## Common mistakes

- Believing "traditional apps reload whenever something changes"; they reload on navigation and form posts.
- Forgetting `preventDefault()` on form submit and then wondering why the page reloads.
- Mutating React-managed DOM directly with `querySelector` instead of using state.

## Follow-up questions

- **Is DOM manipulation expensive?** The write itself is cheap; cost comes from layout and paint, especially when reads (`offsetHeight`) and writes are interleaved, causing forced reflows.
- **Then why does React use a virtual DOM?** To compute the minimal set of changes declaratively and batch them in one commit, not because DOM updates cause reloads.
- **How do you update the URL without reload?** `history.pushState` or `replaceState`.

## Quick recap

- DOM updates never reload the page.
- Reloads come from navigation: links, form submits, `location` changes.
- The browser only re-styles, re-lays out and repaints what changed.
- In React, change state instead of editing DOM nodes directly.
