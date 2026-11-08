-- Seat Layout Engine v2 (columns only)
-- Additive. Existing rows keep working: layouts without spec_json are upgraded on the fly from
-- their legacy seat rows. CHECK constraints and the partial unique index live in
-- prisma/seat-layout-v2.constraints.sql (Prisma migrate cannot model partial indexes).

-- 1. seat_layouts: canonical v2 document + revision counter
ALTER TABLE "seat_layouts" ADD COLUMN IF NOT EXISTS "spec_json" JSONB;
ALTER TABLE "seat_layouts" ADD COLUMN IF NOT EXISTS "schema_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "seat_layouts" ADD COLUMN IF NOT EXISTS "layout_rev" INTEGER NOT NULL DEFAULT 1;

-- 2. seats: stable identity key, wider label
ALTER TABLE "seats" ADD COLUMN IF NOT EXISTS "seat_key" VARCHAR(16);
ALTER TABLE "seats" ALTER COLUMN "seat_label" TYPE VARCHAR(8);
UPDATE "seats" SET "seat_key" = "seat_label" WHERE "seat_key" IS NULL;

-- 3. booking_passengers: label as printed on the ticket at booking time,
--    so later layout edits never rewrite an old ticket.
ALTER TABLE "booking_passengers" ADD COLUMN IF NOT EXISTS "seat_label" VARCHAR(8);
UPDATE "booking_passengers" bp
   SET "seat_label" = s."seat_label"
  FROM "seats" s
 WHERE s."id" = bp."seat_id" AND bp."seat_label" IS NULL;
