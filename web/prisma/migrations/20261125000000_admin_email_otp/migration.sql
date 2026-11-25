-- CreateTable
CREATE TABLE "AdminLoginChallenge" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLoginChallenge_adminId_idx" ON "AdminLoginChallenge"("adminId");

-- CreateIndex
CREATE INDEX "AdminLoginChallenge_expiresAt_idx" ON "AdminLoginChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "AdminLoginChallenge" ADD CONSTRAINT "AdminLoginChallenge_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
