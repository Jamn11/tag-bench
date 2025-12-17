import { test, expect, describe } from "bun:test";
import {
  getScoreClass,
  formatScore,
  formatLatency,
  getProviderClass,
  isValidResult,
  calculateAverageScore,
  SCORE_THRESHOLDS,
} from "./types";
import type { EnhancedBenchmarkResult } from "./types";

describe("SCORE_THRESHOLDS", () => {
  test("has correct values", () => {
    expect(SCORE_THRESHOLDS.EXCELLENT).toBe(0.7);
    expect(SCORE_THRESHOLDS.GOOD).toBe(0.4);
  });
});

describe("getScoreClass", () => {
  test("returns 'excellent' for scores >= 0.7", () => {
    expect(getScoreClass(0.7)).toBe("excellent");
    expect(getScoreClass(0.85)).toBe("excellent");
    expect(getScoreClass(1.0)).toBe("excellent");
  });

  test("returns 'good' for scores >= 0.4 and < 0.7", () => {
    expect(getScoreClass(0.4)).toBe("good");
    expect(getScoreClass(0.5)).toBe("good");
    expect(getScoreClass(0.69)).toBe("good");
    expect(getScoreClass(0.699)).toBe("good");
  });

  test("returns 'poor' for scores < 0.4", () => {
    expect(getScoreClass(0)).toBe("poor");
    expect(getScoreClass(0.2)).toBe("poor");
    expect(getScoreClass(0.39)).toBe("poor");
    expect(getScoreClass(0.399)).toBe("poor");
  });

  test("handles edge cases", () => {
    expect(getScoreClass(-0.1)).toBe("poor");
    expect(getScoreClass(1.5)).toBe("excellent");
    expect(getScoreClass(NaN)).toBe("poor");
  });
});

describe("formatScore", () => {
  test("formats score as percentage", () => {
    expect(formatScore(0)).toBe("0.0%");
    expect(formatScore(0.5)).toBe("50.0%");
    expect(formatScore(1)).toBe("100.0%");
  });

  test("formats score with one decimal place", () => {
    expect(formatScore(0.333)).toBe("33.3%");
    expect(formatScore(0.8426)).toBe("84.3%");
    expect(formatScore(0.9999)).toBe("100.0%");
  });

  test("handles edge cases", () => {
    expect(formatScore(0.001)).toBe("0.1%");
    expect(formatScore(0.0001)).toBe("0.0%");
  });
});

describe("formatLatency", () => {
  test("formats milliseconds for small values", () => {
    expect(formatLatency(0)).toBe("0ms");
    expect(formatLatency(500)).toBe("500ms");
    expect(formatLatency(999)).toBe("999ms");
  });

  test("formats seconds for values >= 1000ms", () => {
    expect(formatLatency(1000)).toBe("1.0s");
    expect(formatLatency(5500)).toBe("5.5s");
    expect(formatLatency(30000)).toBe("30.0s");
    expect(formatLatency(59999)).toBe("60.0s");
  });

  test("formats minutes for values >= 60000ms", () => {
    expect(formatLatency(60000)).toBe("1.0m");
    expect(formatLatency(120000)).toBe("2.0m");
    expect(formatLatency(90000)).toBe("1.5m");
    expect(formatLatency(180000)).toBe("3.0m");
  });

  test("handles edge cases", () => {
    expect(formatLatency(999.9)).toBe("1000ms");
    expect(formatLatency(59999.9)).toBe("60.0s");
  });
});

describe("getProviderClass", () => {
  test("returns correct class for Anthropic", () => {
    expect(getProviderClass("Anthropic")).toBe("anthropic");
    expect(getProviderClass("anthropic")).toBe("anthropic");
    expect(getProviderClass("ANTHROPIC")).toBe("anthropic");
  });

  test("returns correct class for OpenAI", () => {
    expect(getProviderClass("OpenAI")).toBe("openai");
    expect(getProviderClass("openai")).toBe("openai");
    expect(getProviderClass("OPENAI")).toBe("openai");
  });

  test("returns correct class for Google", () => {
    expect(getProviderClass("Google")).toBe("google");
    expect(getProviderClass("google")).toBe("google");
    expect(getProviderClass("Google DeepMind")).toBe("google");
  });

  test("returns correct class for xAI", () => {
    expect(getProviderClass("xAI")).toBe("xai");
    expect(getProviderClass("x-ai")).toBe("xai");
    expect(getProviderClass("X-AI")).toBe("xai");
  });

  test("returns correct class for DeepSeek", () => {
    expect(getProviderClass("DeepSeek")).toBe("deepseek");
    expect(getProviderClass("deepseek")).toBe("deepseek");
    expect(getProviderClass("DEEPSEEK")).toBe("deepseek");
  });

  test("returns empty string for unknown provider", () => {
    expect(getProviderClass("Unknown")).toBe("");
    expect(getProviderClass("SomeOther")).toBe("");
    expect(getProviderClass("")).toBe("");
  });
});

describe("isValidResult", () => {
  test("returns true for valid results", () => {
    const validResult = {
      modelId: "test-model",
      modelName: "Test Model",
      provider: "Test",
      model: "test",
      timestamp: "2024-01-01",
      sections: [],
      overallScore: 0.5,
      totalLatencyMs: 1000,
    };
    expect(isValidResult(validResult)).toBe(true);
  });

  test("returns false for invalid results", () => {
    expect(isValidResult(null)).toBe(false);
    expect(isValidResult(undefined)).toBe(false);
    expect(isValidResult({})).toBe(false);
    expect(isValidResult({ modelId: "test" })).toBe(false);
    expect(isValidResult({ overallScore: 0.5 })).toBe(false);
    expect(isValidResult("string")).toBe(false);
    expect(isValidResult(123)).toBe(false);
  });

  test("returns false for partially valid results", () => {
    expect(isValidResult({ modelId: "test", overallScore: 0.5 })).toBe(false);
    expect(isValidResult({ modelId: "test", sections: [] })).toBe(false);
  });
});

describe("calculateAverageScore", () => {
  const createResult = (score: number): EnhancedBenchmarkResult => ({
    modelId: `model-${score}`,
    modelName: `Model ${score}`,
    provider: "Test",
    model: "test",
    timestamp: "2024-01-01",
    sections: [],
    overallScore: score,
    totalLatencyMs: 1000,
  });

  test("calculates average correctly", () => {
    const results = [createResult(0.5), createResult(0.7), createResult(0.9)];
    expect(calculateAverageScore(results)).toBeCloseTo(0.7, 5);
  });

  test("returns 0 for empty array", () => {
    expect(calculateAverageScore([])).toBe(0);
  });

  test("returns single score for array of one", () => {
    expect(calculateAverageScore([createResult(0.8)])).toBe(0.8);
  });

  test("handles scores of 0 and 1", () => {
    const results = [createResult(0), createResult(1)];
    expect(calculateAverageScore(results)).toBe(0.5);
  });
});
