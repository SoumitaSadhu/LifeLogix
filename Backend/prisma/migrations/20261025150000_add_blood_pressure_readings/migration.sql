CREATE TABLE "blood_pressure_readings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_pressure_readings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blood_pressure_readings_user_id_recorded_at_idx"
ON "blood_pressure_readings"("user_id", "recorded_at");

ALTER TABLE "blood_pressure_readings"
ADD CONSTRAINT "blood_pressure_readings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
