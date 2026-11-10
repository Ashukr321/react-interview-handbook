---
title: "What is forwardRef and how did React 19 change it?"
tags: ["forwardref", "refs", "useimperativehandle", "react-19"]
difficulty: "medium"
asked_as: ["How do you pass a ref to a child component?", "What is useImperativeHandle?", "Is forwardRef deprecated?"]
---

## Short answer

`forwardRef` lets a function component **receive a `ref` from its parent and pass it on** to a DOM element inside it, so the parent can call `focus()`, measure the element or scroll to it. Before React 19, `ref` was a special prop that function components could not read, so `forwardRef` was required. **In React 19, `ref` is a normal prop** for function components: you just destructure it, and `forwardRef` is no longer needed (it still works, but will be deprecated).

## Explanation

Refs give you direct access to a DOM node. By default a component's DOM is private: a parent cannot reach into a child's `<input>`. Design-system components like `<TextInput>` or `<Button>` often need to expose their inner element so parents can manage focus, which matters for accessibility and form libraries.

### Before React 19

```jsx
const TextInput = forwardRef(function TextInput(props, ref) {
  return <input ref={ref} {...props} />;
});
```

### React 19

```jsx
function TextInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

### Exposing less than the whole node: `useImperativeHandle`

Sometimes you don't want the parent to have the full DOM node. `useImperativeHandle` lets you pick which methods the parent gets, which keeps the component's internals private.

## Example

```jsx
import { useImperativeHandle, useRef } from "react";

// React 19: `ref` arrives as a normal prop.
function SearchBox({ ref, ...props }) {
  const inputRef = useRef(null);

  // Parent gets only focus() and clear(), not the raw <input>.
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => {
      inputRef.current.value = "";
    },
  }));

  return <input ref={inputRef} type="search" {...props} />;
}

export default function Toolbar() {
  const searchRef = useRef(null);
  return (
    <>
      <SearchBox ref={searchRef} placeholder="Search" />
      <button onClick={() => searchRef.current.focus()}>Focus search</button>
      <button onClick={() => searchRef.current.clear()}>Clear</button>
    </>
  );
}
```

## Common mistakes

- In React 18 or earlier, passing `ref` to a plain function component and getting `null` plus a warning. Wrap it in `forwardRef` (or rename the prop, such as `inputRef`).
- Using refs to do what props can do, like `ref.current.open()` instead of an `isOpen` prop. Refs are an escape hatch for focus, measurement, scrolling and third-party libraries.
- Reading `ref.current` during render. It is `null` on the first render and not tracked by React; read it in effects or event handlers.
- Forgetting `displayName` for anonymous `forwardRef` components, which then show up as `ForwardRef` in DevTools. A named inner function fixes it.

## Follow-up questions

- **Do class components need forwardRef?** No. A `ref` on a class component points to the class instance. For classes, `ref` is still not passed in `props`.
- **What are ref cleanup functions?** In React 19, a callback ref can return a cleanup function, which React calls when the element is removed, just like an effect.
- **How do HOCs handle refs?** Before React 19 an HOC had to use `forwardRef` to pass the ref through. With ref as a prop, spreading `{...props}` passes it along.
- **Should I migrate existing forwardRef code?** It keeps working. React provides a codemod, so migrate when convenient.

## Quick recap

- `forwardRef` passes a parent's ref to an element inside a function component.
- React 19 makes `ref` a normal prop, so `forwardRef` is no longer needed.
- `useImperativeHandle` exposes chosen methods instead of the whole DOM node.
- Use refs for focus, measurement and imperative APIs, not for data flow.
