import {
  anthropicAdapter,
  geminiAdapter,
  mistralAdapter,
  openaiAdapter,
  xaiAdapter,
  type ProviderAdapter,
  type ProviderName,
  type ProviderResult,
} from "./providers.js";

export const providers: Record<ProviderName, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  xai: xaiAdapter,
  mistral: mistralAdapter,
};

const configuredProviders = () => Object.values(providers).filter((provider) => provider.configured());

export const getProviderStatus = () =>
  Object.fromEntries(Object.entries(providers).map(([name, provider]) => [name, provider.configured()]));

const parseModelSelector = (value?: string) => {
  if (!value || value === "auto") return { provider: null, model: null };
  const [provider, ...parts] = value.split(":");
  if (provider in providers && parts.length) return { provider: provider as ProviderName, model: parts.join(":") };
  return { provider: null, model: value };
};

export const generateWithProvider = async (message: string, selector?: string): Promise<ProviderResult> => {
  const parsed = parseModelSelector(selector);

  if (parsed.provider) {
    const adapter = providers[parsed.provider];
    if (!adapter.configured()) throw new Error(`${parsed.provider} is not configured. Add its server-side API key.`);
    return adapter.generate(message, parsed.model || undefined);
  }

  if (parsed.model) {
    const matches = Object.values(providers).filter((provider) => provider.configured());
    for (const provider of matches) {
      if (provider.defaultModel() === parsed.model) return provider.generate(message, parsed.model);
    }
    throw new Error(`No configured provider exposes model "${parsed.model}". Use auto or provider:model.`);
  }

  const adapter = configuredProviders()[0];
  if (!adapter) throw new Error("No AI provider is configured. Add at least one server-side provider API key.");
  return adapter.generate(message);
};
