# BusVerse + BusCon - Backend

Two-sided bus booking platform. This repo is the backend API (apps/api).

## Prerequisites

- Node.js 20 LTS (or higher)
- pnpm 9
- Docker Desktop

## Setup

    pnpm install
    Copy-Item .env.example .env
    docker compose up -d
    pnpm --filter api dev

## Verify

    curl http://localhost:4000/v1/health
    # -> {"status":"ok"}

    curl http://localhost:4000/v1/status
    # -> {"status":"ok","checks":{"postgres":"ok","redis":"ok"}}

## Docker services

- Postgres 16 on port 5433 (not 5432 - avoids local Postgres conflict)
- Redis 7 on port 6379

## Project structure

    apps/api/                Fastify backend API
    packages/config/         Shared ESLint + TS config
    packages/shared-types/   Shared TS types
    docs/                    Specification documents

## Progress

See docs/00-BUILD-PROGRESS.md for phase-by-phase build status.