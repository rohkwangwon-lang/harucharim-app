import type { CancerProfile } from '../types'

export const colorectal: CancerProfile = {
  id: 'colorectal',
  name: '대장암',
  summary:
    '대장암은 식이 근거가 가장 두껍게 쌓인 암입니다. 가공육과 적색육은 위험을 높이고, 식이섬유·통곡물·유제품은 낮추는 쪽으로 ' +
    'WCRF 가 "convincing/probable" 등급을 부여했습니다. 진단 후 식이섬유 섭취가 많은 환자에서 사망률이 낮았다는 코호트 결과도 있습니다. ' +
    '다만 수술 직후나 장 협착·장루 보유 상태에서는 오히려 섬유를 줄여야 하므로, 시기 구분이 중요합니다.',
  keyIssues: [
    '가공육·적색육 섭취',
    '수술 직후·장 협착 시의 저잔사식과, 회복 후의 고섬유식이 정반대 방향이라는 점',
    '장루 보유 시 가스·냄새·수분 손실 관리',
    '골반 방사선치료로 인한 설사',
    '비만과 신체활동 부족'
  ],
  target: {
    kcalPerKg: [25, 30],
    proteinPerKg: [1.0, 1.5],
    naLimit: 2000,
    fiberTarget: [25, 35],
    fluidPerKg: 30,
    notes: [
      '섬유 목표는 회복기 이후 기준입니다. 수술 직후·협착·급성 설사 시에는 하루 10 g 이하의 저잔사식으로 낮춥니다.'
    ]
  },
  rules: [
    {
      id: 'crc-processed-meat',
      level: 'avoid',
      match: { tags: ['가공육'] },
      title: '가공육은 대장암에서 가장 명확한 회피 대상입니다',
      reason:
        'IARC 는 가공육을 Group 1 로 분류하면서, 하루 50 g 섭취마다 대장암 위험이 약 18 % 증가한다고 정리했습니다. ' +
        '햄 2~3장, 소시지 1개 정도가 그 50 g 에 해당합니다. 부대찌개처럼 가공육이 주재료인 메뉴가 우선 조정 대상입니다.',
      evidence: 'A',
      refIds: ['iarc114', 'wcrf2018']
    },
    {
      id: 'crc-red-meat',
      level: 'caution',
      match: { tags: ['적색육'] },
      title: '적색육은 주당 조리 후 500 g 이내로 제한하세요',
      reason:
        'WCRF/AICR 는 적색육(소·돼지·양)을 주당 조리 후 350~500 g 이내로 권고합니다. 하루 한 끼 고기반찬 정도의 양입니다. ' +
        '헴철이 장내에서 N-니트로소 화합물 생성을 촉진하는 것이 주요 기전으로 지목됩니다. 완전히 끊을 필요는 없으며, ' +
        '가금류·생선·콩으로 일부를 대체하는 방식이 현실적입니다.',
      evidence: 'A',
      refIds: ['wcrf2018', 'iarc114']
    },
    {
      id: 'crc-fiber',
      level: 'prefer',
      match: { tags: ['고식이섬유'] },
      phases: ['survivorship', 'all'],
      title: '회복 후에는 식이섬유를 하루 25~35 g 으로 올리세요',
      reason:
        '전향적 코호트에서 진단 후 식이섬유 섭취가 많은 대장암 환자는 대장암 특이 사망이 낮았고, ' +
        '섬유를 하루 5 g 늘릴 때마다 사망률이 추가로 감소하는 용량-반응 관계가 관찰되었습니다. ' +
        '특히 통곡물에서 온 섬유의 연관성이 강했습니다.',
      evidence: 'B',
      refIds: ['song2018fiber', 'wcrf2018', 'vanblarigan2018']
    },
    {
      id: 'crc-lowresidue',
      level: 'prefer',
      match: { tags: ['저잔사', '부드러움'] },
      phases: ['post_op'],
      title: '수술 직후에는 반대로 섬유를 줄인 저잔사식이 필요합니다',
      reason:
        '문합부가 아무는 동안에는 대변량과 장운동 부담을 줄이는 것이 우선입니다. ' +
        '흰밥·흰죽·껍질 벗긴 부드러운 채소 위주로 시작해 4~6주에 걸쳐 서서히 섬유를 늘립니다. ' +
        '이 시기의 고섬유식은 이득이 아니라 부담입니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'crc-highfiber-stricture',
      // 수술을 받았다고 모두 협착이나 장루가 있는 것은 아니다.
      // 장루보유를 동반 상태로 고르면 cond-stoma-fiber 가 함께 걸린다.
      level: 'caution',
      match: { tags: ['고식이섬유', '거친질감'] },
      phases: ['post_op'],
      title: '수술 직후 질긴 섬유는 조심하세요 — 협착·장루가 있다면 특히',
      reason:
        '버섯 밑동, 팽이버섯, 나물 줄기, 견과류처럼 질긴 섬유는 좁아진 부위나 장루 입구를 막을 수 있습니다. ' +
        '충분히 잘게 썰고 오래 씹는 것이 기본이며, 증상이 있으면 해당 식품을 잠시 제외합니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'crc-calcium-dairy',
      level: 'prefer',
      match: { tags: ['고칼슘'], groups: ['우유·유제품'] },
      title: '유제품과 칼슘은 대장암 위험을 낮추는 쪽입니다',
      reason:
        'WCRF/AICR 는 유제품과 칼슘 섭취가 대장암 위험을 낮춘다는 근거에 "probable" 등급을 부여했습니다. ' +
        '칼슘이 장내 담즙산과 유리지방산을 결합해 점막 자극을 줄이는 것이 기전으로 제시됩니다. ' +
        '단, 이 방향은 전립선암에서는 정반대이므로 암종을 구분해서 보아야 합니다.',
      evidence: 'B',
      refIds: ['wcrf2018']
    },
    {
      id: 'crc-vitd',
      level: 'info',
      match: { supplementCategories: ['비타민D'] },
      title: '비타민 D 는 결핍 교정 수준까지가 근거가 있는 범위입니다',
      reason:
        '전이성 대장암 환자를 대상으로 고용량 비타민 D3 를 항암제에 추가한 SUNSHINE 무작위배정 연구에서 ' +
        '무진행생존의 개선은 통계적으로 유의하지 않았습니다(다차원 분석에서만 일부 신호). ' +
        '결핍이 있으면 교정하되, 항암 효과를 기대한 초고용량 복용을 뒷받침할 근거는 아직 없습니다.',
      evidence: 'A',
      refIds: ['ng2019', 'manson2019']
    },
    {
      id: 'crc-diarrhea-rt',
      level: 'prefer',
      match: { tags: ['저잔사', '저FODMAP'] },
      phases: ['during_rt'],
      title: '골반 방사선치료 중 설사가 있으면 잔사와 유당을 줄이세요',
      reason:
        '골반 조사 중 급성 장염으로 설사가 흔합니다. 이 시기에는 고섬유·고지방·유당·카페인·매운 음식이 증상을 악화시킵니다. ' +
        '흰죽·바나나·감자·닭가슴살처럼 잔사가 적고 부드러운 음식으로 옮기고, 수분과 전해질을 함께 보충합니다.',
      evidence: 'G',
      refIds: ['espen2021']
    },
    {
      id: 'crc-lifestyle',
      level: 'prefer',
      match: { groups: ['채소', '과일', '곡류·전분'] },
      phases: ['survivorship'],
      title: '가이드라인을 잘 지킨 환자군에서 실제로 생존이 좋았습니다',
      reason:
        'CALGB 89803 임상시험에 참여한 3기 대장암 환자들을 분석했더니, 미국암학회의 식사·운동·체중 권고를 잘 따른 군은 ' +
        '그렇지 않은 군보다 사망 위험이 뚜렷하게 낮았습니다. 단일 식품이 아니라 전체 생활 패턴의 문제라는 것을 보여준 결과입니다.',
      evidence: 'B',
      refIds: ['vanblarigan2018', 'acs2022']
    }
  ],
  phaseNotes: {
    post_op:
      '저잔사식으로 시작해 4~6주에 걸쳐 섬유를 늘립니다. 장루가 있다면 가스를 만드는 콩류·양파·탄산음료를 처음에는 줄이고, ' +
      '수분·나트륨 손실이 크므로 물을 충분히 마십니다.',
    during_rt:
      '골반 조사 중에는 설사 대응이 중심입니다. 증상이 심하면 유당·고지방·고섬유를 한꺼번에 줄여 보고 하나씩 다시 넣습니다.',
    during_chemo:
      '옥살리플라틴 사용 중에는 찬 음식·찬 음료가 인후 경련과 손발 저림을 유발할 수 있어 미지근하게 드시는 편이 좋습니다.',
    survivorship:
      '섬유·통곡물·유제품을 늘리고, 가공육을 줄이며, 체중과 활동량을 관리합니다.'
  },
  refIds: ['wcrf2018', 'iarc114', 'song2018fiber', 'vanblarigan2018']
}
