-- ============================================================
-- Post-migration SQL: triggers, partial uniques, CHECKs,
-- audit immutability, sequence functions
-- Run with: prisma db execute --file prisma/constraints.sql
-- ============================================================

-- 1. Trigger function for updated_at + version
CREATE OR REPLACE FUNCTION trigger_set_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply trigger to all mutable tables (27)
CREATE TRIGGER set_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON passenger_profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON operator_users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON driver_profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON otp_challenges FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON refresh_token_chains FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON consent_records FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON stands FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON operators FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON buses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON seat_layouts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON seats FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON route_stands FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON seat_locks FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON booking_passengers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON gst_invoices FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();
CREATE TRIGGER set_updated BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION trigger_set_updated();

-- 3. Partial unique indexes (soft-delete aware)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_phone_active
  ON users (phone) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_phone_hash_active
  ON users (phone_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email_active
  ON users (email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_operators_gstin
  ON operators (gstin) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_buses_registration
  ON buses (registration_number) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_driver_license
  ON driver_profiles (license_number) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_seat_layouts_bus
  ON seat_layouts (bus_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_seats_layout_label
  ON seats (layout_id, seat_label) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_route_stands_sequence
  ON route_stands (route_id, sequence) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_route_stands_stand
  ON route_stands (route_id, stand_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_seat_locks_schedule_seat
  ON seat_locks (schedule_id, seat_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_passengers_schedule_seat
  ON booking_passengers (schedule_id, seat_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_reference
  ON bookings (booking_reference);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tickets_booking
  ON tickets (booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gst_invoices_number
  ON gst_invoices (invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gst_invoices_booking
  ON gst_invoices (booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_consent_records_active
  ON consent_records (user_id, purpose) WHERE revoked_at IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gateway_webhooks_dedup
  ON gateway_webhooks (payment_id, event_type, payload_hash);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_idempotency_active
  ON payments (idempotency_key) WHERE deleted_at IS NULL;

-- 4. CHECK constraints for enum-like varchar columns
ALTER TABLE users ADD CONSTRAINT chk_users_phone_e164
  CHECK (phone ~ '^\+\d{10,15}$');
ALTER TABLE users ADD CONSTRAINT chk_users_email_lowercase
  CHECK (email IS NULL OR email = lower(email));
ALTER TABLE operators ADD CONSTRAINT chk_operators_status
  CHECK (status IN ('APPLIED','PENDING_REVIEW','APPROVED','REJECTED','ACTIVE','SUSPENDED','DEACTIVATED'));
ALTER TABLE buses ADD CONSTRAINT chk_buses_capacity
  CHECK (capacity > 0 AND capacity <= 60);
ALTER TABLE buses ADD CONSTRAINT chk_buses_bus_type
  CHECK (bus_type IN ('AC_SEATER','AC_SLEEPER','NON_AC_SEATER','NON_AC_SLEEPER','AC_SEMI_SLEEPER'));
ALTER TABLE buses ADD CONSTRAINT chk_buses_approval_status
  CHECK (approval_status IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE seats ADD CONSTRAINT chk_seats_seat_type
  CHECK (seat_type IN ('SEATER','SLEEPER','SEMI_SLEEPER'));
ALTER TABLE stands ADD CONSTRAINT chk_stands_type
  CHECK (type IN ('BUS_STAND','BUS_STOP','AIRPORT','TRAIN_STATION'));
ALTER TABLE routes ADD CONSTRAINT chk_routes_diff_cities
  CHECK (origin_city_id <> destination_city_id);
ALTER TABLE schedules ADD CONSTRAINT chk_schedules_times
  CHECK (arrival_time > departure_time);
ALTER TABLE schedules ADD CONSTRAINT chk_schedules_status
  CHECK (status IN ('DRAFT','PUBLISHED','CANCELLED'));
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_status
  CHECK (status IN ('PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED'));
ALTER TABLE payments ADD CONSTRAINT chk_payments_status
  CHECK (status IN ('INITIATED','PENDING','SUCCEEDED','FAILED','EXPIRED','REFUNDED'));
ALTER TABLE refunds ADD CONSTRAINT chk_refunds_status
  CHECK (status IN ('INITIATED','PROCESSING','PROCESSED','FAILED'));
ALTER TABLE refunds ADD CONSTRAINT chk_refunds_tier
  CHECK (refund_tier IN ('TIER_FULL','TIER_75','TIER_50','TIER_ZERO','TIER_NOT_ELIGIBLE'));
ALTER TABLE refunds ADD CONSTRAINT chk_refunds_reason
  CHECK (reason IN ('PASSENGER_CANCELLED','OPERATOR_CANCELLED','TRIP_CANCELLED','DUPLICATE_CHARGE','DISPUTE'));
ALTER TABLE tickets ADD CONSTRAINT chk_tickets_status
  CHECK (status IN ('ISSUED','ACTIVE','SCANNED','USED','CANCELLED'));
ALTER TABLE trips ADD CONSTRAINT chk_trips_status
  CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'));
ALTER TABLE boarding_scans ADD CONSTRAINT chk_boarding_scans_result
  CHECK (result IN ('VALID','DUPLICATE','INVALID_SIGNATURE','INVALID_BOOKING','INVALID_TRIP'));
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_status
  CHECK (status IN ('ACTIVE','REVOKED','EXPIRED'));
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_role
  CHECK (role IN ('GUEST','REGISTERED_PASSENGER','OPERATOR_OWNER','OPERATOR_MANAGER','DRIVER','SUPER_ADMIN'));
ALTER TABLE operator_users ADD CONSTRAINT chk_operator_users_role
  CHECK (role IN ('OWNER','MANAGER'));
ALTER TABLE admin_users ADD CONSTRAINT chk_admin_users_role
  CHECK (role IN ('SUPER_ADMIN'));
ALTER TABLE driver_profiles ADD CONSTRAINT chk_driver_kyc_status
  CHECK (kyc_status IN ('INVITED','SIGNED_UP','KYC_PENDING','VERIFIED','KYC_FAILED','ACTIVE','BLOCKED','DEACTIVATED'));
ALTER TABLE consent_records ADD CONSTRAINT chk_consent_purpose
  CHECK (purpose IN ('terms_of_service','privacy_policy','marketing','analytics'));
ALTER TABLE gateway_webhooks ADD CONSTRAINT chk_gateway_webhooks_event
  CHECK (event_type IN ('payment.captured','payment.failed','refund.processed','refund.failed'));
ALTER TABLE payments ADD CONSTRAINT chk_payments_gateway
  CHECK (gateway IN ('RAZORPAY'));

-- 5. Audit log immutability
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only; % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_audit_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
CREATE TRIGGER no_audit_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- 6. Booking reference + invoice sequences (current year + next year)
CREATE SEQUENCE IF NOT EXISTS booking_reference_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS booking_reference_seq_2027 START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2026_27 START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq_2027_28 START 1;