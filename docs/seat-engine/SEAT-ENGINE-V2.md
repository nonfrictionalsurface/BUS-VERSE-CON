# Seat Layout Engine v2

One layout model, one implementation, shared by the API, BusVerse Passenger, BusVerse Driver and BusCon Operator.
Package: `packages/seat-engine` (`@busverse/seat-engine`). Pure TypeScript, zero runtime dependencies.

## 1. What was wrong with v1 (found by reading the code, not guessed)

| # | Problem | Where | Effect |
|---|---------|-------|--------|
| 1 | Rows were letters A-T, columns 1-6, 60 seats max, one cell per seat, one deck | `network.schema.ts`, `seat-layout.service.ts`, `constraints.sql` | No 3+3, no 8-column vans, no double berths, no double-deckers, no 70+ seat buses |
| 2 | Aisle written as `{row:'A', column:1}` but read as `{row, col}` | `seat-layout.service.ts` vs `booking.service.ts` | Availability returned aisle cells with no column. Clients had to guess |
| 3 | Row came back as a number in one place and a letter in another | `AvailabilityDTO` vs `SeatLayoutDTO` | Passenger app contained code to "normalise backend bugs" |
| 4 | Passenger app silently drew a fake 10x4 bus (with fake seat ids) when the API failed or the user was signed out | `useAvailability.ts` | A passenger could look at, and tap, seats that do not exist |
| 5 | Window / aisle seat decided by column index (`col === 1 || col === columnsCount`) | `BusFuselage.tsx` | Wrong for 2+1, 1+1, sleepers, any layout with a cut-out |
| 6 | Seat rows hard-coded as "pairs" in the UI spec | `02-SEAT-MATRIX-UI.md` | 3+2 and 2+1 only worked by accident |
| 7 | Any booking, ever, froze the layout. Saving deleted and re-created every seat (new ids) | `replaceSeatLayout` | An operator could not fix a typo or relabel a seat once the bus had sold a ticket |
| 8 | Database and TypeScript disagreed: `bus_type`, `capacity <= 60`, seat type `SEMI_SLEEPER`, label `VARCHAR(4)` | `constraints.sql` vs `network.types.ts` | Valid API requests could fail at the database |
| 9 | Seat map, studio and API each had their own idea of what a layout is | 4 places | Every fix had to be made 4 times |
| 10 | `order.checkoutUrl` used but not defined on `RazorpayOrderResult` | `payments.service.ts` | Compile error; the app also never received the Razorpay key or order id |
| 11 | A booking did not expose its trip id | `BookingDetailDTO` | Live tracking could not be opened from a ticket |
| 12 | Navigation declared 7 screens that did not exist; Continue was a stub | `RootNavigator.tsx`, `SeatSelectionScreen.tsx` | The passenger app ended at seat selection |

## 2. The model

A layout is one JSON document (`Layout`, `v: 2`). Coordinates are integers, `row 0` is the front.

```json
{
  "v": 2,
  "decks": [{ "id": "LOWER", "rows": 13, "cols": 4 }, { "id": "UPPER", "rows": 13, "cols": 4 }],
  "seats": [
    { "key": "L1", "label": "L1", "deck": "LOWER", "row": 1, "col": 0, "rowSpan": 2, "colSpan": 2,
      "type": "SLEEPER", "capacity": 2 }
  ],
  "fixtures": [{ "fixture": "DOOR", "deck": "LOWER", "row": 0, "col": 0 }],
  "meta": { "name": "", "preset": "" }
}
```

* **Deck**: `MAIN` (single floor) or `LOWER` + `UPPER`. Each has its own grid, up to 40 x 10.
* **Seat** (a bookable unit): `key` (stable identity), `label` (what people read), position, `rowSpan`/`colSpan`
  (a sleeper is 1x2, a double berth 2x2), `type` (SEATER / SEMI_SLEEPER / SLEEPER), `unit` (SEAT / BERTH / CABIN),
  `capacity`, `sale` (WHOLE / EITHER), `femaleOnly`, `fareTier`, `features`.
* **Fixture** (not bookable): DOOR, DRIVER, CREW, STAIRS, WC, LUGGAGE, VOID (wheel arch, engine hump, any cut-out).
* **Floor** is implicit: any cell with nothing in it is walkable aisle. DOOR and STAIRS are walkable, the rest block.
* Defaults are omitted on the wire (`compactLayout`) and restored on read (`parseLayout`), so the document stays small.

