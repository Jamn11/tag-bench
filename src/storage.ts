import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import type { BenchmarkResult } from "./types";

const RESULTS_DIR = "./results";

export async function ensureResultsDir(): Promise<void> {
  if (!existsSync(RESULTS_DIR)) {
    await mkdir(RESULTS_DIR, { recursive: true });
  }
}

function getResultPath(modelId: string): string {
  return `${RESULTS_DIR}/${modelId}.json`;
}

export async function saveResult(modelId: string, result: BenchmarkResult): Promise<void> {
  await ensureResultsDir();
  await Bun.write(getResultPath(modelId), JSON.stringify(result, null, 2));
}

export async function loadResult(modelId: string): Promise<BenchmarkResult | null> {
  const path = getResultPath(modelId);
  if (!existsSync(path)) {
    return null;
  }
  return Bun.file(path).json();
}

export async function hasResult(modelId: string): Promise<boolean> {
  return existsSync(getResultPath(modelId));
}

export async function loadAllResults(): Promise<Map<string, BenchmarkResult>> {
  await ensureResultsDir();
  const results = new Map<string, BenchmarkResult>();

  const files = await Array.fromAsync(new Bun.Glob("*.json").scan(RESULTS_DIR));

  for (const file of files) {
    const modelId = file.replace(".json", "");
    const result = await Bun.file(`${RESULTS_DIR}/${file}`).json();
    results.set(modelId, result);
  }

  return results;
}

export async function deleteResult(modelId: string): Promise<void> {
  const path = getResultPath(modelId);
  if (existsSync(path)) {
    await Bun.write(path, ""); // Clear file
    const { unlink } = await import("node:fs/promises");
    await unlink(path);
  }
}
