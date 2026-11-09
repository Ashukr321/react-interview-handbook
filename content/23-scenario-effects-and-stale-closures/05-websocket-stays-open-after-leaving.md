---
title: "A WebSocket connection remains active after leaving the page. What should you do?"
tags: ["scenario", "websocket", "useEffect", "cleanup", "memory-leak"]
difficulty: "medium"
---

## Short answer

Open the socket inside a `useEffect` and return a cleanup that closes it and removes its listeners. The cleanup runs on unmount and before the effect re-runs (for example when the room id changes). Also make sure any reconnect logic does not reopen the socket after an intentional close, and for app-wide connections, manage one shared socket in a provider instead of per page.

## Why it happens

Navigation in an SPA unmounts components, but it does not close anything those components opened. A `WebSocket` is owned by the browser, not by React; without cleanup it stays open, keeps receiving messages and keeps calling handlers that set state on a component that no longer exists.

```text
 Visit /chat/1 -> new WebSocket(...)  (no cleanup)
 Go to /home   -> ChatRoom unmounts, socket still open
 Back to /chat/1 -> another socket opens
 => duplicate messages, extra server load, memory leak
```

Common causes: no cleanup at all, the socket stored in a module variable, an `onclose` handler that always reconnects, or a connection created during render.

## How to fix it

1. Create the socket inside the effect, keyed by its inputs (`roomId`).
2. Attach handlers; read changing values through `useEffectEvent` or refs so you do not reconnect on every render.
3. In cleanup: mark it as intentionally closed, remove handlers, call `close()`.
4. Guard reconnect logic with that flag.

```jsx
import { useEffect, useEffectEvent, useState } from "react";

export function ChatRoom({ roomId, muted }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");

  const onMessage = useEffectEvent((msg) => {
    setMessages((m) => [...m, msg]);
    if (!muted) new Audio("/ping.mp3").play().catch(() => {}); // reads latest "muted"
  });

  useEffect(() => {
    let closedByUs = false;
    let retryTimer;
    let socket;

    function connect() {
      socket = new WebSocket(`wss://chat.example.com/rooms/${roomId}`);
      socket.onopen = () => setStatus("open");
      socket.onmessage = (e) => onMessage(JSON.parse(e.data));
      socket.onclose = () => {
        setStatus("closed");
        if (!closedByUs) retryTimer = setTimeout(connect, 2000); // only reconnect on unexpected drops
      };
    }
    connect();

    return () => {
      closedByUs = true;
      clearTimeout(retryTimer);
      socket.onmessage = null;
      socket.close(1000, "component unmounted");
    };
  }, [roomId]); // reconnect only when the room changes

  return (
    <section>
      <p>Status: {status}</p>
      <ul>{messages.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
    </section>
  );
}
```

For a connection shared by many pages (notifications, presence), open it once in a context provider near the root and let components subscribe and unsubscribe to channels, with cleanup in each subscriber.

> **💡 Interview tip:** Mention Strict Mode: in development React mounts, cleans up and mounts again. If your socket survives that cycle twice, your cleanup is broken.

## How to verify

- DevTools Network tab, filter "WS": leaving the page shows the connection closed; returning creates exactly one.
- In Strict Mode dev, you see one socket opened and closed, then one that stays open.
- Server-side connection count stays flat while navigating back and forth.
- Memory panel: no growing listeners or detached nodes after repeated navigation.

## Follow-up questions

- **Why not create the socket in render or `useMemo`?** Render must be pure and can run multiple times or be discarded; side effects belong in effects.
- **How would you share one socket across components?** A provider or a store (Zustand, Redux middleware) holding the socket, exposing subscribe/unsubscribe with reference counting.
- **What about Server-Sent Events?** Same rule: create an `EventSource` in an effect and call `close()` in cleanup.

## Quick recap

- Browsers own sockets; React does not close them for you.
- Open in an effect, close in its cleanup.
- Guard reconnect logic with an "intentionally closed" flag.
- Use `useEffectEvent` or refs so changing props do not reconnect.
- Share long-lived connections through a provider.