Why this shape: every real layout is "some rectangles on a grid", so the model has no layout-specific rules at all.
2+2, 3+2, 1+1, rear bench, mid door, toilet, driver cab, sleepers, double berths and two floors are all just data.

## 3. Engine modules

| Module | Job |
|--------|-----|
| `parse` | loose input to canonical `Layout`; `compactLayout` for storage; `normalizeLayout` for ordering |
| `validate` | structural errors + access warnings; `checkLayout` = parse + validate (use at every trust boundary) |
| `geometry` | window / aisle / middle flags, left-right neighbours, adjacency graph (side by side > across aisle > front/back) |
| `render` | **track-based** render plan: any layout to absolute rectangles; `fitToWidth`; `cellAt` for editors |
| `state` | seat status overlay, selection rules (max 8), `suggestTogether`, `selectionGroups` |
| `presets` | 11 presets + builders (`buildSeaterLayout`, `buildSleeperLayout`, `buildDoubleDeckerLayout`) |
| `editor` | headless editor (reducer, undo/redo, auto-label) for the BusCon studio |
| `diff` | compare layouts by seat key; which edits touch a booking |
| `legacy` | lossless v1 to v2 and back (`fromLegacy`, `toLegacy`) |
| `labels` | `1A` / `1..N` / `L1..U18` schemes; relabel never changes keys |

### The rendering idea (why it cannot mis-draw a layout)

Column and row sizes come from what is in the track, not from a template: a column with a seat in it is a seat
column, an empty column is a slim aisle, a row with only 1-row sleepers is taller. Spans add track sizes. So a 3+2,
a 1+1 and a double-berth bus all fall out of the same 60 lines. 400 random layouts are tested for "no two
rectangles overlap and everything stays inside the deck".

## 4. Validation rules

Errors block a save, warnings do not.

