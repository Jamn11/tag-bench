export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  code: string;
  costTier: "cheap" | "medium" | "expensive";
  reasoningBudget?: number; // For Anthropic thinking models (token budget)
  reasoningEffort?: "low" | "medium" | "high"; // For OpenAI reasoning models
}

export const MODELS: ModelConfig[] = [
  // Testing model (cheap)
  {
    id: "grok-4.1-fast",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    code: "x-ai/grok-4.1-fast",
    costTier: "cheap",
  },

  // Anthropic
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    code: "anthropic/claude-sonnet-4",
    costTier: "medium",
  },
  {
    id: "claude-sonnet-4-thinking",
    name: "Claude Sonnet 4 (Thinking)",
    provider: "Anthropic",
    code: "anthropic/claude-sonnet-4",
    costTier: "expensive",
    reasoningBudget: 16000,
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    code: "anthropic/claude-sonnet-4.5",
    costTier: "medium",
  },
  {
    id: "claude-sonnet-4.5-thinking",
    name: "Claude Sonnet 4.5 (Thinking)",
    provider: "Anthropic",
    code: "anthropic/claude-sonnet-4.5",
    costTier: "expensive",
    reasoningBudget: 16000,
  },
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    code: "anthropic/claude-opus-4.5",
    costTier: "expensive",
  },
  {
    id: "claude-opus-4.5-thinking",
    name: "Claude Opus 4.5 (Thinking)",
    provider: "Anthropic",
    code: "anthropic/claude-opus-4.5",
    costTier: "expensive",
    reasoningBudget: 16000,
  },

  // xAI
  {
    id: "grok-4",
    name: "Grok 4",
    provider: "xAI",
    code: "x-ai/grok-4",
    costTier: "expensive",
  },

  // Google
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro Preview",
    provider: "Google",
    code: "google/gemini-3-pro-preview",
    costTier: "medium",
  },

  // DeepSeek
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "DeepSeek",
    code: "deepseek/deepseek-v3.2",
    costTier: "cheap",
  },

  // Z.AI (GLM)
  {
    id: "glm-4.7",
    name: "GLM 4.7",
    provider: "Z.AI",
    code: "z-ai/glm-4.7",
    costTier: "medium",
  },

  // OpenAI - GPT 5
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    code: "openai/gpt-5",
    costTier: "expensive",
  },
  {
    id: "gpt-5-low",
    name: "GPT-5 (Low Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5",
    costTier: "expensive",
    reasoningEffort: "low",
  },
  {
    id: "gpt-5-medium",
    name: "GPT-5 (Medium Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5",
    costTier: "expensive",
    reasoningEffort: "medium",
  },
  {
    id: "gpt-5-high",
    name: "GPT-5 (High Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5",
    costTier: "expensive",
    reasoningEffort: "high",
  },

  // OpenAI - GPT 5.1
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "OpenAI",
    code: "openai/gpt-5.1",
    costTier: "expensive",
  },
  {
    id: "gpt-5.1-low",
    name: "GPT-5.1 (Low Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5.1",
    costTier: "expensive",
    reasoningEffort: "low",
  },
  {
    id: "gpt-5.1-medium",
    name: "GPT-5.1 (Medium Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5.1",
    costTier: "expensive",
    reasoningEffort: "medium",
  },
  {
    id: "gpt-5.1-high",
    name: "GPT-5.1 (High Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5.1",
    costTier: "expensive",
    reasoningEffort: "high",
  },

  // OpenAI - GPT 5.2
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "OpenAI",
    code: "openai/gpt-5.2",
    costTier: "expensive",
  },
  {
    id: "gpt-5.2-low",
    name: "GPT-5.2 (Low Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5.2",
    costTier: "expensive",
    reasoningEffort: "low",
  },
  {
    id: "gpt-5.2-medium",
    name: "GPT-5.2 (Medium Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5.2",
    costTier: "expensive",
    reasoningEffort: "medium",
  },
  {
    id: "gpt-5.2-high",
    name: "GPT-5.2 (High Reasoning)",
    provider: "OpenAI",
    code: "openai/gpt-5.2",
    costTier: "expensive",
    reasoningEffort: "high",
  },
];

export function getModelById(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getModelByCode(code: string): ModelConfig | undefined {
  return MODELS.find((m) => m.code === code);
}

export function getAllModelIds(): string[] {
  return MODELS.map((m) => m.id);
}
