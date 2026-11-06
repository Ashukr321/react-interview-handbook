---
title: "Scenario: How do you decide where to keep state?"
tags: ["state", "architecture", "lifting-state", "scenario"]
difficulty: "medium"
---

## Short answer

Keep state as **close as possible to where it is used**, and only move it up when more components need it. I ask a short series of questions: Can it be derived? Does it come from the server? Should it live in the URL? Who reads and writes it? The answer picks the home: local `useState`, a common parent, Context, a global store, a server cache or the URL.

## Explanation

Placing state is like placing a light switch. Put it in the room that uses it. Only wire it to a central panel if many rooms need to control it. Putting every switch on the central panel works, but every change now involves the whole house.

### The decision flow

```text
New piece of data
      |
      v
Can it be computed from existing state/props? --yes--> derive it (no state)
      | no
      v
Does it come from an API? --yes--> server cache (RTK Query / TanStack Query)
      | no
      v
Should refresh/share/back keep it? --yes--> URL (search params / route params)
      | no
      v
Used by one component only? --yes--> local useState / useReducer
      | no
      v
Used by a few nearby components? --yes--> lift to nearest common parent
      | no
      v
Needed app-wide, rarely changes (theme, locale, user)? --yes--> Context
      | no
      v
Needed app-wide, changes often, complex updates? --> Redux Toolkit / Zustand
```

### Signals you placed it too high

- A tiny input change re-renders unrelated parts of the page.
- Components are full of props they only pass through (prop drilling across 4+ levels).
- Global store has keys like `isDropdownOpen`.

### Signals you placed it too low

- Two siblings hold copies of the same data and get out of sync.
- You use `useEffect` to sync one component's state into another.

### Before reaching for global state, try composition

Passing components as `children` often removes prop drilling without Context.

## Example

```jsx
import { useState } from "react";

// Search text is shared by the input and the list, so lift it to the parent.
// "Is the help tooltip open" is used only by SearchBox, so it stays local.
export function UserDirectory({ users }) {
  const [query, setQuery] = useState("");
  const visible = users.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  ); // derived, not stored

  return (
    <>
      <SearchBox value={query} onChange={setQuery} />
      <UserList users={visible} />
    </>
  );
}

function SearchBox({ value, onChange }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
      <button onClick={() => setShowHelp((s) => !s)}>?</button>
      {showHelp && <small>Type part of a name</small>}
    </div>
  );
}

function UserList({ users }) {
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

> **💡 Interview tip:** Say "colocate first, lift when needed, globalize last" and then walk through the flow above. Interviewers want to hear that global state is a deliberate choice, not a default.

## Common mistakes

- Making Redux the default home for everything, including form inputs and modal flags.
- Syncing state between components with `useEffect` instead of lifting it.
- Putting fast-changing values (mouse position, input text) in a single big Context.
- Forgetting the URL as a state location.

## Follow-up questions

- **What is prop drilling and how do you avoid it?** Passing props through components that do not use them; fix with composition (`children`), Context, or a store.
- **When would you move state from Context to Redux?** When updates are frequent, logic is complex, you need selectors to limit re-renders, or you want DevTools/time-travel.
- **How do you handle state that must survive a refresh?** URL for view state, `localStorage` or a persisted store for preferences, the server for anything important.

## Quick recap

- Colocate state with the component that uses it.
- Derive what you can; fetch server data through a cache.
- Lift to the nearest common parent when siblings share it.
- Use Context for rarely-changing app-wide values, a store for complex frequent updates.
