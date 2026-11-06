---
title: "React basic setup and advanced configurations"
tags: ["setup", "vite", "tooling", "configuration"]
difficulty: "medium"
---

## Short answer

For a client-only app, scaffold with **Vite** (`npm create vite@latest`); for production apps the React team recommends a framework such as **Next.js** or **React Router v7**. Create React App is deprecated. Advanced configuration usually means TypeScript, path aliases, environment variables, linting, a dev proxy, testing, and optionally the React Compiler.

## Explanation

### Basic setup

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

Vite gives you instant dev-server start (native ES modules), fast HMR, and a Rollup/Rolldown-based production build. A framework adds routing, SSR, data loading and bundling conventions out of the box:

```bash
npx create-next-app@latest          # Next.js (App Router)
npx create-react-router@latest      # React Router v7 framework mode
```

### Common advanced configurations

| Need | How |
|------|-----|
| Path aliases (`@/components`) | `resolve.alias` in `vite.config` + `paths` in `tsconfig.json` |
| Environment variables | `.env` files; only `VITE_`-prefixed vars reach client code (`import.meta.env`) |
| API proxy in dev | `server.proxy` to avoid CORS during development |
| Linting/formatting | ESLint flat config with `eslint-plugin-react-hooks`, Prettier |
| Testing | Vitest + React Testing Library + `jsdom` |
| Auto memoization | React Compiler via `babel-plugin-react-compiler` |
| Bundle analysis | `rollup-plugin-visualizer`, manual chunks |
| Absolute imports, strictness | `"strict": true` in TypeScript |

Think of the basic setup as a furnished apartment; advanced config is rearranging the furniture to fit how your team actually lives.

## Example

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: ["babel-plugin-react-compiler"] }, // optional
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 3000,
    proxy: { "/api": "http://localhost:8080" },
  },
  build: {
    sourcemap: true,
  },
});
```

```jsx
// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

> **💡 Interview tip:** Mention *why* you would choose a framework: SSR/SSG for SEO, file-based routing, server data loading and Server Components. Pick plain Vite for dashboards or apps behind a login.

## Common mistakes

- Still recommending Create React App for new projects.
- Putting secrets in `VITE_` env vars. Anything bundled for the client is public.
- Forgetting to mirror aliases in `tsconfig.json`, so the editor and type-checker break while the build works.
- Removing `StrictMode` because effects "run twice" in development instead of fixing the effect cleanup.

## Follow-up questions

- **Why is Vite faster than Webpack in dev?** It serves source files as native ES modules and pre-bundles dependencies with esbuild, so it does not bundle the whole app before starting.
- **What does `StrictMode` do?** In development it double-invokes renders and effects to surface impure code and missing cleanups; it has no effect in production.
- **How do you handle different environments?** Use `.env.development`, `.env.production` and mode flags, and keep secrets on the server.

## Quick recap

- Use Vite for SPAs, Next.js or React Router v7 for full apps; CRA is deprecated.
- Configure aliases, env vars, proxy, linting and tests early.
- Client env vars are public; never ship secrets.
- React Compiler can be enabled as a build plugin.
