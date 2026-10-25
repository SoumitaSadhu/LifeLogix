CREATE TABLE "blood_sugar_readings" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "value_mg_dl" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_sugar_readings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blood_sugar_readings_user_id_recorded_at_idx"
ON "blood_sugar_readings"("user_id", "recorded_at");

ALTER TABLE "blood_sugar_readings"
ADD CONSTRAINT "blood_sugar_readings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;
