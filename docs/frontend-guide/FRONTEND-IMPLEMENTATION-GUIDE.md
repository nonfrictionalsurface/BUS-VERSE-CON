# BusVerse Front-End Implementation Guide

For anyone building or extending a client of the shared backend: BusVerse Passenger (mobile), BusVerse Driver (mobile),
BusCon Operator (web) and the BusVerse web app. Everything below is taken from the code in this repository. Verbatim
contracts are in `API-CONTRACTS-APPENDIX-1.md` (error codes, the full route table, request schemas) and `API-CONTRACTS-APPENDIX-2.md`
(response types, realtime events and topics, seat engine API).

## 0. Status of the backend (read this first)

| Area | State | Evidence |
|------|-------|----------|
| Seat Layout Engine (`packages/seat-engine`) | working | 59 tests pass on the project owner's machine |
| Database migration `seat_layout_v2` + constraints | applied | `prisma migrate deploy` and the constraints script ran successfully |
| Seat layout, availability, booking, payment-response changes | typecheck-clean | new files compile against the real Prisma types; `10-verify.ps1` runs the API typecheck |
| Razorpay adapter | fixed in script 11 | before: `createRefund` missing, webhook signature called without its secret (every webhook failed), order call mistyped |
| Driver ticket scan (`scanTicket`) | restored in script 11 | before: a demo stub, and the controller called a function that did not exist |
| API integration test-suite | **not yet confirmed** | run `pnpm --filter api test` after scripts 01-12; it needs Docker (Postgres 7542, Redis 7543) |
| Real Razorpay payments end to end | **not confirmed** | needs real test keys and a public webhook URL (section 7) |
| Web app (`apps/busverse`) | partly fixed in script 12 | schedule and booking pages imported helpers that did not exist |

Certify the backend yourself with these commands from the repo root (after `docker compose up -d`):

```powershell
pnpm --filter api typecheck       # expect 0 errors
pnpm --filter api test            # expect all green; paste failures to the backend owner
pnpm --filter @busverse/seat-engine test
```

Do not start a client against a backend you have not certified. Section 12 lists the known gaps.

## 1. The system on one page

* One API (Fastify, TypeScript) serves every client. Base URL `http://<host>:4310/v1` in development (`PORT`, default 4310).
* Postgres on `localhost:7542` and Redis on `localhost:7543` come from `docker compose up -d`.
* Four surfaces, one per kind of user. The path prefix says which: `/passenger/*`, `/driver/*`, `/operator/*`, `/admin/*`.
  `/public/*` needs no sign-in (cities, stands, search, schedule detail).
* Responses are always an envelope. Success: `{ "data": ..., "meta": {...}? }`. Error: `{ "error": { "code", "message", "details"?, "requestId" } }`.
* Realtime is Socket.IO at path `/v1/ws` (section 8).
* Money is integer **paise** (1 rupee = 100 paise). Never use floating point for money.
* Times are ISO 8601 UTC strings. Convert to local time only for display.
* Ids are UUIDs. A bus seat also has a stable `key` (section 4).

```
Passenger app ----+
Driver app -------+--> /v1 REST  ----> Fastify API ----> Postgres (+ Redis for seat locks, WS fan-out)
BusCon (web) -----+--> /v1/ws  ----^        |
BusVerse web -----+                         +--> Razorpay (orders, refunds, webhooks), MSG91 (OTP), R2 (uploads)
```

## 2. Conventions every client must follow

### 2.1 Envelope and errors
Unwrap `data`. On a non-2xx response read `error.code` (stable, machine-readable), never the message text.
Request validation failures return `VALIDATION_ERROR` (422) with details; business-rule failures return the codes below.

