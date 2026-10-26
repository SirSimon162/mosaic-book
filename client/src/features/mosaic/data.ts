export type Mode = "upload" | "chat" | "learn";

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
