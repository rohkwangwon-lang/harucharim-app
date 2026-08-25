import type { CancerProfile } from '../types'

export const headneck: CancerProfile = {
  id: 'headneck',
  name: '두경부암',
  summary:
    '두경부암은 치료 중 영양 문제가 가장 심한 암입니다. 구강점막염·구강건조·미각소실·연하곤란이 겹쳐, ' +
    '방사선치료 7주 동안 체중이 10 % 이상 빠지는 일이 드물지 않습니다. 이 암종에서는 "무엇을 먹으면 좋은가"보다 ' +
    '"어떻게 하면 삼킬 수 있게 만들 것인가"가 핵심 질문입니다. 고용량 항산화 보충제가 재발을 늘린 임상시험도 이 암종에서 나왔습니다.',
  keyIssues: [
    '구강·인두 점막염으로 인한 통증과 섭취 저하',
    '침샘 손상으로 인한 구강건조증 — 치료 후에도 오래 남는다',
    '미각 변화·소실',
    '연하곤란과 흡인 위험',
    '알코올·흡연 — 원인이자 이차암 위험 요인',
    '치료 중 고용량 항산화 보충제의 위해'
  ],
  target: {
    kcalPerKg: [30, 35],
    proteinPerKg: [1.2, 1.5],
    naLimit: 2000,
    fiberTarget: [15, 25],
    fluidPerKg: 35,
    notes: [
      '구강건조가 심하면 수분 목표를 높게 잡습니다.',
      '치료 전 체중이 이미 빠지고 있다면 예방적 위루관 설치를 미리 논의합니다.'
    ]
  },
  rules: [
    {
      id: 'hn-antioxidant',
      level: 'avoid',
      match: { supplementIds: ['koreaeundan-c1000', 'vite-400', 'selenium-generic'], supplementCategories: ['항산화·기타'] },
      phases: ['during_rt', 'during_chemo'],
      /* 항암 중인 분께도 뜨므로 제목이 방사선치료만 가리키지 않게 한다 — 근거는 방사선치료 시험이고 그것은 본문에 적는다 */
      title: '치료 중 고용량 항산화 보충제는 재발을 늘렸다는 연구가 있습니다',
      reason:
        '이 규칙은 방사선치료 중이든 항암치료 중이든 어느 시기에나 같습니다. ' +
        '두경부암 환자 540명을 대상으로 방사선치료 중 고용량 항산화 비타민을 투여한 무작위배정 연구에서, ' +
        '급성 부작용은 줄었지만 국소 재발이 늘고 전체 사망도 증가하는 경향이 확인되었습니다(특히 치료 중 흡연자). ' +
        '이 결과는 두경부암 방사선치료에서 항산화 보충제를 피해야 할 근거로 널리 인용됩니다.',
      evidence: 'A',
      refIds: ['bairati2005', 'bairati2005b']
    },
    {
      id: 'hn-mucositis-avoid',
      level: 'avoid',
      match: { tags: ['매운맛', '산성강함', '거친질감'] },
      phases: ['during_rt', 'during_chemo'],
      title: '점막염 기간에는 맵고 신 음식, 거친 음식을 완전히 빼세요',
      reason:
        '벗겨진 구강 점막에 캡사이신·산·소금은 직접적인 통증 자극이 됩니다. ' +
        '토마토·감귤·파인애플·식초·김치·과자류가 흔한 원인입니다. 통증으로 못 먹는 것이 이 시기 체중 감소의 거의 전부이므로, ' +
        '자극을 없애는 것 자체가 영양 개입입니다.',
      evidence: 'G',
      refIds: ['mascc-mucositis']
    },
    {
      id: 'hn-soft-moist',
      level: 'prefer',
      match: { tags: ['부드러움', '수분보충'] },
      title: '부드럽고 촉촉하고 미지근한 것 — 이 세 가지가 기준입니다',
      reason:
        '침이 줄면 마른 음식은 입안에서 뭉쳐 삼킬 수 없게 됩니다. 국물·소스·요거트·계란찜처럼 수분을 머금은 형태로 바꾸고, ' +
        '뜨겁거나 차가운 극단적 온도를 피하면 같은 음식도 훨씬 편하게 드실 수 있습니다.',
      evidence: 'G',
      refIds: ['mascc-mucositis', 'iddsi']
    },
    {
      id: 'hn-dense-calorie',
      level: 'prefer',
      match: { tags: ['고열량밀도', '고단백'], supplementCategories: ['경장영양(균형영양식)', '단백질보충'] },
      title: '먹을 수 있는 양이 적으니 한 입의 밀도를 올려야 합니다',
      reason:
        '삼킬 수 있는 총량이 제한된 상태에서 죽만 드시면 하루 필요 열량의 절반도 채우기 어렵습니다. ' +
        '같은 부피에 열량과 단백질을 더하는 방법(죽에 참기름·달걀·단백질분말 섞기, 우유에 미숫가루 타기, 영양음료 추가)이 실질적입니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'hn-alcohol',
      level: 'avoid',
      match: { tags: ['알코올'] },
      title: '두경부암에서 음주는 원인이자 이차암의 위험 요인입니다',
      reason:
        '알코올과 흡연은 두경부 편평상피암의 주된 원인이며, 두 가지가 겹치면 위험이 곱해집니다. ' +
        '치료 후에도 계속 마시면 이차 원발암 발생이 뚜렷하게 늘어납니다. 점막염 시기에는 통증 자극이라는 문제까지 더해집니다.',
      evidence: 'A',
      refIds: ['iarc100e', 'bairati2005b', 'wcrf2018']
    },
    {
      id: 'hn-dry-mouth',
      level: 'caution',
      match: { tags: ['카페인', '알코올'] },
      phases: ['survivorship'],
      title: '구강건조증이 남았다면 카페인과 알코올은 증상을 악화시킵니다',
      reason:
        '침샘 손상은 치료 후 수개월에서 수년까지 이어지는 경우가 많습니다. 이뇨 작용이 있는 카페인·알코올은 구강건조를 더 심하게 만들고, ' +
        '침의 완충 작용이 없어진 상태에서 당까지 겹치면 방사선 우식증이 빠르게 진행합니다.',
      evidence: 'G',
      refIds: ['nccn-survivorship', 'mascc-mucositis']
    },
    {
      id: 'hn-caries',
      level: 'caution',
      match: { tags: ['고당'] },
      phases: ['survivorship'],
      title: '침이 줄어든 입에서 단 음식은 충치로 직행합니다',
      reason:
        '방사선 우식증은 치아 목 부위에서 빠르게 진행해 발치로 이어지고, 턱뼈 괴사 위험까지 만듭니다. ' +
        '단 음료를 자주 조금씩 마시는 습관이 특히 나쁘며, 불소 도포와 정기 치과 검진이 함께 필요합니다.',
      evidence: 'G',
      refIds: ['nccn-survivorship']
    },
    {
      id: 'hn-aspiration',
      level: 'caution',
      // 국·죽까지 잡지 않도록 음료로 한정한다. 문제가 되는 것은 물처럼 묽은 액체다.
      match: { restrictGroups: ['음료'], tags: ['수분보충'] },
      title: '물처럼 묽은 액체가 오히려 사레의 원인이 됩니다',
      reason:
        '연하곤란에서는 묽은 액체가 가장 빠르게 흘러 기도로 넘어갑니다. 점도증진제로 걸쭉하게 만들면 흡인이 줄어듭니다. ' +
        '삼킬 때 기침이 나거나 목소리가 젖은 소리로 변하면 연하 평가를 받으셔야 합니다.',
      evidence: 'G',
      refIds: ['iddsi']
    }
  ],
  phaseNotes: {
    during_rt:
      '3주째부터 점막염이 본격화됩니다. 그 전에 미리 연식·액상으로 옮기고 체중을 주 1회 기록하세요. ' +
      '치료 중 흡연은 결과를 뚜렷하게 나쁘게 만듭니다.',
    survivorship:
      '구강건조와 연하 기능은 서서히 회복되지만 완전히 돌아오지 않는 경우도 많습니다. ' +
      '수분 섭취, 불소 관리, 삼킴 재활 운동을 꾸준히 이어가는 것이 중요합니다.'
  },
  refIds: ['bairati2005', 'bairati2005b', 'mascc-mucositis', 'iddsi', 'espen2021']
}
