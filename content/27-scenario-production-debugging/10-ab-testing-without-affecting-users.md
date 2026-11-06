---
title: "How would you implement A/B testing without affecting current users?"
tags: ["ab-testing", "feature-flags", "experimentation", "ssr"]
difficulty: "medium"
---

## Short answer

I put the experiment behind a feature-flag/experimentation service, assign users to variants deterministically (hash of a stable user or anonymous ID) and keep the assignment sticky. I start with a small percentage, exclude users who are mid-flow, decide the variant on the server or at the edge to avoid flicker, track exposure and conversion events, and keep a kill switch to turn the experiment off instantly.

## Why it happens

Naive A/B tests hurt users in predictable ways:

- **Flicker**: the control UI renders, then JavaScript swaps in the variant.
- **Inconsistent experience**: a user sees variant A, then B on refresh.
- **Broken flows**: changing checkout for someone halfway through it.
- **Performance cost**: a blocking third-party experiment script delays rendering.
- **Bad data**: exposure logged for users who never saw the change.

## How to fix it

### 1. Deterministic, sticky assignment

```ts
// Same user always lands in the same bucket, no storage needed
function bucket(userId: string, experiment: string, percentB = 10): "A" | "B" {
  let hash = 0;
  for (const ch of `${experiment}:${userId}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 100 < percentB ? "B" : "A";
}
```

In practice use LaunchDarkly, GrowthBook, Statsig, Optimizely or your own flag service, which do the same with targeting rules.

### 2. Decide before render (no flicker)

```tsx
// Next.js App Router: server component reads the assignment cookie set by middleware
import { cookies } from "next/headers";

export default async function PricingPage() {
  const variant = (await cookies()).get("exp_pricing")?.value ?? "A";
  return variant === "B" ? <PricingV2 /> : <PricingV1 />;
}
```

On a pure SPA, fetch flags before mounting the affected screen, and show a skeleton instead of the control-then-swap.

### 3. Protect current users

- Target only new sessions or users who have not started the flow.
- Roll out 1% -> 10% -> 50% while watching error rates and Web Vitals per variant.
- Kill switch: flipping the flag sends everyone back to control without a deploy.

### 4. Track correctly

```tsx
useEffect(() => {
  track("experiment_exposure", { experiment: "pricing", variant });
}, [variant]);
```

Log exposure only when the variant is actually rendered, and record conversions with the same IDs.

> **⚠️ Gotcha:** Lazy-load the variant code (`React.lazy`) so control users do not download it, and clean up the losing variant and its flag after the test ends.

## How to verify

- Refresh and log in on another device: variant stays the same.
- Sample ratio check: the actual split matches the configured split.
- Error and performance dashboards show no regressions for either variant.

## Follow-up questions

- **Why hash instead of `Math.random()`?** Hashing gives the same answer every time without storing state, so users do not flip between variants.
- **What is a sample ratio mismatch?** When the observed split differs from the target, signalling a bug in assignment or tracking.
- **Client-side vs server-side testing?** Server/edge avoids flicker and hides unreleased code; client-side is easier for small UI tweaks.

## Quick recap

- Flags plus deterministic, sticky bucketing.
- Decide on the server/edge to avoid flicker.
- Small rollout, exclude in-flight users, keep a kill switch.
- Track exposure and conversions accurately, then remove the loser.
