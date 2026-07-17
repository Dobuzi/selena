import type { Difficulty, Question, Subject } from "@/lib/types";
import { balanceAnswerPositions } from "./shuffle";

type Raw = Omit<Question, "id">;

function bank(prefix: string, items: Raw[]): Question[] {
  return items.map((item, i) => ({
    ...item,
    id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
  }));
}

/** 하: 기초 개념·단순 계산 */
const easy: Record<Subject, Raw[]> = {
  korean: [
    { stem: "다음 중 명사는?", choices: ["예쁘다", "학교", "빠르게", "그리고"], correctIndex: 1, explanation: "'학교'는 사물의 이름을 나타내는 명사입니다." },
    { stem: "'꽃이 핀다'에서 주어는?", choices: ["꽃이", "핀다", "꽃핀다", "이"], correctIndex: 0, explanation: "주어는 '꽃이'입니다." },
    { stem: "반의어 짝이 바른 것은?", choices: ["크다-많다", "크다-작다", "가다-오다 아님", "먹다-읽다"], correctIndex: 1, explanation: "크다와 작다는 반의어입니다." },
    { stem: "띄어쓰기가 바른 것은?", choices: ["할수있다", "할수 있다", "할 수 있다", "할 수있다"], correctIndex: 2, explanation: "'할 수 있다'로 띄어 씁니다." },
    { stem: "다음 중 동사는?", choices: ["예쁜", "책상", "달리다", "아주"], correctIndex: 2, explanation: "'달리다'는 움직임을 나타내는 동사입니다." },
    { stem: "높임 표현이 들어간 문장은?", choices: ["밥 먹어.", "빨리 와.", "숙제 해.", "진지 드세요."], correctIndex: 3, explanation: "'진지 드세요'가 높임 표현입니다." },
    { stem: "시조의 기본 형식은?", choices: ["3장 6구", "2장 4구", "1장 2구", "5장 10구"], correctIndex: 0, explanation: "시조는 3장 6구가 기본입니다." },
    { stem: "한자어가 아닌 것은?", choices: ["학교", "학생", "교실", "나무"], correctIndex: 3, explanation: "'나무'는 고유어입니다." },
    { stem: "비유법 중 '~처럼'을 쓰는 것은?", choices: ["직유", "반어", "설의", "열거"], correctIndex: 0, explanation: "직유는 비슷한 것에 빗대는 표현입니다." },
    { stem: "다음 중 부사는?", choices: ["하늘", "책", "매우", "학생"], correctIndex: 2, explanation: "'매우'는 정도를 나타내는 부사입니다." },
  ],
  english: [
    { stem: "What is the past tense of 'go'?", choices: ["goed", "gone", "went", "going"], correctIndex: 2, explanation: "The past tense of go is went." },
    { stem: "Choose the correct article: ___ apple", choices: ["an", "a", "the a", "no"], correctIndex: 0, explanation: "Apple starts with a vowel sound → 'an'." },
    { stem: "'She ___ a student.'", choices: ["am", "are", "be", "is"], correctIndex: 3, explanation: "Third person singular uses 'is'." },
    { stem: "Opposite of 'hot' is?", choices: ["cold", "warm", "coolish", "heat"], correctIndex: 0, explanation: "Cold is the opposite of hot." },
    { stem: "Plural of 'child' is?", choices: ["childs", "childes", "child", "children"], correctIndex: 3, explanation: "The plural of child is children." },
    { stem: "Which word is a verb?", choices: ["happy", "blue", "run", "quickly"], correctIndex: 2, explanation: "Run is a verb." },
    { stem: "'I ___ breakfast every day.'", choices: ["eats", "eating", "eat", "ate always"], correctIndex: 2, explanation: "With I, use 'eat'." },
    { stem: "How do you say 책 in English?", choices: ["pen", "desk", "bag", "book"], correctIndex: 3, explanation: "책 means book." },
    { stem: "Which sentence is correct?", choices: ["He doesn't like it.", "He don't like it.", "He not like it.", "He no likes it."], correctIndex: 0, explanation: "Use doesn't with he/she/it." },
    { stem: "What color is the sky on a clear day?", choices: ["green", "purple", "blue", "black"], correctIndex: 2, explanation: "The sky is blue." },
  ],
  math: [
    { stem: "2 + 5 = ?", choices: ["6", "7", "8", "9"], correctIndex: 1, explanation: "2+5=7" },
    { stem: "3 × 4 = ?", choices: ["12", "7", "9", "16"], correctIndex: 0, explanation: "3×4=12" },
    { stem: "10 − 4 = ?", choices: ["5", "7", "6", "4"], correctIndex: 2, explanation: "10−4=6" },
    { stem: "15 ÷ 3 = ?", choices: ["3", "6", "4", "5"], correctIndex: 3, explanation: "15÷3=5" },
    { stem: "2x = 8 일 때 x는?", choices: ["2", "6", "4", "8"], correctIndex: 2, explanation: "x = 4" },
    { stem: "3² 의 값은?", choices: ["6", "9", "12", "8"], correctIndex: 1, explanation: "3×3=9" },
    { stem: "1/2 + 1/2 = ?", choices: ["1", "1/4", "2/2 아님", "0"], correctIndex: 0, explanation: "1/2+1/2=1" },
    { stem: "정사각형 한 변 3cm일 때 둘레는?", choices: ["6", "9", "12", "3"], correctIndex: 2, explanation: "3×4=12" },
    { stem: "짝수가 아닌 것은?", choices: ["2", "4", "7", "8"], correctIndex: 2, explanation: "7은 홀수입니다." },
    { stem: "(-2) + 5 = ?", choices: ["-7", "3", "7", "-3"], correctIndex: 1, explanation: "-2+5=3" },
  ],
  science: [
    { stem: "물의 화학식은?", choices: ["CO₂", "O₂", "H₂O", "NaCl"], correctIndex: 2, explanation: "물은 H₂O입니다." },
    { stem: "식물이 빛으로 양분을 만드는 작용은?", choices: ["광합성", "호흡", "증산", "발아"], correctIndex: 0, explanation: "광합성입니다." },
    { stem: "지구를 도는 위성은?", choices: ["태양", "화성", "금성", "달"], correctIndex: 3, explanation: "달은 지구의 위성입니다." },
    { stem: "고체가 액체로 변하는 것은?", choices: ["응고", "융해", "증발", "승화"], correctIndex: 1, explanation: "융해(녹음)입니다." },
    { stem: "심장이 하는 일은?", choices: ["소화", "뼈 생성", "혈액 순환", "빛 감지"], correctIndex: 2, explanation: "심장은 혈액을 순환시킵니다." },
    { stem: "산소의 화학식은?", choices: ["O₂", "CO₂", "N₂", "H₂"], correctIndex: 0, explanation: "산소 기체는 O₂입니다." },
    { stem: "자석의 같은 극끼리 가까이 하면?", choices: ["끌어당긴다", "녹는다", "밀어낸다", "변화 없다"], correctIndex: 2, explanation: "같은 극은 밀어냅니다." },
    { stem: "척추동물이 아닌 것은?", choices: ["개", "물고기", "새", "지렁이"], correctIndex: 3, explanation: "지렁이는 무척추동물입니다." },
    { stem: "태양계의 중심에 있는 천체는?", choices: ["지구", "태양", "달", "목성"], correctIndex: 1, explanation: "태양이 중심입니다." },
    { stem: "공기를 구성하는 주된 기체 두 가지는?", choices: ["헬륨·수소", "질소·산소", "이산화탄소만", "오존·아르곤"], correctIndex: 1, explanation: "공기 주성분은 질소와 산소입니다." },
  ],
};

