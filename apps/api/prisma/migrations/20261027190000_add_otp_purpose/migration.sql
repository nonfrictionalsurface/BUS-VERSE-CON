-- Add purpose column to distinguish LOGIN vs RESET OTPs.
-- Prevents account takeover: a LOGIN OTP cannot be consumed at /reset/verify.
ALTER TABLE "otp_challenges"
  ADD COLUMN "purpose" VARCHAR(20) NOT NULL DEFAULT 'LOGIN';

-- New compound index; keep old one for unscoped lookups.
CREATE INDEX "otp_challenges_phone_or_email_purpose_expires_at_idx"
  ON "otp_challenges"("phone_or_email", "purpose", "expires_at");