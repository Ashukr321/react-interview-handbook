---
title: "What is the <Activity> component in React 19.2?"
tags: ["react-19-2", "activity", "offscreen", "state-preservation", "performance"]
difficulty: "medium"
asked_as: ["How do you keep a tab's state when it is hidden?", "Activity vs conditional rendering", "How do you pre-render a screen the user is likely to open next?"]
---

## Short answer

`<Activity mode="visible" | "hidden">` lets you **hide part of the UI without unmounting it**. In `hidden` mode, React hides the children (with `display: none`), **cleans up their effects**, and **keeps their state and DOM**. Updates inside run at the lowest priority, after visible work. When it becomes visible again, the state is still there and effects run again. It is useful for tabs, sidebars, back-navigation and pre-rendering screens the user will likely open next.

## Explanation

Before `<Activity>` you had two imperfect options:

| Approach | Problem |
| --- | --- |
| `{isOpen && <Panel />}` | Unmounts: loses state (scroll position, form input) and has to re-render from scratch |
| CSS `display: none` | Keeps state, but effects keep running (timers, subscriptions, videos) and updates still compete with visible UI |

`<Activity>` combines the best of both:

| | `visible` | `hidden` |
| --- | --- | --- |
| Rendered on screen | Yes | No (`display: none`) |
| State and DOM kept | Yes | Yes |
| Effects | Mounted | Cleaned up (cleanup functions run) |
| Updates | Normal priority | Deferred until React has nothing else to do |

### Pre-rendering

Because a hidden Activity still renders at low priority, you can render a screen *before* the user opens it. Its code and data (with Suspense) are loaded in the background, so opening it feels instant.

## Example

```jsx
import { Activity, useState } from "react";

export default function Tabs() {
  const [tab, setTab] = useState("home");

  return (
    <>
      <nav>
        <button onClick={() => setTab("home")}>Home</button>
        <button onClick={() => setTab("search")}>Search</button>
      </nav>

      {/* Both stay mounted; the hidden one keeps its typed query and scroll. */}
      <Activity mode={tab === "home" ? "visible" : "hidden"}>
        <HomeFeed />
      </Activity>
      <Activity mode={tab === "search" ? "visible" : "hidden"}>
        <SearchPage />
      </Activity>
    </>
  );
}
```

## Common mistakes

- Expecting effects to keep running while hidden. They are cleaned up on hide; a video or WebSocket should pause or disconnect in its effect cleanup.
- Wrapping huge, rarely used screens in `<Activity>`. Hidden trees still use memory; keep it for screens the user switches between often.
- Using it as a security or access-control tool. Hidden content is still in the DOM.
- Assuming DOM side effects stop when hidden. Things not controlled by effects (like a `<video>` that autoplays) may need manual handling.

## Follow-up questions

- **Why clean up effects when hidden?** So hidden screens don't run timers, subscriptions or network polling in the background. This is also why StrictMode tests effects with setup → cleanup → setup.
- **How does it work with Suspense?** Hidden content that suspends doesn't show fallbacks to the user; it just loads in the background.
- **Was this called something else before?** Yes. It was developed for years under the name "Offscreen".

## Quick recap

- `<Activity mode="hidden">` hides UI but keeps its state and DOM.
- Effects are cleaned up while hidden and run again when shown.
- Hidden updates run at the lowest priority.
- Use it for tabs, back-navigation and pre-rendering likely next screens.
