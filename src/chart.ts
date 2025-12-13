import { createCanvas } from "canvas";
import { writeFileSync } from "node:fs";
import type { BenchmarkResult } from "./types";
import type { ModelConfig } from "./models";

// Valid section types (after removing quotes and multiple-choice)
const VALID_SECTIONS = ["short-answer", "lists"];

interface ChartData {
  name: string;
  score: number;
  questionCount: number;
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return "#22c55e"; // green
  if (score >= 0.5) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export function generateBarChart(
  results: Map<string, BenchmarkResult>,
  models: ModelConfig[],
  outputPath: string
): void {
  // Prepare data - sort by score descending
  const data: ChartData[] = models
    .filter((m) => results.has(m.id))
    .map((m) => {
      const result = results.get(m.id)!;
      // Filter to valid sections only
      const validSections = result.sections.filter((s) => VALID_SECTIONS.includes(s.section));
      const questionCount = validSections.reduce((sum, s) => sum + s.totalQuestions, 0);
      const totalScore = validSections.reduce((sum, s) => sum + s.averageScore * s.totalQuestions, 0);
      const overallScore = questionCount > 0 ? totalScore / questionCount : 0;
      return {
        name: m.name,
        score: overallScore,
        questionCount,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (data.length === 0) {
    throw new Error("No results to chart");
  }

  // Chart dimensions
  const barHeight = 40;
  const barGap = 12;
  const labelWidth = 220;
  const scoreWidth = 80;
  const chartWidth = 500;
  const padding = 40;
  const titleHeight = 60;
  const footerHeight = 40;

  const width = padding + labelWidth + chartWidth + scoreWidth + padding;
  const height = titleHeight + padding + data.length * (barHeight + barGap) - barGap + padding + footerHeight;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TMG Bench Results", width / 2, titleHeight - 10);

  // Draw bars
  const startY = titleHeight + padding;
  const barStartX = padding + labelWidth;

  data.forEach((item, index) => {
    const y = startY + index * (barHeight + barGap);
    const barWidth = item.score * chartWidth;

    // Model name
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(item.name, barStartX - 15, y + barHeight / 2);

    // Bar background
    ctx.fillStyle = "#2d2d44";
    ctx.beginPath();
    ctx.roundRect(barStartX, y, chartWidth, barHeight, 6);
    ctx.fill();

    // Bar fill
    if (barWidth > 0) {
      ctx.fillStyle = getScoreColor(item.score);
      ctx.beginPath();
      ctx.roundRect(barStartX, y, Math.max(barWidth, 12), barHeight, 6);
      ctx.fill();
    }

    // Score percentage
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `${(item.score * 100).toFixed(1)}%`,
      barStartX + chartWidth + 15,
      y + barHeight / 2
    );

    // Question count badge
    ctx.fillStyle = "#4a4a6a";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    const qText = `${item.questionCount}q`;
    const qWidth = ctx.measureText(qText).width + 12;
    ctx.beginPath();
    ctx.roundRect(barStartX + 8, y + 8, qWidth, 24, 4);
    ctx.fill();
    ctx.fillStyle = "#b0b0b0";
    ctx.fillText(qText, barStartX + 14, y + 24);
  });

  // Footer
  ctx.fillStyle = "#666666";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `Generated ${new Date().toLocaleDateString()} • The Mountain Goats AI Knowledge Benchmark`,
    width / 2,
    height - 15
  );

  // Save to file
  const buffer = canvas.toBuffer("image/png");
  writeFileSync(outputPath, buffer);
}
