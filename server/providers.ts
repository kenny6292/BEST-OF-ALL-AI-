export type ProviderName = "openai" | "anthropic" | "gemini" | "xai" | "mistral";

export type ProviderResult = {
  id: string;
  provider: ProviderName;
  model: string;
  output: string;
};

export type ProviderAdapter = {
  name: ProviderName;
  configured: () => boolean;
  defaultModel: () => string;
  generate: (message: string, model?: string) => Promise<ProviderResult>;
};

const jsonFetch = async (url: string, init: RequestInit) => {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const detail = body?.error?.message || body?.error || body?.message || text || `HTTP ${response.status}`;
    throw new Error(String(detail));
  }
  return body;
};

export const openaiAdapter: ProviderAdapter = {
  name: "openai",
  configured: () => Boolean(process.env.OPENAI_API_KEY),
  defaultModel: () => process.env.OPENAI_MODEL || "gpt-5.6-luna",
  async generate(message, model) {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({ model: model || openaiAdapter.defaultModel(), input: message });
    return { id: response.id, provider: "openai", model: response.model, output: response.output_text };
  },
};

export const anthropicAdapter: ProviderAdapter = {
  name: "anthropic",
  configured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  defaultModel: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  async generate(message, model) {
    const selected = model || anthropicAdapter.defaultModel();
    const body = await jsonFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: selected, max_tokens: 4096, messages: [{ role: "user", content: message }] }),
    });
    const output = Array.isArray(body.content) ? body.content.filter((x: any) => x.type === "text").map((x: any) => x.text).join("") : "";
    return { id: body.id, provider: "anthropic", model: body.model || selected, output };
  },
};

export const geminiAdapter: ProviderAdapter = {
  name: "gemini",
  configured: () => Boolean(process.env.GEMINI_API_KEY),
  defaultModel: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
  async generate(message, model) {
    const selected = model || geminiAdapter.defaultModel();
    const body = await jsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selected)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY || "")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: message }] }] }),
    });
    const output = body.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
    return { id: body.responseId || `gemini-${Date.now()}`, provider: "gemini", model: body.modelVersion || selected, output };
  },
};

export const xaiAdapter: ProviderAdapter = {
  name: "xai",
  configured: () => Boolean(process.env.XAI_API_KEY),
  defaultModel: () => process.env.XAI_MODEL || "grok-4-6",
  async generate(message, model) {
    const selected = model || xaiAdapter.defaultModel();
    const body = await jsonFetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.XAI_API_KEY || ""}` },
      body: JSON.stringify({ model: selected, messages: [{ role: "user", content: message }] }),
    });
    return { id: body.id, provider: "xai", model: body.model || selected, output: body.choices?.[0]?.message?.content || "" };
  },
};

export const mistralAdapter: ProviderAdapter = {
  name: "mistral",
  configured: () => Boolean(process.env.MISTRAL_API_KEY),
  defaultModel: () => process.env.MISTRAL_MODEL || "mistral-large-latest",
  async generate(message, model) {
    const selected = model || mistralAdapter.defaultModel();
    const body = await jsonFetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MISTRAL_API_KEY || ""}` },
      body: JSON.stringify({ model: selected, messages: [{ role: "user", content: message }] }),
    });
    return { id: body.id, provider: "mistral", model: body.model || selected, output: body.choices?.[0]?.message?.content || "" };
  },
};
