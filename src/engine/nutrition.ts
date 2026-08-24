import type { Food, NutrientKey, PatientContext, SelectedItem, Supplement } from '../data/types'
import { FOOD_BY_ID } from '../data/foods'

/** 화면 표시용 영양소 메타데이터 */
export interface NutrientMeta {
  key: NutrientKey
  label: string
  unit: string
  /** 표시 소수점 자리 */
  digits: number
  group: '에너지·다량' | '지방' | '무기질' | '비타민' | '기타'
}

export const NUTRIENT_META: NutrientMeta[] = [
  { key: 'kcal', label: '에너지', unit: 'kcal', digits: 0, group: '에너지·다량' },
  { key: 'carb', label: '탄수화물', unit: 'g', digits: 1, group: '에너지·다량' },
  { key: 'sugar', label: '당류', unit: 'g', digits: 1, group: '에너지·다량' },
  { key: 'fiber', label: '식이섬유', unit: 'g', digits: 1, group: '에너지·다량' },
  { key: 'protein', label: '단백질', unit: 'g', digits: 1, group: '에너지·다량' },
  { key: 'fat', label: '지방', unit: 'g', digits: 1, group: '지방' },
  { key: 'satFat', label: '포화지방', unit: 'g', digits: 1, group: '지방' },
  { key: 'transFat', label: '트랜스지방', unit: 'g', digits: 2, group: '지방' },
  { key: 'omega3', label: '오메가-3', unit: 'g', digits: 2, group: '지방' },
  { key: 'chol', label: '콜레스테롤', unit: 'mg', digits: 0, group: '지방' },
  { key: 'na', label: '나트륨', unit: 'mg', digits: 0, group: '무기질' },
  { key: 'k', label: '칼륨', unit: 'mg', digits: 0, group: '무기질' },
  { key: 'ca', label: '칼슘', unit: 'mg', digits: 0, group: '무기질' },
  { key: 'p', label: '인', unit: 'mg', digits: 0, group: '무기질' },
  { key: 'mg', label: '마그네슘', unit: 'mg', digits: 0, group: '무기질' },
  { key: 'fe', label: '철', unit: 'mg', digits: 1, group: '무기질' },
  { key: 'zn', label: '아연', unit: 'mg', digits: 1, group: '무기질' },
  { key: 'se', label: '셀레늄', unit: 'µg', digits: 0, group: '무기질' },
  { key: 'vitA', label: '비타민 A', unit: 'µg RAE', digits: 0, group: '비타민' },
  { key: 'vitD', label: '비타민 D', unit: 'µg', digits: 1, group: '비타민' },
  { key: 'vitE', label: '비타민 E', unit: 'mg', digits: 1, group: '비타민' },
  { key: 'vitK', label: '비타민 K', unit: 'µg', digits: 0, group: '비타민' },
  { key: 'vitC', label: '비타민 C', unit: 'mg', digits: 0, group: '비타민' },
  { key: 'b1', label: '티아민 B1', unit: 'mg', digits: 2, group: '비타민' },
  { key: 'b2', label: '리보플라빈 B2', unit: 'mg', digits: 2, group: '비타민' },
  { key: 'b3', label: '나이아신 B3', unit: 'mg', digits: 1, group: '비타민' },
  { key: 'b6', label: '비타민 B6', unit: 'mg', digits: 2, group: '비타민' },
  { key: 'folate', label: '엽산', unit: 'µg DFE', digits: 0, group: '비타민' },
  { key: 'b12', label: '비타민 B12', unit: 'µg', digits: 1, group: '비타민' },
  { key: 'purine', label: '퓨린', unit: 'mg', digits: 0, group: '기타' },
  { key: 'alcohol', label: '알코올', unit: 'g', digits: 1, group: '기타' }
]

export const NUTRIENT_META_BY_KEY = Object.fromEntries(
  NUTRIENT_META.map((m) => [m.key, m])
) as Record<NutrientKey, NutrientMeta>

/** 합산 결과. 값이 하나도 없던 영양소는 키 자체가 없다. */
export type NutrientTotals = Partial<Record<NutrientKey, number>>

/** 식품 1건이 선택된 수량만큼 기여하는 영양성분 */
export function foodContribution(food: Food, servings: number): NutrientTotals {
  const factor = (food.serving.g * servings) / 100
  const out: NutrientTotals = {}
  for (const [k, v] of Object.entries(food.per100) as [NutrientKey, number | undefined][]) {
    if (typeof v === 'number') out[k] = v * factor
  }
  return out
}

