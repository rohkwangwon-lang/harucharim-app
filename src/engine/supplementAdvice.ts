import type { EvidenceLevel, PatientContext, Supplement, SupplementCategory } from '../data/types'
import { SUPPLEMENTS, SUPPLEMENT_BY_ID } from '../data/supplements'
import { activeInteractions, activeRules, evaluateSupplement } from './rules'
import { effectiveLossPct, nutritionRisk } from './nutrition'

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

/**
 * 영양제 권고의 세기.
 *
 * 'caution' 이 나중에 생겼다. 그전에는 상호작용이 '주의' 든 '금기' 든 모두
 * '피하세요' 로 나갔는데, 그 둘은 전혀 다른 말이다.
 * "갑상선호르몬제는 칼슘과 4시간 이상 띄워 드세요" 는 복용법 안내이지
 * 칼슘을 드시지 말라는 뜻이 아니다. 그런데 화면에는 빨간 '피하세요' 로 떴고,
 * 항호르몬 치료를 함께 받으시는 분은 같은 칼슘을 두고
 * '권장' 과 '피하세요' 를 나란히 보게 됐다.
 */
export type AdviceLevel = 'recommend' | 'consider' | 'caution' | 'avoid'

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
  /**
   * 분류가 아니라 이 제품 하나에 대한 말일 때.
   *
   * "셀레늄 보충제는 권하지 않습니다" 는 셀레늄에 대한 말이지
   * '아연·미네랄' 전체를 피하라는 뜻이 아니다. 그 구분이 없어서
   * 아연을 권해 드린 분이 같은 분류의 금기를 나란히 보게 됐다.
   */
  product?: Supplement
}

/**
 * 이 분류에서 이 환자에게 내놓아도 되는 제품만 고른다.
 *
 * 분류 단위로 권하는 이유는 특정 브랜드를 밀지 않기 위해서인데,
 * 분류만 보고 제품을 통째로 나열하면 그 안에 금기 제품이 섞여 나온다.
 * 실제로 "아연·미네랄"을 권하면서 셀레늄 200 µg 을 함께 보여 주고 있었다.
 * 치료 중 고용량 항산화제는 이 앱이 스스로 '피하세요'로 판정하는 것이다(근거 A).
 * 같은 화면에서 권하면서 동시에 피하라고 하는 셈이었다.
 */
function productsIn(category: SupplementCategory, patient: PatientContext): Supplement[] {
  return SUPPLEMENTS.filter(
    (s) => s.category === category && evaluateSupplement(s, patient).level !== 'avoid'
  )
}

const ORDER: Record<AdviceLevel, number> = { avoid: 0, caution: 1, recommend: 2, consider: 3 }

