export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  reasoning?: {
    max_tokens?: number; // For Anthropic thinking models (token budget)
    effort?: "low" | "medium" | "high"; // For OpenAI reasoning models
  };
}

export interface ChatCompletionChoice {
  index: number;
  message: Message;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Question Types

interface BaseQuestion {
  id: string;
  question: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: "short-answer";
  acceptedAnswers: string[]; // Multiple valid answers (e.g., "John Darnielle", "Darnielle")
}

export interface ListQuestion extends BaseQuestion {
  type: "list";
  expectedItems: string[]; // Order matters
}

export type Question = ShortAnswerQuestion | ListQuestion;

// Scoring

export interface QuestionResult {
  questionId: string;
  type: Question["type"];
  correct: boolean;
  score: number; // 0-1, allows partial credit for lists
  modelResponse: string;
  expectedAnswer: string;
  latencyMs: number;
  timedOut?: boolean;
}

export interface SectionResult {
  section: string;
  totalQuestions: number;
  correctCount: number;
  averageScore: number;
  results: QuestionResult[];
}

export interface BenchmarkResult {
  model: string;
  timestamp: string;
  sections: SectionResult[];
  overallScore: number;
  totalLatencyMs: number;
}
