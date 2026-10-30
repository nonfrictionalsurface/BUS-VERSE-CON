# AI Frontend Handover v1 — BusVerse + BusCon Frontends

**Document:** `docs/AI-FRONTEND-HANDOVER-v1.md`
**Purpose:** Cold-start doc for building the 3 frontends. Read §0 → §4 → the frontend you're building (§5, §6, or §7) → §8. Do not read the whole thing at once.
**Date:** 2026-10-30
**Backend state:** Phase 13 complete — 396/396 tests, 108/108 endpoints, 16/16 WS events wired, EXIT CODE 0. **Backend is production-ready.**
**Reading time from cold:** ~30 minutes (this doc + §3 reading list).

---

## §0. TL;DR — Read This First

**What you're building:** Three frontends for a two-sided bus booking platform (BusVerse = passenger, BusCon = operator web, Operator App = driver mobile). All talk to **one backend** at `http://localhost:4310` (dev).

**Backend status:** 108 endpoints live. 16 WebSocket events wired. Auth for 4 actor types (passenger OTP, driver OTP, operator password + OTP, admin password). Real Razorpay test mode. **Do not modify the backend.** Treat it as a black box with a contract at `docs/07-API-AND-REALTIME-CONTRACTS.md` v1.3.

**The 3 frontends:**

| Frontend | For | Tech (recommended) | Dev port |
|---|---|---|---|
| **BusVerse** | Passengers — search, book, pay, track, ticket | Next.js 15 (App Router) + Tailwind + shadcn/ui | 3410 |
| **BusCon** | Operators — buses, routes, schedules, drivers, revenue, bookings | Next.js 15 (App Router) + Tailwind + shadcn/ui | 3411 |
| **Operator App** | Drivers — today's trips, GPS, scan QR, delay, manifest | Expo SDK 51+ + React Navigation + React Query | 8281 |

**Read this first, in this order:**

1. This doc (§0–§4) — 15 min
2. `docs/07-API-AND-REALTIME-CONTRACTS.md` v1.3 — endpoint + error contracts
3. `docs/shared/04-EVENT-AND-REALTIME-CATALOG.md` v1.0 — WS event payloads
4. Your frontend's UI spec (see §3)
5. `docs/AI-HANDOVER-v7.md` §0–§6 — backend state, top gotchas

**Before you write a line of code:**

- Read §3 below ("What to read before writing anything")
- Confirm §4 (non-negotiables) — 12 rules, do not violate
- Skim §8 (gotchas) — these will bite you

**Never do these things:**

- Guess at response shapes — read `07` v1.3
- Guess at DB fields — read `06-DATABASE-SCHEMA.md` v1.3
- Guess at WS event payloads — read `shared/04`
- Modify backend code — it's shipped, tested, frozen
- Assume the demo is a static mock — it's a real backend with real Razorpay test mode

---

## §1. Backend state — what you're integrating with

### 1.1 Endpoints

**108 endpoints.** Do not invent new ones. If your UI needs a shape that doesn't exist, ask before assuming.

| Category | Count | Auth |
|---|---:|---|
| Health | 2 | None |
| Auth (4 actors) | 15 | Public (except refresh/logout) |
| Public (passenger-facing) | 4 | None |
| Passenger | 15 | `REGISTERED_PASSENGER` |
| Operator | 33 | `OPERATOR_OWNER` / `OPERATOR_MANAGER` |
| Admin | 21 | `SUPER_ADMIN` |
| Driver | 13 | `DRIVER` |
| Webhooks | 1 | Razorpay signature |
| **Total** | **108** | |

Full endpoint catalog: `docs/07-API-AND-REALTIME-CONTRACTS.md` v1.3 §1.5.2.

**Note:** `07` v1.3 was published at 102 endpoints. The actual count is now 108 — four endpoints (operator signup, trip cancel, 2 audit async) were added in Phase 12/13 without the doc being updated to v1.4 yet. The four are documented in this handover (§5, §6, §7) even if not in `07`.

### 1.2 WebSocket

**URL:** `ws://localhost:4310/v1/ws` (Socket.io 4.8.1)
**16 events wired.** Event payloads in `shared/04-EVENT-AND-REALTIME-CATALOG.md`.
**4 topics** — subscribe to what your screen needs:

| Topic pattern | Who can subscribe | Events delivered |
|---|---|---|
| `seat:availability:{scheduleId}` | Anyone (no auth for read) | `seat:locked`, `seat:released`, `seat:booked` |
| `trip:live:{tripId}` | Booked passengers + operator + admin | `bus:position`, `trip:started`, `trip:delayed`, `trip:ended`, `trip:cancelled`, `gps_anomaly` |
| `booking:{bookingId}` | Booking owner + admin | `booking:confirmed`, `booking:cancelled`, `booking:expired`, `payment:succeeded`, `refund:requested` |
| `admin:notifications` | `SUPER_ADMIN` only | `operator:applied` |

Handshake protocol (§7 has full detail): connect → send `{ action: 'auth', token: JWT }` within **5 seconds** → receive `auth:ok` → then `{ action: 'subscribe', topics: [...] }`.

### 1.3 Auth model

**4 actor types. Different flows. Do not mix.**

| Actor | Login method | Role in JWT | Frontend |
|---|---|---|---|
| Passenger | OTP via phone OR email | `REGISTERED_PASSENGER` | BusVerse |
| Driver | OTP via phone + device fingerprint | `DRIVER` | Operator App |
| Operator | Email+password OR phone OTP | `OPERATOR_OWNER` / `OPERATOR_MANAGER` | BusCon |
| Admin | Email+password | `SUPER_ADMIN` | (admin panel — out of scope) |

**Tokens:**

- **Access token** — JWT, 15 min TTL (30 min for driver, 5 min for admin)
- **Refresh token** — JWT, 7 day TTL (30 day for driver, 1 day for admin)
- **`jti` claim** on every token — rotated refresh tokens are always different
- **Refresh endpoint** — `POST /v1/{surface}/auth/refresh`, `{ surface }` = `passenger` | `driver` | `operator` | `admin`

**Storage:** `localStorage` for BusVerse/BusCon (web). `expo-secure-store` for Operator App (mobile). Never in a query string or URL.

### 1.4 Payments

**Razorpay test mode.** Real API calls, real webhooks, real refunds. Test cards work.

| Test card | Number | CVV | Expiry |
|---|---|---|---|
| Success | `4111 1111 1111 1111` | any | any future |
| Failure | `4000 0000 0000 0002` | any | any future |
| UPI | `success@razorpay` | — | — |

**Dev shortcut:** `POST /v1/dev/mock-confirm-payment` with `{ paymentId }` simulates the payment.captured webhook. **Guarded by `NODE_ENV !== 'production'`** — only works in dev. Use this to skip the Razorpay checkout during development and testing.

**Production:** real Razorpay checkout window opens, user pays, webhook confirms server-side, client polls `GET /v1/passenger/payments/:id` to detect success.

### 1.5 File uploads

**Two-step flow** for driver KYC docs:

1. `POST /v1/driver/uploads` — request signed URL, receives `{ uploadId, uploadUrl, expiresAt }`
2. `PUT {uploadUrl}` — put file bytes directly to Cloudflare R2 (or mock in dev)
3. `POST /v1/driver/me/documents` — with `{ uploadIds: [...] }` to attach

Same pattern exists at `/v1/operator/uploads` + `/v1/operator/me/documents` for operator KYC.

### 1.6 Mocked services (dev only)

| Service | Behavior | Override |
|---|---|---|
| MSG91 (SMS) | Logs to console, no SMS sent | `MOCK_OTP=true` (default in `.env.example`) |
| SendGrid (email) | Logs to console, no email sent | `MOCK_EMAIL=true` (default) |
| Razorpay | Test mode — real dashboard, test cards only | — |
| R2 | Mock URLs returned if R2 env vars missing | Falls back automatically |

