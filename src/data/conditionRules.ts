import type { NutritionRule, PatientCondition } from './types'

/**
 * 동반 증상·상태별 규칙. 암종과 무관하게 해당 상태가 선택되면 적용된다.
 * 실제 진료에서 "무엇을 먹을까"를 좌우하는 것은 암종보다 이쪽인 경우가 많다.
 */
export const CONDITION_RULES: Record<PatientCondition, NutritionRule[]> = {
  연하곤란: [
    {
      // 떡은 부드럽지만 삼키기 쉽지 않다. 권장 대상에서 뺀다.
      id: 'cond-dys-soft', level: 'prefer', match: { tags: ['부드러움'], excludeTags: ['점착성'] },
      title: '삼키기 쉬운 형태로 바꾸는 것이 먼저입니다',
      reason:
        '먹는 양을 줄이는 대신 음식의 형태를 바꾸는 것이 원칙입니다. 곱게 갈고 소스나 국물로 촉촉하게 만들면 ' +
        '같은 재료도 훨씬 안전하게 삼킬 수 있습니다.',
      evidence: 'G', refIds: ['iddsi']
    },
    {
      // 규칙 문장에는 "떡처럼 끈적하게 뭉치는 것" 이라 적어 두고 정작 떡은 걸리지 않았다.
      id: 'cond-dys-rough', level: 'avoid', match: { tags: ['거친질감', '점착성'] },
      title: '거칠거나 잘 뭉치는 음식은 사레와 막힘의 원인입니다',
      reason:
        '견과·튀김옷·질긴 나물처럼 거친 것, 떡처럼 끈적하게 뭉치는 것은 특히 위험합니다. ' +
        '한 입에 여러 질감이 섞인 음식(국물에 밥을 만 것 등)도 삼키기 어렵습니다.',
      evidence: 'G', refIds: ['iddsi']
    },
    {
      id: 'cond-dys-thin', level: 'caution', match: { foodIds: ['water', 'barley-tea', 'orange-juice'] },
      title: '물처럼 묽은 액체가 가장 사레들기 쉽습니다',
      reason:
        '묽을수록 빠르게 흘러 후두를 지나기 때문에, 연하곤란에서는 물이 죽보다 위험합니다. ' +
        '점도증진제로 걸쭉하게 만들어 드시는 것을 권합니다.',
      evidence: 'G', refIds: ['iddsi']
    }
  ],

  구강점막염: [
    {
      id: 'cond-muc-avoid', level: 'avoid', match: { tags: ['매운맛', '산성강함', '거친질감', '고나트륨'] },
      title: '맵고 시고 짜고 거친 것 — 네 가지를 모두 빼세요',
      reason:
        '벗겨진 점막에는 캡사이신·산·염분이 직접적인 통증 자극이 됩니다. ' +
        '토마토, 감귤, 파인애플, 식초, 김치, 과자류가 실제로 가장 자주 문제가 되는 항목입니다.',
      evidence: 'G', refIds: ['mascc-mucositis']
    },
    {
      id: 'cond-muc-cold', level: 'prefer', match: { tags: ['부드러움'] },
      title: '미지근하거나 차가운 부드러운 음식이 견디기 쉽습니다',
      reason:
        '아이스크림·요거트·푸딩·계란찜처럼 부드럽고 온도가 낮은 음식은 통증을 덜 자극하면서 열량을 줍니다. ' +
        '5-FU 계열 항암제 투여 중 얼음 조각을 물고 있는 것(구강 냉각)은 점막염을 줄이는 근거가 있는 방법입니다.',
      evidence: 'A', refIds: ['mascc-mucositis']
    }
  ],

  설사: [
    {
      id: 'cond-diar-lowres', level: 'prefer', match: { tags: ['저잔사', '저FODMAP'] },
      title: '잔사가 적은 음식으로 옮기고 수분을 채우세요',
      reason:
        '흰죽·흰밥·바나나·감자·닭가슴살처럼 잔사가 적은 음식이 기본입니다. ' +
        '설사로 잃는 것은 물뿐 아니라 나트륨·칼륨이므로 경구수액이나 이온음료를 함께 드시는 편이 좋습니다.',
      evidence: 'G', refIds: ['espen2021']
    },
    {
      id: 'cond-diar-avoid', level: 'avoid', match: { tags: ['유당함유', '고지방', '고식이섬유', '카페인', '매운맛', '가스유발'] },
      title: '유당·기름진 음식·거친 섬유·카페인은 설사를 악화시킵니다',
      reason:
        '장 점막이 손상되면 유당분해효소가 일시적으로 줄어 우유가 설사를 키웁니다. ' +
        '지방은 담즙산 흡수 장애로, 카페인은 장운동 촉진으로 각각 증상을 악화시킵니다.',
      evidence: 'G', refIds: ['espen2021']
    }
  ],

  변비: [
    {
      id: 'cond-const-fiber', level: 'prefer', match: { tags: ['고식이섬유', '수분보충'] },
      title: '섬유와 수분은 반드시 함께 늘려야 합니다',
      reason:
        '물 없이 섬유만 늘리면 변이 오히려 더 단단해집니다. 하루 1.5~2 L 의 수분과 함께 늘리는 것이 원칙이며, ' +
        '푸룬·키위·차전자피가 실용적인 선택입니다.',
      evidence: 'G', refIds: ['espen2021']
    },
    {
      id: 'cond-const-opioid', level: 'info', match: { tags: ['고식이섬유'] },
      title: '마약성 진통제로 인한 변비는 섬유만으로 해결되지 않습니다',
      reason:
        '오피오이드는 장운동 자체를 억제하기 때문에 식이 조절만으로는 부족합니다. ' +
        '이 경우 진통제를 시작할 때부터 완하제를 함께 쓰는 것이 표준입니다.',
      evidence: 'G', refIds: ['nccn-survivorship']
    }
  ],

  '오심·구토': [
    {
      id: 'cond-nau-ginger', level: 'prefer', match: { foodIds: ['ginger-tea'] },
      title: '생강은 항암 유발 오심에 근거가 있는 몇 안 되는 식품입니다',
      reason:
        '항암 환자 576명을 대상으로 한 무작위배정 연구에서, 항암 시작 3일 전부터 생강을 복용한 군은 ' +
        '급성 오심이 유의하게 감소했습니다. 항구토제를 대체하는 것이 아니라 더하는 개념입니다.',
      evidence: 'A', refIds: ['ryan2012ginger']
    },
    {
      id: 'cond-nau-avoid', level: 'avoid', match: { tags: ['고지방', '튀김', '매운맛'] },
      title: '기름지고 냄새가 강한 음식은 오심을 키웁니다',
      reason:
        '지방은 위 배출을 늦춰 더부룩함을 오래 끌고, 강한 냄새는 그 자체로 구토 유발 자극이 됩니다. ' +
        '상온이나 찬 음식은 냄새가 덜 나서 견디기 쉽습니다.',
      evidence: 'G', refIds: ['espen2021']
    },
    {
      id: 'cond-nau-dry', level: 'prefer', match: { foodIds: ['biscuit-plain', 'rice-white'] },
      title: '아침 공복에 마른 음식을 조금 드시는 것이 도움이 됩니다',
      reason:
        '빈속일 때 오심이 가장 심한 경우가 많습니다. 일어나기 전에 마른 크래커를 몇 개 드시고 ' +
        '천천히 일어나는 방법이 오래전부터 쓰입니다.',
      evidence: 'G', refIds: ['espen2021']
    }
  ],

  식욕부진: [
    {
      id: 'cond-anor-dense', level: 'prefer', match: { tags: ['고열량밀도', '고단백'] },
      title: '양을 늘리지 말고 한 입의 밀도를 올리세요',
      reason:
        '식욕이 없을 때 "많이 드세요"는 실행 불가능한 조언입니다. ' +
        '죽에 참기름·달걀·단백질분말을 섞고, 우유에 미숫가루를 타고, 간식으로 견과·치즈를 두는 식으로 ' +
        '같은 부피에서 얻는 열량을 올리는 편이 실제로 작동합니다.',
      evidence: 'G', refIds: ['espen2021', 'espen-cachexia']
    },
    {
      id: 'cond-anor-soup', level: 'caution', match: { groups: ['국·탕·찌개'] },
      title: '국물로 배를 채우면 정작 먹어야 할 것이 안 들어갑니다',
      reason:
        '국물은 부피에 비해 열량과 단백질이 거의 없습니다. 식욕이 없는 시기에는 국물 대신 ' +
        '건더기와 단백질 반찬을 먼저 드시는 순서가 좋습니다.',
      evidence: 'G', refIds: ['espen2021']
    }
  ],

  체중감소: [
    {
      id: 'cond-wl-ons', level: 'prefer', match: { supplementCategories: ['경장영양(균형영양식)', '단백질보충'] },
      title: '식사만으로 부족하면 경구영양보충을 더하세요',
      reason:
        'ESPEN 은 경구 섭취가 필요량의 60 % 미만인 상태가 이어지면 경구영양보충(ONS)을 권고합니다. ' +
        '6개월간 5 % 이상 체중이 줄었다면 이미 개입 기준을 넘은 상태입니다.',
      evidence: 'G', refIds: ['espen2021', 'espen-cachexia']
    }
  ],

  체중증가: [
    {
      id: 'cond-gain-dense', level: 'caution', match: { tags: ['고열량밀도', '고당', '튀김'] },
      title: '치료 중 늘어난 체중은 치료 후에도 잘 빠지지 않습니다',
      reason:
        '항암 치료 중 체중이 오히려 느는 일은 흔합니다. 오심을 달래려 탄수화물 위주로 먹게 되고, ' +
        '스테로이드가 식욕을 올리며, 활동량은 줄기 때문입니다. ' +
        '문제는 이때 늘어난 것이 근육이 아니라 지방이고, 치료가 끝난 뒤에도 잘 빠지지 않는다는 점입니다. ' +
        '열량을 줄이기보다 같은 열량에서 단백질과 채소의 비중을 올리는 편이 실천하기 쉽습니다.',
      evidence: 'B', refIds: ['asco2022', 'acs2022']
    },
    {
      id: 'cond-gain-veg', level: 'prefer', match: { tags: ['고식이섬유'], groups: ['채소', '해조·버섯'] },
      title: '먼저 채소로 배를 채우면 총량이 자연스럽게 줄어듭니다',
      reason:
        '식사 순서를 채소 → 단백질 → 밥으로 바꾸는 것만으로 총섭취량이 줄어듭니다. ' +
        '먹는 양을 참는 방식은 치료 중에 오래 가지 못합니다.',
      evidence: 'G', refIds: ['acs2022', 'kdri2020']
    },
    {
      id: 'cond-gain-move', level: 'info', match: { tags: ['고단백'] },
      title: '체중보다 근육량이 중요합니다',
      reason:
        '치료 중에는 체중계 숫자가 그대로여도 근육이 줄고 지방이 느는 경우가 많습니다. ' +
        '단백질을 유지하면서 저항운동을 더해야 몸의 구성이 나빠지지 않습니다. ' +
        '이 시기에 무리한 감량을 하면 근육부터 빠집니다.',
      evidence: 'G', refIds: ['acsm2019', 'asco2022']
    }
  ],

  호중구감소증: [
    {
      id: 'cond-neut-raw', level: 'avoid', match: { tags: ['생식'] },
      title: '익히지 않은 음식은 이 기간 동안 피하세요',
      reason:
        '회·육회·생굴·반숙 달걀·살균되지 않은 유제품이 대상입니다. ' +
        '조리한 지 오래된 음식, 상온에 오래 둔 김밥·샐러드도 마찬가지입니다.',
      evidence: 'B', refIds: ['fda-foodsafety', 'sonbol2015']
    },
    {
      id: 'cond-neut-probiotic', level: 'caution', match: { supplementCategories: ['유산균'], tags: ['프로바이오틱스'] },
      title: '유산균 보충제는 이 시기에 신중하게 판단합니다',
      reason:
        '중증 호중구감소증이나 중심정맥관을 가진 환자에서 프로바이오틱스 균에 의한 균혈증·패혈증 사례가 보고되었습니다. ' +
        '김치·요거트 같은 일반 식품 수준과, 고농도 균을 넣은 보충제는 구분해서 보아야 합니다.',
      evidence: 'C', refIds: ['fda-foodsafety']
    }
  ],

  위절제후: [
    {
      id: 'cond-gx-dumping', level: 'avoid', match: { tags: ['고당'] },
      title: '농축된 단 음식은 덤핑증후군을 일으킵니다',
      reason:
        '주스·사이다·꿀물처럼 당이 농축된 액체가 가장 흔한 원인입니다. ' +
        '식사 중에는 물을 적게 드시고, 식후 20~30분 비스듬히 누워 계시면 증상이 줄어듭니다.',
      evidence: 'G', refIds: ['gastrectomy-nutr']
    },
    {
      id: 'cond-gx-b12', level: 'prefer', match: { supplementCategories: ['비타민B군'] },
      title: '비타민 B12 는 정기적으로 확인하고 보충해야 합니다',
      reason:
        '위 전절제 후에는 경구 흡수가 불가능해 주사 보충이 필요합니다. ' +
        '아절제 후에도 수년에 걸쳐 결핍이 나타나는 경우가 많습니다.',
      evidence: 'G', refIds: ['gastrectomy-nutr']
    }
  ],

  장루보유: [
    {
      id: 'cond-stoma-fiber', level: 'caution', match: { tags: ['고식이섬유', '거친질감'] },
      title: '장루를 만든 초기에는 질긴 섬유가 막힘의 원인이 됩니다',
      reason:
        '버섯 밑동, 옥수수, 견과, 나물 줄기가 대표적입니다. 잘게 썰고 충분히 씹으면 대부분 드실 수 있으며, ' +
        '수술 후 6~8주가 지나면 하나씩 다시 시도해 보셔도 됩니다.',
      evidence: 'G', refIds: ['espen2021']
    },
    {
      id: 'cond-stoma-fluid', level: 'prefer', match: { tags: ['수분보충'] },
      title: '회장루가 있으면 수분과 나트륨 손실이 큽니다',
      reason:
        '대장을 거치지 않아 수분·전해질 재흡수가 일어나지 않습니다. 배출량이 하루 1 L 를 넘으면 탈수와 ' +
        '신기능 저하로 이어질 수 있어, 경구수액 형태로 보충하는 편이 물만 마시는 것보다 효과적입니다.',
      evidence: 'G', refIds: ['espen2021']
    }
  ],

  복수: [
    {
      id: 'cond-asc-na', level: 'avoid', match: { tags: ['고나트륨', '염장'] },
      title: '복수 조절의 핵심은 나트륨 제한입니다',
      reason:
        '하루 2,000 mg(소금 5 g) 이하가 표준이며, 국물·젓갈·장아찌·면류 국물이 실제 제한을 깨뜨립니다. ' +
        '수분 제한은 저나트륨혈증이 있을 때만 필요합니다.',
      evidence: 'G', refIds: ['easl-nutrition']
    }
  ],

  간성뇌증위험: [
    {
      id: 'cond-he-protein', level: 'info', match: { tags: ['고단백'] },
      title: '단백질을 끊는 것이 아니라 종류를 바꾸는 것입니다',
      reason:
        '과거에는 단백질을 제한했지만, 현재 지침은 총량 유지를 권고합니다. ' +
        '동물성 단백질 대신 식물성·유제품 단백질의 비중을 늘리면 암모니아 부담이 줄면서 근육은 지킬 수 있습니다.',
      evidence: 'G', refIds: ['easl-nutrition']
    }
  ],

  신기능저하: [
    {
      /*
       * 태그만 믿지 않는다.
       *
       * '고칼륨' 은 사람이 손으로 붙인 표시라 빠질 수 있다.
       * 실제로 배(428 mg)와 참외(440 mg)에는 붙어 있지 않았다 —
       * 신기능이 떨어진 분께는 확인이 필요한 양인데도 규칙이 조용히 비켜 갔다.
       * 성분표의 숫자로도 걸리게 해 둔다. 둘 중 하나만 맞아도 걸린다.
       */
      id: 'cond-ckd-k', level: 'caution',
      match: { tags: ['고칼륨'], nutrient: { key: 'k', op: '>', value: 400, basis: 'serving' } },
      title: '칼륨이 높은 식품은 확인이 필요합니다',
      reason:
        '사구체여과율이 떨어지면 칼륨 배설이 줄어 고칼륨혈증이 생길 수 있습니다. ' +
        '바나나·감자·토마토·건과일·저염소금(염화칼륨)이 대표적인 급원입니다. ' +
        '채소는 잘게 썰어 데쳐서 물을 버리면 칼륨을 상당히 줄일 수 있습니다.',
      evidence: 'G', refIds: ['kdri2020']
    },
    {
      id: 'cond-ckd-p', level: 'caution',
      match: { tags: ['고인'], nutrient: { key: 'p', op: '>', value: 300, basis: 'serving' } },
      title: '인이 높은 식품과 가공식품의 인산염 첨가물에 주의하세요',
      reason:
        '가공식품에 첨가된 무기 인산염은 자연 식품의 인보다 흡수율이 훨씬 높습니다. ' +
        '콜라·가공치즈·햄류가 대표적입니다.',
      evidence: 'G', refIds: ['kdri2020']
    }
  ],

  당뇨: [
    {
      id: 'cond-dm-sugar', level: 'caution', match: { tags: ['고당'] },
      title: '단순당이 몰린 음식은 혈당을 급격히 올립니다',
      reason:
        '항암 전후 스테로이드를 쓰는 날에는 평소보다 혈당이 크게 오르므로 특히 주의가 필요합니다. ' +
        '탄수화물을 매 끼 비슷하게 나누고 단백질·섬유와 함께 드시면 상승 폭이 완만해집니다.',
      evidence: 'G', refIds: ['kdri2020', 'espen2021']
    }
  ],

  고혈압: [
    {
      id: 'cond-htn-na', level: 'caution', match: { tags: ['고나트륨'] },
      title: '나트륨을 하루 2,000 mg 이하로 유지하세요',
      reason:
        '국·찌개 국물을 남기고, 김치·젓갈·장아찌를 줄이며, 라면 국물을 마시지 않는 세 가지만으로도 ' +
        '한국인의 평균 섭취량을 권고 수준 가까이 낮출 수 있습니다.',
      evidence: 'G', refIds: ['kdri2020', 'knhanes']
    }
  ],

  와파린복용: [
    {
      id: 'cond-warf-vitk', level: 'caution', match: { tags: ['고비타민K'] },
      title: '비타민 K 는 끊는 것이 아니라 "일정하게" 드시는 것이 핵심입니다',
      reason:
        '와파린은 비타민 K 의 작용을 막아 효과를 냅니다. 시금치·케일·청국장·낫토를 갑자기 많이 드시거나 ' +
        '갑자기 끊으면 INR 이 흔들립니다. 매일 비슷한 양을 유지하는 것이 가장 안전합니다.',
      evidence: 'G', refIds: ['warfarin-vitk']
    }
  ]
}
