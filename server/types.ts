export type ProviderName = "openai" | "anthropic" | "gemini" | "xai" | "mistral";

export type ChatRequest = {
  message: string;
  model?: string;
  provider?: ProviderName;
};

export type ChatResponse = {
  id: string;
  provider: ProviderName;
  model: string;
  output: string;
};
