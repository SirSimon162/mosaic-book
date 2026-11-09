"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { InviteLink } from "./invite-link";
import { useWorkspaces } from "./use-workspaces";

export function MosaicIndex({ inviteToken = "" }: { inviteToken?: string }) {
  const router = useRouter();
  const { ready, entryId, error, reload } = useWorkspaces();
  const token = inviteToken.trim();

  useEffect(() => {
    if (token) return;
    if (ready && entryId) router.replace(`/mosaic/${entryId}`);
  }, [ready, entryId, router, token]);

  if (token) {
    return (
      <div className="grid h-full place-items-center px-6">
        <InviteLink token={token} />
      </div>
    );
  }

  if (ready && error && !entryId) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <p className="m-muted text-sm">{error}</p>
          <button type="button" onClick={() => void reload()} className="m-btn mt-4">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center">
      <p className="m-muted text-sm">Opening workspace</p>
    </div>
  );
}
