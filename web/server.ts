import index from "./index.html";
import { loadAllResults, loadQuestions } from "../src/storage";
import { MODELS, getModelById } from "../src/models";
import type { BenchmarkResult } from "../src/types";

// Common response headers
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
} as const;

// Error response helper
function errorResponse(message: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Load and prepare benchmark data
async function loadBenchmarkData() {
  try {
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
        costTier: modelConfig?.costTier ?? "medium",
        ...result,
      };
    });

    return {
      results: enhancedResults,
      questions,
      models: MODELS,
    };
  } catch (error) {
    console.error("Failed to load benchmark data:", error);
    throw error;
  }
}

// Load data at startup
let apiData: Awaited<ReturnType<typeof loadBenchmarkData>>;

try {
  apiData = await loadBenchmarkData();
  console.log(`Loaded ${apiData.results.length} benchmark results`);
} catch (error) {
  console.error("Failed to initialize server:", error);
  process.exit(1);
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  routes: {
    "/": index,

    "/api/data": {
      GET: () => {
        try {
          return new Response(JSON.stringify(apiData), {
            headers: JSON_HEADERS,
          });
        } catch (error) {
          console.error("Error serving /api/data:", error);
          return errorResponse("Failed to serialize data");
        }
      },
    },

    "/api/results": {
      GET: () => {
        try {
          return new Response(JSON.stringify(apiData.results), {
            headers: JSON_HEADERS,
          });
        } catch (error) {
          console.error("Error serving /api/results:", error);
          return errorResponse("Failed to serialize results");
        }
      },
    },

    "/api/results/:modelId": {
      GET: (req) => {
        try {
          const modelId = req.params.modelId;
          const result = apiData.results.find((r) => r.modelId === modelId);

          if (!result) {
            return errorResponse(`Model '${modelId}' not found`, 404);
          }

          return new Response(JSON.stringify(result), {
            headers: JSON_HEADERS,
          });
        } catch (error) {
          console.error("Error serving /api/results/:modelId:", error);
          return errorResponse("Failed to serialize result");
        }
      },
    },

    "/api/models": {
      GET: () => {
        try {
          return new Response(JSON.stringify(apiData.models), {
            headers: JSON_HEADERS,
          });
        } catch (error) {
          console.error("Error serving /api/models:", error);
          return errorResponse("Failed to serialize models");
        }
      },
    },

    "/api/questions": {
      GET: () => {
        try {
          return new Response(JSON.stringify(apiData.questions), {
            headers: JSON_HEADERS,
          });
        } catch (error) {
          console.error("Error serving /api/questions:", error);
          return errorResponse("Failed to serialize questions");
        }
      },
    },

    "/api/health": {
      GET: () => {
        return new Response(
          JSON.stringify({
            status: "ok",
            resultsCount: apiData.results.length,
            modelsCount: apiData.models.length,
          }),
          { headers: JSON_HEADERS }
        );
      },
    },
  },

  // Handle 404s
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return errorResponse(`Endpoint '${url.pathname}' not found`, 404);
    }
    // Return index.html for client-side routing
    return new Response(Bun.file("web/index.html"));
  },

  development: {
    hmr: true,
    console: true,
  },

  error(error) {
    console.error("Server error:", error);
    return errorResponse("Internal server error");
  },
});

console.log(`TMG Bench Web UI running at http://localhost:${server.port}`);
