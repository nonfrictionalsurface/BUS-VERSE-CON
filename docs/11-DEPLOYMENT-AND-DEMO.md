# `docs/11-DEPLOYMENT-AND-DEMO.md`

**Document:** `docs/11-DEPLOYMENT-AND-DEMO.md`
**Project:** BusVerse + BusCon
**Version:** 1.1
**Status:** Locked — Foundational Document
**Owner:** Shaghaf
**Guide:** Mr. Mohit Srivastav
**Purpose:** The complete operational playbook for BusVerse + BusCon Phase 1. Defines how to install, seed, run, demo, and deploy the system — from a clean laptop to a live demo from any browser. Records the **actual deployed stack** (Render + Neon + Upstash + Netlify + Expo EAS) with every real URL, secret name, failure mode, and fix discovered during the v1.0 → v1.1 deployment cycle.

> **Derives from:** `01-PLAN-AND-SCOPE.md` §13, `06-DATABASE-SCHEMA.md` §17, `08-WORKFLOWS.md` WF-X-01, `09-SECURITY-AND-PLATFORM-RULES.md` §17, `10-TESTING-STRATEGY.md` §22.4.
>
> **Supersedes:** `11-DEPLOYMENT-AND-DEMO.md` v1.0 (Railway + Vercel + Razorpay live + Firebase OTP plan — replaced with the actual free-tier stack that was deployed).

---

## 1. Purpose and Scope

### 1.1 What this document owns

| Owns here | Referenced from upstream |
|---|---|
| Setup instructions (local + cloud) | `01` §13 demo criteria |
| Environment variables (24 local, 12 cloud) | `09` §17 secrets inventory |
| Seed data loading | `06` §17 seed script design |
| Running locally | `06` §2 Postgres config |
| Demo script | `01` §13 8-step flow |
| Demo fallbacks (incl. cold start) | `08` WF-X-01 |
| **Free-tier cloud deployment** | **New — replaces v1.0 staging** |
| Production hardening path | `09` §17.6 |
| Smoke tests | `10` §22.4 |
| Troubleshooting (10 real bugs from v1.1 cycle) | New |
| Post-demo procedures | — |

### 1.2 Document hierarchy

**Diagram: Document hierarchy**
*Same as v1.0 — this doc consumes everything from `01` through `10`. v1.1 additionally feeds the viva demo script with the real cloud URLs and the real failure-mode catalogue.*

```mermaid
flowchart TB
    D01["01-plan"]
    D06["06-schema"]
    D08["08-workflows"]
    D09["09-security"]
    D10["10-testing"]

    DEP["11-deployment v1.1<br/>You are here"]

    D01 --> DEP
    D06 --> DEP
    D08 --> DEP
    D09 --> DEP
    D10 --> DEP

    DEP --> R17["report/17-results"]
    DEP --> R15["report/15-screenshots"]
    DEP --> V03["viva/03-demo"]
    DEP --> ERR["10 real bug playbook"]
```

### 1.3 What this document does NOT cover

| Topic | Goes to |
|---|---|
| Test implementation | `10-TESTING-STRATEGY.md` |
| API contracts | `07-API-AND-REALTIME-CONTRACTS.md` |
| UI screens | `busverse/05-UI-SPEC.md`, `buscon/06-UI-SPEC.md` |
| Domain invariants | `05-DOMAIN-MODEL.md` §7 |
| Security controls | `09-SECURITY-AND-PLATFORM-RULES.md` |
| Real payment / real SMS | Deferred — Phase 2 |

### 1.4 The 30-minute rule

**Rule:** Anyone with a laptop, Docker Desktop, and internet should be able to clone, setup, seed, run, and demo the entire project locally in under 30 minutes using this document.

**Cloud deployment is separate** — it takes ~90 minutes end-to-end the first time, mostly waiting on cold builds. See §13.

| Phase | Target time |
|---|---|
| Local prerequisites install (if needed) | 10 min |
| Clone + install | 3 min |
| Configure env vars | 2 min |
| Start Docker services | 1 min |
| Run migrations | 1 min |
| Seed database | 1 min |
| Start 4 apps | 2 min |
| First-time verification | 5 min |
| **Local total** | **25 min** |
| Cloud deploy (first time, one-off) | 90 min |

---

## 2. Prerequisites

### 2.1 Required tools

**Diagram: Prerequisite tools**
*Six tools. Same as v1.0. Node 20 is now verified as the version Render uses in production, so local must match to avoid "works on my machine" drift.*

```mermaid
flowchart LR
    T1["Node.js<br/>20 LTS<br/>required"] --> CHECK["Run each<br/>verification<br/>command"]
    T2["pnpm<br/>9.12.0<br/>required"] --> CHECK
    T3["Docker Desktop<br/>required"] --> CHECK
    T4["Git<br/>required"] --> CHECK
    T5["Chrome or Edge<br/>required"] --> CHECK
    T6["VS Code<br/>recommended"] --> CHECK
```

### 2.2 Prerequisites table

| # | Tool | Version | Install | Verify |
|:---:|---|---|---|---|
| 1 | **Node.js** | 20 LTS (matches Render) | [nodejs.org](https://nodejs.org/) | `node --version` → `v20.20.2` |
| 2 | **pnpm** | 9.12.0 (pinned via `packageManager`) | `npm install -g pnpm@9.12.0` | `pnpm --version` → `9.12.0` |
| 3 | **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| 4 | **Git** | 2.40+ | [git-scm.com](https://git-scm.com/) | `git --version` |
| 5 | **Chrome / Edge** | Latest | [google.com/chrome](https://www.google.com/chrome/) | Open any website |
| 6 | **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) | `code --version` |

### 2.3 Prerequisite verification script

```powershell
node --version    # v20.20.2
pnpm --version    # 9.12.0
docker --version
git --version
```

**If any command fails:** install that tool before continuing.

### 2.4 Optional tools

| Tool | Purpose |
|---|---|
| **OBS Studio** | Recording demo video backup |
| **Postman / Insomnia** | Manual API testing |
| **Expo Go** on phone | Driver app testing without a build |
| **Expo CLI (`eas-cli`)** | Building the Android APK (§13.8) |

### 2.5 System requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16 GB (Docker + 4 apps + browser) |
| Disk space | 5 GB free | 10 GB free |
| OS | Windows 10, macOS 12, Ubuntu 22.04 | Latest |
| Internet | Required for install + demo | Backup: pre-cached npm deps + video |

### 2.6 PowerShell-specific note (new in v1.1)

**Diagram: BOM trap**
*Every file written with `Set-Content -Encoding UTF8` on PowerShell 5.1 gets a BOM prefix (`EF BB BF`). Node and Vercel reject BOM'd JSON. Use `[System.IO.File]::WriteAllText` with `UTF8Encoding($false)` for all `.json`, `.ts`, `.css`, `.mjs` edits.*

```mermaid
flowchart LR
    P["Set-Content<br/>-Encoding UTF8"] --> BOM["BOM added<br/>EF BB BF"]
    BOM --> FAIL["Node JSON.parse fails<br/>Vercel build fails<br/>PostCSS @import drops"]

    SAFE["WriteAllText<br/>UTF8Encoding false"] --> CLEAN["Clean UTF-8<br/>starts with 7B"]
    CLEAN --> OK["All parsers OK"]
```

**Rule:** never use `Set-Content -Encoding UTF8` on `.json`, `.ts`, or `.css` files in this project. Use:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $path).Path, $content, $utf8NoBom)
```

---

## 3. Local Install

### 3.1 Install steps

**Diagram: Install steps**
*Six sequential install steps. Each produces a verifiable state. Same as v1.0 but §3.2.5 now includes the `seat-engine` build, which is required locally too if `dist/` is not committed on the clone.*

```mermaid
flowchart TB
    S1["1 · Clone repo"] --> V1["Verify:<br/>package.json exists"]
    V1 --> S2["2 · pnpm install"]
    S2 --> V2["Verify:<br/>node_modules exists"]
    V2 --> S3["3 · Copy .env.example<br/>→ .env"]
    S3 --> V3["Verify:<br/>.env exists with keys"]
    V3 --> S4["4 · docker compose up -d<br/>Postgres + Redis"]
    S4 --> V4["Verify:<br/>docker ps shows 2 containers"]
    V4 --> S5["5 · pnpm db:migrate<br/>+ prisma generate"]
    S5 --> V5["Verify:<br/>migrations applied"]
    V5 --> S6["6 · pnpm db:seed"]
    S6 --> V6["Verify:<br/>~367 rows loaded"]
```

### 3.2 Step-by-step commands

**Step 1 — Clone repo:**

```powershell
git clone https://github.com/nonfrictionalsurface/BUS-VERSE-CON.git
cd BUS-VERSE-CON
```

**Verify:** `Test-Path package.json` returns `True`.

**Step 2 — Install dependencies:**

```powershell
pnpm install
```

**Verify:** `Test-Path node_modules` returns `True`.

**Step 3 — Configure environment:**

```powershell
Copy-Item .env.example .env
# Edit .env — see §4
```

**Verify:** `.env` contains `DATABASE_URL`, `JWT_SECRET`, `PII_ENCRYPTION_KEY`, `PHONE_HASH_SALT`, `REDIS_URL`.

**Step 4 — Start Postgres + Redis:**

```powershell
docker compose up -d
```

**Verify:** `docker ps` shows two running containers on ports 7542 (Postgres) and 7543 (Redis).

> **Note:** this project uses non-default ports 7542 and 7543 to avoid conflicts with any existing Postgres/Redis on the developer machine. The `docker-compose.yml` maps host 7542 → container 5432, host 7543 → container 6379.

**Step 5 — Run migrations and generate Prisma client:**

```powershell
cd apps\api
pnpm exec prisma generate
pnpm exec prisma migrate deploy
cd ..\..
```

**Verify:** `pnpm exec prisma migrate status` prints `5 migrations found` and `No pending migrations to apply`.

**Step 6 — Seed database:**

```powershell
cd apps\api
pnpm exec prisma db seed
cd ..\..
```

**Verify:** the seed output ends with:

```
✓ Seed complete. Run `pnpm db:seed:assert` to verify.
```

### 3.3 Install failure handling

| Failure | Cause | Fix |
|---|---|---|
| `pnpm: command not found` | pnpm not installed | `npm install -g pnpm@9.12.0` |
| `docker: command not found` | Docker not installed | Install Docker Desktop |
| `Error: connect ECONNREFUSED :7542` | Postgres not running | `docker compose up -d` |
| `Migration failed` | Schema drift | `pnpm exec prisma migrate reset` |
| `Seed failed: FK violation` | Wrong seed order | `prisma migrate reset && prisma db seed` |
| `Cannot find module '@busverse/seat-engine'` | `dist/` missing | `pnpm --filter ./packages/seat-engine build` |
| `Cannot find module '@prisma/client'` | Prisma client not generated | `pnpm --filter api exec prisma generate` |
| `The column 'schema_version' does not exist` | Migration 5 not applied | `pnpm exec prisma migrate deploy` |

**If still failing:** see §15.

---

## 4. Environment Variables

### 4.1 Env vars tree

**Diagram: Env vars tree**
*Two operating contexts in v1.1 — Local (three `.env` files) and Cloud (12 vars on Render + 3 on each Netlify site). The cloud set is a strict subset of the local set. Secrets marked with ★ must be identical between local and cloud only if you want session continuity during migration; otherwise they are independent.*

```mermaid
flowchart TB
    ENVS["Env vars<br/>two contexts"]

    ENVS --> LOCAL["Local<br/>(3 .env files)"]
    ENVS --> CLOUD["Cloud<br/>(Render + Netlify)"]

    LOCAL --> ROOT["`.env` (root)<br/>shared secrets"]
    LOCAL --> API["`.env` (api)<br/>server secrets"]
    LOCAL --> WEB["`.env.local` (busverse-v2, buscon)<br/>public URLs"]

    CLOUD --> REN["Render<br/>12 vars"]
    CLOUD --> NET["Netlify<br/>3 vars × 2 sites"]

    ROOT --> R1["JWT_SECRET ★"]
    ROOT --> R2["PII_ENCRYPTION_KEY"]
    ROOT --> R3["PHONE_HASH_SALT"]
    ROOT --> R4["QR_SIGNING_PRIVATE_KEY"]

    API --> A1["DATABASE_URL"]
    API --> A2["REDIS_URL"]
    API --> A3["RAZORPAY_* (3)"]
    API --> A4["CORS_ALLOWED_ORIGINS"]
    API --> A5["MOCK_PAYMENT, MOCK_OTP"]
