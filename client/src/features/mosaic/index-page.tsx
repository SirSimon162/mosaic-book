"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWorkspaces } from "./use-workspaces";

export function MosaicIndex() {
  const router = useRouter();
  const { ready, entryId, error, reload } = useWorkspaces();

  useEffect(() => {
    if (ready && entryId) router.replace(`/mosaic/${entryId}`);
  }, [ready, entryId, router]);

  if (ready && error && !entryId) {
    return (
      <div className="grid h-full place-items-center bg-primary px-6 text-center">
        <div>
          <p className="text-sm text-secondary">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm text-on-accent"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center bg-primary">
      <p className="text-sm text-secondary">Opening workspace</p>
    </div>
  );
}
