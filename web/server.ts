import index from "./index.html";
import { loadAllResults, loadQuestions } from "../src/storage";
import { MODELS, getModelById } from "../src/models";
import type { BenchmarkResult } from "../src/types";

// Load benchmark data
const resultsMap = await loadAllResults();
const questions = await loadQuestions();

// Convert Map to object for JSON serialization
const results: Record<string, BenchmarkResult> = {};
for (const [key, value] of resultsMap) {
  results[key] = value;
}

// Enhance results with model metadata
const enhancedResults = Object.entries(results).map(([modelId, result]) => {
  const modelConfig = getModelById(modelId);
  return {
    modelId,
    modelName: modelConfig?.name ?? modelId,
    provider: modelConfig?.provider ?? "Unknown",
    ...result,
  };
});

// Create API data
const apiData = {
  results: enhancedResults,
  questions,
  models: MODELS,
};

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": index,
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
    "/api/models": {
      GET: () => {
        return new Response(JSON.stringify(MODELS), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
    "/api/questions": {
      GET: () => {
        return new Response(JSON.stringify(questions), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`TMG Bench Web UI running at http://localhost:${server.port}`);
