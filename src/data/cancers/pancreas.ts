import type { CancerProfile } from '../types'

export const pancreas: CancerProfile = {
  id: 'pancreas',
  name: '췌장암',
  summary:
    '췌장암은 소화효소를 만드는 장기가 망가지는 병이라, 잘 먹어도 흡수가 안 되는 상황이 자주 생깁니다. ' +
    '지방변·복부 팽만·체중 감소가 있으면 식사량이 아니라 췌장효소보충요법(PERT)이 먼저 필요한 경우가 많습니다. ' +
    '또한 췌장 절제나 종양 자체로 당뇨가 새로 생기거나 악화되는 일이 흔합니다.',
  keyIssues: [
    '외분비 기능부전으로 인한 지방 흡수장애(지방변)',
    '췌장효소보충요법의 시점과 복용법',
    '췌장성 당뇨(3c형)',
    '악액질 — 암 중 가장 심한 축',
    '십이지장 폐색·조기 포만감'
  ],
  target: {
    kcalPerKg: [30, 35],
    proteinPerKg: [1.2, 1.5],
    naLimit: 2000,
    fiberTarget: [15, 25],
    fluidPerKg: 30,
    notes: [
      '지방을 무조건 줄이기보다, 효소를 제대로 쓰면서 지방을 유지하는 쪽이 열량 확보에 유리합니다.',
      '섬유가 지나치게 많으면 효소 작용을 방해할 수 있어 목표를 다소 낮게 잡았습니다.'
    ]
  },
  rules: [
    {
      id: 'panc-pert',
      level: 'prefer',
      match: { tags: ['고지방', '고열량밀도'] },
      title: '지방을 줄이기 전에 췌장효소 복용부터 확인하세요',
      reason:
        '지방변과 체중 감소의 원인이 외분비 기능부전이라면, 지방을 제한하는 것은 열량만 잃고 문제는 그대로 두는 선택입니다. ' +
        '췌장효소제를 식사 시작과 함께(식사 중간에 나눠서) 충분한 용량으로 복용하면 지방 흡수가 회복되어 체중이 유지됩니다. ' +
        '효소는 식전에 미리 먹거나 식후에 먹으면 효과가 떨어집니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'panc-fat-symptom',
      level: 'caution',
      match: { tags: ['튀김', '고지방'] },
      title: '효소를 써도 증상이 심하면 한 끼 지방량을 나누세요',
      reason:
        '효소 용량이 충분한데도 지방변·복통이 계속되면, 한 번에 들어가는 지방량이 과한 경우가 많습니다. ' +
        '튀김처럼 지방이 몰린 음식을 줄이고 하루 5~6회로 나눠 드시면 같은 총량이라도 훨씬 잘 견딥니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'panc-diabetes',
      level: 'caution',
      match: { tags: ['고당'] },
      title: '췌장성 당뇨는 혈당이 위아래로 크게 흔들립니다',
      reason:
        '췌장 절제나 종양 침범으로 생기는 3c형 당뇨는 인슐린뿐 아니라 글루카곤도 함께 부족해져 저혈당에도 취약합니다. ' +
        '단순당을 몰아서 먹는 패턴이 특히 불리하며, 탄수화물을 매 끼 비슷하게 나누는 것이 안전합니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'panc-cachexia',
      level: 'prefer',
      match: { tags: ['고단백', '고열량밀도'], supplementCategories: ['경장영양(균형영양식)', '단백질보충'] },
      title: '췌장암에서 악액질 대응은 이르면 이를수록 좋습니다',
      reason:
        '진단 시점에 이미 절반 이상이 의미 있는 체중 감소를 겪고 있습니다. 근육량은 항암제 용량 감량·중단과 직접 연결되므로, ' +
        '식사만으로 부족하다고 판단되면 곧바로 경구영양보충을 더하는 것이 권고됩니다.',
      evidence: 'G',
      refIds: ['espen2021', 'espen-cachexia']
    },
    {
      id: 'panc-fatsoluble',
      level: 'prefer',
      match: { supplementCategories: ['비타민D', '종합비타민'] },
      title: '지용성 비타민(A·D·E·K) 결핍을 확인하세요',
      reason:
        '지방 흡수가 안 되면 지용성 비타민도 함께 빠져나갑니다. 특히 비타민 D 결핍은 흔하고, ' +
        '비타민 K 부족은 출혈 경향으로 나타날 수 있습니다. 효소 보충과 함께 혈중 농도를 확인하는 것이 원칙입니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'panc-alcohol',
      level: 'avoid',
      match: { tags: ['알코올'] },
      title: '음주는 남은 췌장 기능을 더 빠르게 무너뜨립니다',
      reason:
        '알코올은 만성 췌장염의 주된 원인이며, 이미 손상된 췌장에서는 잔여 외분비·내분비 기능의 소실을 가속합니다.',
      evidence: 'B',
      refIds: ['wcrf2018', 'iarc100e']
    }
  ],
  phaseNotes: {
    post_op:
      '휘플 수술 후에는 위 배출 지연과 덤핑이 함께 올 수 있습니다. 소량 분할식으로 시작하고 효소 용량을 증상에 맞춰 조정합니다.',
    during_chemo:
      'FOLFIRINOX 처럼 강한 요법을 견디려면 근육량 유지가 필수입니다. 체중을 매주 같은 조건에서 기록해 두면 판단이 쉬워집니다.',
    survivorship:
      '효소 보충과 혈당 관리가 장기 과제로 남습니다. 지용성 비타민과 골밀도를 주기적으로 확인합니다.'
  },
  refIds: ['espen2021', 'espen-cachexia', 'wcrf2018']
}