**OTP in dev:** `MOCK_OTP=true` means **any 6-digit code works** — usually use `123456`. Do not build UI that assumes a real SMS arrives.

---

## §2. What's already built (backend — do not modify)

**Do not touch `apps/api/`.** It is:
- 396 tests passing, EXIT CODE 0
- Typecheck clean
- Docker image builds and boots
- Frozen at Phase 13

Your job is `apps/busverse/`, `apps/buscon/`, `apps/operator-app/`. These do not exist yet — you will scaffold them.

**If you find a backend bug:**
1. Document it (screenshot + curl reproduction)
2. Do NOT fix it — the backend is under a separate freeze for a reason (deployment checks pending, docs at v1.3 will be updated to v1.4)
3. Work around it in the frontend
4. Note it in your final handover

---

## §3. What to read before writing anything

**Mandatory (in this order):**

1. **This handover** (§0–§4)
2. **`docs/07-API-AND-REALTIME-CONTRACTS.md` v1.3** — every endpoint's request + response shape + error codes. §4 = passenger, §5 = operator, §6 = admin, §7 = driver, §8 = WebSocket, §9 = error catalog.
3. **`docs/shared/04-EVENT-AND-REALTIME-CATALOG.md` v1.0** — 16 WS event payloads. All have `_v: 1` version field.
4. **`docs/AI-HANDOVER-v7.md` §0–§6** — backend gotchas. §6.1 (Prisma relation naming), §6.25 (webhook raw body), §6.65 (schedule time math) are the ones that leak to the frontend.
5. **Your frontend's UI spec** (see below)

**Your frontend's UI spec:**

| Frontend | Read |
|---|---|
| BusVerse | `docs/busverse/00-OVERVIEW.md` through `05-UI-SPEC.md` |
| BusCon | `docs/buscon/00-OVERVIEW.md` through `06-UI-SPEC.md` |
| Operator App | `docs/buscon/00-OVERVIEW.md` + `docs/buscon/05-UI-SPEC.md` (driver surface is in buscon) |

**If any of those docs are missing:** STOP. Do not invent the design. Ask the user which file to substitute or whether the design is still open.

**Read-only references (do not need to be read upfront):**

- `docs/06-DATABASE-SCHEMA.md` v1.3 — if you need to understand what a field means
- `docs/shared/02-QR-CONTRACT.md` — if you're displaying a QR code
- `docs/shared/03-SEAT-LOCK.md` — if you're debugging seat availability

---

## §4. Non-negotiables

**12 rules. Violating any will cause the app to break in production.**

| # | Rule |
|:---:|---|
| 1 | **Never guess response shapes.** Read `07` v1.3. If a shape isn't there, ask. |
| 2 | **Never hardcode an error message.** Backend returns `{ error: { code, message, details?, requestId } }`. Show `message` but key your logic on `code`. |
| 3 | **Never invent a WS event.** Only 16 exist. See `shared/04`. |
| 4 | **Never store tokens in localStorage for the Operator App.** Use `expo-secure-store`. |
| 5 | **Never subscribe to a WS topic you don't have permission for.** Server closes connection with code 1008. |
| 6 | **Never ignore the 15-minute booking expiry.** PENDING bookings die after 15 min. Show countdown from `expiresAt`. |
| 7 | **Never retry `POST /passenger/payments` with the same `Idempotency-Key` after failure.** Generate a new UUID. Reusing the old one returns the cached failed response — user is stuck. |
| 8 | **Never decode or construct cursor values.** They are opaque base64. Pass `meta.nextCursor` verbatim. |
| 9 | **Never assume a masked field is null.** Absent ≠ null. Operator endpoints omit `phone`/`email` entirely, not set to `null`. Use `'phone' in obj` not `obj.phone === null`. |
| 10 | **Never poll faster than the WS fallback interval.** Booking status: 5s. Live trip: 3s. Anything faster will get rate-limited (429). |
| 11 | **Never assume mock auth in production.** `MOCK_OTP=true` is dev-only. Use real OTP flows that work when the flag is false. |
| 12 | **Never modify `apps/api/`.** Frozen at Phase 13. |

---

## §5. BusVerse — Passenger PWA

**Tech:** Next.js 15 App Router + TypeScript strict + Tailwind CSS 4 + shadcn/ui + TanStack Query v5 + socket.io-client 4.8.1
**Port:** 3410
**Path:** `apps/busverse/`

### 5.1 Reading order

1. `docs/busverse/00-OVERVIEW.md` — product context
2. `docs/busverse/05-UI-SPEC.md` — screen designs
3. `07` v1.3 §4 (passenger endpoints)
4. This section

### 5.2 Auth flow

**First-time user (signup):**

```
1. Phone screen → POST /v1/passenger/auth/otp/request
   { phone: "+919876543210", intent: "SIGNUP" }
   Response: 200 { expiresInSeconds: 600 }
   Show OTP input, disable resend for 60s

2. OTP screen → POST /v1/passenger/auth/otp/verify
   { phone: "+919876543210", otp: "123456" }
   Response: 200 {
     accessToken, refreshToken, expiresAt,
     user: { id, phone, email, emailVerified, name }
   }
   Store tokens. Redirect to home.

3. Duplicate phone → 409 PHONE_ALREADY_REGISTERED
   Prompt user to log in instead.
```

**Returning user (login):**

Same endpoint, `intent: "LOGIN"`. If no user exists, backend creates one — that's the same as signup. Do not gate on `intent` for user creation; use it only for the duplicate check.

**Email login:**

Supported for **login only**, not signup. Same endpoints with `{ email }` instead of `{ phone }`. **Signup with email returns 400 EMAIL_SIGNUP_NOT_SUPPORTED** — phone is the anchor identity.

**Refresh:**

Every API call that gets 401 → call `POST /v1/passenger/auth/refresh` with `{ refreshToken }` (or cookie). New tokens returned. Retry the original call. On refresh failure → logout + redirect to login.

### 5.3 Key screens (build in this order)

**1. Home / Search**

- Route: `/`
- Form: origin city autocomplete, destination city autocomplete, date picker, "Search" button
- API: `GET /v1/public/cities?q={query}&limit=50` (autocomplete)
- On submit: `GET /v1/public/search?originCityId={uuid}&destinationCityId={uuid}&date=YYYY-MM-DD`
- Response: array of schedules
- Show: operator name, bus type, departure time, arrival time, duration, fare, available seats
- Empty state: "No buses on this route for {date}"

**2. Seat selection**

- Route: `/schedule/{scheduleId}`
- API: `GET /v1/public/schedules/{id}` for detail, `GET /v1/passenger/schedules/{id}/availability` for seat map
- Render: bus layout grid (rows × columns), aisle cells skipped
- Seat states: `AVAILABLE` (green), `LOCKED` (gray), `BOOKED` (dark gray), `MINE` (blue), `BLOCKED` (red)
- **WS subscribe** to `seat:availability:{scheduleId}` — update in real time
- On seat click:
  - `POST /v1/passenger/seat-locks` with `{ scheduleId, seatId }`
  - Response: `{ lockId, expiresAt, remainingSeconds: 300 }`
  - Show countdown timer (5 min)
  - 409 `SEAT_LOCKED` → toast "Seat was taken", refresh availability
  - 409 `SEAT_ALREADY_BOOKED` → same treatment

**3. Booking / passenger details**

