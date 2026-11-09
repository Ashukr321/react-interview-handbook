---
title: "If a user clicks a button multiple times to fetch data, how do you cancel old API calls and use only the latest result?"
tags: ["race-condition", "abortcontroller", "debounce", "async"]
difficulty: "medium"
---

## Short answer

Implement a **"latest request wins"** rule. On each click, abort the previous in-flight request with an `AbortController` kept in a ref, and additionally guard the state update with a request ID so only the newest response is applied. Optionally reduce the number of requests in the first place by debouncing or throttling the click, or disabling the button while a request is pending. Libraries like TanStack Query handle most of this for you.

## Why it happens

Network responses don't arrive in the order they were sent.

```text
click 1 -> request A (slow, 900 ms)
click 2 -> request B (fast, 200 ms)
t=200  B resolves -> UI shows B (correct)
t=900  A resolves -> UI shows A (stale, wrong!)
```

- Each click starts an independent promise, and each one calls `setState` when it finishes.
- Nothing ties a response to "the click that the user cares about now".
- Rapid clicks also waste server capacity and can hit rate limits.

## How to fix it

1. **Abort the previous request** before starting a new one (keeps the network clean).
2. **Track the latest request ID** and ignore any response that isn't the latest (protects against APIs or code paths that can't be aborted).
3. **Reduce clicks** where it makes sense:

| Technique | Use when |
|---|---|
| Disable button while pending | Each click should do one thing (submit, pay) |
| Debounce (e.g. 300 ms) | Only the final click/keystroke in a burst matters (search, filters) |
| Throttle | You want at most one request per interval (refresh button) |
| Abort + latest-ID | Every click is valid, but only the latest result should display |

```jsx
import { useRef, useState } from "react";

export function RefreshQuote() {
  const [quote, setQuote] = useState(null);
  const [status, setStatus] = useState("idle");
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);

  async function handleClick() {
    controllerRef.current?.abort(); // 1. cancel old request
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current; // 2. tag this request

    setStatus("loading");
    try {
      const res = await fetch("/api/quote", { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (requestId !== requestIdRef.current) return; // stale, ignore
      setQuote(data);
      setStatus("success");
    } catch (err) {
      if (err.name === "AbortError") return;
      if (requestId === requestIdRef.current) setStatus("error");
    }
  }

  return (
    <>
      <button onClick={handleClick}>
        {status === "loading" ? "Refreshing..." : "Get quote"}
      </button>
      {status === "error" && <p role="alert">Couldn't load quote.</p>}
      {quote && <blockquote>{quote.text}</blockquote>}
    </>
  );
}
```

Debounced variant for burst clicks (e.g. a filter button group):

```jsx
import { useEffect, useRef } from "react";

function useDebouncedCallback(fn, delay = 300) {
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  };
}
```

With TanStack Query, put the input in the `queryKey`: results for older keys are never shown for the current key, and the `signal` passed to `queryFn` lets the library cancel unused requests.

## How to verify

- DevTools Network with "Slow 3G": click rapidly; earlier requests show as "canceled".
- Mock the API (MSW) with random delays and assert the UI always shows the last response.
- Write a test with fake timers: click twice, resolve the second request first, then the first, and expect the second result on screen.
- Check no error message appears for aborted requests.

## Follow-up questions

- **Why use both abort and a request ID?** Abort may happen too late (response already parsed), and some clients can't abort; the ID check guarantees correctness.
- **What about mutations like "Pay"?** Don't cancel and resend; disable the button and use an idempotency key on the server.
- **Is `useTransition` enough here?** No. It handles render priority, not out-of-order network responses.

## Quick recap

- Responses can arrive out of order.
- Abort the previous request via a ref'd `AbortController`.
- Guard state updates with a latest-request ID.
- Debounce, throttle or disable to reduce requests.
- Never auto-retry or cancel non-idempotent mutations blindly.