/** 중: 중학 표준 수준 */
const medium: Record<Subject, Raw[]> = {
  korean: [
    { stem: "다음 중 피동 표현이 아닌 것은?", choices: ["문이 열린다", "옷이 찢긴다", "내가 문을 연다", "글이 쓰인다"], correctIndex: 2, explanation: "'내가 문을 연다'는 능동 표현입니다." },
    { stem: "문장 성분 중 서술어의 역할은?", choices: ["주어를 수식", "동작을 나타냄", "목적어만 제시", "접속만 함"], correctIndex: 1, explanation: "서술어는 주어의 동작·상태를 나타냅니다." },
    { stem: "올바른 맞춤법은?", choices: ["됐어요", "됬어요", "됫어요", "돼었어요"], correctIndex: 0, explanation: "'됐어요'가 맞습니다." },
    { stem: "은유에 해당하는 것은?", choices: ["꽃이 웃는다", "별처럼 빛나다", "그는 사자다", "바람처럼 달리다"], correctIndex: 2, explanation: "'그는 사자다'는 직접 동일시하는 은유입니다." },
    { stem: "다음 중 의존 명사는?", choices: ["사람", "수", "학교", "책"], correctIndex: 1, explanation: "'수'는 의존 명사로 쓰입니다 (할 수 있다)." },
    { stem: "높임법이 잘못 쓰인 것은?", choices: ["할머니께서 주무십니다", "아버지가 드십니다", "동생께서 가십니다", "선생님이 말씀하십니다"], correctIndex: 2, explanation: "동생에게 주체 높임 '께서/십니다'는 어색합니다." },
    { stem: "시에서 운율과 가장 관련 깊은 것은?", choices: ["각운·리듬", "주인공 이름", "출판 연도", "작가 고향"], correctIndex: 0, explanation: "운율은 소리의 규칙적 반복과 관련됩니다." },
    { stem: "다음 중 관형어는?", choices: ["예쁘게", "예쁜 꽃", "달린다", "그리고"], correctIndex: 1, explanation: "'예쁜'이 꽃을 수식하는 관형어입니다." },
    { stem: "반어적 표현의 예는?", choices: ["날씨가 정말 좋구나(비 올 때)", "하늘이 파랗다", "꽃이 핀다", "책을 읽는다"], correctIndex: 0, explanation: "말과 속뜻이 반대인 것이 반어입니다." },
    { stem: "한글 창제와 관련된 인물은?", choices: ["광개토대왕", "세종대왕", "이순신", "장영실만"], correctIndex: 1, explanation: "세종대왕이 훈민정음을 창제했습니다." },
  ],
  english: [
    { stem: "If it ___ tomorrow, we will stay home.", choices: ["rain", "rains", "rained", "raining"], correctIndex: 1, explanation: "First conditional: If + present, will..." },
    { stem: "She has ___ finished her homework.", choices: ["yet", "already", "never never", "ago"], correctIndex: 1, explanation: "'Already' fits present perfect affirmative." },
    { stem: "Comparative of 'good' is?", choices: ["gooder", "more good", "best", "better"], correctIndex: 3, explanation: "good → better → best" },
    { stem: "Which is a countable noun?", choices: ["water", "apple", "air", "sugar"], correctIndex: 1, explanation: "Apple can be counted: an apple, two apples." },
    { stem: "'There ___ many books on the desk.'", choices: ["is", "be", "are", "was"], correctIndex: 2, explanation: "Plural subject 'books' → are" },
    { stem: "Past participle of 'write' is?", choices: ["wrote", "written", "writing", "writed"], correctIndex: 1, explanation: "write–wrote–written" },
    { stem: "Choose the correct passive: 'They built the house.'", choices: ["The house was built.", "The house built.", "The house is build.", "The house were built."], correctIndex: 0, explanation: "was/were + past participle" },
    { stem: "'I look forward to ___ you.'", choices: ["see", "saw", "seeing", "seen"], correctIndex: 2, explanation: "look forward to + -ing" },
    { stem: "Which word means 도서관?", choices: ["museum", "library", "bookstore", "stadium"], correctIndex: 1, explanation: "library = 도서관" },
    { stem: "He asked me where I ___.", choices: ["live", "lived", "living", "lives"], correctIndex: 1, explanation: "Reported speech often shifts tense: lived" },
  ],
  math: [
    { stem: "2x + 3 = 11 일 때 x는?", choices: ["2", "5", "4", "7"], correctIndex: 2, explanation: "2x=8, x=4" },
    { stem: "1/2 + 1/4 = ?", choices: ["3/4", "1/6", "2/6", "1/3"], correctIndex: 0, explanation: "2/4+1/4=3/4" },
    { stem: "삼각형 내각의 합은?", choices: ["90°", "270°", "360°", "180°"], correctIndex: 3, explanation: "삼각형 내각의 합은 180°입니다." },
    { stem: "15의 약수가 아닌 것은?", choices: ["1", "3", "5", "4"], correctIndex: 3, explanation: "4는 15를 나누지 않습니다." },
    { stem: "일차함수 y=2x+1 에서 x=3일 때 y는?", choices: ["5", "6", "7", "8"], correctIndex: 2, explanation: "y=2·3+1=7" },
    { stem: "√49 의 값은?", choices: ["6", "7", "8", "9"], correctIndex: 1, explanation: "7×7=49" },
    { stem: "원의 넓이 공식(반지름 r)은?", choices: ["2πr", "πr²", "πd", "r²"], correctIndex: 1, explanation: "넓이는 πr²입니다." },
    { stem: "12 ÷ 3 × 2 = ?", choices: ["2", "18", "8", "4"], correctIndex: 2, explanation: "왼쪽부터 4×2=8" },
    { stem: "이차방정식 x²=9 의 해는?", choices: ["x=3 only", "x=±3", "x=9", "x=0"], correctIndex: 1, explanation: "x=3 또는 x=-3" },
    { stem: "확률: 동전 한 번 던져 앞면이 나올 확률은?", choices: ["1/3", "1", "0", "1/2"], correctIndex: 3, explanation: "앞·뒤 두 가지 중 하나 → 1/2" },
  ],
  science: [
    { stem: "광합성의 결과로 나오는 기체는?", choices: ["이산화탄소", "질소", "산소", "수소"], correctIndex: 2, explanation: "광합성은 산소를 방출합니다." },
    { stem: "뉴턴의 운동 제1법칙과 관련 깊은 개념은?", choices: ["관성", "만유인력만", "부력", "굴절"], correctIndex: 0, explanation: "관성의 법칙입니다." },
    { stem: "원자 번호는 무엇을 나타내나?", choices: ["중성자 수", "양성자 수", "전자껍질 수만", "질량수−중성자"], correctIndex: 1, explanation: "원자 번호 = 양성자 수" },
    { stem: "세포의 에너지 공장에 해당하는 세포 소기관은?", choices: ["핵", "리보솜", "미토콘드리아", "액포"], correctIndex: 2, explanation: "미토콘드리아에서 호흡으로 ATP를 만듭니다." },
    { stem: "전류의 단위는?", choices: ["볼트", "옴", "와트", "암페어"], correctIndex: 3, explanation: "전류 단위는 A(암페어)입니다." },
    { stem: "지구 온난화와 가장 관련 깊은 기체는?", choices: ["산소", "질소", "이산화탄소", "아르곤"], correctIndex: 2, explanation: "CO₂ 농도 증가가 주요 요인입니다." },
    { stem: "소리의 높낮이를 결정하는 것은?", choices: ["진폭", "진동수", "매질 밀도만", "음색만"], correctIndex: 1, explanation: "진동수가 높을수록 높은 소리입니다." },
    { stem: "원소 기호 Fe가 나타내는 원소는?", choices: ["플루오린", "철", "프랑슘", "페르뮴"], correctIndex: 1, explanation: "Fe는 철(iron)입니다." },
    { stem: "계절이 생기는 주된 이유는?", choices: ["지구 자전만", "달의 위상", "지구 자전축 기울기+공전", "태양 흑점만"], correctIndex: 2, explanation: "자전축이 기울어진 채 공전하기 때문입니다." },
    { stem: "산성 용액의 pH는 보통?", choices: ["7보다 큼", "정확히 7", "7보다 작음", "14 고정"], correctIndex: 2, explanation: "산성 pH < 7" },
  ],
};

