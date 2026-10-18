-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PDF', 'WEBSITE', 'YOUTUBE', 'TEXT', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('SUMMARY', 'TAKEAWAYS', 'FLASHCARDS', 'QUIZ', 'MINDMAP', 'REPORT');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Workspace',
    "defaultModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "summaryMessageCount" INTEGER NOT NULL DEFAULT 0,
    "summarizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" TEXT,
    "url" TEXT,
    "fileUrl" TEXT,
    "metadata" JSONB,
    "type" "SourceType" NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'My Mosaic',
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningArtifact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "content" JSONB,
    "sourceIds" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_workspaceMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_workspaceMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Chat_workspaceId_idx" ON "Chat"("workspaceId");

-- CreateIndex
CREATE INDEX "Chat_workspaceId_updatedAt_idx" ON "Chat"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "Source_workspaceId_idx" ON "Source"("workspaceId");

-- CreateIndex
CREATE INDEX "Source_workspaceId_status_idx" ON "Source"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Source_workspaceId_type_idx" ON "Source"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "SourceChunk_sourceId_idx" ON "SourceChunk"("sourceId");

-- CreateIndex
CREATE INDEX "SourceChunk_sourceId_index_idx" ON "SourceChunk"("sourceId", "index");

-- CreateIndex
CREATE INDEX "LearningArtifact_workspaceId_idx" ON "LearningArtifact"("workspaceId");

-- CreateIndex
CREATE INDEX "LearningArtifact_workspaceId_type_idx" ON "LearningArtifact"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "LearningArtifact_workspaceId_status_idx" ON "LearningArtifact"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "_workspaceMembers_B_index" ON "_workspaceMembers"("B");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningArtifact" ADD CONSTRAINT "LearningArtifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_workspaceMembers" ADD CONSTRAINT "_workspaceMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_workspaceMembers" ADD CONSTRAINT "_workspaceMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