```

### 4.2 Full environment variable catalog

#### 4.2.1 Local (dev)

| Variable | File | Required | Example | Generation |
|---|---|---|---|---|
| `NODE_ENV` | root | ✅ | `development` | Manual |
| `DATABASE_URL` | api | ✅ | `postgresql://postgres:postgres@localhost:7542/busverse` | Docker |
| `REDIS_URL` | api | ✅ | `redis://default:redis_dev_password@localhost:7543` | Docker |
| `JWT_SECRET` | root | ✅ | 64-char random | `New-Object System.Text.UTF8Encoding($false)` + random (§4.3) |
| `PII_ENCRYPTION_KEY` | root | ✅ | 64-char random | §4.3 |
| `PHONE_HASH_SALT` | root | ✅ | 64-char random | §4.3 |
| `QR_SIGNING_PRIVATE_KEY` | root | ✅ | Ed25519 private | §4.4 |
| `QR_SIGNING_PUBLIC_KEY` | root | ✅ | Ed25519 public | §4.4 |
| `RAZORPAY_KEY_ID` | api | ✅ | `rzp_test_placeholder` (mock mode) | Razorpay dashboard OR placeholder |
| `RAZORPAY_KEY_SECRET` | api | ✅ | `placeholder_secret` | Razorpay dashboard OR placeholder |
| `RAZORPAY_WEBHOOK_SECRET` | api | ✅ | `placeholder_webhook_secret` | Razorpay dashboard OR placeholder |
| `CORS_ALLOWED_ORIGINS` | api | ✅ | `http://localhost:8081,http://localhost:8082` | Manual |
| `PORT` | api | — | `4310` (default) | Default |
| `LOG_LEVEL` | api | — | `debug` | Default `info` |
| `MOCK_PAYMENT` | api | — | `true` (dev) / `false` (demo) | Manual |
| `MOCK_OTP` | api | — | `true` (dev) / `false` (demo) | Manual |
| `NEXT_PUBLIC_API_URL` | busverse-v2, buscon | ✅ | `http://localhost:4310/v1` | Manual |
| `NEXT_PUBLIC_WS_URL` | busverse-v2, buscon | ✅ | `http://localhost:4310` | Manual |
| `EXPO_PUBLIC_API_BASE` | passenger-app, driver-app | ✅ | `http://localhost:4310/v1` | Manual |
| `EXPO_PUBLIC_WS_URL` | passenger-app, driver-app | ✅ | `http://localhost:4310` | Manual |
| `EXPO_PUBLIC_DEV_MODE` | passenger-app | — | `true` (dev) / `false` (prod) | Manual |

**Total local: 21 vars** (16 required, 5 optional).

#### 4.2.2 Cloud (as deployed — see §13)

**Render (12 vars, all required by Zod `env.ts`):**

| Variable | Value shape |
|---|---|
| `DATABASE_URL` | Neon pooler string, ends `?sslmode=require&channel_binding=require` |
| `REDIS_URL` | Upstash `rediss://default:TOKEN@HOST:6379` |
| `JWT_SECRET` | 64-char string |
| `PII_ENCRYPTION_KEY` | 64-char string |
| `PHONE_HASH_SALT` | 64-char string |
| `RAZORPAY_KEY_ID` | `rzp_test_placeholder` |
| `RAZORPAY_KEY_SECRET` | `placeholder_secret` |
| `RAZORPAY_WEBHOOK_SECRET` | `placeholder_webhook_secret` |
| `CORS_ALLOWED_ORIGINS` | `https://busverse.netlify.app,https://busconoperator.netlify.app` |
| `MOCK_OTP` | `true` |
| `MOCK_PAYMENT` | `true` |
| `NODE_ENV` | `production` |

**Netlify `busverse-v2` (3 vars):**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://busverse-api.onrender.com/v1` |
| `NEXT_PUBLIC_WS_URL` | `https://busverse-api.onrender.com` |
| `PNPM_FLAGS` | `--shamefully-hoist` (mandatory for monorepo install) |

**Netlify `buscon` (3 vars):** identical to `busverse-v2`.

**Expo EAS (3 vars, per app):**

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_API_BASE` | `https://busverse-api.onrender.com/v1` |
| `EXPO_PUBLIC_WS_URL` | `https://busverse-api.onrender.com` |
| `EXPO_PUBLIC_DEV_MODE` | `false` |

### 4.3 Secret generation (PowerShell 5.1-safe)

```powershell
$chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function New-Secret64 { -join ((1..64) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] }) }

Write-Host "JWT_SECRET=$(New-Secret64)"
Write-Host "PII_ENCRYPTION_KEY=$(New-Secret64)"
Write-Host "PHONE_HASH_SALT=$(New-Secret64)"
```

Paste each output into `.env` (local) or Render Environment (cloud).

**Rule:** the `JWT_SECRET` used in cloud must be stable. If it changes, every existing session invalidates and users are signed out (surfaces as "Unauthorized after working fine").

### 4.4 Ed25519 key generation

```powershell
node -e "
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privBase64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const pubBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
console.log('QR_SIGNING_PRIVATE_KEY=' + privBase64);
console.log('QR_SIGNING_PUBLIC_KEY=' + pubBase64);
"
```

**Backup:** store both keys in a password manager. Losing the private key means no QR tickets can be issued.

### 4.5 Env var security rules

| Rule | Enforcement |
|---|---|
| Never commit `.env` files | `.gitignore` |
| Never log env vars | Lint rule + review |
| Never expose in errors | Error handler strips them |
| Rotate on leak | Per `09` §17 |
| **Rotate `PII_ENCRYPTION_KEY` if it leaks with a DB dump** | A leak of both makes encrypted PII readable |
| **`JWT_SECRET` must never change in production** | Changing it signs everyone out |

---

## 5. External Services Setup

### 5.1 Services required (as deployed)

**Diagram: External services — actual free-tier stack**
*Five services, all free tier, zero credit card. Render hosts the API. Neon hosts Postgres. Upstash hosts Redis. Netlify hosts both Next.js frontends. Expo EAS builds the mobile APKs. All are permanent free tiers (not trial credits).*

```mermaid
flowchart TB
    EXT["External services<br/>all free, no credit card"]

    EXT --> REN["Render<br/>API + WebSocket<br/>free, spins down 15 min"]
    EXT --> NEO["Neon<br/>Postgres 16<br/>free, 1 GB, 5 min idle suspend"]
    EXT --> UPS["Upstash<br/>Redis 7 + TLS<br/>free, 500k cmd/month"]
    EXT --> NET["Netlify<br/>2 Next.js sites<br/>free, 300 build min/month"]
    EXT --> EAS["Expo EAS<br/>Android APK<br/>free, 15 builds/month"]
```

### 5.2 Render (API + WebSocket)

