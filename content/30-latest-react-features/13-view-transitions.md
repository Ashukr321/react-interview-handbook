---
title: "What is <ViewTransition> in React 19.3?"
tags: ["react-19-3", "view-transitions", "animation", "transitions"]
difficulty: "medium"
asked_as: ["How do you animate route changes in React?", "What is addTransitionType?", "How do shared element transitions work in React?"]
---

## Short answer

`<ViewTransition>` (stable in **React 19.3**, imported from `react`) animates its children when they **enter, exit, update or move** between places, using the browser's **View Transition API**. Animations only run for updates React treats as transitions: **`startTransition`**, a **`<Suspense>` reveal**, or a **`useDeferredValue`** update. Urgent updates like typing don't animate. The default animation is a cross-fade; you change it with CSS classes. `addTransitionType("name")` tags a transition so the same change can animate differently, for example forward vs back navigation.

## Explanation

The browser's View Transition API takes a snapshot before and after a DOM change and animates between them. Using it by hand in React is hard, because you must call `document.startViewTransition` at exactly the moment React updates the DOM. `<ViewTransition>` lets React do that timing for you.

### When it animates

| Trigger | Animation kind |
| --- | --- |
| The `<ViewTransition>` mounts in a transition | `enter` |
| It unmounts in a transition | `exit` |
| Its children change content or layout | `update` |
| A `<ViewTransition name="x">` disappears in one place and appears in another | `share` (shared element) |

### Props

- `enter`, `exit`, `update`, `share`, `default`: a View Transition **class name**, `"none"`, or an object keyed by transition type.
- `name`: makes it a shared element; it must be unique on the page at any time.
- `onEnter`, `onExit`, `onUpdate`, `onShare`: callbacks to run custom animations.

## Example

```jsx
import { ViewTransition, startTransition, addTransitionType, useState } from "react";

export default function Slideshow({ slides }) {
  const [index, setIndex] = useState(0);

  function go(direction) {
    startTransition(() => {
      addTransitionType(direction); // "next" or "previous"
      setIndex((i) => (direction === "next" ? i + 1 : i - 1));
    });
  }

  return (
    <>
      <ViewTransition
        key={index}
        enter={{ next: "slide-from-right", previous: "slide-from-left", default: "none" }}
        exit={{ next: "slide-to-left", previous: "slide-to-right", default: "none" }}
      >
        <Slide data={slides[index]} />
      </ViewTransition>
      <button onClick={() => go("previous")} disabled={index === 0}>Back</button>
      <button onClick={() => go("next")} disabled={index === slides.length - 1}>Next</button>
    </>
  );
}
```

```css
::view-transition-new(.slide-from-right) {
  animation: 300ms ease-out both slide-in-right;
}
::view-transition-old(.slide-to-left) {
  animation: 300ms ease-out both slide-out-left;
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) {
    animation: none;
  }
}
```

## Common mistakes

- Updating state with a plain `setState` and wondering why nothing animates. Wrap the update in `startTransition`.
- Using the same `name` on two elements that are on screen at once. Shared names must be unique.
- Animating every Suspense reveal. It gets distracting fast, especially for content that's already cached and loads instantly.
- Ignoring users who prefer reduced motion. Turn animations off with `prefers-reduced-motion`.

## Follow-up questions

- **Does it work in every browser?** It depends on browser support for the View Transition API. Where it's missing, the update still happens, just without animation.
- **Does it work in React Native?** Not yet. It is DOM-only for now.
- **How do routers use it?** Routers wrap navigations in transitions, so wrapping pages in `<ViewTransition>` animates route changes, and `addTransitionType` can mark back vs forward.

## Quick recap

- `<ViewTransition>` animates enter, exit, update and shared-element changes.
- Only transition updates animate: `startTransition`, Suspense reveals, `useDeferredValue`.
- Customize with CSS view-transition classes; the default is a cross-fade.
- `addTransitionType` lets one change animate differently based on its cause.