| Code | HTTP | What the client should do |
|------|------|---------------------------|
| UNAUTHORIZED | 401 | try refresh once, else go to sign-in |
| SESSION_REVOKED, REFRESH_TOKEN_REPLAYED | 401 | the session is dead: clear tokens, sign in again (never retry) |
| FORBIDDEN | 403 | wrong role/ownership: show "not allowed" |
| NOT_FOUND | 404 | show an empty/missing state |
| VALIDATION_ERROR / INVALID_REQUEST | 422 / 400 | highlight the fields in `details`; do not retry |
| RATE_LIMITED, OTP_ATTEMPTS_EXCEEDED | 429 | show a wait message; back off |
| INVALID_OTP, OTP_EXPIRED | 400 | let the user retype or resend |
| SEAT_LOCKED, SEAT_ALREADY_BOOKED | 409 | refresh the seat map, tell the user the seat just went |
| LOCK_EXPIRED, LOCK_NOT_FOUND | 400 | the hold ended: send the user back to seat selection |
| INVALID_SEAT | 400 | the seat left the layout: refetch availability |
| SCHEDULE_DEPARTED, SCHEDULE_CANCELLED | 409 | the trip is no longer bookable |
| PAYMENT_ALREADY_SUCCEEDED | 409 | go to the ticket |
| PAYMENT_NOT_ALLOWED | 400 | the booking is not payable (expired or cancelled) |
| IDEMPOTENCY_KEY_REUSED | 409 | same key with a different body: generate a new key |
| LAYOUT_IN_USE | 409 | (operator) the layout edit touches seats that have live bookings or holds; `details.conflicts` lists them |
| TRIP_* , SCAN_EXPIRED, INVALID_SIGNATURE | 4xx | driver flows (section 9) |
| INTERNAL_ERROR, SERVICE_UNAVAILABLE, GATEWAY_TIMEOUT | 5xx | retry GETs with backoff; never auto-retry a POST without an idempotency key |

The complete code list with HTTP statuses is in `API-CONTRACTS-APPENDIX-1.md` (A.1).

### 2.2 Headers
* `Authorization: Bearer <accessToken>` on every authenticated call.
* `Idempotency-Key: <8+ chars>` on `POST /passenger/payments`. One key per booking (`pay-<bookingId>`) makes retries safe.
* `Content-Type: application/json` on every POST, even when the body is empty: send `{}`. Fastify rejects an empty body with a JSON content type.

### 2.3 Lists
Lists return an array in `data`. Where there is more, the cursor is in `meta.nextCursor` (not every list has one). The passenger
client unwraps `data` only, so ask for a big enough `limit` or read `meta` if you need paging.

### 2.4 Time
Seat holds and booking windows are enforced by the server clock. Show countdowns from `expiresAt`, and treat the server as the
authority: when the timer hits zero, refetch instead of assuming.

## 3. Authentication

| Surface | Sign-in | Notes |
|---------|---------|-------|
| Passenger | `POST /passenger/auth/otp/request {phone or email, intent: LOGIN or SIGNUP}`, then `POST /passenger/auth/otp/verify {phone or email, otp}` | exactly one of phone/email; 6-digit OTP |
| Driver | `POST /driver/auth/otp/request {phone}`, then `POST /driver/auth/otp/verify {phone, otp, deviceFingerprint}` | `deviceFingerprint` is 8-256 chars and identifies the phone; one device per driver unless `DEMO_MULTI_DEVICE_DRIVER=true` |
| Operator | `POST /operator/auth/login {email, password}` (password at least 12 chars), or phone OTP at `/operator/auth/otp/*`, or `POST /operator/auth/signup` | reset: `/operator/auth/reset/request` and `/reset/verify` |
| Admin | `POST /admin/auth/login {email, password}` (password at least 16 chars) | reset like operator |

* A successful verify/login returns a flat object: `{ accessToken, refreshToken, expiresAt, user }`.
* OTP: valid 600 s, 5 attempts, request window 600 s. With `MOCK_OTP=true` on the server the OTP is always `123456`.
* Refresh: `POST /{surface}/auth/refresh` with `{ "refreshToken": "..." }` (or the refresh token as the Bearer token). Returns new tokens.
  Refresh tokens rotate: use the newest one. Using an old one returns `REFRESH_TOKEN_REPLAYED` and kills the session.
* Logout: `POST /{surface}/auth/logout` with the access token.

| Role | Access token | Refresh token |
|------|--------------|---------------|
| Passenger (REGISTERED_PASSENGER) | 15 min | 7 days |
| Operator (OPERATOR_OWNER, OPERATOR_MANAGER) | 15 min | 7 days |
| Driver | 30 min | 30 days |
| Admin (SUPER_ADMIN) | 5 min | 1 day |

Client rules: keep tokens in secure storage (Keychain/Keystore, `expo-secure-store`); refresh when you get 401 or shortly before
`expiresAt`; serialise refreshes (one in flight) so two tabs do not replay a token; clear everything on `SESSION_REVOKED`.
`GET /passenger/me` returns the signed-in passenger. There is no endpoint to edit the passenger profile yet.

