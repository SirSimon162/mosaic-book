import { Prisma } from "../../generated/prisma/client.js";
import { ArtifactStatus, ArtifactType } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";

const artifactSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  error: true,
  sourceIds: true,
  content: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LearningArtifactSelect;

export async function createArtifact(
  workspaceId: string,
  data: { type: ArtifactType; title: string; sourceIds: string[] },
) {
  return prisma.learningArtifact.create({
    data: {
      workspaceId,
      type: data.type,
      title: data.title,
      sourceIds: data.sourceIds,
      status: ArtifactStatus.PENDING,
    },
    select: artifactSelect,
  });
}

export async function getArtifact(workspaceId: string, artifactId: string) {
  return prisma.learningArtifact.findFirst({
    where: { id: artifactId, workspaceId },
    select: artifactSelect,
  });
}

export async function getArtifactJobState(workspaceId: string, artifactId: string) {
  return prisma.learningArtifact.findFirst({
    where: { id: artifactId, workspaceId },
    select: {
      id: true,
      type: true,
      status: true,
      sourceIds: true,
    },
  });
}

export async function updateArtifactStatus(
  workspaceId: string,
  artifactId: string,
  status: ArtifactStatus,
) {
  await prisma.learningArtifact.update({
    where: { id: artifactId, workspaceId },
    data: { status, error: null },
    select: { id: true },
  });
}

export async function saveArtifactContent(
  workspaceId: string,
  artifactId: string,
  content: Prisma.InputJsonValue,
) {
  await prisma.learningArtifact.update({
    where: { id: artifactId, workspaceId },
    data: { content },
    select: { id: true },
  });
}

export async function completeArtifact(workspaceId: string, artifactId: string) {
  await prisma.learningArtifact.update({
    where: { id: artifactId, workspaceId },
    data: { status: ArtifactStatus.COMPLETED, error: null },
    select: { id: true },
  });
}

export async function failArtifact(
  workspaceId: string,
  artifactId: string,
  error: string,
) {
  await prisma.learningArtifact.update({
    where: { id: artifactId, workspaceId },
    data: { status: ArtifactStatus.FAILED, error },
    select: { id: true },
  });
}
