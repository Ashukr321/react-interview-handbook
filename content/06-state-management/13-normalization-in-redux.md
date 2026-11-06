---
title: "What is Normalization in Redux?"
tags: ["redux", "normalization", "entity-adapter", "data-modeling"]
difficulty: "medium"
---

## Short answer

Normalization means storing data like a database table instead of nested trees: each entity type gets its own collection keyed by id (`{ ids: [], entities: {} }`), and relationships are stored as ids, not embedded copies. It removes duplication, makes lookups and updates O(1), and keeps unrelated references stable so fewer components re-render. Redux Toolkit provides `createEntityAdapter` to do this for you.

## Explanation

Imagine a phone contact list where every group chat stores a full copy of each member's details. If Rahul changes his photo, you must find and update every copy. Normalized data is a single contacts book; group chats store only contact ids.

### Nested (denormalized) vs normalized

```json
{
  "posts": [
    {
      "id": "p1",
      "author": { "id": "u1", "name": "Rahul" },
      "comments": [
        { "id": "c1", "author": { "id": "u1", "name": "Rahul" }, "text": "Nice" }
      ]
    }
  ]
}
```

```json
{
  "users":    { "ids": ["u1"], "entities": { "u1": { "id": "u1", "name": "Rahul" } } },
  "posts":    { "ids": ["p1"], "entities": { "p1": { "id": "p1", "authorId": "u1", "commentIds": ["c1"] } } },
  "comments": { "ids": ["c1"], "entities": { "c1": { "id": "c1", "authorId": "u1", "text": "Nice" } } }
}
```

### Benefits

| Problem with nested data | Normalized solution |
|---|---|
| Same user duplicated in many places | Stored once in `users.entities` |
| Finding an item requires `find()` over arrays | `entities[id]` lookup |
| Updating deep data needs nested spreads | Update one entity |
| Changing one item creates new parent arrays, re-rendering lists | Only that entity's reference changes |

### Rules of thumb

- One slice (or adapter) per entity type.
- Store relationships as ids.
- Keep `ids` for ordering; keep `entities` for lookup.
- Denormalize in **selectors** when a component needs the joined shape.
- Normalize API responses when they enter the store (manually or with `normalizr`).

## Example

```jsx
import { createSlice, createEntityAdapter, createSelector } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";

const postsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.createdAt.localeCompare(a.createdAt),
});

const postsSlice = createSlice({
  name: "posts",
  initialState: postsAdapter.getInitialState({ status: "idle" }),
  reducers: {
    postsReceived: postsAdapter.setAll,
    postAdded: postsAdapter.addOne,
    postUpdated: postsAdapter.updateOne, // { id, changes }
    postRemoved: postsAdapter.removeOne,
  },
});

export const { postsReceived, postAdded, postUpdated, postRemoved } = postsSlice.actions;
export default postsSlice.reducer;

export const { selectById: selectPostById, selectIds: selectPostIds } =
  postsAdapter.getSelectors((state) => state.posts);

// Denormalize in a selector when the UI needs it
export const selectPostWithAuthor = createSelector(
  [selectPostById, (state) => state.users.entities],
  (post, users) => post && { ...post, author: users[post.authorId] }
);

export function PostTitle({ id }) {
  const post = useSelector((s) => selectPostById(s, id));
  return <h3>{post.title}</h3>;
}
```

## Common mistakes

- Normalizing tiny or non-relational state where it adds complexity for no gain.
- Storing both the nested copy and the normalized copy, which reintroduces sync bugs.
- Denormalizing inside `useSelector` without memoization, returning a new object every time.
- Forgetting to remove ids from related entities when deleting (dangling references).

## Follow-up questions

- **Does RTK Query normalize data?** No, it caches per endpoint and argument ("document cache"); you can use `transformResponse` with an entity adapter if you need normalized lookups.
- **What is normalizr?** A library that converts nested API responses into normalized entities using schemas.
- **How does normalization help performance?** Updating one entity keeps other entity objects and the `ids` array referentially equal, so memoized rows and selectors skip work.

## Quick recap

- Store each entity type once, keyed by id.
- Relationships are ids, not nested copies.
- `createEntityAdapter` gives `{ ids, entities }`, CRUD reducers and selectors.
- Join data back in memoized selectors.
