"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorkspaces } from "./use-workspaces";

const joins = new Map<string, Promise<string>>();

function joinWorkspace(token: string, accept: (token: string) => Promise<string>) {
  const existing = joins.get(token);
  if (existing) return existing;
  const job = accept(token).finally(() => {
    if (joins.get(token) === job) joins.delete(token);
  });
  joins.set(token, job);
  return job;
}

export function InviteLink({ token }: { token: string }) {
  const router = useRouter();
  const acceptInvite = useWorkspaces().acceptInvite;
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const next = token.trim();
    if (!next) return;
    let ignore = false;
    void joinWorkspace(next, acceptInvite)
      .then((id) => {
        if (!ignore) router.replace(`/mosaic/${id}`);
      })
      .catch((cause: unknown) => {
        if (ignore) return;
        setError(cause instanceof Error ? cause.message : "Could not join this workspace");
      });
    return () => {
      ignore = true;
    };
  }, [acceptInvite, attempt, router, token]);

  if (error) {
    return (
      <div className="text-center">
        <p className="m-muted text-sm">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setAttempt((value) => value + 1);
          }}
          className="m-btn mt-4"
        >
          Try again
        </button>
      </div>
    );
  }

  return <p className="m-muted text-sm">Joining workspace</p>;
}
