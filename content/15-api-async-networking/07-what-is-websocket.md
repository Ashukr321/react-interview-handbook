---
title: "What is WebSocket?"
tags: ["websocket", "real-time", "networking"]
difficulty: "medium"
---

## Short answer

WebSocket is a protocol that keeps a single, long-lived, full-duplex TCP connection open between the browser and the server, so both sides can send messages at any time with very little overhead. It starts as an HTTP request with an `Upgrade: websocket` header, and after the `101 Switching Protocols` response the connection stays open. It is used for chat, live dashboards, multiplayer games, collaborative editing and notifications.

## Explanation

HTTP is like sending letters: you write, wait for a reply, and every letter needs a full envelope with addresses (headers). WebSocket is a phone call: you dial once, and then both people can talk whenever they want.

### Handshake

```text
Client                                    Server
  │ GET /chat HTTP/1.1                      │
  │ Upgrade: websocket                      │
  │ Connection: Upgrade                     │
  │ Sec-WebSocket-Key: ...           ─────► │
  │                                         │
  │ ◄───── HTTP/1.1 101 Switching Protocols │
  │                                         │
  │ ◄════════ messages both ways ═════════► │
```

### Real-time options compared

| Technique | Direction | Overhead | Best for |
|---|---|---|---|
| Polling | Client asks repeatedly | High | Simple, infrequent updates |
| Long polling | Server holds request until data | Medium | Fallback |
| Server-Sent Events (SSE) | Server → client only | Low, plain HTTP, auto-reconnect | Feeds, notifications, AI token streaming |
| WebSocket | Both ways | Lowest per message | Chat, games, collaboration |

### Things you must handle yourself

- **Reconnection** with backoff (the native API does not reconnect).
- **Heartbeats** (ping/pong) to detect dead connections behind proxies.
- **Authentication**: browsers cannot set custom headers on `new WebSocket()`; use cookies (validate `Origin` on the server) or a short-lived ticket in the first message or query string.
- **Message format**: usually JSON with a `type` field.
- **Use `wss://`** in production (TLS).

Libraries like Socket.IO add reconnection, rooms and fallbacks, but use their own protocol on top of WebSocket.

## Example

```jsx
import { useEffect, useRef, useState } from "react";

export function useWebSocket(url) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const socketRef = useRef(null);

  useEffect(() => {
    let retry = 0;
    let timer;
    let closedByUs = false;

    function connect() {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => { retry = 0; setStatus("open"); };
      ws.onmessage = (e) => setMessages((prev) => [...prev, JSON.parse(e.data)]);
      ws.onclose = () => {
        setStatus("closed");
        if (closedByUs) return;
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 30_000));
      };
    }
    connect();

    return () => {
      closedByUs = true;
      clearTimeout(timer);
      socketRef.current?.close();
    };
  }, [url]);

  const send = (data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(data));
  };

  return { messages, status, send };
}

export function ChatRoom() {
  const { messages, status, send } = useWebSocket("wss://example.com/chat");
  return (
    <div>
      <p>Status: {status}</p>
      <ul>{messages.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
      <button onClick={() => send({ type: "message", text: "Hello" })}>Send</button>
    </div>
  );
}
```

## Common mistakes

- Opening the socket in render or in an effect without cleanup, which creates duplicate connections (very visible in StrictMode's double effect run).
- Not handling reconnection, so the UI silently stops updating after a network blip.
- Storing every message in state forever; cap the list for long sessions.
- Using WebSocket when SSE would do; WebSockets need sticky sessions or a pub/sub layer to scale horizontally.

## Follow-up questions

- **How do you scale WebSocket servers?** Use a pub/sub backbone (Redis, Kafka) so a message published on one server reaches clients connected to others, plus load balancers that support long-lived connections.
- **Is WebSocket subject to CORS?** No. Browsers send an `Origin` header, and the server must check it itself.
- **WebSocket vs WebTransport?** WebTransport (HTTP/3, QUIC) supports multiple streams and unreliable datagrams; it is newer and less widely used.

## Quick recap

- Persistent, full-duplex connection upgraded from HTTP.
- Low latency, low overhead per message.
- You handle reconnects, heartbeats and auth.
- Prefer SSE for one-way server-to-client streams.
