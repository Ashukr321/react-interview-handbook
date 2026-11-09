---
title: "How do you prevent XSS (Cross-Site Scripting) in a frontend app?"
tags: ["security", "xss", "frontend", "dom"]
difficulty: "medium"
---

## Short answer

Never let untrusted data be interpreted as code. Insert data with text APIs (`textContent`, framework templating like JSX) instead of HTML APIs (`innerHTML`, `insertAdjacentHTML`, `document.write`), sanitize with DOMPurify when HTML is truly needed, validate URLs to block `javascript:` links, and avoid `eval`-style APIs. Then add a Content Security Policy and Trusted Types as a safety net, and keep cookies HttpOnly to limit damage.

## Explanation

The core idea is that XSS happens when the browser cannot tell your code from user data. Every defense keeps the two apart. Think of it like a translator who reads a stranger's note aloud word for word instead of following the instructions written in it.

This answer is framework-agnostic. For the React-specific escape hatches (`dangerouslySetInnerHTML`, refs, prop spreading, SSR state), see the XSS question in section 14.

### Dangerous sinks vs safe alternatives

| Dangerous (interprets code) | Safe alternative |
|---|---|
| `el.innerHTML = data` | `el.textContent = data` |
| `insertAdjacentHTML`, `document.write` | `createElement` + `textContent` |
| `eval(data)`, `new Function(data)`, `setTimeout("string")` | Real functions, `JSON.parse` |
| `a.href = userUrl` | Parse with `new URL()`, allow `http(s)` only |
| jQuery `$(data)` / `.html(data)` | `.text(data)` |
| `location = userInput` | Allow-list of internal paths |

### Where untrusted data comes from

- API responses (stored XSS from other users).
- URL query strings and hashes (reflected and DOM XSS).
- `postMessage` events (check `event.origin`).
- `localStorage`, cookies, third-party widgets, Markdown and rich text.

### Context matters

Escaping for HTML text is different from escaping for an attribute, a URL, a CSS value or a script block. Templating engines and frameworks handle the common contexts; raw string concatenation handles none of them.

### Safety nets

- **CSP** without `'unsafe-inline'` blocks injected inline scripts and handlers.
- **Trusted Types** (`require-trusted-types-for 'script'`) make dangerous sinks throw unless given a sanitized value.
- **HttpOnly cookies** stop session theft even if a script runs.

## Example

Vanilla JS, safe vs unsafe:

```js
const params = new URLSearchParams(location.search);
const name = params.get("name") ?? "guest";

// ❌ DOM XSS: ?name=<img src=x onerror=alert(1)>
// greeting.innerHTML = `Hello ${name}`;

// ✅ treated as text
document.querySelector("#greeting").textContent = `Hello ${name}`;

// ✅ when HTML is required, sanitize first
import DOMPurify from "dompurify";
document.querySelector("#bio").innerHTML = DOMPurify.sanitize(userBioHtml);

// ✅ only trust messages from known origins
window.addEventListener("message", (event) => {
  if (event.origin !== "https://widgets.example.com") return;
  renderStatus(String(event.data.status));
});
```

## Common mistakes

- Thinking "the framework escapes everything", then using its raw-HTML escape hatch.
- Block-listing `<script>` with a regex; payloads use event attributes, SVG and encodings.
- Sanitizing once on input and trusting stored data forever.
- Listening to `postMessage` without checking `event.origin`.

## Follow-up questions

- **What is DOM-based XSS?** XSS that happens entirely in client-side code, when JS reads attacker-controlled input (like `location.hash`) and writes it to a dangerous sink; the server never sees the payload.
- **Does input validation prevent XSS?** It helps, but output encoding at render time is the real fix, because the same data may be rendered in different contexts.
- **How do you find XSS bugs?** Grep for dangerous sinks in code review, lint rules (e.g. `eslint-plugin-no-unsanitized`), CSP reports, and security scanners.

## Quick recap

- Keep data and code separate.
- Use text APIs; avoid HTML and `eval` sinks.
- Sanitize HTML with DOMPurify and validate URLs.
- Add CSP, Trusted Types and HttpOnly cookies as safety nets.
