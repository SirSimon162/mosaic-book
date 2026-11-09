import { Inngest } from "inngest";
import environment from "../config/env.js";

export const inngest = new Inngest({
  id: "mosaic-research",
  isDev: !environment.SECURE,
});
