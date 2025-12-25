import { runBenchmarkForModel, type ProgressInfo } from "./src/benchmark";
import { MODELS, getModelById, getAllModelIds, type ModelConfig } from "./src/models";
import { saveResult, loadResult, hasResult, loadAllResults } from "./src/storage";
import {
  printHeader,
  printSubheader,
  printModelStatus,
  printStatsGrid,
  printFinalSummary,
  printSingleResult,
  printDetailedResults,
  printRunProgress,
  printLiveProgress,
  colorize,
  formatScore,
} from "./src/ui";
import type { BenchmarkResult } from "./src/types";

const QUESTIONS_DIR = "./questions";

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENROUTER_API_KEY environment variable is not set");
    console.error("Set it with: export OPENROUTER_API_KEY=your_key_here");
    process.exit(1);
  }
  return apiKey;
}

function printHelp(): void {
  console.log(`
${colorize("TMG Bench", "bold")} - The Mountain Goats AI Knowledge Benchmark

${colorize("Usage:", "cyan")}
  bun run index.ts <command> [options]

${colorize("Commands:", "cyan")}
  run <model>       Run benchmark for a specific model (skips if cached)
  run all           Run benchmark for all models without cached results
  force <model>     Force run benchmark even if cached results exist
  force all         Force run all models
  results <model>   Show detailed results for a model (each question)
  stats             Show results grid for all models
  bar [filename]    Generate bar chart PNG (default: tmg-bench-results.png)
  export            Export all results to CSV
  models            List all available models
  test              Quick API connection test

${colorize("Options:", "cyan")}
  --parallel, -p    Run models in parallel (for 'run all')
  --help            Show this help message

${colorize("Models:", "cyan")}
${MODELS.map((m) => `  ${m.id.padEnd(20)} ${m.name}`).join("\n")}

${colorize("Examples:", "cyan")}
  bun run index.ts run grok-4.1-fast
  bun run index.ts run all --parallel
  bun run index.ts force claude-sonnet-4
  bun run index.ts results claude-sonnet-4
  bun run index.ts stats
  bun run index.ts export > results.csv
`);
}

function printModels(): void {
  printHeader("Available Models");

  const byProvider = new Map<string, ModelConfig[]>();
  for (const model of MODELS) {
    const list = byProvider.get(model.provider) || [];
    list.push(model);
    byProvider.set(model.provider, list);
  }

  for (const [provider, models] of byProvider) {
    printSubheader(provider);
    for (const model of models) {
      const costIcon =
        model.costTier === "cheap" ? "💚" : model.costTier === "medium" ? "💛" : "💰";
      console.log(`  ${costIcon} ${model.id.padEnd(20)} ${colorize(model.name, "dim")}`);
    }
    console.log();
  }
}

async function runSingleModel(
  model: ModelConfig,
  force: boolean = false
): Promise<BenchmarkResult | null> {
  const apiKey = getApiKey();

  // Check for cached results
  if (!force && (await hasResult(model.id))) {
    const cached = await loadResult(model.id);
    if (cached) {
      console.log(
        `  ${colorize("○", "blue")} ${model.name} - using cached result (${formatScore(cached.overallScore)})`
      );
      return cached;
    }
  }

  // Track recent results for display
  const recentResults: Array<{
    questionId: string;
    correct: boolean;
    score: number;
    latencyMs: number;
  }> = [];

  try {
    const result = await runBenchmarkForModel(QUESTIONS_DIR, model, apiKey, (progress) => {
      // Update display on each progress event
      printLiveProgress(model, progress, recentResults);

      // Add to recent results when scored
      if (progress.status === "scored" && progress.lastResult) {
        recentResults.push({
          questionId: progress.currentQuestionId,
          correct: progress.lastResult.correct,
          score: progress.lastResult.score,
          latencyMs: progress.lastResult.latencyMs,
        });
      }
    });

    await saveResult(model.id, result);

    // Clear and show final result
    console.clear();
    printSingleResult(model, result);
    return result;
  } catch (error) {
    console.clear();
    console.error(`  ${colorize("✗", "red")} Error running ${model.name}:`, error);
    return null;
  }
}

async function runMultipleModels(
  models: ModelConfig[],
  force: boolean = false,
  parallel: boolean = false
): Promise<void> {
  const apiKey = getApiKey();
  const results = new Map<string, BenchmarkResult>();
  const completed = new Set<string>();
  const running = new Set<string>();
  const skipped = new Set<string>();

  // Check which models need to run
  const modelsToRun: ModelConfig[] = [];
  for (const model of models) {
    if (!force && (await hasResult(model.id))) {
      const cached = await loadResult(model.id);
      if (cached) {
        results.set(model.id, cached);
        skipped.add(model.id);
        completed.add(model.id);
      }
    } else {
      modelsToRun.push(model);
    }
  }

  if (modelsToRun.length === 0) {
    printHeader("TMG Bench - All Cached");
    console.log("  All models have cached results. Use 'force all' to re-run.");
    console.log();
    printFinalSummary(results, models);
    return;
  }

  // Initial render
  printRunProgress(models, completed, running, results, skipped);

  const runModel = async (model: ModelConfig): Promise<void> => {
    running.add(model.id);
    printRunProgress(models, completed, running, results, skipped);

    try {
      const result = await runBenchmarkForModel(QUESTIONS_DIR, model, apiKey);
      await saveResult(model.id, result);
      results.set(model.id, result);
    } catch (error) {
      console.error(`Error running ${model.name}:`, error);
    } finally {
      running.delete(model.id);
      completed.add(model.id);
      printRunProgress(models, completed, running, results, skipped);
    }
  };

  if (parallel) {
    // Run all in parallel
    await Promise.all(modelsToRun.map(runModel));
  } else {
    // Run sequentially
    for (const model of modelsToRun) {
      await runModel(model);
    }
  }

  // Final summary
  console.clear();
  printFinalSummary(results, models);
}

