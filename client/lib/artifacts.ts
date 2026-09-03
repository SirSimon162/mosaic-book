import {
  IconFileDescription,
  IconListCheck,
  IconSitemap,
  IconTimeline,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export type ArtifactType = {
  id: string;
  label: string;
  line: string;
  headline: string;
  body: string;
  icon: ComponentType<{ className?: string }>;
};

export const ARTIFACT_TYPES: ArtifactType[] = [
  {
    id: "quiz",
    label: "Quiz",
    line: "8 questions",
    headline: "Check what actually landed",
    body: "Generate a graded question set from a mosaic, with the source passage attached to every answer.",
    icon: IconListCheck,
  },
  {
    id: "report",
    label: "Report",
    line: "4 sections",
    headline: "A brief you can hand over",
    body: "Sectioned prose drawn from the tiles you chose, with a citation on every claim it makes.",
    icon: IconFileDescription,
  },
  {
    id: "flow",
    label: "Flow chart",
    line: "Process map",
    headline: "See the process end to end",
    body: "Turn a described sequence into a diagram, including the branches buried three pages into a PDF.",
    icon: IconSitemap,
  },
  {
    id: "timeline",
    label: "Timeline",
    line: "2016–23",
    headline: "Put events back in order",
    body: "Pull dates from across every tile and resolve them into one chronology you can scan.",
    icon: IconTimeline,
  },
];