/** 상: 복합 사고·응용 */
const hard: Record<Subject, Raw[]> = {
  korean: [
    { stem: "다음 문장의 서술어가 두 개인 것은?", choices: ["비가 온다.", "그는 집에 가서 쉰다.", "꽃이 핀다.", "새가 운다."], correctIndex: 1, explanation: "'가서'와 '쉰다' 두 서술어가 있습니다." },
    { stem: "중의적 해석이 가능한 문장은?", choices: ["나는 예쁜 친구의 동생을 만났다.", "해가 뜬다.", "책을 읽는다.", "물을 마신다."], correctIndex: 0, explanation: "'예쁜'이 친구/동생 중 무엇을 수식하는지 중의적입니다." },
    { stem: "다음 중 피동·사동이 모두 가능한 동사는?", choices: ["먹다 → 먹히다/먹이다", "가다 → 가이다", "있다 → 있히다", "이다 → 이이다"], correctIndex: 0, explanation: "먹다의 피동·사동 형태가 있습니다." },
    { stem: "시적 화자와 시인의 관계로 바른 것은?", choices: ["항상 동일", "항상 반대", "다를 수 있음", "무관 절대"], correctIndex: 2, explanation: "시적 화자와 시인은 다를 수 있습니다." },
    { stem: "올바른 외래어 표기는?", choices: ["쥬스", "주스", "쥬쓰", "주쓰"], correctIndex: 1, explanation: "juice는 '주스'로 적습니다." },
    { stem: "다음 중 안은문장(내포) 구조인 것은?", choices: ["비가 오고 바람이 분다.", "그가 온다는 소식을 들었다.", "봄이 왔다.", "꽃이 피고 진다."], correctIndex: 1, explanation: "'그가 온다는'이 안긴문장입니다." },
    { stem: "관용 표현 '발이 넓다'의 뜻은?", choices: ["발이 크다", "사교 범위가 넓다", "걸음이 빠르다", "신발이 많다"], correctIndex: 1, explanation: "인맥·교제가 넓다는 뜻입니다." },
    { stem: "다음 중 높임 선어말 어미가 쓰인 것은?", choices: ["간다", "가신다", "갔다", "가라"], correctIndex: 1, explanation: "'-시-'가 주체 높임 선어말 어미입니다." },
    { stem: "역접의 접속 부사는?", choices: ["그리고", "또한", "그러나", "그래서"], correctIndex: 2, explanation: "'그러나'는 반대·역접입니다." },
    { stem: "다음 중 한자 성어 '일석이조'의 뜻은?", choices: ["한 번에 두 이익", "돌 하나", "아침 일찍", "한 사람의 두 배"], correctIndex: 0, explanation: "한 가지 일로 두 가지 이득을 봄." },
  ],
  english: [
    { stem: "Hardly had he arrived ___ it started to rain.", choices: ["when", "than", "that", "then"], correctIndex: 0, explanation: "Hardly ... when ..." },
    { stem: "I'd rather you ___ smoke here.", choices: ["don't", "didn't", "not", "won't"], correctIndex: 1, explanation: "I'd rather + past for polite preference" },
    { stem: "The book ___ I borrowed was interesting.", choices: ["who", "whom", "which", "where"], correctIndex: 2, explanation: "which for things as relative pronoun" },
    { stem: "Not only John but also his brothers ___ here.", choices: ["is", "was", "be", "are"], correctIndex: 3, explanation: "Agreement with the nearer subject (brothers)" },
    { stem: "She suggested that he ___ early.", choices: ["leaves", "left", "leave", "leaving"], correctIndex: 2, explanation: "Subjunctive: suggest that + base verb" },
    { stem: "By next year, I ___ here for ten years.", choices: ["will work", "will have worked", "worked", "work"], correctIndex: 1, explanation: "Future perfect for duration until future point" },
    { stem: "Which is the least formal?", choices: ["Would you mind opening the window?", "Open the window, will you?", "Could you open the window?", "I wonder if you could open the window."], correctIndex: 1, explanation: "Imperative + tag is more casual." },
    { stem: "'Despite' is closest in meaning to?", choices: ["because of", "in spite of", "due to", "thanks to"], correctIndex: 1, explanation: "despite = in spite of" },
    { stem: "Choose the correct: Neither of the answers ___ correct.", choices: ["are", "is", "be", "were always"], correctIndex: 1, explanation: "Neither of + plural noun often takes singular verb." },
    { stem: "He is used to ___ up early.", choices: ["get", "got", "getting", "gets"], correctIndex: 2, explanation: "be used to + -ing" },
  ],
  math: [
    { stem: "이차함수 y=x²−4x+3 의 꼭짓점의 x좌표는?", choices: ["1", "2", "3", "4"], correctIndex: 1, explanation: "x=−b/2a=4/2=2" },
    { stem: "sin 30° 의 값은?", choices: ["1", "√3/2", "1/2", "0"], correctIndex: 2, explanation: "sin 30°=1/2" },
    { stem: "등차수열 3, 7, 11, … 의 10번째 항은?", choices: ["35", "39", "43", "47"], correctIndex: 1, explanation: "a_n=3+(n−1)·4 → a_10=39" },
    { stem: "한 변 6인 정삼각형 높이는?", choices: ["3", "3√2", "3√3", "6"], correctIndex: 2, explanation: "높이= (√3/2)·6 = 3√3" },
    { stem: "확률: 주사위 두 개를 던져 합이 7일 확률은?", choices: ["1/6", "1/12", "5/36", "1/8"], correctIndex: 0, explanation: "합 7인 경우 6가지/36 = 1/6" },
    { stem: "log₁₀ 1000 = ?", choices: ["2", "4", "3", "10"], correctIndex: 2, explanation: "10³=1000" },
    { stem: "원 x²+y²=25 위의 점과 원점 사이 거리는?", choices: ["5", "25", "10", "√25 아님"], correctIndex: 0, explanation: "반지름이 5입니다." },
    { stem: "방정식 |x−2|=5 의 해의 합은?", choices: ["2", "4", "0", "7"], correctIndex: 1, explanation: "x=7 또는 x=−3, 합=4" },
    { stem: "조합 ₅C₂ 의 값은?", choices: ["5", "20", "10", "25"], correctIndex: 2, explanation: "5·4/2=10" },
    { stem: "미분: f(x)=x³ 일 때 f'(2)는?", choices: ["6", "8", "12", "4"], correctIndex: 2, explanation: "f'=3x², f'(2)=12" },
  ],
  science: [
    { stem: "옴의 법칙에서 V=IR 일 때, R이 2배이고 I가 일정하면 V는?", choices: ["1/2배", "같음", "2배", "4배"], correctIndex: 2, explanation: "V는 R에 비례합니다." },
    { stem: "DNA의 염기쌍 중 아데닌(A)과 쌍을 이루는 것은?", choices: ["구아닌", "시토신", "우라실", "티민"], correctIndex: 3, explanation: "A–T, G–C 쌍입니다." },
    { stem: "지진파 중 가장 빠른 것은?", choices: ["S파", "P파", "L파", "표면파만"], correctIndex: 1, explanation: "P파(종파)가 가장 빠릅니다." },
    { stem: "중화 반응에서 산+염기 → ?", choices: ["금속+기체", "염+물", "산소+수소", "탄소+물"], correctIndex: 1, explanation: "전형적으로 염과 물이 생깁니다." },
    { stem: "렌즈에서 볼록 렌즈의 상 중 실상이 생기는 조건은?", choices: ["물체가 초점 안", "물체가 초점 밖", "항상 허상", "렌즈 없음"], correctIndex: 1, explanation: "초점 밖에 있으면 실상이 맺힙니다." },
    { stem: "생태계에서 생산자에 해당하는 것은?", choices: ["토끼", "풀", "여우", "독수리"], correctIndex: 1, explanation: "식물이 광합성을 하는 생산자입니다." },
    { stem: "달의 위상이 보름달이 될 때 태양–지구–달 배치는?", choices: ["지구가 가운데", "달이 가운데", "태양이 가운데", "일직선 아님"], correctIndex: 0, explanation: "태양–지구–달 순으로 일직선에 가깝습니다." },
    { stem: "촉매의 역할로 옳은 것은?", choices: ["반응열을 항상 늘림", "활성화 에너지를 바꿔 속도 변화", "생성물 양 무한 증가", "질량수 변경"], correctIndex: 1, explanation: "촉매는 활성화 에너지 경로를 바꿉니다." },
    { stem: "혈액형 ABO에서 항원 A와 B를 모두 가진 형은?", choices: ["A", "B", "O", "AB"], correctIndex: 3, explanation: "AB형은 A·B 항원을 모두 가집니다." },
    { stem: "뉴턴 운동 제2법칙 F=ma 에서 질량이 같고 힘이 3배면 가속도는?", choices: ["1/3배", "같음", "3배", "9배"], correctIndex: 2, explanation: "a=F/m 이므로 힘에 비례합니다." },
  ],
};

const BANKS: Record<Difficulty, Record<Subject, Raw[]>> = {
  easy,
  medium,
  hard,
};

export function getFallbackQuestions(
  subject: Subject,
  difficulty: Difficulty = "medium",
): Question[] {
  const raw = BANKS[difficulty][subject];
  const questions = bank(`${subject}-${difficulty}`, raw);
  return balanceAnswerPositions(
    questions.map((q) => ({
      ...q,
      choices: [...q.choices] as Question["choices"],
    })),
  );
}
