import { readdir } from "node:fs/promises";
import { askQuestion } from "./api";
import { scoreQuestion, formatExpectedAnswer } from "./scorer";
import type { Question, QuestionResult, SectionResult, BenchmarkResult } from "./types";
import type { ModelConfig } from "./models";

// Default concurrency for parallel requests
const DEFAULT_CONCURRENCY = 35;

export interface QuestionFile {
  section: string;
  description: string;
  systemPrompt: string;
  questions: Question[];
}

export interface ProgressInfo {
  currentSection: string;
  sectionIndex: number;
  totalSections: number;
  questionsInFlight: number;
  totalQuestionsInSection: number;
  totalQuestionsOverall: number;
  completedQuestionsOverall: number;
  currentQuestionId: string;
  status: "starting" | "running" | "scored";
  lastResult?: {
    correct: boolean;
    score: number;
    latencyMs: number;
    timedOut?: boolean;
  };
}

// Flattened question with section context
interface FlattenedQuestion {
  question: Question;
  section: QuestionFile;
  sectionIndex: number;
}

// Simple concurrent task runner with limit
async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await fn(item, index);
      }
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

export async function loadQuestions(questionsDir: string): Promise<QuestionFile[]> {
  const files = await readdir(questionsDir);
  // Skip files starting with underscore or "claude_" (work in progress)
  const jsonFiles = files.filter(
    (f) => f.endsWith(".json") && !f.startsWith("_") && !f.startsWith("claude_")
  );

  const questionFiles: QuestionFile[] = [];

  for (const file of jsonFiles) {
    const content = await Bun.file(`${questionsDir}/${file}`).json();
    questionFiles.push(content as QuestionFile);
  }

  return questionFiles;
}

export async function runBenchmarkForModel(
  questionsDir: string,
  model: ModelConfig,
  apiKey: string,
  onProgress?: (progress: ProgressInfo) => void,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<BenchmarkResult> {
  const questionFiles = await loadQuestions(questionsDir);

  // Flatten all questions across all sections
  const flattenedQuestions: FlattenedQuestion[] = [];
  for (let sectionIndex = 0; sectionIndex < questionFiles.length; sectionIndex++) {
    const section = questionFiles[sectionIndex];
    if (!section) continue;
    for (const question of section.questions) {
      flattenedQuestions.push({ question, section, sectionIndex });
    }
  }

  const totalSections = questionFiles.length;
  const totalQuestionsOverall = flattenedQuestions.length;
  let completedQuestionsOverall = 0;
  let questionsInFlight = 0;

  // Run ALL questions in parallel across all sections
  const allResults = await runWithConcurrency(
    flattenedQuestions,
    async ({ question, section, sectionIndex }) => {
      questionsInFlight++;

      // Report starting
      onProgress?.({
        currentSection: section.section,
        sectionIndex,
        totalSections,
        questionsInFlight,
        totalQuestionsInSection: section.questions.length,
        totalQuestionsOverall,
        completedQuestionsOverall,
        currentQuestionId: question.id,
        status: "running",
      });

      const { answer, latencyMs, timedOut } = await askQuestion(
        model.code,
        question.question,
        apiKey,
        section.systemPrompt,
        model.reasoningBudget,
        model.reasoningEffort
      );

      // If timed out, count as failure with score 0
      const { correct, score } = timedOut
        ? { correct: false, score: 0 }
        : scoreQuestion(answer, question);

      const result: QuestionResult & { sectionName: string } = {
        questionId: question.id,
        type: question.type,
        correct,
        score,
        modelResponse: timedOut ? "[TIMEOUT]" : answer,
        expectedAnswer: formatExpectedAnswer(question),
        latencyMs,
        timedOut,
        sectionName: section.section,
      };

      questionsInFlight--;
      completedQuestionsOverall++;

      // Report scored
      onProgress?.({
        currentSection: section.section,
        sectionIndex,
        totalSections,
        questionsInFlight,
        totalQuestionsInSection: section.questions.length,
        totalQuestionsOverall,
        completedQuestionsOverall,
        currentQuestionId: question.id,
        status: "scored",
        lastResult: { correct, score, latencyMs, timedOut },
      });

      return result;
    },
    concurrency
  );

  // Group results back by section
  const resultsBySection = new Map<string, QuestionResult[]>();
  for (const section of questionFiles) {
    resultsBySection.set(section.section, []);
  }
  for (const result of allResults) {
    const { sectionName, ...questionResult } = result;
    resultsBySection.get(sectionName)!.push(questionResult);
  }

  // Build section results
  const sections: SectionResult[] = [];
  let totalLatencyMs = 0;

  for (const section of questionFiles) {
    const results = resultsBySection.get(section.section)!;
    const correctCount = results.filter((r) => r.correct).length;
    const averageScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length
        : 0;

    sections.push({
      section: section.section,
      totalQuestions: section.questions.length,
      correctCount,
      averageScore,
      results,
    });

    totalLatencyMs += results.reduce((sum, r) => sum + r.latencyMs, 0);
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.totalQuestions, 0);
  const overallScore =
    totalQuestions > 0
      ? sections.reduce((sum, s) => sum + s.averageScore * s.totalQuestions, 0) / totalQuestions
      : 0;

  return {
    model: model.code,
    timestamp: new Date().toISOString(),
    sections,
    overallScore,
    totalLatencyMs,
  };
}