## 4. The Seat Layout Engine (use it, do not re-implement seat maps)

Package `@busverse/seat-engine`. One model for every bus: decks, a grid, seats and berths (with spans), and fixtures
(door, driver, stairs, toilet, luggage, void). Full design: `docs/seat-engine/SEAT-ENGINE-V2.md`.

### 4.1 What the API sends
`GET /passenger/schedules/:id/availability` returns:

```json
{
  "schedule": { "id": "...", "fare": { "amountPaise": 50000, "currency": "INR" } },
  "layout": { "rowsCount": 11, "columnsCount": 5, "aisleCells": [ ... ], "rev": 3, "spec": { "v": 2, "decks": [...], "seats": [...], "fixtures": [...] } },
  "seats": [ { "id": "uuid", "key": "1A", "label": "1A", "row": "B", "column": 1, "type": "SEATER",
               "isFemaleOnly": false, "state": "AVAILABLE", "lockedUntil": null } ]
}
```

* `layout.spec` is the geometry. `seats[]` is the live state. Join them by `key`.
* `state` is AVAILABLE, LOCKED (someone else), MINE (you hold it) or BOOKED.
* `rowsCount`, `columnsCount`, `aisleCells` and each seat's `row`/`column` are a **legacy** single-grid view kept for old clients.
  New code must use `spec`.
* `layout.rev` changes only when the operator edits the layout. Cache the parsed layout by `rev`.

### 4.2 Recipe (any JavaScript client)

```ts
import { parseLayout, buildRenderPlan, fitToWidth, statusOf, suggestTogether, validateSelection } from '@busverse/seat-engine';

const { layout } = parseLayout(availability.layout.spec);          // null if the document is invalid: show an error, never a made-up bus
const runtime = Object.fromEntries(availability.seats.map(s => [s.key, { status: s.state }]));
const fit  = fitToWidth(layout, availableWidthPx);                  // { options, scale, overflow }
const plan = buildRenderPlan(layout, fit.options);                  // decks -> seats/fixtures as absolute rectangles
// draw plan.decks[i].seats[j] at (x, y, w, h); colour by statusOf(runtime, seat.key); fixtures are the dashed tiles
```

* Draw rectangles; do not hard-code 2+2. A deck tab appears when `plan.decks.length > 1`.
* A seat tap maps to `key`; look up the seat `id` for lock calls.
* `suggestTogether(layout, runtime, n)` powers "seat us together". `validateSelection` enforces the 8-seat limit.
* If `fit.overflow` is true wrap the map in a horizontal scroll view.
* Accessibility: each tile needs a label such as "Seat 12A, window, available". The plan exposes `window`, `aisleSide`, `order`.
* Reference implementation: `apps/passenger-app/src/features/seats/components/SeatMap.tsx` (React Native).
* Web: render the same rectangles with absolutely positioned elements or SVG. The BusVerse web `SeatDeck` still uses the legacy view.

### 4.3 Operator studio recipe (BusCon)

1. Load: `GET /operator/buses/:id/layout` returns `spec` (a v2 document, upgraded on the fly if the layout is old) and `rev`.
2. Edit in memory with `createEditor(layout)` and `editorReducer(state, action)`. Actions: `PLACE_SEAT`, `PLACE_FIXTURE`, `ERASE`,
   `MOVE_SEAT`, `UPDATE_SEAT`, `SET_DECK_SIZE`, `ADD_DECK`, `RENAME_DECK`, `RELABEL`, `UNDO`, `REDO`, `REPLACE` (apply a preset).
   A refused action leaves the state unchanged and sets `state.error`. `state.issues` are live warnings.
3. Start points: `PRESETS` (11 ready layouts) and `buildSeaterLayout`, `buildSleeperLayout`, `buildDoubleDeckerLayout`.
4. Draw with `buildRenderPlan`; map clicks to cells with `cellAt(deckPlan, x, y)`.
5. Before saving call `POST /operator/buses/:id/layout/validate` (body = `compactLayout(layout)`). It returns `{ ok, issues, summary, conflicts }` and writes nothing.
6. Save with `PUT /operator/buses/:id/layout` (same body). Add `?syncCapacity=true` to set the bus capacity from the layout.
   `409 LAYOUT_IN_USE` means a seat with a live booking or hold would be removed, re-shaped, relabelled or re-gendered:
   show `details.conflicts` (seat, schedule, departure).
