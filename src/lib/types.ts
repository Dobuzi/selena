export type Subject = "korean" | "english" | "math" | "science";
export type Difficulty = "easy" | "medium" | "hard";
export type RoomStatus = "lobby" | "generating" | "battling" | "finished";
export type GameMode = "solo" | "multi" | null;
export type BattlePhase = "answering" | "reveal" | null;
export type SoloResult = "win" | "lose" | "draw" | null;

export interface Question {
  id: string;
  stem: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface Answer {
  questionId: string;
  choiceIndex: number | null;
  correct: boolean;
  points: number;
  answeredAt: number;
}

export interface Player {
  playerId: string;
  nickname: string;
  hp: number;
  score: number;
  connected: boolean;
  activeInRound: boolean;
  joinedAt: number;
  answers: Answer[];
}

export interface Room {
  roomId: string;
  schoolName: string;
  examHallName: string;
  subject: Subject;
  difficulty: Difficulty;
  hostPlayerId: string;
  players: Player[];
  questions: Question[];
  status: RoomStatus;
  mode: GameMode;
  currentQuestionIndex: number;
  questionDeadlineAt: number | null;
  battlePhase: BattlePhase;
  revealUntilAt: number | null;
  usedFallback: boolean;
  aiHp: number;
  soloResult: SoloResult;
}

export type JoinIntent = "create" | "join";
