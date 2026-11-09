---
title: "What is redux-saga?"
tags: ["redux", "redux-saga", "middleware", "generators", "side-effects"]
difficulty: "hard"
---

## Short answer

redux-saga is a Redux middleware for managing side effects using **generator functions** (sagas). A saga listens for actions, then `yield`s declarative **effects** like `call` (run an async function), `put` (dispatch an action), `take`/`takeLatest` (wait for actions), `race`, `fork` and `cancel`. Because effects are plain objects interpreted by the middleware, complex async flows (cancellation, debouncing, polling, retries, WebSocket channels) are readable and easy to test. For most new apps, thunks, RTK Query or listener middleware are simpler.

## Explanation

A saga is like a background worker with a checklist. It sits waiting ("when someone places an order..."), then follows steps ("call payment API, then notify warehouse, if the user cancels in between, stop"). The worker does not act directly; it writes instructions (effects) that the manager (middleware) executes, which is why you can check the checklist in tests without running anything.

### Core effects

| Effect | Purpose |
|---|---|
| `call(fn, ...args)` | Call a function, wait if it returns a promise |
| `put(action)` | Dispatch an action |
| `select(selector)` | Read from the store |
| `take(pattern)` | Pause until a matching action arrives |
| `takeEvery(pattern, saga)` | Run saga for every matching action |
| `takeLatest(pattern, saga)` | Cancel the previous run when a new action arrives |
| `debounce(ms, pattern, saga)` | Run after actions stop for `ms` |
| `fork` / `cancel` | Start/stop non-blocking tasks |
| `race({ a, b })` | Whichever finishes first wins; others are cancelled |
| `all([...])` | Run effects in parallel |
| `delay(ms)` | Wait |

### Flow

```text
UI dispatch(searchRequested("rea"))
   -> reducers run (action passes through)
   -> saga middleware: takeLatest matches -> cancels old search
      -> yield call(api.search, "rea")
      -> yield put(searchSucceeded(results))  or  put(searchFailed(err))
```

### Saga vs thunk

| | Thunk | Saga |
|---|---|---|
| Style | async/await function | Generator yielding effect objects |
| Triggered by | Dispatching the thunk | Listening to plain actions |
| Cancellation, debounce, race | Manual | Built-in effects |
| Testing | Mock fetch/dispatch | Step through generator, compare effect objects |
| Learning curve | Low | High |
| Bundle | Tiny, included in RTK | Extra dependency (~14 KB) |

## Example

```js
// sagas.js
import { call, put, takeLatest, delay, all } from "redux-saga/effects";
import { searchRequested, searchSucceeded, searchFailed } from "./searchSlice";

const api = {
  search: (q) => fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
};

function* handleSearch(action) {
  try {
    yield delay(300); // debounce: takeLatest cancels this if a new action arrives
    const results = yield call(api.search, action.payload);
    yield put(searchSucceeded(results));
  } catch (err) {
    yield put(searchFailed(err.message));
  }
}

export default function* rootSaga() {
  yield all([takeLatest(searchRequested.type, handleSearch)]);
}
```

```js
// store.js
import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import searchReducer from "./searchSlice";
import rootSaga from "./sagas";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: { search: searchReducer },
  middleware: (getDefault) => getDefault({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);
```

```js
// Testing without network: compare yielded effects
const gen = handleSearch(searchRequested("react"));
expect(gen.next().value).toEqual(delay(300));
expect(gen.next().value).toEqual(call(api.search, "react"));
```

## Common mistakes

- Calling `api.search(q)` directly instead of `yield call(api.search, q)`, losing testability.
- Using `takeEvery` for searches, so stale responses can overwrite newer ones; use `takeLatest`.
- Forgetting `try/catch`; an uncaught error kills the saga and stops it from listening.
- Adding sagas to a small app where a thunk or RTK Query is enough.

## Follow-up questions

- **Why generators?** They can pause at each `yield`, letting the middleware run the effect and resume, and allowing cancellation between steps.
- **What is an eventChannel?** A way to turn external event sources like WebSockets into a stream of actions a saga can `take` from.
- **What is the modern RTK alternative?** `createListenerMiddleware`, which supports `take`, `condition`, `delay`, cancellation and fork with async/await.

## Quick recap

- Saga = middleware running generator functions for side effects.
- Effects (`call`, `put`, `takeLatest`, `race`) are declarative objects.
- Great for complex, cancellable, event-driven flows and testing.
- For most apps today, prefer thunks, RTK Query or listener middleware.
