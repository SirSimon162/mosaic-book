import { inngest } from "./inngest.js";

export async function enqueueArtifactGeneration({
  artifactId,
  workspaceId,
}: {
  artifactId: string;
  workspaceId: string;
}) {
  await inngest.send({
    name: "artifact/generate.requested",
    data: { artifactId, workspaceId },
  });
}
