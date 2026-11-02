import * as z from "zod";
import { SourceType, SourceStatus } from "../../generated/prisma/enums.js";

export const sourceTypeSchema = z.enum(SourceType);
export const sourceStatusSchema = z.enum(SourceStatus);

export const allowedUploadExtensions = ["pdf"];

export const sourceIdParamSchema = z.object({
  workspaceId: z.uuid(),
  sourceId: z.uuid(),
});

export const listSourcesQuerySchema = z.object({
  q: z.string().trim().optional(),
  type: sourceTypeSchema.optional(),
  status: sourceStatusSchema.optional(),
});

export const publicSourceSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  type: sourceTypeSchema,
  status: sourceStatusSchema,
});

export const publicSourceDetailSchema = publicSourceSchema.extend({
  source: z.string().nullable(),
  url: z.string().nullable(),
  fileUrl: z.string().nullable(),
  metadata: z.unknown().nullable(),
});

export const publicListSourcesSchema = z.array(publicSourceSchema);

export const createTextSourceSchema = z.object({
  type: z.literal(SourceType.TEXT),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string().trim().min(1, "Content is required"),
});

export const createMarkdownSourceSchema = z.object({
  type: z.literal(SourceType.MARKDOWN),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string().trim().min(1, "Content is required"),
});

export const createWebsiteSourceSchema = z.object({
  type: z.literal(SourceType.WEBSITE),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string().trim().min(1, "Content is required").nullable(),
  url: z.url().trim().min(1, "URL is required"),
  metadata: z
    .object({
      importedFrom: z.url().nullable().optional(),
    })
    .optional(),
});

export const createYoutubeSourceSchema = z.object({
  type: z.literal(SourceType.YOUTUBE),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string().trim().min(1, "Content is required").nullable(),
  url: z.url().trim().min(1, "URL is required"),
  metadata: z
    .object({
      importedFrom: z.url().nullable().optional(),
      videoId: z.string().optional(),
    })
    .optional(),
});

export const createPdfSourceSchema = z.object({
  type: z.literal(SourceType.PDF),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string().trim().min(1, "Content is required").nullable(),
  fileUrl: z.string().trim().min(1, "File URL is required"),
  metadata: z
    .object({
      fileUrl: z.string().trim().min(1, "File URL is required"),
      fileName: z.string().trim().min(1, "File name is required"),
      fileSize: z.number().int().positive(),
      publicId: z.string(),
      resourceType: z.string().optional(),
      pageCount: z.number().int().positive().optional(),
    })
    .optional(),
});

export const createSourceSchema = z.discriminatedUnion("type", [
  createTextSourceSchema,
  createMarkdownSourceSchema,
]);

export const importWebsiteSchema = z.object({
  url: z.url().trim().min(1, "Website URL is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
});

export const importPdfSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
});

export const importYouTubeSchema = z.object({
  url: z.url().trim().min(1, "YouTube URL is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
});

export const bulkDeleteSourcesSchema = z.object({
  sourceIds: z
    .array(z.uuid())
    .min(1, "At least one source ID is required")
    .max(10, "At most 10 source IDs are allowed"),
});

export const reprocessSourcesSchema = z.object({
  sourceIds: z
    .array(z.uuid())
    .min(1, "At least one source ID is required")
    .max(10, "At most 10 source IDs are allowed"),
});

export const searchSourcesSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Query is required")
    .max(8000, "Query must be at most 8000 characters"),
  sourceIds: z.array(z.uuid()).max(50).optional(),
});

export const chunkSearchHitSchema = z.object({
  chunkId: z.uuid(),
  sourceId: z.uuid(),
  sourceTitle: z.string(),
  index: z.number().int(),
  page: z.number().int().nullable(),
  snippet: z.string(),
  score: z.number(),
});

export const importWebSearchSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string().trim().min(1, "Content is required"),
  url: z.url().trim().min(1, "Search URL is required"),
});

export type SourceIdParam = z.infer<typeof sourceIdParamSchema>;
export type CreateSource = z.infer<typeof createSourceSchema>;
export type ListSourcesQuery = z.infer<typeof listSourcesQuerySchema>;
export type PublicSource = z.infer<typeof publicSourceSchema>;
export type PublicSourceDetail = z.infer<typeof publicSourceDetailSchema>;
export type PublicListSources = z.infer<typeof publicListSourcesSchema>;
export type CreateWebsiteSource = z.infer<typeof createWebsiteSourceSchema>;
export type CreateYoutubeSource = z.infer<typeof createYoutubeSourceSchema>;
export type CreatePdfSource = z.infer<typeof createPdfSourceSchema>;
export type ImportWebsite = z.infer<typeof importWebsiteSchema>;
export type ImportPdf = z.infer<typeof importPdfSchema>;
export type ImportYouTube = z.infer<typeof importYouTubeSchema>;
export type BulkDeleteSources = z.infer<typeof bulkDeleteSourcesSchema>;
export type ReprocessSources = z.infer<typeof reprocessSourcesSchema>;
export type SearchSources = z.infer<typeof searchSourcesSchema>;
export type ChunkSearchHit = z.infer<typeof chunkSearchHitSchema>;
export type ImportWebSearch = z.infer<typeof importWebSearchSchema>;
