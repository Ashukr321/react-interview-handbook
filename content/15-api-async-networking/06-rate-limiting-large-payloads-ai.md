---
title: "How do you handle rate-limiting or large payloads when consuming AI services?"
tags: ["ai", "rate-limiting", "performance", "scalability"]
difficulty: "hard"
---

## Short answer

For rate limits, respect the provider's `429` responses and `Retry-After` headers with exponential backoff and jitter, queue requests with a concurrency limit on your backend, enforce your own per-user quotas, and debounce or disable UI triggers on the client. For large payloads, shrink what you send (chunk documents, summarize or trim history, use embeddings/RAG instead of pasting whole files), stream responses back, and move long jobs to background workers with polling or webhooks.

## Explanation

An AI API is like a busy restaurant kitchen with a fixed number of chefs. If you send 500 orders at once, most get turned away (429). You need a host at the door (queue), a rule on how many orders per table (quota), and smaller orders (trimmed prompts) so each one is cooked faster.

### Rate limiting

| Where | Technique |
|---|---|
| Client | Debounce inputs, disable Send while streaming, cancel stale requests |
| Your backend | Per-user / per-IP limits (token bucket in Redis), concurrency queue |
| Provider calls | Retry 429/503 with backoff + jitter, honor `Retry-After`, cap attempts |
| Cost control | Track token usage per user, cache identical prompts, choose smaller models for simple tasks |

Provider limits are usually both **requests per minute** and **tokens per minute**, so a few huge prompts can hit the limit as easily as many small ones.

### Large payloads

- **Input**: chunk large documents, embed them, and retrieve only relevant chunks (RAG). Trim or summarize old chat history to fit the context window.
- **Uploads**: send files to object storage (pre-signed URL) and pass a reference to the backend, rather than base64 in JSON.
- **Output**: stream tokens so users see progress; set `max_tokens` to bound cost.
- **Long jobs** (transcription, batch analysis): return a job ID immediately, process in a worker queue, notify via polling, SSE or webhook.
- **Compression**: gzip/brotli on your own API responses.

## Example

Backend retry with backoff:

```ts
async function callWithRetry(fn: () => Promise<Response>, maxAttempts = 4) {
  for (let attempt = 0; ; attempt++) {
    const res = await fn();
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt + 1 >= maxAttempts) return res;

    const retryAfter = Number(res.headers.get("retry-after"));
    const delay = retryAfter > 0
      ? retryAfter * 1000
      : Math.min(1000 * 2 ** attempt, 16_000) + Math.random() * 250; // jitter
    await new Promise((r) => setTimeout(r, delay));
  }
}
```

Client side: one request at a time, and polling for long jobs:

```jsx
import { useEffect, useState } from "react";

export function useJobStatus(jobId) {
  const [job, setJob] = useState({ status: "queued" });

  useEffect(() => {
    if (!jobId) return;
    let timer;
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (cancelled) return;
      setJob(data);
      if (data.status === "queued" || data.status === "running") timer = setTimeout(poll, 2000);
    }
    poll();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [jobId]);

  return job;
}
```

## Common mistakes

- Retrying immediately in a tight loop, which makes the 429 storm worse.
- Retrying non-idempotent or 4xx errors (bad request, context too long) that will never succeed.
- Sending the entire chat history every time until it exceeds the context window.
- Holding an HTTP request open for minutes on a serverless function with a 10-60 second timeout.

## Follow-up questions

- **How do you show rate limits to users?** Return a clear error code from your API and show "You've hit today's limit, resets at X" instead of a generic failure.
- **How do you estimate token size before sending?** Use the provider's tokenizer library (e.g. `tiktoken`) on the server to count and trim.
- **Should you cache AI responses?** For deterministic, repeated prompts (like summarizing the same document), yes, keyed by a hash of model + prompt.

## Quick recap

- Backoff with jitter, honor `Retry-After`, cap retries.
- Queue and quota on your backend; debounce on the client.
- Shrink inputs: chunking, RAG, trimmed history.
- Stream outputs; use background jobs for long tasks.
