import { Firecrawl } from "firecrawl";
import AppError from "./http-error.js";
import { Status } from "./http-code.js";
import environment from "../config/env.js";

export async function scrapeWebsite(url: string) {
  const apiKey = environment.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new AppError(
      "FIRECRAWL_API_KEY is not set",
      Status.INTERNAL_SERVER_ERROR,
    );
  }
  const client = new Firecrawl({ apiKey: apiKey as string });
  const result = await client.scrape(url, { formats: ["markdown"] });
  const markdown = result.markdown?.trim();
  if (!markdown) {
    throw new AppError(
      "Failed to scrape website",
      Status.INTERNAL_SERVER_ERROR,
    );
  }
  return {
    markdown,
    title: result.metadata?.title,
    sourceUrl: result.metadata?.sourceURL ?? url,
  };
}