7. The old body (`rowsCount`, `columnsCount`, `seats[]`) is still accepted for the existing studio.

### 4.4 Driver manifest map
`GET /driver/trips/:id/manifest` lists passengers with seat labels. Render the bus with the same plan and colour boarded seats.
The manifest is not yet keyed by seat `key`; match by label for now.

## 5. Passenger flow, step by step

Every step maps to a screen in `apps/passenger-app/src/screens`.

1. **Cities and search** (no sign-in). `GET /public/cities`, `GET /public/cities/:id/stands`,
   `GET /public/search?originCityId&destinationCityId&date=YYYY-MM-DD&sortBy=departureTime|fare`.
   Results include fare, times and free seats. `GET /public/schedules/:id` gives the full route with ordered stands.
2. **Sign in** when the user picks a bus (section 3). Seat maps need a signed-in passenger.
3. **Seat map.** `GET /passenger/schedules/:id/availability` (section 4). Subscribe to `seat:availability:<scheduleId>` for live changes (section 8).
4. **Hold seats.** Tapping a seat calls `POST /passenger/seat-locks {scheduleId, seatId}` and returns `{ lockId, seatId, seatLabel, expiresAt, remainingSeconds }`.
   A hold lasts **5 minutes**. Release with `DELETE /passenger/seat-locks/:lockId`. `GET /passenger/seat-locks/active` lists the user's holds (offer to resume them, never restore silently).
   Maximum **8 seats** per booking.
5. **Passenger details.** For each seat: name (1-100 chars), optional age (1-119), optional gender MALE/FEMALE/OTHER. Women-only seats must go to a woman (the app enforces this; the server does not yet).
   Pick a boarding stand and a dropping stand from the route; boarding must come before dropping in stand order.
6. **Create the booking.** `POST /passenger/bookings` with
   `{ lockId, boardingStandId, droppingStandId, passengers: [{ seatId, name, age?, gender? }] }`.
   `lockId` is any one of the held locks; the server checks that **every** `seatId` is held by this user. The booking is `PENDING` and the holds extend to **15 minutes**.
   Response: `{ bookingId, bookingReference, totalFarePaise, expiresAt, ... }`.
   Errors to handle: `LOCK_EXPIRED`, `LOCK_NOT_FOUND`, `SEAT_LOCKED`, `INVALID_SEAT`.
7. **Pay** (section 7). On success the booking becomes `CONFIRMED` and a ticket is issued.
8. **Ticket.** `GET /passenger/bookings/:id` (details, passengers, fare breakdown, `trip`) and `GET /passenger/bookings/:id/ticket` (`qrPayload`).
   Render `qrPayload` as a QR code, unchanged.
9. **My tickets.** `GET /passenger/bookings?limit=50`. Group client-side: upcoming, past, cancelled.
10. **Track the bus.** `booking.trip.tripId` is set once a trip exists. `GET /passenger/trips/:id/map` (route and stands) and `/live` (status, position, ETA).
    Subscribe to `trip:live:<tripId>`. Allowed only for confirmed or boarded bookings.
11. **Cancel.** `GET /passenger/bookings/:id/refund-preview`, then `POST /passenger/bookings/:id/cancel` with `{}`. Rules in section 10.

Timers to show: the 5-minute seat hold (earliest `expiresAt`), then the 15-minute payment window (`booking.expiresAt`).
Back navigation: leaving seat selection releases the holds unless the user is moving forward; after payment confirms, reset the stack to Home then Ticket.

## 6. Money

* Fare = schedule fare per seat x seats (`baseFarePaise`).
* GST = 5% of the base fare, rounded half up (`taxPaise`).
* Convenience fee = 1500 paise per booking (`convenienceFeePaise`).
* Total = base + tax + fee. The booking stores this breakdown; display it from `fareBreakdown`, never recompute it in the client.
* There is one flat fare per seat today. Per-seat pricing (lower versus upper berth) is not implemented; `fareTier` exists in the layout model but is not priced.

## 7. Payments

### 7.1 The contract
`POST /passenger/payments {bookingId}` with header `Idempotency-Key: pay-<bookingId>` returns:

