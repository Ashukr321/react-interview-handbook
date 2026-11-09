---
title: "Give an example of a stateless component"
tags: ["components", "stateless", "presentational"]
difficulty: "easy"
---

## Short answer

A stateless component is one that holds no state of its own and renders purely from its props. For example, a `UserCard` that receives `name`, `avatarUrl` and `role` as props and returns JSX is stateless: the same props always produce the same output. Most UI building blocks (buttons, badges, cards, list items) should be stateless.

## Explanation

A stateless component is like a picture frame: whatever photo you put in, it displays. It does not remember the previous photo or change by itself.

### Characteristics

- No `useState`, `useReducer` or `this.state`.
- Output depends only on props (and possibly context).
- May still receive callbacks as props and call them on events.
- Easy to reuse, test and wrap in `React.memo`.

Historically these were called "stateless functional components" (SFCs), because before hooks only class components could hold state. Today a function component can be stateful, so "stateless" describes what the component does, not how it is written.

## Example

```jsx
// Stateless: pure function of props
function UserCard({ name, avatarUrl, role = "Member", onMessage }) {
  return (
    <article className="user-card">
      <img src={avatarUrl} alt={`${name}'s avatar`} width={48} height={48} />
      <div>
        <h3>{name}</h3>
        <span className="badge">{role}</span>
      </div>
      <button onClick={() => onMessage(name)}>Message</button>
    </article>
  );
}

// A tiny stateless list built from it
function TeamList({ members, onMessage }) {
  if (members.length === 0) return <p>No team members yet.</p>;
  return (
    <section>
      {members.map((m) => (
        <UserCard key={m.id} {...m} onMessage={onMessage} />
      ))}
    </section>
  );
}

export default function App() {
  const team = [
    { id: 1, name: "Ada", avatarUrl: "/ada.png", role: "Admin" },
    { id: 2, name: "Linus", avatarUrl: "/linus.png" },
  ];
  return <TeamList members={team} onMessage={(name) => alert(`Message ${name}`)} />;
}
```

The class equivalent (legacy style) has only a `render` method and no state:

```jsx
import { Component } from "react";

class Greeting extends Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

### Testing it is trivial

```jsx
import { render, screen } from "@testing-library/react";

test("shows default role", () => {
  render(<UserCard name="Linus" avatarUrl="/l.png" onMessage={() => {}} />);
  expect(screen.getByText("Member")).toBeInTheDocument();
});
```

## Common mistakes

- Assuming "functional component" automatically means "stateless".
- Adding state to a presentational component to track something the parent already knows.
- Doing side effects (fetching, logging to analytics) in the render body of a "stateless" component.

## Follow-up questions

- **Is a component that uses `useContext` stateless?** It owns no state, but its output can change when the context changes; it is still considered presentational.
- **Should you wrap every stateless component in `React.memo`?** Only when it re-renders often with the same props and rendering is costly, or let the React Compiler handle it.
- **What are default props in function components?** Use default parameter values (`role = "Member"`); `defaultProps` is not supported for function components in React 19.

## Quick recap

- Stateless = renders from props only.
- Same props in, same UI out.
- Ideal for reusable UI pieces like cards and buttons.
- Easy to test and memoize.
