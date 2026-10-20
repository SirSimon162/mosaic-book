import { prisma } from "../../lib/prisma.js";
import { CreateSource, ListSourcesQuery } from "./source.types.js";

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
