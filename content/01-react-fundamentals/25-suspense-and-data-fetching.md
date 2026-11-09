---
title: "What is Suspense in React, and how does it work with data fetching?"
tags: ["suspense", "data-fetching", "use", "concurrent"]
difficulty: "hard"
---

## Short answer

`<Suspense>` lets you declare a loading fallback for a part of the tree. When a component inside it **suspends** (because lazy code or data is not ready yet), React shows the nearest Suspense fallback and retries rendering once the promise resolves. For data, you suspend with a **Suspense-enabled source**: the React 19 `use(promise)` hook, Server Components with `async`/`await`, or libraries like TanStack Query (`useSuspenseQuery`) and Relay. Plain `useEffect` fetching does not trigger Suspense.

## Explanation

Suspense is like a theatre curtain. While the set (data) is being arranged, the audience sees the curtain (fallback). When everything behind it is ready, the curtain lifts all at once, with no half-built set visible.

```text
 render <Profile />
    |
    +-- data ready? -- yes --> render normally
    |
    no: component "throws" a pending promise (suspends)
    |
    v
 nearest <Suspense> shows fallback
    |
 promise resolves -> React re-renders Profile -> fallback replaced
 promise rejects  -> nearest error boundary handles it
```

### Key behaviours

- **Boundaries are composable**: nest them to reveal UI in stages (header first, then feed, then comments).
- **Siblings wait together**: everything inside one boundary appears at once.
- **Transitions keep old UI**: if an update inside `startTransition` suspends, React keeps showing the previous content instead of flashing a fallback.
- **Streaming SSR**: on the server, each boundary's HTML streams in as soon as its data is ready.
- **Errors**: pair Suspense with an error boundary for rejected promises.

### Render-as-you-fetch

The ideal is to start fetching **before** rendering (in a route loader, event handler, or Server Component) and pass the promise down, avoiding waterfalls where a child only starts fetching after its parent finished.

## Example

```jsx
import { Suspense, use } from "react";

// Create the promise outside render (or in a cache / loader / Server Component)
function fetchUser(id) {
  return fetch(`/api/users/${id}`).then((r) => r.json());
}

function UserName({ userPromise }) {
  const user = use(userPromise); // suspends until resolved
  return <h2>{user.name}</h2>;
}

export default function ProfilePage({ userId }) {
  const userPromise = fetchUser(userId); // in real apps: cached, e.g. via a loader

  return (
    <Suspense fallback={<p>Loading profile...</p>}>
      <UserName userPromise={userPromise} />
    </Suspense>
  );
}
```

Server Component version (Next.js App Router):

```jsx
// app/page.jsx
import { Suspense } from "react";

async function Posts() {
  const posts = await fetch("https://api.example.com/posts").then((r) => r.json());
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading posts...</p>}>
      <Posts />
    </Suspense>
  );
}
```

## Common mistakes

- Creating a new promise inside a Client Component's render and passing it to `use`. Each render creates a new promise, so it suspends forever. Cache it or create it in a Server Component or loader.
- Expecting Suspense to catch `useEffect` + `useState` loading states.
- One giant boundary at the root, blanking the whole page on any load.
- Forgetting an error boundary for failed requests.

## Follow-up questions

- **How is `use` different from other hooks?** It can be called conditionally and in loops, and it reads promises or context.
- **How do you avoid flashing fallbacks on navigation?** Wrap the update in `startTransition`, so React keeps the old screen until the new one is ready.
- **What is `SuspenseList`?** An experimental component for coordinating reveal order of multiple boundaries; not in stable React.

## Quick recap

- Suspense shows a fallback while children suspend.
- Data must come from a Suspense-aware source (`use`, RSC, query libs).
- Nest boundaries for progressive loading; pair with error boundaries.
- Start fetches early to avoid waterfalls.
