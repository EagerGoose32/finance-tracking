-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('TEN_K', 'TEN_Q');

-- CreateEnum
CREATE TYPE "ScoreType" AS ENUM ('piotroski_f', 'altman_z', 'beneish_m');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'incomplete');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('new_filing', 'material_diff', 'score_threshold_breach');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "cik" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sicCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "formType" "FormType" NOT NULL,
    "filingDate" TIMESTAMP(3) NOT NULL,
    "periodOfReport" TIMESTAMP(3) NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalPeriod" TEXT NOT NULL,
    "primaryDocumentUrl" TEXT,
    "rawMetadata" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Filing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XbrlFactSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "taxonomy" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3) NOT NULL,
    "formType" "FormType" NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XbrlFactSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilingDiff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "filingIdNew" TEXT NOT NULL,
    "filingIdPrior" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "priorValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION,
    "deltaAbs" DOUBLE PRECISION,
    "deltaPct" DOUBLE PRECISION,
    "materialityFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilingDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootnoteDiff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "filingIdNew" TEXT NOT NULL,
    "filingIdPrior" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "excerptNew" TEXT,
    "excerptPrior" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FootnoteDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedFlagScore" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalPeriod" TEXT NOT NULL,
    "scoreType" "ScoreType" NOT NULL,
    "scoreValue" DOUBLE PRECISION,
    "riskLevel" "RiskLevel" NOT NULL,
    "inputs" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedFlagScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "RiskLevel" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "companiesProcessed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_userId_token_key" ON "PushToken"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cik_key" ON "Company"("cik");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_companyId_key" ON "WatchlistItem"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Filing_accessionNumber_key" ON "Filing"("accessionNumber");

-- CreateIndex
CREATE INDEX "Filing_companyId_formType_idx" ON "Filing"("companyId", "formType");

-- CreateIndex
CREATE INDEX "XbrlFactSnapshot_companyId_concept_idx" ON "XbrlFactSnapshot"("companyId", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "XbrlFactSnapshot_companyId_concept_endDate_unit_filingId_key" ON "XbrlFactSnapshot"("companyId", "concept", "endDate", "unit", "filingId");

-- CreateIndex
CREATE INDEX "FilingDiff_companyId_idx" ON "FilingDiff"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RedFlagScore_companyId_fiscalYear_fiscalPeriod_scoreType_key" ON "RedFlagScore"("companyId", "fiscalYear", "fiscalPeriod", "scoreType");

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filing" ADD CONSTRAINT "Filing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XbrlFactSnapshot" ADD CONSTRAINT "XbrlFactSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XbrlFactSnapshot" ADD CONSTRAINT "XbrlFactSnapshot_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingDiff" ADD CONSTRAINT "FilingDiff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingDiff" ADD CONSTRAINT "FilingDiff_filingIdNew_fkey" FOREIGN KEY ("filingIdNew") REFERENCES "Filing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingDiff" ADD CONSTRAINT "FilingDiff_filingIdPrior_fkey" FOREIGN KEY ("filingIdPrior") REFERENCES "Filing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootnoteDiff" ADD CONSTRAINT "FootnoteDiff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootnoteDiff" ADD CONSTRAINT "FootnoteDiff_filingIdNew_fkey" FOREIGN KEY ("filingIdNew") REFERENCES "Filing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootnoteDiff" ADD CONSTRAINT "FootnoteDiff_filingIdPrior_fkey" FOREIGN KEY ("filingIdPrior") REFERENCES "Filing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlagScore" ADD CONSTRAINT "RedFlagScore_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlagScore" ADD CONSTRAINT "RedFlagScore_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
