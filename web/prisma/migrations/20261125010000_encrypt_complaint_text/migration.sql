-- Accused details are now stored encrypted, which is longer than the old VARCHAR limits.
ALTER TABLE "AccusedPerson" ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "role" SET DATA TYPE TEXT,
ALTER COLUMN "org" SET DATA TYPE TEXT,
ALTER COLUMN "facebookUrl" SET DATA TYPE TEXT,
ALTER COLUMN "photoUrl" SET DATA TYPE TEXT,
ADD COLUMN "nameIdx" VARCHAR(64);

-- CreateIndex
CREATE INDEX "AccusedPerson_nameIdx_idx" ON "AccusedPerson"("nameIdx");
