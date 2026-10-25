BEGIN;

ALTER TABLE "blood_pressure_readings"
DROP CONSTRAINT "blood_pressure_readings_user_id_fkey";

DROP INDEX "blood_pressure_readings_user_id_recorded_at_idx";

ALTER TABLE "blood_pressure_readings"
ADD COLUMN "user_id_new" VARCHAR(50);

UPDATE "blood_pressure_readings" AS bp
SET "user_id_new" = users."user_id"
FROM "users"
WHERE users."id" = bp."user_id";

ALTER TABLE "blood_pressure_readings"
DROP COLUMN "user_id";

ALTER TABLE "blood_pressure_readings"
RENAME COLUMN "user_id_new" TO "user_id";

ALTER TABLE "blood_pressure_readings"
ALTER COLUMN "user_id" SET NOT NULL;

CREATE INDEX "blood_pressure_readings_user_id_recorded_at_idx"
ON "blood_pressure_readings"("user_id", "recorded_at");

ALTER TABLE "blood_pressure_readings"
ADD CONSTRAINT "blood_pressure_readings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
