import { MosaicIndex } from "@/features/mosaic/index-page";

export default async function MosaicPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const { invite } = await searchParams;
  const token = Array.isArray(invite) ? invite[0] : invite;
  return <MosaicIndex inviteToken={token ?? ""} />;
}
