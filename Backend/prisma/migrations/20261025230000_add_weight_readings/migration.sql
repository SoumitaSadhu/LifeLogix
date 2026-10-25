CREATE TABLE "weight_readings" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_readings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "weight_readings_user_id_recorded_at_idx"
ON "weight_readings"("user_id", "recorded_at");

ALTER TABLE "weight_readings"
ADD CONSTRAINT "weight_readings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;
