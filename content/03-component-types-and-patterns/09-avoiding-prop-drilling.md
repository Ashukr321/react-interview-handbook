---
title: "Avoiding prop drilling: Context API vs event emitters vs composition patterns"
tags: ["context", "composition", "prop-drilling", "architecture"]
difficulty: "hard"
---

## Short answer

Use **composition first** (pass JSX via `children` or slot props so middle layers do not need the data), **Context** for values many components at different depths read (theme, auth, locale), and a store library for large, fast-changing shared state. **Event emitters** (a global pub/sub bus) work but bypass React's data flow, so they are best kept for bridging non-React code, not for sharing UI state.

## Explanation

Think of an office. Composition is handing someone a finished package so the people in between never open it. Context is the office intercom: anyone can tune in. An event emitter is shouting across the floor: fast, but nobody knows who is listening, and you have to remember to stop listening when you leave.

| | Composition | Context API | Event emitter (pub/sub) |
|---|---|---|---|
| How data flows | Props, explicit | Provider to any descendant | Global, any to any |
| Fits React model | Fully | Fully | No, state lives outside React |
| Re-renders | Only receivers | All consumers when value changes | Only subscribers you wire up |
| Tooling/DevTools | Yes | Yes | No |
| Cleanup needed | No | No | Yes, unsubscribe in effect |
| Good for | Layout wrappers, slots | Theme, user, locale, feature flags | Bridging non-React widgets, cross-app messages |
| Risk | Can feel awkward for many values | Over-rendering with big objects | Hidden coupling, leaks, ordering bugs |

### Making Context perform well

- Split contexts by concern and by update frequency (e.g. `UserContext` vs `CartContext`).
- Memoize the value object (`useMemo`) so consumers do not re-render on every provider render.
- Separate state and dispatch into two contexts so components that only dispatch do not re-render.
- For frequently changing global state, use Zustand/Redux Toolkit, which use selector-based subscriptions (`useSyncExternalStore`).

### When an event emitter is reasonable

If something outside React (a WebSocket client, a legacy jQuery widget, a micro-frontend) needs to notify React, subscribe in an effect and **unsubscribe in cleanup**. If many components then need the data, put it into a store rather than having each component subscribe ad hoc.

## Example

```jsx
import { createContext, use, useMemo, useState } from "react";

// 1. Composition: Page does not need to know about `user`
function Page({ header, children }) {
  return <div className="page">{header}<main>{children}</main></div>;
}

// 2. Context for widely shared values (React 19: <Ctx> as provider, use(Ctx) to read)
const ThemeContext = createContext("light");

function App() {
  const [theme, setTheme] = useState("light");
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  const user = { name: "Ada" };

  return (
    <ThemeContext value={value}>
      <Page header={<Avatar user={user} />}>
        <ThemeToggle />
      </Page>
    </ThemeContext>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = use(ThemeContext);
  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      Theme: {theme}
    </button>
  );
}

const Avatar = ({ user }) => <span>{user.name}</span>;
```

## Common mistakes

- One giant `AppContext` with everything inside, so any change re-renders the whole app.
- Using Context as a performance tool. It solves passing data, not re-render cost.
- Event bus subscriptions without cleanup, leading to leaks and duplicate handlers (especially under Strict Mode's double effect run).
- Forgetting composition exists and adding Context for data that only one deep child needs.

## Follow-up questions

- **Does Context replace Redux?** For low-frequency global values, yes. For complex, frequently updated state with middleware, devtools and selectors, Redux Toolkit or Zustand fits better.
- **Why does a context consumer re-render even with `memo`?** `memo` checks props only; reading a context subscribes the component to every value change of that context.
- **What is the slots pattern?** Passing JSX through named props like `header`, `sidebar` and `children`, so the layout renders them without knowing their data.

## Quick recap

- Composition first: pass elements, not data.
- Context for widely read, rarely changing values; split and memoize.
- Stores with selectors for hot shared state.
- Event emitters only for bridging outside React, always unsubscribe.
