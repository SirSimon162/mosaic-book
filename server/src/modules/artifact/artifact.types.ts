import * as z from "zod";
import { ArtifactStatus, ArtifactType } from "../../generated/prisma/enums.js";

const mindLeaf = z.object({
  label: z.string().trim().min(1).max(200),
});

const mindBranch = z.object({
  label: z.string().trim().min(1).max(200),
  children: z.array(mindLeaf).max(8).optional(),
});

export const artifactContentSchemas = {
  SUMMARY: z.object({
    summary: z.string().trim().min(1).max(8000),
  }),
  TAKEAWAYS: z.object({
    takeaways: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  }),
  FLASHCARDS: z.object({
    cards: z
      .array(
        z.object({
          front: z.string().trim().min(1).max(300),
          back: z.string().trim().min(1).max(600),
        }),
      )
      .min(1)
      .max(20),
  }),
  QUIZ: z.object({
    questions: z
      .array(
        z
          .object({
            question: z.string().trim().min(1).max(500),
            choices: z.array(z.string().trim().min(1).max(300)).min(2).max(4),
            answerIndex: z.number().int().nonnegative(),
          })
          .refine((question) => question.answerIndex < question.choices.length, {
            message: "answerIndex is outside choices",
          }),
      )
      .min(1)
      .max(10),
  }),
  MINDMAP: z.object({
    root: z.object({
      label: z.string().trim().min(1).max(200),
      children: z.array(mindBranch).max(8).optional(),
    }),
  }),
  REPORT: z.object({
    title: z.string().trim().min(1).max(200),
    sections: z
      .array(
        z.object({
          heading: z.string().trim().min(1).max(200),
          body: z.string().trim().min(1).max(4000),
        }),
      )
      .min(1)
      .max(8),
  }),
} satisfies Record<ArtifactType, z.ZodType>;

export const createArtifactSchema = z
  .object({
    type: z.enum(ArtifactType),
    title: z.string().trim().min(1).max(200).optional(),
    sourceIds: z.array(z.uuid()).max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceIds && data.sourceIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceIds"],
        message: "sourceIds cannot be empty",
      });
    }
  });

export const artifactIdParamSchema = z.object({
  workspaceId: z.uuid(),
  artifactId: z.uuid(),
});

export const publicArtifactSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  type: z.enum(ArtifactType),
  status: z.enum(ArtifactStatus),
  error: z.string().nullable(),
  sourceIds: z.array(z.uuid()),
  content: z.unknown().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const DEFAULT_ARTIFACT_TITLE: Record<ArtifactType, string> = {
  SUMMARY: "Summary",
  TAKEAWAYS: "Takeaways",
  FLASHCARDS: "Flashcards",
  QUIZ: "Quiz",
  MINDMAP: "Mind map",
  REPORT: "Report",
};

export type CreateArtifact = z.infer<typeof createArtifactSchema>;
export type ArtifactIdParam = z.infer<typeof artifactIdParamSchema>;
export type PublicArtifact = z.infer<typeof publicArtifactSchema>;
