import {
  IconAlignLeft,
  IconBrandYoutube,
  IconFileTypePdf,
  IconTable,
  IconWorld,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export type SourceType = {
  id: string;
  label: string;
  description: string;
  sample: string;
  icon: ComponentType<{ className?: string }>;
};

export const SOURCE_TYPES: SourceType[] = [
  {
    id: "text",
    label: "Text",
    description: "Paste notes, transcripts or a raw passage straight in.",
    sample: "Field notes · cooling retrofit",
    icon: IconAlignLeft,
  },
  {
    id: "website",
    label: "Website",
    description: "Point at a URL and keep the link as a citation.",
    sample: "city.gov/heat-islands",
    icon: IconWorld,
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Pull the transcript, timestamps intact.",
    sample: "Lecture · 18:42",
    icon: IconBrandYoutube,
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Upload a PDF and keep pages searchable.",
    sample: "IPCC brief.pdf",
    icon: IconFileTypePdf,
  },
  {
    id: "excel",
    label: "Excel sheet",
    description: "Excel and CSV, with columns preserved.",
    sample: "costs-2019.xlsx",
    icon: IconTable,
  },
];

const sourceById = Object.fromEntries(
  SOURCE_TYPES.map((source) => [source.id, source]),
) as Record<string, SourceType>;

export const ORBIT_RINGS = [
  {
    id: "inner",
    sources: ["youtube", "text"].map((id) => sourceById[id]!),
    radius: "var(--orbit-inner-r)",
    duration: "28s",
  },
  {
    id: "outer",
    sources: ["website", "pdf", "excel"].map((id) => sourceById[id]!),
    radius: "var(--orbit-outer-r)",
    duration: "40s",
  },
] as const;
