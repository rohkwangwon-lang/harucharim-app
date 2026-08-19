import type { NutritionRule } from './types'

/**
 * 암종과 무관하게 적용되는 규칙.
 * 암종별 프로필의 rules 보다 먼저 평가되며, 같은 식품에 대해 암종별 규칙이
 * 더 강한 수준(avoid > caution)을 지정하면 그쪽이 표시된다.
 */
export const COMMON_RULES: NutritionRule[] = [
  // ── 확립된 위험 요인 ──────────────────────────────────────────
  {
    id: 'common-alcohol',
    level: 'avoid',
    match: { tags: ['알코올'] },
    title: '술은 치료 기간과 그 이후 모두 피하는 것이 원칙입니다',
    reason:
      '알코올은 IARC Group 1 발암물질이며, 구강·인두·후두·식도·간·대장·유방암의 위험을 높이는 것으로 확립되어 있습니다. ' +
      '치료 중에는 여기에 더해 점막 손상 악화, 간독성 약물과의 부담 중첩, 탈수 문제가 겹칩니다. ' +
      '"레드와인은 몸에 좋다"는 폴리페놀 논리는 알코올 자체의 위험을 상쇄하지 못합니다.',
    evidence: 'A',
    refIds: ['iarc100e', 'wcrf2018', 'acs2022']
  },
  {
    id: 'common-processed-meat',
    level: 'caution',
    match: { tags: ['가공육'] },
    title: '햄·소시지·베이컨 같은 가공육은 되도록 줄이세요',
    reason:
      'IARC 는 가공육을 Group 1(사람에게 발암성이 있음)으로 분류했습니다. 아질산염과 단백질이 만나 생기는 ' +
      'N-니트로소 화합물이 주된 기전으로 지목됩니다. WCRF/AICR 는 "매우 적게 먹을 것"을 권고합니다. ' +
      '완전히 끊기 어렵다면 주 1회 이하, 한 번에 소량으로 제한하는 것이 현실적인 목표입니다.',
    evidence: 'A',
    refIds: ['iarc114', 'wcrf2018']
  },
  {
    id: 'common-ultraprocessed',
    level: 'caution',
    match: { tags: ['초가공식품'] },
    title: '초가공식품이 식사의 중심이 되지 않게 하세요',
    reason:
      '나트륨·당·포화지방이 높고 단백질·미량영양소는 낮아, 같은 열량에서 얻는 영양의 질이 떨어집니다. ' +
      '치료 중처럼 먹을 수 있는 총량이 줄어든 시기에는 이 "영양 밀도" 차이가 특히 크게 작용합니다.',
    evidence: 'B',
    refIds: ['wcrf2018', 'acs2022']
  },
  {
    id: 'common-sugary-drink',
    level: 'caution',
    match: {
      restrictGroups: ['음료', '간식·디저트', '가공식품'],
      tags: ['고당'],
      nutrient: { key: 'sugar', op: '>', value: 15, basis: 'serving' }
    },
    title: '당이 많은 음료·간식은 배만 부르게 하고 영양은 남기지 않습니다',
    reason:
      '단 음료와 과자는 포만감을 만들어 실제 식사량을 줄이면서 열량만 채웁니다. 체중 유지가 필요한 환자에게는 ' +
      '차라리 단백질이 든 음료가 낫고, 체중 관리가 목표인 생존자에게는 비만을 통해 여러 암의 재발 위험과 연결됩니다. ' +
      '과일에 든 당은 식이섬유·미량영양소와 함께 들어오므로 여기서 말하는 대상이 아닙니다.',
    evidence: 'B',
    refIds: ['wcrf2018', 'acs2022']
  },

  // ── 치료 중 안전 ─────────────────────────────────────────────
  {
    id: 'common-raw-neutropenia',
    level: 'avoid',
    match: { tags: ['생식'] },
    phases: ['neutropenia'],
    title: '호중구가 낮은 동안에는 익히지 않은 음식을 피하세요',
    reason:
      '회·육회·생굴·반숙 달걀처럼 가열하지 않은 식품은 살모넬라·리스테리아·비브리오 감염의 경로가 됩니다. ' +
      '다만 이른바 "호중구감소증 식단"(생과일·생채소 전면 금지) 자체가 감염을 줄인다는 근거는 메타분석에서 확인되지 않았습니다. ' +
      '핵심은 목록을 통째로 금지하는 것이 아니라, 충분히 익히고 위생적으로 다루는 조리 원칙입니다.',
    evidence: 'B',
    refIds: ['sonbol2015', 'fda-foodsafety']
  },
  {
    id: 'common-antioxidant-rt',
    level: 'avoid',
    match: {
      supplementIds: ['koreaeundan-c1000', 'vite-400', 'selenium-generic'],
      supplementCategories: ['항산화·기타']
    },
    phases: ['during_rt', 'during_chemo'],
    title: '치료 중 고용량 항산화 보충제는 권하지 않습니다',
    reason:
      '방사선치료와 상당수 항암제는 활성산소를 통해 암세포를 죽입니다. 식품 수준을 넘는 고용량 항산화제는 ' +
      '이 기전을 방해할 수 있다는 우려가 있습니다. 두경부암 환자 대상 무작위배정 연구에서 고용량 비타민 E·베타카로틴군은 ' +
      '급성 부작용은 줄었지만 국소 재발과 사망이 오히려 늘었습니다(특히 흡연자). ' +
      '항산화 성분을 음식으로 먹는 것은 제한 대상이 아니며, 문제가 되는 것은 보충제 수준의 고용량입니다.',
    evidence: 'A',
    refIds: ['bairati2005', 'bairati2005b', 'asco2022']
  },
  {
    id: 'common-grapefruit',
    level: 'avoid',
    match: { tags: ['자몽계'] },
    title: '자몽·자몽주스는 항암제 농도를 예측할 수 없게 바꿉니다',
    reason:
      '자몽의 푸라노쿠마린이 소장의 CYP3A4 를 비가역적으로 억제해, 이 효소로 대사되는 약물의 혈중 농도를 크게 올립니다. ' +
      '한 잔만으로도 효과가 24시간 이상 지속되므로 "복용 시간을 피해서 먹는" 방식으로는 해결되지 않습니다. ' +
      '경구 표적치료제를 복용 중이라면 특히 중요합니다.',
    evidence: 'B',
    refIds: ['bailey2013grapefruit']
  },
  {
    id: 'common-sodium',
    level: 'caution',
    match: { nutrient: { key: 'na', op: '>', value: 800, basis: 'serving' } },
    title: '1회 제공량 나트륨이 800 mg 을 넘습니다',
    reason:
      '한국인의 하루 나트륨 섭취량은 권고 상한(2,000 mg)의 1.5배 수준이며, 그 대부분이 국·찌개·김치·젓갈에서 옵니다. ' +
      '국물을 남기는 것만으로 한 끼 나트륨을 절반 가까이 줄일 수 있습니다.',
    evidence: 'G',
    refIds: ['kdri2020', 'knhanes']
  },

  // ── 이득이 확인된 방향 ────────────────────────────────────────
  {
    id: 'common-vegetables',
    level: 'prefer',
    match: { groups: ['채소', '해조·버섯'] },
    title: '채소는 하루 400 g 이상을 목표로 하세요',
    reason:
      'WCRF/AICR 와 미국암학회는 생존자에게 채소·과일이 풍부한 식사를 권고합니다. ' +
      '단일 성분이 아니라 식이섬유·카로티노이드·폴리페놀이 함께 들어 있는 "식품 형태"에서 이득이 관찰되었습니다.',
    evidence: 'G',
    refIds: ['wcrf2018', 'acs2022', 'asco2022']
  },
  {
    id: 'common-protein',
    level: 'prefer',
    match: { tags: ['고단백'] },
    title: '치료 중에는 단백질을 평소보다 더 챙겨야 합니다',
    reason:
      'ESPEN 은 암 환자에게 체중 1 kg 당 1.0~1.5 g 의 단백질을 권고합니다. 60 kg 성인이라면 하루 60~90 g 으로, ' +
      '일반 성인 권장량보다 뚜렷하게 많습니다. 근육량 유지는 치료 완주율과 부작용 회복 속도에 직접 연결됩니다.',
    evidence: 'G',
    refIds: ['espen2021', 'espen-cachexia']
  },
  {
    id: 'common-neutropenic-diet-myth',
    level: 'info',
    match: { groups: ['과일', '채소'] },
    phases: ['neutropenia'],
    title: '생과일·생채소를 전면 금지할 필요는 없습니다',
    reason:
      '"호중구감소증 식단"이 감염을 줄인다는 근거는 무작위배정 연구들의 메타분석에서 확인되지 않았고, ' +
      '오히려 섭취량 감소로 영양 상태가 나빠질 수 있습니다. 껍질을 벗기거나 깨끗이 씻어 먹는 정도의 관리로 충분하다는 것이 현재의 정리입니다. ' +
      '다만 조혈모세포이식 등 심한 면역억제 상황에서는 담당 의료진의 기준을 따릅니다.',
    evidence: 'B',
    refIds: ['sonbol2015']
  }
]