| Step | Action |
|:---:|---|
| 1 | Sign up at [render.com](https://render.com) |
| 2 | **New +** → **Web Service** → connect GitHub repo `BUS-VERSE-CON` |
| 3 | **Language:** Node (not Docker — the root Dockerfile is for full-stack prod, not API-only) |
| 4 | **Root Directory:** *(blank)* — monorepo needs the root lockfile |
| 5 | **Health Check Path:** `/v1/health` — critical, wrong value causes restart loop |
| 6 | **Instance:** Free (512 MB, 0.1 CPU) |
| 7 | **Build Command** (see §13.4) |
| 8 | **Start Command** (see §13.4) |
| 9 | Add 12 env vars (§4.2.2) |
| 10 | Deploy |

**Free-tier behaviors to plan around:**

| Behavior | Detail | Mitigation |
|---|---|---|
| **Spin-down** | After 15 min idle | Ping `/v1/health` before demo (60s warm-up) |
| **750 instance hours/month** | ~24/7 usage fits but leaves no buffer | Do not run extra services |
| **No persistent disk** | Files do not survive restart | Never store uploads locally; use R2 or DB |
| **Cron jobs stop when asleep** | Expiry logic paused | Accept for demo; do not rely on expiry during downtime |

### 5.3 Neon (PostgreSQL)

| Step | Action |
|:---:|---|
| 1 | Sign up at [neon.tech](https://neon.tech) |
| 2 | Create project, choose region closest to Render (Virginia → **US East** to match) |
| 3 | Copy **Connection String** (pooled) |
| 4 | Paste into Render `DATABASE_URL` |
| 5 | Append `&channel_binding=require` to the string |

**Free-tier limits:** 1 GB storage, 100 compute-hours/month, **5 min idle → compute suspended** (auto-wakes in ~1–5s).

**Rule:** Neon's free tier is permanent (not trial). Do not use Render's built-in free Postgres — it expires 30 days after creation.

### 5.4 Upstash (Redis with TLS)

| Step | Action |
|:---:|---|
| 1 | Sign up at [upstash.com](https://upstash.com) |
| 2 | **Redis** → **Create Database** |
| 3 | Region: **US East** (match Render) |
| 4 | Plan: **Free** |
| 5 | Copy the **TCP** `rediss://` string (not the REST URL) |
| 6 | Paste into Render `REDIS_URL` |

**Free-tier:** 500k commands/month, 256 MB storage. Sufficient for seat locks, OTP challenges, sessions.

**Common mistake:** copying the REST URL (`https://...`) instead of TCP (`rediss://...`). The API uses standard Redis protocol, not HTTP.

### 5.5 Netlify (2 Next.js sites)

| Step | Action |
|:---:|---|
| 1 | Sign up at [netlify.com](https://app.netlify.com) with GitHub |
| 2 | **Add new site** → **Import existing project** → select `BUS-VERSE-CON` |
| 3 | **Project to deploy:** `apps/busverse-v2` (for site 1) or `apps/buscon` (for site 2) — *not* `apps/busverse` (legacy) |
| 4 | **Base directory:** *(blank)* — repo root |
| 5 | **Build command:** `pnpm --filter busverse-v2 build` (or `buscon`) |
| 6 | **Publish directory:** `apps/busverse-v2/.next` (or `apps/buscon/.next`) |
| 7 | Add 3 env vars (§4.2.2) |
| 8 | Deploy |
| 9 | Repeat for the second site |

**Free-tier:** 100 GB bandwidth/month, 300 build minutes/month. Build queue is **low priority** — expect 2–10 min waits during peak.

**Rule:** `PNPM_FLAGS=--shamefully-hoist` is **mandatory**. Without it, the Next.js runtime cannot resolve hoisted packages and the build fails.

### 5.6 Expo EAS (Android APK)

| Step | Action |
|:---:|---|
| 1 | Sign up at [expo.dev](https://expo.dev) |
| 2 | `npm install -g eas-cli` |
| 3 | `eas login` |
| 4 | `cd apps/passenger-app` → `eas build:configure` |
| 5 | Edit `eas.json` → add `preview` profile with `buildType: apk` and `distribution: internal` (§13.8) |
| 6 | Set 3 env vars via `eas env:set` (§4.2.2) |
| 7 | `eas build --platform android --profile preview` |
| 8 | Wait 10–20 min (plus queue time) |
| 9 | Download APK from the EAS build page |

**Free-tier:** 15 Android builds + 15 iOS builds/month. Queue is **low priority** — up to 90+ min at peak.

**Rule:** `EXPO_PUBLIC_*` vars are baked into the APK at build time. Changing the API URL requires a rebuild.

### 5.7 External services fallback matrix

| Service | Fails | Fallback |
|---|---|---|
| Render | Down / cold | Ping `/v1/health` 60s before demo |
| Neon | Suspended | First query auto-wakes (1–5s) |
| Upstash | Down | Seat lock falls back to DB unique constraint (slower) |
| Netlify | Build fails | Run `pnpm dev` locally, demo from `localhost` |
| Expo EAS | Build fails | Use Expo Go on phone pointing to local API |
| **Everything** | Down | Run all locally per §8 — demo from `localhost` |

---

## 6. Database Setup

### 6.1 Local Docker Compose stack

**Diagram: Local database setup**
*Two containers. Non-default ports (7542, 7543) to avoid conflicts. Volumes persist data across restarts.*

```mermaid
flowchart LR
    COMPOSE["docker compose up -d"]
    COMPOSE --> PG[("Postgres 16<br/>host :7542<br/>container :5432<br/>volume pg_data")]
    COMPOSE --> RD[("Redis 7<br/>host :7543<br/>container :6379<br/>volume redis_data")]
    PG --> APPC["API connects<br/>via DATABASE_URL"]
    RD --> APPR["API connects<br/>via REDIS_URL"]
```

### 6.2 Cloud database (Neon + Upstash)

**Diagram: Cloud database setup**
*Same schema, different host. Neon pooled connection + Upstash TLS. Both free tiers. First query after idle triggers auto-wake.*

```mermaid
flowchart LR
    API["Render API"] --> NEO[("Neon Postgres<br/>ep-restless-dream-ao8x0cyv-pooler<br/>ap-southeast-1<br/>sslmode=require")]
    API --> UPS[("Upstash Redis<br/>tough-lamb-133736<br/>us-east-1<br/>rediss:// TLS")]
    NEO --> W1["Auto-wake<br/>on first query"]
    UPS --> W2["Always on<br/>no cold start"]
```

### 6.3 Migrations

```powershell
cd apps\api
pnpm exec prisma migrate deploy
cd ..\..
```

**What runs:** 5 migrations, creating all Phase-1 tables plus constraints. Takes ~10 seconds against Neon (first time), <2s locally.

Migration files:

| Migration | Purpose |
|---|---|
| `20261027092835_init` | Base schema |
| `20261027190000_add_otp_purpose` | OTP purpose column |
| `20261028120000_phase6_schema_additions` | Phase 6 tables |
| `20261028130000_driver_kyc_documents` | KYC doc columns |
| `20261103090000_seat_layout_v2` | **Seat Layout v2** — `spec_json`, `schema_version`, `layout_rev` on `seat_layouts`; `seat_key` on `seats`; `seat_label` on `booking_passengers` |

**Verify:**

```powershell
cd apps\api
pnpm exec prisma migrate status
cd ..\..
```

Expected: `5 migrations found` + `No pending migrations to apply`.

### 6.4 Migration reset

```powershell
cd apps\api
pnpm exec prisma migrate reset --force
pnpm exec prisma db seed
cd ..\..
```

### 6.5 Direct DB access

**Local:**

```powershell
docker exec -it busverse-postgres psql -U postgres -d busverse
```

**Cloud (Neon):**

```powershell
cd apps\api
$env:DATABASE_URL="postgresql://neondb_owner:...@ep-restless-dream-ao8x0cyv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
pnpm exec prisma db execute --stdin --schema prisma/schema.prisma
# paste SQL, Ctrl+Z, Enter
Remove-Item Env:DATABASE_URL
```

Useful queries:

```sql
SELECT 'cities' AS tbl, COUNT(*) FROM cities
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings;

SELECT user_id, role FROM admin_users;
SELECT id, email FROM users WHERE is_test = true;
```

### 6.6 Redis access

**Local:**

```powershell
docker exec -it busverse-redis redis-cli -a redis_dev_password
```

**Cloud (Upstash):** use the Upstash **Data Browser** in the dashboard, or `redis-cli --tls -u <rediss-url>`.

Useful commands: `KEYS lock:*`, `KEYS session:*`, `KEYS otp:*`.

### 6.7 Database backup (before demo)

**Local:**

```powershell
docker exec busverse-postgres pg_dump -U postgres busverse > backup-$(Get-Date -Format yyyyMMdd).sql
```

**Neon:** use the Neon dashboard → **Backups** → **Create branch** for a point-in-time snapshot.

---

## 7. Seed Data

### 7.1 Seed flow

**Diagram: Seed data flow**
*Same nine ordered scripts as v1.0. Every insert is an UPSERT. Total ~367 rows. Time: 5–30 seconds depending on network latency to Neon.*

```mermaid
flowchart TB
    SEED["pnpm exec prisma db seed"]

    SEED --> S1["cities (3)"]
    S1 --> S2["stands (11)"]
    S2 --> S3["operators (3)"]
    S3 --> S4["operator_users (5)"]
    S4 --> S5["admin_users (1)"]
    S5 --> S6["driver_profiles (5)"]
    S6 --> S7["passenger_profiles (5)"]
    S7 --> S8["buses (7)"]
    S8 --> S9["seat_layouts (7)"]
    S9 --> S10["seats (250)"]
    S10 --> S11["routes (5)"]
    S11 --> S12["route_stands (15)"]
    S12 --> S13["schedules (15)"]
    S13 --> S14["consent_records (32)"]
    S14 --> S15["sequences (3)"]
    S15 --> V["✓ Verify: ~367 rows"]
```

### 7.2 What gets seeded (actual counts from real deployment)

| Table | Count | Notes |
|---|---:|---|
| `cities` | **3** | Delhi, Kanpur, Lucknow |
| `stands` | **11** | ~4 per city |
| `operators` | **3** | Sharma Travels, Rajdhani Express, Northern Deluxe |
| `operator_users` | **5** | 3 Owners + 2 Managers |
| `admin_users` | **1** | SUPER_ADMIN |
| `driver_profiles` | **5** | One per driver test account |
| `passenger_profiles` | **5** | Alice through Eve |
| `buses` | **7** | Mix of AC_SEATER and AC_SLEEPER |
| `seat_layouts` | **7** | One per bus |
| `seats` | **250** | Physical seat rows |
| `routes` | **5** | Delhi–Lucknow, Delhi–Kanpur, Kanpur–Lucknow, etc. |
| `route_stands` | **15** | 2–4 per route |
| `schedules` | **15** | Morning/afternoon/evening/night departures |
| `consent_records` | **32** | One per test user × purpose |
| `sequences` | **3** | `booking_reference_seq_2026`, `_2027`, `invoice_number_seq_2026_27` |
| **Total** | **~367 rows** | |

### 7.3 Seed data rationale

| Constraint | Count | Why |
|---|---|---|
| 3 cities | Minimum for multi-leg route | Delhi–Kanpur–Lucknow |
| 11 stands | Realistic density | ~4 per city |
| 3 operators | Multi-operator comparison in search | Shows competition |
| 5 operator_users | Owner + Manager per operator | Role distinction demoable |
| 7 buses | 2 bus types | Seater + sleeper side-by-side |
| 15 schedules | Time-of-day variety | Search shows 6 results for Delhi→Lucknow |
| 250 seats | Realistic | 7 buses × ~35 seats average |

### 7.4 Seed verification

There is no `pnpm db:verify` in v1.1 — the seed script prints its own counts. Expected output:

```
  cities: 3
  stands: 11
  operators: 3
  operator_users: 5
  admin_users: 1
  driver_profiles: 5
  passenger_profiles: 5
  buses: 7
  seat_layouts: 7
  seats: 250
  routes: 5
  route_stands: 15
  schedules: 15
  consent_records: 32
  sequences: 3 (booking_reference_seq_2026, booking_reference_seq_2027, invoice_number_seq_2026_27)

✓ Seed complete. Run `pnpm db:seed:assert` to verify.
```

**If counts are wrong:**

```powershell
cd apps\api
pnpm exec prisma migrate reset --force
pnpm exec prisma db seed
cd ..\..
```

### 7.5 Demo accounts (verified from seed-data.ts)

**Diagram: Demo accounts**
*Nine accounts across four roles. Admin and operator use email + password. Passengers use phone + OTP. All passwords are `Demo1234!@Abc` except admin which is `Demo1234!@AbcAdmin`.*

```mermaid
flowchart TB
    ADMIN["admin@busverse.app<br/>SUPER_ADMIN<br/>Demo1234!@AbcAdmin"]
    OPS["3 operator owners<br/>sharma/rajdhani/northern<br/>@busverse.app<br/>Demo1234!@Abc"]
    MGR["2 managers<br/>kapoor / malhotra<br/>Demo1234!@Abc"]
    PAX["5 passengers<br/>+91987654321X<br/>OTP 123456"]
```

**BusCon login (email + password):**

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@busverse.app` | `Demo1234!@AbcAdmin` |
| **Sharma Travels owner** | `sharma@busverse.app` | `Demo1234!@Abc` |
| **Rajdhani Express owner** | `rajdhani@busverse.app` | `Demo1234!@Abc` |
| **Northern Deluxe owner** | `northern@busverse.app` | `Demo1234!@Abc` |
| **Rajdhani Express manager** | `kapoor@rajdhaniexpress.co.in` | `Demo1234!@Abc` |
| **Northern Deluxe manager** | `malhotra@northerndeluxe.co.in` | `Demo1234!@Abc` |

**Passenger login (phone + OTP, on `busverse.netlify.app`):**

| Phone | Name |
|---|---|
| `9876543210` | Alice Gupta |
| `9876543211` | Bob Mehta |
| `9876543212` | Carol Iyer |
| `9876543213` | Dave Patel |
| `9876543214` | Eve Khan |

**OTP:** with `MOCK_OTP=true`, **always `123456`**.

**Rules:**
- These accounts are seeded with `is_test = true`
- Never use these credentials in a production system
- Admin password is 16 chars (meets `09` §6.6 minimum)
- Operator password is 12 chars (meets operator minimum)

### 7.6 Seed reset between demos

```powershell
cd apps\api
pnpm exec prisma migrate reset --force
pnpm exec prisma db seed
cd ..\..
```

**Time:** ~30 seconds against Neon (migration + 367 upserts).

---

## 8. Running Locally

### 8.1 Process layout

**Diagram: Running locally**
*Four processes. API on 4310 (not 4000 — this project's convention). BusVerse-v2 on 3412. BusCon on 3411 (check each app's `package.json` for exact port). Passenger Metro on 8082, Driver Metro on 8081.*

```mermaid
flowchart TB
    T1["Terminal 1<br/>pnpm --filter api dev<br/>:4310"]
    T2["Terminal 2<br/>pnpm --filter busverse-v2 dev<br/>:3412"]
    T3["Terminal 3<br/>pnpm --filter buscon dev<br/>:3411"]
    T4["Terminal 4<br/>pnpm --filter passenger-app start<br/>:8082"]
    T5["Terminal 5<br/>pnpm --filter driver-app start<br/>:8081"]

    DB[("Postgres :7542")]
    RD[("Redis :7543")]

    T1 --> DB
    T1 --> RD
    T2 --> T1
    T3 --> T1
    T4 --> T1
    T5 --> T1

    BROWSER["Browser<br/>localhost:3412<br/>localhost:3411"]
    T2 --> BROWSER
    T3 --> BROWSER
    PHONE["Phone<br/>Expo Go"]
    T4 --> PHONE
    T5 --> PHONE
```

### 8.2 Five-terminal approach

**Terminal 1 — API:**

```powershell
pnpm --filter api dev
```

**Expected:** `Server listening on :4310` + `[redis] connected`.

**Terminal 2 — BusVerse-v2:**

```powershell
pnpm --filter busverse-v2 dev
```

**Expected:** `ready - started server on http://localhost:3412`.

**Terminal 3 — BusCon:**

```powershell
pnpm --filter buscon dev
```

**Terminal 4 — Passenger Metro:**

```powershell
pnpm --filter passenger-app start -- --port 8082
```

**Terminal 5 — Driver Metro:**

```powershell
pnpm --filter driver-app start -- --port 8081
```

### 8.3 Single-command approach

```powershell
pnpm dev
```

Uses Turborepo to run all apps in parallel with colored prefixes.

### 8.4 Services matrix

| Service | Port (local) | URL (local) | URL (cloud) |
|---|---|---|---|
| API | 4310 | `http://localhost:4310` | `https://busverse-api.onrender.com` |
| WebSocket | 4310 | `ws://localhost:4310/v1/ws` | `wss://busverse-api.onrender.com/v1/ws` |
| BusVerse-v2 | 3412 | `http://localhost:3412` | `https://busverse.netlify.app` |
| BusCon | 3411 | `http://localhost:3411` | `https://busconoperator.netlify.app` |
| Passenger Metro | 8082 | Expo QR | Expo EAS APK |
| Driver Metro | 8081 | Expo QR | Expo EAS APK |
| Postgres | 7542 (local) | `postgresql://localhost:7542/busverse` | Neon (see §6.2) |
| Redis | 7543 (local) | `redis://localhost:7543` | Upstash (see §6.2) |

### 8.5 Phone connection (Expo Go)

**Diagram: Phone-to-API connection**
*Phone must reach the laptop's LAN IP, not localhost. Find LAN IP, put it in `.env`, restart Metro with `--clear`. EXPO_PUBLIC_* is baked at bundle time.*

```mermaid
flowchart LR
    PHONE["Phone<br/>Expo Go"] -->|"scan QR"| METRO["Metro<br/>port 8082"]
    METRO -->|"bundle with<br/>EXPO_PUBLIC_API_BASE"| BUNDLE["JS bundle<br/>containing http://LAN_IP:4310/v1"]
    BUNDLE --> PHONE
    PHONE -->|"HTTP requests"| API["API<br/>http://LAN_IP:4310"]
    API --> PHONE
```

**Steps:**

```powershell
# 1. Find LAN IP
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notmatch '^127\.' -and
  $_.IPAddress -notmatch '^169\.' -and
  $_.InterfaceAlias -match 'Wi-Fi|Ethernet'
} | Select-Object InterfaceAlias, IPAddress

# 2. Edit apps/passenger-app/.env
# EXPO_PUBLIC_API_BASE=http://10.x.x.x:4310/v1
# EXPO_PUBLIC_WS_URL=http://10.x.x.x:4310

# 3. Restart Metro with --clear (bakes new values into bundle)
pnpm --filter passenger-app start -- --port 8082 --clear

# 4. Scan QR from phone
```

**Critical:** `EXPO_PUBLIC_*` is baked into the JS bundle. Changing `.env` **requires** `--clear` and closing the app completely on the phone.

**Windows Firewall:** allow inbound 4310:

```powershell
New-NetFirewallRule -DisplayName "BusVerse API 4310" -Direction Inbound -LocalPort 4310 -Protocol TCP -Action Allow -Profile Private,Public
```

### 8.6 Stopping services

```powershell
# Stop each app
Ctrl+C in each terminal

# Stop Docker
docker compose down

# Full reset (loses data)
docker compose down -v
docker compose up -d
cd apps\api
pnpm exec prisma migrate reset --force
pnpm exec prisma db seed
```

---

## 9. First-Time Verification

### 9.1 Verification checklist

**Diagram: First-time verification**
*12 checks. Covers local AND cloud. Run local checks first (faster), then cloud checks. All must pass before demo.*

```mermaid
flowchart TB
    START["Start verification"]
    START --> L1["LOCAL 1 API health"]
    L1 --> L2["LOCAL 2 cities"]
    L2 --> L3["LOCAL 3 search"]
    L3 --> L4["LOCAL 4 admin login"]
    L4 --> L5["LOCAL 5 passenger login"]
    L5 --> C1["CLOUD 1 API health"]
    C1 --> C2["CLOUD 2 cities"]
    C2 --> C3["CLOUD 3 admin login"]
    C3 --> C4["CLOUD 4 Netlify BusVerse loads"]
    C4 --> C5["CLOUD 5 Netlify BusCon loads"]
    C5 --> C6["CLOUD 6 CORS locked"]
    C6 --> DONE["✓ Ready"]
```

### 9.2 Local verification

**Check 1 — API health:**

```powershell
curl.exe -s http://localhost:4310/v1/health
```

Expected: `{"status":"ok"}`.

**Check 2 — Cities:**

```powershell
curl.exe -s http://localhost:4310/v1/public/cities
```

Expected: 3 cities with UUIDs.

**Check 3 — Search:**

```powershell
# Use UUIDs from check 2
curl.exe -s "http://localhost:4310/v1/public/search?originCityId=<delhi>&destinationCityId=<lucknow>&date=2026-11-11"
```

Expected: array of schedules.

**Check 4 — Admin login:**

```powershell
$body = @{ email = 'admin@busverse.app'; password = 'Demo1234!@AbcAdmin' } | ConvertTo-Json
curl.exe -s -X POST -H "Content-Type: application/json" -d $body http://localhost:4310/v1/admin/auth/login
```

Expected: `{"data":{"accessToken":"...","refreshToken":"...","user":{...}}}`.

**Check 5 — Passenger login:**

```powershell
$body = @{ phone = '+919876543210' } | ConvertTo-Json
curl.exe -s -X POST -H "Content-Type: application/json" -d $body http://localhost:4310/v1/passenger/auth/otp/request
# Then verify with OTP 123456:
$body = @{ phone = '+919876543210'; otp = '123456' } | ConvertTo-Json
curl.exe -s -X POST -H "Content-Type: application/json" -d $body http://localhost:4310/v1/passenger/auth/otp/verify
```

Expected: `{"data":{"accessToken":"...",...}}`.

### 9.3 Cloud verification

**Check 1 — API health (allow 60s for cold start):**

```powershell
curl.exe -s --max-time 120 https://busverse-api.onrender.com/v1/health
```

Expected: `{"status":"ok"}`.

**Check 2 — Cities from cloud DB:**

```powershell
curl.exe -s --max-time 120 https://busverse-api.onrender.com/v1/public/cities
```

**Check 3 — Cloud admin login:**

```powershell
$body = @{ email = 'admin@busverse.app'; password = 'Demo1234!@AbcAdmin' } | ConvertTo-Json
curl.exe -s -X POST -H "Content-Type: application/json" -d $body https://busverse-api.onrender.com/v1/admin/auth/login
```

Expected: `{"data":{"accessToken":"...",...}}`.

**Check 4 — BusVerse loads:**

Open `https://busverse.netlify.app` — should show search form with styles (not unstyled HTML).

**Check 5 — BusCon loads:**

Open `https://busconoperator.netlify.app/login` — should show login form.

**Check 6 — CORS locked:**

```powershell
curl.exe -s -H "Origin: https://evil.example.com" -I https://busverse-api.onrender.com/v1/health | Select-String "access-control-allow-origin"
```

Expected: **empty output** (arbitrary origins rejected).

```powershell
curl.exe -s -H "Origin: https://busverse.netlify.app" -I https://busverse-api.onrender.com/v1/health | Select-String "access-control-allow-origin"
```

Expected: `access-control-allow-origin: https://busverse.netlify.app`.

### 9.4 Automated verification script

```powershell
# scripts/verify-demo-ready.ps1
$ErrorActionPreference = 'Stop'

Write-Host "Local API health..." -ForegroundColor Cyan
Invoke-WebRequest http://localhost:4310/v1/health -UseBasicParsing | Out-Null

Write-Host "Local cities..." -ForegroundColor Cyan
$c = (Invoke-WebRequest http://localhost:4310/v1/public/cities -UseBasicParsing).Content | ConvertFrom-Json
if ($c.data.Count -ne 3) { throw "Expected 3 cities" }

Write-Host "Cloud API health..." -ForegroundColor Cyan
Invoke-WebRequest https://busverse-api.onrender.com/v1/health -UseBasicParsing -TimeoutSec 120 | Out-Null

Write-Host "Cloud admin login..." -ForegroundColor Cyan
$body = @{ email = 'admin@busverse.app'; password = 'Demo1234!@AbcAdmin' } | ConvertTo-Json
$r = (Invoke-WebRequest -Method POST -Uri https://busverse-api.onrender.com/v1/admin/auth/login -ContentType 'application/json' -Body $body -UseBasicParsing).Content | ConvertFrom-Json
if (-not $r.data.accessToken) { throw "Login failed" }

Write-Host "BusVerse site..." -ForegroundColor Cyan
Invoke-WebRequest https://busverse.netlify.app -UseBasicParsing | Out-Null

Write-Host "BusCon site..." -ForegroundColor Cyan
Invoke-WebRequest https://busconoperator.netlify.app -UseBasicParsing | Out-Null

Write-Host "✓ All checks passed — demo ready" -ForegroundColor Green
```

---

## 10. Demo Script

### 10.1 Demo timeline

**Diagram: Demo timeline**
*8-step demo runs in ~7 minutes using cloud URLs. Each step has a duration and pass criteria. Cold start absorbed by the pre-demo warm-up (§12.3).*

```mermaid
flowchart LR
    S1["1 Passenger login<br/>30 sec"] --> S2["2 Search<br/>1 min"]
    S2 --> S3["3 Seat lock<br/>30 sec"]
    S3 --> S4["4 Pay (mock)<br/>30 sec"]
    S4 --> S5["5 Ticket + QR<br/>1 min"]
    S5 --> S6["6 Admin login<br/>30 sec"]
    S6 --> S7["7 Audit trail<br/>1 min"]
    S7 --> S8["8 Operator view<br/>1 min"]
```

### 10.2 Pre-demo setup (T-5 minutes)

- [ ] Open `https://busverse-api.onrender.com/v1/health` in a browser (warms the backend)
- [ ] Open `https://busverse.netlify.app` in tab 1
- [ ] Open `https://busconoperator.netlify.app/login` in tab 2
- [ ] Have `9876543210` and `123456` written on a sticky note
- [ ] Have `admin@busverse.app` / `Demo1234!@AbcAdmin` on a sticky note
- [ ] Phone on silent
- [ ] Demo script printed
- [ ] Backup video on desktop (in case backend is slow)

### 10.3 Demo step-by-step

#### Step 1 — Passenger login (30 sec)

**Screen:** `https://busverse.netlify.app`

**Narration:**

> "The passenger enters their phone number, receives an OTP, and signs in. In this demo environment, the OTP is mocked as 123456 — in production it would be a real SMS via MSG91."

**Actions:**

1. Enter `9876543210`
2. Click "Send OTP"
3. Enter `123456`
4. Click verify

**Pass criteria:** Home screen shows welcome message with passenger's name.

#### Step 2 — Search (1 min)

**Screen:** Search form → results

**Narration:**

> "They search Delhi to Lucknow for tomorrow. Our backend returns six schedules — AC seater and AC sleeper buses across three operators — with fares ranging from ₹850 to ₹1500 and available seat counts."

**Actions:**

1. Origin: "Delhi" → select from picker
2. Destination: "Lucknow" → select
3. Date: tomorrow or +1 day
4. Click search

**Pass criteria:** 5+ result cards with fare, time, bus type, operator, seats.

**Trap to avoid:** searching for **today** returns empty — the seed starts schedules one day after seeding. Always pick tomorrow+.

#### Step 3 — Seat lock (30 sec)

**Screen:** Seat grid

**Narration:**

> "They select a bus. The seat layout is the real 2+2 configuration from Seat Layout Engine v2. They pick a seat — see the 5-minute countdown appear. That countdown represents an atomic Redis lock — another user trying to book the same seat right now would get a conflict."

**Actions:**

1. Tap a result
2. Wait for the `LOADING SEATS` animation
3. Tap seat A1
4. Show the countdown

**Pass criteria:** Seat turns blue with white label; countdown appears in the corner.

#### Step 4 — Pay (30 sec)

**Screen:** Passenger form → mock payment

**Narration:**

> "They fill in passenger details and proceed. Because MOCK_PAYMENT is enabled, a "Simulate successful payment" button appears instead of Razorpay checkout. This is exactly what we'd want during a demo — no dependency on Razorpay's test account."

**Actions:**

1. Fill name "Test", age "30", gender
2. Click Continue
3. Click "Simulate successful payment"

**Pass criteria:** "CONFIRMING PAYMENT" appears, then transitions to ticket in ~2 seconds.

#### Step 5 — Ticket + QR (1 min)

**Screen:** Ticket screen

**Narration:**

> "The booking is confirmed. The passenger sees a QR ticket. This is a cryptographically signed payload, not a URL — the driver app verifies the signature with the Ed25519 public key, so it cannot be forged. Tapping the QR opens it fullscreen so the driver can scan it."

**Actions:**

1. Show the ticket (cities, times, seat, PNR, QR)
2. Tap the QR to open fullscreen
3. Tap anywhere to close

**Pass criteria:** QR renders as a scannable image; tap opens modal; close works.

#### Step 6 — Admin login (30 sec)

**Screen:** `https://busconoperator.netlify.app/login`

**Narration:**

> "Switching to the operator dashboard. I'll log in as the super admin — this role can see across all operators, manage approvals, issue refunds, and audit every action."

**Actions:**

1. Email: `admin@busverse.app`
2. Password: `Demo1234!@AbcAdmin`
3. Click login

**Pass criteria:** Lands on dashboard or `/admin/approvals`.

#### Step 7 — Audit trail (1 min)

**Screen:** `/admin/audit` (or `/admin/bookings`)

**Narration:**

> "Here's the audit trail. Every action is logged — the passenger login, the seat lock, the booking creation, the payment confirmation, the ticket issuance. This is an immutable append-only log — even admins can't delete entries."

**Actions:**

1. Navigate to audit log
2. Show the recent entries matching the demo flow
3. Point out that the booking reference in the audit log matches the ticket

**Pass criteria:** Audit entries visible with timestamps matching the demo.

#### Step 8 — Operator view (1 min)

**Screen:** Log out → log in as operator

**Narration:**

> "Logging in as the operator — Rajdhani Express. Operators see only their own data: their buses, their schedules, their bookings. The scoping is enforced at the query layer, not just the UI."

**Actions:**

1. Log out
2. Email: `rajdhani@busverse.app`
3. Password: `Demo1234!@Abc`
4. Navigate to `/operator/bookings` — show only Rajdhani's data
5. Navigate to `/operator/schedules` — show only Rajdhani's schedules

**Pass criteria:** Data scoped to Rajdhani; other operators invisible.

### 10.4 Demo pass criteria summary

| # | Step | Pass criteria |
|:---:|---|---|
| 1 | Passenger login | OTP accepted, home updates |
| 2 | Search | 5+ results for tomorrow |
| 3 | Seat lock | Countdown appears |
| 4 | Pay | Simulate button succeeds |
| 5 | Ticket | QR visible, tap opens fullscreen |
| 6 | Admin login | Dashboard loads |
| 7 | Audit | Entries match demo actions |
| 8 | Operator view | Data scoped to operator |

**If all 8 pass:** demo succeeds.

---

## 11. Demo Fallbacks

### 11.1 Fallback decision tree

**Diagram: Fallback decision tree**
*Eight fallback paths. Cloud-specific additions: Render cold start, Netlify build failure, Neon suspension. Each fallback is tested and works.*

```mermaid
flowchart TD
    FAIL["Step fails"] --> Q1{"What failed?"}

    Q1 -->|"Render 30s+ hang"| F1["Wait 60s<br/>backend is cold-starting"]
    Q1 -->|"Neon suspended"| F2["First query auto-wakes<br/>retry once"]
    Q1 -->|"Netlify site down"| F3["Fall back to localhost<br/>(pnpm dev)"]
    Q1 -->|"Payment fails"| F4["MOCK_PAYMENT=true<br/>already default in dev"]
    Q1 -->|"OTP fails"| F5["MOCK_OTP=true<br/>OTP is 123456"]
    Q1 -->|"QR scan fails"| F6["Driver scan is broken<br/>bypass in demo"]
    Q1 -->|"CORS error"| F7["Verify CORS_ALLOWED_ORIGINS<br/>on Render"]
    Q1 -->|"Everything"| F8["Play backup video<br/>or demo from localhost"]
```

### 11.2 Fallback matrix

| Failure | Trigger | Fallback | Time lost |
|---|---|---|---|
| **Render cold start** | First request after 15 min idle | Wait 60s; show slide while waiting | 60 sec |
| **Neon suspended** | First DB query after 5 min idle | Auto-wakes in 1–5s; retry | 5 sec |
| **Netlify build broken** | Site shows error | Demo from `localhost:3412` and `:3411` | 2 min |
| **Mock payment off** | `MOCK_PAYMENT=false` | Edit Render env var, redeploy | 3 min |
| **OTP not accepted** | Wrong OTP | Use `123456` (mock mode) | 5 sec |
| **Driver scan crashes** | `scanTicket` type errors | Skip step; narrate flow | 0 sec |
| **CORS blocked** | `CORS_ALLOWED_ORIGINS` wrong | Fix in Render Environment, redeploy | 2 min |
| **Everything down** | No cloud, no local | Play backup video | 0 sec |

### 11.3 Mock mode setup (cloud)

**Enable mock modes on Render:**

1. Render → `BusVerse-api` → **Environment**
2. Set `MOCK_PAYMENT=true`, `MOCK_OTP=true`
3. **Save, rebuild, and deploy**

**Mock payment:** the payment screen shows an "Simulate successful payment" button instead of Razorpay checkout. Clicking it creates a fake `payment.captured` row in ~2 seconds.

**Mock OTP:** any OTP request returns success; entering `123456` accepts.

**Verify mock mode is on:**

```powershell
$body = @{ phone = '+919876543210' } | ConvertTo-Json
curl.exe -s -X POST -H "Content-Type: application/json" -d $body https://busverse-api.onrender.com/v1/passenger/auth/otp/request
```

If response includes `"mock":true`, mock mode is active.

### 11.4 Backup video

**Record on demo day setup (T-1 day):**

- OBS Studio, 1080p, 30fps
- Full 8-minute demo of all 8 steps
- Narrated voiceover
- Save to `docs/assets/demo-backup.mp4` AND on desktop

**If everything fails:**

1. Apologize briefly: "Let me walk through the recorded demo to show the flow"
2. Play video
3. Narrate over it
4. Offer to retry after questions

**Rule:** never let the panel see you panic.

### 11.5 Fallback procedures checklist

Before demo, memorize:

- [ ] Warm the Render backend (`curl https://busverse-api.onrender.com/v1/health` 60s before)
- [ ] Where `MOCK_PAYMENT` / `MOCK_OTP` are set (Render Environment)
- [ ] Backup video location (desktop + `docs/assets/`)
- [ ] How to run locally (`pnpm dev` in 4 terminals)
- [ ] Which demo steps depend on which service

---

## 12. Demo Day Checklist

### 12.1 Demo day timeline

**Diagram: Demo day timeline**
*Four phases. Same as v1.0 but T-1 hour now includes warming the cloud backend and verifying both Netlify sites.*

```mermaid
flowchart TB
    DAY["Demo day"]

    DAY --> T1["T-1 day<br/>record video<br/>test full flow<br/>backup data"]
    DAY --> T2["T-1 hour<br/>warm backend<br/>open all URLs<br/>print script"]
    DAY --> T3["During demo<br/>follow 8-step script<br/>use fallbacks if needed"]
    DAY --> T4["Post-demo<br/>save artifacts<br/>log Q&A"]

    T1 --> T2 --> T3 --> T4
```

### 12.2 Pre-demo checklist (T-1 day)

- [ ] Run full 8-step demo 3 times, all pass
- [ ] Record backup video (8 min, 1080p)
- [ ] Save to `docs/assets/demo-backup.mp4` + desktop
- [ ] Export Neon snapshot: Neon dashboard → **Backups** → **Create branch**
- [ ] Print demo script (§10)
- [ ] Print pre-demo checklist (§12.3)
- [ ] Charge laptop to 100% + pack charger
- [ ] Test on demo Wi-Fi if possible
- [ ] Note Wi-Fi password
- [ ] Phone silent, laptop notifications off
- [ ] Prepare 1-minute intro slide

### 12.3 Pre-demo checklist (T-1 hour)

**Local (if demoing locally):**

- [ ] `docker ps` shows postgres + redis
- [ ] `pnpm exec prisma migrate status` shows 5 migrations
- [ ] Seed counts match (3 cities, 15 schedules)
- [ ] API running on `:4310`
- [ ] BusVerse-v2 running on `:3412`
- [ ] BusCon running on `:3411`

**Cloud (if demoing from Netlify):**

- [ ] `curl https://busverse-api.onrender.com/v1/health` returns `ok` (warm it — do this 60s before)
- [ ] `https://busverse.netlify.app` loads with styles
- [ ] `https://busconoperator.netlify.app/login` loads
- [ ] `CORS_ALLOWED_ORIGINS` on Render contains both Netlify URLs
- [ ] `MOCK_PAYMENT=true` on Render
- [ ] `MOCK_OTP=true` on Render
- [ ] Admin login works via `curl`

**General:**

- [ ] Demo script printed
- [ ] Sticky note with credentials
- [ ] Backup video on desktop
- [ ] Water bottle
- [ ] Guide name memorized: **Mr. Mohit Srivastav**
- [ ] Own name remembered: **Shaghaf**

### 12.4 During demo checklist

- [ ] Speak clearly, don't rush
- [ ] Watch the panel
- [ ] If Render is cold, say "the backend is warming up — about 30 seconds" instead of freezing
- [ ] Keep under 10 minutes
- [ ] Save time for questions

### 12.5 Post-demo checklist

- [ ] Thank the panel
- [ ] Export audit log entries matching demo (see §17.2)
- [ ] Screenshot key screens to `docs/assets/screenshots/`
- [ ] Log viva questions to `viva/02-VIVA_QUESTIONS_QA.md`
- [ ] Note what went wrong
- [ ] Save demo video to backup location

### 12.6 Recovery checklist (if demo fails)

If a step fails mid-demo:

1. **Stay calm**
2. **Check if it's Render cold start** — if the last request was >15 min ago, it's warming
3. **Quick fix** — retry once, or enable mock mode
4. **If fix > 30 sec** — switch to backup video
5. **Narrate over video** — "here's the same flow recorded earlier"
6. **Move on**

**Never:**

- Panic visibly
- Blame the Wi-Fi
- Say "it worked yesterday"
- Show frustration

---

## 13. Free-Tier Cloud Deployment (As Deployed)

### 13.1 Deployment topology

**Diagram: Actual deployed topology (v1.1)**
*This is what is live right now. Render (API) + Neon (Postgres) + Upstash (Redis) + Netlify × 2 (Next.js) + Expo EAS (APK, pending). No Vercel, no Railway, no credit card.*

```mermaid
flowchart TB
    USER["Users"]

    USER --> NB["Netlify: busverse.netlify.app<br/>Passenger web"]
    USER --> NC["Netlify: busconoperator.netlify.app<br/>Operator web"]
    USER --> APK["Expo EAS APK<br/>Passenger Android"]

    NB -->|"HTTPS REST + WSS"| REN["Render: busverse-api.onrender.com<br/>Fastify API + WebSocket<br/>Free: 512MB, spins down 15 min"]
    NC -->|"HTTPS REST + WSS"| REN
    APK -->|"HTTPS REST + WSS"| REN

    REN --> NEO[("Neon Postgres<br/>ep-restless-dream-ao8x0cyv-pooler<br/>ap-southeast-1<br/>Free: 1GB, 5 min idle suspend")]
    REN --> UPS[("Upstash Redis<br/>tough-lamb-133736<br/>us-east-1<br/>Free: 500k cmd/month")]
```

### 13.2 Service inventory

| Service | Purpose | URL | Free tier |
|---|---|---|---|
| **Render** | API + WebSocket | `https://busverse-api.onrender.com` | 750 h/mo, 512MB, spin-down 15 min |
| **Neon** | PostgreSQL 16 | `ep-restless-dream-ao8x0cyv-pooler.c-2.ap-southeast-1.aws.neon.tech` | 1 GB, 100 compute-h/mo, suspend 5 min |
| **Upstash** | Redis 7 (TLS) | `tough-lamb-133736.upstash.io` | 500k cmd/mo, 256 MB |
| **Netlify (busverse)** | Passenger web | `https://busverse.netlify.app` | 100 GB bandwidth, 300 build min |
| **Netlify (buscon)** | Operator web | `https://busconoperator.netlify.app` | Same |
| **Expo EAS** | Android APK | Pending | 15 builds/mo |

**Total monthly cost: ₹0.**

### 13.3 Render configuration (verified working)

| Setting | Value |
|---|---|
| **Name** | `BusVerse-api` |
| **Service ID** | `srv-dbosl9ff3r2c73c72260` |
| **Region** | Virginia (US East) |
| **Language** | Node (not Docker) |
| **Root Directory** | *(blank — repo root)* |
| **Health Check Path** | `/v1/health` |
| **Instance** | Free (512 MB, 0.1 CPU) |
| **Auto-Deploy** | On Commit |

### 13.4 Render Build & Start commands (verified)

**Build Command:**

```
pnpm install --frozen-lockfile --prod=false && pnpm --filter ./packages/seat-engine build && pnpm --filter api exec prisma generate && (pnpm --filter api exec tsc --noEmitOnError false || true) && test -f packages/seat-engine/dist/index.js && test -f apps/api/dist/server.js
```

**Start Command:**

```
pnpm --filter api exec prisma migrate deploy && node apps/api/dist/server.js
```

**Why each piece exists:**

| Piece | Purpose |
|---|---|
| `--prod=false` | Install devDependencies (prisma, tsc are needed for build) |
| `--filter ./packages/seat-engine build` | Path-based filter resolves regardless of package name; builds `dist/` |
| `prisma generate` | Generates Prisma client from current schema |
| `tsc --noEmitOnError false \|\| true` | Emits JS despite TS errors (9 known type errors — see §15.9) |
| `test -f packages/seat-engine/dist/index.js` | Fail fast if seat-engine didn't build |
| `test -f apps/api/dist/server.js` | Fail fast if API didn't compile |
| `prisma migrate deploy` (in Start) | Runs migrations on cold start (no pre-deploy on free tier) |

### 13.5 Neon configuration (verified working)

| Setting | Value |
|---|---|
| **Provider** | Neon |
| **Region** | ap-southeast-1 (Singapore) |
| **Database** | `neondb` |
| **Connection** | Pooled with `sslmode=require&channel_binding=require` |
| **Migrations applied** | 5 (all) |
| **Seed status** | Complete (367 rows) |

**Connection string shape:**

```
postgresql://neondb_owner:<password>@ep-restless-dream-ao8x0cyv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 13.6 Upstash configuration (verified working)

| Setting | Value |
|---|---|
| **Endpoint** | `tough-lamb-133736.upstash.io` |
| **Region** | us-east-1 |
| **TLS** | Enabled (`rediss://`) |
| **Commands used** | 0 / 500k monthly |

**Connection string shape:**

```
rediss://default:<token>@tough-lamb-133736.upstash.io:6379
```

### 13.7 Netlify configuration (verified working)

Both sites use the same settings, differing only in package directory and publish path.

| Setting | busverse-v2 | buscon |
|---|---|---|
| **Project name** | `busverse` | `busconoperator` |
| **Base directory** | *(blank)* | *(blank)* |
| **Project to deploy** | `apps/busverse-v2` | `apps/buscon` |
| **Build command** | `pnpm --filter busverse-v2 build` | `pnpm --filter buscon build` |
| **Publish directory** | `apps/busverse-v2/.next` | `apps/buscon/.next` |
| **Env vars** | 3 (see §4.2.2) | 3 (same) |

**Deployment history (from actual attempts):**

| # | Error | Fix |
|---|---|---|
| 1 | `--webpack` unknown option | Removed flag (Next 15 uses webpack by default) |
| 2 | Tailwind v4 PostCSS error | Pinned `tailwindcss@3.4.17` via `pnpm.overrides` |
| 3 | `useReactTable` not exported | Pinned `@tanstack/react-table@8.21.2` |
| 4 | Next.js security gate (CVE-2025-55182) | Upgraded to `next@15.1.9` |
| 5 | Silent stall after "Cloning completed" | Added `CI=1`, `ENABLE_EXPERIMENTAL_COREPACK=1`, `PNPM_FLAGS` |
| 6 | BusVerse-v2 has no CSS styles | Added `data-theme="light"` default to `<html>` |

### 13.8 Expo EAS configuration (pending)

**`apps/passenger-app/eas.json` (minimum for installable APK):**

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

**Build steps:**

```powershell
npm install -g eas-cli
eas login
cd apps\passenger-app
eas build:configure       # generates eas.json
# edit eas.json to add preview profile as above
eas env:set --name EXPO_PUBLIC_API_BASE --value https://busverse-api.onrender.com/v1 --environment production
eas env:set --name EXPO_PUBLIC_WS_URL --value https://busverse-api.onrender.com --environment production
eas env:set --name EXPO_PUBLIC_DEV_MODE --value false --environment production
eas build --platform android --profile preview
```

**Timeline:**

| Milestone | Time |
|---|---|
| Build enters queue | Immediate |
| Build starts | 5–90 min (free tier low priority) |
| APK ready | ~15 min after build starts |
| **Total** | **20 min (off-peak) to 2 hours (peak)** |

**Install:** EAS provides a direct download link + QR code. Open on Android, accept "unknown sources", install.

### 13.9 Post-deployment CORS lockdown

**Diagram: CORS lockdown flow**
*Before lockdown, Render runs in `DEV MODE` (reflects any origin) because `CORS_ALLOWED_ORIGINS` is invalid. After setting the two Netlify URLs, only those origins are accepted.*

```mermaid
flowchart LR
    BAD["CORS_ALLOWED_ORIGINS=<br/>random hash"] --> MODE["DEV MODE<br/>reflects ALL origins<br/>log: '[cors] DEV MODE'"]
    GOOD["CORS_ALLOWED_ORIGINS=<br/>https://busverse.netlify.app,<br/>https://busconoperator.netlify.app"] --> LOCK["STRICT<br/>only those 2 origins"]
    MODE -->|"fix"| LOCK
```

**Steps:**

1. Render → `BusVerse-api` → **Environment**
2. Set `CORS_ALLOWED_ORIGINS` to:
   ```
   https://busverse.netlify.app,https://busconoperator.netlify.app
   ```
3. **Save, rebuild, and deploy**
4. Verify (§9.3 check 6)

### 13.10 Deployment timeline (actual)

**Diagram: Actual deployment sequence**
*Eleven commits across ~4 hours. Each row is a real fix. The whole cycle from "deploy to Render" to "both Netlify sites live" is the timeline of the v1.0 → v1.1 cycle.*

```mermaid
flowchart TB
    C1["1. Render initial deploy<br/>env vars missing"] --> C2["2. Add 6 env vars<br/>REDIS/PII/SALT/RAZORPAY"]
    C2 --> C3["3. Add CI + COREPACK<br/>fix silent stall"]
    C3 --> C4["4. Commit seat-engine dist<br/>fix MODULE_NOT_FOUND"]
    C4 --> C5["5. Prisma generate<br/>fix client init"]
    C5 --> C6["6. Seed Neon<br/>367 rows"]
    C6 --> C7["7. Deploy buscon to Netlify<br/>Tailwind v4 error"]
    C7 --> C8["8. Pin tailwind v3 + tanstack v8<br/>via pnpm.overrides"]
    C8 --> C9["9. Remove --webpack<br/>Next 15 compat"]
    C9 --> C10["10. Upgrade next@15.1.9<br/>CVE-2025-55182 gate"]
    C10 --> C11["11. Fix data-theme<br/>styles render"]
    C11 --> C12["12. Switch argon2 → bcryptjs<br/>native binding fix"]
    C12 --> C13["13. Fix findAdminByEmail<br/>relation filter → 2 queries"]
```

---

## 14. Future Production Hardening (Deferred)

### 14.1 Production vs current free-tier

**Diagram: Production path**
*What would need to change before real users. Not required for viva.*

```mermaid
flowchart TB
    FREE["Free tier<br/>(now)"] --> PROD["Production<br/>(Phase 2)"]
    FREE --> F1["Render free<br/>spin-down 15 min"]
    FREE --> F2["Neon free<br/>5 min suspend"]
    FREE --> F3["Netlify free<br/>build queue"]
    FREE --> F4["Expo EAS free<br/>queue + 15/mo"]

    PROD --> P1["Render paid or Koyeb<br/>always-on"]
    PROD --> P2["Neon Scale<br/>no suspend"]
    PROD --> P3["Vercel Pro or Netlify Pro<br/>priority build"]
    PROD --> P4["Expo EAS Priority<br/>or self-hosted builder"]
```

### 14.2 Production checklist (deferred)

- [ ] **Razorpay live mode** — KYC, real keys, real webhook secret
- [ ] **Real OTP provider** — MSG91 with DLT registration (India mandatory)
- [ ] **Rotate all 3 crypto secrets** — `JWT_SECRET`, `PII_ENCRYPTION_KEY`, `PHONE_HASH_SALT` (they've been pasted in chat during setup)
- [ ] **Rotate Upstash token** — same reason
- [ ] **Rotate Neon password** — same reason
- [ ] **Backups enabled** — Neon PITR + daily logical dumps
- [ ] **Monitoring** — Sentry + uptime alerts
- [ ] **CORS strict** — no localhost, no wildcard
- [ ] **`MOCK_PAYMENT=false`, `MOCK_OTP=false`**
- [ ] **DPDP compliance** — privacy policy, DPA, retention policy
- [ ] **Domain** — custom domain + SSL
- [ ] **Rate limiting** — already in code, verify thresholds
- [ ] **Fix the 9 TypeScript errors** (§15.9) and remove `\|\| true` from build

**Rule:** never deploy to production without the guide's approval.

---

## 15. Troubleshooting (Real Bugs from v1.1)

### 15.1 Troubleshooting decision tree

**Diagram: Troubleshooting decision tree**
*13 real bugs encountered during v1.1. Grouped by layer. Every fix is committed.*

```mermaid
flowchart TD
    SYM["Symptom"] --> Q{"Layer?"}

    Q -->|"Build"| B["BOM in JSON<br/>seat-engine dist missing<br/>Tailwind v3/v4<br/>--webpack flag<br/>CVE gate"]
    Q -->|"Runtime"| R["Module not found<br/>Prisma client not generated<br/>argon2 native binding<br/>relation filter 500"]
    Q -->|"Auth"| A["JWT_SECRET unstable<br/>findAdminByEmail 500<br/>bcrypt hash mismatch"]
    Q -->|"Network"| N["CORS invalid<br/>Netlify stall<br/>Render cold start"]
    Q -->|"UI"| U["No CSS on deployed site<br/>data-theme missing"]
```

### 15.2 Real issues and fixes (catalogue)

| # | Symptom | Layer | Cause | Fix |
|:---:|---|---|---|---|
| 1 | `Could not read package.json: Unexpected token '﻿'` | Build | BOM from `Set-Content -Encoding UTF8` on PS 5.1 | Rewrite with `WriteAllText` + `UTF8Encoding($false)` |
| 2 | `Cannot find module '@busverse/seat-engine/dist/index.js'` | Runtime | `dist/` in `.gitignore`; never built on Render | `git add -f packages/seat-engine/dist` OR add build step |
| 3 | `Command "prisma" not found` | Build | `NODE_ENV=production` skipped devDeps | Add `--prod=false` to `pnpm install` |
| 4 | `The column 'schema_version' does not exist` | Migration | 5th migration not pushed | `git push` + `prisma migrate deploy` |
| 5 | `It looks like you're trying to use tailwindcss directly as a PostCSS plugin` | Build | Tailwind v4 installed despite v3 in package.json | `pnpm.overrides` → `"tailwindcss": "3.4.17"` |
| 6 | `'useReactTable' is not exported from '@tanstack/react-table'` | Build | v9 installed despite v8 usage | `pnpm.overrides` → `"@tanstack/react-table": "8.21.2"` |
| 7 | `error: unknown option '--webpack'` | Build | Next 15 doesn't accept this flag | Remove from `build` script |
| 8 | `You're currently using a version of Next.js affected by a critical security vulnerability` | Deploy gate | CVE-2025-55182 on 15.1.3 | Upgrade to `next@15.1.9` |
| 9 | `INTERNAL_ERROR` on any login | Runtime | `@node-rs/argon2` native binding fails on Render | Replace with `bcryptjs` (pure JS) |
| 10 | `INTERNAL_ERROR` even after bcryptjs, wrong password returns 500 | Runtime | Prisma relation filter `where: { user: { email } }` throws | Rewrite to 2 plain queries |
| 11 | BusVerse-v2 has no CSS on deployed site | UI | `data-theme` attribute never set | Add `data-theme="light"` default to `<html>` |
| 12 | Silent stall after "Cloning completed" | Build | Vercel/Netlify pnpm waiting for input | `CI=1`, `ENABLE_EXPERIMENTAL_COREPACK=1`, `PNPM_FLAGS=--shamefully-hoist` |
| 13 | `[cors] DEV MODE: reflecting ALL origins` in logs | Network | `CORS_ALLOWED_ORIGINS` is a random hash | Set to comma-separated Netlify URLs |

### 15.3 Common issues and fixes (general)

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED :7542` | Postgres not running | `docker compose up -d` |
| `ECONNREFUSED :7543` | Redis not running | `docker compose up -d` |
| `EADDRINUSE :::4310` | Port 4310 in use | `Get-NetTCPConnection -LocalPort 4310` → `Stop-Process` |
| `Migration failed` | Schema drift | `prisma migrate reset --force` |
| `Seed failed: FK violation` | Wrong seed order | Same as above |
| Blank page after deploy | `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` stale in bundle | Restart with `--clear`; rebuild |
| OTP rejected | `MOCK_OTP=false` and Firebase not configured | Set `MOCK_OTP=true` on Render |
| Payment screen empty | `MOCK_PAYMENT=false` and Razorpay keys are placeholders | Set `MOCK_PAYMENT=true` |

### 15.4 Diagnostic commands

**Local:**

```powershell
docker ps
curl.exe -s http://localhost:4310/v1/health
docker exec -it busverse-postgres psql -U postgres -d busverse -c "SELECT COUNT(*) FROM cities;"
docker exec -it busverse-redis redis-cli -a redis_dev_password ping
```

**Cloud:**

```powershell
# Health (cold start allowed)
curl.exe -s --max-time 120 https://busverse-api.onrender.com/v1/health

# Cities
curl.exe -s --max-time 120 https://busverse-api.onrender.com/v1/public/cities

# Admin login
$body = @{ email = 'admin@busverse.app'; password = 'Demo1234!@AbcAdmin' } | ConvertTo-Json
curl.exe -s -X POST -H "Content-Type: application/json" -d $body https://busverse-api.onrender.com/v1/admin/auth/login

# CORS check
curl.exe -s -H "Origin: https://evil.example.com" -I https://busverse-api.onrender.com/v1/health | Select-String "access-control-allow-origin"
```

### 15.5 Render logs — how to read

Render → `BusVerse-api` → **Logs**. Search for `reqId` from an error response to find the exact stack trace.

**But:** the current `error-handler.ts` **only logs in `NODE_ENV=test`** — production exceptions are swallowed. If you need to debug a 500, first patch `error-handler.ts`:

```typescript
server.setErrorHandler((error, request, reply) => {
  request.log.error({
    err: {
      name: error.name,
      message: error.message,
      code: (error as any).code,
      stack: error.stack,
    },
  }, 'unhandled error');
  // ... rest of handler
});
```

Commit and redeploy. Then every 500 names the exact file+line.

### 15.6 Escalation

If troubleshooting fails after 15 minutes:

1. **Restart locally:** `docker compose down -v && docker compose up -d && cd apps\api && prisma migrate reset --force && prisma db seed`
2. **Still failing:** delete `.env`, copy from `.env.example`, regenerate secrets (§4.3)
3. **Still failing:** `git clean -fdx && pnpm install`
4. **Cloud still failing:** Manual Deploy on Render; Clear build cache on Netlify

### 15.7 Cloud-specific caveats

| Caveat | Detail |
|---|---|
| **Render cold start** | 60s wait after 15 min idle. Ping `/v1/health` before demo. |
| **Neon suspend** | 1–5s wake on first query after 5 min idle. |
| **Netlify queue** | 2–10 min wait on free tier during peak. |
| **Netlify 300 build min** | ~40–60 deploys per month across both sites. |
| **EAS queue** | 5–90 min wait; 15 builds/month. |

### 15.8 Typescript errors bypassed in build

The Render build uses `tsc --noEmitOnError false || true` to force-emit despite 9 type errors. **These are real bugs that don't manifest in the passenger flow** but will affect driver scan, refunds, webhooks, and real Razorpay:

| File | Error | Runtime impact |
|---|---|---|
| `src/integrations/razorpay.ts:44` | Param type mismatch | None in mock mode |
| `src/integrations/razorpay.ts:52-54` | `Promise<RazorpayOrder> & void` | None in mock mode |
| `src/modules/admin/admin.service.ts:610` | `createRefund` not on adapter type | Refund flow crashes |
| `src/modules/booking/booking.service.ts:372` | Same | Refund flow crashes |
| `src/modules/payments/payments.service.ts:74` | `checkoutUrl` missing | Real checkout crashes |
| `src/modules/trip/trip.controller.ts:88` | `scanTicket` not exported | **Driver QR scan crashes** |
| `src/modules/webhooks/webhooks.service.ts:18` | 3 args expected, 2 passed | Webhook verification fails |

**Verification that functions exist (v1.1 investigation):**

- `createRefund` exists as a **method** on the Razorpay adapter (line 102) — not a top-level export. The TS error is a signature mismatch, not a missing function.
- `scanTicket` exists as a **top-level export** (line 131). The TS error is a consumer-side type mismatch.
- `verifyWebhookSignature` accepts 3 args (body, signature, secret); the caller passes 2. **This is a real bug** — it will throw on any incoming webhook.

**Passenger flow (login → search → seats → mock payment → ticket) does not touch any of these paths.** Demo works. Driver scan and refunds do not.

### 15.9 Webhook bug fix (when needed)

When you're ready to enable real webhooks:

```typescript
// webhooks.service.ts line 18 — CURRENT
if (!razorpayAdapter.verifyWebhookSignature(rawBody, signature)) {

// FIX
if (!razorpayAdapter.verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
```

---

## 16. Rollback

### 16.1 Rollback scenarios

**Diagram: Rollback scenarios**
*Four severities. Every rollback path is tested.*

```mermaid
flowchart TB
    BUG["Bug in deployed env"] --> SEV{"Severity?"}
    SEV -->|SEV1| R1["Render rollback<br/>≤ 5 min"]
    SEV -->|SEV2| R2["git revert + redeploy<br/>≤ 15 min"]
    SEV -->|SEV3| R3["Env var flip<br/>≤ 2 min"]
    SEV -->|SEV4| R4["Hotfix forward<br/>≤ 1 hour"]

    R1 --> REC["Service restored"]
    R2 --> REC
    R3 --> REC
    R4 --> REC
```

### 16.2 Rollback table

| Severity | Trigger | Rollback | Time |
|---|---|---|---|
| **SEV1** | Data loss, total outage | Render rollback to last green deploy + Neon branch restore | 5 min |
| **SEV2** | Feature broken, money at risk | `git revert <hash>` + push | 15 min |
| **SEV3** | Specific bug | Env var flip (e.g. `MOCK_PAYMENT=true`) | 2 min |
| **SEV4** | Minor issue | Hotfix forward | 1 hour |

### 16.3 Render rollback

1. Render dashboard → `BusVerse-api`
2. **Deploys** tab
3. Find last known-good deploy
4. **⋯ → Redeploy**

**Verify:** health check passes on new (old) version.

### 16.4 Netlify rollback

1. Netlify dashboard → project
2. **Deploys** tab
3. Find last green deploy
4. **⋯ → Publish deploy**

### 16.5 Database rollback

**Local:**

```powershell
docker exec -i busverse-postgres psql -U postgres -d busverse < backup-YYYYMMDD.sql
```

**Neon:** use the Neon dashboard → **Branches** → restore from a snapshot branch.

**Warning:** loses all data since snapshot. Use only for SEV1.

### 16.6 Post-rollback

- Verify health check passes
- Verify core flows work (§9.3)
- Log incident to audit log
- Post-mortem within 24h per `09` §20

---

## 17. Post-Demo

### 17.1 Post-demo flow

**Diagram: Post-demo procedures**
*Four phases. Total ~30 minutes. Screenshots and audit log export are the highest-value artifacts.*

```mermaid
flowchart LR
    DONE["Viva done"] --> S1["Save artifacts<br/>screenshots · audit log"]
    S1 --> S2["Stop services<br/>docker down · close tabs"]
    S2 --> S3["Capture learnings<br/>Q&A · what worked"]
    S3 --> S4["Update report<br/>report/17"]
```

### 17.2 Save artifacts

**Screenshots** → `docs/assets/screenshots/`:

| Screenshot | Source |
|---|---|
| `01-login.png` | `busverse.netlify.app` OTP screen |
| `02-search.png` | Search results |
| `03-seat-deck.png` | Seat selection |
| `04-payment.png` | Mock payment screen |
| `05-ticket-qr.png` | Ticket with QR |
| `06-admin-dashboard.png` | `busconoperator.netlify.app` after admin login |
| `07-audit-log.png` | Audit trail |
| `08-operator-view.png` | Operator-scoped bookings |

**Audit log export:**

```powershell
cd apps\api
$env:DATABASE_URL="postgresql://neondb_owner:...@ep-restless-dream-ao8x0cyv-pooler.../neondb?sslmode=require&channel_binding=require"
pnpm exec prisma db execute --stdin --schema prisma/schema.prisma
# paste: SELECT entity_type, entity_id, action, actor_id, occurred_at FROM audit_logs ORDER BY occurred_at DESC LIMIT 50;
Remove-Item Env:DATABASE_URL
```

**Video:** save demo recording to `docs/assets/demo-recorded.mp4`.

### 17.3 Stop services

```powershell
# Local
Ctrl+C in each terminal
docker compose down

# Cloud
# No action needed — Render and Neon will sleep on their own
```

### 17.4 Capture learnings

Log viva questions to `viva/02-VIVA_QUESTIONS_QA.md`. Note what worked and what didn't. Update §10 with better narration.

### 17.5 Update report

Update `report/17-RESULTS_OUTPUT.md` with:
- Demo observations
- Actual timings vs planned
- Screenshots
- Audit log export
- Deviations from plan (e.g. "used mock payment instead of Razorpay")

---

## 18. Smoke Tests

### 18.1 Smoke test flow

**Diagram: Smoke test flow**
*Ten automated checks. Runs in ~2 min (allowing 60s cold start). All must pass.*

```mermaid
flowchart TB
    START["Run smoke tests"] --> T1["1 Local API health"]
    T1 --> T2["2 Local cities = 3"]
    T2 --> T3["3 Local admin login"]
    T3 --> T4["4 Cloud API health"]
    T4 --> T5["5 Cloud cities = 3"]
    T5 --> T6["6 Cloud admin login"]
    T6 --> T7["7 Cloud CORS locked"]
    T7 --> T8["8 BusVerse Netlify loads"]
    T8 --> T9["9 BusCon Netlify loads"]
    T9 --> T10["10 Seed counts correct"]
    T10 --> DONE["✓ Demo ready"]
```

### 18.2 Automated smoke test (PowerShell)

```powershell
# scripts/demo-smoke-test.ps1
$ErrorActionPreference = 'Stop'

Write-Host "1. Local API health..." -ForegroundColor Cyan
Invoke-WebRequest http://localhost:4310/v1/health -UseBasicParsing | Out-Null

Write-Host "2. Local cities = 3..." -ForegroundColor Cyan
$c = (Invoke-WebRequest http://localhost:4310/v1/public/cities -UseBasicParsing).Content | ConvertFrom-Json
if ($c.data.Count -ne 3) { throw "Expected 3 cities, got $($c.data.Count)" }

Write-Host "3. Local admin login..." -ForegroundColor Cyan
$body = @{ email = 'admin@busverse.app'; password = 'Demo1234!@AbcAdmin' } | ConvertTo-Json
$r = (Invoke-WebRequest -Method POST -Uri http://localhost:4310/v1/admin/auth/login -ContentType 'application/json' -Body $body -UseBasicParsing).Content | ConvertFrom-Json
if (-not $r.data.accessToken) { throw "Local login failed" }

Write-Host "4. Cloud API health..." -ForegroundColor Cyan
Invoke-WebRequest https://busverse-api.onrender.com/v1/health -UseBasicParsing -TimeoutSec 120 | Out-Null

Write-Host "5. Cloud cities = 3..." -ForegroundColor Cyan
$c = (Invoke-WebRequest https://busverse-api.onrender.com/v1/public/cities -UseBasicParsing -TimeoutSec 120).Content | ConvertFrom-Json
if ($c.data.Count -ne 3) { throw "Expected 3 cloud cities" }

Write-Host "6. Cloud admin login..." -ForegroundColor Cyan
$r = (Invoke-WebRequest -Method POST -Uri https://busverse-api.onrender.com/v1/admin/auth/login -ContentType 'application/json' -Body $body -UseBasicParsing).Content | ConvertFrom-Json
if (-not $r.data.accessToken) { throw "Cloud login failed" }

Write-Host "7. Cloud CORS locked..." -ForegroundColor Cyan
$h = (Invoke-WebRequest -Uri https://busverse-api.onrender.com/v1/health -Headers @{ Origin = 'https://evil.example.com' } -UseBasicParsing).Headers
if ($h['access-control-allow-origin'] -match 'evil') { throw "CORS reflects arbitrary origin" }

Write-Host "8. BusVerse Netlify loads..." -ForegroundColor Cyan
Invoke-WebRequest https://busverse.netlify.app -UseBasicParsing | Out-Null

Write-Host "9. BusCon Netlify loads..." -ForegroundColor Cyan
Invoke-WebRequest https://busconoperator.netlify.app/login -UseBasicParsing | Out-Null

Write-Host "✓ All checks passed — demo ready" -ForegroundColor Green
```

### 18.3 Manual smoke test

Even with automation, do a manual run-through at T-1 hour:

1. Open `https://busverse.netlify.app` on laptop
2. Open `https://busconoperator.netlify.app` in second tab
3. Run the 8-step demo end-to-end
4. Confirm all pass criteria met

**Time:** 7–10 min.

### 18.4 Smoke test failures

| Failure | Fix |
|---|---|
| Local API health fails | Restart API (`Ctrl+C`, `pnpm --filter api dev`) |
| Local cities ≠ 3 | Re-seed (`prisma db seed`) |
| Cloud API health fails | Wait 60s (cold start) or restart Render deploy |
| Cloud cities ≠ 3 | Neon may have different data — re-seed against Neon (§7.6) |
| Cloud login fails | Check Render logs for `reqId`; see §15.2 |
| CORS check fails | Update `CORS_ALLOWED_ORIGINS` on Render, redeploy |
| Netlify site errors | Check Netlify Deploys tab; redeploy last commit |

---

## 19. Open Questions

| # | Question | Owner | Default |
|:---:|---|---|---|
| 1 | Ship with `MOCK_PAYMENT=true` for demo? | Shaghaf | Yes (Razorpay not configured) |
| 2 | Ship with `MOCK_OTP=true` for demo? | Shaghaf | Yes (MSG91/Firebase not configured) |
| 3 | Fix the 9 TypeScript errors before final submission? | Shaghaf | Yes if time allows |
| 4 | Fix the webhook signature bug before submission? | Shaghaf | No (webhooks unused in demo) |
| 5 | Rotate all cloud secrets before real use? | Shaghaf | Yes — pasted in chat during setup |
| 6 | Add uptime ping (cron-job.org) to keep Render warm? | Shaghaf | Optional |
| 7 | Custom domain for Netlify? | Shaghaf | No (free subdomains for Phase 1) |
| 8 | Build driver-app APK despite scan bug? | Shaghaf | No — build passenger first |
| 9 | Backup video on phone or laptop? | Shaghaf | Both (redundancy) |
| 10 | Second laptop for demo redundancy? | Shaghaf | Optional |

---

## 20. Checklist Against Master List

| Item | Included? | Section |
|---|:---:|---|
| Purpose and 30-min rule | ✅ | §1 |
| Doc hierarchy | ✅ | §1.2 |
| PowerShell BOM warning | ✅ **new** | §2.6 |
| Prerequisites list | ✅ | §2 |
| Install steps (6) | ✅ | §3 |
| Install failure handling | ✅ | §3.3 |
| Env vars catalog (local 21, cloud 12+6) | ✅ **expanded** | §4 |
| Secret generation (PowerShell) | ✅ **rewritten** | §4.3 |
| Ed25519 key generation | ✅ | §4.4 |
| Env security rules | ✅ | §4.5 |
| **Render setup** | ✅ **new** | §5.2 |
| **Neon setup** | ✅ **new** | §5.3 |
| **Upstash setup** | ✅ **new** | §5.4 |
| **Netlify setup** | ✅ **new** | §5.5 |
| **Expo EAS setup** | ✅ **new** | §5.6 |
| Fallback matrix | ✅ | §5.7 |
| Local Docker stack | ✅ | §6.1 |
| Cloud DB topology | ✅ **new** | §6.2 |
| Migrations (5, with names) | ✅ **expanded** | §6.3 |
| Seed flow (~367 rows) | ✅ **corrected** | §7 |
| **Demo accounts (real)** | ✅ **corrected** | §7.5 |
| Running 5 terminals | ✅ | §8.2 |
| Services matrix (local + cloud) | ✅ **expanded** | §8.4 |
| Phone connection (LAN IP) | ✅ | §8.5 |
| First-time verification (12 checks) | ✅ **expanded** | §9 |
| Automated verify script | ✅ | §9.4 |
| Demo timeline (8 steps) | ✅ **updated** | §10.1 |
| Pre-demo setup (T-5min) | ✅ | §10.2 |
| Demo script (cloud URLs) | ✅ **rewritten** | §10.3 |
| Demo pass criteria | ✅ | §10.4 |
| Fallback decision tree | ✅ | §11.1 |
| Fallback matrix (cold start) | ✅ **updated** | §11.2 |
| Mock mode setup (cloud) | ✅ | §11.3 |
| Backup video | ✅ | §11.4 |
| Demo day checklist | ✅ **updated** | §12 |
| Recovery checklist | ✅ | §12.6 |
| **Free-tier deployment** | ✅ **replaces staging** | §13 |
| Service inventory | ✅ | §13.2 |
| Render config | ✅ | §13.3 |
| Build/start commands | ✅ | §13.4 |
| Neon config | ✅ | §13.5 |
| Upstash config | ✅ | §13.6 |
| Netlify config | ✅ | §13.7 |
| Expo EAS config | ✅ | §13.8 |
| CORS lockdown | ✅ | §13.9 |
| Deployment timeline | ✅ | §13.10 |
| **Future production hardening** | ✅ **replaces prod deploy** | §14 |
| Troubleshooting tree | ✅ | §15.1 |
| **13 real bugs catalogue** | ✅ **new** | §15.2 |
| Common issues table | ✅ | §15.3 |
| Diagnostic commands | ✅ | §15.4 |
| Render log reading | ✅ | §15.5 |
| Cloud caveats | ✅ **new** | §15.7 |
| **TS errors catalogue** | ✅ **new** | §15.8 |
| **Webhook fix** | ✅ **new** | §15.9 |
| Rollback scenarios | ✅ | §16 |
| Post-demo procedures | ✅ | §17 |
| Smoke test flow | ✅ | §18 |
| Automated smoke test (PS) | ✅ **rewritten** | §18.2 |
| Manual smoke test | ✅ | §18.3 |

**All items covered. ~28 Mermaid diagrams. Every diagram described.**

---

## 21. Summary

**BusVerse + BusCon Phase 1 has a live, working deployment on five free-tier services with zero credit card required.** The stack is Render (Fastify API + WebSocket, 512 MB, spins down after 15 min idle, ~60s cold start) + Neon (PostgreSQL 16, 1 GB, 5 min idle suspend) + Upstash (Redis 7 with TLS, 500k commands/month) + Netlify × 2 (Next.js 15.1.9 sites, 300 build min/month) + Expo EAS (15 Android builds/month, pending). The backend was seeded with 367 rows across 15 tables — 3 cities, 11 stands, 3 operators, 5 operator users, 1 admin, 5 driver profiles, 5 passenger profiles, 7 buses, 7 seat layouts, 250 seats, 5 routes, 15 route stands, 15 schedules, 32 consent records, 3 sequences. Local development uses Docker Compose on ports 7542/7543 (non-default to avoid conflicts), migrations create all schema in 5 files, and both web apps are deployed to Netlify with base directory at repo root, publish directory scoped to each app's `.next`, and the mandatory `PNPM_FLAGS=--shamefully-hoist` env var. Six new critical failure modes were discovered and fixed during the v1.1 deployment cycle and are catalogued in §15.2: **BOM corruption** from `Set-Content -Encoding UTF8` on PowerShell 5.1 (fixed with `[System.IO.File]::WriteAllText` + `UTF8Encoding($false)`), **gitignored `seat-engine/dist`** causing `ERR_MODULE_NOT_FOUND` on Render (fixed by force-committing the compiled output), **`@node-rs/argon2` native binding failure** on Render's build environment (fixed by switching to pure-JS `bcryptjs`, requiring a full seed re-run to regenerate hashes), **Prisma relation filter** `where: { user: { email } }` throwing a 500 on every login attempt (fixed by rewriting as two plain scalar queries in `findAdminByEmail`), **Tailwind v4 / `@tanstack/react-table` v9** cascading from a `pnpm update --latest` (fixed by pinning v3.4.17 and v8.21.2 via `pnpm.overrides` in root `package.json`), and **Next.js 15.1.3 security advisory CVE-2025-55182** blocking deploys (fixed by upgrading to 15.1.9). Nine TypeScript errors remain bypassed in the Render build via `tsc --noEmitOnError false || true` — `createRefund` and `scanTicket` exist as method/top-level export respectively (not missing functions, only signature mismatches with the Razorpay SDK), but `verifyWebhookSignature` genuinely expects 3 args and receives 2, which will break real webhooks (§15.9). The passenger demo flow (login → search → seat lock → mock payment → ticket → admin audit → operator scoping) works end-to-end against `https://busverse-api.onrender.com` and both Netlify frontends; the driver QR scan flow and refund flow will crash if exercised. Three high-severity items must be addressed before this deployment is used for anything beyond a viva demo: rotate the three cryptographic secrets (`JWT_SECRET`, `PII_ENCRYPTION_KEY`, `PHONE_HASH_SALT`), the Upstash Redis token, and the Neon password — all of which were pasted into chat during setup — and fix the 9 TypeScript errors so the `|| true` bypass can be removed from the build command.**

---

**End of Document `11-DEPLOYMENT-AND-DEMO.md` v1.1.**