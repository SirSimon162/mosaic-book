import { Dashboard } from "@/features/mosaic/dashboard";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const { id } = await params;
  const { invite } = await searchParams;
  const token = Array.isArray(invite) ? invite[0] : invite;
  return <Dashboard workspaceId={id} inviteToken={token ?? ""} />;
}
