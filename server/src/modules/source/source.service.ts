import { Request } from "express";
import {
  CreateSource,
  CreateWebsiteSource,
  ImportPdf,
  ImportWebsite,
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
  createPdfSourceInWorkspace,
  createSourceInWorkspace,
  createWebsiteSourceInWorkspace,
  getSource,
  getSourcesByWorkspaceId,
} from "./source.repository.js";
import { scrapeWebsite } from "../../lib/firecrawl.js";
import { SourceType } from "../../generated/prisma/enums.js";
import { deleteAsset, saveUpload } from "../../lib/cloudinary-config.js";

async function createAndProcessSource(
  workspaceId: string,
  data: CreateWebsiteSource,
) {
  const source = await createWebsiteSourceInWorkspace(workspaceId, data);
  {
    /*
    TODO: Enqueue source processing using Ingest
    await enqueueSourceProcessing({
    sourceId: source.id,
    workspaceId: workspaceId
  })
  */
  }
  return source;
}

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

export async function getSourceById(
  workspaceId: string,
  sourceId: string,
): Promise<PublicSourceDetail> {
  const source = await getSource(workspaceId, sourceId);
  if (!source) {
    throw new AppError("Source not found", Status.NOT_FOUND);
  }
  return publicSourceDetailSchema.parse(source);
}

export async function importWebsiteSource(
  workspaceId: string,
  input: ImportWebsite,
): Promise<PublicSource> {
  const scraped = await scrapeWebsite(input.url);
  const processedWebsiteSource = await createAndProcessSource(workspaceId, {
    type: SourceType.WEBSITE,
    title: input.title || scraped.title || input.url,
    content: scraped.markdown,
    url: scraped.sourceUrl,
    metadata: { importedFrom: scraped.sourceUrl },
  });
  return publicSourceSchema.parse(processedWebsiteSource);
}

export async function importPdfSource(
  workspaceId: string,
  input: ImportPdf,
  file: Express.Multer.File,
): Promise<PublicSource> {
  const fileUrl = await saveUpload(file);
  try {
    const processedPdfSource = await createPdfSourceInWorkspace(workspaceId, {
      type: SourceType.PDF,
      title: input.title,
      fileUrl: fileUrl,
    });
    return publicSourceSchema.parse(processedPdfSource);
  } catch (e) {
    await deleteAsset(fileUrl).catch(() => undefined);
    throw e;
  }
}
