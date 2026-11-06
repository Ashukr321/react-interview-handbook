---
title: "What is Prop Drilling?"
tags: ["props", "state-management", "architecture"]
difficulty: "easy"
---

## Short answer

Prop drilling is passing data through several layers of components that do not use it, only so a deeply nested child can receive it. It is not a bug, and for two or three levels it is often the clearest option. It becomes a problem when many intermediate components must accept and forward props they do not care about, making refactors noisy and coupling unrelated components.

## Explanation

Imagine passing a note to someone at the back of a classroom: every student in between has to take it and hand it on, even though it is not for them. If the note changes format, every student has to learn the new format.

```text
App (user)
 └─ Layout (user)        <- does not use user
     └─ Sidebar (user)   <- does not use user
         └─ Profile (user)  <- the only one that needs it
```

### Why it hurts at scale

- **Noise**: intermediate components have props they never read.
- **Coupling**: renaming or adding a field touches every layer.
- **Re-renders**: every layer re-renders when the drilled value changes.
- **Hard to move components**: a component depends on its ancestors passing the right things.

### Why it is sometimes fine

- Explicit data flow is easy to trace and test.
- Two or three levels are normal React.
- Reaching for global state too early hides dependencies.

### Common solutions

| Solution | When |
|---|---|
| Component composition (`children`, slots) | Intermediate components only provide layout |
| Context API | Data needed by many components at different depths (theme, user, locale) |
| State library (Redux Toolkit, Zustand, Jotai) | Large, frequently updated shared client state |
| Server-state library / framework loaders (TanStack Query, RTK Query, React Router loaders, Server Components) | Data that comes from an API |

## Example

```jsx
// Drilling: Layout and Sidebar only forward `user`
function App() {
  const user = { name: "Ada" };
  return <Layout user={user} />;
}
function Layout({ user }) {
  return <Sidebar user={user} />;
}
function Sidebar({ user }) {
  return <Profile user={user} />;
}
function Profile({ user }) {
  return <p>{user.name}</p>;
}

// Composition fix: App passes the finished element down as children
function App2() {
  const user = { name: "Ada" };
  return (
    <Layout2>
      <Sidebar2>
        <Profile user={user} />
      </Sidebar2>
    </Layout2>
  );
}
const Layout2 = ({ children }) => <main>{children}</main>;
const Sidebar2 = ({ children }) => <aside>{children}</aside>;
```

## Common mistakes

- Jumping straight to Context or Redux for every shared value, making components hard to reuse.
- Putting fast-changing values in one big Context, causing every consumer to re-render.
- Treating any prop passing as "drilling". Passing props one or two levels is normal.

## Follow-up questions

- **Is prop drilling an anti-pattern?** Only when it is deep and widespread. Shallow drilling is explicit and fine.
- **How do you spot it?** Components with props they only forward, and changes that ripple through many files.
- **What is the first thing to try?** Composition: pass JSX as `children` so the intermediate layers do not need to know about the data.

## Quick recap

- Prop drilling = forwarding props through components that do not use them.
- Fine when shallow; painful when deep.
- Fix with composition first, then Context, then a state library.
- Server data belongs in a data-fetching layer, not drilled props.
