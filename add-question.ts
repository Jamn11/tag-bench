import * as readline from "node:readline";
import type { QuestionFile } from "./src/benchmark";
import type { ShortAnswerQuestion } from "./src/types";

const QUESTIONS_DIR = "./questions";
const SHORT_ANSWER_FILE = "short-answer.json";

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

// Box drawing
const box = { h: "─", v: "│", tl: "┌", tr: "┐", bl: "└", br: "┘" };

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`  ${c.yellow}?${c.reset} ${question}: `, (answer) => {
      resolve(answer.trim());
    });
  });
}

function printHeader(title: string): void {
  const width = 50;
  const line = box.h.repeat(width - 2);
  console.log();
  console.log(`${c.cyan}${box.tl}${line}${box.tr}${c.reset}`);
  const padding = Math.floor((width - 2 - title.length) / 2);
  console.log(`${c.cyan}${box.v}${c.reset}${" ".repeat(padding)}${c.bold}${title}${c.reset}${" ".repeat(width - 2 - padding - title.length)}${c.cyan}${box.v}${c.reset}`);
  console.log(`${c.cyan}${box.bl}${line}${box.br}${c.reset}`);
  console.log();
}

function printSuccess(msg: string): void {
  console.log(`  ${c.green}✓${c.reset} ${msg}`);
}

function printInfo(msg: string): void {
  console.log(`  ${c.cyan}▸${c.reset} ${msg}`);
}

async function selectOption(question: string, options: string[]): Promise<number> {
  console.log(`  ${c.yellow}?${c.reset} ${question}`);
  options.forEach((opt, i) => {
    console.log(`    ${c.cyan}${i + 1}${c.reset}) ${opt}`);
  });

  while (true) {
    const answer = await ask(`Enter number (1-${options.length})`);
    const num = parseInt(answer);
    if (num >= 1 && num <= options.length) {
      return num - 1;
    }
    console.log(`    ${c.red}Invalid choice. Please enter 1-${options.length}${c.reset}`);
  }
}

async function promptMultiline(question: string): Promise<string[]> {
  console.log(`  ${c.yellow}?${c.reset} ${question}`);
  console.log(`    ${c.dim}(Enter each on a new line, empty line to finish)${c.reset}`);

  const lines: string[] = [];
  while (true) {
    const line = await ask(`  ${c.dim}>${c.reset}`);
    if (line === "") break;
    lines.push(line);
  }
  return lines;
}

async function loadQuestionFile(filename: string): Promise<QuestionFile> {
  const path = `${QUESTIONS_DIR}/${filename}`;
  return Bun.file(path).json();
}

async function saveQuestionFile(filename: string, data: QuestionFile): Promise<void> {
  const path = `${QUESTIONS_DIR}/${filename}`;
  await Bun.write(path, JSON.stringify(data, null, 2));
}

function generateQuestionId(questions: { id: string }[], prefix: string): string {
  const existing = questions.filter(q => q.id.startsWith(prefix));
  const nextNum = existing.length + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

async function addShortAnswer(): Promise<void> {
  printHeader("Add Short Answer Question");

  const data = await loadQuestionFile(SHORT_ANSWER_FILE);
  printInfo(`Current questions in file: ${data.questions.length}`);
  console.log();

  // Get question text
  const questionText = await ask("Question text");
  if (!questionText) {
    console.log(`  ${c.red}Question cannot be empty${c.reset}`);
    return;
  }

  // Get accepted answers
  const acceptedAnswers = await promptMultiline("Accepted answers (variations that should be marked correct)");
  if (acceptedAnswers.length === 0) {
    console.log(`  ${c.red}At least one accepted answer is required${c.reset}`);
    return;
  }

  // Get difficulty
  const difficultyOptions = ["easy", "medium", "hard"] as const;
  const difficultyIndex = await selectOption("Difficulty", [...difficultyOptions]);
  const difficulty = difficultyOptions[difficultyIndex] ?? "medium";

  // Generate ID
  const id = generateQuestionId(data.questions, "sa");

  // Create question
  const newQuestion: ShortAnswerQuestion = {
    id,
    type: "short-answer",
    question: questionText,
    acceptedAnswers,
    difficulty,
  };

  // Preview
  console.log();
  console.log(`  ${c.bold}Preview:${c.reset}`);
  console.log(`  ${c.dim}${JSON.stringify(newQuestion, null, 2).split("\n").join("\n  ")}${c.reset}`);
  console.log();

  // Confirm
  const confirm = await ask("Add this question? (y/n)");
  if (confirm.toLowerCase() !== "y") {
    console.log(`  ${c.yellow}Cancelled${c.reset}`);
    return;
  }

  // Add and save
  data.questions.push(newQuestion);
  await saveQuestionFile(SHORT_ANSWER_FILE, data);

  console.log();
  printSuccess(`Added question ${c.cyan}${id}${c.reset} to ${c.cyan}${SHORT_ANSWER_FILE}${c.reset}`);
}

async function main(): Promise<void> {
  printHeader("TMG Bench - Question Editor");

  // Show current counts
  try {
    const saData = await loadQuestionFile(SHORT_ANSWER_FILE);
    printInfo(`Short answer questions: ${saData.questions.length}`);
  } catch {
    console.log(`  ${c.red}Could not load question files${c.reset}`);
  }
  console.log();

  await addShortAnswer();

  console.log();

  // Ask if they want to add another
  const another = await ask("Add another question? (y/n)");
  if (another.toLowerCase() === "y") {
    await main();
  } else {
    console.log(`\n  ${c.dim}Goodbye!${c.reset}\n`);
    rl.close();
  }
}

main();
