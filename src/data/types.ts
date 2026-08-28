/**
 * 하루차림 — 암 환자 식이·영양 의사결정 보조
 * 데이터 스키마 정의
 *
 * 설계 원칙
 *  1) 영양성분은 항상 "가식부 100 g 당" 값으로 저장하고, 1회 제공량은 별도 필드로 둔다.
 *     → 사용자가 몇 인분을 선택하든 계산식이 하나로 유지된다.
 *  2) 암종별 권고는 개별 식품 id 를 직접 나열하지 않고 가급적 tag 로 매칭한다.
 *     → 식품이 1,000종으로 늘어나도 규칙은 늘어나지 않는다.
 *  3) 모든 임상 권고에는 근거 수준(evidence)과 출처(refIds)를 반드시 붙인다.
 *     근거 없는 값은 만들어 넣지 않는다.
 */

/* ────────────────────────────── 영양소 ────────────────────────────── */

/** 가식부 100 g 당 영양성분. 값이 확인되지 않은 항목은 undefined 로 두고 0 으로 채우지 않는다. */
/**
 * 100 g(가식부) 당 성분값.
 *
 * 에너지를 뺀 나머지는 모두 선택이다. 공공데이터의 가공식품은 신고된 항목만
 * 값이 있고, 없는 항목은 비어 있다. 그것을 0 으로 채우면
 * "148 kcal 인데 탄수화물 0 g·지방 0 g" 같은 거짓말이 된다.
 * 모르는 값은 undefined 로 두고 화면에서 '정보 없음'이라고 밝힌다.
 */
export interface Nutrients {
  /** 에너지 (kcal) */ kcal: number
  /** 탄수화물 (g) */ carb?: number
  /** 당류 (g) */ sugar?: number
  /** 식이섬유 (g) */ fiber?: number
  /** 단백질 (g) */ protein?: number
  /** 지방 (g) */ fat?: number
  /** 포화지방 (g) */ satFat?: number
  /** 트랜스지방 (g) */ transFat?: number
  /** 오메가-3 지방산 (g, ALA+EPA+DHA) */ omega3?: number
  /** 콜레스테롤 (mg) */ chol?: number

  /** 나트륨 (mg) */ na?: number
  /** 칼륨 (mg) */ k?: number
  /** 칼슘 (mg) */ ca?: number
  /** 인 (mg) */ p?: number
  /** 마그네슘 (mg) */ mg?: number
  /** 철 (mg) */ fe?: number
  /** 아연 (mg) */ zn?: number
  /** 셀레늄 (µg) */ se?: number

  /** 비타민 A (µg RAE) */ vitA?: number
  /** 비타민 D (µg) */ vitD?: number
  /** 비타민 E (mg α-TE) */ vitE?: number
  /** 비타민 K (µg) */ vitK?: number
  /** 비타민 C (mg) */ vitC?: number
  /** 티아민 B1 (mg) */ b1?: number
  /** 리보플라빈 B2 (mg) */ b2?: number
  /** 나이아신 B3 (mg NE) */ b3?: number
  /** 비타민 B6 (mg) */ b6?: number
  /** 엽산 (µg DFE) */ folate?: number
  /** 비타민 B12 (µg) */ b12?: number

  /** 퓨린 (mg) — 신기능 저하·고요산혈증 참고용 */ purine?: number
  /** 알코올 (g) */ alcohol?: number
}

export type NutrientKey = keyof Nutrients

/* ────────────────────────────── 식품 ────────────────────────────── */

export type FoodGroup =
  | '곡류·전분'
  | '두류·대두가공'
  | '견과·종실'
  | '채소'
  | '해조·버섯'
  | '과일'
  | '육류'
  | '가금류·난류'
  | '어패류'
  | '우유·유제품'
  | '유지·당류'
  | '국·탕·찌개'
  | '밥·면·죽 요리'
  | '반찬·조림·볶음'
  | '가공식품'
  | '음료'
  | '간식·디저트'
  | '외식·프랜차이즈'
  | '경장영양·환자식'