```json
{ "paymentId": "uuid", "bookingId": "uuid", "amountPaise": 59500, "currency": "INR", "status": "INITIATED",
  "checkoutUrl": null,
  "gateway": { "provider": "RAZORPAY", "keyId": "rzp_test_...", "orderId": "order_...", "mock": false },
  "expiresAt": "..." }
```

`GET /passenger/payments/:id` returns the same object with the current status.

### 7.2 The client must never confirm a payment itself
The booking becomes `CONFIRMED` only when the **server** receives the gateway webhook (`POST /webhooks/razorpay`, event `payment.captured`).
The checkout result in the app is only a hint to move the UI to "Confirming...". Then:
1. Subscribe to `booking:<bookingId>` and wait for `booking:confirmed` (fast path).
2. Poll `GET /passenger/bookings/:id` every 3 seconds as the fallback.
3. On `CONFIRMED` (or `CHECKED_IN`) go to the ticket. On `EXPIRED`, `FAILED` or `CANCELLED` show the failure and offer to start again.
4. If nothing happens for about 45 seconds, tell the user the money is safe and the ticket will appear in My tickets.

### 7.3 Real Razorpay (React Native)
* Use Razorpay Standard Checkout. The reference app loads `checkout.razorpay.com/v1/checkout.js` inside a WebView page
  (`apps/passenger-app/src/features/payment/components/RazorpayCheckout.tsx`) with `key = gateway.keyId`, `order_id = gateway.orderId`,
  `amount = amountPaise`, `currency = INR`. UPI intent links (non-http schemes) must be passed to `Linking.openURL`.
* A native SDK (`react-native-razorpay`) also works but needs a development build, not Expo Go.
* Web clients: use the same `checkout.js` script with the same options.

### 7.4 Development without Razorpay
* Server side, a mock order is created when `MOCK_PAYMENT=true`, or when the keys are placeholders and `NODE_ENV` is not production.
  Then `gateway.mock` is `true`.
* In that case call `POST /v1/dev/mock-confirm-payment {paymentId}`. It runs the same confirmation transaction as the webhook.
  The route exists only when `NODE_ENV` is not `production`.
* The passenger app shows a "Simulate successful payment" button in this mode.

### 7.5 Testing the real webhook locally
Razorpay must reach your machine: run a tunnel (ngrok, cloudflared) to port 4310 and register
`https://<tunnel>/v1/webhooks/razorpay` in the Razorpay dashboard with the same value as `RAZORPAY_WEBHOOK_SECRET`.
The signature is HMAC-SHA256 of the **raw** request body, header `X-Razorpay-Signature`. Never parse and re-serialise the body before verifying.

### 7.6 Refunds
Cancelling a confirmed booking creates a refund for the amount in the refund preview (section 10.3). In development, refunds on mock
payments are simulated. Admins can refund from `POST /admin/payments/:id/refund`.

## 8. Realtime (Socket.IO)

### 8.1 Connect and authenticate
```ts
const socket = io(WS_ORIGIN, { path: '/v1/ws', transports: ['websocket', 'polling'], reconnection: true });
socket.on('connect', () => socket.emit('message', { action: 'auth', token: accessToken }));   // within a few seconds, or the server closes with AUTH_TIMEOUT
socket.on('auth:ok', () => socket.emit('message', { action: 'subscribe', topics: [...] }));
socket.on('auth:expiring', () => socket.emit('message', { action: 'auth:refresh', refreshToken }));
socket.on('auth:refreshed', ({ accessToken, refreshToken }) => { /* store both */ });
socket.on('message', (env) => { /* { event, data: { ..., _v: 1 }, ts } */ });
```

* Every client-to-server message is `emit('message', { action, ... })`. Actions: `auth`, `subscribe`, `auth:refresh`.
* `unsubscribe` is **not** implemented on the server (it answers `UNKNOWN_ACTION`). Topics stay joined until the socket closes.
* The browser origin must be in `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000,http://localhost:3001,http://localhost:8081`).
* After a reconnect: re-authenticate, re-subscribe, then refetch the screen's REST data. Events sent while offline are not replayed.

