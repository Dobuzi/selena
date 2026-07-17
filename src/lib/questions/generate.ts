import OpenAI from "openai";
import { QUESTION_COUNT } from "@/lib/constants";
import type { Difficulty, Question, Subject } from "@/lib/types";
import { getFallbackQuestions } from "./fallback";
import { parseQuestionsPayload } from "./schema";

const SUBJECT_KO: Record<Subject, string> = {
  korean: "국어",
  english: "영어",
  math: "수학",
  science: "과학",
};

const DIFF_KO: Record<Difficulty, string> = {
  easy: "하",
  medium: "중",
  hard: "상",
};

export type GenerateResult = {
  questions: Question[];
  usedFallback: boolean;
};

async function callModel(
  subject: Subject,
  difficulty: Difficulty,
  count: number,
): Promise<Question[] | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });

  const user = `중학생 ${SUBJECT_KO[subject]} 시험 연습 객관식 ${count}문항을 JSON으로 만들어 주세요.
난이도: ${DIFF_KO[difficulty]}
형식:
{"questions":[{"stem":"...","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}
규칙: 정답은 하나, correctIndex는 0~3, 해설 1~2문장, 교육적으로 적절할 것. JSON만 출력.`;

  try {
    const resp = await client.chat.completions.create({
      model: "grok-4.5",
      messages: [
        {
          role: "system",
          content:
            "You are a Korean middle-school exam writer. Output valid JSON only.",
        },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    });
    const text = resp.choices[0]?.message?.content ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const parsed = parseQuestionsPayload(raw);
    if (!parsed.ok) return null;
    return parsed.questions;
  } catch {
    return null;
  }
}

export async function generateQuestions(input: {
  subject: Subject;
  difficulty: Difficulty;
  count?: number;
}): Promise<GenerateResult> {
  const count = input.count ?? QUESTION_COUNT;
  let questions = await callModel(input.subject, input.difficulty, count);
  if (!questions || questions.length < count) {
    questions = await callModel(input.subject, input.difficulty, count);
  }
  if (!questions || questions.length === 0) {
    return {
      questions: getFallbackQuestions(input.subject).slice(0, count),
      usedFallback: true,
    };
  }
  if (questions.length < count) {
    const fallback = getFallbackQuestions(input.subject);
    const need = count - questions.length;
    return {
      questions: [...questions, ...fallback.slice(0, need)],
      usedFallback: true,
    };
  }
  return { questions: questions.slice(0, count), usedFallback: false };
}
