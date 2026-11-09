import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MosaicGate } from "@/features/mosaic/gate";
import { WorkspaceProvider } from "@/features/mosaic/use-workspaces";

export const metadata: Metadata = {
  title: "Mosaic",
  description: "Your workspace for sources, chat, and study.",
};

export default function MosaicLayout({ children }: { children: ReactNode }) {
  return (
    <div data-mosaic className="h-full min-h-0">
      <MosaicGate>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </MosaicGate>
    </div>
  );
}
