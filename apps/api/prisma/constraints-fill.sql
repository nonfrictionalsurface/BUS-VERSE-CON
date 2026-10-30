-- constraints-fill-v2.sql — PostgreSQL idempotent CHECKs + sequences
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_users_phone_e164') THEN ALTER TABLE users ADD CONSTRAINT chk_users_phone_e164 CHECK (phone ~ '^\+\d{10,15}$'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_users_email_lowercase') THEN ALTER TABLE users ADD CONSTRAINT chk_users_email_lowercase CHECK (email IS NULL OR email = lower(email)); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_operators_status') THEN ALTER TABLE operators ADD CONSTRAINT chk_operators_status CHECK (status IN ('APPLIED','PENDING_REVIEW','APPROVED','REJECTED','ACTIVE','SUSPENDED','DEACTIVATED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_buses_capacity') THEN ALTER TABLE buses ADD CONSTRAINT chk_buses_capacity CHECK (capacity > 0 AND capacity <= 60); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_buses_bus_type') THEN ALTER TABLE buses ADD CONSTRAINT chk_buses_bus_type CHECK (bus_type IN ('AC_SEATER','AC_SLEEPER','NON_AC_SEATER','NON_AC_SLEEPER','AC_SEMI_SLEEPER')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_buses_approval_status') THEN ALTER TABLE buses ADD CONSTRAINT chk_buses_approval_status CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_seats_seat_type') THEN ALTER TABLE seats ADD CONSTRAINT chk_seats_seat_type CHECK (seat_type IN ('SEATER','SLEEPER','SEMI_SLEEPER')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_stands_type') THEN ALTER TABLE stands ADD CONSTRAINT chk_stands_type CHECK (type IN ('BUS_STAND','BUS_STOP','AIRPORT','TRAIN_STATION')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_routes_diff_cities') THEN ALTER TABLE routes ADD CONSTRAINT chk_routes_diff_cities CHECK (origin_city_id <> destination_city_id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_schedules_times') THEN ALTER TABLE schedules ADD CONSTRAINT chk_schedules_times CHECK (arrival_time > departure_time); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_schedules_status') THEN ALTER TABLE schedules ADD CONSTRAINT chk_schedules_status CHECK (status IN ('DRAFT','PUBLISHED','CANCELLED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_bookings_status') THEN ALTER TABLE bookings ADD CONSTRAINT chk_bookings_status CHECK (status IN ('PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_payments_status') THEN ALTER TABLE payments ADD CONSTRAINT chk_payments_status CHECK (status IN ('INITIATED','PENDING','SUCCEEDED','FAILED','EXPIRED','REFUNDED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_refunds_status') THEN ALTER TABLE refunds ADD CONSTRAINT chk_refunds_status CHECK (status IN ('INITIATED','PROCESSING','PROCESSED','FAILED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_refunds_tier') THEN ALTER TABLE refunds ADD CONSTRAINT chk_refunds_tier CHECK (refund_tier IN ('TIER_FULL','TIER_75','TIER_50','TIER_ZERO','TIER_NOT_ELIGIBLE')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_refunds_reason') THEN ALTER TABLE refunds ADD CONSTRAINT chk_refunds_reason CHECK (reason IN ('PASSENGER_CANCELLED','OPERATOR_CANCELLED','TRIP_CANCELLED','DUPLICATE_CHARGE','DISPUTE')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_tickets_status') THEN ALTER TABLE tickets ADD CONSTRAINT chk_tickets_status CHECK (status IN ('ISSUED','ACTIVE','SCANNED','USED','CANCELLED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_trips_status') THEN ALTER TABLE trips ADD CONSTRAINT chk_trips_status CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_boarding_scans_result') THEN ALTER TABLE boarding_scans ADD CONSTRAINT chk_boarding_scans_result CHECK (result IN ('VALID','DUPLICATE','INVALID_SIGNATURE','INVALID_BOOKING','INVALID_TRIP')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_sessions_status') THEN ALTER TABLE sessions ADD CONSTRAINT chk_sessions_status CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_sessions_role') THEN ALTER TABLE sessions ADD CONSTRAINT chk_sessions_role CHECK (role IN ('GUEST','REGISTERED_PASSENGER','OPERATOR_OWNER','OPERATOR_MANAGER','DRIVER','SUPER_ADMIN')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_operator_users_role') THEN ALTER TABLE operator_users ADD CONSTRAINT chk_operator_users_role CHECK (role IN ('OWNER','MANAGER')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_admin_users_role') THEN ALTER TABLE admin_users ADD CONSTRAINT chk_admin_users_role CHECK (role IN ('SUPER_ADMIN')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_driver_kyc_status') THEN ALTER TABLE driver_profiles ADD CONSTRAINT chk_driver_kyc_status CHECK (kyc_status IN ('INVITED','SIGNED_UP','KYC_PENDING','VERIFIED','KYC_FAILED','ACTIVE','BLOCKED','DEACTIVATED')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_consent_purpose') THEN ALTER TABLE consent_records ADD CONSTRAINT chk_consent_purpose CHECK (purpose IN ('terms_of_service','privacy_policy','marketing','analytics')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_gateway_webhooks_event') THEN ALTER TABLE gateway_webhooks ADD CONSTRAINT chk_gateway_webhooks_event CHECK (event_type IN ('payment.captured','payment.failed','refund.processed','refund.failed')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_payments_gateway') THEN ALTER TABLE payments ADD CONSTRAINT chk_payments_gateway CHECK (gateway IN ('RAZORPAY')); END IF; END $$;
CREATE SEQUENCE IF NOT EXISTS booking_reference_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS booking_reference_seq_2027 START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2026_27 START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2027_28 START 1;

-- Phase 5 - webhook dedup unique index (06 §7.5, 07 §13.3, 09 §13.4)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gateway_webhooks_dedup ON gateway_webhooks (payment_id, event_type, payload_hash);

-- Phase 6: boarding_scans unique (buscon/05 §11.3)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_boarding_scans_ticket_trip ON boarding_scans (ticket_id, trip_id);
-- Phase 6: gps_samples.client_reported_speed_kmh (buscon/04 §12.2 A4)
ALTER TABLE gps_samples ADD COLUMN IF NOT EXISTS client_reported_speed_kmh numeric(5,2);

-- Phase 7 - audit_logs immutability (09 §15.3)
CREATE OR REPLACE FUNCTION prevent_audit_update() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (UPDATE rejected)';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_audit_delete() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (DELETE rejected)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();
-- ────────────────────────────────────────────────────────────
-- R40 realignment (Phase 11): align CHECK enums with shared/01
-- chk_stands_type:   + BUS_STOP, AIRPORT, TRAIN_STATION
-- chk_buses_bus_type: + NON_AC_SEATER
-- Idempotent: DROP IF EXISTS + ADD
-- ────────────────────────────────────────────────────────────
ALTER TABLE stands DROP CONSTRAINT IF EXISTS chk_stands_type;
ALTER TABLE stands ADD CONSTRAINT chk_stands_type
  CHECK (type IN ('BUS_STAND', 'BUS_STOP', 'AIRPORT', 'TRAIN_STATION', 'PICKUP_POINT', 'DROP_POINT'));

ALTER TABLE buses DROP CONSTRAINT IF EXISTS chk_buses_bus_type;
ALTER TABLE buses ADD CONSTRAINT chk_buses_bus_type
  CHECK (bus_type IN ('SEATER', 'AC_SEATER', 'SLEEPER', 'AC_SLEEPER', 'SEMI_SLEEPER', 'NON_AC_SEATER'));