---
title: "What are Higher Order Components (HOC) and their uses?"
tags: ["hoc", "patterns", "reuse", "composition"]
difficulty: "medium"
---

## Short answer

A Higher Order Component is a **function that takes a component and returns a new, enhanced component**, e.g. `const ProtectedPage = withAuth(Page)`. It lets you reuse cross-cutting logic such as auth checks, logging, theming or data loading without changing the wrapped component. Since hooks arrived, custom hooks replace most HOCs, but HOCs still appear in libraries and legacy code.

## Explanation

An HOC is like a phone case: the phone (your component) is unchanged, but the case adds features (a grip, a card holder). The idea comes from higher-order functions such as `map`, which take or return functions.

### Typical uses

- **Access control**: `withAuth`, `withRole("admin")`.
- **Injecting data or props**: `connect()` from classic React Redux, `withRouter` in old React Router.
- **Cross-cutting behaviour**: error boundaries, analytics, feature flags.
- **Wrapping with providers or layout**.

### HOC vs custom hook vs render props

| | HOC | Custom hook | Render props |
|---|---|---|---|
| Shape | `withX(Component)` | `useX()` inside component | `<X render={(data) => ...} />` |
| Shares | Logic + can wrap JSX | Logic only | Logic, caller controls JSX |
| Downsides | Wrapper nesting, prop collisions, hidden props | Cannot wrap JSX | Callback nesting |
| Modern default | Rarely | Yes | Sometimes |

### Rules of thumb

- Do not create HOCs inside render: `const Enhanced = withX(Comp)` inside a component creates a new type every render, remounting the subtree and wiping state.
- Pass through unrelated props with `{...props}`.
- Set a `displayName` for DevTools.
- Static methods are not copied automatically (use `hoist-non-react-statics` if needed).
- In React 19, `ref` is a regular prop for function components, so spreading props forwards it; in React 18 you needed `forwardRef`.

## Example

```jsx
import { useAuth } from "./auth";
import { Navigate } from "react-router";

export function withAuth(WrappedComponent, { role } = {}) {
  function WithAuth(props) {
    const { user, loading } = useAuth();
    if (loading) return <p>Checking session...</p>;
    if (!user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <p>Forbidden</p>;
    return <WrappedComponent {...props} user={user} />;
  }
  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithAuth;
}

// Usage (module scope, not inside a component)
function AdminDashboard({ user }) {
  return <h1>Welcome, {user.name}</h1>;
}
export default withAuth(AdminDashboard, { role: "admin" });
```

## Common mistakes

- Applying the HOC inside a component body, causing remounts every render.
- Overwriting a prop the caller passed (prop name collisions such as two HOCs both injecting `data`).
- Stacking many HOCs (`withA(withB(withC(Comp)))`), creating "wrapper hell" that is hard to debug.
- Mutating the input component (e.g. patching its prototype) instead of composing.

## Follow-up questions

- **Why did hooks replace most HOCs?** Hooks share logic without extra components in the tree, make data flow explicit (`const user = useAuth()`), and avoid prop collisions.
- **When is an HOC still a good choice?** When you must wrap many components with the same JSX or guard, or work with class components that cannot use hooks.
- **Is `React.memo` an HOC?** Yes, it takes a component and returns a memoized one.

## Quick recap

- HOC = `(Component) => EnhancedComponent`.
- Used for auth, injected props, logging, providers.
- Define at module scope, pass props through, set `displayName`.
- Prefer custom hooks for logic reuse in modern code.
