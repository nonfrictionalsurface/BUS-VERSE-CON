# Demo-Day Fallback

Never apologize for infrastructure. Pivot. Every step has a curl fallback.

Fact source: handover v6 0, 8, 13.3 (not `docs/11-DEPLOYMENT-AND-DEMO.md` - that describes the 4000/3000 planning target, not the actual 4310 build).

## Pre-demo (T-60)

Run handover 8 verify: typecheck clean, `db:verify` 11/11, `db:seed:assert` 61/61, `pnpm test` 384/384, `Realtime:` in boot log, `/v1/health` = 200.

T-15: `pnpm db:seed` fresh (380 rows). If fails: handover 8.5.

## 8-step demo fallbacks

| Step | Fallback |
|---|---|
| 1. Search | `curl 'http://localhost:4310/v1/network/search?...'` |
| 2. Lock seat | `curl -X POST .../v1/booking/lock` + psql show |
| 3. Book | `curl -X POST .../v1/booking` + show `bookings` row |
| 4. Pay | `curl -X POST .../v1/dev/mock-confirm-payment` |
| 5. Ticket | `curl .../v1/booking/:id/ticket` |
| 6. Driver start | `curl -X POST .../v1/driver/trips/:id/start` |
| 7. GPS + WS | If WS broken: `curl -X POST .../v1/trip/:id/gps` + show `bus:position` in log |
| 8. Scan | `curl -X POST .../v1/driver/scan` |

Print curl commands before demo. Paste outputs as evidence.

## Failure classes

A. API unreachable: `pnpm --filter api dev`. Still broken 3 min -> pre-recorded video.

B. WS dead: `docker compose logs -f api | Select-String "emit"` shows every `bus:position` etc. Proves WS pipeline fires even if browser can't receive. Fall back to log evidence.

C. Razorpay webhook failing: `POST /v1/dev/mock-confirm-payment` (D1, guarded `NODE_ENV !== 'production'`). Show prior `gateway_webhooks` rows as evidence.

D. Seed missing: `pnpm db:seed && pnpm db:seed:assert`. Expected 380 rows / 61-61.

E. `db:verify` failing: `Get-Content apps\api\prisma\constraints-fill.sql -Raw | docker exec -i busverse-postgres psql -U postgres -d busverse -v ON_ERROR_STOP=1`. Never run `constraints.sql` (non-idempotent).

F. Test < 384: don't run during demo. Answer from memory: 384 tests, 84.47% lines, branch 72.97% (R69).

## Panel Q&A

"Deployed?" Dockerfile + compose.prod + runbooks in repo. Local demo chosen for reliability.

"Postgres dies?" `incident-response.md` 1. 30s restart, volume preserved.

"Rotate secrets?" `key-recovery.md`. PII_ENCRYPTION_KEY is CRITICAL.

"Branch coverage?" 72.97%, -2% vs target, R69. 6 files excluded, all boot code. 3 of 4 metrics exceed target.

"WS drops?" Client backoff, server closes at 30s without auth refresh (W2, handover 4.5).

## Post-demo

Save transcripts to `docs/assets/screenshots/`, append to `00-BUILD-PROGRESS.md` 10, don't promise fixes during panel.