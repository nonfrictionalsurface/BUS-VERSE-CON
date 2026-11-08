-- Seat Layout Engine v2: constraints and partial indexes. Idempotent: safe to run more than once.
-- Run after the 20261103090000_seat_layout_v2 migration:
--   pnpm --filter api exec prisma db execute --file prisma/seat-layout-v2.constraints.sql

-- One live seat per key inside a layout (soft-deleted seats free their key).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_seats_layout_key
  ON seats (layout_id, seat_key)
  WHERE deleted_at IS NULL AND seat_key IS NOT NULL;

-- Align the database with what the API accepts.
ALTER TABLE buses DROP CONSTRAINT IF EXISTS chk_buses_capacity;
ALTER TABLE buses ADD CONSTRAINT chk_buses_capacity CHECK (capacity > 0 AND capacity <= 150);

ALTER TABLE buses DROP CONSTRAINT IF EXISTS chk_buses_bus_type;
ALTER TABLE buses ADD CONSTRAINT chk_buses_bus_type
  CHECK (bus_type IN ('SEATER','AC_SEATER','NON_AC_SEATER','SLEEPER','AC_SLEEPER','NON_AC_SLEEPER','SEMI_SLEEPER','AC_SEMI_SLEEPER'));

ALTER TABLE seats DROP CONSTRAINT IF EXISTS chk_seats_seat_type;
ALTER TABLE seats ADD CONSTRAINT chk_seats_seat_type CHECK (seat_type IN ('SEATER','SLEEPER','SEMI_SLEEPER'));
