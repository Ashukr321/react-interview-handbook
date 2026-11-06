---
title: "Explain how you would structure a large-scale React application"
tags: ["architecture", "folder-structure", "scalability"]
difficulty: "hard"
---

## Short answer

I organise a large React app **by feature (domain)** rather than by file type: each feature folder owns its components, hooks, API calls, state and tests, and exposes a small public API. Shared UI and utilities live in a separate `shared` layer, and app-wide wiring (router, providers, store) lives in `app`. On top of that I enforce clear state boundaries (server state vs client state), import rules, TypeScript, code splitting per route, and automated testing and linting.

## Explanation

A large app is like a city. Grouping by type (`components/`, `hooks/`, `services/`) is like putting all kitchens in one district and all bedrooms in another. Grouping by feature gives each house its own rooms, with shared utilities (roads, power) provided centrally.

### Folder structure (feature-based)

```text
src/
  app/                 # entry, router, providers, store setup, global styles
  features/
    auth/
      components/
      hooks/
      api/             # queries/mutations for this feature
      model/           # slice / store / types
      index.ts         # public API: only export what others may use
    cart/
    checkout/
  shared/
    ui/                # Button, Modal, Input (design system)
    lib/               # formatters, http client, utils
    hooks/             # useDebounce, useMediaQuery
  pages/ or routes/    # route components composing features
```

### Key principles

| Concern | Approach |
|---------|----------|
| Boundaries | Features import from `shared`, not from each other's internals (enforce with ESLint `no-restricted-imports` or boundaries plugin) |
| Server state | TanStack Query or RTK Query, cached per feature |
| Client state | Local state first, Context for low-frequency globals, Redux Toolkit/Zustand for complex shared state |
| Routing | React Router v7 or Next.js App Router; lazy-load each route |
| Types | TypeScript strict mode, shared API types generated from OpenAPI/GraphQL |
| Styling | Design system in `shared/ui`; CSS Modules or Tailwind |
| Quality | ESLint, Prettier, Vitest + RTL, Playwright for E2E, CI gates |
| Performance | Route-level code splitting, React Compiler, bundle budgets |
| Scale-out | Monorepo (Turborepo/Nx) or micro-frontends for many teams |

### Colocation

Keep things as close as possible to where they are used. A hook used by one component lives next to it; promote it to `shared` only when a second feature needs it.

## Example

```tsx
// features/cart/index.ts  (public API)
export { CartButton } from "./components/CartButton";
export { useCart } from "./hooks/useCart";

// features/cart/hooks/useCart.ts
import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/lib/http";

export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => http.get("/cart"),
  });
}

// app/router.tsx
import { lazy } from "react";
import { createBrowserRouter } from "react-router";

const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));

export const router = createBrowserRouter([
  { path: "/checkout", element: <CheckoutPage /> },
]);
```

## Common mistakes

- Giant global store holding server data, UI flags and form state together.
- Features importing deep internals of other features, creating a tangled dependency graph.
- Premature abstraction: building a generic "framework" layer before patterns repeat.
- No conventions document, so each team invents its own structure.

## Follow-up questions

- **When would you choose micro-frontends?** When many independent teams need separate deploys; otherwise a modular monolith or monorepo is simpler.
- **How do you prevent circular dependencies?** Layered architecture (app > pages > features > shared), barrel files with explicit exports, and lint rules.
- **How do you share a design system?** As a `shared/ui` package or a separate workspace package with Storybook and visual tests.

## Quick recap

- Organise by feature, not by file type.
- Separate server state from client state.
- Enforce boundaries with public APIs and lint rules.
- Lazy-load routes, type everything, automate quality checks.
