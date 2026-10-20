import * as z from "zod";
import { SourceType, SourceStatus } from "../../generated/prisma/enums.js";

export const sourceTypeSchema = z.enum(SourceType);
export const sourceStatusSchema = z.enum(SourceStatus);

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

export const importYouTubeSchema = z.object({
  url: z.url().trim().min(1, "YouTube URL is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
});

export const bulkDeleteSourcesSchema = z.object({
  sourceIds: z.array(z.uuid()).min(1, "At least one source ID is required"),
});

export const reprocessSourcesSchema = z.object({
  sourceIds: z.array(z.uuid()).min(1, "At least one source ID is required"),
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
export type PublicListSources = z.infer<typeof publicListSourcesSchema>;
export type ImportWebsite = z.infer<typeof importWebsiteSchema>;
export type ImportYouTube = z.infer<typeof importYouTubeSchema>;
export type BulkDeleteSources = z.infer<typeof bulkDeleteSourcesSchema>;
export type ReprocessSources = z.infer<typeof reprocessSourcesSchema>;
export type ImportWebSearch = z.infer<typeof importWebSearchSchema>;
