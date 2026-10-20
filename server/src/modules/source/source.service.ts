import { Request } from "express";
import {
  CreateSource,
  ListSourcesQuery,
  listSourcesQuerySchema,
  PublicListSources,
  publicListSourcesSchema,
  PublicSource,
  PublicSourceDetail,
  publicSourceDetailSchema,
  publicSourceSchema,
} from "./source.types.js";
import AppError from "../../lib/http-error.js";
import { Status } from "../../lib/http-code.js";
import {
  createSourceInWorkspace,
  getSource,
  getSourcesByWorkspaceId,
} from "./source.repository.js";

export function parseListQuery(query: Request["query"]) {
  const parsed = listSourcesQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new AppError("Invalid query parameters", Status.BAD_REQUEST);
  }
  return parsed.data;
}

export async function listSourcesByWorkspaceId(
  workspaceId: string,
  filters: ListSourcesQuery,
): Promise<PublicListSources> {
  const sources = await getSourcesByWorkspaceId(workspaceId, filters);
  return publicListSourcesSchema.parse(sources);
}

export async function createSource(
  workspaceId: string,
  data: CreateSource,
): Promise<PublicSource> {
  const source = await createSourceInWorkspace(workspaceId, data);
  return publicSourceSchema.parse(source);
}


export async function getSourceById(workspaceId: string, sourceId: string): Promise<PublicSourceDetail> {
  const source = await getSource(workspaceId, sourceId);
  if(!source){
    throw new AppError("Source not found", Status.NOT_FOUND);
  }
  return publicSourceDetailSchema.parse(source)
}