/** 규칙 엔진이 매칭하는 식품 속성 태그. 임상 권고는 대부분 이 태그를 통해 연결된다. */
export type FoodTag =
  // 조리·가공 방식
  | '생식'            // 익히지 않음 — 호중구감소증 시 주의
  | '발효'
  | '훈제'
  | '염장'            // 소금 절임 (젓갈·장아찌)
  | '직화구이'        // 고온 직화 — HCA/PAH
  | '튀김'
  | '가공육'          // 햄·소시지·베이컨 — IARC Group 1
  | '초가공식품'
  // 성분 특성
  | '고나트륨'
  | '고당'
  | '고지방'
  | '포화지방높음'
  | '고식이섬유'
  | '저잔사'          // low-residue, 장 협착·급성 장염 시
  | '고단백'
  | '고칼륨'
  | '고인'
  | '고퓨린'
  | '고비타민K'       // 와파린 상호작용
  | '고칼슘'
  | '철분풍부'
  | '적색육'
  | '오메가3풍부'
  | '프로바이오틱스'
  | '식물성에스트로겐' // 대두 이소플라본
  | '십자화과'
  | '알리움'          // 마늘·양파·부추
  | '카로티노이드'
  | '리코펜'
  | '폴리페놀'
  | '자몽계'          // CYP3A4 억제
  | '카페인'
  | '알코올'
  | '유당함유'
  | '글루텐함유'
  | '매운맛'
  | '산성강함'        // 감귤·토마토·식초 — 구강점막염 시 통증
  | '거친질감'        // 견과·바삭한 튀김 — 점막염·연하곤란 시 손상
  /** 떡처럼 끈적하게 뭉쳐 인두에 달라붙는 것 — 연하곤란에서 질식 위험 */
  | '점착성'
  | '가스유발'        // FODMAP
  | '저FODMAP'
  | '부드러움'        // 연하곤란·점막염 시 적합
  | '수분보충'
  | '고열량밀도'      // 악액질·체중감소 시 유리

/** 제철 — 식단 추천에서 그 계절 재료를 우선 배치하는 데 쓴다 */
export type Season = '봄' | '여름' | '가을' | '겨울' | '연중'

/** 요리 계통 — 기본은 한식이고, 사용자가 원할 때만 다른 계통을 섞는다 */
export type Cuisine = '한식' | '양식' | '중식' | '일식' | '동남아' | '무관'

export type FoodForm =
  | 'ingredient'  // 식재료 (생 또는 기본 조리)
  | 'dish'        // 조리된 한 그릇 음식
  | 'processed'   // 포장 가공식품
  | 'beverage'
  | 'snack'
  | 'eatout'      // 외식 메뉴

export interface Food {
  id: string
  /** 대표 표기명 */
  name: string
  /** 검색용 동의어·이명 (예: '고구마' ← '군고구마', 'sweet potato') */
  aliases?: string[]
  group: FoodGroup
  form: FoodForm
  /** 1회 제공량 — 실제 한국인이 한 번에 먹는 현실적인 양 */
  serving: {
    /** 가식부 그램 */ g: number
    /** 사용자에게 보여줄 표기 (예: '공기 1그릇') */ label: string
  }
  /** 가식부 100 g 당 영양성분 */
  per100: Nutrients
  tags: FoodTag[]
  /** 혈당지수 (포도당 기준, 확인된 값만) */
  gi?: number
  /** 표시용 보충 설명 */
  note?: string
  /** 성분값 출처 — 'kfda' = 식품의약품안전처 식품영양성분DB, 'rda' = 농촌진흥청 표준성분표 */
  src?: 'kfda' | 'rda' | 'usda' | 'label' | 'calc'
  /** 제철. 생략하면 연중으로 본다 */
  season?: Season[]
  /** 요리 계통. 생략하면 한식으로 본다 */
  cuisine?: Cuisine
  /** 유통 바코드(GTIN-13). 포장 제품에만 있다 */
  barcode?: string
  /**
   * 공공데이터에서 자동으로 들여온 항목인지.
   * 성분값은 식약처 자료라 신뢰할 수 있지만, 임상 태그는 성분으로 판정 가능한 것만
   * 붙어 있어 수작업 검토를 거친 항목보다 정보가 얕다. 화면에서 이를 구분해 표시한다.
   */
  auto?: boolean
  /** 제조사 (가공식품) */
  maker?: string
  /** 품목보고번호 — 바코드 조회와 이어붙이는 열쇠 */
  reportNo?: string
}

