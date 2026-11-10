---
title: "What is new in React since React 18?"
tags: ["react-19", "react-19-2", "react-19-3", "overview", "release-history"]
difficulty: "easy"
asked_as: ["What are the latest features in React?", "What changed in React 19?", "Which React version are you using and what's new in it?"]
---

## Short answer

React 19 (December 2024) added **Actions** and the hooks built on them (`useActionState`, `useFormStatus`, `useOptimistic`), the **`use`** API, stable **Server Components and Server Functions**, **`ref` as a prop**, **`<Context>` as a provider** and built-in **document metadata**. React 19.1 improved debugging with **owner stacks**. React 19.2 added **`<Activity>`**, **`useEffectEvent`** and **Performance Tracks**. React 19.3 (September 2026) added **`<ViewTransition>`**, **Fragment refs**, **`browser()`** and **Trusted Types** support. Separately, the **React Compiler** reached 1.0 in October 2025 and memoizes components automatically.

## Explanation

### Release timeline

| Version | Date | Headline features |
| --- | --- | --- |
| 18.0 | Mar 2022 | `createRoot`, concurrent rendering, automatic batching, `useTransition`, `useDeferredValue`, `useId`, `useSyncExternalStore`, streaming SSR |
| 19.0 | Dec 2024 | Actions, `useActionState`, `useFormStatus`, `useOptimistic`, `use`, Server Components, `ref` as prop, `<Context>` provider, metadata and stylesheet support |
| 19.1 | Mar 2025 | Owner stacks (`captureOwnerStack`), Suspense fixes |
| 19.2 | Oct 2025 | `<Activity>`, `useEffectEvent`, `cacheSignal`, Performance Tracks, partial pre-rendering |
| Compiler 1.0 | Oct 2025 | Automatic memoization at build time |
| 19.3 | Sep 2026 | `<ViewTransition>`, `addTransitionType`, Fragment refs, `browser()`, Trusted Types, transitions that render independently |

### The big themes

1. **Async UI without boilerplate.** Actions track pending state, errors and optimistic updates for you, so you stop hand-writing `isLoading` flags.
2. **Less manual performance work.** The Compiler replaces most `useMemo`, `useCallback` and `memo`.
3. **Server-first rendering.** Server Components fetch data on the server and send no JavaScript for themselves.
4. **Smoother UX.** `<Activity>` keeps hidden screens alive; `<ViewTransition>` animates between states.
5. **Simpler APIs.** `ref` as a prop, `<Context value>`, ref cleanup functions, metadata in components.

### Also important

React moved to the **React Foundation** (under the Linux Foundation) in February 2026, so it is no longer governed by Meta alone. In December 2025, a critical security bug in React Server Components was found and patched, so apps using RSC must stay on the latest patch release.

## Example

A small form that uses several React 19 features together:

```jsx
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SaveButton() {
  const { pending } = useFormStatus(); // reads the parent <form>
  return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
}

export default function Profile({ saveName }) {
  const [error, formAction] = useActionState(async (_prev, formData) => {
    const result = await saveName(formData.get("name"));
    return result.ok ? null : result.message;
  }, null);

  return (
    <form action={formAction}>
      <title>Edit profile</title> {/* hoisted to <head> */}
      <input name="name" />
      <SaveButton />
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

## Common mistakes

- Calling React 18 features (automatic batching, `useTransition`, `useId`) "new in React 19".
- Saying Server Components work in any React app. They need a framework or bundler that supports them, such as the Next.js App Router or React Router in framework mode.
- Thinking the React Compiler is part of React 19. It is a separate build plugin, and it also works with React 17 and 18.
- Not knowing which version your own project uses. Check `package.json` before the interview.

## Follow-up questions

- **Is there a React 20?** Not as of React 19.3. New features have shipped as 19.x minor releases.
- **Which feature would you adopt first?** Usually Actions for forms and the Compiler, because they remove the most code with little risk.
- **What was removed in React 19?** `propTypes` checks, `defaultProps` on function components, string refs, legacy context and `ReactDOM.render`. See the migration page in this section.

## Quick recap

- React 19: Actions, new form hooks, `use`, Server Components, `ref` as prop.
- 19.1: owner stacks. 19.2: `<Activity>`, `useEffectEvent`. 19.3: `<ViewTransition>`, Fragment refs, `browser()`.
- The React Compiler 1.0 is a separate build plugin that memoizes for you.
- Know the timeline; interviewers check whether you follow React's direction.
