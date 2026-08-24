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
