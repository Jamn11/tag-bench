// Web visualization types

export interface QuestionResult {
  questionId: string;
  type: string;
  correct: boolean;
  score: number;
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

export interface EnhancedBenchmarkResult {
  modelId: string;
  modelName: string;
  provider: string;
  model: string;
  timestamp: string;
  sections: SectionResult[];
  overallScore: number;
  totalLatencyMs: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  code: string;
  costTier: "cheap" | "medium" | "expensive";
  reasoningBudget?: number;
  reasoningEffort?: "low" | "medium" | "high";
}

export interface Question {
  id: string;
  question: string;
  difficulty: "easy" | "medium" | "hard";
  type: string;
  acceptedAnswers?: string[];
  expectedItems?: string[];
}

export interface QuestionsData {
  lists: Question[];
  shortAnswer: Question[];
  quotes: Question[];
  multipleChoice: Question[];
}

export interface ApiData {
  results: EnhancedBenchmarkResult[];
  questions: QuestionsData;
  models: ModelConfig[];
}

export type ViewMode = "leaderboard" | "comparison" | "analysis";

export function getScoreClass(score: number): string {
  if (score >= 0.7) return "excellent";
  if (score >= 0.4) return "good";
  return "poor";
}

export function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export function formatLatency(ms: number): string {
  if (ms >= 60000) {
    return `${(ms / 60000).toFixed(1)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}

export function getProviderClass(provider: string): string {
  const lower = provider.toLowerCase();
  if (lower.includes("anthropic")) return "anthropic";
  if (lower.includes("openai")) return "openai";
  if (lower.includes("google")) return "google";
  if (lower.includes("xai") || lower.includes("x-ai")) return "xai";
  if (lower.includes("deepseek")) return "deepseek";
  return "";
}
