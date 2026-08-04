-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ANNOTATOR');

-- CreateEnum
CREATE TYPE "AnnotationAction" AS ENUM ('CREATED', 'CHANGED', 'DELETED', 'OVERRIDE', 'OVERRIDE_UNDONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ANNOTATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "ImageClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ImageClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,
    "datasetBatch" TEXT,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnotationHistory" (
    "id" TEXT NOT NULL,
    "annotationId" TEXT,
    "imageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "action" "AnnotationAction" NOT NULL,
    "previousClassId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnotationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelResult" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "finalClassId" TEXT,
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "isTie" BOOLEAN NOT NULL DEFAULT false,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overriddenById" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdById_idx" ON "User"("createdById");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "ImageClass_name_key" ON "ImageClass"("name");

-- CreateIndex
CREATE INDEX "ImageClass_createdById_idx" ON "ImageClass"("createdById");

-- CreateIndex
CREATE INDEX "ImageClass_sortOrder_idx" ON "ImageClass"("sortOrder");

-- CreateIndex
CREATE INDEX "ImageClass_isActive_idx" ON "ImageClass"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAsset_storagePath_key" ON "ImageAsset"("storagePath");

-- CreateIndex
CREATE INDEX "ImageAsset_uploadedById_idx" ON "ImageAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "ImageAsset_uploadedAt_idx" ON "ImageAsset"("uploadedAt");

-- CreateIndex
CREATE INDEX "ImageAsset_datasetBatch_idx" ON "ImageAsset"("datasetBatch");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAsset_filename_datasetBatch_key" ON "ImageAsset"("filename", "datasetBatch");

-- CreateIndex
CREATE INDEX "Annotation_imageId_idx" ON "Annotation"("imageId");

-- CreateIndex
CREATE INDEX "Annotation_userId_idx" ON "Annotation"("userId");

-- CreateIndex
CREATE INDEX "Annotation_classId_idx" ON "Annotation"("classId");

-- CreateIndex
CREATE INDEX "Annotation_createdAt_idx" ON "Annotation"("createdAt");

-- CreateIndex
CREATE INDEX "Annotation_updatedAt_idx" ON "Annotation"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Annotation_imageId_userId_key" ON "Annotation"("imageId", "userId");

-- CreateIndex
CREATE INDEX "AnnotationHistory_annotationId_idx" ON "AnnotationHistory"("annotationId");

-- CreateIndex
CREATE INDEX "AnnotationHistory_imageId_idx" ON "AnnotationHistory"("imageId");

-- CreateIndex
CREATE INDEX "AnnotationHistory_userId_idx" ON "AnnotationHistory"("userId");

-- CreateIndex
CREATE INDEX "AnnotationHistory_classId_idx" ON "AnnotationHistory"("classId");

-- CreateIndex
CREATE INDEX "AnnotationHistory_previousClassId_idx" ON "AnnotationHistory"("previousClassId");

-- CreateIndex
CREATE INDEX "AnnotationHistory_timestamp_idx" ON "AnnotationHistory"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "LabelResult_imageId_key" ON "LabelResult"("imageId");

-- CreateIndex
CREATE INDEX "LabelResult_finalClassId_idx" ON "LabelResult"("finalClassId");

-- CreateIndex
CREATE INDEX "LabelResult_overriddenById_idx" ON "LabelResult"("overriddenById");

-- CreateIndex
CREATE INDEX "LabelResult_isTie_idx" ON "LabelResult"("isTie");

-- CreateIndex
CREATE INDEX "LabelResult_updatedAt_idx" ON "LabelResult"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_updatedById_idx" ON "Setting"("updatedById");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_idx" ON "LoginEvent"("userId");

-- CreateIndex
CREATE INDEX "LoginEvent_timestamp_idx" ON "LoginEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageClass" ADD CONSTRAINT "ImageClass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ImageAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ImageClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationHistory" ADD CONSTRAINT "AnnotationHistory_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "Annotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationHistory" ADD CONSTRAINT "AnnotationHistory_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ImageAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationHistory" ADD CONSTRAINT "AnnotationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationHistory" ADD CONSTRAINT "AnnotationHistory_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ImageClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationHistory" ADD CONSTRAINT "AnnotationHistory_previousClassId_fkey" FOREIGN KEY ("previousClassId") REFERENCES "ImageClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelResult" ADD CONSTRAINT "LabelResult_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ImageAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelResult" ADD CONSTRAINT "LabelResult_finalClassId_fkey" FOREIGN KEY ("finalClassId") REFERENCES "ImageClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelResult" ADD CONSTRAINT "LabelResult_overriddenById_fkey" FOREIGN KEY ("overriddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

