---
title: "Describe how you would test a React component"
tags: ["testing", "react-testing-library", "vitest", "jest"]
difficulty: "medium"
---

## Short answer

I test components the way a user uses them: render with **React Testing Library**, find elements by accessible role or label, simulate interactions with **`@testing-library/user-event`**, and assert on what appears on screen. Tests run with **Vitest** or **Jest** in a `jsdom` environment, network calls are mocked with **MSW**, and critical flows are covered by **Playwright** end-to-end tests.

## Explanation

### The testing pyramid (or trophy)

| Level | Tool | What it checks |
|-------|------|----------------|
| Static | TypeScript, ESLint | Typos, wrong props, hooks rules |
| Unit | Vitest/Jest | Pure functions, reducers, custom hooks (`renderHook`) |
| Integration | RTL + user-event + MSW | Components working together with mocked APIs |
| End-to-end | Playwright, Cypress | Real browser, real routes, full user journeys |

Kent C. Dodds' "testing trophy" favours integration tests: best confidence per unit of effort.

### Guiding principle

Test **behaviour, not implementation**. Do not assert on state variables or internal method calls. If you refactor a class to hooks and the UI behaves the same, tests should still pass. It is like testing a car by driving it, not by inspecting each bolt.

### Query priority

1. `getByRole` (with `name`)
2. `getByLabelText`, `getByPlaceholderText`, `getByText`
3. `getByTestId` as a last resort

Use `findBy*` for async content and `queryBy*` to assert something is absent.

## Example

```jsx
// Counter.jsx
import { useState } from "react";
export function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);
  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </>
  );
}
```

```jsx
// Counter.test.jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("increments when the button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter initial={2} />);

    await user.click(screen.getByRole("button", { name: /increment/i }));

    expect(screen.getByText("Count: 3")).toBeInTheDocument();
  });
});
```

For data fetching, mock the network instead of the fetch function:

```js
// mocks/handlers.js
import { http, HttpResponse } from "msw";
export const handlers = [
  http.get("/api/user", () => HttpResponse.json({ name: "Ada" })),
];
```

Then `expect(await screen.findByText("Ada")).toBeInTheDocument()`.

## Common mistakes

- Testing implementation details (internal state, private functions, CSS class names).
- Overusing `data-testid` instead of accessible queries, which also hides accessibility problems.
- Using `fireEvent` where `user-event` gives more realistic behaviour (focus, typing, pointer events).
- Not awaiting async UI, causing `act()` warnings and flaky tests.
- Large snapshot tests that everyone blindly updates.

## Follow-up questions

- **How do you test a custom hook?** With `renderHook` from `@testing-library/react`, wrapping in providers via the `wrapper` option.
- **How do you test components using context or a router?** Write a custom `render` helper that wraps the UI in the required providers (`MemoryRouter`, store, QueryClient).
- **When are snapshot tests useful?** For small, stable outputs like serialised config; avoid them for large component trees.

## Quick recap

- RTL + user-event + Vitest/Jest for components.
- Query by role and label, assert visible behaviour.
- Mock the network with MSW.
- Playwright for critical end-to-end flows.
