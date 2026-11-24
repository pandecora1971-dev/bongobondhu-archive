-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('BB', 'SH');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('EVENT', 'QUOTE', 'PHOTO', 'VIDEO', 'DOCUMENT', 'LINK', 'MEMOIR');

-- CreateEnum
CREATE TYPE "Attribution" AS ENUM ('NAME', 'ALIAS', 'ANON');

-- CreateEnum
CREATE TYPE "ComplaintProgress" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'NEED_INFO', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CrimeCategory" AS ENUM ('JULY_MILITANT', 'MOB', 'LOOTING', 'ARSON', 'JOY_BANGLA_ASSAULT', 'ADMIN_INVOLVED', 'JAIL_KILLING_TORTURE', 'BAIL_OBSTRUCTION', 'EDU_INSTITUTION_MOB', 'MURDER_ABDUCTION', 'ATTEMPTED_MURDER', 'KILLING_TORTURE', 'FALSE_CASE', 'THREAT_EXTORTION', 'LAND_GRAB', 'CHILD_ABUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "Harm" AS ENUM ('DEATH', 'INJURY', 'PROPERTY', 'DISPLACED', 'LIVELIHOOD', 'TRAUMA');

-- CreateEnum
CREATE TYPE "VictimType" AS ENUM ('SELF', 'FAMILY', 'OTHER_PERSON', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "HowKnown" AS ENUM ('SAW', 'MEDIA', 'VICTIM_TOLD', 'HEARD');

-- CreateEnum
CREATE TYPE "TriState" AS ENUM ('YES', 'NO', 'UNKNOWN', 'REFUSED');

-- CreateEnum
CREATE TYPE "IdMode" AS ENUM ('ANON', 'CONTACT');

-- CreateEnum
CREATE TYPE "Organization" AS ENUM ('AWAMI_LEAGUE', 'JUBO_LEAGUE', 'CHHATRA_LEAGUE', 'SWECHCHHASEBAK_LEAGUE', 'KRISHAK_LEAGUE', 'SRAMIK_LEAGUE', 'MOHILA_AWAMI_LEAGUE', 'JUBO_MOHILA_LEAGUE', 'TANTI_LEAGUE', 'MATSYAJIBI_LEAGUE', 'AINJIBI_PARISHAD', 'BANGABANDHU_PARISHAD', 'PROBASHI', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MEETING', 'PROCESSION', 'HUMAN_CHAIN', 'PROTEST', 'RELIEF', 'PRAYER', 'OUTREACH', 'ONLINE_CAMPAIGN', 'LEGAL_AID', 'SUPPORT_DETAINED', 'OTHER');

-- CreateEnum
CREATE TYPE "CommitteeLevel" AS ENUM ('CENTRAL', 'METRO', 'DISTRICT', 'UPAZILA', 'MUNICIPALITY', 'UNION', 'WARD', 'CAMPUS', 'ABROAD');

-- CreateEnum
CREATE TYPE "Division" AS ENUM ('DHAKA', 'CHATTOGRAM', 'RAJSHAHI', 'KHULNA', 'BARISHAL', 'SYLHET', 'RANGPUR', 'MYMENSINGH', 'ABROAD');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('D', 'P', 'O', 'L', 'A');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('CONTRIBUTION', 'COMPLAINT', 'ACCUSED', 'POST', 'PROJECT', 'MILESTONE', 'FILM', 'CHAPTER', 'SITE');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'PDF');

-- CreateEnum
CREATE TYPE "MediaState" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('CONTRIBUTIONS', 'POSTS', 'COMPLAINTS', 'COMPLAINT_PII', 'CONTENT', 'EXPORT');

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "types" "ContributionType"[],
    "year" INTEGER NOT NULL,
    "date" VARCHAR(60),
    "place" VARCHAR(200),
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrls" TEXT[],
    "videoLink" VARCHAR(1000),
    "attribution" "Attribution" NOT NULL DEFAULT 'ANON',
    "name" VARCHAR(120),
    "contactEnc" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "crimes" "CrimeCategory"[],
    "harms" "Harm"[],
    "victimType" "VictimType",
    "victimCount" INTEGER,
    "victimNameEnc" TEXT,
    "incidentDate" DATE,
    "division" "Division",
    "district" VARCHAR(80),
    "thana" VARCHAR(120),
    "description" TEXT NOT NULL,
    "links" TEXT[],
    "witness" "TriState",
    "caseFiled" "TriState",
    "idMode" "IdMode" NOT NULL DEFAULT 'ANON',
    "contactEnc" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "progress" "ComplaintProgress" NOT NULL DEFAULT 'RECEIVED',
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccusedPerson" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(200),
    "role" VARCHAR(200),
    "org" VARCHAR(200),
    "description" TEXT,
    "how" "HowKnown",
    "facebookUrl" VARCHAR(1000),
    "photoUrl" VARCHAR(1000),

    CONSTRAINT "AccusedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintUpdate" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "fromPublic" BOOLEAN NOT NULL DEFAULT false,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "progress" "ComplaintProgress",
    "message" TEXT NOT NULL,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityPost" (
    "id" TEXT NOT NULL,
    "org" "Organization" NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "level" "CommitteeLevel",
    "date" DATE,
    "division" "Division",
    "district" VARCHAR(80) NOT NULL,
    "thana" VARCHAR(120) NOT NULL,
    "place" VARCHAR(200),
    "participants" INTEGER,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "links" TEXT[],
    "name" VARCHAR(120),
    "role" VARCHAR(120),
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "state" "MediaState" NOT NULL DEFAULT 'PENDING',
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "key" TEXT,
    "thumbKey" TEXT,
    "externalUrl" VARCHAR(2000),
    "mime" VARCHAR(100),
    "size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "originalName" VARCHAR(255),
    "ownerType" "OwnerType",
    "ownerId" TEXT,
    "slot" VARCHAR(40),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "alt" VARCHAR(500),
    "caption" VARCHAR(500),
    "credit" VARCHAR(500),
    "license" VARCHAR(200),
    "sourceUrl" VARCHAR(2000),
    "uploadTokenHash" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "titleBn" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "sector" TEXT,
    "place" TEXT,
    "year" TEXT,
    "cost" TEXT,
    "noteBn" TEXT,
    "noteEn" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "roadOrder" INTEGER,
    "roadYearBn" TEXT,
    "status" "ProjectStatus" NOT NULL,
    "titleBn" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "placeBn" TEXT NOT NULL,
    "placeEn" TEXT NOT NULL,
    "whenBn" TEXT NOT NULL,
    "whenEn" TEXT NOT NULL,
    "descBn" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "lng" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Film" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "titleBn" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "subBn" TEXT NOT NULL,
    "subEn" TEXT NOT NULL,
    "descBn" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'amber',
    "youtubeId" TEXT,
    "videoUrl" VARCHAR(2000),
    "projectOrder" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryChapter" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "yearBn" TEXT NOT NULL,
    "yearEn" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descBn" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,

    CONSTRAINT "HistoryChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "dateBn" TEXT NOT NULL,
    "dateEn" TEXT NOT NULL,
    "textBn" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MODERATOR',
    "permissions" "Permission"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "actorName" VARCHAR(120),
    "actorEmail" VARCHAR(200),
    "actorRole" VARCHAR(20),
    "action" VARCHAR(60) NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_ref_key" ON "Contribution"("ref");

-- CreateIndex
CREATE INDEX "Contribution_status_createdAt_idx" ON "Contribution"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Contribution_subject_status_idx" ON "Contribution"("subject", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_code_key" ON "Complaint"("code");

-- CreateIndex
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_progress_idx" ON "Complaint"("progress");

-- CreateIndex
CREATE INDEX "AccusedPerson_complaintId_idx" ON "AccusedPerson"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintUpdate_complaintId_createdAt_idx" ON "ComplaintUpdate"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityPost_status_publishedAt_idx" ON "ActivityPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ActivityPost_status_org_idx" ON "ActivityPost"("status", "org");

-- CreateIndex
CREATE INDEX "ActivityPost_status_division_district_idx" ON "ActivityPost"("status", "division", "district");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerType_ownerId_sort_idx" ON "MediaAsset"("ownerType", "ownerId", "sort");

-- CreateIndex
CREATE INDEX "MediaAsset_slot_sort_idx" ON "MediaAsset"("slot", "sort");

-- CreateIndex
CREATE INDEX "MediaAsset_state_createdAt_idx" ON "MediaAsset"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_order_key" ON "Project"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_order_key" ON "Milestone"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Film_order_key" ON "Film"("order");

-- CreateIndex
CREATE UNIQUE INDEX "HistoryChapter_order_key" ON "HistoryChapter"("order");

-- CreateIndex
CREATE INDEX "TimelineEvent_chapterId_order_idx" ON "TimelineEvent"("chapterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- AddForeignKey
ALTER TABLE "AccusedPerson" ADD CONSTRAINT "AccusedPerson_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintUpdate" ADD CONSTRAINT "ComplaintUpdate_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "HistoryChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────
-- Log book is append-only. Nobody (not even with direct SQL / the app's DB user)
-- may edit or delete entries. The single allowed change is the FK set to NULL
-- when an admin account is deleted (name/email/role were already copied into the row).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AuditLog is append-only';
  END IF;
  IF NEW."adminId" IS NULL AND OLD."adminId" IS NOT NULL
     AND NEW."id" = OLD."id" AND NEW."action" = OLD."action" AND NEW."entityType" = OLD."entityType"
     AND NEW."entityId" IS NOT DISTINCT FROM OLD."entityId" AND NEW."detail"::text IS NOT DISTINCT FROM OLD."detail"::text
     AND NEW."actorName" IS NOT DISTINCT FROM OLD."actorName" AND NEW."actorEmail" IS NOT DISTINCT FROM OLD."actorEmail"
     AND NEW."actorRole" IS NOT DISTINCT FROM OLD."actorRole" AND NEW."createdAt" = OLD."createdAt" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
