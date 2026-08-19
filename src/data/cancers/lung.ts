import type { CancerProfile } from '../types'

export const lung: CancerProfile = {
  id: 'lung',
  name: '폐암',
  summary:
    '폐암에서 식이의 역할은 예방보다 "치료를 버텨내는 몸"을 만드는 데 있습니다. 진단 시점에 이미 체중이 줄어 있는 경우가 많고, ' +
    '악액질은 치료 중단과 생존 악화에 직결됩니다. 한편 베타카로틴 보충제는 흡연자에서 폐암 발생을 오히려 늘린 것으로 확인되어, ' +
    '"항산화제를 챙겨 먹겠다"는 선의가 해가 되는 대표적인 사례이기도 합니다.',
  keyIssues: [
    '진단 시부터 흔한 체중 감소와 악액질',
    '베타카로틴·비타민 A 보충제 — 흡연력이 있으면 위험',
    '방사선 식도염으로 인한 연하통',
    '숨참으로 인한 식사 지속 곤란',
    '스테로이드 병용 시 혈당 상승'
  ],
  target: {
    kcalPerKg: [30, 35],
    proteinPerKg: [1.2, 1.5],
    naLimit: 2000,
    fiberTarget: [20, 25],
    fluidPerKg: 30,
    notes: [
      '체중 감소가 진행 중이라면 열량·단백질 목표를 상단으로 잡고, 부피가 작으면서 열량이 높은 식품을 우선합니다.'
    ]
  },
  rules: [
    {
      id: 'lung-betacarotene',
      level: 'avoid',
      match: { supplementIds: ['multi-generic', 'centrum-adult'], supplementCategories: ['항산화·기타'] },
      title: '흡연력이 있다면 베타카로틴 보충제는 피해야 합니다',
      reason:
        '핀란드 ATBC 연구에서 남성 흡연자에게 베타카로틴을 투여한 군은 폐암 발생이 18 % 증가했고, ' +
        '석면 노출자·흡연자를 대상으로 한 미국 CARET 연구에서는 폐암이 28 % 증가해 시험이 조기 중단되었습니다. ' +
        '채소·과일에 든 베타카로틴은 해당되지 않으며, 문제는 분리·농축된 고용량 보충제입니다. ' +
        '종합비타민을 드신다면 베타카로틴 함량을 확인하실 필요가 있습니다.',
      evidence: 'A',
      refIds: ['atbc1994', 'caret1996', 'acs2022']
    },
    {
      id: 'lung-cachexia',
      level: 'prefer',
      match: { tags: ['고열량밀도', '고단백'] },
      title: '체중을 지키는 것이 폐암 치료에서 가장 중요한 영양 목표입니다',
      reason:
        '진행성 폐암 환자의 상당수가 진단 시 이미 체중이 줄어 있고, 6개월간 5 % 이상의 체중 감소는 ' +
        '치료 완주율 저하와 생존 악화로 이어집니다. 식사량 자체를 늘리기 어려우므로, ' +
        '같은 부피에서 열량과 단백질이 높은 식품(계란, 두부, 치즈, 견과, 경구영양보충 음료)을 우선 배치합니다.',
      evidence: 'G',
      refIds: ['espen2021', 'espen-cachexia']
    },
    {
      id: 'lung-ons',
      level: 'prefer',
      match: { supplementCategories: ['경장영양(균형영양식)', '단백질보충'] },
      title: '식사만으로 부족하면 경구영양보충을 미루지 마세요',
      reason:
        'ESPEN 은 경구 섭취가 필요량의 60 % 에 못 미치는 상태가 1~2주 이상 이어지면 경구영양보충(ONS)을 시작하도록 권고합니다. ' +
        '"밥부터 어떻게든 먹어보자"며 시간을 보내는 사이 근육이 빠지는 편이 더 흔한 문제입니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'lung-omega3',
      level: 'info',
      match: { supplementCategories: ['오메가3'] },
      title: '오메가-3 는 악액질에서 "고려할 수 있는" 수준입니다',
      reason:
        'EPA 가 염증성 사이토카인을 낮춰 근육 소실을 늦출 수 있다는 가설로 여러 연구가 이루어졌지만, ' +
        '결과가 일관되지 않아 ESPEN 은 강한 권고 대신 "고려할 수 있다"로 정리하고 있습니다. ' +
        '항응고제를 함께 쓰는 경우에는 출혈 경향을 살펴야 합니다.',
      evidence: 'C',
      refIds: ['espen-cachexia', 'espen2021']
    },
    {
      id: 'lung-esophagitis',
      level: 'prefer',
      match: { tags: ['부드러움', '수분보충'] },
      phases: ['during_rt'],
      title: '방사선 식도염이 생기면 부드럽고 자극 없는 음식으로 바꾸세요',
      reason:
        '흉부 방사선치료 2~3주째부터 식도 점막염으로 삼킬 때 통증이 생기는 경우가 많습니다. ' +
        '뜨겁고 맵고 신 음식, 거친 음식이 통증을 키우므로 미지근한 죽·계란찜·부드러운 두부·영양음료 위주로 옮깁니다. ' +
        '통증 때문에 먹는 양이 줄어드는 것이 이 시기 체중 감소의 주된 원인입니다.',
      evidence: 'G',
      refIds: ['mascc-mucositis', 'espen2021']
    },
    {
      id: 'lung-spicy-acid-rt',
      level: 'avoid',
      match: { tags: ['매운맛', '산성강함', '거친질감'] },
      phases: ['during_rt'],
      title: '흉부 방사선치료 중에는 맵고 신 음식, 거친 음식을 피하세요',
      reason:
        '식도 점막이 벗겨진 상태에서 캡사이신과 산은 직접적인 통증 자극이 되고, 튀김이나 견과류 같은 거친 음식은 ' +
        '물리적 손상을 더합니다. 치료가 끝나고 2~4주면 대개 회복되므로 한시적인 조정입니다.',
      evidence: 'G',
      refIds: ['mascc-mucositis']
    },
    {
      id: 'lung-steroid-sugar',
      level: 'caution',
      match: { tags: ['고당'] },
      phases: ['during_chemo'],
      title: '항암 전후 스테로이드를 쓰는 동안 혈당이 오릅니다',
      reason:
        '오심 예방을 위해 쓰는 덱사메타손은 투여 후 며칠간 혈당을 뚜렷하게 올립니다. ' +
        '이 시기에 단 음식이 겹치면 고혈당 증상이 나타날 수 있어, 당뇨가 있거나 경계 수치인 분은 특히 조심해야 합니다.',
      evidence: 'G',
      refIds: ['espen2021']
    }
  ],
  phaseNotes: {
    during_rt:
      '식도염이 생기기 전부터 미리 부드러운 식사로 옮겨두면 체중 감소 폭이 작습니다. 통증이 심하면 진통제를 식전에 쓰는 것도 방법입니다.',
    during_chemo:
      '오심·미각 변화가 겹치는 시기입니다. 냄새가 적은 상온 음식, 신맛이 약한 음료가 견디기 쉽습니다.',
    survivorship:
      '금연이 가장 중요합니다. 베타카로틴 보충제는 흡연력이 있다면 치료 종료 후에도 권하지 않습니다.'
  },
  refIds: ['atbc1994', 'caret1996', 'espen2021', 'espen-cachexia']
}
