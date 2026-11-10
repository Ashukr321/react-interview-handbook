---
title: "How do you migrate an app from React 18 to React 19?"
tags: ["react-19", "migration", "breaking-changes", "codemods", "typescript"]
difficulty: "medium"
asked_as: ["What are the breaking changes in React 19?", "What was removed in React 19?", "How would you upgrade a large app to React 19?"]
---

## Short answer

First upgrade to **React 18.3**, which logs warnings for every API React 19 removes, and fix them. Then upgrade to React 19 and run the official **codemods** (`npx codemod@latest react/19/migration-recipe`). The main breaking changes: removed **`ReactDOM.render`/`hydrate`**, **string refs**, **legacy context**, **`propTypes` checks** and **`defaultProps` on function components**, **`findDOMNode`** and **`unmountComponentAtNode`**; the **new JSX transform** is required; render errors are **no longer re-thrown**; and TypeScript types are stricter (`useRef` needs an argument, callback refs can't implicitly return a value).

## Explanation

### Removed APIs and what to use instead

| Removed | Replacement |
| --- | --- |
| `ReactDOM.render`, `ReactDOM.hydrate` | `createRoot(el).render()`, `hydrateRoot(el, <App />)` |
| `unmountComponentAtNode` | `root.unmount()` |
| `findDOMNode` | A ref on the DOM element |
| String refs (`ref="input"`) | `useRef` or callback refs |
| Legacy context (`contextTypes`, `getChildContext`) | `createContext` |
| `propTypes` checks | TypeScript (checks are silently skipped now) |
| `defaultProps` on function components | Default parameters: `function Btn({ size = "md" })` |
| `React.createFactory`, module pattern factories | Plain JSX or functions |
| `react-test-renderer/shallow` | React Testing Library |
| `act` from `react-dom/test-utils` | `act` from `react` |
| UMD builds | ESM-based CDNs such as esm.sh |

### Behavior changes

- **Errors:** errors caught by an error boundary go to `console.error`; uncaught errors go to `window.reportError`. They are no longer logged twice or re-thrown. Use the new root options (`onCaughtError`, `onUncaughtError`) for monitoring.
- **New JSX transform required:** older Babel or TypeScript setups that use `React.createElement` must be updated.
- **StrictMode:** `useMemo` and `useCallback` reuse the first render's result during the double render, and ref callbacks are double-invoked on mount.

### TypeScript changes

- `useRef()` needs an argument: `useRef<HTMLDivElement>(null)`.
- `ref={(n) => (x = n)}` fails, because a returned value is treated as a cleanup function. Use a block body.
- The global `JSX` namespace is now `React.JSX`.
- `ReactElement` props default to `unknown` instead of `any`.
- Run `npx types-react-codemod@latest preset-19 ./src`.

### A safe upgrade plan

1. Upgrade to 18.3 and fix all deprecation warnings.
2. Make sure the new JSX transform is enabled.
3. Upgrade `react`, `react-dom`, `@types/react` and `@types/react-dom` together.
4. Run the React and TypeScript codemods, then the test suite.
5. Check third-party libraries (UI kits, form and animation libraries) for React 19 support.
6. Roll out behind a canary or staged deployment and watch error monitoring.

## Example

```jsx
// Before (React 18 and earlier)
import ReactDOM from "react-dom";

function Button({ size, label }) {
  return <button className={size}>{label}</button>;
}
Button.defaultProps = { size: "md" };
Button.propTypes = { label: PropTypes.string.isRequired };

ReactDOM.render(<App />, document.getElementById("root"));

// After (React 19)
import { createRoot } from "react-dom/client";

function Button({ size = "md", label }: { size?: string; label: string }) {
  return <button className={size}>{label}</button>;
}

createRoot(document.getElementById("root")!).render(<App />);
```

## Common mistakes

- Jumping straight from 17 to 19 without stopping at 18.3, so you miss the warnings that list what will break.
- Keeping `defaultProps` on function components. In React 19 they are ignored silently, so props become `undefined` with no error.
- Upgrading `react` but not `@types/react`, which leads to confusing type errors.
- Forgetting libraries that use `findDOMNode` or string refs internally (often older animation or drag-and-drop libraries).

## Follow-up questions

- **Is `defaultProps` removed for class components too?** No. It still works on classes.
- **Do I have to adopt Server Components to upgrade?** No. They are optional; a client-only app upgrades fine.
- **How long does a migration usually take?** For apps already on `createRoot` with modern patterns, often a day. Apps with lots of legacy class code and old libraries take longer, mostly because of the dependencies.

## Quick recap

- Go to 18.3 first, fix warnings, then upgrade to 19.
- Run the React and TypeScript codemods.
- Removed: `ReactDOM.render`, string refs, legacy context, `propTypes`, function `defaultProps`, `findDOMNode`.
- Errors aren't re-thrown; the new JSX transform is required; TypeScript is stricter.
