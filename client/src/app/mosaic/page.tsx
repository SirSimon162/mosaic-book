import type { Metadata } from "next";
import { Dashboard } from "@/features/mosaic/dashboard";
import { MosaicGate } from "@/features/mosaic/gate";

export const metadata: Metadata = {
  title: "Mosaic",
  description: "Your workspace for sources, chat, and study.",
};

export default function MosaicPage() {
  return (
    <MosaicGate>
      <Dashboard />
    </MosaicGate>
  );
}
