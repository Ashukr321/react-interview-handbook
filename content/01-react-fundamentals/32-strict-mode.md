---
title: "What is StrictMode and why does my component render twice?"
tags: ["strictmode", "development", "effects", "debugging"]
difficulty: "medium"
asked_as: ["Why is useEffect running twice?", "Why does console.log print twice in React?", "What does React.StrictMode do?"]
---

## Short answer

`<StrictMode>` is a **development-only** wrapper that helps you find bugs early. It renders components twice, runs effects as setup → cleanup → setup on mount, and warns about deprecated APIs. These double calls only happen in development; production builds run everything once. If the double run breaks your code, the code has a bug: a side effect in render, or an effect with a missing cleanup.

## Explanation

React expects components to be **pure**: the same props and state give the same output, with no side effects during render. React also expects every effect to clean up after itself, because a component can be mounted, unmounted and mounted again (for example when you switch tabs, with Fast Refresh, or with future features that keep state while hidden).

StrictMode tests those rules by doing extra work on purpose:

| What StrictMode does twice (dev only) | Bug it reveals |
| --- | --- |
| Calls your component function | Side effects in render (mutating outside variables, API calls) |
| Calls `useState`, `useMemo` and `useReducer` initializers and reducers | Impure initializers or reducers |
| Runs effect setup, then cleanup, then setup again on mount | Missing cleanup: duplicate subscriptions, leaking timers, double requests |
| Runs ref callbacks, then their cleanup, then again on mount (React 19) | Ref callbacks that never clean up |

It also warns about legacy APIs such as `findDOMNode` and old string refs.

In React 18 and later, React DevTools shows the second render's `console.log` output dimmed instead of hiding it. That is why logs often appear twice.

## Example

```jsx
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on("message", (m) => setMessages((prev) => [...prev, m]));
    connection.connect();

    // Without this cleanup, StrictMode leaves two open connections
    // and you see every message twice. That is the bug it is exposing.
    return () => connection.disconnect();
  }, [roomId]);

  return <MessageList messages={messages} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChatRoom roomId="general" />
  </StrictMode>
);
```

## Common mistakes

- Removing `<StrictMode>` to "fix" an effect that runs twice. The bug is still there; it shows up later in production, for example when the user navigates away and comes back.
- Using a `useRef` flag (`if (didRun.current) return`) to block the second effect run. It hides the missing cleanup instead of fixing it.
- Thinking StrictMode slows down production. Its checks are removed from production builds.
- Fetching in an effect without a way to ignore or cancel the stale request. Use an `ignore` flag or `AbortController` in the cleanup.

## Follow-up questions

- **Can I use StrictMode for only part of the app?** Yes. Wrap any subtree; only components inside it get the checks.
- **Does StrictMode double-call event handlers?** No. Only render logic, initializers, reducers, effects and ref callbacks.
- **Why does React do this instead of just warning?** Purity cannot be detected statically. Running the code twice is the simplest way to make hidden side effects visible.
- **How do I fetch data without the double request?** In real apps, use a framework loader or a library like TanStack Query that de-duplicates requests. In a plain effect, cancel or ignore the first request in the cleanup.

## Quick recap

- StrictMode is a development-only checker, with no cost in production.
- It double-renders and runs mount effects as setup → cleanup → setup.
- Double logs and double effects are expected; broken behavior means a real bug.
- Fix it with pure render logic and proper effect cleanup, not by removing StrictMode.
