import type {
  Question,
  ShortAnswerQuestion,
  ListQuestion,
} from "./types";

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function scoreShortAnswer(
  response: string,
  question: ShortAnswerQuestion
): { correct: boolean; score: number } {
  const normalizedResponse = normalize(response);

  for (const accepted of question.acceptedAnswers) {
    if (normalizedResponse === normalize(accepted)) {
      return { correct: true, score: 1 };
    }
    // Also check if response contains the accepted answer
    if (normalizedResponse.includes(normalize(accepted))) {
      return { correct: true, score: 1 };
    }
  }

  return { correct: false, score: 0 };
}

function scoreList(
  response: string,
  question: ListQuestion
): { correct: boolean; score: number } {
  // Parse response into lines, filtering empty lines
  const responseItems = response
    .split("\n")
    .map((line) => {
      // Remove common prefixes like "1.", "1)", "-", "*", etc.
      return line.replace(/^[\d]+[.)]\s*/, "").replace(/^[-*]\s*/, "").trim();
    })
    .filter((line) => line.length > 0);

  const expectedItems = question.expectedItems;

  if (responseItems.length === 0) {
    return { correct: false, score: 0 };
  }

  // Count matches in order
  let matchCount = 0;

  for (let i = 0; i < Math.min(responseItems.length, expectedItems.length); i++) {
    const responseItem = responseItems[i];
    const expectedItem = expectedItems[i];
    if (responseItem && expectedItem && normalize(responseItem) === normalize(expectedItem)) {
      matchCount++;
    }
  }

  const score = matchCount / expectedItems.length;
  const correct = matchCount === expectedItems.length && responseItems.length === expectedItems.length;

  return { correct, score };
}

export function scoreQuestion(
  response: string,
  question: Question
): { correct: boolean; score: number } {
  switch (question.type) {
    case "short-answer":
      return scoreShortAnswer(response, question);
    case "list":
      return scoreList(response, question);
  }
}

export function formatExpectedAnswer(question: Question): string {
  switch (question.type) {
    case "short-answer":
      return question.acceptedAnswers[0] ?? "";
    case "list":
      return question.expectedItems.join("\n");
  }
}
