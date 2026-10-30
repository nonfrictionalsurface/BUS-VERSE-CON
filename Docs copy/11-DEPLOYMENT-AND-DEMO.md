# `docs/11-DEPLOYMENT-AND-DEMO.md`

**Document:** `docs/11-DEPLOYMENT-AND-DEMO.md`
**Project:** BusVerse + BusCon
**Version:** 1.0
**Status:** Locked — Foundational Document
**Owner:** Shaghaf
**Guide:** Mr. Mohit Srivastav
**Purpose:** The complete operational playbook for BusVerse + BusCon Phase 1. Defines how to install, seed, run, demo, and deploy the system — from a clean laptop to a working demo on viva day. Includes the demo script, fallback plans, smoke tests, troubleshooting, and post-demo procedures. Anyone with a laptop, Docker, and internet should be able to clone, setup, seed, run, and demo the entire project in under 30 minutes using this document.

> **Derives from:** `01-PLAN-AND-SCOPE.md` §13 (demo criteria), `06-DATABASE-SCHEMA.md` §17 (seed data), `08-WORKFLOWS.md` WF-X-01 (demo flow), `09-SECURITY-AND-PLATFORM-RULES.md` §17 (secrets), `10-TESTING-STRATEGY.md` §22.4 (smoke tests).
>
> **Referenced by:** `report/17-RESULTS_OUTPUT.md`, `report/15-SCREENSHOTS_UI.md`, `viva/03-DEMO_SCRIPT.md`, and every future contributor's onboarding.

---

## 1. Purpose and Scope

### 1.1 What this document owns

| Owns here | Referenced from upstream |
|---|---|
| Setup instructions | `01` §13 has demo criteria |
| Environment variables | `09` §17 has secrets inventory |
| Seed data loading | `06` §17 has seed script design |
| Running locally | `06` §2 has Postgres config |
| Demo script | `01` §13 has 8-step flow |
| Demo fallbacks | `08` WF-X-01 has the flow |
| Staging deployment | `09` §17.5 has environment separation |
| Production deployment | `09` §17.6 has prod access |
| Smoke tests | `10` §22.4 has smoke pipeline |
| Troubleshooting | — |
| Post-demo procedures | — |

### 1.2 Document hierarchy

**Diagram: Document hierarchy**
*The deployment doc sits at the top of the numbered set — it consumes everything from `01` through `10` and produces the operational playbook. Its downstream consumers are the demo chapter of the report, the viva demo script, and any future contributor onboarding. Every setup step, every env var, every fallback plan traces to this doc.*

```mermaid
flowchart TB
    D01["01-plan"]
    D06["06-schema"]
    D08["08-workflows"]
    D09["09-security"]
    D10["10-testing"]

    DEP["11-deployment<br/>You are here"]

    D01 --> DEP
    D06 --> DEP
    D08 --> DEP
    D09 --> DEP
    D10 --> DEP

    DEP --> R17["report/17-results"]
    DEP --> R15["report/15-screenshots"]
    DEP --> V03["viva/03-demo"]
```

### 1.3 What this document does NOT cover

| Topic | Goes to |
|---|---|
| Test implementation | `10-TESTING-STRATEGY.md` |
| API contracts | `07-API-AND-REALTIME-CONTRACTS.md` |
| UI screens | `busverse/05-UI-SPEC.md`, `buscon/06-UI-SPEC.md` |
| Domain invariants | `05-DOMAIN-MODEL.md` §7 |
| Security controls | `09-SECURITY-AND-PLATFORM-RULES.md` |
| Phase 2 deployment | Deferred |

### 1.4 The 30-minute rule

**Rule:** Anyone with a laptop, Docker Desktop, and internet should be able to clone, setup, seed, run, and demo the entire project in under 30 minutes using this document.

**Breakdown:**

| Phase | Target time |
|---|---|
| Prerequisites install (if needed) | 10 min |
| Clone + install | 3 min |
| Configure env vars | 2 min |
| Start Docker services | 1 min |
| Run migrations | 1 min |
| Seed database | 1 min |
| Start 4 apps | 2 min |
| First-time verification | 5 min |
| **Total** | **25 min** |

---

## 2. Prerequisites

### 2.1 Required tools

**Diagram: Prerequisite tools**
*Six tools required before setup. Five are mandatory. VS Code is recommended but optional. Each tool has a minimum version and a verification command. All are free.*

```mermaid
flowchart LR
    T1["Node.js<br/>20 LTS<br/>required"] --> CHECK["Run each<br/>verification<br/>command"]
    T2["pnpm<br/>9.x<br/>required"] --> CHECK
    T3["Docker Desktop<br/>required"] --> CHECK
    T4["Git<br/>required"] --> CHECK
    T5["Chrome or Edge<br/>required"] --> CHECK
    T6["VS Code<br/>recommended"] --> CHECK
```

### 2.2 Prerequisites table

