import * as z from "zod";
import { publicUserSchema } from "../auth/auth.types.js";
import { SourceType, SourceStatus } from "../../generated/prisma/enums.js";

export { SourceType, SourceStatus };

export const WorkspaceNameSchema = z.string().trim().min(3).max(20);

export const createWorkspaceSchema = z
  .object({ name: WorkspaceNameSchema })
  .strict();

export const updateWorkspaceSchema = z
  .object({
    name: WorkspaceNameSchema,
  })
  .strict();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const publicWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  users: z.array(publicUserSchema),
});

export type PublicWorkspace = z.infer<typeof publicWorkspaceSchema>;

export const publicWorkspacesListSchema = publicWorkspaceSchema.omit({
  users: true,
});

export type PublicWorkspacesList = z.infer<typeof publicWorkspacesListSchema>;

export const publicWorkspaceDetailsSchema = publicWorkspaceSchema.extend({
  chats: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(SourceType),
      status: z.enum(SourceStatus),
    }),
  ),
});

export type PublicWorkspaceDetails = z.infer<
  typeof publicWorkspaceDetailsSchema
>;

export const createSourceSchema = z
  .object({
    type: z.enum([SourceType.TEXT, SourceType.MARKDOWN]),
    title: z.string().trim().min(1).max(100),
    content: z.string().min(1).max(10_000, {
      message: "Content too long. Please upload a file instead.",
    }),
  })
  .strict();

export type CreateSourceInput = z.infer<typeof createSourceSchema>;

export const uploadSourceSchema = z
  .object({
    type: z.enum([
      SourceType.PDF,
      SourceType.DOC,
      SourceType.CSV,
    ]),
    title: z.string().trim().min(1).max(100),
  })
  .strict();

export type UploadSourceInput = z.infer<typeof uploadSourceSchema>;

const uploadExtensionsByType = {
  [SourceType.PDF]: ["pdf"],
  [SourceType.DOC]: ["doc", "docx"],
  [SourceType.CSV]: ["csv"],
} as const;

export const allowedUploadExtensions: readonly string[] = Object.values(uploadExtensionsByType).flat();

export function uploadFileMatchesType(
  type: UploadSourceInput["type"],
  filename: string,
): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return false;
  return (uploadExtensionsByType[type] as readonly string[]).includes(extension);
}

export const createWebsiteSourceSchema = z
  .object({
    type: z.enum([SourceType.WEBSITE]),
    title: z.string().trim().min(1).max(100),
    url: z.url(),
  })
  .strict();

export type CreateWebsiteSourceInput = z.infer<typeof createWebsiteSourceSchema>;

export const createJsonSourceSchema = z.discriminatedUnion("type", [
  createSourceSchema,
  createWebsiteSourceSchema,
]);

export type CreateJsonSourceInput = z.infer<typeof createJsonSourceSchema>;

export type CreateSourcePayload =
  | CreateSourceInput
  | (UploadSourceInput & { fileUrl: string })
  | CreateWebsiteSourceInput;

export type CreateSourceRow = {
  type: SourceType;
  title: string;
  source: string | null;
  fileUrl: string | null;
};

export const publicSourceSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    workspaceId: z.string(),
    type: z.enum(SourceType),
    status: z.enum(SourceStatus),
  })
  .strict();

export type PublicSource = z.infer<typeof publicSourceSchema>;

export const publicSourceDetailsSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string().nullable(),
  fileUrl: z.string().nullable(),
  status: z.enum(SourceStatus),
  type: z.enum(SourceType),
});

export type PublicSourceDetails = z.infer<typeof publicSourceDetailsSchema>;