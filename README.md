# BusVerse + BusCon

**Online bus ticket booking with one shared seat layout for every platform.**

**Live demo:** https://busshowcase.netlify.app

> BCA 5th Semester project by **Shaghaf**, VSCMS (Affiliated to MCU). 

---

## The idea

If a bus is registered separately on two booking platforms, each platform keeps its own seat layout and its own bookings. Neither knows what the other has sold, so the same seat can be sold twice.

This project fixes that by registering the bus **once** and letting every platform use the **same seat layout and the same booking record**.

| Part | Who uses it | What it does |
|------|-------------|--------------|
| **BusCon** | Bus operators and platform admins | Register buses, design seat layouts, create routes and schedules, assign drivers. The admin approves everything before it goes live. It is the single source of truth for buses and seats. |
| **BusVerse** | Passengers | Search buses, pick seats, pay and get a QR ticket. It reads seats from BusCon and keeps no copy of its own. |
| **Driver App** | Drivers | See assigned trips and verify passengers by scanning their QR ticket at boarding. |

This repository is the **backend API** (`apps/api`) that serves all three.

## Key features

- **Atomic seat locking.** A selected seat is locked for 5 minutes, so exactly one of many simultaneous requests succeeds.
- **Signed QR tickets.** Tickets carry an Ed25519 signature and can be verified on the driver's phone, even offline.
- **Shared seat layout.** One bus record serves any number of booking apps.
- **Admin approval.** Only approved buses, routes and drivers can sell tickets.
- **Female-only seats**, boarding and drop-off stands, and live trip tracking.

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20, Fastify, TypeScript (pnpm monorepo) |
| Database | PostgreSQL 16 |
| Cache and locks | Redis 7 |
| Hosting | Netlify (web), Render (API), Neon (Postgres), Upstash (Redis), Expo EAS (mobile builds) |

The backend is a modular monolith with six modules: **Identity, Network, Booking, Payments, Trip, Audit**.

## Prerequisites

- Node.js 20 LTS (or higher)
- pnpm 9
- Docker Desktop

## Setup

```bash
pnpm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
docker compose up -d
pnpm --filter api dev
```

## Verify

```bash
curl http://localhost:4000/v1/health
# -> {"status":"ok"}

curl http://localhost:4000/v1/status
# -> {"status":"ok","checks":{"postgres":"ok","redis":"ok"}}
```

## Docker services

| Service | Port | Note |
|---------|------|------|
| Postgres 16 | 5433 | Not 5432, to avoid clashing with a local Postgres |
| Redis 7 | 6379 | |

## Project structure

```text
apps/api/                Fastify backend API
packages/config/         Shared ESLint + TypeScript config
packages/shared-types/   Shared TypeScript types
docs/                    Specification documents
```

## Demo flow

The live demo follows this path on the Kanpur to Lucknow corridor:

1. The operator registers a bus and designs its seat layout in BusCon.
2. The operator creates a route and a schedule.
3. The admin approves the bus; the operator assigns a driver.
4. A passenger signs in with an OTP, searches and picks a seat in BusVerse.
5. The seat is locked with a 5-minute countdown, and the passenger pays.
6. The passenger receives a signed QR ticket.
7. The driver scans the QR in the Driver App and starts the trip.

## Documentation

- Specification documents: `docs/`
- Build status, phase by phase: [`docs/00-BUILD-PROGRESS.md`](docs/00-BUILD-PROGRESS.md)

## Author

**Shaghaf**, BCA 5th Semester, VSCMS (Affiliated to MCU).
