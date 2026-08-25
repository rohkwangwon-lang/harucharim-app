import type { EvidenceLevel, Food, NutrientKey, PatientContext, SelectedItem, Supplement } from '../data/types'
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
 * 기록된 체중에서 실제 감소율을 읽어 낸다.
 *
 * 앱은 매일 체중을 받아 적으면서도 그 기록을 계산에 쓰지 않고 있었다.
 * 감소율은 처음 설정에서 손으로 적은 값 그대로였다.
 * 그래서 치료 중 70 kg 에서 62 kg 으로 빠지신 분이 매일 체중을 적어도,
 * 앱은 "체중 유지 중" 으로 보고 영양 위험을 알리지도, 경구영양보충을 권하지도 않았다.
 *
 * 기준선은 '평소 체중' 이다. 최근 6 개월 기록 가운데 가장 높았던 값을 쓰되,
 * 최근 일주일은 기준선에서 뺀다 — 지금 빠지는 중이라면 그 값이 기준이 되어서는 안 된다.
 * 한 번 잘못 적은 값에 흔들리지 않도록, 기간이 2 주 넘을 때만 본다.
 */
export function observedWeightLoss(
  weights: Record<string, number>,
  today: string
): { pct: number; fromKg: number; toKg: number; days: number } | null {
  const dayNo = (k: string) => {
    const [y, m, d] = k.split('-').map(Number)
    return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000)
  }
  const t = dayNo(today)
  const rows = Object.entries(weights)
    .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && v > 0)
    .map(([k, v]) => ({ d: dayNo(k), kg: v }))
    .filter((r) => r.d <= t && t - r.d <= 190)
    .sort((a, b) => a.d - b.d)
  if (rows.length < 2) return null

  const latest = rows[rows.length - 1]
  const baseline = rows.filter((r) => latest.d - r.d >= 7)
  if (baseline.length === 0) return null
  const peak = baseline.reduce((a, b) => (b.kg > a.kg ? b : a))
  const days = latest.d - peak.d
  if (days < 14 || peak.kg <= latest.kg) return null

  return {
    pct: Math.round(((peak.kg - latest.kg) / peak.kg) * 1000) / 10,
    fromKg: peak.kg, toKg: latest.kg, days
  }
}

/**
 * 기록된 체중이 늘고 있는가.
 *
 * 감소만 보던 것의 반대쪽이다. 치료를 마친 뒤 체중이 오르는 경우가 흔한데
 * (항호르몬 치료 중 특히), 그건 감소만큼이나 챙겨야 할 신호다.
 */
export function observedWeightGain(
  weights: Record<string, number>,
  today: string
): { pct: number; fromKg: number; toKg: number; days: number } | null {
  const dayNo = (k: string) => {
    const [y, m, d] = k.split('-').map(Number)
    return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000)
  }
  const t = dayNo(today)
  const rows = Object.entries(weights)
    .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && v > 0)
    .map(([k, v]) => ({ d: dayNo(k), kg: v }))
    .filter((r) => r.d <= t && t - r.d <= 190)
    .sort((a, b) => a.d - b.d)
  if (rows.length < 2) return null

  const latest = rows[rows.length - 1]
  const baseline = rows.filter((r) => latest.d - r.d >= 7)
  if (baseline.length === 0) return null
  const low = baseline.reduce((a, b) => (b.kg < a.kg ? b : a))
  const days = latest.d - low.d
  if (days < 14 || latest.kg <= low.kg) return null

  return {
    pct: Math.round(((latest.kg - low.kg) / low.kg) * 1000) / 10,
    fromKg: low.kg, toKg: latest.kg, days
  }
}

/**
 * 판단에 쓸 체중 감소율.
 *
 * 손으로 적으신 값과 기록에서 읽은 값 중 큰 쪽을 쓴다.
 * 처음 설정에서 적으신 값은 그때의 사실이고, 기록은 그 뒤의 사실이다.
 * 어느 쪽이든 위험을 가리키면 위험한 것으로 본다.
 */
