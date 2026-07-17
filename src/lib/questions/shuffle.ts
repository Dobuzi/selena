import type { Question } from "@/lib/types";

/** Shuffle choices and keep correctIndex pointing at the same answer text. */
export function shuffleQuestionChoices(question: Question): Question {
  const pairs = question.choices.map((text, i) => ({
    text,
    wasCorrect: i === question.correctIndex,
  }));

  // Fisher–Yates
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  const choices = pairs.map((p) => p.text) as Question["choices"];
  const correctIndex = pairs.findIndex((p) => p.wasCorrect) as 0 | 1 | 2 | 3;

  return {
    ...question,
    choices,
    correctIndex,
  };
}

/**
 * Shuffle each question's choices, then cycle preferred correct slots
 * so a 10-question set is not stuck on the same option number.
 */
export function balanceAnswerPositions(questions: Question[]): Question[] {
  return questions.map((q, i) => {
    const preferred = (i % 4) as 0 | 1 | 2 | 3;
    const correctText = q.choices[q.correctIndex];
    const others = q.choices.filter((_, idx) => idx !== q.correctIndex);
    // mild shuffle of distractors
    for (let a = others.length - 1; a > 0; a--) {
      const b = Math.floor(Math.random() * (a + 1));
      [others[a], others[b]] = [others[b], others[a]];
    }
    const choices = ["", "", "", ""] as [string, string, string, string];
    choices[preferred] = correctText;
    let oi = 0;
    for (let c = 0; c < 4; c++) {
      if (c === preferred) continue;
      choices[c] = others[oi++] ?? "";
    }
    return {
      ...q,
      choices,
      correctIndex: preferred,
    };
  });
}
