import { inngest } from "./inngest.js";

export async function enqueueSourceProcessing({
  sourceId,
  workspaceId,
}: {
  sourceId: string;
  workspaceId: string;
}) {
  await inngest.send({
    name: "source/process.requested",
    data: { sourceId, workspaceId },
  });
}
