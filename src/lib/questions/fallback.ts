import type { Question, Subject } from "@/lib/types";

type Raw = Omit<Question, "id">;

function bank(prefix: string, items: Raw[]): Question[] {
  return items.map((item, i) => ({
    ...item,
    id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
  }));
}

const korean: Raw[] = [
  { stem: "다음 중 명사가 아닌 것은?", choices: ["하늘", "빠르게", "학교", "책"], correctIndex: 1, explanation: "'빠르게'는 부사입니다." },
  { stem: "'봄이 왔다'에서 서술어는?", choices: ["봄이", "왔다", "봄", "이"], correctIndex: 1, explanation: "서술어는 '왔다'입니다." },
  { stem: "다음 중 반의어 관계가 올바른 것은?", choices: ["크다-작다", "가다-오다 아님", "먹다-마시다", "읽다-쓰다 아님"], correctIndex: 0, explanation: "크다와 작다는 반의어입니다." },
  { stem: "띄어쓰기가 바른 것은?", choices: ["할수있다", "할 수 있다", "할수 있다", "할 수있다"], correctIndex: 1, explanation: "'할 수 있다'로 띄어 씁니다." },
  { stem: "다음 중 높임 표현이 아닌 것은?", choices: ["드시다", "잡수시다", "먹다", "주무시다"], correctIndex: 2, explanation: "'먹다'는 기본형입니다." },
  { stem: "시조의 기본 형식은?", choices: ["3장 6구", "2장 4구", "4장 8구", "5장 10구"], correctIndex: 0, explanation: "시조는 3장 6구가 기본입니다." },
  { stem: "'꽃이 핀다'의 주제어(주어)는?", choices: ["꽃이", "핀다", "꽃", "이"], correctIndex: 0, explanation: "주어는 '꽃이'입니다." },
  { stem: "다음 중 한자어가 아닌 것은?", choices: ["학교", "학생", "나무", "교실"], correctIndex: 2, explanation: "'나무'는 고유어입니다." },
  { stem: "비유법 중 비슷한 것에 빗대는 것은?", choices: ["직유", "반어", "설의", "열거"], correctIndex: 0, explanation: "직유는 '~처럼' 등으로 빗대는 표현입니다." },
  { stem: "다음 중 경어가 들어간 문장은?", choices: ["밥 먹어.", "진지 드세요.", "빨리 와.", "숙제 해."], correctIndex: 1, explanation: "'진지 드세요'가 높임 표현입니다." },
];

const english: Raw[] = [
  { stem: "What is the past tense of 'go'?", choices: ["goed", "went", "gone", "going"], correctIndex: 1, explanation: "The past tense of go is went." },
  { stem: "Choose the correct article: ___ apple", choices: ["a", "an", "the a", "no"], correctIndex: 1, explanation: "Apple starts with a vowel sound, so use 'an'." },
  { stem: "'She ___ a student.'", choices: ["am", "is", "are", "be"], correctIndex: 1, explanation: "Third person singular uses 'is'." },
  { stem: "Opposite of 'hot' is?", choices: ["warm", "cold", "coolish", "heat"], correctIndex: 1, explanation: "Cold is the opposite of hot." },
  { stem: "Plural of 'child' is?", choices: ["childs", "children", "childes", "child"], correctIndex: 1, explanation: "The plural of child is children." },
  { stem: "Which is a verb?", choices: ["happy", "run", "blue", "quickly"], correctIndex: 1, explanation: "Run is a verb." },
  { stem: "'I ___ breakfast every day.'", choices: ["eats", "eat", "eating", "ate always"], correctIndex: 1, explanation: "With I, use 'eat'." },
  { stem: "How do you say 책 in English?", choices: ["pen", "book", "desk", "bag"], correctIndex: 1, explanation: "책 means book." },
  { stem: "Which sentence is correct?", choices: ["He don't like it.", "He doesn't like it.", "He not like it.", "He no likes it."], correctIndex: 1, explanation: "Use doesn't with he/she/it." },
  { stem: "What color is the sky on a clear day?", choices: ["green", "blue", "purple", "black"], correctIndex: 1, explanation: "The sky is blue." },
];

