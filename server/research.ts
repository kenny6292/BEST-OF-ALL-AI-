import { generateWithProvider } from "./provider-router.js";

export type ResearchSource = {
  title: string;
  url: string;
  snippet: string;
};

type BraveResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      extra_snippets?: string[];
    }>;
  };
};

export type ResearchResult = {
  answer: string;
  sources: ResearchSource[];
  provider?: string;
  model?: string;
};

const getBraveKey = () => process.env.BRAVE_SEARCH_API_KEY || process.env.WEB_SEARCH_API_KEY;

export const researchConfigured = () => Boolean(getBraveKey());

const searchWeb = async (query: string): Promise<ResearchSource[]> => {
  const key = getBraveKey();
  if (!key) throw new Error("Web research is not configured. Add BRAVE_SEARCH_API_KEY on the server.");

  const params = new URLSearchParams({
    q: query.slice(0, 600),
    count: "8",
    country: process.env.BRAVE_SEARCH_COUNTRY || "us",
    search_lang: process.env.BRAVE_SEARCH_LANG || "en",
    safesearch: "moderate",
    extra_snippets: "true",
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Web search failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as BraveResponse;
  return (data.web?.results ?? [])
    .filter((item) => item.title && item.url)
    .map((item) => ({
      title: item.title!,
      url: item.url!,
      snippet: [item.description, ...(item.extra_snippets ?? [])].filter(Boolean).join(" "),
    }))
    .slice(0, 8);
};

export const runResearch = async (query: string, model = "auto"): Promise<ResearchResult> => {
  const sources = await searchWeb(query);
  if (!sources.length) {
    return { answer: "No web results were returned for this research query.", sources };
  }

  const sourceContext = sources
    .map((source, index) => `[Source ${index + 1}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`)
    .join("\n\n");

  const prompt = `You are the research engine for BEST OF ALL AI.
Answer the user's research question using only the supplied search-result evidence.
Do not invent facts or sources. If the evidence is incomplete or conflicting, say so.
Cite claims inline using [Source N] markers that correspond exactly to the supplied sources.
End with a short "Sources" section listing the cited source numbers.

User question:
${query}

Search results:
${sourceContext}`;

  try {
    const generated = await generateWithProvider(prompt, model);
    return { answer: generated.output, sources, provider: generated.provider, model: generated.model };
  } catch (error) {
    return {
      answer: `Search completed, but AI synthesis is unavailable: ${error instanceof Error ? error.message : "AI synthesis failed."}\n\nSearch results are still available below.`,
      sources,
    };
  }
};
