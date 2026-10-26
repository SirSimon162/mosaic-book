import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "mosaic-research",
  isDev: process.env.NODE_ENV !== "production",
});
