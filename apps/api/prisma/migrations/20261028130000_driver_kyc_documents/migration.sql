-- Phase 6: driver KYC documents storage (buscon/02 §14)
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS kyc_documents_json jsonb;