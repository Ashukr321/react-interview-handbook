---
title: "What is the cleanup function in useEffect?"
tags: ["useEffect", "cleanup", "hooks", "memory-leaks"]
difficulty: "easy"
---

## Short answer

The cleanup function is the function you **return from a `useEffect` callback**. React calls it before the effect runs again (when dependencies change) and when the component unmounts. Use it to undo whatever the effect set up: clear timers, remove event listeners, unsubscribe, close sockets, abort fetches.

## Explanation

An effect is like checking into a hotel room; the cleanup is checking out. You must check out of the old room before checking into a new one (dependency change), and when you leave town (unmount).

```text
mount:          effect(A)
deps change:    cleanup(A) -> effect(B)
deps change:    cleanup(B) -> effect(C)
unmount:        cleanup(C)

Dev Strict Mode on mount: effect(A) -> cleanup(A) -> effect(A)
```

### Key rules

- The cleanup closes over the values from **its own render**, so it removes exactly what that effect added.
- Cleanup runs after the new render commits, right before the next effect runs (for `useEffect`).
- In development, Strict Mode mounts, unmounts and re-mounts components once to prove your cleanup is correct. If something breaks, the cleanup is missing or incomplete.
- Not every effect needs cleanup (e.g. setting `document.title`), but anything that keeps running or holds a reference does.

### What to clean up

| Setup | Cleanup |
|---|---|
| `setInterval` / `setTimeout` | `clearInterval` / `clearTimeout` |
| `addEventListener` | `removeEventListener` (same function reference) |
| `subscribe()` | `unsubscribe()` |
| `new WebSocket()` | `socket.close()` |
| `fetch(url, { signal })` | `controller.abort()` |
| `new IntersectionObserver()` | `observer.disconnect()` |
| Third-party widget init | Its `destroy()` method |

## Example

```jsx
import { useEffect, useState } from "react";

export default function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const socket = new WebSocket(`wss://chat.example.com/rooms/${roomId}`);
    socket.onmessage = (e) => setMessages((m) => [...m, JSON.parse(e.data)]);
    setMessages([]);

    return () => socket.close(); // runs before connecting to the next room, and on unmount
  }, [roomId]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <>
      <p>{online ? "Online" : "Offline"} - room {roomId}</p>
      <ul>{messages.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
    </>
  );
}
```

## Common mistakes

- Returning a non-function, e.g. making the effect callback `async` (it returns a Promise). Define an async function inside instead.
- Removing a listener with a different function reference than the one added (`removeEventListener("x", () => ...)`).
- Disabling Strict Mode to "fix" double effects instead of writing a cleanup.
- Thinking cleanup only runs on unmount; it also runs on every dependency change.

## Follow-up questions

- **When does `useLayoutEffect` cleanup run?** Synchronously during commit, before the new layout effects run.
- **Does a ref callback have cleanup?** Yes, in React 19 a callback ref can return a cleanup function.
- **Can you set state in cleanup?** Avoid it on unmount; it is pointless for an unmounted component. Use cleanup to stop work, not to update UI.

## Quick recap

- Return a function from the effect to clean up.
- Runs before the next effect and on unmount.
- Undo every subscription, timer, listener and request.
- Strict Mode's double run exists to catch missing cleanups.