const math: Raw[] = [
  { stem: "2x + 3 = 11 일 때 x는?", choices: ["2", "4", "5", "7"], correctIndex: 1, explanation: "2x = 8, x = 4" },
  { stem: "3² 의 값은?", choices: ["6", "9", "12", "8"], correctIndex: 1, explanation: "3×3=9" },
  { stem: "1/2 + 1/4 = ?", choices: ["1/6", "2/6", "3/4", "1/3"], correctIndex: 2, explanation: "2/4 + 1/4 = 3/4" },
  { stem: "삼각형 내각의 합은?", choices: ["90°", "180°", "270°", "360°"], correctIndex: 1, explanation: "삼각형 내각의 합은 180°입니다." },
  { stem: "15의 약수가 아닌 것은?", choices: ["1", "3", "5", "4"], correctIndex: 3, explanation: "4는 15를 나누지 않습니다." },
  { stem: "(-3) + 5 = ?", choices: ["-8", "2", "8", "-2"], correctIndex: 1, explanation: "-3+5=2" },
  { stem: "원의 둘레 공식은? (반지름 r)", choices: ["πr²", "2πr", "πd/2", "r²"], correctIndex: 1, explanation: "원주는 2πr입니다." },
  { stem: "0.5를 분수로 쓰면?", choices: ["1/5", "1/2", "5/10 약분 전", "2/5"], correctIndex: 1, explanation: "0.5 = 1/2" },
  { stem: "12 ÷ 3 × 2 = ?", choices: ["2", "8", "18", "4"], correctIndex: 1, explanation: "왼쪽부터 12÷3=4, 4×2=8" },
  { stem: "정사각형 한 변 4cm일 때 넓이는?", choices: ["8", "12", "16", "20"], correctIndex: 2, explanation: "4×4=16" },
];

const science: Raw[] = [
  { stem: "물의 화학식은?", choices: ["CO₂", "H₂O", "O₂", "NaCl"], correctIndex: 1, explanation: "물은 H₂O입니다." },
  { stem: "식물이 빛으로 양분을 만드는 작용은?", choices: ["호흡", "광합성", "증산", "발아"], correctIndex: 1, explanation: "광합성입니다." },
  { stem: "지구를 도는 위성은?", choices: ["태양", "달", "화성", "금성"], correctIndex: 1, explanation: "달은 지구의 위성입니다." },
  { stem: "고체가 액체로 변하는 것은?", choices: ["응고", "융해", "증발", "승화"], correctIndex: 1, explanation: "융해(녹음)입니다." },
  { stem: "심장이 하는 일은?", choices: ["소화", "혈액 순환", "뼈 생성", "빛 감지"], correctIndex: 1, explanation: "심장은 혈액을 순환시킵니다." },
  { stem: "산소의 화학식은?", choices: ["O₂", "CO₂", "N₂", "H₂"], correctIndex: 0, explanation: "산소 기체는 O₂입니다." },
  { stem: "자석의 같은 극끼리 가까이 하면?", choices: ["끌어당긴다", "밀어낸다", "변화 없다", "녹는다"], correctIndex: 1, explanation: "같은 극은 밀어냅니다." },
  { stem: "척추동물이 아닌 것은?", choices: ["개", "물고기", "지렁이", "새"], correctIndex: 2, explanation: "지렁이는 무척추동물입니다." },
  { stem: "태양계의 중심에 있는 천체는?", choices: ["지구", "달", "태양", "목성"], correctIndex: 2, explanation: "태양이 중심입니다." },
  { stem: "숨을 쉴 때 들이마시는 기체의 주성분은?", choices: ["이산화탄소만", "질소와 산소", "수소만", "헬륨"], correctIndex: 1, explanation: "공기 주성분은 질소와 산소입니다." },
];

const BY_SUBJECT: Record<Subject, Question[]> = {
  korean: bank("korean", korean),
  english: bank("english", english),
  math: bank("math", math),
  science: bank("science", science),
};

export function getFallbackQuestions(subject: Subject): Question[] {
  return BY_SUBJECT[subject].map((q) => ({ ...q, choices: [...q.choices] as Question["choices"] }));
}
