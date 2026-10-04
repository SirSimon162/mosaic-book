export type Mode = "upload" | "chat" | "learn";

export type SourceStatus = "Ready" | "Processing" | "Pending";

export type SourceItem = {
  id: string;
  title: string;
  kind: string;
  status: SourceStatus;
};

export type ChatMessage = {
  role: "you" | "mosaic";
  text: string;
  cite?: string;
};

export type ChatThread = {
  id: string;
  title: string;
  when: string;
  messages: ChatMessage[];
};

export const workspaceName = "Field trial";

export const starterSources: SourceItem[] = [
  { id: "sheet", title: "results.xlsx", kind: "Sheet", status: "Ready" },
  { id: "video", title: "Methods lecture", kind: "YouTube", status: "Ready" },
  { id: "site", title: "protocol.org", kind: "Website", status: "Processing" },
  { id: "notes", title: "field-notes.md", kind: "Document", status: "Ready" },
];

export const threads: ChatThread[] = [
  {
    id: "means",
    title: "Why is the treated mean higher?",
    when: "Today",
    messages: [
      { role: "you", text: "Why is the treated mean higher?" },
      {
        role: "mosaic",
        text: "On sheet 2 the treated block averages 18.6 and the control block averages 17.2. That is a raw gap of 1.4, not a fitted model.",
        cite: "results.xlsx · B12:B48",
      },
    ],
  },
  {
    id: "lecture",
    title: "What does the lecture say at 12:40?",
    when: "Yesterday",
    messages: [
      { role: "you", text: "What does the lecture say at 12:40?" },
      {
        role: "mosaic",
        text: "The speaker treats the 1.4 gap as descriptive. The sheet is the measurement; the talk does not add a test.",
        cite: "Methods lecture · 12:40",
      },
    ],
  },
  {
    id: "protocol",
    title: "Which steps are on the site?",
    when: "Monday",
    messages: [
      { role: "you", text: "Which steps are on the site?" },
      {
        role: "mosaic",
        text: "The page lists the dosing order and the control block. It does not report the means.",
        cite: "protocol.org",
      },
    ],
  },
];

export const learnPieces = [
  {
    id: "summary",
    title: "Summary",
    body: "The trial compares a treated block with a control block on one sheet. The lecture walks through those rows and calls the gap descriptive. The site only records the protocol.",
  },
  {
    id: "cards",
    title: "Flashcards",
    body: "What does the sheet compare? Treated rows against the control block, before any model.",
  },
  {
    id: "notes",
    title: "Notes",
    body: "Keep the cell range beside the question. The video timestamp explains the reading; it does not replace the sheet.",
  },
];