export function addTotals(a: NutrientTotals, b: NutrientTotals): NutrientTotals {
  const out: NutrientTotals = { ...a }
  for (const [k, v] of Object.entries(b) as [NutrientKey, number][]) {
    out[k] = (out[k] ?? 0) + v
  }
  return out
}

/** 선택한 식품들과 영양제의 합계 */
export function sumIntake(items: SelectedItem[], supplements: Supplement[]): NutrientTotals {
  let total: NutrientTotals = {}
  for (const item of items) {
    const food = FOOD_BY_ID[item.foodId]
    if (!food) continue
    total = addTotals(total, foodContribution(food, item.servings))
  }
  for (const s of supplements) {
    total = addTotals(total, s.perDay as NutrientTotals)
  }
  return total
}

/* ────────────────────────── 섭취기준 ────────────────────────── */

/** 2020 한국인 영양소 섭취기준(KDRIs) 기반 1일 기준값 */
export interface DailyReference {
  /** 권장섭취량 또는 충분섭취량 */
  recommended: NutrientTotals
  /** 상한섭취량 (초과 시 경고) */
  upper: NutrientTotals
  /** 만성질환위험감소를 위한 목표 (나트륨 등) */
  goal: NutrientTotals
}

/**
 * 성별·연령에 따른 1일 기준값.
 * 값은 2020 KDRIs 성인 기준을 사용하며, 65세 이상은 해당 연령군 값으로 조정한다.
 */
export function getDailyReference(sex: 'M' | 'F', age: number): DailyReference {
  const elderly = age >= 65
  const male = sex === 'M'

  const recommended: NutrientTotals = {
    kcal: male ? (elderly ? 2000 : 2500) : elderly ? 1600 : 1900,
    protein: male ? 65 : 55,
    fiber: male ? 30 : 20,
    ca: male ? (elderly ? 700 : 800) : 700,
    p: 700,
    mg: male ? 370 : 280,
    fe: male ? 10 : age >= 50 ? 8 : 14,
    zn: male ? 10 : 8,
    se: 60,
    k: 3500,
    vitA: male ? 800 : 650,
    vitD: elderly ? 15 : 10,
    vitE: 12,
    vitK: male ? 75 : 65,
    vitC: 100,
    b1: male ? 1.2 : 1.1,
    b2: male ? 1.5 : 1.2,
    b3: male ? 16 : 14,
    b6: male ? 1.5 : 1.4,
    folate: 400,
    b12: 2.4
  }

  const upper: NutrientTotals = {
    vitA: 3000, vitD: 100, vitE: 540, vitC: 2000,
    b3: 35, b6: 100, folate: 1000,
    ca: 2500, p: 3500, fe: 45, zn: 35, se: 400, mg: 350
  }

  const goal: NutrientTotals = {
    na: 2000,        // 만성질환위험감소섭취량
    satFat: male ? 22 : 17,  // 총열량의 7 % 내외
    sugar: male ? 62 : 47    // 총열량의 10 % 내외
  }

  return { recommended, upper, goal }
}

/**
 * 계산에 쓸 체중.
 *
 * kcal/kg 를 실제 체중에 그대로 곱하면 비만인 분에게 터무니없는 목표가 나온다.
 * 172 cm 130 kg 이면 하루 3,900 kcal 이 되는데, 지방 조직은 그만큼의 에너지를
 * 쓰지 않으므로 과대평가다. 그렇게 잡아 두면 앱은 매일 "열량이 모자랍니다" 라고 말하고,
 * 채우려다 과식을 권하게 된다.
 *
 * BMI 30 이상에서는 보정체중을 쓴다 — 표준체중에 초과분의 4분의 1만 더한다(ESPEN/ASPEN).
 * 저체중인 분은 실제 체중을 그대로 쓴다. 늘려 잡을 이유가 없다.
 */
export function dosingWeight(patient: PatientContext): number {
  const h = patient.heightCm / 100
  if (!(h > 0)) return patient.weightKg
  const bmi = patient.weightKg / (h * h)
  if (bmi < 30) return patient.weightKg
  const ideal = 22 * h * h          // 한국인 표준체중 기준
  return Math.round(ideal + (patient.weightKg - ideal) * 0.25)
}

