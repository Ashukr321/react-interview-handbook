---
title: "How does streaming SSR use Suspense?"
tags: ["suspense", "ssr", "streaming", "hydration"]
difficulty: "hard"
---

## Short answer

With streaming SSR (`renderToPipeableStream` in Node, `renderToReadableStream` for web streams), React sends the HTML **shell** immediately, rendering each pending Suspense boundary as its fallback. As each boundary's data resolves on the server, React streams that boundary's HTML later in the same response, along with a tiny inline script that swaps it into place. On the client, each boundary hydrates independently (selective hydration), prioritized by user interaction.

## Explanation

Analogy: a restaurant bringing dishes as they're ready instead of waiting to serve the whole table at once. Bread (the shell) arrives instantly; the slow-cooked dish arrives later on the same table.

### Old SSR vs streaming SSR

| Step | `renderToString` (classic) | Streaming with Suspense |
|---|---|---|
| Fetch data | All before rendering | Per boundary, in parallel |
| Send HTML | After everything renders | Shell first, chunks later |
| Load JS | After HTML | Can start while HTML streams |
| Hydrate | Whole app at once | Per boundary, interaction-prioritized |
| Slowest API blocks | Everything | Only its own boundary |

### What travels over the wire

```text
1. Shell:
   header, nav, article...
   boundary B:1 -> fallback HTML (skeleton), marked with comment markers
   script tags for the JS bundle

2. Later, when comments resolve on the server:
   hidden element containing the real comments HTML (id S:1)
   small inline script: swap content of B:1 with S:1   ($RC function)

3. Client:
   JS loads -> hydrateRoot
   hydrates shell, then each boundary as its HTML and code are ready
   a click on an unhydrated boundary -> hydrate it first, replay the event
```

### Shell and errors

- Everything **outside** any Suspense boundary is the shell. `onShellReady` fires when it's ready; that's when you start piping.
- If a component in the shell throws, `onShellError` fires; send an error page.
- If a component inside a boundary throws on the server, React sends the fallback and retries rendering that boundary on the client.
- `onAllReady` waits for everything; use it for crawlers or static generation.

### In frameworks

Next.js App Router streams by default: `loading.js` and your own `Suspense` boundaries define the chunks, and Server Components fetch data on the server. React Router v7 supports streaming via deferred loader promises and `Await`.

## Example

```jsx
// server.js (Node, Express)
import { renderToPipeableStream } from "react-dom/server";
import App from "./App";

app.get("/", (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ["/client.js"],
    onShellReady() {
      res.setHeader("Content-Type", "text/html");
      pipe(res); // start streaming the shell now
    },
    onShellError() {
      res.status(500).send("Something went wrong");
    },
    onError(err) {
      console.error(err);
    },
  });
});
```

```jsx
// App.jsx
import { Suspense } from "react";

export default function App() {
  return (
    <Html>
      <Header />
      <Article />
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments /> {/* streamed later */}
      </Suspense>
    </Html>
  );
}
```

## Common mistakes

- Using `renderToString`, which doesn't support suspending data and can't stream.
- Putting slow data outside any boundary, which blocks the shell and loses the benefit.
- Buffering proxies or compression settings that hold the response until it ends, so nothing actually streams.
- Setting status codes or headers after streaming starts; decide them before `pipe`.

## Follow-up questions

- **Is streamed content good for SEO?** Yes, it's in the same HTML response; for bots you can also wait for `onAllReady`.
- **How does it improve metrics?** Faster TTFB and FCP from the early shell, and better INP since hydration is chunked.
- **What do Server Components add?** Server-only components send no JS to the client, so there's less to download and hydrate.

## Quick recap

- Shell streams first with fallbacks for pending boundaries.
- Resolved boundaries stream later and swap in via inline scripts.
- Each boundary hydrates independently, by interaction priority.
- Shell = content outside any boundary.
- Next.js App Router does this out of the box.
