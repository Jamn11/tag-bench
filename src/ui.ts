import type { BenchmarkResult, SectionResult } from "./types";
import type { ModelConfig } from "./models";
import type { ProgressInfo } from "./benchmark";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

// Box drawing characters
const box = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  teeRight: "├",
  teeLeft: "┤",
  teeDown: "┬",
  teeUp: "┴",
  cross: "┼",
};

export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export function scoreColor(score: number): string {
  if (score >= 0.8) return colors.green;
  if (score >= 0.5) return colors.yellow;
  return colors.red;
}

export function formatScore(score: number): string {
  const pct = (score * 100).toFixed(1);
  return `${scoreColor(score)}${pct.padStart(5)}%${colors.reset}`;
}

export function formatScoreCompact(score: number): string {
  const pct = Math.round(score * 100);
  return `${scoreColor(score)}${pct}%${colors.reset}`;
}

export function progressBar(progress: number, width: number = 20): string {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${scoreColor(progress)}${bar}${colors.reset}`;
}

function padCenter(text: string, width: number): string {
  const visibleLength = text.replace(/\x1b\[[0-9;]*m/g, "").length;
  const padding = width - visibleLength;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}

function padRight(text: string, width: number): string {
  const visibleLength = text.replace(/\x1b\[[0-9;]*m/g, "").length;
  return text + " ".repeat(Math.max(0, width - visibleLength));
}

function padLeft(text: string, width: number): string {
  const visibleLength = text.replace(/\x1b\[[0-9;]*m/g, "").length;
  return " ".repeat(Math.max(0, width - visibleLength)) + text;
}

export function printHeader(title: string): void {
  const width = 60;
  const line = box.horizontal.repeat(width - 2);
  console.log();
  console.log(`${colors.cyan}${box.topLeft}${line}${box.topRight}${colors.reset}`);
  console.log(`${colors.cyan}${box.vertical}${colors.reset}${padCenter(colorize(title, "bold"), width - 2)}${colors.cyan}${box.vertical}${colors.reset}`);
  console.log(`${colors.cyan}${box.bottomLeft}${line}${box.bottomRight}${colors.reset}`);
  console.log();
}

export function printSubheader(text: string): void {
  console.log(`${colors.cyan}▸${colors.reset} ${colors.bold}${text}${colors.reset}`);
}

export function printModelStatus(
  model: ModelConfig,
  status: "pending" | "running" | "complete" | "skipped",
  score?: number,
  time?: number
): void {
  const statusIcons = {
    pending: colorize("○", "gray"),
    running: colorize("◉", "yellow"),
    complete: colorize("●", "green"),
    skipped: colorize("○", "blue"),
  };

  let line = `  ${statusIcons[status]} ${padRight(model.name, 22)}`;

  if (status === "complete" && score !== undefined) {
    line += ` ${formatScore(score)}`;
    if (time !== undefined) {
      line += ` ${colors.gray}(${(time / 1000).toFixed(1)}s)${colors.reset}`;
    }
  } else if (status === "running") {
    line += ` ${colors.yellow}running...${colors.reset}`;
  } else if (status === "skipped") {
    line += ` ${colors.blue}(cached)${colors.reset}`;
  }

  console.log(line);
}

// Valid section types (after removing quotes and multiple-choice)
const VALID_SECTIONS = ["short-answer", "lists"];

export function printStatsGrid(
  results: Map<string, BenchmarkResult>,
  models: ModelConfig[]
): void {
  // Get all sections from any result
  const sampleResult = results.values().next().value;
  if (!sampleResult) {
    console.log(colorize("  No results to display", "gray"));
    return;
  }

  // Filter to only valid sections (ignore deprecated quotes/multiple-choice from old results)
  const sections = sampleResult.sections
    .map((s: SectionResult) => s.section)
    .filter((s: string) => VALID_SECTIONS.includes(s));
  const colWidths = {
    model: 20,
    questions: 5,
    section: 12,
    overall: 10,
  };

  // Header row
  let headerLine = `${colors.dim}${box.vertical}${colors.reset} `;
  headerLine += padRight(colorize("Model", "bold"), colWidths.model);
  headerLine += `${colors.dim}${box.vertical}${colors.reset}`;
  headerLine += padCenter("Q", colWidths.questions);
  headerLine += `${colors.dim}${box.vertical}${colors.reset}`;

  for (const section of sections) {
    headerLine += padCenter(section.slice(0, colWidths.section - 2), colWidths.section);
    headerLine += `${colors.dim}${box.vertical}${colors.reset}`;
  }
  headerLine += padCenter(colorize("Overall", "bold"), colWidths.overall);
  headerLine += `${colors.dim}${box.vertical}${colors.reset}`;

  // Top border
  console.log();
  console.log(
    `${colors.dim}${box.topLeft}${box.horizontal.repeat(colWidths.model + 1)}${box.teeDown}${box.horizontal.repeat(colWidths.questions)}${box.teeDown}${sections.map(() => box.horizontal.repeat(colWidths.section) + box.teeDown).join("")}${box.horizontal.repeat(colWidths.overall)}${box.topRight}${colors.reset}`
  );
  console.log(headerLine);
  console.log(
    `${colors.dim}${box.teeRight}${box.horizontal.repeat(colWidths.model + 1)}${box.cross}${box.horizontal.repeat(colWidths.questions)}${box.cross}${sections.map(() => box.horizontal.repeat(colWidths.section) + box.cross).join("")}${box.horizontal.repeat(colWidths.overall)}${box.teeLeft}${colors.reset}`
  );

  // Data rows
  for (const model of models) {
    const result = results.get(model.id);

    let row = `${colors.dim}${box.vertical}${colors.reset} `;
    row += padRight(model.name.slice(0, colWidths.model - 2), colWidths.model);
    row += `${colors.dim}${box.vertical}${colors.reset}`;

    if (result) {
      // Only count questions from valid sections
      const validSections = result.sections.filter((s) => VALID_SECTIONS.includes(s.section));
      const totalQuestions = validSections.reduce((sum, s) => sum + s.totalQuestions, 0);
      row += padCenter(String(totalQuestions), colWidths.questions);
      row += `${colors.dim}${box.vertical}${colors.reset}`;

      for (const section of sections) {
        const sectionResult = result.sections.find((s) => s.section === section);
        const score = sectionResult?.averageScore ?? 0;
        row += padCenter(formatScoreCompact(score), colWidths.section);
        row += `${colors.dim}${box.vertical}${colors.reset}`;
      }
      // Recalculate overall score from valid sections only
      const totalScore = validSections.reduce((sum, s) => sum + s.averageScore * s.totalQuestions, 0);
      const overallScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;
      row += padCenter(formatScoreCompact(overallScore), colWidths.overall);
    } else {
      row += padCenter(colorize("—", "gray"), colWidths.questions);
      row += `${colors.dim}${box.vertical}${colors.reset}`;

      for (const section of sections) {
        row += padCenter(colorize("—", "gray"), colWidths.section);
        row += `${colors.dim}${box.vertical}${colors.reset}`;
      }
      row += padCenter(colorize("—", "gray"), colWidths.overall);
    }
    row += `${colors.dim}${box.vertical}${colors.reset}`;

    console.log(row);
  }

  // Bottom border
  console.log(
    `${colors.dim}${box.bottomLeft}${box.horizontal.repeat(colWidths.model + 1)}${box.teeUp}${box.horizontal.repeat(colWidths.questions)}${box.teeUp}${sections.map(() => box.horizontal.repeat(colWidths.section) + box.teeUp).join("")}${box.horizontal.repeat(colWidths.overall)}${box.bottomRight}${colors.reset}`
  );
  console.log();
}

export function printRunProgress(
  models: ModelConfig[],
  completed: Set<string>,
  running: Set<string>,
  results: Map<string, BenchmarkResult>,
  skipped: Set<string>
): void {
  console.clear();
  printHeader("TMG Bench - Running");

  const total = models.length;
  const done = completed.size;
  const progress = done / total;

  console.log(`  Progress: ${progressBar(progress, 30)} ${done}/${total}`);
  console.log();

  for (const model of models) {
    let status: "pending" | "running" | "complete" | "skipped";
    if (skipped.has(model.id)) {
      status = "skipped";
    } else if (completed.has(model.id)) {
      status = "complete";
    } else if (running.has(model.id)) {
      status = "running";
    } else {
      status = "pending";
    }

    const result = results.get(model.id);
    printModelStatus(
      model,
      status,
      result?.overallScore,
      result?.totalLatencyMs
    );
  }

  console.log();
}

export function printFinalSummary(
  results: Map<string, BenchmarkResult>,
  models: ModelConfig[]
): void {
  printHeader("TMG Bench - Results");

  // Sort by overall score
  const sortedModels = [...models]
    .filter((m) => results.has(m.id))
    .sort((a, b) => {
      const aScore = results.get(a.id)?.overallScore ?? 0;
      const bScore = results.get(b.id)?.overallScore ?? 0;
      return bScore - aScore;
    });

  printStatsGrid(results, sortedModels);
}

export function printDetailedResults(model: ModelConfig, result: BenchmarkResult): void {
  printHeader(`Detailed Results: ${model.name}`);

  // Filter to valid sections only
  const validSections = result.sections.filter((s) => VALID_SECTIONS.includes(s.section));
  const totalQuestions = validSections.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalScore = validSections.reduce((sum, s) => sum + s.averageScore * s.totalQuestions, 0);
  const overallScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

  console.log(`  ${colors.bold}Overall Score:${colors.reset} ${formatScore(overallScore)}`);
  console.log(`  ${colors.bold}Total Time:${colors.reset}    ${(result.totalLatencyMs / 1000).toFixed(1)}s`);
  console.log(`  ${colors.bold}Timestamp:${colors.reset}     ${result.timestamp}`);
  console.log();

  for (const section of validSections) {
    // Section header
    const sectionLine = box.horizontal.repeat(56);
    console.log(`${colors.cyan}${box.topLeft}${sectionLine}${box.topRight}${colors.reset}`);
    console.log(
      `${colors.cyan}${box.vertical}${colors.reset} ${colors.bold}${section.section.padEnd(40)}${colors.reset} ${formatScore(section.averageScore).padStart(7)} (${section.correctCount}/${section.totalQuestions}) ${colors.cyan}${box.vertical}${colors.reset}`
    );
    console.log(`${colors.cyan}${box.bottomLeft}${sectionLine}${box.bottomRight}${colors.reset}`);
    console.log();

    for (const r of section.results) {
      // Question header with result icon
      const icon = r.timedOut
        ? `${colors.magenta}⏱ TIMEOUT${colors.reset}`
        : r.correct
          ? `${colors.green}✓ CORRECT${colors.reset}`
          : `${colors.red}✗ WRONG${colors.reset}`;

      const scoreInfo = r.score > 0 && r.score < 1
        ? ` ${colors.yellow}(${(r.score * 100).toFixed(0)}% partial)${colors.reset}`
        : "";

      console.log(`  ${colors.bold}${r.questionId}${colors.reset} ${icon}${scoreInfo} ${colors.dim}(${r.latencyMs.toFixed(0)}ms)${colors.reset}`);

      // Model response
      console.log(`  ${colors.dim}┌─ Model Response:${colors.reset}`);
      const responseLines = r.modelResponse.split("\n");
      for (const line of responseLines.slice(0, 10)) {
        const truncated = line.length > 70 ? line.slice(0, 67) + "..." : line;
        console.log(`  ${colors.dim}│${colors.reset}  ${truncated}`);
      }
      if (responseLines.length > 10) {
        console.log(`  ${colors.dim}│${colors.reset}  ${colors.dim}... (${responseLines.length - 10} more lines)${colors.reset}`);
      }

      // Expected answer
      console.log(`  ${colors.dim}├─ Expected:${colors.reset}`);
      const expectedLines = r.expectedAnswer.split("\n");
      for (const line of expectedLines.slice(0, 5)) {
        const truncated = line.length > 70 ? line.slice(0, 67) + "..." : line;
        console.log(`  ${colors.dim}│${colors.reset}  ${colors.cyan}${truncated}${colors.reset}`);
      }
      if (expectedLines.length > 5) {
        console.log(`  ${colors.dim}│${colors.reset}  ${colors.dim}... (${expectedLines.length - 5} more lines)${colors.reset}`);
      }

      console.log(`  ${colors.dim}└${"─".repeat(40)}${colors.reset}`);
      console.log();
    }
  }
}

export function printSingleResult(model: ModelConfig, result: BenchmarkResult): void {
  printHeader(`Results: ${model.name}`);

  // Filter to valid sections only
  const validSections = result.sections.filter((s) => VALID_SECTIONS.includes(s.section));
  const totalQuestions = validSections.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalScore = validSections.reduce((sum, s) => sum + s.averageScore * s.totalQuestions, 0);
  const overallScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

  console.log(`  ${colors.bold}Overall Score:${colors.reset} ${formatScore(overallScore)}`);
  console.log(`  ${colors.bold}Total Time:${colors.reset}    ${(result.totalLatencyMs / 1000).toFixed(1)}s`);
  console.log(`  ${colors.bold}Timestamp:${colors.reset}     ${result.timestamp}`);
  console.log();

  printSubheader("Section Breakdown");
  console.log();

  for (const section of validSections) {
    const pct = formatScore(section.averageScore);
    console.log(
      `  ${padRight(section.section, 18)} ${pct}  (${section.correctCount}/${section.totalQuestions} correct)`
    );
  }

  console.log();
}

// Track recent results for the live progress display
interface RecentResult {
  questionId: string;
  correct: boolean;
  score: number;
  latencyMs: number;
  timedOut?: boolean;
}

export function printLiveProgress(
  model: ModelConfig,
  progress: ProgressInfo,
  recentResults: RecentResult[]
): void {
  // Move cursor to top and clear
  process.stdout.write("\x1b[H\x1b[2J");

  // Header
  const width = 60;
  const line = box.horizontal.repeat(width - 2);
  console.log(`${colors.cyan}${box.topLeft}${line}${box.topRight}${colors.reset}`);
  console.log(`${colors.cyan}${box.vertical}${colors.reset}${padCenter(colorize(`Running: ${model.name}`, "bold"), width - 2)}${colors.cyan}${box.vertical}${colors.reset}`);
  console.log(`${colors.cyan}${box.bottomLeft}${line}${box.bottomRight}${colors.reset}`);
  console.log();

  // Overall progress
  const overallProgress = progress.completedQuestionsOverall / progress.totalQuestionsOverall;
  console.log(`  ${colorize("Overall:", "bold")}  ${progressBar(overallProgress, 25)} ${progress.completedQuestionsOverall}/${progress.totalQuestionsOverall} questions`);

  // Show in-flight indicator
  if (progress.questionsInFlight > 0) {
    console.log(`            ${colors.yellow}⟳ ${progress.questionsInFlight} in flight${colors.reset}`);
  }
  console.log();

  // Section info
  console.log(`  ${colorize("Section:", "bold")}  ${colors.cyan}${progress.currentSection}${colors.reset} (${progress.sectionIndex + 1}/${progress.totalSections})`);
  console.log();

  // Latest result
  if (progress.status === "scored" && progress.lastResult) {
    const icon = progress.lastResult.timedOut
      ? `${colors.magenta}⏱${colors.reset}`
      : progress.lastResult.correct ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const scoreStr = progress.lastResult.timedOut ? "TIMEOUT" : `${(progress.lastResult.score * 100).toFixed(0)}%`;
    console.log(`  ${colorize("Latest:", "bold")}   ${icon} ${progress.currentQuestionId} ${colors.dim}(${scoreStr}, ${progress.lastResult.latencyMs.toFixed(0)}ms)${colors.reset}`);
  } else {
    console.log(`  ${colorize("Latest:", "bold")}   ${colors.yellow}⟳${colors.reset} ${progress.currentQuestionId} ${colors.dim}running...${colors.reset}`);
  }
  console.log();

  // Recent results
  if (recentResults.length > 0) {
    console.log(`  ${colorize("Recent:", "dim")}`);
    const displayResults = recentResults.slice(-8); // Show last 8
    for (const r of displayResults) {
      const icon = r.timedOut
        ? `${colors.magenta}⏱${colors.reset}`
        : r.correct ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      const scoreStr = r.timedOut
        ? ` ${colors.magenta}TIMEOUT${colors.reset}`
        : r.score < 1 && r.score > 0 ? ` ${colors.yellow}(${(r.score * 100).toFixed(0)}%)${colors.reset}` : "";
      console.log(`    ${icon} ${r.questionId}${scoreStr} ${colors.dim}${r.latencyMs.toFixed(0)}ms${colors.reset}`);
    }
  }

  console.log();
}
