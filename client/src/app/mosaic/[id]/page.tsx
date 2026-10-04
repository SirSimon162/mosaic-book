import { Dashboard } from "@/features/mosaic/dashboard";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Dashboard workspaceId={id} />;
}