/* ────────────────────────────── 영양제 ────────────────────────────── */

export type SupplementCategory =
  | '종합비타민'
  | '비타민B군'
  | '비타민C'
  | '비타민D'
  | '오메가3'
  | '칼슘·마그네슘'
  | '철분'
  | '아연·미네랄'
  | '유산균'
  | '단백질보충'
  | '경장영양(균형영양식)'
  | '간건강'
  | '홍삼·인삼'
  | '항산화·기타'
  | '식이섬유'

/** 영양소로 환산되지 않는 기능성 원료 (한국 건강기능식품 기능성 원료 등) */
export interface ActiveIngredient {
  name: string
  /** 1일 섭취량 기준 함량 표기 (예: '1,000 mg') */
  amount: string
}

export interface Supplement {
  id: string
  /** 제품명 또는 대표 품목명 */
  name: string
  brand: string
  category: SupplementCategory
  /** 1일 섭취 방법 표기 (예: '1일 1회 1정') */
  dosageLabel: string
  /** 1일 섭취량 기준 영양성분 (Nutrients 키를 그대로 사용) */
  perDay: Partial<Nutrients>
  actives?: ActiveIngredient[]
  /** 약국 일반 유통 여부 */
  otc: boolean
  /** 건강기능식품 인정 여부 */
  hf?: boolean
  note?: string
}

/* ────────────────────────────── 임상 권고 ────────────────────────────── */

export type CancerId =
  | 'breast' | 'prostate' | 'lung' | 'stomach' | 'colorectal'
  | 'liver' | 'pancreas' | 'esophagus' | 'headneck' | 'gyn'

/**
 * 암종 안의 세부 변수.
 *
 * 같은 유방암이라도 호르몬 수용체가 양성이냐 아니냐에 따라 받는 치료가 달라지고,
 * 그러면 챙겨야 할 것도 달라진다. 아로마타제 억제제는 호르몬 수용체 양성에만 쓰는데,
 * 지금까지는 삼중음성 환자에게도 "아로마타제 억제제를 쓰는 동안 칼슘을 챙기세요" 가
 * 그대로 떴다. 해당되지 않는 말이 섞이면 나머지 말의 무게까지 같이 떨어진다.
 *
 * 여기 넣는 것은 '식단이나 영양제 권고를 실제로 바꾸는' 변수만이다.
 * 예후만 다르고 먹는 것이 같은 변수는 이 앱이 다룰 일이 아니다.
 */
export type CancerSubtype =
  // 유방암 — 받는 치료가 갈린다
  | '호르몬수용체양성'
  | 'HER2양성'
  | '삼중음성'
  // 전립선암 — 안드로겐차단요법 여부로 뼈·근육 권고가 갈린다
  | '안드로겐차단요법중'
  // 위암 — 전절제와 부분절제는 흡수 장애의 정도가 다르다
  | '위전절제'
  | '위부분절제'
  // 간암 — 간경변 동반 여부로 단백질·야식 권고가 갈린다
  | '간경변동반'

/** 암종별로 물어볼 세부 변수. 목록에 없는 암종은 묻지 않는다. */
export const SUBTYPE_OPTIONS: Partial<
  Record<CancerId, { id: CancerSubtype; label: string; hint: string }[]>
