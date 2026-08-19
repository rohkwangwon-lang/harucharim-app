import type { CancerProfile } from '../types'

export const stomach: CancerProfile = {
  id: 'stomach',
  name: '위암',
  summary:
    '위암은 한국인의 식습관과 가장 직접적으로 연결된 암입니다. 염장식품과 고나트륨 식사는 위점막을 손상시키고 ' +
    'H. pylori 감염의 발암 과정을 촉진하는 것으로 알려져 있습니다. 수술을 받은 환자에게는 여기에 더해 ' +
    '덤핑증후군, 철·비타민 B12·칼슘 흡수장애라는 전혀 다른 축의 문제가 생깁니다.',
  keyIssues: [
    '염장식품·젓갈·고나트륨 국물 — 발생과 재발 양쪽에 관련',
    '위절제 후 덤핑증후군과 조기 포만감',
    '비타민 B12 흡수 불능(내인자 소실) — 평생 보충 필요',
    '철·칼슘 흡수 감소로 인한 빈혈과 골감소',
    '급격한 체중 감소'
  ],
  target: {
    kcalPerKg: [30, 35],
    proteinPerKg: [1.2, 1.5],
    naLimit: 1500,
    fiberTarget: [15, 25],
    fluidPerKg: 30,
    notes: [
      '위절제 후에는 한 번에 먹을 수 있는 양이 줄어드는 만큼 하루 5~6회로 나눠 먹는 것이 핵심입니다.',
      '나트륨 목표를 일반 권고(2,000 mg)보다 낮게 잡았습니다.'
    ]
  },
  rules: [
    {
      id: 'stomach-salted',
      level: 'avoid',
      match: { tags: ['염장'] },
      title: '젓갈·자반·장아찌 같은 염장식품은 줄여야 합니다',
      reason:
        '고농도 소금은 위점막의 방어층을 직접 손상시켜 염증과 위축성 위염을 촉진하고, H. pylori 의 집락 형성과 ' +
        'DNA 손상을 함께 증폭시킵니다. 염장식품 섭취가 많은 군에서 위암 위험이 뚜렷하게 높다는 것은 ' +
        '한국·일본 자료를 포함한 관찰연구에서 일관되게 관찰됩니다.',
      evidence: 'B',
      refIds: ['ge2012salt', 'wcrf2018', 'dagostino-kim2013']
    },
    {
      id: 'stomach-sodium',
      level: 'caution',
      match: { tags: ['고나트륨'] },
      title: '국물·찌개의 나트륨이 위암 환자에게는 특히 중요합니다',
      reason:
        '한국인 나트륨 섭취의 절반 이상이 국·찌개·김치에서 옵니다. 재료를 바꾸지 않고 국물만 남겨도 ' +
        '한 끼 나트륨을 절반 가까이 줄일 수 있어, 실천 가능성이 가장 높은 개입입니다.',
      evidence: 'B',
      refIds: ['ge2012salt', 'knhanes']
    },
    {
      id: 'stomach-kimchi',
      level: 'caution',
      match: { foodIds: ['kimchi-baechu', 'kimchi-kkakdugi'] },
      title: '김치는 완전히 끊기보다 "덜 짜게, 덜 자주"가 현실적입니다',
      reason:
        '김치에는 유산균과 식이섬유라는 이점과 높은 나트륨이라는 위험이 같이 들어 있습니다. ' +
        '한국인 대상 연구에서 위암과 관련된 것은 김치 자체보다 짠 정도와 섭취량이었습니다. ' +
        '백김치나 덜 짜게 담근 김치로 바꾸는 것이 전면 금지보다 지속 가능한 선택입니다.',
      evidence: 'C',
      refIds: ['dagostino-kim2013', 'ge2012salt']
    },
    {
      id: 'stomach-grilled',
      level: 'caution',
      match: { tags: ['직화구이', '훈제'] },
      title: '태운 부분과 훈제식품은 피하세요',
      reason:
        '고온 직화에서 생기는 다환방향족탄화수소(PAH)와 헤테로사이클릭아민(HCA)은 위·대장 점막에 대한 ' +
        '유전독성 물질로 분류됩니다. 불과 거리를 두고 굽고, 탄 부분은 잘라내는 것만으로 노출을 크게 줄일 수 있습니다.',
      evidence: 'C',
      refIds: ['wcrf2018', 'iarc114']
    },
    {
      id: 'stomach-b12',
      level: 'prefer',
      match: { supplementCategories: ['비타민B군', '종합비타민'] },
      phases: ['post_op', 'survivorship'],
      title: '위 전절제 후에는 비타민 B12 를 평생 보충해야 합니다',
      reason:
        'B12 흡수에 필요한 내인자는 위 벽세포에서 만들어집니다. 전절제 후에는 경구 섭취만으로 흡수되지 않아 ' +
        '보통 주사(월 1회 등)로 보충합니다. 아절제 후에도 시간이 지나며 결핍이 오는 경우가 많아 정기적인 확인이 필요합니다. ' +
        '결핍은 빈혈뿐 아니라 되돌리기 어려운 신경 손상으로 이어질 수 있습니다.',
      evidence: 'G',
      refIds: ['gastrectomy-nutr', 'espen2021']
    },
    {
      id: 'stomach-dumping',
      level: 'caution',
      match: { tags: ['고당'] },
      phases: ['post_op'],
      title: '위 수술 후 단 음식은 덤핑증후군을 부릅니다',
      reason:
        '농축된 당이 소장으로 급히 내려가면 삼투압으로 수분이 몰려 식은땀·어지럼·복통·설사가 나타납니다(조기 덤핑). ' +
        '2~3시간 뒤 반응성 저혈당이 오는 후기 덤핑도 흔합니다. 단 음료·주스·과자를 피하고, 식사 중 물을 많이 마시지 않으며, ' +
        '먹은 뒤 20~30분 정도 비스듬히 누워 있는 것이 도움이 됩니다.',
      evidence: 'G',
      refIds: ['gastrectomy-nutr']
    },
    {
      id: 'stomach-small-meals',
      level: 'prefer',
      match: { tags: ['고열량밀도', '고단백'] },
      phases: ['post_op'],
      title: '적은 양으로 열량과 단백질을 채우는 식품이 유리합니다',
      reason:
        '위 용적이 줄어든 상태에서는 부피가 큰 음식으로 필요량을 채우기 어렵습니다. ' +
        '계란찜·두부·생선살·경구영양보충 음료처럼 부피 대비 영양이 높은 것을 하루 5~6회로 나눠 드시는 편이 좋습니다.',
      evidence: 'G',
      refIds: ['espen2021', 'gastrectomy-nutr']
    },
    {
      id: 'stomach-bezoar',
      level: 'caution',
      match: { foodIds: ['persimmon-sweet', 'persimmon-dried'] },
      phases: ['post_op', 'survivorship'],
      title: '위 수술을 받았다면 감·곶감은 조심하세요',
      reason:
        '감의 탄닌은 위산과 만나 굳어 위석(bezoar)을 만들 수 있습니다. 위 배출 기능이 떨어진 수술 후 상태에서는 ' +
        '위석으로 인한 폐색으로 내시경 제거나 수술이 필요했던 사례가 드물지 않게 보고됩니다.',
      evidence: 'C',
      refIds: ['gastrectomy-nutr']
    },
    {
      id: 'stomach-iron-ca',
      level: 'prefer',
      match: { tags: ['철분풍부', '고칼슘'] },
      phases: ['post_op', 'survivorship'],
      title: '철분과 칼슘 흡수가 떨어지므로 의식적으로 챙겨야 합니다',
      reason:
        '철과 칼슘은 위산이 있어야 잘 흡수되는데, 위절제 후에는 위산이 크게 줄어듭니다. ' +
        '철결핍빈혈은 수술 후 수년에 걸쳐 서서히 나타나는 경우가 많고, 칼슘 흡수 감소는 골감소로 이어집니다. ' +
        '칼슘 보충이 필요하면 위산 의존도가 낮은 구연산칼슘 형태가 유리합니다.',
      evidence: 'G',
      refIds: ['gastrectomy-nutr']
    }
  ],
  phaseNotes: {
    post_op:
      '수술 직후에는 미음에서 시작해 죽·연식·일반식으로 단계적으로 올립니다. 하루 5~6회 소량 분할이 원칙이고, ' +
      '식사와 물은 30분 정도 간격을 둡니다. 체중이 수술 전보다 10 % 이상 빠졌다면 경구영양보충을 적극적으로 고려합니다.',
    during_chemo:
      '오심이 심한 시기에는 냄새가 강한 국·찌개보다 상온의 담백한 음식이 견디기 쉽습니다.',
    survivorship:
      '나트륨을 낮게 유지하고, B12·철·칼슘·비타민 D 를 정기적으로 확인합니다. H. pylori 제균 여부도 함께 점검합니다.'
  },
  refIds: ['ge2012salt', 'wcrf2018', 'gastrectomy-nutr', 'espen2021']
}