- Route: `/book/{scheduleId}/{lockIds}`
- Form: boarding stand dropdown, dropping stand dropdown, per-seat passenger info (name, age, gender)
- Stands: `GET /v1/public/cities/{cityId}/stands` (or reuse schedule detail's route stands)
- On submit: `POST /v1/passenger/bookings`
- Body: `{ lockId, boardingStandId, droppingStandId, passengers: [{ seatId, name, age, gender }] }`
- Response: `{ bookingId, status: "PENDING", expiresAt, totalFarePaise }`
- **Store `expiresAt` and start a countdown. 15 minutes.** If it hits zero, booking is dead — force redirect to seat selection.

**4. Payment**

- Route: `/pay/{bookingId}`
- API: `POST /v1/passenger/payments` with **fresh `Idempotency-Key` UUID** in header
- Body: `{ bookingId, method: "UPI" | "CARD" | ... }`
- Response: `{ paymentId, checkoutUrl, status: "INITIATED" }`
- Open `checkoutUrl` in a new window (Razorpay checkout)
- Meanwhile: poll `GET /v1/passenger/payments/{id}` every 2s
- Also **WS subscribe** to `booking:{bookingId}` — listen for `payment:succeeded` + `booking:confirmed`
- Both signals arrive → redirect to ticket
- **Dev shortcut:** `POST /v1/dev/mock-confirm-payment` with `{ paymentId }` — skip the Razorpay flow
- **15-min timer still running.** If it expires: `400 PAYMENT_NOT_ALLOWED`, redirect to search

**5. Ticket / My Trips**

- Route: `/bookings` (list), `/bookings/{id}` (detail)
- API: `GET /v1/passenger/bookings?limit=20` (cursor paginated)
- Detail: `GET /v1/passenger/bookings/{id}` + `GET /v1/passenger/bookings/{id}/ticket`
- Ticket response: `{ ticketId, bookingId, qrPayload, status, issuedAt }`
- **`qrPayload` is a wire format string `v1:{base64}:{base64}`** — render it as a QR code. Do NOT decode it client-side. Use a QR library (e.g. `qrcode.react`).
- **WS subscribe** to `booking:{bookingId}` — listen for `booking:cancelled`, `refund:requested`

**6. Live tracking**

- Route: `/trips/{tripId}/live`
- API: `GET /v1/passenger/trips/{tripId}/live` (initial snapshot)
- **WS subscribe** to `trip:live:{tripId}` — updates on `bus:position` every 3s (server throttled)
- Render: map with bus marker, ETA list per stop
- Fallback: poll every 3s if WS fails
- Also subscribe for `trip:delayed` + `trip:ended` + `trip:cancelled`

**7. Cancel booking**

- On booking detail: "Cancel" button
- First: `GET /v1/passenger/bookings/{id}/refund-preview` — show tier + refund amount + deadline
- Confirm: `POST /v1/passenger/bookings/{id}/cancel`
- Response: `{ status: "CANCELLED", refund: { refundId, tier, amountPaise, status: "INITIATED" } }`
- Refund is **INITIATED** not PROCESSED — takes days. Show "Refund will appear in 3-5 business days"

### 5.4 WS connection (BusVerse)

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function connect(accessToken: string) {
  socket = io('http://localhost:4310', {
    path: '/v1/ws',
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 16000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    socket.emit('message', { action: 'auth', token: accessToken });
  });

  socket.on('auth:ok', ({ role }) => {
    // Connected. Now subscribe to topics.
  });

  socket.on('auth:expiring', () => {
    // Access token 60s from expiry — call refresh, then auth:refresh
    socket.emit('message', { action: 'auth:refresh', refreshToken });
  });

  socket.on('auth:refreshed', ({ accessToken, refreshToken, expiresAt }) => {
    // Store new tokens
  });

  socket.on('error', (err) => {
    if (err.code === 4001) { /* token invalid/expired — logout */ }
  });

  socket.on('disconnect', (reason) => {
    // Server closes with 4001 (auth fail), 4003 (auth timeout), 1008 (forbidden)
    if (reason === 'io server disconnect') {
      // Server forced disconnect — reconnect with fresh token
    }
  });
}

function subscribe(topics: string[]) {
  socket?.emit('message', { action: 'subscribe', topics });
  // Server responds with { event: 'subscribed', topics } or { event: 'error', code: 1008 }
}

function unsubscribe(topics: string[]) {
  socket?.emit('message', { action: 'unsubscribe', topics });
}
```

**BusVerse subscribes:**

- Seat availability page → `seat:availability:{scheduleId}`
- Payment page → `booking:{bookingId}`
- Ticket page → `booking:{bookingId}`
- Live tracking page → `trip:live:{tripId}`

**Unsubscribe when leaving the page.** The server tracks per-socket subscriptions.

### 5.5 File structure (suggested)

```
apps/busverse/
├── app/
│   ├── layout.tsx            (root — providers: QueryClient, AuthProvider, WSProvider)
│   ├── page.tsx              (search home)
│   ├── schedule/[scheduleId]/page.tsx
│   ├── book/[scheduleId]/page.tsx
│   ├── pay/[bookingId]/page.tsx
│   ├── bookings/page.tsx
│   ├── bookings/[id]/page.tsx
│   ├── trips/[tripId]/live/page.tsx
│   ├── auth/
│   │   ├── phone/page.tsx
│   │   └── otp/page.tsx
│   └── api/                  (Next.js route handlers for cookie-based auth if used)
├── components/
│   ├── ui/                   (shadcn primitives)
│   ├── SearchForm.tsx
│   ├── ScheduleCard.tsx
│   ├── SeatMap.tsx
│   ├── PassengerForm.tsx
│   ├── CountdownTimer.tsx
│   ├── QRDisplay.tsx
│   ├── LiveMap.tsx
│   └── CancelBookingDialog.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts         (fetch wrapper: base URL, auth header, 401 refresh, error handling)
│   │   ├── auth.ts           (OTP request/verify, refresh, logout)
│   │   ├── cities.ts         (autocomplete, stands)
│   │   ├── schedules.ts      (search, detail, availability)
│   │   ├── bookings.ts       (create, list, detail, cancel, refund preview)
│   │   ├── payments.ts       (initiate, status, mock-confirm)
│   │   ├── tickets.ts        (get ticket)
│   │   └── trips.ts          (live status, map)
│   ├── ws/
│   │   ├── socket.ts         (socket singleton + reconnect + auth refresh)
│   │   └── useWsEvent.ts     (React hook: subscribe to event, cleanup)
│   ├── auth/
│   │   └── AuthProvider.tsx  (token storage, login/logout, auto-refresh)
│   ├── errors.ts             (map error codes → user-facing messages)
│   └── formatters.ts         (money, dates, durations)
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

### 5.6 Build order

**Milestone 1 — Skeleton (2-3h)**

- Next.js app + Tailwind + shadcn/ui
- Auth pages (phone → OTP → home)
- AuthProvider with token storage + auto-refresh
- API client with 401 handling

**Milestone 2 — Search + seat selection (3-4h)**

- Home with city autocomplete
- Search results
- Schedule detail
- Seat map (static — no WS yet)

**Milestone 3 — Booking flow (3-4h)**

- Seat lock (with countdown)
- Passenger form
- Booking creation
- Payment initiation (Razorpay window or mock)

**Milestone 4 — Real-time (2-3h)**

- WS connection + auth
- Seat availability subscription (live updates)
- Booking status subscription

**Milestone 5 — Ticket + tracking (2-3h)**

- QR display
- Live trip tracking (WS + polling fallback)
- Cancel flow with refund preview

**Milestone 6 — Polish (2-3h)**

- Error states
- Loading skeletons
- Empty states
- Mobile responsive
- Accessibility (keyboard nav, ARIA)

**Total: ~15-20 hours**

---

## §6. BusCon — Operator Web

**Tech:** Next.js 15 App Router + TypeScript strict + Tailwind CSS 4 + shadcn/ui + TanStack Query v5 + TanStack Table v8 + socket.io-client 4.8.1
**Port:** 3411
**Path:** `apps/buscon/`

### 6.1 Reading order

1. `docs/buscon/00-OVERVIEW.md` — product context
2. `docs/buscon/06-UI-SPEC.md` — dashboard + management screens
3. `07` v1.3 §5 (operator endpoints)
4. This section

### 6.2 Auth flow

**Email + password (primary):**

```
1. Login screen → POST /v1/operator/auth/login
   { email: "owner@sharmatravels.com", password: "..." }
   Response: 200 { accessToken, refreshToken, expiresAt, user: { id, operatorId, ... } }
   Store tokens.

2. Wrong password → 401 INVALID_CREDENTIALS

3. Email not verified → 403 EMAIL_NOT_VERIFIED
   Prompt to resend verification (out of scope for v1)
```

**Phone OTP (fallback):**

Same as passenger flow, but at `/v1/operator/auth/otp/*`. Use only if user doesn't have email access.

**Signup (new operator):**

```
POST /v1/operator/auth/signup  (Phase 13 endpoint — not yet in 07 v1.3)
{
  companyName: "Sharma Travels Pvt Ltd",
  gstin: "09AAACH7409R1ZZ",
  pan: "AAACH7409R",
  email: "founder@sharmatravels.com",
  phone: "+919876543210",
  password: "SecurePass123!"
}
Response: 201 {
  operatorId, userId, status: "APPLIED",
  message: "Application submitted..."
}
```

GSTIN + PAN formats are validated. After signup, operator is `status: "APPLIED"` — needs admin approval before they can create buses/routes. Show "pending approval" screen until admin approves.

**Role gating:**

- `OPERATOR_OWNER` — full access (profile edit, manager invite, everything)
- `OPERATOR_MANAGER` — cannot edit profile, cannot invite managers, everything else allowed

Check role from JWT (decode `role` claim) — hide/disable UI, but **backend enforces the real check**. Never rely on client-side role gating for security.

### 6.3 Key screens (build in this order)

**1. Dashboard**

- Route: `/`
- API: `GET /v1/operator/dashboard`
- Response: today's bookings/revenue/passengers, active trips, upcoming trips, pending approvals, driver summary
- Show as cards + mini charts (Recharts)

**2. Buses**

- Route: `/buses` (list), `/buses/new`, `/buses/[id]`
- API: `GET /v1/operator/buses?limit=20` (cursor), `POST /v1/operator/buses`, `PATCH /v1/operator/buses/{id}`, `DELETE`
- **Create bus needs `busType` + `amenities`.** Values: `SEATER | AC_SEATER | SLEEPER | AC_SLEEPER | SEMI_SLEEPER`
- Layout editor: `PUT /v1/operator/buses/{id}/layout` with `{ rowsCount, columnsCount, seats[] }`
  - Live preview: grid of seats, aisles skipped, per-seat `isFemaleOnly` toggle
  - Validation: `seats.length` must equal `capacity`
- Bus approval: `approvalStatus: PENDING` until admin approves

**3. Routes**

- Route: `/routes` (list), `/routes/new`, `/routes/[id]`
- API: `GET /v1/operator/routes`, `POST`, `PATCH`, `DELETE`
- **Route needs stands** — `POST /v1/operator/routes/{id}/stands` per stand, with `{ standId, sequence, distanceFromPrevKm, durationFromPrevMin }`
- Stand picker: `GET /v1/public/cities/{cityId}/stands`
- Route approval: `approvalStatus: PENDING`

**4. Schedules**

- Route: `/schedules` (list), `/schedules/new`, `/schedules/[id]`
- API: `GET /v1/operator/schedules`, `POST`, `PATCH`, `POST /publish`
- **Schedule needs: `busId, routeId, departureTime, arrivalTime, fareAmountPaise`**
- Validation: `arrivalTime > departureTime` (`chk_schedules_times`)
- **Publish** action: `POST /v1/operator/schedules/{id}/publish`
  - Can fail with `409 SCHEDULE_CONFLICT` — show conflicting schedule
  - Response detail: `{ conflictingScheduleId, departureTime, arrivalTime }` in `error.details`
- Only `PUBLISHED` schedules appear in search

**5. Drivers**

- Route: `/drivers` (list), `/drivers/[id]`
- API: `GET /v1/operator/drivers?limit=20`, `POST /v1/operator/drivers/invite`, `DELETE /v1/operator/drivers/{id}`
- Invite: `{ phone, licenseNumber, name }` — sends SMS (mocked in dev)
- **Cannot delete driver on duty** → `409 DRIVER_ON_DUTY`
- Show: name, phone, KYC status, on-duty status
- **This is the one place `phone` is NOT masked** — operator sees own fleet's phone

**6. Bookings view**

- Route: `/bookings` (list), `/bookings/[id]`
- API: `GET /v1/operator/bookings?limit=20&status=&from=&to=`, `GET /v1/operator/bookings/{id}`
- **PII is masked** — no `phone`, no `email`, no `idNumber` on passenger objects. Absent, not null.
- Show: booking reference, status, passengers (name + seat + age + gender), total, confirmedAt

**7. Revenue**

- Route: `/revenue`
- API: `GET /v1/operator/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month`
- `GET /v1/operator/revenue/daily` — last 7 days trend (chart-ready)
- Show: total, refunds, net, per-bucket breakdown

**8. Settlements**

- Route: `/settlements`
- API: `GET /v1/operator/settlements`
- **Returns empty array until Phase 5 (payments settlement).** Show empty state with note from `meta.note`

**9. Operators + managers**

- Route: `/settings/managers` (owner only)
- API: `GET /v1/operator/me/managers` (owner only)
- Manager invitation is not yet implemented — hide the button with "Coming soon" tooltip

**10. Real-time notifications**

- Global: `POST /v1/admin/audit-logs/export-async` isn't needed for BusCon
- Do NOT subscribe to `admin:notifications` — that's SUPER_ADMIN only
- Subscribe to `booking:{bookingId}` on booking detail page (for live updates)

### 6.4 BusCon WS usage

**BusCon uses WS sparingly:**

- Booking detail page → `booking:{bookingId}` (payment:succeeded, booking:cancelled)
- Dashboard → no WS (poll every 30s or manual refresh)
- Trip tracking (if implemented) → `trip:live:{tripId}`

**Do NOT subscribe to:**

- `admin:notifications` — SUPER_ADMIN only, connection will close 1008
- `seat:availability:*` — not relevant to operator UI

### 6.5 File structure (suggested)

```
apps/buscon/
├── app/
│   ├── layout.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx        (sidebar + top bar, auth-gated)
│   │   ├── page.tsx          (dashboard)
│   │   ├── buses/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── routes/...
│   │   ├── schedules/...
│   │   ├── drivers/...
│   │   ├── bookings/...
│   │   ├── revenue/page.tsx
│   │   ├── settlements/page.tsx
│   │   └── settings/managers/page.tsx
├── components/
│   ├── ui/                   (shadcn)
│   ├── data-table.tsx        (TanStack Table wrapper)
│   ├── StatCard.tsx
│   ├── LayoutEditor.tsx      (seat grid editor)
│   ├── RouteStandBuilder.tsx
│   └── SchedulePublishDialog.tsx
├── lib/
│   ├── api/                  (one file per resource)
│   ├── ws/
│   ├── auth/
│   ├── errors.ts
│   └── formatters.ts
├── package.json
└── ...
```

### 6.6 Build order

**Milestone 1 — Auth + dashboard shell (3h)**

- Login + signup
- AuthProvider + role-based sidebar
- Dashboard with stats cards (no charts yet)

**Milestone 2 — Buses + layouts (4h)**

- Buses list (TanStack Table)
- Create bus with `busType` + `amenities`
- Layout editor (grid + validation)

**Milestone 3 — Routes + schedules (4h)**

- Routes list + create
- Stand builder (ordered list with distance/duration)
- Schedules list + create
- Publish flow (handle SCHEDULE_CONFLICT)

**Milestone 4 — Drivers + bookings (3h)**

- Drivers list + invite
- Bookings list (masked PII) + detail
- Filters: status, date range

**Milestone 5 — Revenue + settlements (2h)**

- Revenue with charts (Recharts)
- 7-day trend
- Settlements empty state

**Milestone 6 — Polish (2h)**

- Loading skeletons
- Error boundaries
- Form validation (react-hook-form + zod)
- Responsive layout

**Total: ~18-20 hours**

---

## §7. Operator App — Driver Mobile

**Tech:** Expo SDK 51+ + React Navigation 6 + TanStack Query v5 + expo-secure-store + expo-location + expo-camera + socket.io-client 4.8.1
**Port:** 8281 (Expo dev server)
**Path:** `apps/operator-app/`

### 7.1 Reading order

1. `docs/buscon/00-OVERVIEW.md` — driver surface is in buscon
2. `docs/buscon/05-UI-SPEC.md` — mobile UI
3. `docs/shared/02-QR-CONTRACT.md` — QR format
4. `07` v1.3 §7 (driver endpoints)
5. This section

### 7.2 Auth flow

**OTP + device fingerprint:**

```
1. Phone screen → POST /v1/driver/auth/otp/request
   { phone: "+919876543210" }
   Response: 200 { expiresInSeconds: 600 }

2. OTP screen → POST /v1/driver/auth/otp/verify
   {
     phone: "+919876543210",
     otp: "123456",
     deviceFingerprint: "<sha256 of device info>"  // REQUIRED
   }
   Response: 200 { accessToken, refreshToken, expiresAt, user }

3. Device fingerprint:
   - Use expo-application + expo-device to get stable device ID
   - Hash it: sha256(deviceId + appVersion)
   - Send on EVERY OTP verify
   - Server enforces single-device binding — old sessions are revoked

4. Driver KYC gate:
   - kycStatus must be VERIFIED or ACTIVE to log in
   - NOT_VERIFIED or BLOCKED → 403 with reason
```

**Single-device binding:**

If `DEMO_MULTI_DEVICE_DRIVER=true` env var on backend, multiple devices allowed (demo mode). Default is single-device — logging in on device B logs out device A.

**Where to store tokens:** `expo-secure-store`. NOT AsyncStorage (not encrypted).

### 7.3 Key screens (build in this order)

**1. Login (phone → OTP)**

- Standard 2-screen flow
- Ask for location permission upfront (before first trip)
- Ask for camera permission (before first scan)

**2. Today's trips**

- Route: `Trips` tab
- API: `GET /v1/driver/trips` (today's assigned trips)
- Show: route, departure time, status badge, boarded/confirmed counts
- Empty state: "No trips today"

**3. Trip detail + start**

- Route: `Trips/{id}`
- API: `GET /v1/driver/trips/{id}`, `POST /v1/driver/trips/{id}/start`
- Show: schedule, bus, boarding stands
- **Start trip:**
  - Only works within ±2h of departure time
  - Response: `{ tripId, status: "IN_PROGRESS", startedAt }`
  - Errors: `TRIP_OUTSIDE_WINDOW`, `BUS_NOT_APPROVED`, `BUS_LAYOUT_MISSING`, `DRIVER_NOT_VERIFIED`

**4. GPS streaming (critical)**

- When trip is `IN_PROGRESS`, start GPS streaming
- API: `POST /v1/driver/trips/{tripId}/gps` every 5 seconds
- Body: `{ lat, lng, speedKmh, accuracyM, recordedAt }`
- Use `expo-location` `watchPositionAsync` with:
  - `timeInterval: 5000`
  - `distanceInterval: 10` (or 0 for pure time-based)
  - `accuracy: Location.Accuracy.Balanced`
- **Server has provenance checks** — sends 400 `INVALID_COORDINATES` / `INVALID_ACCURACY` / `TELEPORT_DETECTED` if data looks suspicious
  - 3 consecutive failures → `gps_anomaly` WS event fires (admin sees it)
  - **Handle 400 gracefully** — do not retry, log locally, wait for next sample
- **The GPS loop is the hardest part.** Test it while walking around with the phone before the demo.

**5. Scan QR (offline-capable)**

- Route: `Trips/{id}/scan` (camera view)
- **Offline-first:**
  1. Fetch `GET /v1/driver/config` on login — contains `qrPublicKey` (Ed25519 public key)
  2. Cache the public key locally (secure-store)
  3. When scanning offline: verify signature locally
  4. Queue the scan result
  5. When network returns: `POST /v1/driver/trips/{tripId}/scan` with `{ qrPayload, scannedAt }`
- **Wire format:** `v1:{base64_payload}:{base64_signature}`
  - Split on `:`. Verify signature with cached public key using `@noble/ed25519`.
  - Payload JSON: `{ ticketId, bookingId, scheduleId, primarySeatId, ..., _v }`
- **Server re-verifies on upload** — client-side verification is optimistic only
- **Manual entry fallback:** `{ manualEntry: true, bookingReference, primaryPassengerName, scannedAt }` — for passengers who can't show QR
- Response: `{ result: "VALID" | "DUPLICATE" | ..., ticketId, bookingId, primaryPassengerName, seatLabels, passengerCount }`

**6. Manifest**

- Route: `Trips/{id}/manifest`
- API: `GET /v1/driver/trips/{id}/manifest`
- Show: passengers grouped by boarding stand, name + seat + boarded status
- **Masked PII:** no phone, no email — only name + seat

**7. Report delay**

- Route: `Trips/{id}/delay`
- API: `POST /v1/driver/trips/{id}/delay` with `{ reason, delayMinutes, notes? }`
- Reasons: `TRAFFIC | WEATHER | BREAKDOWN | ACCIDENT | ROAD_CLOSURE | OTHER`
- `delayMinutes`: 1-180

**8. End trip**

- Route: `Trips/{id}/end`
- API: `POST /v1/driver/trips/{id}/end`
- Response: `{ tripId, status: "COMPLETED", durationMinutes, distanceKm, boardedCount, confirmedCount }`
- **Stop GPS streaming** when trip ends
- Show trip summary screen

**9. Trip history**

- Route: `History` tab
- API: `GET /v1/driver/trips/history?limit=20&from=&to=`
- Cursor paginated

**10. Driver profile**

- Route: `Profile` tab
- API: `GET /v1/driver/me`
- Show: name, license, KYC status, on-duty status, operator
- **Document upload:** `POST /v1/driver/uploads` → PUT to R2 → `POST /v1/driver/me/documents`

### 7.4 WS usage (Operator App)

**Driver subscribes to `trip:live:{tripId}`** on active trip screen:

- Listens for `trip:delayed` (confirmation of reported delay)
- Listens for `gps_anomaly` (warning: "Your GPS is showing anomalies, check position")

**No WS needed for most screens** — driver is often offline or on cellular with spotty signal. Prefer REST polling.

**Offline-tolerant pattern:**

```typescript
// Queue actions when offline
const queue = [];

async function scanOrQueue(payload) {
  if (await isOnline()) {
    return await api.scan(payload);
  }
  const localResult = verifyLocally(payload);  // Ed25519 check
  queue.push({ payload, localResult, scannedAt: new Date().toISOString() });
  await saveQueue(queue);
  return localResult;
}

// Sync on reconnect
async function syncQueue() {
  for (const item of queue) {
    try {
      await api.scan(item.payload);
      queue.shift();
      await saveQueue(queue);
    } catch (err) {
      if (err.status === 400) {
        // Server rejected — drop from queue, log
        queue.shift();
      } else {
        // Network error — retry later
        break;
      }
    }
  }
}
```

### 7.5 File structure (suggested)

```
apps/operator-app/
├── App.tsx                   (React Navigation root)
├── app.json                  (Expo config)
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── PhoneScreen.tsx
│   │   │   └── OtpScreen.tsx
│   │   ├── trips/
│   │   │   ├── TripsListScreen.tsx
│   │   │   ├── TripDetailScreen.tsx
│   │   │   ├── ScanScreen.tsx
│   │   │   ├── ManifestScreen.tsx
│   │   │   ├── DelayScreen.tsx
│   │   │   └── TripEndScreen.tsx
│   │   ├── history/
│   │   │   └── HistoryScreen.tsx
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   ├── components/
│   │   ├── TripCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── CountdownTimer.tsx
│   │   └── QRScanner.tsx
│   ├── lib/
│   │   ├── api/
│   │   ├── ws/
│   │   ├── auth/
│   │   ├── gps/
│   │   │   ├── streamer.ts       (watchPositionAsync loop)
│   │   │   └── provenance.ts     (client-side sanity checks)
│   │   ├── qr/
│   │   │   ├── verify.ts         (Ed25519 local verification)
│   │   │   └── queue.ts          (offline scan queue)
│   │   └── secure-store.ts
│   ├── navigation/
│   │   └── RootNavigator.tsx
│   └── hooks/
│       ├── useAuth.ts
│       ├── useTrip.ts
│       └── useGpsStreamer.ts
├── package.json
└── tsconfig.json
```

### 7.6 Build order

**Milestone 1 — Auth + trips list (3h)**

- Expo app + navigation
- Login (phone → OTP with device fingerprint)
- Trips list (today)

**Milestone 2 — Trip lifecycle (3h)**

- Trip detail
- Start trip (with time-window gate)
- End trip
- Delay report

**Milestone 3 — GPS streaming (4h)**

- `expo-location` setup
- 5-second POST loop
- Provenance error handling
- Background location (test on real device)

**Milestone 4 — QR scan (5h)**

- Camera screen
- Ed25519 local verify
- Offline queue
- Manual entry fallback
- Sync on reconnect

**Milestone 5 — Manifest + history (2h)**

**Milestone 6 — Polish (2h)**

- Permissions flows
- Offline indicators
- Error toasts
- Loading states

**Total: ~19-22 hours** (QR scan is deceptively complex)

---

## §8. Gotchas — things that will bite you

**Frontend-specific. Read all of these.**

### 8.1 Response envelope

**Every success response:** `{ data: <payload>, meta?: { requestId, durationMs, nextCursor? } }`
**Every error response:** `{ error: { code, message, details?, requestId } }`

Do NOT expect a bare object. Do NOT unwrap in one place and not the other.

**Wrong:** `const booking = await fetch(...).json()` → `booking.bookingId` is `undefined`
**Right:** `const { data } = await fetch(...).json()` → `data.bookingId`

### 8.2 Error codes are stable — messages can change

**Key your logic on `error.code`, not `error.message`.**

```typescript
// Wrong
if (err.message === "This seat is currently locked") { ... }

// Right
if (err.code === 'SEAT_LOCKED') { ... }
```

Message strings may be reworded by backend. Codes are in `07` v1.3 §9.2 (50 codes).

### 8.3 401 vs 403

- **401 UNAUTHORIZED** — no token, expired token, invalid token. **Refresh the token or logout.**
- **403 FORBIDDEN** — valid token, but wrong role. **Do NOT try to refresh. Show error.**

If you refresh on 403, you'll loop forever.

### 8.4 15-minute booking expiry

**A PENDING booking dies after 15 minutes.** Not 15 minutes from payment initiation — 15 minutes from booking creation.

**Right pattern:**

```typescript
const { bookingId, status, expiresAt } = await createBooking(...);
// expiresAt is ISO string. Server time.
// Show countdown: `Math.max(0, new Date(expiresAt).getTime() - Date.now())`

// Poll or WS for status
// If countdown hits 0 and status is still PENDING:
//   - Client shows "Booking expired"
//   - Server transitions to EXPIRED via cron
//   - Do NOT attempt payment after expiry — 400 PAYMENT_NOT_ALLOWED
```

**Store `expiresAt` from the server response. Do NOT compute it client-side.** Server uses `created_at` from Postgres, not client clock.

### 8.5 Razorpay checkout flow

`POST /passenger/payments` returns `checkoutUrl`. Options:

**Option A — Redirect (simplest):** `window.location.href = checkoutUrl` — user pays, Razorpay redirects back. Add a `/payment/return` route.

**Option B — Embedded (recommended):** Use Razorpay's JS SDK:

```typescript
const script = document.createElement('script');
script.src = 'https://checkout.razorpay.com/v1/checkout.js';
document.body.appendChild(script);

await new Promise(r => script.onload = r);

const rzp = new (window as any).Razorpay({
  key: 'rzp_test_...',        // from backend env
  order_id: orderId,           // from payment response
  handler: function (response) {
    // Payment succeeded client-side. But this is NOT final.
    // Wait for webhook or poll GET /passenger/payments/:id
  },
});
rzp.open();
```

**Never trust the client handler as final.** The webhook is authoritative. Poll `GET /passenger/payments/:id` or listen on WS `booking:{bookingId}` for `payment:succeeded`.

### 8.6 Idempotency-Key on payments

Every `POST /passenger/payments` **must** include `Idempotency-Key: <fresh UUID>` header.

```typescript
const idempotencyKey = crypto.randomUUID();
const payment = await api.post('/passenger/payments', body, {
  headers: { 'Idempotency-Key': idempotencyKey }
});
```

**If payment fails and user retries:** generate **NEW** UUID. Reusing old key returns cached failure.

**If the same request is retried due to network blip:** reuse the SAME key. That's the point — dedup transient retries.

**Distinguish between "network retry" (reuse key) and "user retry after failure" (new key).**

### 8.7 Cursor pagination

```typescript
let cursor: string | null = null;
const allItems: Booking[] = [];

do {
  const url = `/passenger/bookings?limit=20${cursor ? `&cursor=${cursor}` : ''}`;
  const { data, meta } = await api.get(url);
  allItems.push(...data);
  cursor = meta.nextCursor;   // opaque base64, do not decode
} while (cursor);
```

**Do NOT `JSON.parse(atob(cursor))`.** The format may change. Treat as opaque string.

### 8.8 WS reconnection

**Access token expires in 15 min but the socket lives on.** The server handles this:

1. Server sends `auth:expiring` at exp−60s
2. Client calls `POST /auth/refresh` (REST), gets new tokens
3. Client sends `{ action: 'auth:refresh', refreshToken: <new_refresh_token> }` over WS
4. Server responds `auth:refreshed` — socket continues

**If you miss the window:** server closes with code `4001` (TOKEN_EXPIRED). Reconnect with fresh token.

**Reconnection backoff:**

```
1s → 2s → 4s → 8s → 16s (max 5 attempts)
If all fail → switch to polling
Poll every 3s (live trip) or 5s (booking status)
Retry WS every 60s in background
```

**5 close codes to handle:**

| Code | Meaning | Action |
|---|---|---|
| 4001 | Invalid or expired token | Refresh, reconnect |
| 4003 | No auth sent within 5s of connect | Send auth immediately |
| 1008 | Forbidden topic | Do not subscribe to that topic |
| 1000 | Normal close | Respect — do not reconnect |
| 1006 | Abnormal (network) | Reconnect with backoff |

### 8.9 Absent vs null in PII

**Operator endpoints:** passenger `phone`/`email`/`idNumber` are **absent from the JSON object entirely**, not set to `null`.

```typescript
// Wrong — always false, even when absent
if (passenger.phone === null) { ... }

// Right
if (!('phone' in passenger)) { ... }

// Also right
if (passenger.phone === undefined) { ... }
```

**Use `'phone' in obj` or `obj.phone === undefined`.** `=== null` is wrong.

### 8.10 Mocked services in dev

- **OTP:** `MOCK_OTP=true` → any 6-digit code works. Show "DEV: use 123456" hint in dev UI.
- **Email:** `MOCK_EMAIL=true` → no email sent, verification links logged to backend console.
- **Payment:** use `POST /v1/dev/mock-confirm-payment` to skip Razorpay entirely.

**Do NOT rely on mocks in production.** Read `process.env.NODE_ENV` or a `NEXT_PUBLIC_MOCK_MODE` flag.

### 8.11 WS auth handshake timing

**Server closes at 5s if no auth message arrives.** Do not delay on app startup. Send `auth` immediately after `connect`.

```typescript
socket.on('connect', () => {
  socket.emit('message', { action: 'auth', token: accessToken });
});
```

If your token is not ready on connect, **do not connect yet**. Wait until token exists.

### 8.12 Seat availability is live

**Polling `GET /passenger/schedules/{id}/availability` every second is wrong.** It's rate-limited (429 after 300/min).

**Right pattern:**

1. Initial: `GET /passenger/schedules/{id}/availability` (one snapshot)
2. WS: subscribe to `seat:availability:{scheduleId}`
3. Apply deltas from events (`seat:locked`, `seat:released`, `seat:booked`) to local state
4. On WS failure: fall back to polling every 3s
5. On page refocus (tab visibility API): fetch a fresh snapshot to catch up

### 8.13 CORS for local development

Backend has `CORS_ALLOWED_ORIGINS` env var. Defaults include `http://localhost:3000,http://localhost:3001,http://localhost:8081`.

**For ports 3410/3411/8281, you must add them to the backend's CORS_ALLOWED_ORIGINS OR use a proxy.**

Options:

1. **Modify `apps/api/.env`:** add `http://localhost:3410,http://localhost:3411` to `CORS_ALLOWED_ORIGINS`. Restart backend.
2. **Use a dev proxy in Next.js:** `next.config.ts` `rewrites()` — proxy `/api/*` to `http://localhost:4310/v1/*`. Avoids CORS entirely.

**Recommended:** use Next.js rewrites. No backend changes, no env var drift.

### 8.14 Time zones

**All timestamps are ISO 8601 UTC with `.000Z` suffix.** Client must convert to IST for display.

```typescript
function formatIST(isoString: string): string {
  return new Date(isoString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
```

**Never assume local device time is IST.** Users could be traveling. Server anchors all seed data + business logic to IST.

### 8.15 Money formatting

**All amounts are `{ amountPaise, currency }` or just `amountPaise: number`.** Convert to rupees for display:

```typescript
function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(paise / 100);
}
```

Never multiply by 100 on the client when sending — **backend expects paise, not rupees**.

---

## §9. Environment setup

### 9.1 Start the backend first

```powershell
cd D:\Bus-booking-proj2\BUS_project
docker compose up -d                     # Postgres 7542 + Redis 7543
cd apps\api
pnpm dev                                  # API on 4310
```

Verify: `curl http://localhost:4310/v1/health` → `{"status":"ok"}`

**If backend won't start:** `docs/AI-HANDOVER-v7.md` §8 has full troubleshooting.

### 9.2 Env vars for each frontend

**BusVerse (`apps/busverse/.env.local`):**

```env
NEXT_PUBLIC_API_BASE=http://localhost:4310/v1
NEXT_PUBLIC_WS_URL=http://localhost:4310
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
NEXT_PUBLIC_DEV_MODE=true
```

**BusCon (`apps/buscon/.env.local`):**

```env
NEXT_PUBLIC_API_BASE=http://localhost:4310/v1
NEXT_PUBLIC_WS_URL=http://localhost:4310
NEXT_PUBLIC_DEV_MODE=true
```

**Operator App (`apps/operator-app/.env`):**

```env
EXPO_PUBLIC_API_BASE=http://192.168.1.100:4310/v1  # your LAN IP, not localhost
EXPO_PUBLIC_WS_URL=http://192.168.1.100:4310
EXPO_PUBLIC_DEV_MODE=true
```

**Mobile needs LAN IP, not localhost.** `localhost` on a phone refers to the phone, not your laptop.

### 9.3 Dev commands

```powershell
# BusVerse
cd apps\busverse
pnpm dev              # starts on :3410

# BusCon
cd apps\buscon
pnpm dev              # starts on :3411

# Operator App
cd apps\operator-app
pnpm start            # Expo dev server on :8281
                      # scan QR with Expo Go on phone
```

---

## §10. Common mistakes (read before you code)

| Mistake | Fix |
|---|---|
| Unwrapping `data` in one place but not another | Always `const { data } = response.json()`. One helper in `lib/api/client.ts`. |
| Keying on `error.message` | Key on `error.code` |
| Refreshing token on 403 | Only on 401. 403 = wrong role, refresh won't help. |
| Polling seat availability every second | Use WS `seat:availability:{scheduleId}`, fall back to 3s polling |
| Storing tokens in localStorage (Operator App) | Use `expo-secure-store` |
| Sending rupees to the backend | Backend expects paise (integer). `₹450 = 45000` |
| Reusing Idempotency-Key on retry-after-failure | Generate new UUID on every user retry |
| Parsing cursors | Treat as opaque base64 string |
| Assuming masked fields are `null` | Absent means missing key entirely. Use `'field' in obj` |
| Delaying WS auth | Send `{ action: 'auth', token }` immediately on `connect` |
| Not handling `auth:expiring` | Must refresh + send `auth:refresh` within 30s window |
| 401 loop | If refresh fails with 401, **stop**. Logout. Redirect to login. |
| Assuming `PNG_STANDARD` seat type | Only `SEATER` and `SLEEPER` in Phase 1 (backend allows `SEMI_SLEEPER` but seed never uses it) |
| Hardcoding operator's `phone` on booking detail | Operator sees own drivers' phones, but NOT passengers' phones |
| Trusting Razorpay client `handler` as final | Webhook is authoritative. Poll `GET /payments/:id` or WS `payment:succeeded` |
| Assuming `availableSeats` is decremented client-side | Server is authoritative. WS `seat:booked` updates it |
| Decoding `qrPayload` on the client (busverse) | Display only. Verification is driver-side + server-side. |
| Subscribing to `admin:notifications` from BusCon | That's SUPER_ADMIN only. Connection closes 1008. |

---

## §11. Testing (frontend)

**No frontend test framework is installed yet.** Recommend:

**BusVerse + BusCon:**

- **Vitest** + **@testing-library/react** for unit tests
- **Playwright** for E2E — one smoke flow per critical path
- **MSW** for API mocking in unit tests

**Operator App:**

- **Jest** + **@testing-library/react-native** (Expo compatible)
- **Detox** for E2E (heavy setup — skip for MVP)

**Minimum viable tests (before demo):**

1. BusVerse happy path: search → seat lock → book → mock-pay → ticket visible
2. BusVerse error path: seat locked → 409 → toast + seat refresh
3. BusCon: login → bus create → layout editor → approve status shows
4. Operator App: login → trips list → start → GPS POST → end

**Do NOT write tests for:**

- Every component in isolation
- Every API call
- Every error code

Focus on **flows that break the demo**.

---

## §12. Demo-critical path

**8-step demo (from handover v7 §1.4). These 8 flows must work end-to-end or the demo fails.**

| # | Step | Frontend | Critical path |
|---|---|---|---|
| 1 | Passenger searches | BusVerse | Home → autocomplete → results |
| 2 | Passenger locks seat | BusVerse | Schedule → seat map → lock (WS updates) |
| 3 | Passenger books | BusVerse | Passenger form → booking created |
| 4 | Passenger pays | BusVerse | Payment → mock-confirm → confirmed |
| 5 | Ticket issued | BusVerse | QR visible |
| 6 | Driver starts trip | Operator App | Login → trip detail → start |
| 7 | GPS + WS live update | Operator App + BusVerse | GPS POST loop + passenger sees bus move |
| 8 | Passenger scans QR (boarding) | Operator App | Scan → VALID |

**Build these 8 first, then expand.** Everything else (revenue charts, manager invite, settlement history) is nice-to-have.

**Demo day checklist (frontend):**

- [ ] Backend running (`pnpm dev`)
- [ ] BusVerse at `http://localhost:3410` — home page loads
- [ ] BusCon at `http://localhost:3411` — login works
- [ ] Operator App on phone via Expo Go — login works
- [ ] All 3 have the same JWT-secret-adjacent backend (i.e., all point to `http://localhost:4310/v1`)
- [ ] Seat availability updates in real time (open 2 browsers, lock in one, see grey in other)
- [ ] Payment either real Razorpay or `POST /v1/dev/mock-confirm-payment` — test both
- [ ] GPS streaming starts within 10s of trip start
- [ ] QR scan completes in under 2s
- [ ] All chrome extensions disabled (some block WS)
- [ ] Screen recorder running (backup video for demo day)

---

## §13. If something breaks — diagnostic order

**Before assuming it's a frontend bug:**

1. Check `curl http://localhost:4310/v1/health` — backend alive?
2. Check `docker compose ps` — Postgres + Redis healthy?
3. Open browser DevTools → Network tab — what does the failing request actually return?
4. Check backend logs (`pnpm dev` terminal) — is the request even reaching the backend?

**If the request is reaching the backend but failing:**

- **400/422** — request body doesn't match schema. Compare to `07` v1.3.
- **401** — no token OR expired OR wrong surface. Check `Authorization: Bearer <token>` header.
- **403** — role mismatch. Check JWT `role` claim. Do not refresh.
- **404** — endpoint path wrong, or resource doesn't belong to this user (row-scoped).
- **409** — conflict (duplicate email, seat already locked, etc). Check `error.code`.
- **429** — rate limit. Wait `Retry-After` header seconds. Reduce poll frequency.
- **500** — backend bug. Document with curl. Do not fix backend. Work around.

**If WS fails:**

- Open DevTools → Network → WS tab — connection established?
- See the `auth` message sent? See `auth:ok` response?
- See `subscribed` after subscribe? Or `error` with code?
- Code 1008 = forbidden topic. Code 4001 = bad token. Code 4003 = no auth in 5s.

**If data looks wrong:**

- Compare to backend response — is `data.booking.status` actually what the backend says, or is it stale?
- Time zone: is the ISO string being parsed as UTC or local? (Hint: `new Date(isoString)` is UTC. Only format to IST at the display layer.)

---

## §14. Handover back

**When you stop (or finish a milestone), write `docs/FRONTEND-HANDOVER-{frontend}-v{N}.md`** with:

- Milestone state (which of the 6 milestones are done)
- Known issues (bugs you found, workarounds you applied)
- Files created / modified
- Env vars needed for dev
- Test commands
- Next milestone plan

**Follow the same pattern as this doc** — TL;DR first, gotchas last.

**If you found a backend bug that blocked progress:**

- Document it with reproduction steps
- Note that `apps/api/` is frozen — do NOT fix
- List the workaround you applied
- Flag it for the backend team

---

## §15. Final notes

### 15.1 What's frozen and what's not

| Frozen | Not frozen |
|---|---|
| `apps/api/` — all code | `apps/busverse/` |
| `docs/06-DATABASE-SCHEMA.md` v1.3 | `apps/buscon/` |
| `docs/07-API-AND-REALTIME-CONTRACTS.md` v1.3 | `apps/operator-app/` |
| `docs/AI-HANDOVER-v7.md` | `docs/FRONTEND-HANDOVER-*` (your output) |
| `docs/00-BUILD-PROGRESS.md` v2.8 | `docs/AI-FRONTEND-HANDOVER-v1.md` (this doc, once you start) |

### 15.2 What "done" looks like

**BusVerse:** A first-time user can search, book, pay, get a ticket, track a live trip, and cancel with a refund preview — end to end, on a mobile browser, without errors.

**BusCon:** An operator can create a bus, define a route, publish a schedule, invite a driver, view bookings, and see today's revenue — end to end, on desktop.

**Operator App:** A driver can log in, see today's trips, start one, stream GPS for 30+ minutes, scan 10+ QR codes (including offline), report a delay, end the trip, and see history — end to end, on a real Android/iOS phone.

### 15.3 What "done" does NOT include (v1 scope)

- Push notifications (Phase 2)
- Offline-first sync for BusCon (Phase 2)
- Multi-language support (Phase 2)
- Dark mode (Phase 2)
- Analytics dashboards (Phase 2)
- Admin panel (separate concern)
- Chat support (Phase 2)

**Every v1 feature must work. Every Phase 2 feature must be behind a feature flag or absent.**

### 15.4 When in doubt

1. Read `07` v1.3 for the endpoint contract
2. Read `shared/04` for the WS event payload
3. Read the backend logs — errors are verbose there
4. curl the endpoint manually to see what the backend actually returns
5. **Ask — do not guess.**

---

## §16. Reading checklist (tick before starting)

**Before writing any code:**

- [ ] Read this doc §0–§4
- [ ] Read `docs/07-API-AND-REALTIME-CONTRACTS.md` v1.3 — at least §1, §2, §4 (or §5/§7 depending on frontend), §9
- [ ] Read `docs/shared/04-EVENT-AND-REALTIME-CATALOG.md` v1.0
- [ ] Read `docs/AI-HANDOVER-v7.md` §0–§6
- [ ] Read your frontend's UI spec (`docs/busverse/05-UI-SPEC.md` OR `docs/buscon/06-UI-SPEC.md`)
- [ ] Backend is running: `curl http://localhost:4310/v1/health` returns `{"status":"ok"}`
- [ ] Read §8 (Gotchas) — all 15
- [ ] Read §12 (Demo-critical path) — know what must work

**Before starting Milestone 2 (first feature work):**

- [ ] Auth flow works end-to-end
- [ ] API client handles 401 (refresh + retry) and 403 (no refresh)
- [ ] WS connection authenticates and subscribes
- [ ] One API call from the API client renders on screen

**Before demo:**

- [ ] All 8 demo steps (from §12) pass
- [ ] No console errors on any page
- [ ] Real phone (not just simulator) shows the flow working
- [ ] Network throttle test (3G) — still works
- [ ] Backup video recorded

---

**End of `docs/AI-FRONTEND-HANDOVER-v1.md`**

**Resume time from cold: ~30 minutes** (this doc + §3 reading list).

**Current backend state:** 396/396 tests, 108/108 endpoints, 16/16 WS events wired, EXIT CODE 0. Frozen at Phase 13. Ready for frontend integration.

**Start here:** Read §0–§4. Then §3's reading list. Then pick your frontend (§5, §6, or §7). Then build Milestone 1.

**Never guess. Always read `07` v1.3 or `shared/04`. Ask if a shape isn't documented.**