async function showStats(): Promise<void> {
  const results = await loadAllResults();

  if (results.size === 0) {
    printHeader("TMG Bench - Stats");
    console.log("  No results found. Run some benchmarks first!");
    console.log("  Try: bun run index.ts run grok-4.1-fast");
    console.log();
    return;
  }

  printFinalSummary(results, MODELS);
}

async function exportCsv(): Promise<void> {
  const results = await loadAllResults();

  if (results.size === 0) {
    console.error("No results to export");
    process.exit(1);
  }

  // Get all sections
  const sampleResult = results.values().next().value!;
  const sections = sampleResult.sections.map((s) => s.section);

  // CSV header
  const headers = ["Model", "Provider", ...sections, "Overall", "Time (s)", "Timestamp"];
  console.log(headers.join(","));

  // CSV rows
  for (const model of MODELS) {
    const result = results.get(model.id);
    if (!result) continue;

    const sectionScores = sections.map((section) => {
      const s = result.sections.find((sec) => sec.section === section);
      return s ? (s.averageScore * 100).toFixed(1) : "";
    });

    const row = [
      model.name,
      model.provider,
      ...sectionScores,
      (result.overallScore * 100).toFixed(1),
      (result.totalLatencyMs / 1000).toFixed(1),
      result.timestamp,
    ];

    console.log(row.map((v) => `"${v}"`).join(","));
  }
}

async function quickTest(): Promise<void> {
  const apiKey = getApiKey();
  const model = MODELS[0]!; // grok-4.1-fast

  printHeader("API Connection Test");
  console.log(`  Testing with: ${model.name}`);
  console.log();

  try {
    const { askQuestion } = await import("./src/api");
    const { answer, latencyMs } = await askQuestion(
      model.code,
      "Who is the lead singer of The Mountain Goats? Answer in one word.",
      apiKey
    );

    console.log(`  ${colorize("✓", "green")} Connection successful!`);
    console.log(`  Response: ${answer}`);
    console.log(`  Latency: ${latencyMs.toFixed(0)}ms`);
    console.log();
  } catch (error) {
    console.error(`  ${colorize("✗", "red")} Connection failed:`, error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const parallel = args.includes("--parallel") || args.includes("-p");
  const filteredArgs = args.filter((a) => a !== "--parallel" && a !== "-p");
  const command = filteredArgs[0];
  const target = filteredArgs[1];

  switch (command) {
    case "run":
      if (!target) {
        console.error("Error: Please specify a model or 'all'");
        console.error("Usage: bun run index.ts run <model|all>");
        process.exit(1);
      }

      if (target === "all") {
        await runMultipleModels(MODELS, false, parallel);
      } else {
        const model = getModelById(target);
        if (!model) {
          console.error(`Error: Unknown model '${target}'`);
          console.error("Run 'bun run index.ts models' to see available models");
          process.exit(1);
        }
        await runSingleModel(model, false);
      }
      break;

    case "force":
      if (!target) {
        console.error("Error: Please specify a model or 'all'");
        console.error("Usage: bun run index.ts force <model|all>");
        process.exit(1);
      }

      if (target === "all") {
        await runMultipleModels(MODELS, true, parallel);
      } else {
        const model = getModelById(target);
        if (!model) {
          console.error(`Error: Unknown model '${target}'`);
          process.exit(1);
        }
        await runSingleModel(model, true);
      }
      break;

    case "results":
      if (!target) {
        console.error("Error: Please specify a model");
        console.error("Usage: bun run index.ts results <model>");
        process.exit(1);
      }
      {
        const model = getModelById(target);
        if (!model) {
          console.error(`Error: Unknown model '${target}'`);
          console.error("Run 'bun run index.ts models' to see available models");
          process.exit(1);
        }
        const result = await loadResult(model.id);
        if (!result) {
          console.error(`Error: No results found for '${target}'`);
          console.error("Run the benchmark first: bun run index.ts run " + target);
          process.exit(1);
        }
        printDetailedResults(model, result);
      }
      break;

    case "stats":
      await showStats();
      break;

    case "bar":
      {
        const results = await loadAllResults();
        if (results.size === 0) {
          console.error("No results found. Run some benchmarks first!");
          process.exit(1);
        }
        const filename = target || "tmg-bench-results.png";
        const outputPath = filename.endsWith(".png") ? filename : `${filename}.png`;
        const { generateBarChart } = await import("./src/chart");
        generateBarChart(results, MODELS, outputPath);
        console.log(`${colorize("✓", "green")} Bar chart saved to ${colorize(outputPath, "cyan")}`);
      }
      break;

    case "export":
      await exportCsv();
      break;

    case "models":
      printModels();
      break;

    case "test":
      await quickTest();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
