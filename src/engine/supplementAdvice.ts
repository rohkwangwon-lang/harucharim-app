import type { EvidenceLevel, PatientContext, Supplement, SupplementCategory } from '../data/types'
import { SUPPLEMENTS, SUPPLEMENT_BY_ID } from '../data/supplements'
import { activeInteractions, activeRules, evaluateSupplement } from './rules'
import { nutritionRisk } from './nutrition'

/**
 * 영양제 개인 맞춤 추천.
 *
 * 암종 규칙만으로는 부족하다. 실제로 무엇이 필요한지는 대개 다음에서 갈린다.
 *   - 치료 이력  : 위 전절제면 B12, 항호르몬치료면 칼슘·비타민 D
 *   - 체격·체중  : 저체중이나 체중 감소가 있으면 경구영양보충
 *   - 동반 증상  : 변비면 수용성 섬유, 설사면 오히려 제한
 *   - 복용 약제  : 상호작용으로 아예 피해야 하는 것
 *
 * 그래서 규칙 엔진 위에 이 층을 따로 둔다.
 * 근거 없이 "면역력에 좋다"는 식의 추천은 만들지 않는다.
 */

export type AdviceLevel = 'recommend' | 'consider' | 'avoid'

export interface SupplementAdvice {
  level: AdviceLevel
  /** 분류 단위로 추천한다 — 특정 브랜드를 밀지 않기 위해서다 */
  category: SupplementCategory
  title: string
  reason: string
  evidence: EvidenceLevel
  refIds: string[]
  /** 이 추천을 만든 근거가 된 환자 조건 */
  trigger: string
  /** 해당 분류의 실제 제품들 */
  products: Supplement[]
}

function productsIn(category: SupplementCategory): Supplement[] {
  return SUPPLEMENTS.filter((s) => s.category === category)
}

const ORDER: Record<AdviceLevel, number> = { avoid: 0, recommend: 1, consider: 2 }

