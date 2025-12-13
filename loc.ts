import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const IGNORE_DIRS = ["node_modules", ".git", "results"];
const EXTENSIONS = [".ts", ".json"];

interface FileStats {
  path: string;
  lines: number;
}

async function countLines(filePath: string): Promise<number> {
  const content = await Bun.file(filePath).text();
  return content.split("\n").length;
}

async function walkDir(dir: string): Promise<FileStats[]> {
  const results: FileStats[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        results.push(...(await walkDir(fullPath)));
      }
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      if (EXTENSIONS.includes(ext)) {
        const lines = await countLines(fullPath);
        results.push({ path: fullPath, lines });
      }
    }
  }

  return results;
}

async function main() {
  const files = await walkDir(".");

  // Group by extension
  const byExt = new Map<string, FileStats[]>();
  for (const file of files) {
    const ext = file.path.slice(file.path.lastIndexOf("."));
    const list = byExt.get(ext) || [];
    list.push(file);
    byExt.set(ext, list);
  }

  console.log("\n\x1b[1mLines of Code - TMG Bench\x1b[0m\n");

  let totalLines = 0;
  let totalFiles = 0;

  // TypeScript files
  const tsFiles = byExt.get(".ts") || [];
  if (tsFiles.length > 0) {
    console.log("\x1b[36m── TypeScript ──\x1b[0m");
    tsFiles.sort((a, b) => b.lines - a.lines);
    for (const file of tsFiles) {
      const displayPath = file.path.replace("./", "");
      console.log(`  ${String(file.lines).padStart(5)}  ${displayPath}`);
      totalLines += file.lines;
      totalFiles++;
    }
    const tsTotal = tsFiles.reduce((sum, f) => sum + f.lines, 0);
    console.log(`\x1b[2m  ${String(tsTotal).padStart(5)}  total (${tsFiles.length} files)\x1b[0m`);
    console.log();
  }

  // JSON files (questions only)
  const jsonFiles = (byExt.get(".json") || []).filter(
    (f) => f.path.includes("questions/") && !f.path.includes("node_modules")
  );
  if (jsonFiles.length > 0) {
    console.log("\x1b[36m── Questions (JSON) ──\x1b[0m");
    jsonFiles.sort((a, b) => b.lines - a.lines);
    for (const file of jsonFiles) {
      const displayPath = file.path.replace("./", "");
      console.log(`  ${String(file.lines).padStart(5)}  ${displayPath}`);
      totalLines += file.lines;
      totalFiles++;
    }
    const jsonTotal = jsonFiles.reduce((sum, f) => sum + f.lines, 0);
    console.log(`\x1b[2m  ${String(jsonTotal).padStart(5)}  total (${jsonFiles.length} files)\x1b[0m`);
    console.log();
  }

  // Summary
  console.log("\x1b[1m── Summary ──\x1b[0m");
  console.log(`  ${String(totalFiles).padStart(5)}  files`);
  console.log(`  ${String(totalLines).padStart(5)}  lines\n`);
}

main();