export function effectiveLossPct(patient: PatientContext): number {
  return Math.max(patient.weightLossPct ?? 0, patient.observedLossPct ?? 0)
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
  const losing = effectiveLossPct(patient) >= 5

  /*
   * 치료를 마치신 분은 유지 수준으로 본다.
   *
   * 암종별 30~35 kcal/kg 은 악액질 위험이 있는 치료 중 환자를 위한 값이다(ESPEN).
   * 치료가 끝나고 체중도 지켜지고 있는 분께 그대로 적용하면,
   * 100 kg 인 분에게 하루 3,000 kcal 을 채우라고 하게 된다.
   * 그건 회복이 아니라 과식이고, 생존기에는 오히려 체중 관리가 재발 위험과 연결된다.
   *
   * 체중이 줄고 있거나 저체중이면 이 조정을 하지 않는다 — 그때는 채우는 것이 먼저다.
   */
  const settled = patient.phase === 'survivorship' && !losing && bmi >= 20
  const scale = losing ? 1 : gaining ? 0.87 : settled ? 0.85 : 1

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
  const loss = effectiveLossPct(patient)

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

/* ────────── 목표를 왜 그렇게 잡았는지 ────────── */

/** 하루 목표를 조정한 사유 한 건 */
export interface TargetNote {
  /** 무엇을 조정했는지 */ label: string
  /** 왜 그랬는지 */ reason: string
}

/**
 * 이 환자의 하루 목표가 기본값과 달라진 이유를 모은다.
 *
 * 앱이 조용히 목표를 낮추거나 올리면, 화면의 숫자가 왜 그 값인지 알 수 없다.
 * "왜 나는 1,500 kcal 이고 저 사람은 1,800 kcal 인가" 에 답할 수 있어야 한다.
 * 특히 낮춘 경우는 반드시 밝혀야 한다 — 모르고 보면 앱이 덜 먹으라고 하는 것처럼 보인다.
 */
export function targetNotes(patient: PatientContext): TargetNote[] {
  const out: TargetNote[] = []
  const h = patient.heightCm / 100
  const bmi = h > 0 ? patient.weightKg / (h * h) : 22
  const loss = effectiveLossPct(patient)

  const dosing = dosingWeight(patient)
  if (dosing !== patient.weightKg) {
    out.push({
      label: `보정체중 ${dosing} kg 기준`,
      reason:
        `BMI ${bmi.toFixed(1)} 로 계산에 실제 체중을 그대로 쓰면 필요량이 과대평가됩니다. ` +
        '지방 조직은 근육만큼 에너지를 쓰지 않기 때문입니다. 표준체중에 초과분의 4분의 1을 더한 값으로 계산했습니다.'
    })
  }

  if (patient.conditions.includes('체중증가') && bmi >= 23 && loss < 5) {
    out.push({
      label: '열량 목표를 한 단계 낮췄습니다',
      reason:
        '체중 증가를 걱정하고 계시고 과체중 범위입니다. 암종별 기준값은 체중을 지키거나 회복시키기 위한 것이라 ' +
        '그대로 두면 매일 "열량이 모자랍니다" 라고 말하게 됩니다. 다만 치료 중 급격한 감량은 권하지 않아 13 %만 낮췄습니다.'
    })
  }

  if (patient.phase === 'survivorship' && loss < 5 && bmi >= 20) {
    out.push({
      label: '치료를 마치셔서 유지 수준으로 잡았습니다',
      reason:
        '암종별 기준값(30~35 kcal/kg)은 치료 중 체중이 빠지는 것을 막기 위한 값입니다. ' +
        '치료가 끝나고 체중도 지켜지고 계시면 그만큼 필요하지 않고, 생존기에는 오히려 ' +
        '체중 관리가 재발 위험과 연결되는 암종이 있습니다. 체중이 줄기 시작하면 원래 목표로 돌아갑니다.'
    })
  }

  if (loss >= 5) {
    const fromRecord = (patient.observedLossPct ?? 0) >= (patient.weightLossPct ?? 0)
    out.push({
      label: `체중이 ${loss} % 줄어 목표를 낮추지 않았습니다`,
      reason:
        (fromRecord && patient.observedLossNote
          ? `기록해 주신 체중에서 읽었습니다 — ${patient.observedLossNote}. `
          : '') +
        '6개월 안에 5 % 이상 줄었다면 영양 위험 신호입니다(ESPEN/GLIM). ' +
        '이 시점에는 열량과 단백질을 채우는 것이 먼저라, 다른 조건이 있어도 목표를 낮추지 않습니다.'
    })
  } else if (patient.observedLossPct !== undefined && patient.observedLossPct > 0) {
    out.push({
      label: `기록에서 체중 ${patient.observedLossPct} % 감소가 보입니다`,
      reason:
        `${patient.observedLossNote ?? ''} 아직 위험 기준(6개월 5 %)에는 못 미치지만 방향은 감소 쪽입니다. ` +
        '이 시점부터 챙기는 것이 효과가 좋습니다. 같은 조건(아침 공복, 같은 옷차림)에서 계속 재 주세요.'
    })
  }

  return out
}

/* ────────────────── 열량·단백질·식이섬유·나트륨 밖의 것 ────────────────── */

/**
 * 지금 이분에게만 의미가 있는 미량영양소 기준.
 *
 * 데이터에는 30가지가 들어 있지만 판정은 넷(열량·단백질·식이섬유·나트륨)만 하고 있었다.
 * 그래서 앱이 제 입으로 말해 놓고 세지 않는 것들이 생겼다 —
 * "칼슘 1,000~1,200 mg 을 맞추세요" 라고 해 놓고 칼슘을 더하지 않고,
 * 신기능이 떨어진 분께 "칼륨이 높은 식품은 확인이 필요합니다" 라고 하면서
 * 하루에 얼마나 드셨는지는 알려 주지 않았다.
 *
 * 모두를 세지는 않는다. 두 가지를 다 만족하는 것만 넣는다.
 *  1) 이 환자에게 실제로 근거가 있을 것 — 모두에게 해당하는 값은 넣지 않는다
 *  2) 음식에 값이 실제로 들어 있을 것 — 칼륨 99 %, 인 94 %, 칼슘 93 %, 철 82 %
 * 비타민 D·B12 는 근거는 좋지만 값이 각각 9 %·13 % 뿐이고,
 * 무엇보다 식품으로 채우는 것이 답이 아니라(햇빛·주사) 여기서 세는 뜻이 없다.
 */
export interface MicroTarget {
  key: NutrientKey
  label: string
  unit: string
  /** 넘지 말아야 할 값 */
  max?: number
  /** 이만큼은 채워야 하는 값 */
  min?: number
  /** 왜 이분에게 이 값인지 */
  why: string
  /**
   * 이 기준이 다른 목표와 부딪치는 경우.
   *
   * 인이 그렇다. 암 환자의 단백질 목표(체중 1 kg 당 1.0~1.5 g)를 채우면
   * 단백질 1 g 마다 인이 13~15 mg 씩 따라 들어와, 70 g 만 드셔도 인이 1,000 mg 에 닿는다.
   * 즉 식품만으로 두 기준을 동시에 맞추는 것은 애초에 불가능하다.
   * 그런데도 매일 빨간 '넘음' 을 띄우면, 정작 중요한 경고까지 같이 무뎌진다.
   *
   * 그래서 단백질이 목표에 닿아 있는 날의 초과는 '참고' 로 돌리고 사정을 설명한다.
   * 단백질도 못 채우면서 인만 넘긴 날은 그냥 넘긴 것이므로 그대로 '넘음' 이다.
   *
   * 칼륨은 단백질이 아니라 먹는 양 자체와 부딪친다. 특정 음식에 몰려 있지 않고
   * 거의 모든 음식에 퍼져 있어서, 하루 2,800 kcal 이 필요한 분은 무엇을 고르셔도
   * 3,000 mg 을 넘게 된다. 추천 점수의 벌점을 다섯 배로 올려 봐도 평균이 움직이지
   * 않았다(3,078 → 3,108 mg). 엔진이 풀 수 있는 문제가 아니었다.
   */
  tensionWith?: 'protein' | 'kcal'
  evidence: EvidenceLevel
  refIds: string[]
}

export function microTargets(patient: PatientContext): MicroTarget[] {
  const out: MicroTarget[] = []
  const meds = patient.medications
  const subs = patient.subtypes ?? []
  const conds = patient.conditions

  /*
   * 칼륨 — 신기능이 떨어진 분.
   *
   * 숫자를 하나 못박지 않는다. KDOQI 2020 은 "일률적인 칼륨 제한을 뒷받침할
   * 근거가 충분하지 않으며 혈중 칼륨이 정상으로 유지되도록 조절하라" 고 본다.
   * 그러니 이 값은 목표가 아니라 '이쯤부터는 채혈 결과와 함께 보셔야 한다' 는 표시다.
   */
  if (conds.includes('신기능저하')) {
    out.push({
      key: 'k', label: '칼륨', unit: 'mg', max: 3000, tensionWith: 'kcal',
      why:
        '신기능이 떨어지면 칼륨이 잘 빠져나가지 않아 혈중 농도가 올라갈 수 있습니다. ' +
        '다만 모든 분께 일률적으로 제한하라는 근거는 아직 충분하지 않아서, 이 값은 지켜야 할 목표가 아니라 ' +
        '"이 정도부터는 채혈 결과와 함께 보셔야 한다" 는 표시로 봐 주세요. 실제 기준은 혈중 칼륨 수치입니다. ' +
        '채소는 잘게 썰어 데친 뒤 물을 버리면 칼륨이 상당히 줄어듭니다.',
      evidence: 'G', refIds: ['kdoqi2020']
    })
    out.push({
      key: 'p', label: '인', unit: 'mg', max: 1000, tensionWith: 'protein',
      why:
        '인은 신기능이 떨어지면 쌓이면서 뼈와 혈관에 영향을 줍니다. 신장내과 기준은 하루 800~1,000 mg 입니다. ' +
        '같은 양이라도 가공식품에 든 인산염 첨가물은 거의 전부 흡수되는 반면 콩·통곡의 인은 절반 정도만 흡수됩니다. ' +
        '줄이실 곳은 자연식품이 아니라 가공식품 쪽입니다.',
      evidence: 'G', refIds: ['kdoqi2020']
    })
  }

  /*
   * 칼슘 — 골밀도를 떨어뜨리는 치료를 받는 분.
   *
   * 아로마타제 억제제와 안드로겐 차단요법이 여기 해당한다.
   * 앱은 이미 두 곳에서 "1,000~1,200 mg" 이라고 말하고 있었는데 세지는 않았다.
   */
  /*
   * 약은 화면에 보이는 이름이 아니라 id 로 저장된다('ai', 'adt').
   * 처음에 '아로마타제 억제제' 라고 적어 두어 실제 사용자에게는 한 번도 걸리지 않았다.
   * 내가 만든 시험도 같은 이름을 넣어 통과했으니, 시험이 통과했다는 것이
   * 동작한다는 뜻은 아니었다.
   */
  const boneLoss =
    meds.includes('ai') || meds.includes('adt') ||
    subs.includes('안드로겐차단요법중') ||
    (patient.cancer === 'breast' && subs.includes('호르몬수용체양성'))
  if (boneLoss) {
    /*
     * 전립선암에서는 위아래가 다 있다.
     * ADT 중 뼈를 지키려면 1,000 mg 이 필요하고, 동시에 칼슘 고섭취는
     * 전립선암 위험 증가와 연관이 관찰되었다(WCRF, limited-suggestive).
     * 세지 않으면 그 사이 구간을 안내할 방법이 없다.
     */
    const ceiling = patient.cancer === 'prostate'
    out.push({
      key: 'ca', label: '칼슘', unit: 'mg', min: 1000, max: ceiling ? 1500 : undefined,
      why: ceiling
        ? '안드로겐 차단요법 중에는 골밀도가 빠르게 떨어져 하루 1,000~1,200 mg 이 필요합니다. ' +
          '한편 전립선암에서는 칼슘을 아주 많이 드시는 것이 위험 증가와 연관되어 관찰되었습니다. ' +
          '그래서 1,000 mg 은 채우되 1,500 mg 은 넘기지 않는 구간을 봅니다. 식품으로 채우는 쪽이 우선입니다.'
        : '아로마타제 억제제는 에스트로겐을 거의 없애기 때문에 골밀도가 빠르게 떨어집니다. ' +
          '하루 1,000~1,200 mg 을 식품과 보충제로 맞추는 것이 표준적 관리입니다. ' +
          '우유 1잔에 약 220 mg, 두부 반 모에 약 150 mg 들어 있습니다.',
      evidence: 'G',
      refIds: ceiling ? ['nccn-survivorship', 'wcrf-prostate'] : ['nccn-survivorship', 'kdri2020']
    })
  }

  /*
   * 철 — 위를 잘라 낸 분.
   *
   * 철은 위산이 있어야 흡수되는데 위절제 후에는 위산이 크게 준다.
   * 철결핍빈혈이 수술하고 몇 해 지나 서서히 나타나는 일이 흔하다.
   */
  if (conds.includes('위절제후') || subs.includes('위전절제') || subs.includes('위부분절제')) {
    out.push({
      key: 'fe', label: '철', unit: 'mg', min: patient.sex === 'F' && patient.age < 50 ? 14 : 10,
      why:
        '철은 위산이 있어야 잘 흡수되는데 위를 잘라 낸 뒤에는 위산이 크게 줄어듭니다. ' +
        '철결핍빈혈은 수술하고 몇 해가 지나 서서히 나타나는 경우가 많아, 식사에서 미리 챙겨 두시는 편이 좋습니다. ' +
        '고기·간·조개류의 철은 곡물·채소의 철보다 훨씬 잘 흡수되고, 비타민 C 를 같이 드시면 흡수가 올라갑니다.',
      evidence: 'G', refIds: ['gastrectomy-nutr', 'kdri2020']
    })
  }

  return out
}