| # | Tool | Version | Install | Verify |
|:---:|---|---|---|---|
| 1 | **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org/) | `node --version` → `v20.x.x` |
| 2 | **pnpm** | 9.x | `npm install -g pnpm@9` | `pnpm --version` → `9.x.x` |
| 3 | **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| 4 | **Git** | 2.40+ | [git-scm.com](https://git-scm.com/) | `git --version` |
| 5 | **Chrome / Edge** | Latest | [google.com/chrome](https://www.google.com/chrome/) | Open any website |
| 6 | **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) | `code --version` |

### 2.3 Prerequisite verification script

Run this one-liner to check all prerequisites at once:

```powershell
node --version
pnpm --version
docker --version
git --version
```

**Expected output:**

```
v20.11.0
9.12.0
Docker version 24.0.7
git version 2.43.0
```

**If any command fails:** install that tool before continuing. Do not skip.

### 2.4 Optional tools

| Tool | Purpose |
|---|---|
| **OBS Studio** | Recording demo video backup |
| **Postman / Insomnia** | Manual API testing |
| **DB Browser for SQLite** | Inspect test data (E2E) |
| **Expo Go** on phone | Driver app testing |

### 2.5 System requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16 GB (Docker + 4 apps + browser) |
| Disk space | 5 GB free | 10 GB free |
| OS | Windows 10, macOS 12, Ubuntu 22.04 | Latest versions |
| Internet | Required for install + demo | Backup: pre-cached npm deps + video |

---

## 3. Local Install

### 3.1 Install steps

**Diagram: Install steps**
*Six sequential install steps. Each produces a verifiable state. Do not skip steps. Do not proceed if verification fails.*

```mermaid
flowchart TB
    S1["1 · Clone repo"] --> V1["Verify:<br/>package.json exists"]
    V1 --> S2["2 · pnpm install"]
    S2 --> V2["Verify:<br/>node_modules exists"]
    V2 --> S3["3 · Copy .env.example<br/>→ .env"]
    S3 --> V3["Verify:<br/>.env exists with keys"]
    V3 --> S4["4 · docker compose up -d<br/>Postgres + Redis"]
    S4 --> V4["Verify:<br/>docker ps shows 2 containers"]
    V4 --> S5["5 · pnpm db:migrate"]
    S5 --> V5["Verify:<br/>29 tables created"]
    V5 --> S6["6 · pnpm db:seed"]
    S6 --> V6["Verify:<br/>~340 rows loaded"]
```

### 3.2 Step-by-step commands

**Step 1 — Clone repo:**

```bash
git clone https://github.com/[your-username]/busverse-platform.git
cd busverse-platform
```

**Verify:** `ls package.json` shows the file exists.

**Step 2 — Install dependencies:**

```bash
pnpm install
```

**Verify:** `ls node_modules` shows directory exists.

**Step 3 — Configure environment:**

```bash
cp .env.example .env
# Edit .env with your values (see §4)
```

**Verify:** Open `.env` — it must have `DATABASE_URL`, `JWT_SECRET`, `RAZORPAY_KEY_ID`.

**Step 4 — Start Postgres + Redis:**

```bash
docker compose up -d
```

**Verify:** `docker ps` shows two running containers:

```
CONTAINER ID   IMAGE              STATUS
abc123         postgres:16        Up 5 seconds
def456         redis:7-alpine     Up 5 seconds
```

**Step 5 — Run migrations:**

```bash
pnpm db:migrate
```

**Verify:** `psql busverse -c "\dt"` shows 29 tables.

**Step 6 — Seed database:**

```bash
pnpm db:seed
```

**Verify:** `pnpm db:verify` prints:

```
✓ cities: 3
✓ stands: 14
✓ operators: 3
✓ buses: 8
✓ seats: 248
✓ routes: 5
✓ schedules: 15
✓ drivers: 6
✓ Total: 340 rows
```

### 3.3 Install failure handling

| Failure | Cause | Fix |
|---|---|---|
| `pnpm: command not found` | pnpm not installed | `npm install -g pnpm@9` |
| `docker: command not found` | Docker not installed | Install Docker Desktop |
| `Error: connect ECONNREFUSED :5432` | Postgres not running | `docker compose up -d` |
| `Migration failed` | Schema drift | `pnpm db:migrate:reset` |
| `Seed failed: FK violation` | Wrong seed order | `pnpm db:reset && pnpm db:seed` |

**If still failing:** see §15 Troubleshooting.

---

## 4. Environment Variables

### 4.1 Env vars tree

**Diagram: Env vars tree**
*Three `.env` files — one per app plus a root `.env` for shared secrets. The API `.env` holds the most secrets. Web apps need only public URLs. Shared secrets (JWT, encryption keys) live in the root `.env` and are read by the API.*

```mermaid
flowchart TB
    ENVS["Env vars"]

    ENVS --> ROOT["`.env` (root)<br/>shared secrets"]
    ENVS --> API["`.env` (api)<br/>server secrets"]
    ENVS --> BV["`.env.local` (busverse)<br/>public URLs"]
    ENVS --> BC["`.env.local` (buscon)<br/>public URLs"]

    ROOT --> R1["JWT_SECRET"]
    ROOT --> R2["PII_ENCRYPTION_KEY"]
    ROOT --> R3["QR_SIGNING_PRIVATE_KEY"]
    ROOT --> R4["PHONE_HASH_SALT"]

    API --> A1["DATABASE_URL"]
    API --> A2["REDIS_URL"]
    API --> A3["RAZORPAY_KEY_ID"]
    API --> A4["RAZORPAY_KEY_SECRET"]
    API --> A5["RAZORPAY_WEBHOOK_SECRET"]
    API --> A6["CORS_ALLOWED_ORIGINS"]

    BV --> BV1["NEXT_PUBLIC_API_URL"]
    BV --> BV2["NEXT_PUBLIC_WS_URL"]

    BC --> BC1["NEXT_PUBLIC_API_URL"]
    BC --> BC2["NEXT_PUBLIC_WS_URL"]
```

### 4.2 Full environment variable catalog

| Variable | File | Required | Example | Generation |
|---|---|---|---|---|
| `NODE_ENV` | root | ✅ | `development` | Manual |
| `DATABASE_URL` | api | ✅ | `postgresql://postgres:postgres@localhost:5432/busverse` | Docker |
| `REDIS_URL` | api | ✅ | `redis://default:redis_dev_password@localhost:6379` | Docker |
| `JWT_SECRET` | root | ✅ | 44-char base64 | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `PII_ENCRYPTION_KEY` | root | ✅ | 32-byte base64 | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `QR_SIGNING_PRIVATE_KEY` | root | ✅ | Ed25519 private key | See §4.4 |
| `QR_SIGNING_PUBLIC_KEY` | root | ✅ | Ed25519 public key | See §4.4 |
| `PHONE_HASH_SALT` | root | ✅ | 32-byte base64 | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `RAZORPAY_KEY_ID` | api | ✅ | `rzp_test_xxxxxxxx` | Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | api | ✅ | 24-char string | Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | api | ✅ | 32-char string | Razorpay dashboard |
| `CORS_ALLOWED_ORIGINS` | api | ✅ | `http://localhost:3000,http://localhost:3001` | Manual |
| `PORT` | api | — | `4000` | Default |
| `LOG_LEVEL` | api | — | `debug` | Default `info` |
| `MOCK_PAYMENT` | api | — | `false` | Enable for fallback |
| `MOCK_OTP` | api | — | `false` | Enable for offline demo |
| `MOCK_SMS` | api | — | `false` | Enable for offline demo |
| `S3_ENDPOINT` | api | — | `https://[r2-endpoint].r2.cloudflarestorage.com` | Cloudflare R2 |
| `S3_ACCESS_KEY` | api | — | R2 access key | Cloudflare R2 |
| `S3_SECRET_KEY` | api | — | R2 secret | Cloudflare R2 |
| `S3_BUCKET` | api | — | `busverse-uploads-dev` | Manual |
| `NEXT_PUBLIC_API_URL` | busverse | ✅ | `http://localhost:4000` | Manual |
| `NEXT_PUBLIC_WS_URL` | busverse | ✅ | `ws://localhost:4000` | Manual |
| `NEXT_PUBLIC_API_URL` | buscon | ✅ | `http://localhost:4000` | Manual |
| `NEXT_PUBLIC_WS_URL` | buscon | ✅ | `ws://localhost:4000` | Manual |
| `EXPO_PUBLIC_API_URL` | operator-app | ✅ | `http://[your-ip]:4000` | Manual |

**Total: 24 env vars** (18 required, 6 optional).

### 4.3 Secret generation

Run these commands on first setup to generate all shared secrets:

```bash
# JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# PII_ENCRYPTION_KEY
node -e "console.log('PII_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# PHONE_HASH_SALT
node -e "console.log('PHONE_HASH_SALT=' + require('crypto').randomBytes(32).toString('base64'))"
```

Paste each output into `.env`.

### 4.4 Ed25519 key generation

The QR signing keys must be generated once and used consistently:

```bash
node -e "
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privBase64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const pubBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
console.log('QR_SIGNING_PRIVATE_KEY=' + privBase64);
console.log('QR_SIGNING_PUBLIC_KEY=' + pubBase64);
"
```

**Backup:** store both keys in password manager. Losing the private key means no QR tickets can be issued. Losing the public key means no tickets can be verified.

### 4.5 Env var security rules

| Rule | Enforcement |
|---|---|
| Never commit `.env` files | `.gitignore` |
| Never log env vars | Lint rule + review |
| Never expose in errors | Error middleware strips them |
| Rotate secrets on leak | Per `09` §17 |
| Different secrets per environment | Dev / staging / prod |

---

## 5. External Services Setup

### 5.1 Services required

**Diagram: External services setup**
*Four external services. Three require signup (Razorpay, Firebase Auth for OTP, Cloudflare R2 for uploads). One requires nothing (OSM map tiles). Each has a setup time and a free tier that covers the viva.*

```mermaid
flowchart TB
    EXT["External services<br/>required for demo"]

    EXT --> RZP["Razorpay<br/>test mode<br/>15 min setup<br/>free"]
    EXT --> FB["Firebase Auth<br/>OTP<br/>10 min setup<br/>free"]
    EXT --> R2["Cloudflare R2<br/>file uploads<br/>10 min setup<br/>free tier"]
    EXT --> MAP["OSM tiles<br/>map<br/>0 min setup<br/>free, public"]
```

### 5.2 Razorpay test mode (mandatory)

| Step | Action |
|:---:|---|
| 1 | Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com) |
| 2 | Switch to **Test Mode** (top-right toggle) |
| 3 | Go to **Settings → API Keys → Generate Key** |
| 4 | Copy `key_id` (`rzp_test_*`) and `key_secret` |
| 5 | Go to **Settings → Webhooks → Add Webhook** |
| 6 | URL: `http://localhost:4000/v1/webhooks/razorpay` (or use ngrok for staging) |
| 7 | Events: `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed` |
| 8 | Copy `webhook_secret` |
| 9 | Paste all three into `.env` |

**Test cards:**

| Card | Number | CVV | Expiry |
|---|---|---|---|
| Success | `4111 1111 1111 1111` | any | any future |
| Failure | `4000 0000 0000 0002` | any | any future |
| UPI (success) | `success@razorpay` | — | — |

**Verification:** create a ₹1 order in Razorpay test dashboard → confirm it appears in your logs.

### 5.3 Firebase Auth for OTP (mandatory)

**Why Firebase Auth and not MSG91 or Twilio:**

| Reason | Detail |
|---|---|
| Free tier | 10,000 verifications/month |
| No DLT registration | India requires DLT for SMS, but Firebase handles this internally |
| 6-digit OTP built-in | `signInWithPhoneNumber` |
| Reliable | Google's infrastructure |

**Setup:**

