---
title: "What are error boundaries and what can't they catch?"
tags: ["error-boundary", "errors", "class-components", "resilience"]
difficulty: "medium"
asked_as: ["How do you handle errors in React components?", "Can error boundaries catch errors in event handlers?", "getDerivedStateFromError vs componentDidCatch"]
---

## Short answer

An error boundary is a component that **catches errors thrown while rendering its children**, shows a fallback UI instead of a blank screen, and lets you log the error. It must be a **class component** that implements `static getDerivedStateFromError` (to switch to the fallback) and usually `componentDidCatch` (to log). It does **not** catch errors in event handlers, in async code like `setTimeout` or promise callbacks, during server rendering, or inside the boundary itself.

## Explanation

Since React 16, an error thrown during rendering that nobody catches **unmounts the whole app**. React does this on purpose: showing a broken UI (for example a payment page with wrong numbers) is worse than showing nothing. Error boundaries let you choose a smaller blast radius: one widget fails, the rest of the page keeps working.

### The two methods

| Method | When it runs | Use it for |
| --- | --- | --- |
| `static getDerivedStateFromError(error)` | During render | Return new state so the next render shows the fallback |
| `componentDidCatch(error, info)` | During commit | Side effects: logging to Sentry and similar tools; `info.componentStack` shows where the error came from |

There is no hook equivalent, so a function component cannot be an error boundary by itself. Most teams write one class once, or use the `react-error-boundary` package.

### What it catches and what it doesn't

| Caught | Not caught |
| --- | --- |
| Errors during rendering of children | Errors in event handlers (use `try/catch`) |
| Errors in lifecycle methods and effects of children | `setTimeout`, promise `.then`, `fetch` callbacks |
| Errors thrown by components that suspend and then fail (`lazy`, `use`) | Errors during server-side rendering |
| Errors from `startTransition` actions (React 19) | Errors thrown inside the boundary component itself |

To send an async or event-handler error to a boundary, put it into state and throw it during render. `react-error-boundary` does this for you with `useErrorBoundary().showBoundary(error)`.

## Example

```jsx
import { Component } from "react";

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logToService(error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          <p>This section failed to load.</p>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  return (
    <main>
      <Header />
      {/* One broken chart does not take down the whole dashboard. */}
      <ErrorBoundary>
        <RevenueChart />
      </ErrorBoundary>
      <ErrorBoundary>
        <RecentOrders />
      </ErrorBoundary>
    </main>
  );
}
```

## Common mistakes

- Wrapping only the root. Every error then replaces the entire app with one fallback. Put boundaries around independent sections (routes, widgets, sidebars).
- Expecting a boundary to catch a failed `fetch` in an event handler. It won't; handle it with `try/catch` and state.
- Having no way to recover. Add a "Try again" button that resets the state, or reset the boundary automatically by changing its `key` (for example on route change).
- Throwing in the fallback UI. The error then goes up to the next boundary.

## Follow-up questions

- **Where should boundaries go?** Around each route, and around any widget that can fail on its own. Think about what the user can still do when that part breaks.
- **How do boundaries work with Suspense?** Suspense handles "still loading"; an error boundary handles "failed". Wrap both around the same section to cover both states.
- **How do I log errors globally in React 19?** `createRoot` accepts `onCaughtError`, `onUncaughtError` and `onRecoverableError` callbacks.
- **Why are they still class components?** There is no hook for catching render errors yet; React has not added one.

## Quick recap

- Error boundaries catch render, lifecycle and effect errors in their children.
- They need a class with `getDerivedStateFromError` (fallback) and `componentDidCatch` (logging).
- They do not catch event handler, async, SSR or self errors.
- Place several boundaries so one failure doesn't blank the whole app, and give users a way to retry.
