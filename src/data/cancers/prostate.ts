import type { CancerProfile } from '../types'

export const prostate: CancerProfile = {
  id: 'prostate',
  name: '전립선암',
  summary:
    '전립선암은 경과가 길어 "치료 중 영양"보다 "장기 관리"가 중심이 됩니다. 안드로겐 차단요법(ADT)을 받는 동안 ' +
    '근육이 빠지고 지방이 늘며 골밀도가 떨어지므로, 단백질·칼슘·비타민 D와 근력운동이 실질적인 개입 지점입니다. ' +
    '반면 셀레늄·비타민 E 보충제는 대규모 임상시험에서 이득이 없었고 오히려 위험을 높였습니다.',
  keyIssues: [
    'ADT 로 인한 근감소·체중 증가·골밀도 감소',
    '고용량 비타민 E·셀레늄 보충제의 위해',
    '유제품·칼슘 고섭취와 위험 증가의 연관(대장암과 방향이 반대)',
    '골반 방사선치료 중 배뇨·배변 자극 증상'
  ],
  target: {
    kcalPerKg: [25, 30],
    proteinPerKg: [1.0, 1.5],
    naLimit: 2000,
    fiberTarget: [25, 30],
    fluidPerKg: 30,
    notes: [
      'ADT 중에는 열량은 늘리지 않으면서 단백질만 올리는 방향이 맞습니다.',
      '칼슘은 하루 1,000~1,200 mg 을 넘기지 않도록 식품과 보충제를 합산해서 봅니다.'
    ]
  },
  rules: [
    {
      id: 'prostate-vite',
      level: 'avoid',
      match: { supplementIds: ['vite-400'], supplementCategories: ['항산화·기타'] },
      title: '고용량 비타민 E 보충제는 전립선암 위험을 높였습니다',
      reason:
        '35,000명 이상을 대상으로 한 SELECT 무작위배정 임상시험에서, 비타민 E 400 IU 를 복용한 군은 위약군보다 ' +
        '전립선암 발생이 17 % 더 높았습니다. 셀레늄도 예방 효과가 없었습니다. ' +
        '"항산화제가 전립선에 좋다"는 통념과 정반대 결과였고, 현재 어떤 가이드라인도 이 목적의 보충을 권하지 않습니다.',
      evidence: 'A',
      refIds: ['select2011']
    },
    {
      id: 'prostate-selenium',
      level: 'avoid',
      match: { supplementIds: ['selenium-generic'] },
      title: '셀레늄 보충제도 권하지 않습니다',
      reason:
        'SELECT 연구에서 셀레늄 200 µg 단독군은 예방 효과가 없었고, 이미 셀레늄 수치가 높았던 사람에서는 ' +
        '고위험 전립선암이 증가하는 신호가 관찰되었습니다. 결핍이 아닌 상태에서의 보충은 이득이 없습니다.',
      evidence: 'A',
      refIds: ['select2011']
    },
    {
      id: 'prostate-dairy',
      level: 'caution',
      match: { restrictGroups: ['우유·유제품'], groups: ['우유·유제품'] },
      title: '유제품과 칼슘은 "충분히"까지가 좋고 그 이상은 이득이 없습니다',
      reason:
        'WCRF/AICR 는 유제품·칼슘 고섭취와 전립선암 위험 증가 사이의 연관에 "limited-suggestive" 등급을 부여했습니다. ' +
        '근거의 강도는 대장암에서의 보호 효과보다 약하지만, 하루 칼슘 1,500 mg 을 넘기는 고용량 보충은 권할 이유가 없습니다. ' +
        'ADT 중 골 건강을 위한 1,000~1,200 mg 수준은 그와 다른 이야기입니다.',
      evidence: 'C',
      refIds: ['wcrf-prostate', 'wcrf2018']
    },
    {
      id: 'prostate-adt-protein',
      subtypes: ['안드로겐차단요법중'],
      level: 'prefer',
      match: { tags: ['고단백'] },
      title: 'ADT 중에는 단백질과 근력운동으로 근육을 지켜야 합니다',
      reason:
        '안드로겐이 차단되면 근육량이 줄고 내장지방이 늘어 인슐린 저항성과 심혈관 위험이 함께 올라갑니다. ' +
        '체중계 숫자는 그대로여도 몸의 구성이 나빠지는 것이 문제이므로, 단백질 섭취를 체중 1 kg 당 1.0~1.5 g 으로 유지하면서 ' +
        '주 2회 이상 저항운동을 병행하는 것이 권고됩니다.',
      evidence: 'G',
      refIds: ['asco2022', 'nccn-survivorship']
    },
    {
      id: 'prostate-adt-bone',
      subtypes: ['안드로겐차단요법중'],
      level: 'prefer',
      match: { supplementCategories: ['칼슘·마그네슘', '비타민D'], tags: ['고칼슘'] },
      title: 'ADT 중 칼슘·비타민 D 는 골절 예방의 기본입니다',
      reason:
        'ADT 는 골밀도를 연 2~5 % 감소시켜 골절 위험을 높입니다. 미국임상종양학회가 승인한 권고는 ' +
        '칼슘 하루 1,000~1,200 mg, 비타민 D 400~1,000 IU 보충과 정기적인 골밀도 검사입니다.',
      evidence: 'G',
      refIds: ['adt-bone', 'nccn-survivorship']
    },
    {
      id: 'prostate-lycopene',
      level: 'info',
      match: { tags: ['리코펜'] },
      title: '토마토·리코펜은 기대만큼 강한 근거는 아닙니다',
      reason:
        '리코펜과 전립선암을 다룬 관찰연구들은 방향은 좋으나 일관되지 않고, 보충제 형태의 무작위배정 연구에서는 ' +
        '뚜렷한 이득이 확인되지 않았습니다. 토마토를 즐겨 드시는 것은 좋지만 "치료 효과"로 기대하실 만한 수준은 아닙니다. ' +
        '리코펜은 기름과 함께 가열할 때 흡수가 훨씬 좋아집니다.',
      evidence: 'C',
      refIds: ['wcrf-prostate']
    },
    {
      id: 'prostate-veg-fat',
      level: 'prefer',
      match: { tags: ['고식이섬유'], groups: ['채소', '두류·대두가공'] },
      title: '식물성 위주 식사와 체중 관리가 장기적으로 가장 확실합니다',
      reason:
        '과체중·비만은 진행성 전립선암 위험과 재발 위험 모두와 연관되어 있습니다. ' +
        '채소·통곡물·콩 중심으로 옮기면서 포화지방과 총열량을 낮추는 방향이 근거가 있는 접근입니다.',
      evidence: 'B',
      refIds: ['wcrf2018', 'acs2022']
    },
    {
      id: 'prostate-rt-bowel',
      level: 'caution',
      match: { tags: ['가스유발', '고식이섬유', '매운맛', '카페인'] },
      phases: ['during_rt'],
      title: '골반 방사선치료 중에는 장·방광을 자극하는 음식을 줄이세요',
      reason:
        '치료 계획에 맞추려면 매일 직장 내 가스와 대변량이 일정해야 합니다. 가스를 많이 만드는 콩류·탄산음료는 ' +
        '치료 위치의 재현성을 떨어뜨립니다. 또한 카페인·매운 음식·알코올은 배뇨 자극 증상을 악화시킵니다.',
      evidence: 'G',
      refIds: ['espen2021']
    }
  ],
  phaseNotes: {
    during_rt:
      '치료 직전 배변을 규칙적으로 하고 가스를 줄이는 것이 자세 재현성에 도움이 됩니다. 배뇨 증상이 심하면 카페인을 줄여 보세요.',
    survivorship:
      'ADT 를 계속 받는 동안에는 단백질·칼슘·비타민 D와 저항운동이 관리의 축입니다. 비타민 E·셀레늄 보충제는 권하지 않습니다.'
  },
  refIds: ['select2011', 'wcrf-prostate', 'adt-bone', 'asco2022']
}