export function adviseSupplements(patient: PatientContext): SupplementAdvice[] {
  const out: SupplementAdvice[] = []
  const risk = nutritionRisk(patient)
  const history = patient.history ?? []
  const has = (h: string) => history.includes(h as never)
  const cond = (c: string) => patient.conditions.includes(c as never)

  const push = (a: Omit<SupplementAdvice, 'products'>) =>
    out.push({ ...a, products: productsIn(a.category) })

  /* ── 치료 이력에서 오는 결핍 ─────────────────────────── */

  if (cond('위절제후')) {
    push({
      level: 'recommend', category: '비타민B군',
      title: '비타민 B12 — 위 절제 후에는 보충이 필수입니다',
      reason:
        'B12 흡수에 필요한 내인자는 위 벽세포에서 만들어집니다. 전절제 후에는 먹어서 흡수되지 않아 보통 주사로 보충하고, ' +
        '아절제 후에도 수년에 걸쳐 결핍이 나타나는 경우가 많습니다. 결핍은 빈혈뿐 아니라 되돌리기 어려운 신경 손상으로 이어집니다.',
      evidence: 'G', refIds: ['gastrectomy-nutr', 'espen2021'],
      trigger: '위절제 후'
    })
    push({
      level: 'recommend', category: '철분',
      title: '철분 — 위산이 줄어 흡수가 떨어집니다',
      reason:
        '철은 위산이 있어야 잘 흡수되는데 위 절제 후에는 위산이 크게 줄어듭니다. ' +
        '철결핍빈혈이 수술 후 수년에 걸쳐 서서히 나타나는 경우가 흔하니 정기적으로 확인하세요. ' +
        '다만 철분제는 변비·속쓰림이 잦아 수치를 확인하고 시작하는 것이 좋습니다.',
      evidence: 'G', refIds: ['gastrectomy-nutr'],
      trigger: '위절제 후'
    })
    push({
      level: 'consider', category: '칼슘·마그네슘',
      title: '칼슘 — 탄산칼슘보다 구연산칼슘이 유리합니다',
      reason:
        '탄산칼슘은 위산이 있어야 녹습니다. 위 절제를 받았거나 위산분비억제제를 쓰고 있다면 ' +
        '위산에 덜 의존하는 구연산칼슘 형태를 고르는 편이 낫습니다.',
      evidence: 'B', refIds: ['gastrectomy-nutr'],
      trigger: '위절제 후'
    })
  }

  if (has('항호르몬치료') || patient.medications.includes('ai') || patient.medications.includes('adt')) {
    push({
      level: 'recommend', category: '칼슘·마그네슘',
      title: '칼슘 — 항호르몬 치료 중 골 소실을 늦춥니다',
      reason:
        '아로마타제 억제제와 안드로겐 차단요법은 골밀도를 빠르게 떨어뜨립니다. ' +
        '하루 1,000~1,200 mg 을 식품과 보충제로 합쳐 맞추는 것이 표준 관리이고, 여기에 체중 부하 운동을 더합니다. ' +
        '식품에서 이미 충분하다면 보충제를 추가할 필요는 없습니다.',
      evidence: 'G', refIds: ['adt-bone', 'nccn-survivorship'],
      trigger: '항호르몬 치료 중'
    })
    push({
      level: 'recommend', category: '비타민D',
      title: '비타민 D — 칼슘과 함께 가야 의미가 있습니다',
      reason:
        '비타민 D 가 없으면 칼슘을 먹어도 흡수되지 않습니다. 하루 800~1,000 IU 수준이 표준이며, ' +
        '아로마타제 억제제 관절통이 심한 경우 결핍 교정이 증상 완화에 도움이 된다는 보고가 있습니다.',
      evidence: 'G', refIds: ['adt-bone', 'nccn-survivorship', 'kdri2020'],
      trigger: '항호르몬 치료 중'
    })
  }

  if (has('항암화학요법') || patient.phase === 'during_chemo') {
    if (patient.medications.includes('cisplatin')) {
      push({
        level: 'consider', category: '아연·미네랄',
        title: '마그네슘 — 시스플라틴은 소변으로 마그네슘을 빼앗습니다',
        reason:
          '시스플라틴은 신세뇨관을 손상시켜 저마그네슘혈증·저칼륨혈증을 자주 일으킵니다. ' +
          '혈중 수치를 확인하고 필요하면 보충하는 순서가 맞습니다. 자가 판단으로 시작할 일은 아닙니다.',
        evidence: 'G', refIds: ['espen2021'],
        trigger: '시스플라틴 사용 중'
      })
    }
    if (patient.medications.includes('methotrexate')) {
      push({
        level: 'avoid', category: '종합비타민',
        title: '엽산이 든 종합비타민을 임의로 추가하지 마세요',
        reason:
          '메토트렉세이트는 엽산 대사를 차단해 작용합니다. 엽산 보충의 시점과 용량은 치료 목적에 따라 정해지므로, ' +
          '엽산이 들어간 종합비타민을 스스로 더하면 계획이 흐트러질 수 있습니다.',
        evidence: 'G', refIds: ['espen2021'],
        trigger: '메토트렉세이트 사용 중'
      })
    }
  }

  /* ── 체격·영양 상태 ─────────────────────────────────── */

  if (risk.risk === 'high' || (patient.weightLossPct ?? 0) >= 5) {
    push({
      level: 'recommend', category: '경장영양(균형영양식)',
      title: '경구영양보충(ONS) — 지금이 시작할 시점입니다',
      reason:
        `현재 BMI ${risk.bmi}, 최근 체중 감소 ${patient.weightLossPct ?? 0} % 입니다. ` +
        'ESPEN 은 경구 섭취가 필요량의 60 % 에 못 미치는 상태가 이어지면 경구영양보충을 권고합니다. ' +
        '"밥부터 어떻게든 먹어보자"며 시간을 보내는 사이 근육이 빠지는 편이 더 흔한 문제입니다.',
      evidence: 'G', refIds: ['espen2021', 'espen-cachexia'],
      trigger: `체중 감소 ${patient.weightLossPct ?? 0} % · BMI ${risk.bmi}`
    })
    push({
      level: 'consider', category: '단백질보충',
      title: '단백질 분말 — 식사량을 늘리지 않고 단백질만 올릴 때',
      reason:
        '먹을 수 있는 양 자체가 줄어든 상태에서는 밥을 늘리기 어렵습니다. ' +
        '죽·우유·국에 섞으면 부피를 거의 늘리지 않고 단백질만 더할 수 있습니다. 1스쿱이 단백질 약 25 g 입니다.',
      evidence: 'G', refIds: ['espen2021'],
      trigger: '체중 감소 진행 중'
    })
  }

  if (risk.bmi >= 25 && patient.phase === 'survivorship') {
    push({
      level: 'avoid', category: '경장영양(균형영양식)',
      title: '균형영양식은 지금 필요하지 않습니다',
      reason:
        `BMI ${risk.bmi} 로 과체중 범위이고 치료가 끝난 시기입니다. 이 상태에서 영양보충 음료를 더하면 ` +
        '체중만 늘립니다. 이 시기에 근거가 있는 것은 보충이 아니라 체중 관리와 운동입니다.',
      evidence: 'B', refIds: ['asco2022', 'acs2022'],
      trigger: `BMI ${risk.bmi} · 치료 종료 후`
    })
  }

  /* ── 증상 ───────────────────────────────────────────── */

  if (cond('식욕부진') && risk.risk !== 'high') {
    push({
      level: 'consider', category: '경장영양(균형영양식)',
      title: '경구영양보충 — 식사량이 줄어든 날의 보완책으로',
      reason:
        '아직 체중이 크게 줄지는 않았지만 먹는 양이 줄어 있는 상태입니다. ' +
        '이 시기에 부피가 작으면서 열량과 단백질이 높은 영양음료를 하루 1팩 정도 더하면, ' +
        '체중이 빠지기 시작한 뒤에 대응하는 것보다 훨씬 수월합니다. ' +
        '식사를 대신하는 것이 아니라 식사 사이에 더하는 것이 원칙입니다.',
      evidence: 'G', refIds: ['espen2021'],
      trigger: '식욕부진'
    })
  }

  if (cond('오심·구토') || cond('미각변화' as never)) {
    push({
      level: 'consider', category: '아연·미네랄',
      title: '아연 — 미각 변화에 흔히 쓰이지만 근거는 엇갈립니다',
      reason:
        '항암 중 미각 변화에 아연 보충이 널리 쓰이지만, 무작위배정 연구 결과는 일관되지 않습니다. ' +
        '결핍이 확인되면 교정할 이유가 분명하지만, 그렇지 않다면 효과를 크게 기대하기는 어렵습니다. ' +
        '장기간 고용량은 구리 결핍을 유발하므로 몇 주 써 보고 변화가 없으면 중단하는 편이 낫습니다.',
      evidence: 'C', refIds: ['espen2021'],
      trigger: '오심·미각 변화'
    })
  }

  if (cond('변비')) {
    push({
      level: 'recommend', category: '식이섬유',
      title: '차전자피 — 물과 함께 드셔야 효과가 납니다',
      reason:
        '수용성 섬유가 변에 수분을 잡아 둡니다. 다만 물 없이 섬유만 늘리면 변이 오히려 더 단단해지므로, ' +
        '하루 1.5~2 L 의 수분과 반드시 함께 늘려야 합니다. 마약성 진통제로 인한 변비라면 섬유만으로는 부족해 완하제가 필요합니다.',
      evidence: 'G', refIds: ['espen2021'],
      trigger: '변비'
    })
  }

  if (cond('설사')) {
    push({
      level: 'avoid', category: '식이섬유',
      title: '설사 중에는 불용성 섬유 보충을 멈추세요',
      reason:
        '설사가 있는 동안 섬유 보충제를 더하면 대개 악화됩니다. 먼저 수분과 전해질을 채우고, ' +
        '잔사가 적은 식사로 옮기는 것이 순서입니다.',
      evidence: 'G', refIds: ['espen2021'],
      trigger: '설사'
    })
  }

  if (cond('호중구감소증') || patient.phase === 'neutropenia') {
    push({
      level: 'avoid', category: '유산균',
      title: '유산균 보충제는 이 시기에 권하지 않습니다',
      reason:
        '중증 호중구감소증이나 중심정맥관을 가진 환자에서 프로바이오틱스 균에 의한 균혈증·패혈증 사례가 보고되었습니다. ' +
        '김치·요거트 같은 일반 식품 수준과, 고농도 균을 넣은 보충제는 구분해서 판단해야 합니다.',
      evidence: 'C', refIds: ['fda-foodsafety'],
      trigger: '호중구감소증'
    })
  }

  /* ── 치료 중 항산화제 ───────────────────────────────── */

  if (patient.phase === 'during_rt' || patient.phase === 'during_chemo') {
    push({
      level: 'avoid', category: '항산화·기타',
      title: '치료 중 고용량 항산화 보충제는 피하세요',
      reason:
        '방사선치료와 상당수 항암제는 활성산소를 통해 암세포를 죽입니다. 식품 수준을 넘는 고용량 항산화제가 ' +
        '이 기전을 방해할 수 있다는 우려가 있고, 두경부암 환자 무작위배정 연구에서는 고용량 비타민 E·베타카로틴군의 ' +
        '국소 재발과 사망이 오히려 늘었습니다. 음식으로 먹는 항산화 성분은 해당되지 않습니다.',
      evidence: 'A', refIds: ['bairati2005', 'bairati2005b', 'asco2022'],
      trigger: '치료 중'
    })
  }

  /* ── 암종 규칙에서 올라오는 것 ──────────────────────── */

  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  const seen = new Set(out.map((a) => a.category + '|' + a.level))

  for (const s of SUPPLEMENTS) {
    const v = evaluateSupplement(s, patient, cached)
    for (const h of v.hits) {
      if (h.source === '공통') continue
      const level: AdviceLevel | null =
        h.rule.level === 'avoid' ? 'avoid' : h.rule.level === 'prefer' ? 'recommend' : null
      if (!level) continue
      const key = s.category + '|' + level
      if (seen.has(key)) continue
      seen.add(key)
      push({
        level, category: s.category,
        title: h.rule.title,
        reason: h.rule.reason,
        evidence: h.rule.evidence,
        refIds: h.rule.refIds,
        trigger: h.source === '증상' ? (h.sourceLabel ?? '증상') : '암종 특이 권고'
      })
    }
    for (const h of v.interactions) {
      if (h.interaction.level !== 'avoid' && h.interaction.level !== 'caution') continue
      const key = s.category + '|avoid'
      if (seen.has(key)) continue
      seen.add(key)
      push({
        level: 'avoid', category: s.category,
        title: h.interaction.title,
        reason: h.interaction.reason,
        evidence: h.interaction.evidence,
        refIds: h.interaction.refIds,
        trigger: '복용 중인 약과의 상호작용'
      })
    }
  }

  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level])
}

/** 현재 복용 중인 것 가운데 이 환자에게 문제가 되는 것 */
export function reviewCurrentSupplements(patient: PatientContext, takingIds: string[]) {
  const cached = { rules: activeRules(patient), interactions: activeInteractions(patient) }
  return takingIds
    .map((id) => SUPPLEMENT_BY_ID[id])
    .filter(Boolean)
    .map((s) => evaluateSupplement(s, patient, cached))
    .filter((v) => v.level === 'avoid' || v.level === 'caution')
}
