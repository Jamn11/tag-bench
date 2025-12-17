import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import type { ApiData, EnhancedBenchmarkResult } from "./types";

describe("API Server", () => {
  let server: ReturnType<typeof Bun.serve>;
  const port = 3001; // Use different port for testing

  beforeAll(async () => {
    // Import and start server on test port
    const { loadAllResults, loadQuestions } = await import("../src/storage");
    const { MODELS, getModelById } = await import("../src/models");

    const resultsMap = await loadAllResults();
    const questions = await loadQuestions();

    const results: Record<string, unknown> = {};
    for (const [key, value] of resultsMap) {
      results[key] = value;
    }

    const enhancedResults = Object.entries(results).map(([modelId, result]) => {
      const modelConfig = getModelById(modelId);
      return {
        modelId,
        modelName: modelConfig?.name ?? modelId,
        provider: modelConfig?.provider ?? "Unknown",
        ...(result as object),
      };
    });

    const apiData = {
      results: enhancedResults,
      questions,
      models: MODELS,
    };

    server = Bun.serve({
      port,
      routes: {
        "/api/data": {
          GET: () => {
            return new Response(JSON.stringify(apiData), {
              headers: { "Content-Type": "application/json" },
            });
          },
        },
        "/api/results": {
          GET: () => {
            return new Response(JSON.stringify(enhancedResults), {
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      },
    });
  });

  afterAll(() => {
    server.stop();
  });

  test("GET /api/data returns valid JSON", async () => {
    const response = await fetch(`http://localhost:${port}/api/data`);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const data = (await response.json()) as ApiData;
    expect(data).toHaveProperty("results");
    expect(data).toHaveProperty("questions");
    expect(data).toHaveProperty("models");
  });

  test("GET /api/data returns results with required fields", async () => {
    const response = await fetch(`http://localhost:${port}/api/data`);
    const data = (await response.json()) as ApiData;

    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    const firstResult = data.results[0] as EnhancedBenchmarkResult;
    expect(firstResult).toHaveProperty("modelId");
    expect(firstResult).toHaveProperty("modelName");
    expect(firstResult).toHaveProperty("provider");
    expect(firstResult).toHaveProperty("overallScore");
    expect(firstResult).toHaveProperty("sections");
  });

  test("GET /api/results returns array of results", async () => {
    const response = await fetch(`http://localhost:${port}/api/results`);
    expect(response.status).toBe(200);

    const results = (await response.json()) as EnhancedBenchmarkResult[];
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test("results have valid score values", async () => {
    const response = await fetch(`http://localhost:${port}/api/data`);
    const data = (await response.json()) as ApiData;

    for (const result of data.results) {
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);

      for (const section of result.sections) {
        expect(section.averageScore).toBeGreaterThanOrEqual(0);
        expect(section.averageScore).toBeLessThanOrEqual(1);
      }
    }
  });

  test("questions data has expected sections", async () => {
    const response = await fetch(`http://localhost:${port}/api/data`);
    const data = (await response.json()) as ApiData;

    expect(data.questions).toHaveProperty("lists");
    expect(data.questions).toHaveProperty("shortAnswer");
    // Questions files have structure: { section, description, systemPrompt, questions: [] }
    // or could be empty arrays if file doesn't exist
    expect(
      data.questions.lists === null ||
        Array.isArray(data.questions.lists) ||
        (typeof data.questions.lists === "object" &&
          "questions" in (data.questions.lists as object))
    ).toBe(true);
  });
});
