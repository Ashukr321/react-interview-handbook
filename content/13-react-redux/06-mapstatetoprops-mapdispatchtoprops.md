---
title: "What is mapStateToProps and mapDispatchToProps?"
tags: ["react-redux", "connect", "mapStateToProps", "mapDispatchToProps"]
difficulty: "easy"
---

## Short answer

They are the two arguments to `react-redux`'s `connect()`. **`mapStateToProps(state, ownProps)`** selects data from the store and returns an object that becomes props of the component; it runs after every dispatch, and the component re-renders only if the returned values change (shallow comparison). **`mapDispatchToProps`** provides functions that dispatch actions as props, either as a function `(dispatch, ownProps) => ({...})` or, preferably, as an object of action creators that `connect` binds automatically.

## Explanation

Think of `connect` as a translator between the store and a component. `mapStateToProps` is the "read" translation (store language to props), and `mapDispatchToProps` is the "write" translation (component callbacks to actions).

### mapStateToProps

- Signature: `(state, ownProps?) => object`.
- Must be pure and fast; it runs on every store update.
- Return only what the component needs. The result is shallow-compared field by field.
- Returning new arrays/objects each time (`state.items.filter(...)`) defeats the check; use memoized selectors.
- If omitted (`connect(null, ...)`), the component does not subscribe to the store at all.

### mapDispatchToProps

| Form | Example | Notes |
|---|---|---|
| Object shorthand (recommended) | `{ addTodo, removeTodo }` | Each action creator is wrapped in `dispatch` |
| Function | `(dispatch, ownProps) => ({ onAdd: (t) => dispatch(addTodo(t)) })` | Use when you need `ownProps` or custom logic |
| Omitted | `connect(mapState)(Comp)` | Component receives `dispatch` as a prop |

### Hooks equivalents

| connect | Hooks |
|---|---|
| `mapStateToProps` | `useSelector(selector)` |
| `mapDispatchToProps` | `useDispatch()` and call `dispatch(action)` |

## Example

```jsx
import { connect } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { todoToggled, todoDeleted } from "./todosSlice";

const selectVisibleTodos = createSelector(
  [(state) => state.todos.items, (state, ownProps) => ownProps.filter],
  (items, filter) =>
    filter === "done" ? items.filter((t) => t.done) : items
);

function TodoList({ todos, toggle, remove }) {
  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>
          <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
          {t.text}
          <button onClick={() => remove(t.id)}>x</button>
        </li>
      ))}
    </ul>
  );
}

const mapStateToProps = (state, ownProps) => ({
  todos: selectVisibleTodos(state, ownProps), // memoized: same array if nothing changed
});

const mapDispatchToProps = {
  toggle: todoToggled,
  remove: todoDeleted,
};

export default connect(mapStateToProps, mapDispatchToProps)(TodoList);

// Usage: <TodoList filter="done" />
```

Hooks version of the same component:

```jsx
import { useSelector, useDispatch } from "react-redux";

export function TodoListHooks({ filter }) {
  const todos = useSelector((s) => selectVisibleTodos(s, { filter }));
  const dispatch = useDispatch();
  return todos.map((t) => (
    <p key={t.id} onClick={() => dispatch(todoToggled(t.id))}>{t.text}</p>
  ));
}
```

## Common mistakes

- Returning the whole state from `mapStateToProps`, re-rendering on every action.
- Creating new objects or arrays inside `mapStateToProps` without memoization.
- Declaring `ownProps` in `mapStateToProps` when not needed; it makes the function run whenever parent props change too.
- Doing async work or side effects inside these functions.

## Follow-up questions

- **What is `ownProps`?** The props passed to the connected component by its parent, useful for selecting by id.
- **What is the third argument of connect?** `mergeProps(stateProps, dispatchProps, ownProps)`, to customize how the final props are combined; rarely needed.
- **Should new code use these?** Generally no; hooks are recommended, but you will meet `connect` in legacy and class-based code.

## Quick recap

- `mapStateToProps` turns store state into props.
- `mapDispatchToProps` turns actions into callback props.
- Prefer the object shorthand for dispatch.
- Hooks (`useSelector`, `useDispatch`) are the modern equivalent.
