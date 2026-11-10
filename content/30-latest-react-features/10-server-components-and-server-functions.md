---
title: "What are React Server Components and Server Functions?"
tags: ["react-19", "server-components", "server-functions", "use-client", "use-server", "rsc"]
difficulty: "hard"
asked_as: ["Server Components vs SSR", "What does 'use client' do?", "What is a Server Action?", "Are Server Functions secure by default?"]
---

## Short answer

**Server Components** run only on the server (at build time or per request). They can be `async`, read databases or files directly, and **send no JavaScript for themselves** to the browser; only their rendered output is sent. **Client Components**, marked with `"use client"` at the top of a file, are the interactive parts that also run in the browser. **Server Functions** (previously called Server Actions), marked with `"use server"`, are server-side functions that Client Components can call like normal async functions; React turns each call into a network request. They became stable in React 19, and you use them through a framework such as the Next.js App Router.

## Explanation

### Server Components vs SSR

| | SSR (classic) | Server Components |
| --- | --- | --- |
| What runs on the server | All components, once, to make HTML | Only Server Components |
| JavaScript sent to the client | All component code (for hydration) | Only Client Component code |
| Can re-run on navigation | No; the client takes over | Yes; the server sends a new RSC payload |
| Can use state or effects | Yes (after hydration) | No; that is what Client Components are for |

They work together: a framework renders Server and Client Components to HTML (SSR) for the first load, then hydrates only the Client Components.

### The boundary

```text
 Server Component (page.jsx)        <- async, fetches data, no JS shipped
   |-- <Header />                   <- Server Component
   '-- <LikeButton postId={1} />    <- "use client": shipped as JS, interactive
```

- `"use client"` marks a **boundary**: that file and everything it imports run on the client.
- Props passed from server to client must be **serializable**: plain data, promises, JSX, or Server Functions, but not regular functions or class instances.
- A Client Component can still render Server Components passed to it as `children`.

### Server Functions

Mark an async function with `"use server"`. It can be passed to `<form action>`, called from an event handler, or used with `useActionState`. React sends the arguments to the server, runs the function, and returns the result.

**Security:** every Server Function is a **public HTTP endpoint**. Always validate input and check authentication and authorization inside it. In December 2025 a critical remote-code-execution bug was found in the React Server Components packages (patched in 19.0.1, 19.1.2 and 19.2.1, with more fixes after), so keep `react` and `react-server-dom-*` on the latest patch release.

## Example

```jsx
// app/posts/[id]/page.jsx (Server Component)
import { db } from "@/lib/db";
import LikeButton from "./LikeButton";

export default async function PostPage({ params }) {
  const post = await db.post.findUnique({ where: { id: params.id } });
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <LikeButton postId={post.id} initialLikes={post.likes} />
    </article>
  );
}

// app/posts/[id]/actions.js
"use server";
import { auth } from "@/lib/auth";

export async function likePost(postId) {
  const user = await auth();
  if (!user) throw new Error("Not signed in"); // it's a public endpoint
  return db.post.update({ where: { id: postId }, data: { likes: { increment: 1 } } });
}

// app/posts/[id]/LikeButton.jsx
"use client";
import { useState, useTransition } from "react";
import { likePost } from "./actions";

export default function LikeButton({ postId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => {
        const post = await likePost(postId);
        startTransition(() => setLikes(post.likes));
      })}
    >
      ♥ {likes}
    </button>
  );
}
```

## Common mistakes

- Putting `"use client"` on every file. Keep it at the leaves (buttons, forms, charts) so most of the tree stays server-only.
- Passing a normal function from a Server Component to a Client Component. Functions aren't serializable; use a Server Function instead.
- Trusting Server Function arguments. Anyone can call the endpoint with any data, so validate it (for example with Zod) and check permissions.
- Importing server-only code (secrets, DB clients) into a Client Component. Use the `server-only` package to make that fail at build time.

## Follow-up questions

- **Can Server Components use hooks?** Not stateful ones (`useState`, `useEffect`). They can use `use` and `cache`.
- **Do I need a framework?** In practice yes. RSC needs bundler and router integration; Next.js App Router and React Router framework mode are the common choices.
- **What is the RSC payload?** A compact serialized description of the rendered Server Component tree, which the client uses to update the UI without a full page reload.

## Quick recap

- Server Components run only on the server and ship no JS for themselves.
- `"use client"` marks interactive boundaries; props crossing it must be serializable.
- `"use server"` creates Server Functions that the client can call.
- Server Functions are public endpoints: validate input, check auth, keep packages patched.
