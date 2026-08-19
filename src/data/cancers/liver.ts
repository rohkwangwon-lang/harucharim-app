import type { CancerProfile } from '../types'

export const liver: CancerProfile = {
  id: 'liver',
  name: '간암',
  summary:
    '간암 환자의 영양 관리는 암 자체보다 배경 간경변에 좌우되는 경우가 많습니다. 간경변에서는 근감소가 매우 흔하고 ' +
    '예후와 직접 연결되므로, 오래 굶지 않는 것과 충분한 단백질이 핵심입니다. 예전처럼 단백질을 무조건 제한하는 방식은 ' +
    '현재 권고와 맞지 않습니다. 반대로 알코올과 아플라톡신은 분명한 회피 대상입니다.',
  keyIssues: [
    '간경변에 동반된 근감소증 — 예후 인자',
    '복수·부종 시 나트륨 제한',
    '간성뇌증 — 단백질 제한이 아니라 식물성·유제품 단백질로의 전환',
    '알코올과 아플라톡신',
    '야간 공복 시간이 길면 근육이 빠진다는 점'
  ],
  target: {
    kcalPerKg: [30, 35],
    proteinPerKg: [1.2, 1.5],
    naLimit: 2000,
    fiberTarget: [25, 30],
    fluidPerKg: 30,
    notes: [
      '복수가 있으면 나트륨을 하루 2,000 mg 이하(중증에서는 1,500 mg 이하)로 제한합니다.',
      '자기 전 탄수화물 위주의 야식(late evening snack)이 근육 분해를 줄인다는 근거가 있습니다.'
    ]
  },
  rules: [
    {
      id: 'liver-alcohol',
      level: 'avoid',
      match: { tags: ['알코올'] },
      title: '간암에서 금주는 예외 없는 원칙입니다',
      reason:
        '알코올은 간세포암의 직접적 원인이자 간경변 진행의 최대 가속 요인입니다. ' +
        'B형·C형 간염이 원인인 경우에도 음주는 발암 위험을 배가시킵니다. 치료 중이든 아니든 완전한 금주가 필요합니다.',
      evidence: 'A',
      refIds: ['iarc100e', 'wcrf2018', 'easl-nutrition']
    },
    {
      id: 'liver-aflatoxin',
      level: 'avoid',
      match: { foodIds: ['peanut'] },
      title: '곰팡이가 핀 견과·곡물은 절대 드시지 마세요',
      reason:
        '아스페르길루스가 만드는 아플라톡신 B1 은 IARC Group 1 발암물질로, 간세포암의 강력한 원인입니다. ' +
        'B형 간염 보유자에서는 두 위험이 곱해지듯 작용해 위험이 수십 배로 올라갑니다. ' +
        '땅콩·옥수수·곡물을 습한 곳에 오래 두지 말고, 쓴맛이 나거나 색이 변한 것은 버리셔야 합니다.',
      evidence: 'A',
      refIds: ['iarc-aflatoxin', 'wcrf2018']
    },
    {
      id: 'liver-protein',
      level: 'prefer',
      match: { tags: ['고단백'] },
      title: '간이 나쁘다고 단백질을 줄이는 것은 오래된 오해입니다',
      reason:
        '유럽간학회 지침은 간경변 환자에게 체중 1 kg 당 1.2~1.5 g 의 단백질을 권고합니다. ' +
        '단백질 제한은 근감소를 악화시켜 오히려 예후를 나쁘게 만듭니다. ' +
        '간성뇌증이 있는 경우에도 총량을 줄이기보다 식물성 단백질과 유제품 단백질의 비중을 늘리는 방향으로 조정합니다.',
      evidence: 'G',
      refIds: ['easl-nutrition', 'espen2021']
    },
    {
      id: 'liver-lens',
      level: 'prefer',
      match: { tags: ['고열량밀도'] },
      title: '자기 전 간단한 야식이 근육 손실을 줄입니다',
      reason:
        '간경변에서는 간의 글리코겐 저장 능력이 떨어져, 하룻밤 공복이 건강한 사람의 사흘 굶은 것과 비슷한 대사 상태를 만듭니다. ' +
        '자기 전 탄수화물 50 g 정도(빵·미숫가루·영양음료 등)를 섭취하면 밤사이 근육 분해를 줄일 수 있습니다.',
      evidence: 'G',
      refIds: ['easl-nutrition']
    },
    {
      id: 'liver-bcaa',
      level: 'prefer',
      match: { supplementIds: ['bcaa-supplement'] },
      title: '간성뇌증이 반복되면 BCAA 제제를 고려합니다',
      reason:
        '분지사슬아미노산은 간경변 환자에서 근거가 축적된 몇 안 되는 보충제로, 간성뇌증 재발 감소와 ' +
        '삶의 질 개선이 보고되었습니다. 다만 처방 맥락에서 판단할 사항이며 자가 판단으로 시작할 일은 아닙니다.',
      evidence: 'B',
      refIds: ['easl-nutrition']
    },
    {
      id: 'liver-sodium-ascites',
      level: 'avoid',
      match: { tags: ['고나트륨', '염장'] },
      title: '복수가 있으면 나트륨 제한이 이뇨제만큼 중요합니다',
      reason:
        '복수의 조절은 체내 나트륨 균형에 달려 있습니다. 하루 2,000 mg(소금 5 g) 이하로 제한하는 것이 표준이며, ' +
        '국물·젓갈·장아찌·라면 국물이 실제로 제한을 깨뜨리는 주범입니다.',
      evidence: 'G',
      refIds: ['easl-nutrition']
    },
    {
      id: 'liver-raw-seafood',
      level: 'avoid',
      match: { tags: ['생식'] },
      title: '간경변이 있으면 생굴·생선회는 특히 위험합니다',
      reason:
        '간경변 환자는 비브리오 불니피쿠스 패혈증의 고위험군으로, 감염 시 치사율이 50 % 를 넘습니다. ' +
        '여름철 생굴·조개·생선회는 호중구 수치와 무관하게 피하셔야 합니다.',
      evidence: 'B',
      refIds: ['easl-nutrition', 'fda-foodsafety']
    },
    {
      id: 'liver-coffee',
      level: 'prefer',
      match: { foodIds: ['coffee-americano'] },
      title: '커피는 간에 관해서는 드물게 근거가 좋은 기호식품입니다',
      reason:
        '메타분석에서 커피 섭취량이 늘수록 간세포암 위험이 낮아지는 용량-반응 관계가 관찰되었고, ' +
        '하루 2잔 증가마다 위험이 약 35 % 낮았습니다. 디카페인에서도 비슷한 경향이 있어 카페인만의 효과는 아닌 것으로 보입니다. ' +
        '치료 목적으로 억지로 늘릴 일은 아니지만, 드시던 분이 끊을 이유는 없습니다.',
      evidence: 'B',
      refIds: ['kennedy2017coffee']
    },
    {
      id: 'liver-herbal',
      level: 'avoid',
      match: { supplementCategories: ['항산화·기타', '홍삼·인삼', '간건강'] },
      title: '출처가 불분명한 건강원 달인 물·한약재는 피하세요',
      reason:
        '국내 약인성 간손상의 상당 부분이 건강기능식품과 민간 생약에서 발생합니다. ' +
        '간 기능이 이미 떨어진 상태에서는 같은 노출에도 손상이 크게 나타나므로, ' +
        '성분과 용량이 확인되지 않은 제품은 드시지 않는 편이 안전합니다.',
      evidence: 'C',
      refIds: ['easl-nutrition']
    }
  ],
  phaseNotes: {
    during_chemo:
      '전신치료 중에는 간 기능 수치를 자주 확인하게 됩니다. 이 시기에 새 건강기능식품을 시작하면 원인 감별이 어려워집니다.',
    survivorship:
      '금주, 체중 관리, 곰팡이 노출 회피가 축입니다. 지방간이 동반된 경우 체중 감량이 그 자체로 치료가 됩니다.'
  },
  refIds: ['easl-nutrition', 'iarc-aflatoxin', 'kennedy2017coffee', 'iarc100e']
}