> = {
  breast: [
    {
      id: '호르몬수용체양성',
      label: '호르몬 수용체 양성 (ER 또는 PR +)',
      hint: '타목시펜·아로마타제 억제제 같은 항호르몬 치료를 받습니다'
    },
    { id: 'HER2양성', label: 'HER2 양성', hint: '트라스투주맙 등 표적치료를 받습니다' },
    { id: '삼중음성', label: '삼중음성 (ER·PR·HER2 모두 −)', hint: '항호르몬 치료를 받지 않습니다' }
  ],
  prostate: [
    {
      id: '안드로겐차단요법중',
      label: '안드로겐 차단요법(호르몬 주사)을 받는 중',
      hint: '골밀도와 근육량 관리가 핵심이 됩니다'
    }
  ],
  stomach: [
    { id: '위전절제', label: '위 전절제', hint: '위를 모두 떼어냈습니다' },
    { id: '위부분절제', label: '위 부분절제(아전절제)', hint: '위 일부를 남겼습니다' }
  ],
  liver: [{ id: '간경변동반', label: '간경변이 함께 있음', hint: '단백질과 야식 권고가 달라집니다' }]
}

/** 치료 시기 — 같은 식품도 시기에 따라 권고가 달라진다. */
export type Phase =
  | 'all'
  | 'during_rt'        // 방사선치료 중
  | 'during_chemo'     // 항암화학요법 중
  | 'neutropenia'      // 호중구감소증
  | 'post_op'          // 수술 후 회복기
  | 'survivorship'     // 치료 종료 후 관리기

/**
 * 근거 수준
 *  A — 무작위배정 임상시험 또는 그 메타분석
 *  B — 대규모 전향적 코호트·환자대조군 연구
 *  C — 소규모·후향적 연구, 기전 연구, 일관되지 않은 결과
 *  G — 주요 학회 가이드라인의 합의 권고 (WCRF/AICR, ASCO, ESPEN, NCCN 등)
 */
export type EvidenceLevel = 'A' | 'B' | 'C' | 'G'

export type RuleLevel =
  | 'avoid'      // 금기 — 하지 않도록 권고
  | 'caution'    // 주의 — 제한하거나 조건부
  | 'prefer'     // 권장 — 이득 근거 있음
  | 'info'       // 정보 — 흔한 오해 교정 등

/**
 * 식품·영양제를 규칙에 연결하는 매칭 조건.
 * tags / foodIds / groups / nutrient 등 조건들은 서로 OR 로 평가한다.
 * restrictGroups 만 예외로, 지정하면 그 식품군에 속한 것만 최종적으로 통과시킨다(AND).
 */
export interface RuleMatch {
  /** OR 매칭 결과를 이 식품군으로 한정한다 (예: 고당 규칙을 음료·간식에만 적용) */
  restrictGroups?: FoodGroup[]
  /**
   * 이 태그가 붙었으면 걸리지 않는다.
   *
   * "채소를 충분히 드세요" 는 갓김치·오이지에까지 붙을 이유가 없다.
   * 실제로 위암에서 갓김치가 '염장이라 피하세요' 와 '채소라 권장' 을 동시에 받아,
   * 한 음식에 반대되는 두 문장이 나란히 붙었다.
   * 권고의 대상이 아닌 형태를 여기서 덜어낸다.
   */
  excludeTags?: FoodTag[]
  tags?: FoodTag[]
  foodIds?: string[]
  groups?: FoodGroup[]
  supplementCategories?: SupplementCategory[]
  supplementIds?: string[]
  /** 성분 임계값 매칭 (예: 1회 제공량 나트륨 > 800 mg) */
  nutrient?: {
    key: NutrientKey
    op: '>' | '<'
    value: number
    /** serving = 1회 제공량, per100 = 100 g 당, day = 하루 총섭취 */
    basis: 'serving' | 'per100' | 'day'
  }
}

