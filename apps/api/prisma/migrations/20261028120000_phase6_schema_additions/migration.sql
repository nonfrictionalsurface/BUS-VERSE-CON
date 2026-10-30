-- Phase 6 schema additions
-- 1. gps_samples.client_reported_speed_kmh (buscon/04 §12.2 A4)
ALTER TABLE gps_samples ADD COLUMN IF NOT EXISTS client_reported_speed_kmh numeric(5,2);

-- 2. boarding_scans unique on (ticket_id, trip_id) -- buscon/05 §11.3 replay idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uniq_boarding_scans_ticket_trip
  ON boarding_scans (ticket_id, trip_id);