| Step | Action |
|:---:|---|
| 1 | Go to [console.firebase.google.com](https://console.firebase.google.com) |
| 2 | Create new project (`busverse-dev`) |
| 3 | Enable Authentication → Sign-in method → Phone |
| 4 | Add test phone numbers (`+919999999999` → `123456`) for offline demo |
| 5 | Get Firebase config (Settings → General) |
| 6 | Copy `apiKey`, `authDomain`, `projectId` into `.env` |

**Test phone numbers** are crucial for demo: with these, OTP is always `123456`, no real SMS sent, works offline.

### 5.4 Cloudflare R2 for uploads (optional)

Used only for KYC document upload. If not configured, uploads fall back to local file system.

| Step | Action |
|:---:|---|
| 1 | Sign up at [cloudflare.com](https://cloudflare.com) |
| 2 | Enable R2 in dashboard |
| 3 | Create bucket `busverse-uploads-dev` |
| 4 | Generate API token with R2 permissions |
| 5 | Copy `endpoint`, `accessKey`, `secretKey` into `.env` |

**Free tier:** 10 GB storage, 1M class A ops/month, 10M class B ops/month. Covers viva entirely.

### 5.5 OSM map tiles (no setup)

Map tiles are fetched directly from `https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png` — public, free, no API key.

**Fallback:** If OSM is blocked on college Wi-Fi, static map image from `docs/assets/map-fallback.png` is used.

### 5.6 External services fallback matrix

| Service | Fails | Fallback |
|---|---|---|
| Razorpay | Down | `MOCK_PAYMENT=true` |
| Firebase Auth | Down | `MOCK_OTP=true` (accepts `123456`) |
| R2 | Down | Local file system |
| OSM tiles | Blocked | Static map image |

---

## 6. Database Setup

### 6.1 Docker Compose stack

**Diagram: Database setup**
*Two containers. Postgres 16 for relational data. Redis 7 for locks, sessions, and cache. Both have persistent volumes so data survives container restarts. Ports exposed on localhost for direct access.*

```mermaid
flowchart LR
    COMPOSE["docker compose up -d"]
    COMPOSE --> PG[("Postgres 16<br/>:5432<br/>volume pg_data")]
    COMPOSE --> RD[("Redis 7<br/>:6379<br/>volume redis_data")]
    PG --> APPC["API connects<br/>via DATABASE_URL"]
    RD --> APPR["API connects<br/>via REDIS_URL"]
```

### 6.2 Docker Compose file

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16
    container_name: busverse-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: busverse
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: busverse-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass redis_dev_password
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redis_dev_password", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pg_data:
  redis_data:
```

### 6.3 Migrations

```bash
pnpm db:migrate
```

**What runs:** all 29 tables per `06`, plus triggers, indexes, and constraints. Takes ~10 seconds.

**Verify:**

```bash
docker exec -it busverse-postgres psql -U postgres -d busverse -c "\dt"
```

Expected: 29 tables listed.

### 6.4 Migration reset (when needed)

If migrations get out of sync:

```bash
pnpm db:migrate:reset  # WARNING: deletes all data
pnpm db:migrate
pnpm db:seed
```

### 6.5 Direct DB access

**Open psql:**

```bash
docker exec -it busverse-postgres psql -U postgres -d busverse
```

**Useful queries:**

```sql
-- Count demo data
SELECT 'cities' AS tbl, COUNT(*) FROM cities
UNION ALL SELECT 'stands', COUNT(*) FROM stands
UNION ALL SELECT 'operators', COUNT(*) FROM operators
UNION ALL SELECT 'buses', COUNT(*) FROM buses;

-- Check latest bookings
SELECT id, booking_reference, status, created_at
FROM bookings ORDER BY created_at DESC LIMIT 5;

-- Check audit log
SELECT entity_type, action, occurred_at
FROM audit_logs ORDER BY occurred_at DESC LIMIT 10;
```

### 6.6 Redis access

```bash
docker exec -it busverse-redis redis-cli -a redis_dev_password
```

**Useful commands:**

```
KEYS lock:*           # Active seat locks
KEYS session:*        # Active sessions
KEYS gps:trip:*       # Live GPS positions
```

### 6.7 Database backup (before demo)

**Snapshot before viva:**

```bash
docker exec busverse-postgres pg_dump -U postgres busverse > backup-$(date +%Y%m%d).sql
```

**Restore:**

```bash
docker exec -i busverse-postgres psql -U postgres -d busverse < backup-20261024.sql
```

---

## 7. Seed Data

### 7.1 Seed flow

**Diagram: Seed data flow**
*Nine ordered seed scripts insert ~340 rows across 12 tables. Each script is idempotent (UPSERT). A verification step at the end confirms counts. Total seed time: under 5 seconds.*

```mermaid
flowchart TB
    SEED["pnpm db:seed"]

    SEED --> S1["1 cities (3)"]
    S1 --> S2["2 stands (~14)"]
    S2 --> S3["3 operators (3)"]
    S3 --> S4["4 buses (8)"]
    S4 --> S5["5 seat_layouts (8)"]
    S5 --> S6["6 seats (~250)"]
    S6 --> S7["7 routes (5)"]
    S7 --> S8["8 route_stands (~17)"]
    S8 --> S9["9 schedules (15)"]
    S9 --> S10["10 users (7)"]
    S10 --> S11["11 driver_profiles (6)"]
    S11 --> S12["12 operator_users (4)"]
    S12 --> V["✓ Verify: 340 rows"]
```

### 7.2 What gets seeded

| Table | Count | Notes |
|---|---:|---|
| `cities` | 3 | Delhi, Kanpur, Lucknow |
| `stands` | 14 | 4–5 per city |
| `operators` | 3 | Sharma Travels, Rajdhani Express, UP Roadways |
| `buses` | 8 | 2 seater 40 + 6 sleeper 30 |
| `seat_layouts` | 8 | One per bus |
| `seats` | ~248 | Physical seats |
| `routes` | 5 | Delhi–Kanpur–Lucknow + variations |
| `route_stands` | ~17 | 4–6 per route |
| `schedules` | 15 | Morning/afternoon/evening/night |
| `users` | 7 | 1 admin + 4 operators + 2 passengers |
| `driver_profiles` | 6 | 2 per operator |
| `operator_users` | 4 | 3 Owners + 1 Manager |
| **Total** | **~340** | |

### 7.3 Seed data rationale

**Why these specific counts:**

| Constraint | Count | Why |
|---|---|---|
| 3 cities | Minimum for multi-leg route | Delhi–Kanpur–Lucknow |
| 14 stands | 4-5 per city | Realistic bus stand density |
| 3 operators | Demo multi-operator comparison | Shows competition in search |
| 8 buses | Multi-layout demo | Seater + sleeper side by side |
| 15 schedules | Multiple times of day | Search results show variety |
| 7 users | Full role coverage | Admin + operators + passengers |

### 7.4 Seed verification

```bash
pnpm db:verify
```

**Expected output:**

```
✓ cities: 3
✓ stands: 14
✓ operators: 3
✓ buses: 8
✓ seat_layouts: 8
✓ seats: 248
✓ routes: 5
✓ route_stands: 17
✓ schedules: 15
✓ users: 7
✓ driver_profiles: 6
✓ operator_users: 4
✓ Total: 340 rows
```

**If counts are wrong:**

```bash
pnpm db:reset   # Drop and re-migrate
pnpm db:seed    # Re-seed
```

### 7.5 Demo accounts

**Diagram: Demo accounts**
*Seven users cover all roles. Passwords and phone numbers are documented so you don't get locked out during demo.*

```mermaid
flowchart TB
    ADMIN["admin@busverse.app<br/>SUPER_ADMIN"]
    OP1["owner@sharmatravels.com<br/>OPERATOR_OWNER"]
    OP2["manager@rajdhani.com<br/>OPERATOR_MANAGER"]
    DRV1["+919999900001<br/>DRIVER"]
    DRV2["+919999900002<br/>DRIVER"]
    PAX1["+919999900011<br/>REGISTERED_PASSENGER"]
    PAX2["+919999900012<br/>REGISTERED_PASSENGER"]
```

**Login credentials:**

| Role | Email / Phone | Password / OTP |
|---|---|---|
| Super Admin | `admin@busverse.app` | `AdminPass123!@#` (16 chars) |
| Operator Owner | `owner@sharmatravels.com` | `OwnerPass123!` |
| Operator Owner | `owner@rajdhani.com` | `OwnerPass123!` |
| Operator Manager | `manager@rajdhani.com` | `ManagerPass123!` |
| Driver | `+919999900001` | OTP `123456` (Firebase test) |
| Driver | `+919999900002` | OTP `123456` |
| Passenger | `+919999900011` | OTP `123456` |
| Passenger | `+919999900012` | OTP `123456` |

**Rules:**
- All test passwords meet the minimum length requirements (`09` §6.6)
- Test phone numbers registered in Firebase Auth
- Never use these passwords in production

### 7.6 Seed reset between demos

After a demo, bookings/payments/trips exist. To reset for next demo:

```bash
pnpm db:reset
pnpm db:migrate
pnpm db:seed
```

**Time:** ~15 seconds.

---

## 8. Running Locally

### 8.1 Process layout

**Diagram: Running locally**
*Four processes in four terminals. API on port 4000. BusVerse on 3000. BusCon on 3001. Operator App via Expo on 8081. All connect to the same local Postgres and Redis.*

```mermaid
flowchart TB
    T1["Terminal 1<br/>pnpm --filter api dev<br/>:4000"]
    T2["Terminal 2<br/>pnpm --filter busverse dev<br/>:3000"]
    T3["Terminal 3<br/>pnpm --filter buscon dev<br/>:3001"]
    T4["Terminal 4<br/>pnpm --filter operator-app start<br/>Expo"]

    DB[("Postgres<br/>:5432")]
    RD[("Redis<br/>:6379")]

    T1 --> DB
    T1 --> RD
    T2 --> T1
    T3 --> T1
    T4 --> T1

    BROWSER["Browser<br/>localhost:3000<br/>localhost:3001"]
    T2 --> BROWSER
    T3 --> BROWSER
    PHONE["Phone<br/>Expo Go"]
    T4 --> PHONE
```

### 8.2 Four-terminal approach

Open four terminals:

**Terminal 1 — API:**

```bash
pnpm --filter api dev
```

**Expected output:**

```
[api] Server listening on port 4000
[api] Connected to Postgres
[api] Connected to Redis
[api] WebSocket server ready
```

**Terminal 2 — BusVerse:**

```bash
pnpm --filter busverse dev
```

**Expected output:**

```
[busverse] ready - started server on http://localhost:3000
```

**Terminal 3 — BusCon:**

```bash
pnpm --filter buscon dev
```

**Expected output:**

```
[buscon] ready - started server on http://localhost:3001
```

**Terminal 4 — Operator App (Expo):**

```bash
pnpm --filter operator-app start
```

**Expected output:**

```
[operator-app] Metro Bundler ready
[operator-app] Scan the QR code with Expo Go
```

### 8.3 Single-command approach

Or run all four at once:

```bash
pnpm dev
```

Uses Turborepo to start all apps in parallel. Output is multiplexed with colored prefixes.

**Trade-off:** easier to start, harder to see individual errors.

### 8.4 Services matrix

| Service | Port | URL | Health check |
|---|---|---|---|
| API | 4000 | `http://localhost:4000` | `/v1/health` |
| WebSocket | 4000 | `ws://localhost:4000/v1/ws` | — |
| BusVerse | 3000 | `http://localhost:3000` | — |
| BusCon | 3001 | `http://localhost:3001` | — |
| Operator App | 8081 | Expo QR code | — |
| Postgres | 5432 | `postgresql://localhost:5432/busverse` | — |
| Redis | 6379 | `redis://localhost:6379` | — |

### 8.5 Phone connection (Operator App)

For Expo Go to reach the API from a phone:

**1. Find your laptop's local IP:**

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux
ifconfig | grep "inet "
```

**2. Update `EXPO_PUBLIC_API_URL`:**

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
```

**3. Ensure phone and laptop are on the same Wi-Fi.**

**4. Scan Expo QR code from Operator App terminal.**

### 8.6 Stopping services

```bash
# Stop all pnpm apps
Ctrl+C in each terminal

# Stop Docker containers
docker compose down
```

**Full reset:**

```bash
docker compose down -v  # -v removes volumes too
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

---

## 9. First-Time Verification

### 9.1 Verification checklist

**Diagram: First-time verification checklist**
*Ten checks after setup. Each verifies a different subsystem is working. All must pass before demo. Any failure indicates a setup problem in that layer.*

```mermaid
flowchart TB
    START["Start verification"]
    START --> V1["✓ 1 API health"]
    V1 --> V2["✓ 2 DB connectivity"]
    V2 --> V3["✓ 3 Cities endpoint"]
    V3 --> V4["✓ 4 Search endpoint"]
    V4 --> V5["✓ 5 BusVerse home"]
    V5 --> V6["✓ 6 BusCon login"]
    V6 --> V7["✓ 7 Seat deck"]
    V7 --> V8["✓ 8 Razorpay test checkout"]
    V8 --> V9["✓ 9 Ticket QR"]
    V9 --> V10["✓ 10 Driver login"]
    V10 --> DONE["✓ All systems ready"]
```

### 9.2 Manual verification steps

**Check 1 — API health:**

```bash
curl http://localhost:4000/v1/health
```

Expected: `{"status":"ok"}`

**Check 2 — DB connectivity:**

```bash
curl http://localhost:4000/v1/public/cities
```

Expected: array of 3 cities.

**Check 3 — Search:**

```bash
curl "http://localhost:4000/v1/public/search?originCityId=[delhi-id]&destinationCityId=[lucknow-id]&date=2026-10-24"
```

Expected: array of schedules.

**Check 4 — BusVerse home:**

Open `http://localhost:3000` — should show search form.

**Check 5 — BusCon login:**

Open `http://localhost:3001` — should show login form.

**Check 6 — Seat deck:**

1. Search Delhi → Lucknow
2. Click a result
3. Should see seat grid with 40 seats

**Check 7 — Razorpay test:**

1. Select a seat
2. Fill passenger form
3. Click "Pay"
4. Razorpay checkout should open
5. Use test card `4111 1111 1111 1111`
6. Payment should succeed

**Check 8 — Ticket QR:**

After payment, "My Trips" should show the booking with QR.

**Check 9 — Driver login:**

1. Open Operator App on phone
2. Login with `+919999900001` / OTP `123456`
3. Should see today's trips

**Check 10 — Full flow:**

Run through WF-X-01 (`08` §8.1) — search → book → pay → ticket → driver login → trip start → live track → scan → audit log.

If all 10 pass: **demo-ready.**

### 9.3 Automated verification script

```bash
#!/bin/bash
# scripts/verify-demo-ready.sh

set -e

echo "1. API health..."
curl -fs http://localhost:4000/v1/health > /dev/null

echo "2. DB connectivity..."
curl -fs http://localhost:4000/v1/public/cities > /dev/null

echo "3. Search endpoint..."
curl -fs "http://localhost:4000/v1/public/search?originCityId=...&date=2026-10-24" > /dev/null

echo "4. BusVerse home..."
curl -fs http://localhost:3000 > /dev/null

echo "5. BusCon home..."
curl -fs http://localhost:3001 > /dev/null

echo "6. DB seed data..."
pnpm db:verify

echo "✓ All checks passed — demo ready"
```

---

## 10. Demo Script

### 10.1 Demo timeline

**Diagram: Demo timeline**
*9-step demo runs in ~8 minutes. Each step has a defined duration, actor, and pass criteria. The 8-minute budget leaves 2 minutes for slide intro + 5 minutes for questions in a standard 15-minute viva slot.*

```mermaid
flowchart LR
    S1["1 Search<br/>1 min"] --> S2["2 Seat lock<br/>30 sec"]
    S2 --> S3["3 Pay<br/>1 min"]
    S3 --> S4["4 Ticket<br/>30 sec"]
    S4 --> S5["5 Driver login<br/>30 sec"]
    S5 --> S6["6 Trip start<br/>30 sec"]
    S6 --> S7["7 Live track<br/>1 min"]
    S7 --> S8["8 Scan + audit<br/>2 min"]
    S8 --> S9["9 Wrap<br/>1 min"]
```

### 10.2 Pre-demo setup (T-5 minutes)

Before the panel arrives:

- [ ] All 4 apps running
- [ ] Docker containers healthy
- [ ] Browser tabs open: BusVerse home, BusCon home
- [ ] Operator App open on phone
- [ ] DB seeded (`pnpm db:verify` passes)
- [ ] Demo script printed
- [ ] Phone on silent, screen awake
- [ ] Laptop notifications off
- [ ] Presentation slides on separate screen

### 10.3 Demo step-by-step

#### Step 1 — Search (1 min)

**Actor:** Passenger (founder speaking)

**Screen:** `SCR-BV-SEARCH` → `SCR-BV-RESULTS`

**Narration:**

> "The passenger wants to travel from Delhi to Lucknow on October 24th. They enter the source, destination, and date. Our search returns three schedules — from Sharma Travels, Rajdhani Express, and UP Roadways. Each shows departure time, arrival time, fare, and available seats."

**Actions:**

1. Type "Delhi" in origin → select from autocomplete
2. Type "Lucknow" in destination → select from autocomplete
3. Pick date → click Search

**Pass criteria:**

- 3+ results appear within 3 seconds
- Each result shows fare, time, operator, seats

#### Step 2 — Seat lock (30 sec)

**Actor:** Passenger

**Screen:** `SCR-BV-SEATDECK`

**Narration:**

> "The passenger selects a 14:00 departure. The seat deck shows the actual bus layout — 40 seats in a 2+2 configuration with an aisle. They pick seat A1. Notice the countdown starting at 5 minutes. This is a real atomic lock — if I open a second browser and try to book the same seat, I'll get a conflict."

**Actions:**

1. Click 14:00 result
2. Click seat A1
3. Show countdown

**Optional (if time):** open second browser, try same seat, show 409.

**Pass criteria:**

- Seat highlights as "locked by you"
- Countdown appears
- Second browser sees "locked" state

#### Step 3 — Pay (1 min)

**Actor:** Passenger

**Screen:** `SCR-BV-CHECKOUT` → Razorpay → back to app

**Narration:**

> "The passenger fills in their details and proceeds to pay. Razorpay's hosted checkout opens with all payment methods enabled — GPay, Paytm, PhonePe, cards, netbanking. I'll use a Razorpay test card. The webhook confirms the payment in the backend — this is the authoritative confirmation, not the client callback."

**Actions:**

1. Fill passenger name, age, gender
2. Click "Pay"
3. Razorpay checkout opens
4. Select card, enter `4111 1111 1111 1111`
5. Complete payment
6. Return to app

**Pass criteria:**

- Razorpay checkout opens with all methods
- Test card succeeds
- App shows confirmed booking

#### Step 4 — Ticket (30 sec)

**Actor:** Passenger

**Screen:** `SCR-BV-TICKET`

**Narration:**

> "The booking is confirmed. The passenger receives a QR ticket — this is a cryptographically signed payload, not a URL. It can only be verified by our Operator App, which holds the Ed25519 public key. Nobody can forge it."

**Actions:**

1. Open My Trips → tap booking
2. QR appears

**Pass criteria:**

- QR visible
- Booking reference shown

#### Step 5 — Driver login (30 sec)

**Actor:** Driver

**Screen:** `SCR-OA-LOGIN` → `SCR-OA-TODAY`

**Narration:**

> "Now switching to the driver's phone. The driver logs in with OTP. They see today's assigned trips — the 14:00 Delhi–Lucknow trip."

**Actions:**

1. Open Operator App
2. Enter phone `+919999900001`
3. Enter OTP `123456`
4. See today's trip

**Pass criteria:**

- Trip appears with correct schedule

#### Step 6 — Trip start (30 sec)

**Actor:** Driver

**Screen:** `SCR-OA-TRIP`

**Narration:**

> "The driver starts the trip. Notice the trip status changes to IN_PROGRESS. The driver's GPS begins streaming to the server every 5 seconds. Passengers on this trip will now see live bus position on their map."

**Actions:**

1. Tap "Start Trip"
2. Show status change

**Pass criteria:**

- Status changes to "In progress"
- Passenger app shows "trip started" via WebSocket

#### Step 7 — Live tracking (1 min)

**Actor:** Passenger

**Screen:** `SCR-BV-TRACKING`

**Narration:**

> "Back on the passenger's phone — the bus is now moving on the map. The marker updates every 5 seconds as the driver's GPS streams. This is real-time, not a static screenshot. ETA is recomputed as the bus moves."

**Actions:**

1. Open trip tracking on passenger phone
2. Show moving marker

**Optional:** move phone (driver) to show real position change.

**Pass criteria:**

- Bus marker visible on map
- Updates every 5 seconds

#### Step 8 — Scan + audit (2 min)

**Actor:** Driver + Admin

**Screen:** `SCR-OA-SCAN` → `SCR-BC-AUDIT`

**Narration:**

> "When the passenger boards, the driver scans the QR. The server verifies the Ed25519 signature, checks the ticket status, and marks the passenger as boarded. This happens in under 2 seconds. The passenger's phone updates immediately — from 'Confirmed' to 'Boarded'. Finally, the admin opens the audit log — every action is recorded: booking created, payment succeeded, trip started, scan verified. Complete traceability."

**Actions:**

1. Driver scans passenger's QR
2. Show "Boarded" on driver phone
3. Show "Boarded" on passenger phone
4. Switch to BusCon admin
5. Open audit log
6. Show entries

**Pass criteria:**

- Scan succeeds in < 2 seconds
- Both phones show "Boarded"
- Audit log shows booking + payment + scan

#### Step 9 — Wrap (1 min)

**Narration:**

> "That's the complete flow — passenger books, pays, gets a signed QR, driver starts trip, GPS streams live, passenger sees bus, driver scans, admin sees audit. All working end-to-end. This is what we set out to build."

### 10.4 Demo pass criteria summary

| # | Step | Pass criteria |
|:---:|---|---|
| 1 | Search | 3+ results in ≤ 3 sec |
| 2 | Seat lock | Countdown visible; second browser blocked |
| 3 | Pay | Razorpay checkout works; test card succeeds |
| 4 | Ticket | QR visible |
| 5 | Driver login | Trip appears |
| 6 | Trip start | Status changes; passenger notified |
| 7 | Live tracking | Bus marker updates every 5s |
| 8 | Scan | < 2 sec; both phones show "Boarded" |
| 9 | Audit | All events logged |

**If all 9 pass:** demo succeeds.

---

## 11. Demo Fallbacks

### 11.1 Fallback decision tree

**Diagram: Fallback decision tree**
*When a demo step fails, this tree determines which fallback to use. Each fallback is a real working alternative, not a "trust me." The founder should memorize this tree.*

```mermaid
flowchart TD
    FAIL["Step fails"] --> Q1{"What failed?"}

    Q1 -->|"Razorpay"| F1["MOCK_PAYMENT=true<br/>use mock pay button"]

    Q1 -->|"OTP/SMS"| F2["MOCK_OTP=true<br/>use 123456"]

    Q1 -->|"Internet"| F3["All localhost<br/>no external calls"]

    Q1 -->|"GPS"| F4["Simulated movement<br/>from seed"]

    Q1 -->|"WebSocket"| F5["Manual refresh<br/>polling fallback"]

    Q1 -->|"Map tiles"| F6["Static map image"]

    Q1 -->|"Database"| F7["Restore from backup<br/>or play video"]

    Q1 -->|"Everything"| F8["Play backup video"]
```

### 11.2 Fallback matrix

| Failure | Trigger | Fallback | Time lost |
|---|---|---|---|
| Razorpay down | Checkout doesn't open | `MOCK_PAYMENT=true` + restart API | 30 sec |
| Razorpay test card fails | Card declined | Try UPI `success@razorpay` | 15 sec |
| SMS/OTP fails | OTP not received | `MOCK_OTP=true` + use `123456` | 20 sec |
| Internet lost | Any external call fails | All localhost, disable map tiles | 5 sec |
| GPS unavailable | Location permission denied | Seed simulated positions | 10 sec |
| WebSocket down | Real-time doesn't update | Manual refresh shows polling data | 5 sec |
| Map tiles blocked | Blank map area | Static image with marker | 5 sec |
| Database down | API returns 500 | Restore from `backup.sql` | 2 min |
| Everything down | Nothing works | Play backup video | 0 sec |

### 11.3 Mock mode setup

**Enable mock modes** (edit `.env` and restart API):

```env
MOCK_PAYMENT=true    # Enables /v1/dev/mock-pay endpoint
MOCK_OTP=true        # Always accepts OTP 123456
MOCK_SMS=true        # Skips SMS send
```

**Requirements:**
- `NODE_ENV=development`
- Mock endpoints return `404` if `NODE_ENV=production`

**Mock payment endpoint:**

```bash
POST /v1/dev/mock-pay
{ "bookingId": "..." }
```

Creates a fake `payment.captured` row and confirms booking in 1 second.

**Mock OTP flow:**

Any OTP request → user enters `123456` → logged in. No Firebase call.

### 11.4 Backup video

**Record on demo day setup (T-1 day):**

- OBS Studio, 1080p, 30fps
- Full 8-minute demo of all 9 steps
- Narrated voiceover
- Save to: `docs/assets/demo-backup.mp4`

**If everything fails:**

1. Apologize briefly: "I'll walk through the recorded demo to show the flow"
2. Play video
3. Narrate over it as if live
4. Offer to restart after

**Rule:** never let the panel see you panic. A working video is better than a failing live demo.

### 11.5 Fallback procedures checklist

Before demo, memorize:

- [ ] `MOCK_PAYMENT=true` — how to enable, how to trigger
- [ ] `MOCK_OTP=true` — how to enable, what OTP to use
- [ ] Backup video location
- [ ] Backup DB dump location
- [ ] How to restart API (`Ctrl+C`, `pnpm --filter api dev`)

---

## 12. Demo Day Checklist

### 12.1 Demo day timeline

**Diagram: Demo day timeline**
*Three phases — pre-demo (T-1 day and T-1 hour), during demo, post-demo. Each has a checklist. Nothing is left to chance.*

```mermaid
flowchart TB
    DAY["Demo day"]

    DAY --> T1["T-1 day<br/>record video<br/>test full flow<br/>backup data"]
    DAY --> T2["T-1 hour<br/>start services<br/>run smoke tests<br/>print script"]
    DAY --> T3["During demo<br/>follow 9-step script<br/>use fallbacks if needed"]
    DAY --> T4["Post-demo<br/>stop services<br/>save artifacts<br/>log Q&A"]

    T1 --> T2 --> T3 --> T4
```

### 12.2 Pre-demo checklist (T-1 day)

- [ ] Run full 9-step demo 3 times, all pass
- [ ] Record backup video (8 min, 1080p)
- [ ] Save to `docs/assets/demo-backup.mp4`
- [ ] Dump DB: `pg_dump > backup.sql`
- [ ] Print demo script (§10)
- [ ] Print pre-demo checklist (§12.3)
- [ ] Charge laptop 100% + pack charger
- [ ] Charge phone 100% + pack charger
- [ ] Test on college Wi-Fi if possible
- [ ] Note Wi-Fi password for demo day
- [ ] Prepare phone in silent mode
- [ ] Disable all laptop notifications
- [ ] Prepare 1-minute intro slide

### 12.3 Pre-demo checklist (T-1 hour)

- [ ] Docker Desktop running
- [ ] `docker ps` shows postgres + redis (both healthy)
- [ ] `pnpm db:verify` passes (340 rows)
- [ ] API running on `:4000`
- [ ] BusVerse running on `:3000`
- [ ] BusCon running on `:3001`
- [ ] Operator App running on Expo
- [ ] Phone connected to same Wi-Fi as laptop
- [ ] Razorpay test account active
- [ ] `MOCK_PAYMENT=false`, `MOCK_OTP=false` (real mode)
- [ ] Backup video on desktop
- [ ] Backup DB dump on desktop
- [ ] Demo script printed
- [ ] Water bottle
- [ ] Phone charger connected
- [ ] Guide name memorized: **Mr. Mohit Srivastav**
- [ ] Own name remembered: **Shaghaf**

### 12.4 During demo checklist

- [ ] Speak clearly, don't rush
- [ ] Watch the panel's faces — pause if confused
- [ ] If a step fails, use fallback quickly
- [ ] Keep under 10 minutes
- [ ] Save time for questions

### 12.5 Post-demo checklist

- [ ] Thank the panel
- [ ] Stop all services (`docker compose down`, Ctrl+C in each terminal)
- [ ] Export audit log to `report/17-RESULTS_OUTPUT.md`
- [ ] Screenshot key screens to `docs/assets/screenshots/`
- [ ] Log all viva questions to `viva/02-VIVA_QUESTIONS_QA.md`
- [ ] Note what went wrong (if anything)
- [ ] Save demo video to backup location
- [ ] Update demo script with learnings
- [ ] Rest well

### 12.6 Recovery checklist (if demo fails)

If a step fails mid-demo:

1. **Stay calm** — panel expects minor issues
2. **Try quick fix** — restart API if needed, or enable mock mode
3. **If fix > 30 sec** — switch to backup video
4. **Narrate over video** — "here's the same flow recorded earlier"
5. **Offer to retry live** — "I can show the live version after"
6. **Move on** — don't dwell

**Never:**

- Panic visibly
- Blame the college Wi-Fi
- Say "it worked yesterday"
- Show frustration

---

## 13. Staging Deployment

### 13.1 Staging topology

**Diagram: Staging deployment**
*Staging runs on Railway (API + Postgres + Redis) and Vercel (BusVerse + BusCon). Deployed automatically on git push to main. Used for E2E tests, demo rehearsal, and external access if viva panel wants to try it themselves.*

```mermaid
flowchart TB
    GIT["git push<br/>to main"] --> RAILWAY["Railway<br/>auto-deploy"]
    GIT --> VERCEL["Vercel<br/>auto-deploy"]

    RAILWAY --> STG_API["API<br/>api.staging.busverse.app"]
    RAILWAY --> STG_DB[("Postgres<br/>Railway managed")]
    RAILWAY --> STG_REDIS[("Redis<br/>Railway managed")]

    VERCEL --> STG_BV["BusVerse<br/>staging.busverse.app"]
    VERCEL --> STG_BC["BusCon<br/>staging.buscon.app"]
```

### 13.2 Railway setup (API + DB + Redis)

| Step | Action |
|:---:|---|
| 1 | Sign up at [railway.app](https://railway.app) |
| 2 | Create new project → "Empty Project" |
| 3 | Add PostgreSQL plugin (managed) |
| 4 | Add Redis plugin (managed) |
| 5 | Add "Deploy from GitHub" → connect repo |
| 6 | Set root directory: `apps/api` |
| 7 | Add env vars (see §4) with staging values |
| 8 | Deploy |
| 9 | Copy public URL → paste into Vercel env vars |

**Env vars to set on Railway:**

```
DATABASE_URL          → from Railway Postgres plugin
REDIS_URL             → from Railway Redis plugin
JWT_SECRET            → generate fresh
PII_ENCRYPTION_KEY    → generate fresh
QR_SIGNING_PRIVATE_KEY → generate fresh
QR_SIGNING_PUBLIC_KEY  → generate fresh
PHONE_HASH_SALT       → generate fresh
RAZORPAY_KEY_ID       → rzp_test_*
RAZORPAY_KEY_SECRET   → rzp_test_*
RAZORPAY_WEBHOOK_SECRET
CORS_ALLOWED_ORIGINS=https://staging.busverse.app,https://staging.buscon.app
NODE_ENV=production
```

### 13.3 Vercel setup (BusVerse + BusCon)

**BusVerse:**

| Step | Action |
|:---:|---|
| 1 | Sign up at [vercel.com](https://vercel.com) |
| 2 | Import Git repo |
| 3 | Root directory: `apps/busverse` |
| 4 | Framework: Next.js (auto-detected) |
| 5 | Add env vars |
| 6 | Deploy |

**Env vars for BusVerse:**

```
NEXT_PUBLIC_API_URL=https://api.staging.busverse.app
NEXT_PUBLIC_WS_URL=wss://api.staging.busverse.app
```

**BusCon:** repeat with `apps/buscon` and `https://staging.buscon.app`.

### 13.4 Custom domains

**Optional but recommended:**

| Domain | Points to |
|---|---|
| `staging.busverse.app` | Vercel BusVerse |
| `staging.buscon.app` | Vercel BusCon |
| `api.staging.busverse.app` | Railway API |

**Setup:**

1. Buy domain (Namecheap, Cloudflare, ~₹800/year)
2. Add CNAME records per Vercel/Railway dashboard
3. Wait for DNS propagation (5–30 min)
4. SSL auto-provisioned by Vercel/Railway

**Free alternative:** use Vercel's free subdomains — `busverse-staging.vercel.app` and `buscon-staging.vercel.app`.

### 13.5 Webhook for staging

Razorpay webhooks need a public URL. On staging, use:

```
https://api.staging.busverse.app/v1/webhooks/razorpay
```

Configure in Razorpay dashboard → Webhooks.

**For local + Razorpay webhooks:**

Use ngrok:

```bash
ngrok http 4000
```

Copy the public URL: `https://abc123.ngrok.io`

Paste into Razorpay webhook config.

**Note:** ngrok free tier URL changes on each restart. Reconfigure Razorpay webhook each time.

### 13.6 Staging deployment commands

**Manual deploy (Railway):**

```bash
railway up
```

**Manual deploy (Vercel):**

```bash
vercel --prod
```

**Auto-deploy:** any push to `main` triggers both.

### 13.7 Staging DB seed

First-time seed on staging:

```bash
railway run pnpm db:seed
```

**Warning:** production data is fake — `is_test = true` on all rows.

---

## 14. Production Deployment

### 14.1 Production topology

**Diagram: Production deployment**
*Production is not required for viva. Documented for completeness. Same stack as staging but with backups, monitoring, and monitoring alerts.*

```mermaid
flowchart TB
    GIT["git push<br/>to release"] --> CICD["CI/CD<br/>all gates pass"]
    CICD --> RAILWAY["Railway<br/>prod API"]
    CICD --> VERCEL["Vercel<br/>prod web"]

    RAILWAY --> PROD_DB[("Prod Postgres<br/>backups enabled")]
    RAILWAY --> PROD_REDIS[("Prod Redis<br/>persistent")]

    RAILWAY --> MON["Sentry<br/>+ logs"]
    PROD_DB --> BACKUP["Backups<br/>WAL + daily + weekly"]
```

### 14.2 Production vs staging

| Aspect | Staging | Production |
|---|---|---|
| Razorpay | Test mode | Live mode (KYC required) |
| Data | Seeded test data | Real user data |
| Backups | None | WAL + daily + weekly |
| Monitoring | Basic | Sentry + logs + alerts |
| Domain | `staging.busverse.app` | `busverse.app` |
| Deploy | Auto on `main` | Auto on `release` + approval |

### 14.3 Production checklist (deferred)

Not required for Phase 1. Documented for Phase 2:

- [ ] Razorpay live mode (KYC completed)
- [ ] SSL certificates (Vercel/Railway auto)
- [ ] Domain registered (`busverse.app`)
- [ ] Backups enabled + tested restore
- [ ] Sentry configured with production DSN
- [ ] Log aggregation (Loki/CloudWatch)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] On-call rotation (N/A Phase 1, solo)
- [ ] DPDP compliance artifacts (privacy policy, DPA)
- [ ] `security.txt` published
- [ ] Vulnerability disclosure page live

**Rule:** never deploy to production without the guide's approval.

---

## 15. Troubleshooting

### 15.1 Troubleshooting decision tree

**Diagram: Troubleshooting decision tree**
*Start with a symptom. Each branch leads to a likely cause and a fix. Most issues are setup problems, not code problems.*

```mermaid
flowchart TD
    SYMPTOM["Symptom observed"]

    SYMPTOM --> Q1{"Symptom type?"}

    Q1 -->|"Cannot connect"| DB["DB / Redis not running<br/>→ check docker ps"]

    Q1 -->|"API 500 error"| LOG["Check API logs<br/>→ look for stack trace"]

    Q1 -->|"401/403 error"| AUTH["Auth issue<br/>→ check JWT / session"]

    Q1 -->|"CORS error"| CORS["Origin not whitelisted<br/>→ update CORS_ALLOWED_ORIGINS"]

    Q1 -->|"Build fails"| BUILD["Dependency or type issue<br/>→ pnpm clean + reinstall"]

    Q1 -->|"Port in use"| PORT["Kill process<br/>→ lsof -i :PORT"]

    Q1 -->|"Seed fails"| SEED["FK order issue<br/>→ db:reset + seed"]

    Q1 -->|"Razorpay fails"| RZP["Key or webhook issue<br/>→ regenerate + retest"]
```

### 15.2 Common issues and fixes

| Symptom | Cause | Fix |
|---|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:5432` | Postgres not running | `docker compose up -d` |
| `Error: connect ECONNREFUSED 127.0.0.1:6379` | Redis not running | `docker compose up -d` |
| `ECONNRESET` on WebSocket | WS server not running | Restart API |
| `Migration failed: relation already exists` | Schema drift | `pnpm db:migrate:reset` |
| `Seed failed: foreign key violation` | Wrong script order | `pnpm db:reset && pnpm db:seed` |
| `Razorpay: Authentication failed` | Wrong keys | Copy keys again from dashboard |
| `Razorpay webhook 401` | Wrong webhook secret | Regenerate secret, update `.env` |
| `CORS: origin not allowed` | Localhost port not whitelisted | Add to `CORS_ALLOWED_ORIGINS` |
| `EADDRINUSE :::4000` | Port 4000 in use | `lsof -i :4000` then `kill -9 PID` |
| `pnpm: command not found` | pnpm not installed | `npm install -g pnpm@9` |
| `Node.js version too old` | Node < 20 | Install Node 20 LTS |
| Blank map | OSM tiles blocked | Use static fallback image |
| OTP not received | Firebase not configured | Set `MOCK_OTP=true` |
| `JWT expired` immediately | Wrong JWT TTL | Check JWT config |
| `Invalid QR signature` | Mismatched key | Regenerate keys, restart API |

### 15.3 Diagnostic commands

**Check services:**

```bash
docker ps                          # Postgres + Redis running?
curl http://localhost:4000/v1/health   # API responding?
```

**Check logs:**

```bash
docker logs busverse-postgres
docker logs busverse-redis
# API logs are in the terminal where `pnpm --filter api dev` is running
```

**Check DB:**

```bash
docker exec -it busverse-postgres psql -U postgres -d busverse -c "SELECT COUNT(*) FROM users;"
```

**Check Redis:**

```bash
docker exec -it busverse-redis redis-cli -a redis_dev_password ping
```

**Check env vars loaded:**

```bash
# In the API process
node -e "console.log(process.env.DATABASE_URL)"
```

### 15.4 Escalation

If troubleshooting fails after 15 minutes:

1. **Restart everything:** `docker compose down -v && docker compose up -d && pnpm db:migrate && pnpm db:seed`
2. **Still fails:** delete `.env`, copy from `.env.example`, regenerate all secrets
3. **Still fails:** `git clean -fdx && pnpm install && restart`
4. **Still fails:** reach out to guide or use backup video for demo

---

## 16. Rollback

### 16.1 Rollback scenarios

**Diagram: Rollback scenarios**
*Four rollback scenarios based on severity. Each has a defined procedure and time budget. Rollback restores last-known-good state.*

```mermaid
flowchart TB
    BUG["Bug in deployed env"] --> SEV{"Severity?"}
    SEV -->|SEV1| R1["Rollback deploy<br/>≤ 5 min"]
    SEV -->|SEV2| R2["Rollback code<br/>≤ 15 min"]
    SEV -->|SEV3| R3["Feature flag off<br/>≤ 1 min"]
    SEV -->|SEV4| R4["Hotfix forward<br/>≤ 1 hour"]

    R1 --> REC["Service restored"]
    R2 --> REC
    R3 --> REC
    R4 --> REC
```

### 16.2 Rollback table

| Severity | Trigger | Rollback | Time |
|---|---|---|---|
| **SEV1** | Data loss, total outage | Railway rollback to last green deploy + DB restore | 5 min |
| **SEV2** | Feature broken, money at risk | `git revert` + redeploy | 15 min |
| **SEV3** | Specific bug | Feature flag off | 1 min |
| **SEV4** | Minor issue | Hotfix forward | 1 hour |

### 16.3 Railway rollback

```
1. Open Railway dashboard
2. Select API service
3. Deployments tab
4. Find last known-good deploy
5. Click "Redeploy"
```

**Verify:** health check passes on new (old) version.

### 16.4 Vercel rollback

```
1. Open Vercel dashboard
2. Select project
3. Deployments tab
4. Find last green deployment
5. Click "Promote to Production"
```

### 16.5 Database rollback

**From daily backup:**

```bash
# On Railway: download backup
railway run pg_restore -d $DATABASE_URL backup.sql

# Locally
docker exec -i busverse-postgres psql -U postgres -d busverse < backup.sql
```

**Warning:** DB rollback loses all data since backup. Use only for SEV1.

### 16.6 Feature flag rollback

For SEV3, if a feature is behind a flag:

```
1. Log into BusCon admin
2. Feature flags page
3. Toggle flag to off
4. Feature disabled within 1 min
```

**Requirement:** features behind flags must be able to fail gracefully.

### 16.7 Post-rollback

- Verify health check passes
- Verify core flows work (run smoke tests)
- Log incident to audit log
- Post-mortem within 24h per `09` §20

---

## 17. Post-Demo

### 17.1 Post-demo flow

**Diagram: Post-demo procedures**
*After viva ends. Four phases — save artifacts, stop services, capture learnings, prepare for follow-up. Total time: ~30 minutes.*

```mermaid
flowchart LR
    DONE["Viva done"] --> S1["Save artifacts<br/>screenshots · logs · video"]
    S1 --> S2["Stop services<br/>docker down · Ctrl+C"]
    S2 --> S3["Capture learnings<br/>Q&A · what worked"]
    S3 --> S4["Prepare follow-up<br/>report updates"]
```

### 17.2 Save artifacts

**Screenshots** — export key screens to `docs/assets/screenshots/`:

| Screenshot | Source |
|---|---|
| `01-search.png` | BusVerse search results |
| `02-seat-deck.png` | Seat selection |
| `03-razorpay.png` | Razorpay checkout |
| `04-ticket-qr.png` | QR ticket |
| `05-driver-trips.png` | Operator App today's trips |
| `06-trip-active.png` | Active trip with GPS |
| `07-scan-result.png` | Successful scan |
| `08-audit-log.png` | BusCon audit log |

**Audit log export:**

```bash
docker exec busverse-postgres psql -U postgres -d busverse -c "
  SELECT entity_type, entity_id, action, actor_id, occurred_at
  FROM audit_logs
  ORDER BY occurred_at DESC
  LIMIT 50;
" > report/audit-log-export.txt
```

**Video:** if you recorded the demo, save to `docs/assets/demo-recorded.mp4`.

### 17.3 Stop services

```bash
# Stop all pnpm apps
Ctrl+C in each terminal

# Stop Docker containers (keep volumes)
docker compose down

# Optional: remove volumes too (loses all data)
# docker compose down -v
```

### 17.4 Capture learnings

**Log all viva questions** to `viva/02-VIVA_QUESTIONS_QA.md`:

```markdown
### Q: How does seat locking work?
A: Redis `SET NX` plus Postgres unique constraint on (schedule_id, seat_id)...

### Q: Why Ed25519 for QR?
A: Small signature (64 bytes), fast verification on mobile...
```

**Note what worked and what didn't:**

```markdown
### What worked well
- The 9-step demo flow
- Live tracking via WebSocket
- Audit log showing full trace

### What to improve
- Seat deck rendering was slow on the phone
- Forgot to mention audit log during scan step
```

### 17.5 Update report

Update `report/17-RESULTS_OUTPUT.md` with:

- Demo observations
- Actual timings vs planned
- Screenshots
- Audit log export
- Any deviations from plan

### 17.6 Update demo script

After viva, update `§10` in this doc with learnings:

- What steps ran faster/slower than expected
- What narration worked
- What fallbacks were used
- What questions came up

**Rule:** every demo improves the next demo.

---

## 18. Smoke Tests

### 18.1 Smoke test flow

**Diagram: Smoke test flow**
*Ten automated smoke tests run before demo. Each verifies one subsystem. All must pass. Script runs in ~30 seconds.*

```mermaid
flowchart TB
    START["Run smoke tests"] --> T1["1 API health"]
    T1 --> T2["2 DB connectivity"]
    T2 --> T3["3 Cities endpoint"]
    T3 --> T4["4 Search endpoint"]
    T4 --> T5["5 BusVerse home"]
    T5 --> T6["6 BusCon home"]
    T6 --> T7["7 Seed data present"]
    T7 --> T8["8 Auth endpoint"]
    T8 --> T9["9 WebSocket connect"]
    T9 --> T10["10 Razorpay config"]
    T10 --> DONE["✓ Demo ready"]
```

### 18.2 Automated smoke test

```bash
#!/bin/bash
# scripts/demo-smoke-test.sh

set -e

echo "1. API health..."
curl -fs http://localhost:4000/v1/health | grep -q "ok"

echo "2. DB connectivity..."
curl -fs http://localhost:4000/v1/public/cities | grep -q "Delhi"

echo "3. Cities count..."
COUNT=$(curl -s http://localhost:4000/v1/public/cities | jq length)
[ "$COUNT" = "3" ]

echo "4. Search endpoint..."
curl -fs http://localhost:4000/v1/public/search > /dev/null

echo "5. BusVerse home..."
curl -fs http://localhost:3000 > /dev/null

echo "6. BusCon home..."
curl -fs http://localhost:3001 > /dev/null

echo "7. Seed data..."
pnpm db:verify

echo "8. Auth endpoint..."
curl -fs -X POST http://localhost:4000/v1/passenger/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999"}' > /dev/null

echo "9. WebSocket port..."
nc -z localhost 4000

echo "10. Razorpay config..."
grep -q "rzp_test_" .env

echo ""
echo "✓ All smoke tests passed — demo ready"
```

### 18.3 Manual smoke test

Even with automation, do a manual run-through at T-1 hour:

1. Open BusVerse on laptop
2. Open BusCon on second tab
3. Open Operator App on phone
4. Run the 9-step demo end-to-end
5. Confirm all pass criteria met

**Time:** 8–10 min.

**Rule:** don't skip manual smoke. Automation catches services; manual catches UX.

### 18.4 Smoke test failures

If any smoke test fails:

| Failure | Fix |
|---|---|
| API health fails | Restart API (`Ctrl+C`, `pnpm --filter api dev`) |
| DB connectivity fails | Restart Postgres (`docker compose restart postgres`) |
| Cities count ≠ 3 | Re-seed (`pnpm db:seed`) |
| Search fails | Check `pnpm db:verify` |
| BusVerse home fails | Restart BusVerse (`Ctrl+C`, `pnpm --filter busverse dev`) |
| BusCon home fails | Restart BusCon |
| Auth fails | Check Firebase config |
| WebSocket port fails | Restart API |
| Razorpay config missing | Add keys to `.env` |

---

## 19. Open Questions

| # | Question | Owner | Default |
|:---:|---|---|---|
| 1 | Ship with mock mode defaults false or true? | Shaghaf | False (real mode) |
| 2 | Use ngrok or Railway public URL for demo webhook? | Shaghaf | Railway (stable) |
| 3 | Custom domain or free subdomains? | Shaghaf | Free subdomains Phase 1 |
| 4 | Backup video on phone or laptop? | Shaghaf | Both (redundancy) |
| 5 | Store `.env` in password manager? | Shaghaf | Yes |
| 6 | Second laptop for redundancy? | Shaghaf | Optional |
| 7 | Expo Go or standalone app for driver demo? | Shaghaf | Expo Go (no build) |
| 8 | Kubernetes for Phase 2? | Shaghaf | No (Railway is enough) |
| 9 | Add `.devcontainer` for VS Code? | Shaghaf | Deferred Phase 2 |
| 10 | Enable auto-deploy on main? | Shaghaf | No (manual first) |

---

## 20. Checklist Against Master List

| Item | Included? | Section |
|---|:---:|---|
| Purpose and 30-min rule | ✅ | §1 |
| Doc hierarchy | ✅ | §1.2 |
| Prerequisites list | ✅ | §2 |
| Prerequisite verification | ✅ | §2.3 |
| Install steps (6) | ✅ | §3 |
| Install failure handling | ✅ | §3.3 |
| Env vars catalog (24) | ✅ | §4 |
| Secret generation | ✅ | §4.3 |
| Ed25519 key generation | ✅ | §4.4 |
| Env security rules | ✅ | §4.5 |
| Razorpay setup | ✅ | §5.2 |
| Firebase Auth setup | ✅ | §5.3 |
| Cloudflare R2 setup | ✅ | §5.4 |
| OSM tiles (no setup) | ✅ | §5.5 |
| Fallback matrix | ✅ | §5.6 |
| Docker Compose stack | ✅ | §6 |
| Migrations | ✅ | §6.3 |
| DB access | ✅ | §6.5 |
| Redis access | ✅ | §6.6 |
| DB backup | ✅ | §6.7 |
| Seed flow | ✅ | §7 |
| What gets seeded | ✅ | §7.2 |
| Demo accounts | ✅ | §7.5 |
| Seed reset | ✅ | §7.6 |
| Running 4 terminals | ✅ | §8.2 |
| Single-command run | ✅ | §8.3 |
| Services matrix | ✅ | §8.4 |
| Phone connection (Expo) | ✅ | §8.5 |
| First-time verification (10 checks) | ✅ | §9 |
| Automated verify script | ✅ | §9.3 |
| Demo timeline | ✅ | §10.1 |
| Pre-demo setup (T-5min) | ✅ | §10.2 |
| 9-step demo script | ✅ | §10.3 |
| Demo pass criteria | ✅ | §10.4 |
| Fallback decision tree | ✅ | §11.1 |
| Fallback matrix | ✅ | §11.2 |
| Mock mode setup | ✅ | §11.3 |
| Backup video | ✅ | §11.4 |
| Demo day checklist | ✅ | §12 |
| Recovery checklist | ✅ | §12.6 |
| Staging deployment | ✅ | §13 |
| Railway setup | ✅ | §13.2 |
| Vercel setup | ✅ | §13.3 |
| Custom domain | ✅ | §13.4 |
| Webhook for staging | ✅ | §13.5 |
| Production deployment | ✅ | §14 |
| Production vs staging | ✅ | §14.2 |
| Production checklist (deferred) | ✅ | §14.3 |
| Troubleshooting tree | ✅ | §15.1 |
| Common issues table | ✅ | §15.2 |
| Diagnostic commands | ✅ | §15.3 |
| Rollback scenarios | ✅ | §16 |
| Post-demo procedures | ✅ | §17 |
| Smoke test flow | ✅ | §18 |
| Automated smoke test | ✅ | §18.2 |
| Manual smoke test | ✅ | §18.3 |

**All items covered. ~30 Mermaid diagrams. Every diagram described.**

---

## 21. Summary

**BusVerse + BusCon Phase 1 has a complete operational playbook across 21 sections and ~30 diagrams.** Setup requires six prerequisites (Node 20, pnpm 9, Docker Desktop, Git, Chrome, VS Code), runs in under 30 minutes, and follows six sequential install steps (clone, install, env, docker-compose, migrate, seed) each with verification. Twenty-four environment variables are catalogued across three `.env` files, with eight secret-generation commands and a locked Ed25519 QR signing key procedure. Four external services are documented with setup steps and free tiers — Razorpay test mode (15 min, no KYC), Firebase Auth for OTP (10 min, no DLT registration), Cloudflare R2 for uploads (10 min, 10 GB free), and OSM map tiles (zero setup) — plus a fallback matrix that lets every external service fail without blocking the demo. Database setup uses Docker Compose with Postgres 16 and Redis 7 (both with health checks and persistent volumes), migrations create all 29 tables in ~10 seconds, and seed scripts insert ~340 rows across 12 tables in under 5 seconds with idempotent UPSERTs and a `pnpm db:verify` command that confirms exact counts. Running locally uses four terminals (API 4000, BusVerse 3000, BusCon 3001, Operator App via Expo 8081) or a single `pnpm dev` command that runs all four via Turborepo. First-time verification runs 10 manual or automated checks that must all pass before demo — API health, DB connectivity, cities count, search endpoint, BusVerse home, BusCon home, seed data present, auth endpoint, WebSocket port, Razorpay config — plus a `scripts/verify-demo-ready.sh` that automates them. The demo script is a 9-step, 8-minute flow (search, seat lock, payment, ticket, driver login, trip start, live tracking, scan+audit, wrap) with per-step narration, screen transitions, and pass criteria — all seven steps trace back to the WF-X-01 workflow in `08`. Fallback plans use a decision tree covering Razorpay failures (`MOCK_PAYMENT=true`), OTP failures (`MOCK_OTP=true`), internet loss (all localhost), GPS failure (simulated positions), WebSocket failure (manual polling refresh), map tile failures (static image), and total failure (backup video recorded at T-1 day). Demo day checklists split into three phases — T-1 day (record video, test flow, backup data), T-1 hour (start services, run smoke tests, print script), and during demo (follow 9-step script, use fallbacks if needed, stay calm) — plus a post-demo checklist (stop services, save artifacts, log Q&A) and a recovery checklist for mid-demo failures. Staging deployment uses Railway (API + Postgres + Redis) and Vercel (BusVerse + BusCon), with automatic deployment on `git push` to `main`, custom domains optional but recommended, and webhook configuration via `api.staging.busverse.app` or ngrok for local. Production deployment is documented but deferred — same stack with backups, monitoring, and Sentry. Troubleshooting has a decision tree for 15+ common issues (Postgres not running, migration drift, Razorpay failures, CORS errors, port conflicts, blank maps, missing OTPs) with fixes, plus diagnostic commands (docker ps, docker logs, curl health, psql queries). Rollback scenarios cover four severities (SEV1 = Railway rollback + DB restore in 5 min, SEV2 = git revert + redeploy in 15 min, SEV3 = feature flag off in 1 min, SEV4 = hotfix forward in 1 hour) with Railway and Vercel rollback procedures. Post-demo procedures save artifacts (8 screenshots, audit log export, demo video), stop services (`docker compose down`, Ctrl+C in each terminal), capture learnings (viva Q&A, what worked, what didn't), and update the report and demo script. Smoke tests run 10 automated checks in ~30 seconds via `scripts/demo-smoke-test.sh` (API health, DB connectivity, cities count, search, both web apps, seed data, auth, WebSocket port, Razorpay config) plus a manual 9-step run-through at T-1 hour, with a failure→fix table for each smoke test. Ten open questions remain, all with Phase-2-decidable defaults (mock modes off by default, Railway URLs over ngrok, free subdomains over custom domains, backup video on both phone and laptop, Expo Go over standalone builds).**

---

**End of Document `11-DEPLOYMENT-AND-DEMO.md` v1.0.**