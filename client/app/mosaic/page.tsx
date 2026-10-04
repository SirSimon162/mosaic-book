import type { Metadata } from "next";
import { Dashboard } from "@/components/mosaic/dashboard";

export const metadata: Metadata = {
  title: "Mosaic",
  description: "Your workspace for sources, chat, and study.",
};

export default function MosaicPage() {
  return <Dashboard />;
}
