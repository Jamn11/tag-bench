// Web visualization types

// Score thresholds for classification
export const SCORE_THRESHOLDS = {
  EXCELLENT: 0.7,
  GOOD: 0.4,
} as const;

// Cost tier numeric values (relative cost index)
export const COST_VALUES: Record<CostTier, number> = {
  cheap: 1,
  medium: 3,
  expensive: 10,
} as const;

export type CostTier = "cheap" | "medium" | "expensive";
export type ScoreClass = "excellent" | "good" | "poor";
export type SortOption = "score" | "name" | "provider" | "latency" | "cost";
export type SortDirection = "asc" | "desc";

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
  costTier?: CostTier;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  code: string;
  costTier: CostTier;
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

export type ViewMode = "leaderboard" | "comparison" | "analysis" | "insights";

export type ProviderClass =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "deepseek"
  | "";

// Regression analysis types
export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  correlation: number;
  points: { x: number; y: number; label: string }[];
}

export interface FilterState {
  providers: string[];
  costTiers: CostTier[];
  minScore: number;
  maxScore: number;
}

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

/**
 * Get numeric cost value from cost tier
 */
export function getCostValue(tier: CostTier | undefined): number {
  if (!tier) return COST_VALUES.medium;
  return COST_VALUES[tier];
}

/**
 * Get cost tier label for display
 */
export function getCostTierLabel(tier: CostTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Perform simple linear regression
 * Returns slope, intercept, R-squared, and correlation coefficient
 */
export function linearRegression(
  points: { x: number; y: number; label: string }[]
): RegressionResult {
  const n = points.length;

  if (n < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      correlation: 0,
      points,
    };
  }

  // Calculate means
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  let ssTotal = 0;
  let ssResidual = 0;

  for (const point of points) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Calculate R-squared
  for (const point of points) {
    const predicted = slope * point.x + intercept;
    ssResidual += (point.y - predicted) ** 2;
    ssTotal += (point.y - meanY) ** 2;
  }

  const rSquared = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;

  // Calculate correlation coefficient
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const point of points) {
    sumXY += (point.x - meanX) * (point.y - meanY);
    sumX2 += (point.x - meanX) ** 2;
    sumY2 += (point.y - meanY) ** 2;
  }

  const correlation =
    sumX2 !== 0 && sumY2 !== 0 ? sumXY / Math.sqrt(sumX2 * sumY2) : 0;

  return {
    slope,
    intercept,
    rSquared,
    correlation,
    points,
  };
}

/**
 * Calculate cost vs performance regression for results
 */
export function calculateCostPerformanceRegression(
  results: EnhancedBenchmarkResult[]
): RegressionResult {
  const points = results.map((r) => ({
    x: getCostValue(r.costTier),
    y: r.overallScore,
    label: r.modelName,
  }));

  return linearRegression(points);
}

/**
 * Calculate latency vs performance regression
 */
export function calculateLatencyPerformanceRegression(
  results: EnhancedBenchmarkResult[]
): RegressionResult {
  const points = results.map((r) => ({
    x: r.totalLatencyMs / 1000, // Convert to seconds
    y: r.overallScore,
    label: r.modelName,
  }));

  return linearRegression(points);
}

/**
 * Get unique providers from results
 */
export function getUniqueProviders(results: EnhancedBenchmarkResult[]): string[] {
  return [...new Set(results.map((r) => r.provider))].sort();
}

/**
 * Get unique cost tiers from results
 */
export function getUniqueCostTiers(
  results: EnhancedBenchmarkResult[]
): CostTier[] {
  const tiers = new Set(
    results.map((r) => r.costTier).filter((t): t is CostTier => t !== undefined)
  );
  return ["cheap", "medium", "expensive"].filter((t) =>
    tiers.has(t as CostTier)
  ) as CostTier[];
}
