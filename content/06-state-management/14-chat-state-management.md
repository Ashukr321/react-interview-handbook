---
title: "How will you manage chat state?"
tags: ["websocket", "real-time", "normalization", "optimistic-updates", "scenario"]
difficulty: "hard"
---

## Short answer

I split chat state into layers: **conversations and message history** as server state (paginated, cached queries), **live updates** pushed from a WebSocket into that cache or a normalized store, **messages grouped per conversation** as `{ ids, entities }` so one new message touches one list, **optimistic sends** with a temporary id and a status (`sending`, `sent`, `failed`), and **purely local UI state** (draft text, typing indicator, scroll position) kept in components. The message list is virtualized.

## Explanation

A chat app is a stream that never stops. Think of a post office sorting room: letters (messages) arrive constantly, each is dropped into the right pigeonhole (conversation), outgoing letters get a tracking status, and nobody re-sorts the whole room for one letter.

### What state exists

| State | Where it lives |
|---|---|
| Conversation list, unread counts | Normalized slice or query cache, updated by socket events |
| Message history | Per-conversation, paginated with cursor (`before=<messageId>`) |
| New incoming messages | WebSocket event, appended to the right conversation |
| Outgoing messages | Optimistic entry with `clientId` and `status` |
| Active conversation id | URL (`/chat/:conversationId`) |
| Draft text | Local state (optionally persisted per conversation) |
| Typing / presence | Short-lived socket state; separate slice so it does not re-render messages |
| Socket connection status | Small global slice for the "Reconnecting..." banner |

### Data flow

```text
User sends  -> add optimistic msg {clientId, status:"sending"} -> socket.emit
Server ack  -> replace clientId with server id, status:"sent"
Server fail -> status:"failed", show Retry
Socket "message" event -> dedupe by id -> append to conversation -> bump unread
Reconnect   -> fetch messages since lastSeenId to fill gaps
```

### Key design points

- **One socket connection** for the app, managed in a provider or middleware, not inside each component.
- **Dedupe** by server id: the ack and the broadcast can both arrive.
- **Order** by server timestamp or sequence number, not arrival time.
- **Bounded memory**: keep only recent pages per conversation; refetch older ones on scroll.
- **Virtualize** messages with reverse infinite scroll.

## Example

```jsx
// chatSlice.js
import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

const messagesAdapter = createEntityAdapter({
  sortComparer: (a, b) => a.createdAt - b.createdAt,
});

const chatSlice = createSlice({
  name: "chat",
  initialState: { byConversation: {} }, // { [convId]: { ids, entities } }
  reducers: {
    messageReceived(state, { payload }) {
      const conv = (state.byConversation[payload.conversationId] ??= messagesAdapter.getInitialState());
      messagesAdapter.upsertOne(conv, payload); // upsert = dedupe by id
    },
    messageSending(state, { payload }) {
      const conv = (state.byConversation[payload.conversationId] ??= messagesAdapter.getInitialState());
      messagesAdapter.addOne(conv, { ...payload, id: payload.clientId, status: "sending" });
    },
    messageAcked(state, { payload: { conversationId, clientId, message } }) {
      const conv = state.byConversation[conversationId];
      messagesAdapter.removeOne(conv, clientId);
      messagesAdapter.upsertOne(conv, { ...message, status: "sent" });
    },
    messageFailed(state, { payload: { conversationId, clientId } }) {
      messagesAdapter.updateOne(state.byConversation[conversationId], {
        id: clientId,
        changes: { status: "failed" },
      });
    },
  },
});

export const { messageReceived, messageSending, messageAcked, messageFailed } = chatSlice.actions;
export default chatSlice.reducer;
```

```jsx
// useChatSocket.js - one connection, dispatches into the store
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { messageReceived } from "./chatSlice";

export function useChatSocket(url) {
  const dispatch = useDispatch();
  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === "message") dispatch(messageReceived(event.message));
    };
    return () => ws.close();
  }, [url, dispatch]);
}
```

> **💡 Interview tip:** Mention reconnection and gap-filling. Many candidates handle the happy path but forget that messages sent while the socket was down must be fetched on reconnect.

## Common mistakes

- Storing all messages of all chats in one flat array and filtering on every render.
- Opening a WebSocket inside each chat component, creating duplicate connections and duplicate messages.
- Putting typing indicators in the same state as messages, re-rendering the whole list several times a second.
- Rendering thousands of messages without virtualization.

## Follow-up questions

- **How do you show unread counts?** Store `lastReadMessageId` per conversation and derive unread counts in a selector or receive them from the server.
- **How do you keep scroll position when loading older messages?** Measure scroll height before prepending and restore the offset after, or use a reverse virtualized list.
- **Would you use RTK Query here?** Yes, for history: use `onCacheEntryAdded` to open the socket and `updateCachedData` to stream new messages into the cached query.

## Quick recap

- History is paginated server state; live messages come from one socket.
- Group and normalize messages per conversation.
- Optimistic sends with `clientId` and status, deduped on ack.
- Keep drafts, typing and presence separate and local; virtualize the list.
