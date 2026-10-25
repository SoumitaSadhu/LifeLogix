CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50),
    "email" VARCHAR(150),
    "mobile" VARCHAR(15),
    "is_verified" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

CREATE TABLE "user_details" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150),
    "age" INTEGER,
    "weight_kg" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "conditions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "target_weight_kg" DOUBLE PRECISION,
    "target_bp" VARCHAR(20),
    "exercise_goal" VARCHAR(200),
    "goal_notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_details_user_id_key" ON "user_details"("user_id");

ALTER TABLE "user_details"
ADD CONSTRAINT "user_details_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;
