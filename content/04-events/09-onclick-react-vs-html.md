---
title: "Difference between onClick in React and onclick in HTML"
tags: ["events", "jsx", "dom"]
difficulty: "easy"
---

## Short answer

In HTML, `onclick` is a lowercase attribute holding a **string of code** that runs in the global scope, and returning `false` cancels the default action. In React, `onClick` is a camelCase prop that takes a **function reference**, receives a synthetic event, is delegated from the root, and you must call `e.preventDefault()` explicitly to cancel default behaviour.

## Explanation

HTML `onclick` is like leaving a note that says "do this" in text; the browser parses and evaluates it later. React's `onClick` is like handing over the actual tool to use.

| | HTML `onclick` | React `onClick` |
|---|---|---|
| Casing | Lowercase | camelCase |
| Value | String of JS: `onclick="save()"` | Function: `onClick={save}` |
| Scope | Global (`window`) | Closure: sees props and state |
| Event object | Native `event` | `SyntheticEvent` (`e.nativeEvent` for the native) |
| Prevent default | `return false` works | Must call `e.preventDefault()` |
| Where the listener lives | On the element | On the root container (delegation) |
| Security | String is evaluated: XSS risk, blocked by strict CSP | No string evaluation; React refuses string handlers |
| Cleanup | Manual if set via JS | Automatic on unmount |
| Propagation path | DOM tree | React tree (portals bubble to React parent) |

### Calling vs passing

The most common bug in interviews: `onClick={handleClick()}` **calls** the function during render and passes its return value. Pass a reference `onClick={handleClick}`, or wrap it when you need arguments: `onClick={() => handleClick(id)}`.

### `this` in classes

In class components the handler loses `this` unless you bind it in the constructor or use a class-field arrow function. Function components do not have this problem.

## Example

```html
<!-- Plain HTML -->
<a href="/home" onclick="track('home'); return false;">Home</a>
<script>
  function track(page) { console.log("track", page); }
</script>
```

```jsx
// React
function Nav({ onNavigate }) {
  function handleClick(e) {
    e.preventDefault(); // `return false` would do nothing here
    onNavigate("/home");
  }

  return (
    <>
      <a href="/home" onClick={handleClick}>Home</a>
      {/* Wrong: runs on every render, not on click */}
      {/* <button onClick={onNavigate("/about")}>About</button> */}
      <button onClick={() => onNavigate("/about")}>About</button>
    </>
  );
}
```

## Common mistakes

- `onClick={doSomething()}` instead of `onClick={doSomething}`.
- Writing `onclick` (lowercase) in JSX; React warns and ignores it.
- Passing a string: `onClick="save()"` throws a warning and does nothing.
- Relying on `return false` to stop navigation or form submission.

## Follow-up questions

- **Does React add an `onclick` attribute to the DOM?** No. Inspect the element: there is no listener on it; React handles it at the root.
- **How do you pass arguments to a handler?** Use an arrow function `() => remove(id)` or read data from `e.currentTarget.dataset`.
- **Is an inline arrow a performance problem?** Usually not; only when passed to memoized children.

## Quick recap

- HTML: lowercase, string code, global scope, `return false` works.
- React: camelCase, function reference, closure scope, call `preventDefault()`.
- React handlers are delegated and auto-cleaned.
- Pass the function, do not call it.
