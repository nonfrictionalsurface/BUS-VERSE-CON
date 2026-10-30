# Incident Response

Port 4310. Compose network. Fall back to `demo-day-fallback.md` if >5 min.

## Triage

| Symptom | Section |
|---|---|
| `:4310/v1/health` not 200 | 1 |
| API container restart loop | 2 |
| WS timeout | 3 |
| 500 on authed calls | 4 |
| 500 on booking create | 5 |
| Razorpay webhook silent | 6 |
| Tests fail post-deploy | 7 |

## 1. Postgres / Redis down

`docker compose -f docker-compose.prod.yml ps`
`docker compose -f docker-compose.prod.yml logs --tail=50 postgres`
`docker compose -f docker-compose.prod.yml logs --tail=50 redis`

Fix: `docker compose -f docker-compose.prod.yml restart postgres redis api` then wait 30s.
Never `down -v` on prod. Try `down` then `up -d`. Last resort `pg_resetwal` (data loss).

## 2. API restarting

`docker compose -f docker-compose.prod.yml logs --tail=100 api`

- Missing env var -> add to `.env.production`, `up -d --force-recreate api`
- `EADDRINUSE :4310` -> `netstat -ano | findstr 4310`
- `QR_SIGNING_PRIVATE_KEY must be 32 raw bytes` -> `key-recovery.md` 4

## 3. WS missing

`docker compose -f docker-compose.prod.yml logs api | Select-String "Realtime:"`

Expected: `Realtime: ws://0.0.0.0:4310/v1/ws`.
Absent = code bug, rebuild `--build --force-recreate`.
Present but client fails = JWT not within 5s (W2, handover 4.5).

## 4. JWT_SECRET rotated

All tokens invalidated. Revert `.env.production`, `up -d --force-recreate api`.
Never rotate on demo day. See `key-recovery.md` 1.

## 5. Booking create 500

Inspect columns: `docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d busverse -c "\d seat_locks"`
Find stuck: `SELECT id FROM seat_locks WHERE expires_at < NOW() AND deleted_at IS NULL LIMIT 20;`

5-min cron N1 (handover 4.3) normally clears. Else restart api.
Advisory locks (A2, handover 4.2) are for GST invoices, not seat locks.

## 6. Razorpay webhook silent

`docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d busverse -c "SELECT id, event_type, created_at FROM gateway_webhooks ORDER BY created_at DESC LIMIT 10;"`

Empty = URL wrong. Rows but bookings PENDING = `RAZORPAY_WEBHOOK_SECRET` mismatch (trailing whitespace).

## 7. Migrations

`docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy` (idempotent, never reset).
Verify: `... migrate status` -> "up to date!"

## Escalation

Save `docker compose logs > incident-$(Get-Date -Format yyyyMMdd-HHmm).log`, then `docker stats --no-stream`. Fall back to `demo-day-fallback.md`.