import type { Player, Question, Room } from "@/lib/types";

export type ClientQuestion = {
  id: string;
  stem: string;
  choices: [string, string, string, string];
  index: number;
  total: number;
  deadlineAt: number | null;
  correctIndex?: 0 | 1 | 2 | 3;
  explanation?: string;
};

export type ClientPlayer = Omit<Player, "answers"> & {
  answers: Player["answers"];
};

export type ClientRoom = {
  roomId: string;
  schoolName: string;
  examHallName: string;
  subject: Room["subject"];
  difficulty: Room["difficulty"];
  hostPlayerId: string;
  players: ClientPlayer[];
  status: Room["status"];
  mode: Room["mode"];
  currentQuestionIndex: number;
  questionDeadlineAt: number | null;
  battlePhase: Room["battlePhase"];
  revealUntilAt: number | null;
  usedFallback: boolean;
  aiHp: number;
  soloResult: Room["soloResult"];
  currentQuestion: ClientQuestion | null;
  review: Array<{
    question: Question;
    playerAnswers: Array<{
      playerId: string;
      nickname: string;
      choiceIndex: number | null;
      correct: boolean;
      points: number;
    }>;
  }>;
};

function mapQuestion(
  room: Room,
  reveal: boolean,
): ClientQuestion | null {
  if (room.status !== "battling" && room.status !== "finished") return null;
  if (room.questions.length === 0) return null;
  const idx = room.currentQuestionIndex;
  if (idx < 0 || idx >= room.questions.length) return null;
  if (room.status === "finished") return null;
  const q = room.questions[idx];
  const base: ClientQuestion = {
    id: q.id,
    stem: q.stem,
    choices: q.choices,
    index: idx,
    total: room.questions.length,
    deadlineAt: room.questionDeadlineAt,
  };
  if (reveal && room.battlePhase === "reveal") {
    base.correctIndex = q.correctIndex;
    base.explanation = q.explanation;
  }
  return base;
}

export function toClientView(room: Room): ClientRoom {
  const reveal = room.battlePhase === "reveal";
  const review =
    room.status === "finished"
      ? buildReview(room)
      : [];

  return {
    roomId: room.roomId,
    schoolName: room.schoolName,
    examHallName: room.examHallName,
    subject: room.subject,
    difficulty: room.difficulty,
    hostPlayerId: room.hostPlayerId,
    players: room.players.map((p) => ({ ...p, answers: [...p.answers] })),
    status: room.status,
    mode: room.mode,
    currentQuestionIndex: room.currentQuestionIndex,
    questionDeadlineAt: room.questionDeadlineAt,
    battlePhase: room.battlePhase,
    revealUntilAt: room.revealUntilAt,
    usedFallback: room.usedFallback,
    aiHp: room.aiHp,
    soloResult: room.soloResult,
    currentQuestion: mapQuestion(room, reveal),
    review,
  };
}

function buildReview(room: Room) {
  const playedIds = new Set<string>();
  for (const p of room.players) {
    for (const a of p.answers) playedIds.add(a.questionId);
  }
  return room.questions
    .filter((q) => playedIds.has(q.id))
    .map((question) => ({
      question,
      playerAnswers: room.players
        .filter((p) => p.answers.some((a) => a.questionId === question.id))
        .map((p) => {
          const a = p.answers.find((x) => x.questionId === question.id)!;
          return {
            playerId: p.playerId,
            nickname: p.nickname,
            choiceIndex: a.choiceIndex,
            correct: a.correct,
            points: a.points,
          };
        }),
    }));
}
