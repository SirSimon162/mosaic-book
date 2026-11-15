import { NonRetriableError } from "inngest";
import { ArtifactStatus, ArtifactType } from "../generated/prisma/enums.js";
import {
  ARTIFACT_SOURCE_CHAR_LIMIT,
  ARTIFACT_TOTAL_CHAR_LIMIT,
  CHAT_MODELS,
} from "../lib/ai-config.js";
import { inngest } from "../lib/inngest.js";
import {
  completeJson,
  EmbeddingConfigError,
  isPermanentOpenAIError,
} from "../lib/openai.js";
import {
  completeArtifact,
  failArtifact,
  getArtifactJobState,
  saveArtifactContent,
  updateArtifactStatus,
} from "../modules/artifact/artifact.repository.js";
import { artifactContentSchemas } from "../modules/artifact/artifact.types.js";
import { listSourceTexts } from "../modules/source/source.repository.js";
import { getWorkspaceDefaultModel } from "../modules/workspace/workspace.repository.js";
import { Prisma } from "../generated/prisma/client.js";

type GenerateArtifactEvent = {
  artifactId: string;
  workspaceId: string;
};

const MAX_ARTIFACT_ERROR_LENGTH = 300;

const ARTIFACT_INSTRUCTIONS: Record<ArtifactType, string> = {
  SUMMARY:
    'Return {"summary":"..."} with one study summary grounded in the sources.',
  TAKEAWAYS:
    'Return {"takeaways":["..."]} with 4 to 8 short points grounded in the sources.',
  FLASHCARDS:
    'Return {"cards":[{"front":"...","back":"..."}]} with 6 to 12 cards. The front is a prompt. The back is the answer from the sources.',
  QUIZ:
    'Return {"questions":[{"question":"...","choices":["...","...","...","..."],"answerIndex":2}]} with 5 questions. answerIndex is the 0-based index of the correct choice. Spread correct answers across different indices; do not put the correct choice first every time.',
  MINDMAP:
    'Return {"root":{"label":"...","children":[{"label":"...","children":[{"label":"..."}]}]}}. Use at most three levels.',
  REPORT:
    'Return {"title":"...","sections":[{"heading":"...","body":"..."}]} with 3 to 6 sections grounded in the sources.',
};

function failureMessage(message: string | undefined) {
  const firstLine = message
    ?.split("\n")[0]
    ?.replace(/^NonRetriableError:\s*/i, "")
    .trim();
  if (!firstLine) {
    return "Generation failed";
  }
  return firstLine.slice(0, MAX_ARTIFACT_ERROR_LENGTH);
}

async function markFailed(
  data: GenerateArtifactEvent | undefined,
  message: string | undefined,
) {
  if (!data?.artifactId || !data.workspaceId) {
    return;
  }
  await failArtifact(
    data.workspaceId,
    data.artifactId,
    failureMessage(message),
  ).catch(() => undefined);
}

function sourcePacket(
  sources: { title: string; source: string | null }[],
) {
  const parts: string[] = [];
  let total = 0;
  for (const source of sources) {
    const text = source.source?.trim();
    if (!text) {
      continue;
    }
    const slice = text.slice(0, ARTIFACT_SOURCE_CHAR_LIMIT);
    const room = ARTIFACT_TOTAL_CHAR_LIMIT - total;
    if (room <= 0) {
      break;
    }
    const piece = slice.slice(0, room);
    parts.push(`# ${source.title}\n${piece}`);
    total += piece.length;
  }
  return parts.join("\n\n");
}

function parseContent(type: ArtifactType, raw: string): Prisma.InputJsonValue {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error("Artifact response was not JSON", { cause: error });
  }
  const parsed = artifactContentSchemas[type].safeParse(json);
  if (!parsed.success) {
    throw new Error("Artifact response did not match the expected shape");
  }
  return parsed.data as Prisma.InputJsonValue;
}

function chatModel(model: string | null) {
  if (model && CHAT_MODELS.includes(model as (typeof CHAT_MODELS)[number])) {
    return model;
  }
  return CHAT_MODELS[0];
}

export const generateArtifact = inngest.createFunction(
  {
    id: "generate-artifact",
    retries: 3,
    concurrency: { key: "event.data.artifactId", limit: 1 },
    triggers: [{ event: "artifact/generate.requested" }],
    onFailure: async ({ error, event }) => {
      await markFailed(
        event.data.event.data as GenerateArtifactEvent,
        error instanceof Error ? error.message : undefined,
      );
    },
  },
  async ({ event, step }) => {
    const { artifactId, workspaceId } = event.data as GenerateArtifactEvent;

    const artifact = await step.run("load-artifact", () =>
      getArtifactJobState(workspaceId, artifactId),
    );

    if (!artifact) {
      throw new NonRetriableError("Artifact not found");
    }

    if (artifact.status === ArtifactStatus.COMPLETED) {
      return { skipped: true };
    }

    await step.run("mark-processing", async () => {
      await updateArtifactStatus(
        workspaceId,
        artifactId,
        ArtifactStatus.PROCESSING,
      );
      return { status: ArtifactStatus.PROCESSING };
    });

    const generated = await step.run("generate", async () => {
      const sources = await listSourceTexts(workspaceId, artifact.sourceIds);
      const packet = sourcePacket(sources);
      if (!packet) {
        throw new NonRetriableError("No source text available");
      }
      const model = chatModel(await getWorkspaceDefaultModel(workspaceId));
      let raw: string;
      try {
        raw = await completeJson({
          model,
          system:
            "Create a study artifact using only the source text. Do not add facts that are not in the sources. Return JSON only.",
          user: `${ARTIFACT_INSTRUCTIONS[artifact.type]}\n\nSources:\n${packet}`,
        });
      } catch (error) {
        if (
          error instanceof EmbeddingConfigError ||
          isPermanentOpenAIError(error)
        ) {
          throw new NonRetriableError(
            error instanceof Error ? error.message : "Failed to generate artifact",
            { cause: error },
          );
        }
        throw error;
      }
      const content = parseContent(artifact.type, raw);
      await saveArtifactContent(workspaceId, artifactId, content);
      return { type: artifact.type };
    });

    await step.run("complete", async () => {
      await completeArtifact(workspaceId, artifactId);
      return { completed: true };
    });

    return { type: generated.type };
  },
);