### 8.2 Topics
| Topic | Who may join | Carries |
|-------|--------------|---------|
| `seat:availability:<scheduleId>` | any signed-in user, as long as the schedule exists | `seat:locked`, `seat:released`, `seat:booked` |
| `booking:<bookingId>` | the booking's owner, and SUPER_ADMIN | `booking:confirmed`, `booking:cancelled`, `booking:expired`, `payment:succeeded`, `refund:requested`, `boarding:verified` |
| `trip:live:<tripId>` | SUPER_ADMIN, or a user holding a CONFIRMED or CHECKED_IN booking on that trip's schedule. **Drivers and operators cannot subscribe today** | `bus:position`, `trip:started`, `trip:delayed`, `trip:ended`, `trip:cancelled`, `gps_anomaly` |
| `admin:notifications` | SUPER_ADMIN | `operator:applied`, `refund:requested` |

Exact access rules: `apps/api/src/realtime/topics.ts` (`API-CONTRACTS-APPENDIX-2.md`, A.6). Payload types for every event: `apps/api/src/realtime/events.ts` (`API-CONTRACTS-APPENDIX-2.md`, A.5).

### 8.3 Using events well
* Treat events as hints to patch local state (a seat turning LOCKED) and REST as the source of truth.
* Seat events carry `seatId`, not `key`: map through your seat index.
* `bus:position` can arrive several times a second: throttle redraws. If `isStale` is true on `GET .../live`, show "signal weak".
* Always unsubscribe your local handlers on screen exit even though the server topic stays joined.

## 9. Driver app

Screens in `apps/driver-app/src/screens`: Boot, Splash, Phone, Otp, TripsList, TripDetail, Manifest, Map, Scan, TripSummary.

| Step | Endpoint | Notes |
|------|----------|-------|
| Sign in | `POST /driver/auth/otp/request`, `/verify` | send `deviceFingerprint`; a second device is rejected unless `DEMO_MULTI_DEVICE_DRIVER=true` |
| App config | `GET /driver/config` | GPS interval and similar settings; read it on start |
| Profile | `GET /driver/me` | verification status; `DRIVER_NOT_VERIFIED`, `DRIVER_BLOCKED`, `LICENSE_EXPIRED` mean the driver cannot work |
| My trips | `GET /driver/trips`, `GET /driver/trips/history` | |
| Trip detail | `GET /driver/trips/:id` | route, stands, status |
| Start | `POST /driver/trips/:id/start` | allowed only within 2 hours before or after departure (`TRIP_OUTSIDE_WINDOW`); one active trip at a time (`ACTIVE_TRIP_EXISTS`) |
| GPS | `POST /driver/trips/:id/gps` | send fixes while `IN_PROGRESS`; rejected: bad accuracy (`INVALID_ACCURACY`), impossible jumps (`TELEPORT_DETECTED`), bad coordinates |
| Manifest | `GET /driver/trips/:id/manifest` | passengers and seat labels |
| Scan | `POST /driver/trips/:id/scan` | result `VALID` or `DUPLICATE`; see below |
| Delay | `POST /driver/trips/:id/delay` | reason: TRAFFIC, WEATHER, BREAKDOWN, ACCIDENT, ROAD_CLOSURE, OTHER |
| End / cancel | `POST /driver/trips/:id/end`, `/cancel` | |
| Documents | `POST /driver/uploads`, `POST /driver/me/documents` | files go to object storage via a signed upload |

### 9.1 Scanning a ticket
* The QR on a ticket is the string from `GET /passenger/bookings/:id/ticket`, shaped `v1:<base64 payload>:<signature>`, signed with Ed25519.
  The driver app sends it unchanged in the scan request (field list: `ScanRequestDTO` in `API-CONTRACTS-APPENDIX-2.md`, A.4d). The server checks the signature,
  the trip, the booking and the ticket state. A second scan of the same ticket returns `DUPLICATE`, not an error.
* A good scan marks the booking `CHECKED_IN` and the ticket `SCANNED`, and emits `boarding:verified` to the booking and trip topics.
* Errors: `INVALID_SIGNATURE` (tampered or foreign QR), `INVALID_TRIP` (ticket belongs to another trip), `INVALID_BOOKING`, `SCAN_EXPIRED`.
* Server demo switch: `DEMO_SCAN_BYPASS=true` (ignored in production) makes every scan succeed without checking. Use it only for demos and never in a build that people rely on.

## 10. States, rules and limits

