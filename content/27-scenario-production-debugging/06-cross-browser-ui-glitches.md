---
title: "Users report intermittent UI glitches in different browsers — how would you troubleshoot?"
tags: ["cross-browser", "debugging", "css", "compatibility"]
difficulty: "medium"
---

## Short answer

I first gather data: which browsers, versions, devices and steps, using error monitoring, session replay and user-agent info. Then I reproduce on real devices or a cloud service like BrowserStack, isolate whether it is CSS, a missing JS feature, or a timing/race issue, and fix it with standards-based code, feature detection, polyfills or a proper Browserslist config. Finally I add a regression test on that browser.

## Why it happens

| Cause | Example |
| --- | --- |
| Unsupported CSS | `:has()`, container queries or `dvh` on older Safari |
| Missing JS API | `structuredClone`, `Array.prototype.at` on old browsers |
| Engine differences | Flexbox `min-height`, date parsing `new Date("2024-01-02 10:00")` |
| Timing / races | Fonts or images loading later, effect order, double fetches |
| Mobile viewport | `100vh` vs the mobile address bar, iOS safe areas |
| Extensions / locale | Ad blockers, translation tools changing the DOM |

"Intermittent" usually points to a race condition or network-dependent layout.

## How to fix it

### 1. Collect evidence

- Error monitoring (Sentry) grouped by browser and release.
- Session replay to see the actual glitch.
- Ask for a screenshot, browser version and steps.

### 2. Reproduce and isolate

- BrowserStack / Sauce Labs or a real iPhone with Safari Web Inspector.
- Disable extensions, throttle network and CPU to surface races.
- Remove code until the glitch disappears; that pinpoints the cause.

### 3. Fix with feature detection and fallbacks

```css
.panel {
  height: 100vh;       /* fallback */
  height: 100dvh;      /* modern browsers */
}

@supports not (selector(:has(*))) {
  .card.selected { outline: 2px solid var(--accent); }
}
```

```jsx
function useCanShare() {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);
  return canShare;
}
```

### 4. Fix the toolchain

```json
{
  "browserslist": ["> 0.5%", "last 2 versions", "not dead", "iOS >= 15"]
}
```

Autoprefixer and Babel/SWC use this list; add targeted polyfills only for what is needed.

> **⚠️ Gotcha:** Hydration mismatches (dates, `Math.random()`, `window` checks during render) can look like random flicker in one browser. Check the console for hydration warnings.

## How to verify

- Reproduce steps no longer trigger the glitch on the affected browsers.
- Playwright tests run on Chromium, Firefox and WebKit in CI.
- Error rate for that browser drops in monitoring after release.

## Follow-up questions

- **Feature detection vs browser sniffing?** Detect the feature (`"share" in navigator`, `@supports`) because user agents lie and change.
- **What is Browserslist?** A shared config that tells Babel, Autoprefixer and bundlers which browsers to support.
- **How do you catch these earlier?** Cross-browser e2e tests, visual regression tests, and checking "Baseline" status on MDN before using new features.

## Quick recap

- Gather browser, version, device and steps from monitoring and replays.
- Reproduce on real engines; "intermittent" often means a race.
- Use `@supports`, feature detection, fallbacks and Browserslist.
- Lock it in with cross-browser e2e tests.
