import type { ChatCompletionRequest, ChatCompletionResponse, Message } from "./types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 120000; // 120 seconds

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs / 1000}s`);
    this.name = "TimeoutError";
  }
}

export async function chatCompletion(
  request: ChatCompletionRequest,
  apiKey: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ChatCompletionResponse> {
  const controller = new AbortController();

  // Create a timeout promise that rejects after timeoutMs
  // This guarantees we never wait longer than the timeout, even if fetch doesn't respond to abort
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort(); // Still try to abort the fetch
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);
  });

  const fetchPromise = (async () => {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/tmg-bench",
        "X-Title": "TMG Bench",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<ChatCompletionResponse>;
  })();

  // Race between the fetch and the timeout - guarantees we resolve within timeoutMs
  return Promise.race([fetchPromise, timeoutPromise]);
}

export interface AskQuestionOptions {
  model: string;
  question: string;
  apiKey: string;
  systemPrompt?: string;
  reasoningBudget?: number; // For Anthropic thinking models (token budget)
  reasoningEffort?: "low" | "medium" | "high"; // For OpenAI reasoning models
  timeoutMs?: number;
}

export async function askQuestion(
  model: string,
  question: string,
  apiKey: string,
  systemPrompt?: string,
  reasoningBudget?: number,
  reasoningEffort?: "low" | "medium" | "high",
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{ answer: string; latencyMs: number; timedOut: boolean }> {
  const messages: Message[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: question });

  const startTime = performance.now();

  const request: ChatCompletionRequest = {
    model,
    messages,
    temperature: 0,
  };

  // Add reasoning budget for Anthropic thinking models
  if (reasoningBudget) {
    request.reasoning = {
      max_tokens: reasoningBudget,
    };
    // Ensure max_tokens is higher than reasoning budget
    request.max_tokens = reasoningBudget + 4096;
  }

  // Add reasoning effort for OpenAI reasoning models
  if (reasoningEffort) {
    request.reasoning = {
      effort: reasoningEffort,
    };
    // Set max_tokens to ensure room for response after reasoning
    request.max_tokens = 16384;
  }

  try {
    const response = await chatCompletion(request, apiKey, timeoutMs);
    const latencyMs = performance.now() - startTime;
    const answer = response.choices[0]?.message?.content ?? "";
    return { answer, latencyMs, timedOut: false };
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    if (error instanceof TimeoutError) {
      return { answer: "", latencyMs, timedOut: true };
    }
    throw error;
  }
}
