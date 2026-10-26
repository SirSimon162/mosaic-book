import { Prisma } from "../../generated/prisma/client.js";
import { SourceStatus, SourceType } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import {
  CreatePdfSource,
  CreateSource,
  CreateWebsiteSource,
  ListSourcesQuery,
} from "./source.types.js";

export async function getSourcesByWorkspaceId(
  workspaceId: string,
  filters: ListSourcesQuery,
) {
  const sources = await prisma.source.findMany({
    where: {
      workspaceId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.q && { title: { contains: filters.q, mode: "insensitive" } }),
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  return sources;
}

export async function createSourceInWorkspace(
  workspaceId: string,
  data: CreateSource,
) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type: data.type,
      title: data.title,
      source: data.content,
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
    },
  });
  return source;
}

export async function createWebsiteSourceInWorkspace(
  workspaceId: string,
  data: CreateWebsiteSource,
) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type: SourceType.WEBSITE,
      title: data.title,
      source: data.content,
      url: data.url,
      status: SourceStatus.PENDING,
      metadata: {
        importedFrom: data.metadata?.importedFrom ?? data.url,
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
    },
  });
  return source;
}

export async function createPdfSourceInWorkspace(
  workspaceId: string,
  data: CreatePdfSource,
) {
  const source = await prisma.source.create({
    data: {
      workspaceId,
      type: SourceType.PDF,
      title: data.title,
      fileUrl: data.fileUrl,
      source: data.content,
      status: SourceStatus.PENDING,
      metadata: data.metadata ?? {},
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
    },
  });
  return source;
}

export async function getSource(workspaceId: string, sourceId: string) {
  const source = await prisma.source.findFirst({
    where: {
      workspaceId,
      id: sourceId,
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      source: true,
      url: true,
      fileUrl: true,
      metadata: true,
    },
  });
  return source;
}

export async function updateSourceStatus(
  workspaceId: string,
  sourceId: string,
  status: SourceStatus,
) {
  return prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: { status },
    select: {
      id: true,
      type: true,
      status: true,
      source: true,
      fileUrl: true,
      metadata: true,
    },
  });
}

export async function completeSource(
  workspaceId: string,
  sourceId: string,
  data: {
    source?: string;
    url?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: {
      status: SourceStatus.COMPLETED,
      ...(data.source !== undefined ? { source: data.source } : {}),
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    },
  });
}

export async function failSource(workspaceId: string, sourceId: string) {
  return prisma.source.update({
    where: { id: sourceId, workspaceId },
    data: { status: SourceStatus.FAILED },
  });
}

export async function deleteSourceInWorkspace(
  workspaceId: string,
  sourceId: string,
) {
  const source = await prisma.source.delete({
    where: {
      workspaceId,
      id: sourceId,
    },
    select: {
      fileUrl: true,
    },
  });
  return source;
}

export async function findSourcesForDelete(
  workspaceId: string,
  sourceIds: string[],
) {
  return prisma.source.findMany({
    where: { workspaceId, id: { in: sourceIds } },
    select: { id: true, fileUrl: true },
  });
}

export async function deleteManySourcesInWorkspace(
  workspaceId: string,
  sourceIds: string[],
) {
  return prisma.source.deleteMany({
    where: { workspaceId, id: { in: sourceIds } },
  });
}
