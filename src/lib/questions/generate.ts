import OpenAI from "openai";
import { QUESTION_COUNT } from "@/lib/constants";
import type { Difficulty, Question, Subject } from "@/lib/types";
import { getFallbackQuestions } from "./fallback";
import { parseQuestionsPayload } from "./schema";
import { balanceAnswerPositions } from "./shuffle";

const SUBJECT_KO: Record<Subject, string> = {
  korean: "국어",
  english: "영어",
  math: "수학",
  science: "과학",
};

const DIFF_GUIDE: Record<Difficulty, string> = {
  easy:
    "난이도 하: 중학교 초급. 기초 어휘·한 단계 계산·단순 개념. 함정 최소화.",
  medium:
    "난이도 중: 중학 표준. 교과서 본문 수준, 2단계 사고·기본 응용.",
  hard:
    "난이도 상: 중학 심화·고입 대비. 복합 조건, 응용·추론, 실수 유도 오답 포함.",
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

${DIFF_GUIDE[difficulty]}

형식:
{"questions":[{"stem":"...","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}

필수 규칙:
1. 정답은 각 문항마다 정확히 하나 (correctIndex 0~3)
2. correctIndex를 문항마다 골고루 분산 (대략 0,1,2,3이 비슷한 횟수). 절대 전부 1(2번)에 몰지 말 것
3. choices 4개는 서로 다르게, 오답도 그럴듯하게
4. 난이도(${difficulty})에 맞는 문제만 출제 — 하/중/상 내용이 섞이지 않게
5. 해설 1~2문장, 교육적으로 적절
6. JSON만 출력`;

  try {
    const resp = await client.chat.completions.create({
      model: "grok-4.5",
      messages: [
        {
          role: "system",
          content:
            "You are a Korean middle-school exam writer. Vary correctIndex across 0-3. Match difficulty strictly. Output valid JSON only.",
        },
        { role: "user", content: user },
      ],
      temperature: 0.8,
    });
    const text = resp.choices[0]?.message?.content ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const parsed = parseQuestionsPayload(raw);
    if (!parsed.ok) return null;
    return balanceAnswerPositions(parsed.questions);
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
      questions: getFallbackQuestions(input.subject, input.difficulty).slice(
        0,
        count,
      ),
      usedFallback: true,
    };
  }
  if (questions.length < count) {
    const fallback = getFallbackQuestions(input.subject, input.difficulty);
    const need = count - questions.length;
    return {
      questions: balanceAnswerPositions([
        ...questions,
        ...fallback.slice(0, need),
      ]),
      usedFallback: true,
    };
  }
  return {
    questions: balanceAnswerPositions(questions.slice(0, count)),
    usedFallback: false,
  };
}
