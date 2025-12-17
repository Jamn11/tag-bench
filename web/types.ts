// Web visualization types

// Score thresholds for classification
export const SCORE_THRESHOLDS = {
  EXCELLENT: 0.7,
  GOOD: 0.4,
} as const;

export type ScoreClass = "excellent" | "good" | "poor";

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

export type ProviderClass =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "deepseek"
  | "";

/**
 * Get the CSS class for a score based on thresholds
 * - excellent: >= 70%
 * - good: >= 40%
 * - poor: < 40%
 */
export function getScoreClass(score: number): ScoreClass {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return "excellent";
  if (score >= SCORE_THRESHOLDS.GOOD) return "good";
  return "poor";
}

/**
 * Format a score (0-1) as a percentage string
 */
export function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Format latency in milliseconds to a human-readable string
 * - >= 60s: shows minutes (e.g., "1.5m")
 * - >= 1s: shows seconds (e.g., "5.2s")
 * - < 1s: shows milliseconds (e.g., "500ms")
 */
export function formatLatency(ms: number): string {
  if (ms >= 60000) {
    return `${(ms / 60000).toFixed(1)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}

/**
 * Get the CSS class for a provider badge
 */
export function getProviderClass(provider: string): ProviderClass {
  const lower = provider.toLowerCase();
  if (lower.includes("anthropic")) return "anthropic";
  if (lower.includes("openai")) return "openai";
  if (lower.includes("google")) return "google";
  if (lower.includes("xai") || lower.includes("x-ai")) return "xai";
  if (lower.includes("deepseek")) return "deepseek";
  return "";
}

/**
 * Type guard for checking if a result is valid
 */
export function isValidResult(
  result: unknown
): result is EnhancedBenchmarkResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "modelId" in result &&
    "overallScore" in result &&
    "sections" in result
  );
}

/**
 * Calculate average score from an array of results
 */
export function calculateAverageScore(
  results: EnhancedBenchmarkResult[]
): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
}