### 10.1 Statuses
| Entity | Values |
|--------|--------|
| Booking | PENDING, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, OPERATOR_CANCELLED, REFUNDED, EXPIRED, FAILED |
| Payment | INITIATED, PENDING, SUCCEEDED, FAILED, EXPIRED, REFUNDED |
| Ticket | ISSUED, ACTIVE, SCANNED, USED, CANCELLED |
| Trip | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| Seat (availability) | AVAILABLE, LOCKED, MINE, BOOKED (the engine also knows BLOCKED, for future operator blocks) |

Typical booking path: `PENDING` -> (payment webhook) `CONFIRMED` -> (driver scan) `CHECKED_IN`.
No code path sets a booking to `COMPLETED` today (only the trip completes), so a departed `CONFIRMED` or `CHECKED_IN` booking is simply "past":
decide that from the departure time, as the passenger app does.
Unpaid bookings end as `EXPIRED` after the payment window; failures end as `FAILED`. Cancelling gives `CANCELLED`; an operator cancelling gives
`OPERATOR_CANCELLED`; `REFUNDED` is the end state once money went back.
Cancel buttons: show only for `CONFIRMED` bookings whose departure is in the future.

### 10.2 Limits and timers
| Item | Value |
|------|-------|
| Seats per booking | 8 |
| Seat hold | 5 minutes (300 s) |
| Booking hold / payment window | 15 minutes (900 s) |
| Passenger name | 1-100 characters |
| Seat label | up to 8 characters |
| OTP | 6 digits, valid 10 minutes, 5 attempts |
| Layout | up to 2 decks, 40 rows x 10 columns each, 150 bookable units, capacity 1-150 |
| Convenience fee | 1500 paise per booking |
| GST | 5% of base fare |
| Trip start window | 120 minutes either side of departure |

### 10.3 Refund tiers (cancelling a confirmed booking)
| Time before departure | Tier | Fare refunded | Tax refunded | Convenience fee |
|-----------------------|------|---------------|--------------|-----------------|
| 24 h or more | TIER_FULL | 100% | 100% | refunded |
| 12 h to under 24 h | TIER_75 | 75% | 75% | refunded |
| 2 h to under 12 h | TIER_50 | 50% | 50% | refunded |
| under 2 h | TIER_ZERO | 0% | 0% | refunded |
| after departure | TIER_NOT_ELIGIBLE | cancel not allowed | | |
| operator cancelled | TIER_FULL | 100% | 100% | refunded |

Always call `GET /passenger/bookings/:id/refund-preview` and show its numbers; the app must not compute tiers itself.

## 11. BusCon (operator) and admin

Feature folders in `apps/buscon/src/features`: auth, dashboard, buses, routes, schedules, drivers, trips, bookings, revenue, refunds, approvals,
admin-bookings, admin-drivers, admin-operators, audit.

| Feature | Endpoints |
|---------|-----------|
| Onboarding | `POST /operator/auth/signup`, then a super-admin approves (`POST /admin/operators/:id/approve`, `/reject`, `/suspend`); `GET/PATCH /operator/me`, `GET /operator/me/managers` |
| Dashboard and money | `GET /operator/dashboard`, `/operator/revenue`, `/operator/revenue/daily`, `/operator/settlements` |
| Buses | `GET/POST /operator/buses`, `GET/PATCH/DELETE /operator/buses/:id`; new buses are `PENDING` until `POST /admin/buses/:id/approve` |
| Seat layout | `GET/PUT /operator/buses/:id/layout`, `POST /operator/buses/:id/layout/validate` (section 4.3) |
| Routes | `GET/POST /operator/routes`, `GET/PATCH/DELETE /operator/routes/:id`, `POST /operator/routes/:id/stands`; admin approves with `POST /admin/routes/:id/approve` |
| Schedules | `GET/POST /operator/schedules`, `GET/PATCH /operator/schedules/:id`, `POST /operator/schedules/:id/publish`; admin approval `POST /admin/schedules/:id/approve` |
| Drivers | `GET /operator/drivers`, `POST /operator/drivers/invite`, `GET/DELETE /operator/drivers/:id` |
| Trips | `POST/GET /operator/trips`, `GET/PATCH/DELETE /operator/trips/:id` (assign a driver to a schedule) |
| Bookings | `GET /operator/bookings`, `GET /operator/bookings/:id` |
| Admin oversight | `/admin/dashboard`, `/admin/bookings`, `/admin/payments`, `/admin/refunds`, `/admin/audit-logs` (+ export, sync and async) |

