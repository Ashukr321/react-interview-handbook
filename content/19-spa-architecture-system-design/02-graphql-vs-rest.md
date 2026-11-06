---
title: "What is the difference between GraphQL and REST API?"
tags: ["api-design", "graphql", "rest", "data-fetching"]
difficulty: "medium"
---

## Short answer

REST exposes many resource URLs (`/users/1`, `/users/1/orders`) and the server decides the response shape. GraphQL exposes one endpoint with a typed schema, and the client asks for exactly the fields it needs in one query. REST is simpler and caches well over HTTP; GraphQL removes over-fetching and under-fetching but moves complexity into the client cache and the server resolvers.

## Explanation

Think of REST as a set menu: each dish (endpoint) comes as the kitchen designed it. GraphQL is ordering à la carte: you list exactly what you want on one ticket.

### Comparison

| Aspect | REST | GraphQL |
|---|---|---|
| Endpoints | Many, one per resource | Usually one (`/graphql`) |
| Response shape | Fixed by server | Chosen by client query |
| Over/under-fetching | Common; may need several calls | Avoided; nested data in one request |
| Types / contract | Optional (OpenAPI) | Built in (schema, introspection) |
| HTTP caching | Easy: GET + `Cache-Control`/ETag per URL | Hard: mostly POST to one URL; needs client normalized cache or persisted GET queries |
| Errors | HTTP status codes | Usually `200` with an `errors` array |
| Versioning | `/v1`, `/v2` | Evolve schema, deprecate fields |
| Server risk | Simple handlers | N+1 queries (fix with DataLoader), expensive nested queries (need depth/cost limits) |
| Real-time | SSE / WebSocket separately | Subscriptions in the spec |
| File upload | Native multipart | Needs extra spec or a separate REST endpoint |

### When to pick which

- **REST**: public APIs, simple CRUD, heavy CDN caching, small teams.
- **GraphQL**: many clients (web, mobile) needing different shapes of the same data, deeply related data, a "backend for frontend" aggregating several services.

## Example

The same screen: user name plus the last three orders.

```jsx
// REST: two round trips, and each response may include fields we do not need
async function loadRest(id) {
  const user = await fetch(`/api/users/${id}`).then((r) => r.json());
  const orders = await fetch(`/api/users/${id}/orders?limit=3`).then((r) => r.json());
  return { name: user.name, orders };
}

// GraphQL with Apollo Client: one request, exact shape
import { gql, useQuery } from "@apollo/client";

const USER_ORDERS = gql`
  query UserOrders($id: ID!) {
    user(id: $id) {
      name
      orders(last: 3) { id total }
    }
  }
`;

function UserSummary({ id }) {
  const { data, loading, error } = useQuery(USER_ORDERS, { variables: { id } });
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong</p>;
  return (
    <section>
      <h2>{data.user.name}</h2>
      <ul>{data.user.orders.map((o) => <li key={o.id}>{o.total}</li>)}</ul>
    </section>
  );
}
```

## Common mistakes

- Saying GraphQL is "faster". It saves round trips, but a badly written resolver can be much slower than REST.
- Checking only `response.ok` with GraphQL; errors often arrive with status `200`.
- Assuming the CDN will cache GraphQL like REST GET responses.
- Choosing GraphQL for a tiny CRUD app and paying the tooling cost for nothing.

## Follow-up questions

- **What is the N+1 problem?** Fetching a list, then one query per item for a nested field; DataLoader batches those into one query per tick.
- **How do you cache GraphQL on the client?** Apollo or urql keep a normalized cache keyed by `__typename` and `id`, so updating one entity updates every query that shows it.
- **What is tRPC?** Type-safe RPC between a TypeScript client and server; no schema language, great for full-stack TypeScript monorepos.

## Quick recap

- REST: many URLs, server-defined shapes, great HTTP caching.
- GraphQL: one endpoint, client-defined shapes, strong typed schema.
- GraphQL fixes over/under-fetching but needs client caching and resolver care.
- Pick based on clients, data shape and caching needs, not hype.
