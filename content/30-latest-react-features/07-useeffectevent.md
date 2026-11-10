---
title: "What is useEffectEvent and what problem does it solve?"
tags: ["react-19-2", "useeffectevent", "effects", "hooks", "dependencies"]
difficulty: "hard"
asked_as: ["How do you read the latest props in an effect without re-running it?", "How do you avoid disabling the exhaustive-deps lint rule?"]
---

## Short answer

`useEffectEvent(fn)` (React 19.2) creates an **Effect Event**: a function you call from inside an effect that **always sees the latest props and state**, but is **not a dependency** of the effect. It separates the *reactive* part of an effect (what should re-run it, like `roomId`) from the *non-reactive* part (what it only reads when something happens, like `theme`). It replaces the old hacks of disabling the `exhaustive-deps` lint rule or copying values into a ref.

## Explanation

Classic problem: a chat room connects when `roomId` changes and shows a notification in the current `theme` when connected.

```jsx
useEffect(() => {
  const conn = connect(roomId);
  conn.on("connected", () => showNotification("Connected!", theme));
  return () => conn.disconnect();
}, [roomId, theme]); // theme is here only because we read it
```

Now switching the theme **reconnects the chat**, which is wrong. Removing `theme` from the array makes the linter complain, and silencing the linter leaves a stale `theme` value.

`useEffectEvent` fixes this: the callback reads `theme` fresh each time it runs, and the effect only depends on `roomId`.

| | Reactive (re-runs effect) | Non-reactive (just reads latest) |
| --- | --- | --- |
| Example values | `roomId`, `url` | `theme`, `analyticsUserId` |
| Where it goes | Effect body and dependency array | Inside `useEffectEvent` |

### Rules

- Call Effect Events **only from inside effects** (or other Effect Events).
- Don't pass them to child components or other hooks.
- Don't list them in dependency arrays. `eslint-plugin-react-hooks` (v6 and later) understands them.

## Example

```jsx
import { useEffect, useEffectEvent } from "react";

function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification("Connected!", theme); // always the latest theme
  });

  useEffect(() => {
    const conn = createConnection(roomId);
    conn.on("connected", () => onConnected());
    conn.connect();
    return () => conn.disconnect();
  }, [roomId]); // theme changes no longer reconnect

  return <h1>Welcome to {roomId}</h1>;
}

// Another common case: logging with the latest value without re-subscribing
function Page({ url, cartCount }) {
  const onVisit = useEffectEvent((visitedUrl) => {
    logVisit(visitedUrl, cartCount);
  });

  useEffect(() => {
    onVisit(url);
  }, [url]); // logs once per URL change, not on every cart change
}
```

## Common mistakes

- Using it to hide a real dependency. If a value change *should* re-run the effect (like `roomId`), it belongs in the dependency array.
- Calling the Effect Event from an event handler or during render. Regular event handlers already see the latest values; just use a normal function.
- Passing it as a prop to a child, for example `onTick={onTick}`. It is meant to be called locally inside effects.
- Adding it to the dependency array. It's not needed, and the linter knows that.

## Follow-up questions

- **How did people solve this before 19.2?** With a "latest ref" pattern (`ref.current = theme` on every render, then read `ref.current` in the effect) or by disabling the lint rule.
- **Is it the same as `useCallback`?** No. `useCallback` gives a stable function only while its dependencies are unchanged, and it is part of render. An Effect Event always reads the latest values and is only for effects.
- **Why is it called an "event"?** It models something that happens in response to an effect, like an event handler: it runs "when connected", not "when theme changes".

## Quick recap

- `useEffectEvent` reads the latest props and state without being a dependency.
- Split effects into reactive values (deps) and non-reactive logic (Effect Event).
- Call it only from effects; don't pass it around or list it in deps.
- It replaces lint-disabling and "latest ref" workarounds.
