---
title: "How do you call and handle responses from AI APIs like OpenAI, Hugging Face, or Google Cloud AI?"
tags: ["ai", "streaming", "api", "bff", "security"]
difficulty: "medium"
---

## Short answer

Never call the AI provider directly from the browser with your secret key. React calls **your own backend** (a Next.js Route Handler, Server Action, or Express endpoint), which holds the key, validates input, applies rate limits, and forwards the request to the provider. Because model responses are slow, the backend streams tokens back (Server-Sent Events or a streamed `Response`) and React renders them as they arrive, with a Stop button that aborts the request.

## Explanation

The API key is like a company credit card. You do not hand it to every website visitor; you have them place an order at your counter, and your staff pays with the card.

### Architecture

```text
React UI ──POST /api/chat──> Your backend ──HTTPS + secret key──> AI provider
   ▲                            │  auth, validation, rate limit,      │
   │                            │  prompt template, logging           │
   └──── streamed text chunks ◄─┴──────────── streamed tokens ◄───────┘
```

### What the backend does

- Keeps the API key in a server environment variable (not `NEXT_PUBLIC_` / `VITE_`).
- Authenticates the user and enforces per-user quotas.
- Validates and limits input size; builds the system prompt server-side.
- Streams the provider response through to the client.
- Optionally moderates output, caches, and logs usage and cost.

### What React does

- Sends the prompt and conversation history.
- Reads the stream with `res.body.getReader()` and appends text to state.
- Shows loading and streaming states, supports cancel via `AbortController`.
- Renders model output as **text or sanitized Markdown**, never raw HTML (model output is untrusted).

Libraries like the Vercel AI SDK (`useChat`) wrap this pattern, but you should be able to explain the underlying fetch-and-stream code.

## Example

Next.js Route Handler (server):

```ts
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json();
  if (!Array.isArray(messages) || JSON.stringify(messages).length > 20_000) {
    return new Response("Invalid input", { status: 400 });
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, stream: true }),
    signal: req.signal,
  });

  if (!upstream.ok) return new Response("AI service error", { status: 502 });
  // pass the SSE stream through; parse "data:" lines on the client (or transform here)
  return new Response(upstream.body, { headers: { "Content-Type": "text/event-stream" } });
}
```

React client:

```jsx
import { useRef, useState } from "react";

export function Chat() {
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef(null);

  async function ask(prompt) {
    controllerRef.current = new AbortController();
    setOutput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
        signal: controllerRef.current.signal,
      });
      if (!res.ok) throw new Error("Request failed");

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep a partial line for the next chunk
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          const delta = JSON.parse(line.slice(6)).choices[0]?.delta?.content ?? "";
          setOutput((prev) => prev + delta);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") setOutput("Something went wrong.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div>
      <button onClick={() => ask("Explain React Fiber in 2 lines")} disabled={streaming}>Ask</button>
      {streaming && <button onClick={() => controllerRef.current.abort()}>Stop</button>}
      <p style={{ whiteSpace: "pre-wrap" }}>{output}</p>
    </div>
  );
}
```

## Common mistakes

- Putting the key in `VITE_OPENAI_KEY` or `NEXT_PUBLIC_...`; it ends up in the bundle and gets abused within hours.
- Rendering model output with `dangerouslySetInnerHTML`. Prompt injection can make the model emit malicious HTML.
- Waiting for the full response with no streaming, leaving users staring at a spinner for 20 seconds.
- No per-user rate limit, so one user can run up a huge bill.

## Follow-up questions

- **SSE vs WebSocket for AI streaming?** SSE/streamed HTTP is simpler and one-directional, which fits token streaming; WebSockets suit truly bidirectional sessions like realtime voice.
- **How do Hugging Face or Google AI differ?** Only the endpoint, auth header and response shape change; the proxy-plus-stream pattern stays the same.
- **How do you handle provider errors?** Map them on the server to stable error codes (e.g. 429 → "busy, retry"), never forward raw provider messages.

## Quick recap

- Browser → your backend → AI provider; keys stay on the server.
- Backend validates, rate-limits and streams.
- React reads the stream and appends text, with abort support.
- Treat model output as untrusted text.