export interface NutritionRule {
  id: string
  level: RuleLevel
  match: RuleMatch
  /** 사용자에게 보이는 한 줄 요약 */
  title: string
  /** 왜 그런지 — 기전과 임상 근거를 사용자 언어로 */
  reason: string
  evidence: EvidenceLevel
  refIds: string[]
  /**
   * 이 규칙은 '이 음식을 피하시라' 가 아니라 '이런 점을 함께 살피시라' 는 안내인가.
   *
   * 추천 엔진은 '주의' 등급을 후보에서 통째로 뺀다. 음식 자체가 문제인 규칙
   * (가공육·초가공식품·1회 800 mg 넘는 나트륨)에는 그것이 맞다.
   *
   * 그런데 앱이 알지 못하는 조건에 걸린 안내도 같은 취급을 받고 있었다.
   * 'HER2 표적치료를 받으셨다면 심장 쪽 위험 요인을 같이 관리하세요' 는
   * 세부 변수를 고르지 않으신 분 모두에게 적용되는데(그것이 옳다 — 필요한 말이
   * 빠지는 것보다 낫다), 그 때문에 유방암 환자분께 국이 아닌 반찬 128종 중
   * 68종이 추천에서 사라졌다. 시금치나물도 무생채도 한 번도 나오지 않았다.
   *
   * 말씀은 드리되 상에서 빼지는 않는다. 이런 규칙은 감점으로만 반영한다.
   */
  advisory?: boolean
  /** 해당 시기에만 적용. 생략 시 'all' */
  phases?: Phase[]
  /**
   * 이 세부 변수 중 하나라도 해당할 때만 적용. 생략하면 세부 변수와 무관하게 적용.
   *
   * 아직 세부 변수를 고르지 않은 분에게는 어떻게 할 것인가가 문제인데,
   * 보여 주는 쪽을 택했다. 해당 없는 말이 뜨는 것보다 필요한 말이 빠지는 쪽이
   * 더 위험하기 때문이다. 고르고 나면 그때부터 정확히 걸러진다.
   */
  subtypes?: CancerSubtype[]
}

/** 항암제·표적치료제·방사선과 식품/영양제 사이의 상호작용 */
export interface Interaction {
  id: string
  /** 상호작용 상대 (약제명 또는 치료 modality) */
  agent: string
  match: RuleMatch
  level: RuleLevel
  title: string
  reason: string
  evidence: EvidenceLevel
  refIds: string[]
}

export interface Reference {
  id: string
  /** 인용 표기 */
  citation: string
  year: number
  url?: string
  /** 근거 유형 */
  kind: 'guideline' | 'rct' | 'meta' | 'cohort' | 'review' | 'db'
}

/** 암종별 영양 목표 — ESPEN/ASPEN 종양환자 권고 기반 */
export interface NutritionTarget {
  /** 체중 kg 당 열량 (kcal/kg/day) [최소, 최대] */
  kcalPerKg: [number, number]
  /** 체중 kg 당 단백질 (g/kg/day) [최소, 최대] */
  proteinPerKg: [number, number]
  /** 하루 나트륨 상한 (mg) */
  naLimit?: number
  /** 하루 식이섬유 목표 (g) */
  fiberTarget?: [number, number]
  /** 하루 수분 목표 (mL/kg) */
  fluidPerKg?: number
  notes: string[]
}

export interface CancerProfile {
  id: CancerId
  name: string
  /** 이 암종 식이 관리의 한 문단 요약 */
  summary: string
  /** 이 암종에서 특히 문제가 되는 증상·합병증 */
  keyIssues: string[]
  target: NutritionTarget
  rules: NutritionRule[]
  /** 시기별 실무 지침 */
  phaseNotes: Partial<Record<Exclude<Phase, 'all'>, string>>
  refIds: string[]
}

/* ────────────────────────────── 사용자 입력 ────────────────────────────── */

