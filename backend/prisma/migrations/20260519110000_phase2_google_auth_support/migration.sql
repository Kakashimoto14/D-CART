DO $$
BEGIN
  CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
  ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN IF NOT EXISTS "googleSub" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_googleSub_key" ON "users"("googleSub");
CREATE INDEX IF NOT EXISTS "users_authProvider_idx" ON "users"("authProvider");
