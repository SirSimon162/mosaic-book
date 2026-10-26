import { Firecrawl } from "firecrawl";
import environment from "../config/env.js";

export class EmptyWebsiteError extends Error {
  constructor(message = "Failed to scrape website") {
    super(message);
    this.name = "EmptyWebsiteError";
  }
}

export async function scrapeWebsite(url: string) {
  const apiKey = environment.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }
  const client = new Firecrawl({ apiKey });
  const result = await client.scrape(url, { formats: ["markdown"] });
  const markdown = result.markdown?.trim();
  if (!markdown) {
    throw new EmptyWebsiteError();
  }
  return {
    markdown,
    title: result.metadata?.title,
    sourceUrl: result.metadata?.sourceURL ?? url,
  };
}