export interface PatientContext {
  /** 부르는 이름. 로그인하면 자동으로 채워지고, 직접 고칠 수도 있다. */
  name?: string
  cancer: CancerId
  /**
   * 암종 안의 세부 변수 (유방암 호르몬 수용체 등).
   * 비어 있으면 '아직 모름' 으로 보고 세부 규칙을 모두 보여 준다.
   */
  subtypes?: CancerSubtype[]
  phase: Phase
  /** 현재 체중 (kg) */
  weightKg: number
  heightCm: number
  age: number
  sex: 'M' | 'F'
  /** 최근 6개월 체중 감소율 (%) — 악액질 판정 */
  weightLossPct?: number
  /**
   * 기록된 체중에서 읽어 낸 감소율 (%).
   *
   * 위 값은 처음 설정에서 손으로 적으신 것이라 시간이 지나면 실제와 어긋난다.
   * 체중을 적으실 때마다 이 값을 다시 계산해 둔다.
   * 판단할 때는 둘 중 큰 쪽을 쓴다 — 어느 쪽이든 위험을 가리키면 위험한 것이다.
   */
  observedLossPct?: number
  /** 그 감소가 언제부터 얼마 동안인지 — 화면에서 설명할 때 쓴다 */
  observedLossNote?: string
  /** 동반 상태 — 추가 규칙 트리거 */
  conditions: PatientCondition[]
  /** 복용 중인 약제 — 상호작용 검사 */
  medications: string[]
  /** 받은 치료 이력 — 영양제·운동 추천에 반영 */
  history?: TreatmentHistory[]
  /** 식단에 섞어도 되는 요리 계통. 비우면 한식만 */
  cuisines?: Cuisine[]
  /** 온보딩을 마쳤는지 */
  onboarded?: boolean
  /**
   * 바코드 스캔을 쓸지.
   *
   * 공공 바코드 자료는 국내 제품을 다 담지 못한다. 스캔이 자주 빗나가면
   * 오히려 성가시므로 꺼 둘 수 있게 한다. 기본은 켬이다.
   */
  useBarcode?: boolean
}

/** 치료 이력 — 영양 결핍과 운동 제약이 여기서 갈린다 */
export type TreatmentHistory =
  | '수술'
  | '방사선치료'
  | '항암화학요법'
  | '항호르몬치료'
  | '표적치료'
  | '면역항암제'
  | '조혈모세포이식'

export type PatientCondition =
  | '연하곤란'
  | '구강점막염'
  | '설사'
  | '변비'
  | '오심·구토'
  | '식욕부진'
  | '체중감소'
  | '체중증가'
  | '호중구감소증'
  | '위절제후'
  | '장루보유'
  | '복수'
  | '간성뇌증위험'
  | '신기능저하'
  | '당뇨'
  | '고혈압'
  | '와파린복용'

/** 끼니 구분 */
/**
 * 끼니 자리.
 *
 * 처음에는 세 끼에 간식 한 자리였다. 그런데 암 치료 중에는 한 번에 많이 못 드시는 일이 흔해
 * 소량씩 자주 나눠 드시는 것이 권장된다(ESPEN). 위를 절제하신 뒤에는 더욱 그렇다 —
 * 하루 세 끼에 간식 두 번이 표준 권고다.
 *
 * 영양 배분은 이미 그렇게 나누고 있었는데(25/26/27/22) 간식 자리가 하나뿐이라
 * 한 번에 몰아 드시는 것처럼 보였다. 오전과 오후로 나눠 실제 드시는 차례대로 적는다.
 */
export type MealSlot = '아침' | '오전간식' | '점심' | '오후간식' | '저녁'

export const MEAL_SLOTS: MealSlot[] = ['아침', '오전간식', '점심', '오후간식', '저녁']

/** 간식 자리 — '간식이면 어디든' 을 뜻하는 자리에서 쓴다 */
export const SNACK_SLOTS: MealSlot[] = ['오전간식', '오후간식']
export const isSnack = (s: MealSlot): boolean => s === '오전간식' || s === '오후간식'

/**
 * 예전 기록의 '간식'.
 *
 * 자리를 둘로 나누기 전에 담으신 것들이다. 어느 쪽이었는지는 알 수 없으므로
 * 오후 간식으로 본다 — 하루 중 간식은 오후에 드시는 일이 더 흔하다.
 */
export const LEGACY_SNACK = '간식'
export function normalizeSlot(v: unknown): MealSlot | undefined {
  if (typeof v !== 'string') return undefined
  if (v === LEGACY_SNACK) return '오후간식'
  return (MEAL_SLOTS as string[]).includes(v) ? (v as MealSlot) : undefined
}

/** 사용자가 고른 식품 1건 (같은 음식을 여러 끼니에 담을 수 있다) */
export interface SelectedItem {
  foodId: string
  /** 1회 제공량 기준 배수 (0.5, 1, 2 …) */
  servings: number
  /** 어느 끼니에 먹(었)는지. 지정하지 않으면 앱이 배치한다 */
  meal?: MealSlot
}
