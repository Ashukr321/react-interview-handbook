---
title: "Building scalable component architecture (Container-Presenter pattern, compound components, render props)"
tags: ["architecture", "patterns", "compound-components", "render-props"]
difficulty: "hard"
---

## Short answer

Scalable component architecture separates **logic** from **presentation** and exposes flexible, composable APIs. The **Container-Presenter** pattern splits data/behaviour (container, now usually a custom hook) from pure UI (presenter). **Compound components** share implicit state through context so consumers compose parts like `<Tabs.List>` and `<Tabs.Panel>`. **Render props** pass a function that receives data and returns JSX, giving the caller full control over rendering.

## Explanation

Think of a restaurant: the kitchen (container/hook) prepares food, the waiter (presenter) only serves it. Compound components are like a set menu whose courses know they belong together. Render props are "we cook, you plate".

### 1. Container-Presenter

- Presenter: receives props, renders UI, easy to test and reuse in Storybook.
- Container: fetches data, holds state, passes props down.
- Modern form: the container becomes a custom hook (`useOrders()`), or a Server Component that fetches and passes data to a Client Component.

### 2. Compound components

- A parent owns state and provides it through context; children read it.
- Gives a declarative API without dozens of config props (`<Select>`, `<Tabs>`, `<Accordion>` in Radix, Headless UI, Reach).

### 3. Render props

- `<DataLoader render={(data) => <Table rows={data} />} />` or `children` as a function.
- Mostly replaced by hooks, but still useful when a library must control *where* the output goes (e.g. virtualized lists, React Hook Form's `<Controller render={...} />`).

| Pattern | Solves | Watch out for |
|---|---|---|
| Container-Presenter / hooks | Mixing fetching and UI | Over-splitting tiny components |
| Compound components | Rigid "prop soup" APIs | Children must be inside the parent |
| Render props | Caller-controlled rendering | Nested callbacks, new functions each render |

### Supporting practices

- Feature-based folders (`features/cart/{components,hooks,api}`) instead of `components/` + `containers/` at the root.
- Keep state as close as possible to where it is used; lift only when shared.
- Design-system primitives (Button, Input) separate from feature components.

## Example

```jsx
import { createContext, use, useState } from "react";

// Compound components
const TabsContext = createContext(null);

function Tabs({ defaultValue, children }) {
  const [active, setActive] = useState(defaultValue);
  return <TabsContext value={{ active, setActive }}>{children}</TabsContext>;
}
Tabs.Trigger = function Trigger({ value, children }) {
  const { active, setActive } = use(TabsContext);
  return (
    <button role="tab" aria-selected={active === value} onClick={() => setActive(value)}>
      {children}
    </button>
  );
};
Tabs.Panel = function Panel({ value, children }) {
  const { active } = use(TabsContext);
  return active === value ? <div role="tabpanel">{children}</div> : null;
};

// Container as a custom hook + presenter
function useUsers() {
  const [users] = useState([{ id: 1, name: "Ada" }]); // pretend this is fetched
  return { users };
}
const UserList = ({ users }) => <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;

// Render prop
function MousePosition({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return <div onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>{children(pos)}</div>;
}

export default function App() {
  const { users } = useUsers();
  return (
    <Tabs defaultValue="users">
      <Tabs.Trigger value="users">Users</Tabs.Trigger>
      <Tabs.Trigger value="mouse">Mouse</Tabs.Trigger>
      <Tabs.Panel value="users"><UserList users={users} /></Tabs.Panel>
      <Tabs.Panel value="mouse">
        <MousePosition>{({ x, y }) => <p>{x}, {y}</p>}</MousePosition>
      </Tabs.Panel>
    </Tabs>
  );
}
```

## Common mistakes

- Using compound children outside the parent; throw a clear error when the context is `null`.
- Creating a "container" for every component, doubling the file count with no benefit. A custom hook is often enough.
- Deep render-prop nesting ("callback pyramid") when hooks would be flatter.
- Organizing by file type rather than by feature, so one feature is spread over many folders.

## Follow-up questions

- **Are containers still relevant with hooks?** The idea is; the implementation is now usually a custom hook or a Server Component passing data to a client presenter.
- **How do compound components share state without context?** Older versions used `React.Children.map` + `cloneElement`, but that breaks with wrappers; context is the robust way.
- **When would you still choose render props over a hook?** When the library must decide when and where to render the caller's UI, such as list virtualization or form field controllers.

## Quick recap

- Separate logic (hook/container) from UI (presenter).
- Compound components: parent state shared via context, flexible markup.
- Render props: caller decides the rendering; mostly replaced by hooks.
- Organize by feature and keep state local.