/** 환자 상태에 따른 개인별 열량·단백질 목표 (ESPEN 기반, 암종 프로필의 target 을 받아 계산) */
export function personalTarget(
  patient: PatientContext,
  kcalPerKg: [number, number],
  proteinPerKg: [number, number]
): { kcal: [number, number]; protein: [number, number]; fluid: number } {
  const w = dosingWeight(patient)

  /*
   * 체중이 늘고 있는 분에게 늘리라고 하면 안 된다.
   *
   * 암종별 kcal/kg 는 체중을 지키거나 회복시키기 위한 값이다.
   * 그런데 체중 증가를 걱정하시는 분(유방암 항호르몬 치료 중에 흔하다)에게
   * 그대로 곱하면 하루 2,850 kcal 을 채우라는 말이 된다.
   * 앱은 매일 "열량이 모자랍니다" 라고 말하며 더 드시라고 권하게 된다.
   *
   * 치료 중 급격한 감량은 권하지 않으므로 크게 깎지는 않는다.
   * 과체중 이상이면서 체중 증가를 걱정하시는 경우에만 한 단계 낮춘다.
   */
  const h = patient.heightCm / 100
  const bmi = h > 0 ? patient.weightKg / (h * h) : 22
  const gaining = patient.conditions.includes('체중증가') && bmi >= 23
  const losing = (patient.weightLossPct ?? 0) >= 5
  const scale = gaining && !losing ? 0.87 : 1

  return {
    kcal: [Math.round(w * kcalPerKg[0] * scale), Math.round(w * kcalPerKg[1] * scale)],
    protein: [Math.round(w * proteinPerKg[0]), Math.round(w * proteinPerKg[1])],
    fluid: Math.round(w * 30)
  }
}

/** BMI 와 영양 위험 판정 */
export function nutritionRisk(patient: PatientContext): {
  bmi: number
  bmiLabel: string
  risk: 'none' | 'moderate' | 'high'
  message: string
} {
  const h = patient.heightCm / 100
  const bmi = patient.weightKg / (h * h)
  const loss = patient.weightLossPct ?? 0

  const bmiLabel =
    bmi < 18.5 ? '저체중' : bmi < 23 ? '정상' : bmi < 25 ? '과체중' : '비만'

  // ESPEN/GLIM 기준을 단순화한 판정
  let risk: 'none' | 'moderate' | 'high' = 'none'
  let message = '현재 체중 지표에서 특별한 영양 위험 신호는 없습니다.'

  if (loss >= 10 || bmi < 18.5) {
    risk = 'high'
    message =
      '영양 위험이 높은 상태입니다. 6개월간 10 % 이상의 체중 감소나 저체중은 치료 완주율과 부작용 회복에 직접 영향을 줍니다. ' +
      '경구영양보충을 포함한 적극적인 개입이 필요합니다.'
  } else if (loss >= 5) {
    risk = 'moderate'
    message =
      '6개월간 5 % 이상 체중이 줄었습니다. 이 시점부터 개입하는 것이 효과가 좋습니다. ' +
      '열량보다 단백질을 먼저 채우고, 체중을 매주 같은 조건에서 기록해 두세요.'
  } else if (bmi >= 25) {
    risk = 'moderate'
    message =
      '과체중·비만 범위입니다. 치료 중에는 급격한 감량이 권장되지 않지만, 치료가 끝난 뒤에는 ' +
      '체중 관리가 재발 위험과 연결되는 암종이 있습니다.'
  }

  return { bmi: Math.round(bmi * 10) / 10, bmiLabel, risk, message }
}

/**
 * 성분값을 화면용 문자열로 바꾼다. 값이 없으면 '정보 없음'이다.
 *
 * 공공데이터의 가공식품은 신고된 항목만 값이 있다. 없는 것을 0 으로 적으면
 * "나트륨 0 mg" 이 되어 들어 있지 않다는 뜻이 되어 버린다.
 * 모르는 것은 모른다고 적는다.
 */
export function fmtOrUnknown(value: number | undefined, digits: number): string {
  return typeof value === 'number' ? fmt(value, digits) : '정보 없음'
}

/** 이 식품에서 값이 비어 있는 주요 성분들 */
export function missingMacros(food: Food): string[] {
  const out: string[] = []
  if (food.per100.carb === undefined) out.push('탄수화물')
  if (food.per100.protein === undefined) out.push('단백질')
  if (food.per100.fat === undefined) out.push('지방')
  if (food.per100.na === undefined) out.push('나트륨')
  return out
}

export function fmt(value: number, digits: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
}