| Code | Severity | Meaning |
|------|----------|---------|
| SCHEMA, BAD_DECKS, GRID_TOO_LARGE, BAD_SPAN | error | malformed document, MAIN mixed with LOWER/UPPER, UPPER without LOWER, grid over 40x10 |
| OUT_OF_BOUNDS, OVERLAP | error | a seat or fixture outside its deck, or two things in one cell |
| DUPLICATE_KEY, DUPLICATE_LABEL, BAD_KEY, BAD_LABEL | error | identity and label rules (labels are case-insensitive unique, 1-8 chars) |
| BAD_CAPACITY, TYPE_UNIT_MISMATCH | error | a seat holds one person; sleepers are berths |
| NO_SEATS, TOO_MANY_SEATS, CAPACITY_MISMATCH | error | 1-150 units; must equal the bus capacity (or send `?syncCapacity=true`) |
| FEATURE_DISABLED | error | CABIN units and `sale: EITHER` are modelled but switched off (Phase 2) |
| UNREACHABLE_SEAT | warning (error only in the editor's strict mode) | a seat no door/aisle can reach, allowing a walk past at most two seats |
| NO_ACCESS_POINT, DECK_EMPTY | warning | no door or stairs on a deck; a deck without seats |

Access problems are warnings in the API on purpose: a real bus we did not anticipate must always be saveable.

## 5. Identity and edits (what changed in the API)

* A seat is identified by `key`, not by row and column. Saving keeps the database id of every seat whose key survives.
* Removed seats are **soft-deleted**, so old tickets and trips still resolve.
* Labels are copied onto each `booking_passengers` row at booking time (`seat_label`), so a ticket never changes.
* An edit is refused with `409 LAYOUT_IN_USE` only when it would remove, re-shape, relabel or re-gender a seat that has an
  active booking or a live lock on a schedule that has **not departed**. Past and cancelled bookings never block.
* Saves are serialised per bus with an advisory lock; label swaps go through temporary labels so the unique index never trips.
* `POST /operator/buses/:id/layout/validate` is a dry run: issues, added/removed/changed counts and conflicts. It writes nothing.
* Old clients keep working: v1 bodies are still accepted and produce the same errors in the same order; v1 reads still
  return rows, columns, aisle cells (now correct) and seat rows.

## 6. API contract

| Endpoint | Change |
|----------|--------|
| `PUT /operator/buses/:id/layout` | body is v2 document (`v: 2`) or the old rows/columns body. `?syncCapacity=true` sets bus capacity from the layout |
| `POST /operator/buses/:id/layout/validate` | new, dry run |
| `GET /operator/buses/:id/layout` | adds `rev`, `spec`, seat `key` |
| `GET /passenger/schedules/:id/availability` | adds `layout.rev`, `layout.spec`, seat `key`; `aisleCells` fixed |
| `GET /passenger/bookings/:id` | adds `trip: { tripId, status } | null`; passenger seat labels come from the snapshot |
| `POST /passenger/payments` | adds `gateway: { provider, keyId, orderId, mock }` |

## 7. Impact on the three products (and the web app)

| Product | Status | What it does now / what is left |
|---------|--------|---------------------------------|
| API (shared backend) | done | migration, constraints script, engine-backed save, conflicts, dry run, availability v2 |
| BusVerse Passenger | done | engine-driven `SeatMap` (decks, fixtures, berths), no mock bus, seat-together, hold/resume banner, passenger details, payment (Razorpay WebView + dev simulate), ticket with QR, My tickets, cancel with refund preview, live tracking, account |
| BusCon Operator | ready, UI not rewritten | the studio can use `createEditor` / `editorReducer`, `PRESETS`, `buildRenderPlan`, the validate endpoint and the v2 save. The current `SeatLayoutStudio` keeps working through the v1 body, with its old 5-column / 20-row limit |
| BusVerse Driver | ready, UI not written | has no seat UI today. `GET /driver/trips/:id/manifest` plus `buildRenderPlan` gives a boarding map; the manifest should read `bookingPassenger.seatLabel` |
| BusVerse web (`apps/busverse`) | not changed | `SeatDeck` still draws from rows/columns; it keeps working through the legacy fields |

## 8. Tests

* Engine: 59 tests (`pnpm --filter @busverse/seat-engine test`). Unit tests per module plus property tests over 400
  random layouts: valid documents survive a storage round trip, render rectangles never overlap, adjacency is symmetric,
  suggestions are distinct/available/together, v1 grids round-trip exactly, the editor never leaves a broken layout.
* API: `apps/api/tests/integration/seat-layout-v2.test.ts` (save, double-decker, capacity sync, invalid input, dry run,
  stable ids, label swap, soft delete, booking conflicts, relabel protection). Written for your existing test harness.
* Passenger app: type-checked against the real engine types and your navigation param list. It has **not** been run on a
  device or simulator; payments, maps and the QR need a real run.

## 9. Decisions and what was rejected

* **Seat identity by key, not by id in the payload**: operators edit documents, the server maps keys to ids.
* **Versioned layouts pinned to schedules** were considered and rejected for Phase 1: it needs a copy of every seat per
  version. Keys + soft delete + conflict rule give the same safety with one set of rows.
* **Strict reachability as an error** was rejected for the API (false positives on unusual real buses); it is a warning,
  and the editor can run strict.
* **Per-seat pricing**: `fareTier` is carried inside the layout JSON but is not priced. Booking still
  charges one flat fare per seat.
* **Phase gates**: cabins, `sale: EITHER` and segment sales are not enabled. The model can describe cabins and
  two-person berths; validation rejects what Phase 1 does not sell.

## 10. Open questions for you

1. Berth wording: `unit` (SEAT / BERTH / CABIN), `capacity`, `sale` are my names. Align them with your berth taxonomy and
   share-mode decisions before the studio UI is built.
2. Should operators be able to block single seats on a schedule (maintenance, staff quota)? The engine already has a
   BLOCKED status; there is no database table or endpoint for it.
3. Per-seat pricing (lower vs upper berth, front row): wanted in Phase 1?
4. Manifests, admin views and the operator dashboard still read the live seat label. Switch them to the ticket-time label?
5. A realtime "layout changed" event for passengers who have the seat map open (today they refetch within 60 s or on error).
6. The API allows 8 seats per booking; the old UI spec said "no limit". The app now enforces 8. Raise the API limit?

## 11. Rollout order

1. Apply the scripts (`01` to `06`), then `99-verify.ps1`.
2. `prisma migrate deploy` (adds columns, back-fills `seat_key`), then `seat-layout-v2.constraints.sql`. Use `deploy`, not
   `migrate dev`: the unique indexes from `constraints.sql` look like drift to Prisma, and `migrate dev` then offers to reset the schema.
3. Existing buses need no action: their layouts are upgraded on the fly and become v2 on the next save.
4. Move the BusCon studio, then the driver manifest and the web `SeatDeck`, onto the engine.
