---
title: "Why does navigation in SPAs not trigger a full page reload?"
tags: ["spa", "routing", "history-api", "browser"]
difficulty: "medium"
---

## Short answer

Because the router intercepts the navigation. A router `<Link>` renders a real anchor but calls `event.preventDefault()` on click, then uses `history.pushState()` to change the URL. `pushState` updates the address bar and history stack without sending any request, and the router re-renders the component that matches the new URL. Back and forward buttons fire a `popstate` event, which the router also listens to.

## Explanation

The History API lets JavaScript edit the browser's history like a notebook: you can write a new line (`pushState`), correct the current line (`replaceState`), and get notified when the user flips pages (`popstate`). None of these ask the server for anything.

```text
 User clicks <Link to="/cart">
        |
        v
 onClick: event.preventDefault()     (stop the browser's default navigation)
        |
        v
 history.pushState(state, "", "/cart")   (URL changes, no request)
        |
        v
 Router updates its location state -> React re-renders matching route

 User presses Back
        |
        v
 Browser fires "popstate" -> router reads location -> re-render
```

### History API pieces

| API | What it does | Request sent? |
|---|---|---|
| `history.pushState(state, "", url)` | Adds a new history entry | No |
| `history.replaceState(state, "", url)` | Replaces current entry (redirects, filters) | No |
| `window.addEventListener("popstate", ...)` | Fires on back/forward | No |
| `location.href = url` | Real navigation | Yes, full reload |

Newer browsers also support the **Navigation API** (`navigation.addEventListener("navigate", ...)`), which can intercept all same-origin navigations in one place; routers may adopt it over time.

### Why links stay real anchors

`<Link>` still renders an anchor with `href`, so middle-click, "open in new tab", accessibility and crawlers work. The router only intercepts plain left-clicks without modifier keys.

### The server side

`pushState` never hits the server, but a refresh on `/cart` does. The server or CDN must return `index.html` for unknown paths (history API fallback), or users get a 404.

## Example

A tiny router showing the mechanism:

```jsx
import { useEffect, useState } from "react";

function useLocationPath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to) => {
    window.history.pushState({}, "", to);
    setPath(to); // pushState does not fire popstate, so update state ourselves
  };
  return [path, navigate];
}

export default function App() {
  const [path, navigate] = useLocationPath();
  const link = (to, label) => (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // allow new tab
        e.preventDefault();
        navigate(to);
      }}
    >
      {label}
    </a>
  );
  return (
    <>
      <nav>{link("/", "Home")} {link("/cart", "Cart")}</nav>
      {path === "/cart" ? <h1>Cart</h1> : <h1>Home</h1>}
    </>
  );
}
```

## Common mistakes

- Thinking `pushState` fires `popstate`; it does not, the router must update itself.
- Using `window.location.href` for internal navigation, which reloads the app.
- Rendering buttons with `onClick={() => navigate(...)}` for links, which breaks open-in-new-tab and SEO.
- Missing the server fallback, so deep links 404 after refresh.

## Follow-up questions

- **What about hash routing?** `HashRouter` puts the route after `#`; hash changes never hit the server, so it works on static hosts without rewrites, but URLs are uglier and worse for SEO.
- **Where is scroll position handled?** Routers restore scroll manually (React Router's `ScrollRestoration`) because there is no document load.
- **What does `history.state` hold?** Any serializable data passed to `pushState`, available again when the user returns to that entry.

## Quick recap

- Router intercepts link clicks with `preventDefault()`.
- `pushState` changes the URL without a request.
- `popstate` handles back/forward.
- React re-renders the matching route; the document stays.
- Server must fall back to `index.html` for deep links.
