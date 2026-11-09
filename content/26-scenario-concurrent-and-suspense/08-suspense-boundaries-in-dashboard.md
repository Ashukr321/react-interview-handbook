---
title: "Where would you place Suspense boundaries in a dashboard?"
tags: ["suspense", "dashboard", "loading-states", "architecture"]
difficulty: "medium"
---

## Short answer

Place boundaries around **units the user perceives as one thing**: keep the app shell (nav, sidebar, filters) outside any boundary so it's always visible, add a boundary per independent widget or card, and group widgets that should appear together (like a KPI row) under one shared boundary. Nest boundaries for progressive detail, put an Error Boundary next to each Suspense boundary, and use transitions when filters change so loaded widgets don't flash back to skeletons.

## Why it happens

Boundaries decide two things: **what waits together** and **what gets replaced by a fallback**. Too few boundaries and one slow API hides everything. Too many and the page "popcorns", with dozens of skeletons popping in at random and shifting the layout.

```text
<AppShell>                     ← no boundary: always visible
  <Filters />                  ← always interactive
  <Suspense KPI row>           ← 4 KPIs reveal together
    <Revenue/><Users/><Churn/><MRR/>
  </Suspense>
  <Suspense Chart A> <Suspense Chart B>   ← independent widgets
  <Suspense Activity table>
     <Suspense Row details>    ← nested, finer detail later
</AppShell>
```

### Placement rules of thumb

| Place a boundary... | Because |
| --- | --- |
| Around each independent data widget | Slow APIs stay isolated |
| Around a group that's meaningless when partial (KPI row) | Avoids a jumpy, half-filled row |
| Around lazy-loaded heavy widgets (map, editor) | Code loading doesn't block the page |
| Inside widgets, for secondary detail | Show the main number first, breakdown later |
| Not around the shell or filters | Navigation must never disappear |

## How to fix it

```jsx
import { Suspense, useState, useTransition } from "react";
import { ErrorBoundary } from "react-error-boundary";

function Widget({ title, children }) {
  return (
    <ErrorBoundary fallback={<WidgetError title={title} />}>
      <Suspense fallback={<WidgetSkeleton title={title} />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState("30d");
  const [isPending, startTransition] = useTransition();

  return (
    <Shell>
      <RangePicker
        value={range}
        onChange={(r) => startTransition(() => setRange(r))} // keep old data, no skeleton flash
      />
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        <Widget title="KPIs">
          <KpiRow range={range} /> {/* 4 cards, one boundary */}
        </Widget>
        <Widget title="Revenue"><RevenueChart range={range} /></Widget>
        <Widget title="Signups"><SignupsChart range={range} /></Widget>
        <Widget title="Activity"><ActivityTable range={range} /></Widget>
      </div>
    </Shell>
  );
}
```

A reusable `Widget` wrapper keeps the Suspense + Error Boundary pair consistent across the dashboard.

> **💡 Interview tip:** Without the transition, changing the range would make every widget suspend again and show skeletons. Because the update is a transition, React keeps the already-revealed content on screen until the new data is ready.

## How to verify

- Delay each API in turn: only its widget shows a skeleton.
- Change filters: there's no skeleton flash, just a dimmed `isPending` state.
- Measure CLS; skeletons should match the final widget dimensions.

## Follow-up questions

- **How granular is too granular?** If boundaries reveal within a few hundred ms of each other and cause jank, merge them. React 19 also throttles reveals slightly to batch nearby ones.
- **Should the filters be inside a boundary?** No. They'd vanish whenever data reloads.
- **Where do Error Boundaries go?** Next to each Suspense boundary, so failures are as isolated as loading.

## Quick recap

- Shell and controls stay outside boundaries.
- One boundary per independent widget; group things that must appear together.
- Nest for progressive detail; pair each with an Error Boundary.
- Use transitions on filter changes to avoid skeleton flashes.