Scheduling rules the UI should explain: a bus must be approved and have a layout (`BUS_NOT_APPROVED`, `BUS_LAYOUT_MISSING`);
overlapping schedules for a bus are refused (`SCHEDULE_CONFLICT`); a schedule with bookings cannot be changed freely
(`SCHEDULE_HAS_BOOKINGS`); a route in use cannot be deleted (`ROUTE_IN_USE`).
Operator roles: `OPERATOR_OWNER` can do everything; `OPERATOR_MANAGER` cannot edit the company profile or list managers.

## 12. Known gaps and cautions

1. The API test-suite has not been confirmed green on the project owner's machine yet (section 0). Run it before building against the API.
2. Real Razorpay payments are untested end to end; use mock mode until a keyed, tunnelled test passes.
3. `unsubscribe` over the websocket is not implemented.
4. Women-only seats are advisory: the client must enforce them.
5. There is no endpoint to edit a passenger's name or email.
6. Per-seat pricing and operator seat blocking do not exist yet.
7. Driver manifest, admin and operator booking views show the live seat label, while a passenger's ticket shows the label as booked.
   The API refuses relabelling a seat that has live bookings, so they only differ for old trips.
8. No realtime "layout changed" event: a passenger with the seat map open sees changes on the next refetch (within a minute) or on a seat error.
9. The BusVerse web `SeatDeck` uses the legacy single-grid view (double-deckers appear stacked); move it to the engine.
10. The BusCon layout studio uses the legacy body (5 columns, 20 rows) until it is rebuilt on the engine editor.
11. Some older passenger-app files already had TypeScript errors before this work (for example typography tokens); fix them when touched.
12. `GET` lists do not all expose cursors; ask for a large `limit` or read `meta.nextCursor` where present.
13. The booking status `COMPLETED` exists but is never set (section 10.1).
14. Drivers and operators cannot subscribe to `trip:live`; the driver app only posts GPS over REST, and operator tracking has no websocket access yet.

## 13. Local setup

Requirements: Node 22.6 or newer, pnpm 9.12, Docker Desktop.

```powershell
docker compose up -d                       # Postgres :7542, Redis :7543
pnpm install
pnpm --filter @busverse/seat-engine build  # the API and apps consume the built package
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db execute --file prisma/constraints.sql        # fresh databases only
pnpm --filter api exec prisma db execute --file prisma/seat-layout-v2.constraints.sql
pnpm --filter api dev                      # http://localhost:4310/v1
```

Important: use `prisma migrate deploy`, not `migrate dev`. The indexes from `constraints.sql` look like drift to Prisma and `migrate dev` would offer to wipe the schema.

Server environment (apps/api/.env): `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (32+ chars), `PII_ENCRYPTION_KEY` (32+), `PHONE_HASH_SALT` (32+),
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, optional `QR_SIGNING_PRIVATE_KEY` / `QR_SIGNING_PUBLIC_KEY`,
`CORS_ALLOWED_ORIGINS`. Development switches: `MOCK_OTP=true` (OTP is 123456), `MOCK_EMAIL=true`, `MOCK_PAYMENT=true`,
`DEMO_MULTI_DEVICE_DRIVER=true`, `DEMO_SCAN_BYPASS=true`.

Mobile apps on a real phone cannot reach `localhost`: point `API_BASE` and the websocket URL at your computer's LAN address, and add the
Expo origin to `CORS_ALLOWED_ORIGINS` if a browser client needs it. Run the passenger app with `cd apps/passenger-app; npx expo start -c`
after `npx expo install react-native-qrcode-svg`.

## 14. Checklist before calling a client "done"

* Every screen has loading, empty, error and offline states. The error state offers Retry and maps `error.code` to plain language.
* Money is formatted from paise with the currency; no floats.
* Countdowns come from server timestamps and refetch at zero.
* Back navigation never leaves seats held by accident, and never shows a stale seat or payment screen after confirmation.
* Seat tiles are at least 40 x 44 px, have a text label, and are described to screen readers (type, window/aisle, state).
* Colour is never the only signal (selected, held, booked also differ by border or icon).
* Token refresh is serialised; `SESSION_REVOKED` signs the user out.
* The websocket re-authenticates, re-subscribes and refetches after every reconnect.
* No mock data in production builds; the dev payment button and any scan bypass are off.
* Dark mode and large text were checked.
