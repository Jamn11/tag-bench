import { test, expect, describe } from "bun:test";
import {
  getScoreClass,
  formatScore,
  formatLatency,
  getProviderClass,
} from "./types";

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
  });

  test("returns 'poor' for scores < 0.4", () => {
    expect(getScoreClass(0)).toBe("poor");
    expect(getScoreClass(0.2)).toBe("poor");
    expect(getScoreClass(0.39)).toBe("poor");
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
  });
});

describe("formatLatency", () => {
  test("formats milliseconds for small values", () => {
    expect(formatLatency(500)).toBe("500ms");
    expect(formatLatency(999)).toBe("999ms");
  });

  test("formats seconds for values >= 1000ms", () => {
    expect(formatLatency(1000)).toBe("1.0s");
    expect(formatLatency(5500)).toBe("5.5s");
    expect(formatLatency(30000)).toBe("30.0s");
  });

  test("formats minutes for values >= 60000ms", () => {
    expect(formatLatency(60000)).toBe("1.0m");
    expect(formatLatency(120000)).toBe("2.0m");
    expect(formatLatency(90000)).toBe("1.5m");
  });
});

describe("getProviderClass", () => {
  test("returns correct class for Anthropic", () => {
    expect(getProviderClass("Anthropic")).toBe("anthropic");
    expect(getProviderClass("anthropic")).toBe("anthropic");
  });

  test("returns correct class for OpenAI", () => {
    expect(getProviderClass("OpenAI")).toBe("openai");
    expect(getProviderClass("openai")).toBe("openai");
  });

  test("returns correct class for Google", () => {
    expect(getProviderClass("Google")).toBe("google");
    expect(getProviderClass("google")).toBe("google");
  });

  test("returns correct class for xAI", () => {
    expect(getProviderClass("xAI")).toBe("xai");
    expect(getProviderClass("x-ai")).toBe("xai");
  });

  test("returns correct class for DeepSeek", () => {
    expect(getProviderClass("DeepSeek")).toBe("deepseek");
    expect(getProviderClass("deepseek")).toBe("deepseek");
  });

  test("returns empty string for unknown provider", () => {
    expect(getProviderClass("Unknown")).toBe("");
    expect(getProviderClass("SomeOther")).toBe("");
  });
});
