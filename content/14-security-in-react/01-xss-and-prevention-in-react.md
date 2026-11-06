---
title: "What is XSS (Cross-Site Scripting) and how do you prevent it in React?"
tags: ["security", "xss", "dompurify", "sanitization"]
difficulty: "medium"
---

## Short answer

XSS is when an attacker gets their own JavaScript to run in your page, usually by injecting it through data that you render. React prevents most XSS by escaping every value placed in JSX, so `{userInput}` becomes text, not HTML. The holes are the escape hatches: `dangerouslySetInnerHTML`, `javascript:` URLs in `href`/`src`, direct DOM writes through refs, and server-rendered state injected into HTML. For those, sanitize with a library like DOMPurify and validate URLs.

## Explanation

Think of React's escaping as a mail room that opens every letter and reads it out loud as plain text. An attacker can write `<script>` in the letter, but it is just read out as the words "less-than script". XSS happens when you bypass the mail room and paste the letter directly onto the wall.

### Types of XSS

| Type | Where the payload lives | Example |
|---|---|---|
| Stored | Database | A comment containing `<img src=x onerror=...>` shown to every visitor |
| Reflected | URL / request | `?q=<script>...` echoed back into the page |
| DOM-based | Client-side JS only | Code reading `location.hash` and writing it to `innerHTML` |

### What React protects

- Text children and attribute values in JSX are escaped.
- React refuses to render plain objects as elements, which blocks some JSON-injection tricks.
- React warns about (and newer versions block) `javascript:` URLs in `href`/`src`, but do not rely on that: validate URLs yourself.

### What React does NOT protect

- `dangerouslySetInnerHTML={{ __html: html }}` renders raw HTML.
- `ref.current.innerHTML = ...`, `document.write`, `eval`, `new Function`.
- Spreading untrusted props (`<div {...userProps} />`) can inject event handlers or `href`.
- SSR: embedding state with `JSON.stringify` inside a `<script>` tag without escaping `</script>`.
- Third-party libraries (markdown renderers, rich text editors) that output HTML.

### Defense in depth

1. Prefer rendering data as text in JSX.
2. If you must render HTML, sanitize it with DOMPurify right before rendering.
3. Allow only `http:`/`https:`/`mailto:` URLs for user-supplied links.
4. Add a Content Security Policy as a second line of defense.
5. Keep auth tokens in HttpOnly cookies so a successful XSS cannot read them.

## Example

```jsx
import DOMPurify from "dompurify";

function SafeHtml({ html }) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

function SafeLink({ url, children }) {
  let safe = "#";
  try {
    const parsed = new URL(url, window.location.origin);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) safe = parsed.href;
  } catch {
    // invalid URL: keep "#"
  }
  return <a href={safe} rel="noopener noreferrer">{children}</a>;
}
```

## Common mistakes

- Sanitizing on input only and then trusting the database forever. Sanitize at render time, for the context you render into.
- Writing a homemade regex "sanitizer" to strip `<script>`. Attackers use `onerror`, SVG, and encoding tricks.
- Assuming React makes `href={userUrl}` safe; older versions only warn, and `data:` or odd schemes may still slip through.
- Running DOMPurify on the server without a DOM (use `isomorphic-dompurify` or sanitize on the client).

## Follow-up questions

- **Why is it called `dangerouslySetInnerHTML`?** The name is a deliberate speed bump so the risk is visible in code review; it also takes an object with `__html` so you cannot pass a string by accident.
- **Does a CSP replace sanitization?** No. CSP limits damage if something slips through, but sanitizing stops the injection in the first place.
- **How would you render user Markdown safely?** Use a renderer that outputs React elements (like `react-markdown`) without raw HTML enabled, or sanitize the HTML output with DOMPurify.

## Quick recap

- XSS = attacker-controlled script running in your origin.
- JSX escapes text and attributes by default.
- Escape hatches (`dangerouslySetInnerHTML`, refs, URLs, SSR state) need sanitizing.
- Use DOMPurify, URL allow-lists, CSP, and HttpOnly cookies together.
