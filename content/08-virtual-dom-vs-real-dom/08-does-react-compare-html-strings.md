---
title: "Does React compare HTML strings?"
tags: ["virtual-dom", "diffing", "misconceptions"]
difficulty: "easy"
---

## Short answer

No. React never builds or compares HTML strings on the client. It compares **JavaScript objects**: the new React elements your components return versus the current fiber tree, checking `type`, `key` and props field by field. HTML strings only appear in server rendering (`renderToString`, streaming SSR) as output, and even hydration attaches to existing DOM nodes rather than comparing markup text.

## Explanation

### What React actually compares

| Compared | How |
|---|---|
| Element `type` | Reference equality (`"div" === "div"`, `MyComp === MyComp`) |
| `key` | String equality |
| Props on host elements | Each prop compared; changed ones recorded as updates |
| `style` | Diffed per style property |
| Text children | String comparison of the text value only |
| Component props for `memo` | Shallow `Object.is` per prop |

### Why strings would be a bad idea

- Serializing a tree to a string and parsing it back is slower than comparing object fields.
- Strings lose identity: you can't tell which node moved, which component owns state, or attach event handlers.
- Replacing `innerHTML` destroys focus, selection, scroll positions and input values, and is an XSS risk.

That was the old "template string + `innerHTML`" approach many pre-React apps used, and it's exactly what React's element model replaced.

Analogy: comparing two Lego models brick by brick versus photographing both and comparing the photos pixel by pixel. The brick-by-brick approach tells you exactly which brick to swap.

```text
Not this:   "<p class=\"a\">Hi</p>"  vs  "<p class=\"b\">Hi</p>"
But this:   { type:"p", props:{className:"a", children:"Hi"} }
       vs   { type:"p", props:{className:"b", children:"Hi"} }
       ->   one update: className "a" -> "b"
```

### Where HTML strings do appear

- **SSR**: `renderToPipeableStream` / `renderToReadableStream` output HTML for the first paint.
- **Hydration**: React walks the existing DOM and attaches fibers to it. In development it warns on mismatches (React 19 shows a diff), but it compares node by node, not raw HTML strings.
- **`dangerouslySetInnerHTML`**: React compares the `__html` string prop and, if it changed, replaces `innerHTML` wholesale.

## Example

```jsx
import { useState } from "react";

export default function Note() {
  const [bold, setBold] = useState(false);

  return (
    <>
      <button onClick={() => setBold((b) => !b)}>Toggle bold</button>
      {/* React diffs { type: "p", props: { style: {...} } }: only fontWeight changes */}
      <p style={{ fontWeight: bold ? 700 : 400 }}>Release notes</p>

      {/* Escape hatch: here React compares the __html string and resets innerHTML */}
      <div dangerouslySetInnerHTML={{ __html: "<em>Sanitized HTML only</em>" }} />
    </>
  );
}
```

## Common mistakes

- Describing the Virtual DOM as "an HTML string in memory".
- Using `dangerouslySetInnerHTML` with unsanitized user input (use DOMPurify or similar).
- Expecting React to preserve child state inside `dangerouslySetInnerHTML` content; it's opaque to React.

## Follow-up questions

- **How are text nodes compared?** As HostText fibers; if the string differs, React sets `nodeValue`.
- **What causes hydration mismatches?** Rendering different output on server and client, e.g. `Date.now()` or `window` checks during render.
- **Is JSX a string template?** No. JSX compiles to `jsx()` calls that return objects.

## Quick recap

- React compares objects, not HTML strings.
- `type`, `key` and props are checked field by field.
- Strings appear only as SSR output or via `dangerouslySetInnerHTML`.
- Object diffing preserves identity, state and DOM nodes.
