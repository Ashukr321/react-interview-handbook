---
title: "What are loaders and actions?"
tags: ["react-router", "data-fetching", "forms", "routing"]
difficulty: "medium"
---

## Short answer

Loaders and actions are React Router's data APIs (v6.4+ data routers and v7). A **loader** is a function attached to a route that fetches data before the route renders, so data and code load in parallel instead of in a `useEffect` waterfall. An **action** handles mutations from a `<Form>` submission (POST, PUT, DELETE); after it finishes, the router automatically re-runs the loaders so the UI shows fresh data.

## Explanation

Think of a restaurant: the loader is the waiter who brings your food to the table before you sit down; the action is the waiter taking your order back to the kitchen, after which the table is refreshed with what you ordered.

### Lifecycle

```text
 Navigate to /todos
   -> router matches routes (parent + child)
   -> runs ALL matched loaders in parallel
   -> renders route elements with useLoaderData()

 Submit <Form method="post">
   -> router calls the route's action(request)
   -> action returns data or redirect()
   -> router revalidates (re-runs) loaders on the page
   -> UI updates; useNavigation().state shows "submitting" / "loading"
```

### Related hooks

| Hook / component | Purpose |
|---|---|
| `useLoaderData()` | Read the loader's return value |
| `<Form>` | Submits to the route action without a full page reload |
| `useActionData()` | Read what the action returned (e.g. validation errors) |
| `useNavigation()` | Pending UI: `idle`, `loading`, `submitting` |
| `useFetcher()` | Call a loader or action without navigating (like buttons, inline edits) |
| `errorElement` | Renders when a loader or action throws |

Loaders receive `request` (with an `AbortSignal` that fires if the user navigates away) and `params`.

## Example

```jsx
import {
  createBrowserRouter, RouterProvider, Form, redirect,
  useLoaderData, useActionData, useNavigation,
} from "react-router"; // v6.4+: "react-router-dom"

async function todosLoader({ request }) {
  const res = await fetch("/api/todos", { signal: request.signal });
  if (!res.ok) throw new Response("Failed to load todos", { status: res.status });
  return res.json();
}

async function todosAction({ request }) {
  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  if (!title) return { error: "Title is required" };
  await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return redirect("/todos"); // loaders re-run automatically
}

function Todos() {
  const todos = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  return (
    <>
      <Form method="post">
        <input name="title" aria-label="New todo" />
        <button disabled={navigation.state === "submitting"}>Add</button>
        {actionData?.error && <p role="alert">{actionData.error}</p>}
      </Form>
      <ul>{todos.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </>
  );
}

const router = createBrowserRouter([
  { path: "/todos", element: <Todos />, loader: todosLoader, action: todosAction, errorElement: <p>Oops</p> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

## Common mistakes

- Using loaders with `<BrowserRouter>`; they only work with data routers like `createBrowserRouter` (or framework mode).
- Fetching again in `useEffect` after the loader already returned the data.
- Manually refetching after a mutation; revalidation already does it.
- Ignoring `request.signal`, so cancelled navigations still finish their fetches.

## Follow-up questions

- **How do you show a page before slow data arrives?** Return a promise from the loader without awaiting it and read it with `<Suspense>` + `<Await>` (or `use()`), streaming the slow part.
- **How do loaders compare to TanStack Query?** Loaders decide when to fetch (on navigation); TanStack Query handles caching. Many apps call `queryClient.ensureQueryData` inside loaders to get both.
- **Is this the same as Next.js server actions?** Similar idea (mutation then revalidation), but Next.js server actions run on the server via Server Functions.

## Quick recap

- Loader: fetch before render, parallel per matched route.
- Action: handle form mutations, then auto-revalidate loaders.
- Use `useLoaderData`, `useActionData`, `useNavigation`, `useFetcher`.
- Requires a data router (`createBrowserRouter`) or framework mode.
