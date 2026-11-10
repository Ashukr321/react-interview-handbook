---
title: "What are browser() and Trusted Types support in React 19.3?"
tags: ["react-19-3", "ssr", "hydration", "browser", "trusted-types", "security"]
difficulty: "hard"
asked_as: ["How do you render a component only on the client?", "How do you avoid hydration mismatches for localStorage or timezones?", "Does React support Trusted Types?"]
---

## Short answer

`browser()` from **`react-dom`** (React 19.3), used as **`use(browser())`**, marks a component as **browser-only**. On the server it suspends, so the nearest `<Suspense>` fallback goes into the HTML. In the browser, after hydration, it doesn't suspend, and the real component renders. That avoids hydration mismatches for things like `localStorage`, `window` size or the user's timezone. React 19.3 also supports **Trusted Types**: it no longer turns `TrustedHTML`, `TrustedScript` and `TrustedScriptURL` objects into strings, so sites that enforce Trusted Types in their CSP work with React.

## Explanation

### The problem `browser()` solves

The server doesn't know the user's timezone, screen size or `localStorage`. If a component renders those values, the server HTML and the first client render differ, and you get a hydration error. The usual workaround was:

```jsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Fallback />;
```

That works, but it costs an extra render on every mount, and you write it again in each component. `use(browser())` uses Suspense instead: the server sends the fallback, and the client renders the real content once it hydrates.

Like any `use` call, it can be called **conditionally** or after an early return, so a component can opt out of server rendering only when it needs to.

### Trusted Types

Trusted Types is a browser security feature against DOM-based XSS. With the CSP header `require-trusted-types-for 'script'`, the browser only accepts values created by your sanitization policy in dangerous places such as `innerHTML` or `script.src`. React used to convert values with `'' + value`, which turned trusted objects into plain strings that the browser then rejected. React 19.3 passes them through unchanged.

## Example

```jsx
import { Suspense, use } from "react";
import { browser } from "react-dom";

function LocalTime({ serverTime }) {
  if (serverTime) return <time>{serverTime}</time>; // no opt-out needed
  use(browser()); // server: suspend -> fallback in HTML
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <time>{new Date().toLocaleTimeString()} ({zone})</time>;
}

export default function Header() {
  return (
    <Suspense fallback={<time>--:--</time>}>
      <LocalTime />
    </Suspense>
  );
}
```

```jsx
// Trusted Types: values from your policy now work with React
const policy = trustedTypes.createPolicy("app", {
  createHTML: (input) => DOMPurify.sanitize(input),
});

function Article({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: policy.createHTML(html) }} />;
}
```

## Common mistakes

- Using `browser()` for content that matters for SEO. Search engines only see the fallback in the server HTML.
- Forgetting a `<Suspense>` boundary around the component, so a larger part of the page shows its fallback.
- Calling it in a component that doesn't need it. Server render what you can; opt out only for truly browser-only values.
- Thinking Trusted Types support makes `dangerouslySetInnerHTML` safe. You still need a real sanitizer in your policy.

## Follow-up questions

- **How is this different from `next/dynamic` with `ssr: false`?** That skips SSR for a whole lazily loaded module at the framework level. `browser()` is a React API, works in any SSR setup and can be conditional.
- **Is there a server option for it?** Yes. The `react-dom/server` APIs got an `onBrowserBailout` option that reports when a component opted out.
- **Why use Suspense instead of the `mounted` state trick?** It avoids an extra render and fits React's streaming and hydration model.

## Quick recap

- `use(browser())` renders a component only in the browser, with a Suspense fallback on the server.
- It removes the `useEffect` + `mounted` workaround and its hydration errors.
- It can be called conditionally.
- React 19.3 passes Trusted Types values through, so CSP Trusted Types work.
