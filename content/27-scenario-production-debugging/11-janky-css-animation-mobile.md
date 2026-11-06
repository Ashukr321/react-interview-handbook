---
title: "A CSS animation is janky on mobile devices — how do you identify and fix the issue?"
tags: ["animation", "css", "performance", "compositing"]
difficulty: "medium"
---

## Short answer

I record the animation in the Chrome Performance panel with CPU throttling (or remote-debug a real phone) and look for dropped frames, layout and paint work on every frame, or long JavaScript tasks. The usual fix is to animate only `transform` and `opacity` so the GPU compositor handles it, avoid layout reads during animation, and drive JS animations with `requestAnimationFrame` or the Web Animations API.

## Why it happens

The browser has about 16.7 ms per frame at 60 fps (8.3 ms at 120 Hz). Each frame may go through:

```text
JavaScript -> Style -> Layout -> Paint -> Composite
```

- Animating `top`, `left`, `width`, `height`, `margin` triggers **layout + paint** every frame.
- Animating `box-shadow`, `background`, `filter: blur()` triggers expensive **paint**.
- JS that reads `offsetHeight` after writing styles causes **forced synchronous layout**.
- Heavy React re-renders during animation steal main-thread time.
- Mobile CPUs/GPUs are several times slower than a dev laptop.

## How to fix it

### 1. Identify

- DevTools -> Performance -> CPU 4x/6x slowdown -> record -> look for red frames in the Frames track and purple Layout blocks.
- Rendering tab: enable **Paint flashing** and **Layer borders** to see what repaints.
- For real devices: `chrome://inspect` (Android) or Safari Web Inspector (iOS).

### 2. Animate compositor-friendly properties

```css
/* Bad: layout every frame */
.drawer { transition: left 300ms ease; left: -300px; }
.drawer.open { left: 0; }

/* Good: compositor only */
.drawer {
  transform: translateX(-100%);
  transition: transform 300ms ease;
}
.drawer.open { transform: translateX(0); }

@media (prefers-reduced-motion: reduce) {
  .drawer { transition: none; }
}
```

Use `will-change: transform` only on the element about to animate, not on everything (each layer costs GPU memory).

### 3. Keep React out of the per-frame loop

```jsx
function Progress({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    // Web Animations API runs off the React render cycle
    const anim = ref.current.animate(
      [{ transform: "scaleX(0)" }, { transform: `scaleX(${value})` }],
      { duration: 400, easing: "ease-out", fill: "forwards" }
    );
    return () => anim.cancel();
  }, [value]);
  return <div ref={ref} className="bar" style={{ transformOrigin: "left" }} />;
}
```

Avoid calling `setState` on every animation frame; libraries like Motion animate via direct style updates.

> **💡 Interview tip:** Say "transform and opacity" early, then explain why: they skip layout and paint and run on the compositor thread, even if the main thread is busy.

## How to verify

- Frames track shows steady green frames, no layout per frame.
- Paint flashing shows no repaints during the animation.
- Test on a real low-end Android device, not just the emulator.

## Follow-up questions

- **What does `will-change` do?** Hints the browser to promote the element to its own layer in advance; overuse wastes memory.
- **Why is `requestAnimationFrame` better than `setInterval`?** It syncs with the display refresh and pauses in background tabs.
- **What is layout thrashing?** Alternating style writes and layout reads in a loop, forcing many synchronous reflows.

## Quick recap

- Measure with throttled Performance recordings and paint flashing.
- Animate `transform` and `opacity` only.
- Avoid forced layouts and per-frame React state updates.
- Respect `prefers-reduced-motion` and test on real devices.
