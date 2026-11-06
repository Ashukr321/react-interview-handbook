---
title: "Why migrate from Angular to React? What challenges did you face?"
tags: ["architecture", "migration", "angular", "decision-making"]
difficulty: "medium"
---

## Short answer

Teams usually migrate because of a business driver, not taste: AngularJS (1.x) reached end of life in January 2022, hiring for React is easier, and React's ecosystem (Next.js, React Native, TanStack Query) fits the roadmap. The safe way is an incremental "strangler fig" migration, route by route or widget by widget. The hard parts are running two frameworks side by side, reshaping state and dependency injection, and retraining the team.

## Explanation

### Typical reasons (say the ones that are true for you)

- **End of life / security**: AngularJS gets no more patches, which fails security audits.
- **Hiring and team velocity**: a larger React talent pool and simpler mental model (components are just functions).
- **Ecosystem**: SSR with Next.js, code sharing with React Native, a component library already written in React.
- **Performance and bundle control**: lighter runtime, fine-grained code splitting.

> **💡 Interview tip:** Never say "Angular is bad." Say what problem the migration solved and how you measured it (bundle size, Lighthouse, release frequency, onboarding time).

### How to migrate without a rewrite

Think of renovating a house while living in it: one room at a time, and the house is always livable.

1. **Freeze new Angular code**: all new features are built in React.
2. **Mount React islands inside Angular** (or Angular inside a React shell) through a thin wrapper.
3. **Move route by route**: a shared router or a reverse proxy sends some URLs to the new app.
4. **Share the boring layers first**: auth tokens, API client, design tokens, analytics.
5. **Delete Angular** once the last route moves.

### Challenges you will be asked about

| Angular concept | React equivalent | Challenge |
|---|---|---|
| Two-way binding (`ngModel`) | Controlled inputs, one-way data flow | Forms need rewriting (React Hook Form) |
| Services + DI | Context, custom hooks, modules | Singletons must be shared across both apps |
| RxJS everywhere | Hooks, TanStack Query, Redux Toolkit | Streams must be bridged or replaced |
| Zone.js change detection | Explicit state updates | Bugs when Angular state changes but React does not re-render |
| Modules, decorators | Plain imports | Folder structure and conventions change |

Other real pain points: shipping two framework runtimes during the transition (bigger bundles), duplicated global CSS, two test setups (Karma/Jasmine vs Vitest/RTL), and keeping feature delivery going while migrating.

## Example

A React component hosted inside an Angular component during the transition:

```tsx
import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnChanges, OnDestroy } from "@angular/core";
import { createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { Cart } from "./react/Cart";

@Component({ selector: "app-react-cart", template: "<div #host></div>" })
export class ReactCartWrapper implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("host") host!: ElementRef<HTMLDivElement>;
  @Input() userId!: string;
  private root?: Root;

  ngAfterViewInit() {
    this.root = createRoot(this.host.nativeElement);
    this.render();
  }
  ngOnChanges() {
    this.render(); // pass new Angular inputs down as React props
  }
  ngOnDestroy() {
    this.root?.unmount(); // avoid leaking the React tree
  }
  private render() {
    this.root?.render(createElement(Cart, { userId: this.userId }));
  }
}
```

## Common mistakes

- Proposing a big-bang rewrite that freezes features for months.
- Forgetting to unmount React roots when Angular destroys the host, which leaks memory.
- Keeping two sources of truth for the same data (Angular service and React store).
- Not measuring before and after, so the migration has no proof of value.

## Follow-up questions

- **How did you share auth between both apps?** Store the token in one place (cookie or a shared module) and expose it through an Angular service and a React hook that read the same source.
- **Would you use micro-frontends?** Only if separate teams deploy independently; for one team, module federation adds more complexity than it removes.
- **How did you keep the UI consistent?** Shared design tokens (CSS variables) used by both frameworks until the Angular components are gone.

## Quick recap

- Migrate for a business reason: EOL, hiring, ecosystem, performance.
- Use the strangler fig pattern: new code in React, move route by route.
- Bridge with wrapper components and shared auth/API layers.
- Expect pain in forms, DI/RxJS, double bundles and testing.
- Measure the result so the decision is defensible.