export function adviseSupplements(patient: PatientContext): SupplementAdvice[] {
  const out: SupplementAdvice[] = []
  const risk = nutritionRisk(patient)
  const history = patient.history ?? []
  const has = (h: string) => history.includes(h as never)
  const cond = (c: string) => patient.conditions.includes(c as never)

  const push = (a: Omit<SupplementAdvice, 'products'>) =>
    out.push({ ...a, products: productsIn(a.category, patient) })

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

  /* ── 약이 만드는 결핍 ──────────────────────────────────
   *
   * 여기까지 앱은 '무엇을 드시는가' 만 보고 있었다.
   * 그런데 검사 수치로 나타나는 결핍은 대개 드시는 것이 아니라
   * 쓰시는 약과 잘라 낸 장기에서 온다. 식품 자료에 값이 없어 셀 수 없는 것들이
   * 하필 그쪽이다 — B12·마그네슘·아연·비타민 D.
   * 세지 못한다고 말하지 않을 이유는 없다. 세는 대신 상황을 보고 말한다.
   */

  if (patient.medications.includes('ppi')) {
    push({
      level: 'consider', category: '비타민B군',
      title: '비타민 B12 — 위산분비억제제를 오래 쓰면 흡수가 떨어집니다',
      reason:
        '음식 속 B12 는 단백질에 붙어 있어서, 위산이 그 결합을 끊어 주어야 흡수됩니다. ' +
        '위산분비억제제를 2년 넘게 쓰신 분에서 B12 결핍이 더 흔했다는 대규모 관찰 연구가 있습니다. ' +
        '보충제 형태의 B12 는 단백질에 붙어 있지 않아 위산 없이도 흡수됩니다. ' +
        '역류나 궤양 때문에 꼭 필요해서 쓰는 약이므로 임의로 끊지 마시고, 대신 수치를 확인해 보세요.',
      evidence: 'B', refIds: ['lam2013ppi-b12'],
      trigger: '위산분비억제제 복용 중'
    })
    push({
      level: 'consider', category: '아연·미네랄',
      title: '마그네슘 — 드물지만 심각한 저마그네슘혈증이 보고되어 있습니다',
      reason:
        '미국 식품의약국은 위산분비억제제를 1년 이상 쓰신 분에서 저마그네슘혈증이 생길 수 있다고 알린 바 있습니다. ' +
        '흔하지는 않지만 근육 경련·부정맥·경련으로 나타날 수 있고, 보충만으로는 잘 오르지 않아 약을 조정해야 하는 경우가 있습니다. ' +
        '무턱대고 드시기보다, 증상이 있거나 오래 쓰고 계시면 채혈로 확인하는 것이 먼저입니다.',
      evidence: 'G', refIds: ['fda-ppi-mg'],
      trigger: '위산분비억제제 복용 중'
    })
  }

  if (patient.medications.includes('steroid')) {
    push({
      level: 'recommend', category: '칼슘·마그네슘',
      title: '칼슘 — 스테로이드를 오래 쓰면 뼈가 먼저 상합니다',
      reason:
        '스테로이드로 인한 골다공증은 약을 시작하고 처음 3~6개월에 가장 빠르게 진행합니다. ' +
        '미국류마티스학회는 스테로이드를 3개월 이상 쓰는 모든 성인에게 칼슘 1,000~1,200 mg 과 비타민 D 를 권고합니다. ' +
        '항암 중 오심을 막으려고 쓰는 짧은 스테로이드는 여기 해당하지 않습니다 — 오래 쓰시는 경우의 이야기입니다.',
      evidence: 'G', refIds: ['acr-giop'],
      trigger: '스테로이드 복용 중'
    })
    push({
      level: 'recommend', category: '비타민D',
      title: '비타민 D — 칼슘과 짝으로 가야 뼈에 도달합니다',
      reason:
        '스테로이드는 장에서 칼슘을 흡수하는 것을 방해하고 소변으로 칼슘을 내보냅니다. ' +
        '하루 600~800 IU 가 기준이며, 골절 위험이 높으면 골다공증 약을 따로 시작할지 담당 선생님과 상의하세요.',
      evidence: 'G', refIds: ['acr-giop', 'kdri2020'],
      trigger: '스테로이드 복용 중'
    })
  }

  /* ── 입맛이 변했을 때 ─────────────────────────────── */

  if (
    (patient.cancer === 'headneck' && patient.phase === 'during_rt') ||
    (cond('식욕부진') && (patient.phase === 'during_chemo' || patient.phase === 'during_rt'))
  ) {
    push({
      level: 'consider', category: '아연·미네랄',
      title: '아연 — 입맛이 변한 데 도움이 될 수도 있습니다. 다만 근거는 갈립니다',
      reason:
        '방사선치료와 항암 중 미각이 변하는 데 아연이 관여한다는 이야기가 오래 있었고, 실제로 아연을 준 임상시험이 여럿 있습니다. ' +
        '그런데 결과가 일치하지 않습니다 — 도움이 되었다는 시험도, 위약과 차이가 없었다는 시험도 있습니다. ' +
        '그러니 "드시면 낫습니다" 가 아니라 "해 볼 만한 것 중 하나" 정도로 봐 주세요. ' +
        '하루 25 mg 안팎이면 충분하고, 길게 고용량으로 드시면 오히려 구리 결핍이 옵니다. ' +
        '치료 중 고용량 항산화 보충은 별개로 권하지 않으니 용량을 넘기지 마세요.',
      evidence: 'C', refIds: ['lyckholm2012zinc', 'espen2021'],
      trigger: patient.cancer === 'headneck' ? '두경부 방사선치료 중' : '입맛이 없음'
    })
  }

  /* ── 간이 나쁠 때 ─────────────────────────────────── */

  if ((patient.subtypes ?? []).includes('간경변동반')) {
    push({
      level: 'consider', category: '비타민D',
      title: '비타민 D — 간경변에서는 대부분 모자랍니다',
      reason:
        '간은 비타민 D 를 활성형으로 바꾸는 첫 단계를 맡습니다. 간경변에서는 이 과정과 담즙을 통한 지방 흡수가 함께 나빠져 ' +
        '지용성 비타민이 전반적으로 떨어집니다. 유럽간학회 영양 지침은 결핍을 확인하고 교정하도록 권고합니다. ' +
        '뼈에도 관계되지만, 간경변에서는 그 자체로 결핍이 흔하다는 점이 먼저입니다.',
      evidence: 'G', refIds: ['easl-nutrition'],
      trigger: '간경변 동반'
    })
    push({
      level: 'consider', category: '아연·미네랄',
      title: '아연 — 간경변에서 흔히 떨어지고, 입맛과도 이어집니다',
      reason:
        '간경변에서는 아연이 소변으로 더 나가고 흡수도 떨어져 결핍이 흔합니다. ' +
        '입맛이 없고 음식 맛이 이상하게 느껴지는 데 관여하며, 간성뇌증과의 관련도 오래 이야기되어 왔습니다. ' +
        '다만 아연을 준다고 간성뇌증이 좋아진다는 근거는 아직 확실하지 않습니다. ' +
        '수치를 확인하고 모자랄 때 채우는 순서가 맞습니다.',
      evidence: 'C', refIds: ['easl-nutrition'],
      trigger: '간경변 동반'
    })
  }

  /* ── 장에서 새어 나가는 것 ─────────────────────────── */

  if (cond('장루보유') || cond('설사')) {
    push({
      level: 'consider', category: '아연·미네랄',
      title: '마그네슘·아연 — 묽은 변으로 계속 빠져나갑니다',
      reason:
        '설사가 오래가거나 장루 배출량이 많으면 마그네슘·아연·칼륨이 변으로 함께 나갑니다. ' +
        '마그네슘이 떨어지면 다리에 쥐가 나고 기운이 없으며, 아연이 떨어지면 상처가 늦게 아물고 입맛이 변합니다. ' +
        '다만 산화마그네슘은 그 자체로 설사를 일으키므로, 설사 중이라면 형태를 바꾸거나 다른 경로를 써야 합니다. ' +
        '수치를 확인하고 시작하는 것이 안전합니다.',
      evidence: 'C', refIds: ['nightingale2020stoma', 'espen2021'],
      trigger: cond('장루보유') ? '장루 보유' : '설사가 계속됨'
    })
  }

  /* ── 오래 못 드신 뒤 다시 드시기 시작할 때 ────────────── */

  if (risk.bmi < 16 || effectiveLossPct(patient) >= 15) {
    push({
      level: 'recommend', category: '비타민B군',
      title: '티아민(비타민 B1) — 다시 드시기 시작할 때 먼저 챙기세요',
      reason:
        '오래 굶주린 몸에 갑자기 영양을 넣으면 인·칼륨·마그네슘이 세포 안으로 한꺼번에 빨려 들어가면서 ' +
        '심장과 호흡에 무리가 오는 재영양증후군이 생길 수 있습니다. 티아민은 이때 급격히 소모되어 바닥납니다. ' +
        '영국 NICE 지침은 영양을 다시 시작하기 전이나 시작과 함께 티아민을 주고, 첫 며칠은 천천히 올리며 ' +
        '전해질을 확인하도록 권고합니다. 스스로 판단하실 일이 아니라 담당 의료진과 함께 시작하셔야 하는 부분입니다.',
      evidence: 'G', refIds: ['nice-refeeding', 'espen2021'],
      trigger: risk.bmi < 16 ? '체질량지수가 매우 낮음' : '체중이 크게 줄었음'
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

  if (risk.risk === 'high' || effectiveLossPct(patient) >= 5) {
    push({
      level: 'recommend', category: '경장영양(균형영양식)',
      title: '경구영양보충(ONS) — 지금이 시작할 시점입니다',
      reason:
        `현재 BMI ${risk.bmi}, 최근 체중 감소 ${effectiveLossPct(patient)} % 입니다. ` +
        'ESPEN 은 경구 섭취가 필요량의 60 % 에 못 미치는 상태가 이어지면 경구영양보충을 권고합니다. ' +
        '"밥부터 어떻게든 먹어보자"며 시간을 보내는 사이 근육이 빠지는 편이 더 흔한 문제입니다.',
      evidence: 'G', refIds: ['espen2021', 'espen-cachexia'],
      trigger: `체중 감소 ${effectiveLossPct(patient)} % · BMI ${risk.bmi}`
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

  /*
   * 과체중이라도 체중이 줄고 있으면 이 말을 하지 않는다.
   *
   * BMI 26 인 분이 석 달 사이 8 % 빠지고 계실 수 있다. 그때 "과체중이니
   * 영양보충 음료는 필요 없습니다" 라고 하면, 바로 위에서 같은 음료를
   * 권해 놓고 아래에서 그것을 무르는 꼴이 된다.
   * 영양불량이 과체중보다 급한 문제라는 것은 이 앱이 다른 곳에서도 쓰는 순서다(ESPEN).
   */
  if (risk.bmi >= 25 && patient.phase === 'survivorship' &&
      effectiveLossPct(patient) < 5 && !cond('체중감소')) {
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

  /*
   * 입맛이 없다고 늘 영양보충 음료가 답은 아니다.
   *
   * 치료를 마치신 뒤 과체중이고 체중도 지켜지고 있는 분이라면, 입맛이 없다는 것이
   * 곧 영양부족은 아니다. 그런데도 권해 드리는 바람에, 바로 아래에서
   * "과체중이니 필요하지 않습니다" 라고 무르는 말이 같이 떴다 —
   * 125 kg 이신 분이 한 화면에서 권장과 금기를 나란히 보게 됐다.
   * 채워야 할 이유가 있을 때만 권한다.
   */
  const settledOverweight =
    patient.phase === 'survivorship' && risk.bmi >= 25 &&
    effectiveLossPct(patient) < 5 && !cond('체중감소')
  if (cond('식욕부진') && risk.risk !== 'high' && !settledOverweight) {
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

  /*
   * 설사와 변비가 함께 적혀 있으면 섬유는 설사 쪽을 따른다.
   *
   * 실제로 둘 다 겪으시는 분이 있다 — 마약성 진통제와 항암제를 함께 쓰면
   * 며칠씩 번갈아 오기도 한다. 그런데 그때 섬유를 늘리라는 말과 멈추라는 말이
   * 한 화면에 같이 뜨면 어느 쪽도 따를 수가 없다.
   * 지금 설사가 있는 동안에는 멈추는 쪽이 먼저다.
   */
  if (cond('변비') && !cond('설사')) {
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
      /*
       * 특정 제품을 지목한 금기는 분류 전체의 이름을 달지 않는다.
       *
       * "셀레늄 보충제는 권하지 않습니다" 는 셀레늄 하나에 대한 말인데,
       * 셀레늄이 '아연·미네랄' 분류에 있다는 이유로 그 분류 전체가 '피하세요' 로 떴다.
       * 그 바람에 장루가 있어 아연을 권해 드린 분이
       * 같은 '아연·미네랄' 을 두고 권장과 금기를 나란히 보게 됐다.
       * 어느 제품 이야기인지 제목에 밝히고, 분류끼리 부딪치지 않게 한다.
       */
      const byProduct =
        level === 'avoid' &&
        (h.rule.match.supplementIds?.includes(s.id) ?? false) &&
        !(h.rule.match.supplementCategories?.includes(s.category) ?? false)
      const key = s.category + '|' + level + (byProduct ? '|' + s.id : '')
      if (seen.has(key)) continue
      seen.add(key)
      push({
        level, category: s.category,
        product: byProduct ? s : undefined,
        title: byProduct ? `${s.name} — ${h.rule.title}` : h.rule.title,
        reason: h.rule.reason,
        evidence: h.rule.evidence,
        refIds: h.rule.refIds,
        trigger: h.source === '증상' ? (h.sourceLabel ?? '증상') : '암종 특이 권고'
      })
    }
    for (const h of v.interactions) {
      if (h.interaction.level !== 'avoid' && h.interaction.level !== 'caution') continue
      /* 금기와 복용법 안내를 같은 칸에 넣지 않는다 */
      const level: AdviceLevel = h.interaction.level === 'avoid' ? 'avoid' : 'caution'
      const key = s.category + '|' + level
      if (seen.has(key)) continue
      seen.add(key)
      push({
        level, category: s.category,
        title: h.interaction.title,
        reason: h.interaction.reason,
        evidence: h.interaction.evidence,
        refIds: h.interaction.refIds,
        trigger: '복용 중인 약과의 상호작용'
      })
    }
  }

  /*
   * 마지막으로 같은 분류에서 부딪치는 말을 정리한다.
   *
   * 암종 규칙은 대체로 치료 중을 염두에 둔 일반론이다 —
   * "식사만으로 부족하면 경구영양보충을 미루지 마세요" 같은 것.
   * 그런데 그 앞에 서 계신 분이 치료를 마치고 BMI 53 이며 체중도 지켜지고 있다면,
   * 그 일반론은 이분께 맞지 않는다. 그런데도 둘 다 내보내는 바람에
   * 한 화면에서 '권장' 과 '피하세요' 를 나란히 보게 됐다.
   *
   * 이럴 때는 상황을 보고 쓴 쪽이 이긴다 — 그쪽이 이분에 대해 더 많이 알고 있다.
   * 다만 조용히 지우지는 않는다. 무엇을 물렸는지 한 줄 덧붙인다.
   * 제품 하나를 지목한 금기는 분류 전체를 막는 것이 아니므로 여기서 제외한다.
   */
  const blocked = new Set(out.filter((a) => a.level === 'avoid' && !a.product).map((a) => a.category))
  const dropped = new Map<string, string[]>()
  const kept = out.filter((a) => {
    if (a.level === 'avoid' || a.level === 'caution') return true
    if (!blocked.has(a.category)) return true
    dropped.set(a.category, [...(dropped.get(a.category) ?? []), a.title])
    return false
  })
  for (const a of kept) {
    const lost = dropped.get(a.category)
    if (a.level !== 'avoid' || a.product || !lost?.length) continue
    a.reason +=
      ` (다른 암종에서는 "${lost[0]}" 처럼 권해 드리기도 하지만, ` +
      '지금 상태에서는 그쪽이 맞지 않아 여기서는 빼 두었습니다.)'
  }

  /*
   * 아무것도 남지 않는 자리를 만들지 않는다.
   *
   * 대장암 회복기처럼 특별히 권할 것도 막을 것도 없는 조합이 있다.
   * 그때 화면이 "특별히 권하거나 피할 영양제가 없습니다" 한 줄로 비면,
   * 기능이 사라진 것처럼 보이고 실제로 그렇게 읽으신 분이 계셨다.
   *
   * 없다고 아무 말도 하지 않는 것과, 없다고 말해 주는 것은 다르다.
   * 어느 암종·어느 시기에나 해당하는 원칙 하나는 남겨 둔다 —
   * 보충제보다 식사가 먼저라는 것. 이건 권고이지 빈자리를 메우는 말이 아니다.
   */
  if (kept.length === 0) {
    kept.push({
      level: 'consider',
      category: '비타민D',
      trigger: '해당하는 규칙이 없을 때',
      title: '지금은 꼭 챙기셔야 할 보충제가 없습니다',
      reason:
        '입력하신 암종·치료 시기·증상으로는 특별히 권하거나 피해야 할 보충제가 없습니다. ' +
        '이럴 때는 보충제보다 식사가 먼저입니다. 다만 비타민 D 는 음식만으로 채우기 어렵고 ' +
        '실내 생활이 길어지면 모자라기 쉬워, 혈중 농도를 한 번 확인해 보시는 정도는 해 볼 만합니다. ' +
        '기록을 며칠 쌓으시면 기록 탭의 주간 보고에서 실제로 모자란 것을 짚어 드립니다.',
      evidence: 'G',
      refIds: ['kdri2020', 'nccn-survivorship'],
      products: productsIn('비타민D', patient)
    })
  }

  return kept.sort((a, b) => ORDER[a.level] - ORDER[b.level])
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

/* ────────────── 기록에서 드러난 부족을 채우는 영양제 ────────────── */

/**
 * 이 주에 실제로 모자랐던 것을 채워 줄 영양제.
 *
 * 위의 adviseSupplements 는 '이런 분은 모자라기 쉽습니다' 라고 상황을 보고 말한다.
 * 여기는 다르다 — 열네 날을 적으셨고 그중 열세 날 칼슘이 목표에 못 미쳤다는,
 * 이미 일어난 일을 근거로 삼는다. 추정이 아니라 기록이므로 훨씬 단단하다.
 *
 * 다만 두 가지를 지킨다.
 *
 * 하나, 식품이 먼저다. 우유 한 잔에 칼슘 220 mg 이 들어 있고, 그것이
 * 보충제보다 나은 이유는 칼슘만 들어 있지 않기 때문이다.
 * 보충제는 식사로 메우기 어려울 때 보태는 것이지 대신하는 것이 아니다.
 *
 * 둘, 이 앱이 스스로 말리는 것은 권하지 않는다. 전립선암에서 칼슘을 많이 드시는 것,
 * 치료 중 고용량 항산화제가 그렇다. 모자란다고 아무거나 채울 일이 아니다.
 */
export interface ShortfallAdvice {
  /** 무엇이 모자랐나 */
  nutrient: string
  /** 며칠 중 며칠 */
  under: number
  days: number
  category: SupplementCategory
  title: string
  reason: string
  /** 식품으로 먼저 채우는 길 */
  byFood: string
  evidence: EvidenceLevel
  refIds: string[]
  products: Supplement[]
}

/** 영양소마다, 그것을 채워 줄 자리와 식품 쪽 길 */
const FILLS: Record<string, {
  category: SupplementCategory
  title: string
  reason: string
  byFood: string
  evidence: EvidenceLevel
  refIds: string[]
}> = {
  에너지: {
    category: '경장영양(균형영양식)',
    title: '식사만으로 열량이 채워지지 않으면 경구영양보충을 더합니다',
    reason:
      '먹는 양 자체가 줄어 있을 때는 밥을 늘리기 어렵습니다. 균형영양식 한 팩이 200~300 kcal 이라 ' +
      '부피를 크게 늘리지 않고 보탤 수 있습니다. ESPEN 은 식사로 목표를 채우지 못하는 암 환자에게 이것을 권고합니다.',
    byFood: '견과 한 줌(약 180 kcal), 우유 한 잔(130), 미숫가루 한 컵(210)처럼 부피 대비 열량이 높은 것을 간식으로 더해 보세요.',
    evidence: 'G',
    refIds: ['espen2021', 'espen-cachexia']
  },
  단백질: {
    category: '단백질보충',
    title: '단백질 분말은 식사량을 늘리지 않고 단백질만 올립니다',
    reason:
      '죽·우유·국에 섞으면 부피를 거의 늘리지 않고 단백질만 더할 수 있습니다. 1스쿱이 약 25 g 입니다. ' +
      '근육량은 치료 완주율과 회복 속도에 직접 연결됩니다.',
    byFood: '계란 한 개(6 g), 두부 반 모(14), 닭가슴살 한 접시(31), 생선 한 토막(20~26)을 한 끼에 더하면 대개 채워집니다.',
    evidence: 'G',
    refIds: ['espen2021']
  },
  칼슘: {
    category: '칼슘·마그네슘',
    title: '칼슘은 식품으로 먼저, 모자라는 만큼만 보충제로',
    reason:
      '항호르몬 치료나 스테로이드로 골밀도가 떨어지는 동안에는 하루 1,000~1,200 mg 이 기준입니다. ' +
      '식품에서 이미 충분하다면 보충제를 더할 필요는 없고, 모자라는 만큼만 채우는 것이 표준적인 방법입니다. ' +
      '비타민 D 가 없으면 칼슘을 먹어도 흡수되지 않으므로 함께 보십시오.',
    byFood: '우유 한 잔 220 mg, 두부 반 모 150 mg, 뱅어포·멸치·요거트도 좋은 급원입니다.',
    evidence: 'G',
    refIds: ['nccn-survivorship', 'kdri2020']
  },
  식이섬유: {
    category: '식이섬유',
    title: '섬유는 식품이 먼저입니다 — 보충제는 그다음입니다',
    reason:
      '차전자피 같은 수용성 섬유는 물과 함께 드셔야 효과가 납니다. 물 없이 섬유만 늘리면 변이 오히려 단단해집니다. ' +
      '설사나 장루가 있는 동안에는 반대로 줄여야 하므로 이 권고가 뜨지 않습니다.',
    byFood: '채소 한 접시, 통곡 밥, 과일 한 개를 하루에 나눠 드시면 대개 채워집니다.',
    evidence: 'G',
    refIds: ['espen2021', 'wcrf2018']
  },
  철: {
    category: '철분',
    title: '철분제는 수치를 확인하고 시작하는 편이 좋습니다',
    reason:
      '위를 잘라 내신 뒤에는 위산이 줄어 철 흡수가 떨어집니다. 다만 철분제는 변비와 속쓰림이 잦고, ' +
      '필요 없는데 오래 드시면 철이 쌓입니다. 채혈로 확인하고 시작하시는 편이 좋습니다.',
    byFood: '고기·간·조개류의 철은 곡물·채소의 철보다 훨씬 잘 흡수되고, 비타민 C 를 함께 드시면 더 올라갑니다.',
    evidence: 'G',
    refIds: ['gastrectomy-nutr', 'kdri2020']
  }
}

/**
 * 지금 이분께 그 영양소를 늘리는 것이 맞는가.
 *
 * 기록에 '모자람' 으로 찍혔다고 늘 채워야 하는 것은 아니다.
 * 설사 중에는 섬유를 줄이는 것이 목표이고, 신장이 걸리는 분께는 단백질이 부담이며,
 * 전립선암에서 칼슘을 많이 드시는 것은 위험 증가와 연관이 관찰되었다.
 * 그런 자리에서는 채우라고 말하지 않는다.
 */
function wanted(nutrient: string, p: PatientContext): boolean {
  const has = (c: string) => p.conditions.includes(c as never)

  if (nutrient === '식이섬유') {
    /* 지금은 잔사를 줄이는 시기다 — 늘릴 때가 아니다 */
    if (has('설사') || has('장루보유')) return false
  }
  if (nutrient === '단백질') {
    /* 신장이 걸리면 단백질은 채혈 결과를 보고 정할 일이지 보충제로 밀 일이 아니다 */
    if (has('신기능저하') || has('간성뇌증위험')) return false
  }
  if (nutrient === '칼슘') {
    /*
     * 전립선암에서는 칼슘 고섭취가 위험 증가와 연관되어 관찰되었다(WCRF, limited-suggestive).
     * 골 보호가 필요한 ADT 중에는 그래도 채워야 하므로, 그때만 연다.
     */
    if (p.cancer === 'prostate') {
      const adt = p.medications.includes('adt') || (p.subtypes ?? []).includes('안드로겐차단요법중')
      if (!adt) return false
    }
  }
  if (nutrient === '철') {
    /* 위를 잘라 내셨거나 철이 실제로 모자란 분에게만 — 철은 남으면 쌓인다 */
    if (!has('위절제후') && !(p.subtypes ?? []).some((t) => t === '위전절제' || t === '위부분절제')) return false
  }
  return true
}

export function adviseForShortfall(
  /** reportNutrients 가 낸 것 중 모자란 것 */
  shortfalls: { label: string; under: number; days: number; tone: string }[],
  patient: PatientContext
): ShortfallAdvice[] {
  const out: ShortfallAdvice[] = []
  for (const s of shortfalls) {
    if (s.tone !== 'low') continue
    const fill = FILLS[s.label]
    if (!fill) continue

    /*
     * 모자란다고 아무거나 채울 일이 아니다.
     *
     * 지금 상태에서 그 영양소를 늘리는 것이 오히려 해가 되는 경우가 있다.
     * 설사 중에 섬유를 늘리는 것이 그렇고, 신장이 걸리는 분께 단백질을 더하는 것이 그렇다.
     * 기록에 '모자람' 으로 찍혔더라도 그때는 권하지 않는다 —
     * 목표 자체가 그 상황에서는 다르게 잡혀 있어야 하기 때문이다.
     */
    if (!wanted(s.label, patient)) continue

    /*
     * 이 앱이 스스로 말리는 것은 권하지 않는다.
     * 그 분류에 내놓을 제품이 하나도 남지 않으면 권고 자체를 접는다 —
     * 권해 놓고 보여 줄 것이 없으면 화면이 빈 채로 남는다.
     */
    const products = productsIn(fill.category, patient)
    if (products.length === 0) continue

    out.push({
      nutrient: s.label,
      under: s.under,
      days: s.days,
      category: fill.category,
      title: fill.title,
      reason: fill.reason,
      byFood: fill.byFood,
      evidence: fill.evidence,
      refIds: fill.refIds,
      products
    })
  }
  /* 오래 모자란 것부터 */
  return out.sort((a, b) => b.under / b.days - a.under / a.days)
}
