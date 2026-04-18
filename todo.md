# Seiro Todo

Follow-ups from the architectural review and Phase 1/2 work (the durable
events log + reconnect resume). Grouped by theme; cost estimates are rough.

## Security

### 1. Move the auth token out of the URL

Today `client.connect()` opens `ws://host/ws?token=<jwt>`. URL-logging
proxies, server access logs, and browser history all capture the token.

- **Cheap fix (~15 LOC):** pass the token via `Sec-WebSocket-Protocol`:
  client does `new WebSocket(url, [\`bearer.${token}\`])`; server reads
  the header in the upgrade handler, verifies, and echoes the accepted
  subprotocol back.
- **Nicer fix (~50 LOC):** anonymous connect + first message
  `{ auth: token }`. Keeps the token out of HTTP entirely. Needs a
  grace-period timeout for unauthenticated sockets.

### 2. Per-user event fan-out

`server.emit("shipment_created", data)` goes to every subscriber of
`shipment_*`, regardless of `user_id`. The `events` table already stores
`user_id`; the relay just drops it on the floor today.

- Extend `emit(event, data, { id, userId? })`. If `userId` is set,
  delivery is gated to sockets whose `ws.data.userId === userId`. Default
  stays broadcast so genuinely-public events still fan out.
- Update `createEventRelay` to pass `user_id` through on live + backfill.
- Apply the same `user_id` filter inside `fetchSince` so backfill doesn't
  leak across tenants on reconnect.

~30 LOC in core, ~10 LOC in the example.

### 3. Database-level RLS

Every `cmd_*` / `query_*` takes `p_user_id int` as a plain arg. A handler
that forgets it -- or passes the wrong value -- can write across tenants
with no backstop.

- Wrap each command/query in `sql.begin(async tx => { await tx\`SELECT
  set_config('app.user_id', ${id}, true)\`; ... })`.
- Drop `p_user_id` from function signatures; read
  `current_setting('app.user_id')::int` instead.
- `ENABLE ROW LEVEL SECURITY` on `users`, `shipments`, `events` with
  policies like `USING (user_id = current_setting('app.user_id')::int)`.
- Add a `withUser(sql, ctx, fn)` helper so call sites stay readable.

Biggest of the three (~200 LOC + SQL churn, one BEGIN/COMMIT per
command). Closes the threat model the other two only narrow.

## Durability / correctness

### 4. Events retention + partitioning

`events` grows forever. Plan for monthly partitioning or a retention job,
and document that resume cursors older than retention need to re-hydrate
via a full query rather than replay.

### 5. Authz at replay

`fetchSince` in the example currently filters by pattern + `since` only,
matching live emit semantics (also unfiltered). Fix alongside #2 above so
backfill and live share a single authorization boundary.

### 6. Postgres notification queue monitoring

The notify queue is cluster-wide and capped (~8 GB). A stuck listener
backs it up and eventually blocks every `NOTIFY`. Surface
`pg_notification_queue_usage()` in the `/health` endpoint (or a separate
`/metrics`) and alert above, say, 0.5.

## Protocol / wire

### 7. Protocol version + capability negotiation

Phase 2 was additive (optional `id`, optional `since`), so nothing broke.
The next wire change won't be free. Ship a `{v:1, capabilities:[...]}`
field on the connect profile now while there are few users, and negotiate
down on mismatch.

### 8. Wildcard matching beyond suffix

`shipment_*` matches, `*_created` does not. Upgrade the matcher (both in
server `matchPattern` and the SQL `patternToLike`) to at least support
a single `*` anywhere -- or switch to an explicit glob/regex shape.

## Ops / DX

### 9. Migration tooling

`init_db/*.sql` is loaded once by docker-compose. Changing a function
after that requires manual psql. A framework that treats Postgres
functions as domain logic needs a real migration story: `seiro db push`,
`seiro db diff`, or similar.

### 10. Transport-layer tests

The protocol *is* the product, but core tests don't exercise malformed
frames, `cid` collisions, subscribe-during-query, slow consumers, or
backfill-races-live-emit. Highest-leverage investment for correctness.

### 11. Build hygiene

- `packages/seiro/tsconfig.build.json` currently emits `.d.ts` for every
  `*.test.ts` into `dist/`. Add `"exclude": ["**/*.test.ts"]`.
- Orphan chunks accumulate in `packages/seiro/dist/` across builds
  because hashed names change. Either clean on `prepublishOnly` or stop
  tracking `dist/` and regenerate in the publish workflow.

## Nice-to-have (not urgent)

### 12. Presence / cross-node state

Out of scope today. When it comes up: start with a `sessions` heartbeat
table before reaching for Redis. `pg_notify` already handles the
event-fan-out case across nodes -- only truly-shared state needs more.

### 13. `cqrs-document` skill + `seiro model` CLI integration

The modelling tools understand entities/commands/events but don't know
about the `events` log pattern. Generated domain code should default to
`emit_event()` + id-only notify and wire through `createEventRelay`.
