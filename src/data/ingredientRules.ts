import type { CancerId, EvidenceLevel, PatientCondition, RuleLevel } from './types'

/**
 * 건강기능식품 원료별 임상 판단.
 *
 * 시판 제품은 4만 종이 넘지만 그 안에 든 기능성 원료는 수십 가지다.
 * 제품 하나하나를 검토하는 대신 원료 단위로 근거를 정리해 두면,
 * 제품이 몇 만 개로 늘어도 판단은 이 표 하나로 끝난다.
 *
 * 원칙
 *  · 근거 없는 판단은 넣지 않는다. "면역력에 좋다"는 표시 문구를 근거로 삼지 않는다.
 *  · 암종·증상·복용약에 따라 달라지는 것은 그 조건을 명시한다.
 *  · 원료가 유해하다는 뜻이 아니라, 이 환자에게 지금 맞는지를 본다.
 */

/** 제품명·기능성 문구에서 찾아낼 원료 */
export interface IngredientRule {
  /** 화면에 보여 줄 원료 이름 */
  name: string
  /** 제품명이나 기능성 문구에서 이 낱말이 보이면 해당 원료로 본다 */
  match: string[]
  /** 기본 판단 — 조건이 걸리지 않으면 이 값이 쓰인다 */
  base: RuleLevel
  /** 왜 그렇게 보는지 */
  reason: string
  evidence: EvidenceLevel
  refIds: string[]
  /** 특정 암종에서 판단이 달라진다 */
  byCancer?: Partial<Record<CancerId, { level: RuleLevel; reason: string }>>
  /** 특정 증상에서 판단이 달라진다 */
  byCondition?: Partial<Record<PatientCondition, { level: RuleLevel; reason: string }>>
  /** 특정 약과 함께 쓸 때 문제가 된다 */
  byMedication?: Record<string, { level: RuleLevel; reason: string }>
  /** 치료 중(방사선·항암)에 달라진다 */
  duringTreatment?: { level: RuleLevel; reason: string }
}

export const INGREDIENT_RULES: IngredientRule[] = [
  /* ── 항산화 계열 — 치료 중이 문제다 ───────────────────────── */
  {
    name: '비타민 E',
    match: ['비타민E', '비타민 E', '토코페롤'],
    base: 'info',
    reason:
      '결핍이 드물어 따로 챙길 이유가 크지 않은 성분입니다. 식품으로 충분히 섭취됩니다.',
    evidence: 'G',
    refIds: ['kdri2020'],
    duringTreatment: {
      level: 'avoid',
      reason:
        '방사선치료와 상당수 항암제는 활성산소로 암세포를 죽입니다. 고용량 항산화제가 이 기전을 방해할 수 있다는 우려가 있고, ' +
        '두경부암 환자 무작위배정 연구에서 고용량 비타민 E 군은 국소 재발과 사망이 오히려 늘었습니다.'
    },
    byCancer: {
      prostate: {
        level: 'avoid',
        reason:
          'SELECT 임상시험에서 비타민 E 400 IU 복용군은 위약군보다 전립선암 발생이 17 % 더 높았습니다. ' +
          '35,000명 이상을 본 결과이며, 예방 목적의 복용은 어떤 가이드라인도 권하지 않습니다.'
      }
    }
  },
  {
    name: '베타카로틴',
    match: ['베타카로틴', '베타-카로틴'],
    base: 'caution',
    reason: '채소·과일에 든 것과 달리, 분리·농축한 보충제는 이야기가 다릅니다.',
    evidence: 'A',
    refIds: ['atbc1994', 'caret1996'],
    byCancer: {
      lung: {
        level: 'avoid',
        reason:
          '흡연자에게 베타카로틴을 투여한 ATBC 연구에서 폐암 발생이 18 % 증가했고, ' +
          'CARET 연구에서는 28 % 증가해 시험이 조기 중단되었습니다. 흡연력이 있다면 피해야 합니다.'
      },
      headneck: {
        level: 'avoid',
        reason: '두경부암 방사선치료 중 고용량 항산화제군에서 재발과 사망이 늘었습니다. 특히 흡연자에서 뚜렷했습니다.'
      }
    }
  },
  {
    name: '셀레늄',
    match: ['셀레늄', '셀렌'],
    base: 'caution',
    reason:
      '결핍이 아닌 상태에서 보충할 이유가 확인되지 않았습니다.',
    evidence: 'A',
    refIds: ['select2011'],
    byCancer: {
      prostate: {
        level: 'avoid',
        reason:
          'SELECT 임상시험에서 셀레늄 200 µg 단독군은 예방 효과가 없었고, 기저 셀레늄이 높았던 사람에서는 ' +
          '고위험 전립선암이 증가하는 신호가 관찰되었습니다.'
      }
    }
  },
  {
    name: '고용량 비타민 C',
    match: ['비타민C', '비타민 C', '아스코르브'],
    base: 'info',
    reason:
      '식품 수준이나 하루 500 mg 안팎은 문제가 되지 않습니다. 1,000 mg 이상 고용량이 논의 대상입니다.',
    evidence: 'G',
    refIds: ['kdri2020'],
    duringTreatment: {
      level: 'caution',
      reason:
        '치료 중 고용량 항산화제는 방사선·항암제의 작용을 방해할 수 있다는 우려가 있습니다. ' +
        '음식으로 먹는 비타민 C 는 해당되지 않으며, 문제는 보충제 수준의 고용량입니다.'
    }
  },
  {
    name: '코엔자임 Q10',
    match: ['코엔자임', '코큐텐', 'CoQ10', '코엔자임Q10'],
    base: 'caution',
    reason:
      '항암 효과를 뒷받침하는 임상 근거가 없습니다. 구조가 비타민 K 와 비슷해 와파린 효과를 줄일 수 있습니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk'],
    byMedication: {
      warfarin: { level: 'avoid', reason: '와파린의 항응고 효과를 떨어뜨려 INR 이 흔들립니다.' }
    }
  },

  /* ── 출혈 위험 계열 ───────────────────────────────────── */
  {
    name: '은행잎추출물',
    match: ['은행잎', '징코', '깅코'],
    base: 'caution',
    reason:
      '혈소판 응집을 억제해 출혈 경향을 높입니다. 항암 치료로 혈소판이 낮아지는 시기에는 특히 주의가 필요합니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk'],
    byCondition: {
      호중구감소증: { level: 'avoid', reason: '골수억제 시기에는 혈소판도 함께 낮아집니다. 출혈 위험을 더할 이유가 없습니다.' }
    },
    byMedication: {
      warfarin: { level: 'avoid', reason: '와파린과 함께 쓰면 출혈 위험이 뚜렷하게 올라갑니다.' },
      doac: { level: 'avoid', reason: '항응고 작용이 더해져 출혈 위험이 커집니다.' }
    }
  },
  {
    name: '오메가-3 (EPA·DHA)',
    match: ['오메가3', '오메가-3', 'EPA', 'DHA', '알티지', 'rTG'],
    base: 'prefer',
    reason:
      '체중이 줄고 있는 진행암 환자에서 근육 소실을 늦출 가능성이 논의됩니다. ' +
      'ESPEN 은 강한 권고 대신 "고려할 수 있다" 수준으로 정리하고 있습니다.',
    evidence: 'C',
    refIds: ['espen-cachexia', 'espen2021'],
    byMedication: {
      warfarin: { level: 'caution', reason: '혈소판 응집을 억제해 와파린과 함께 쓰면 출혈 경향이 더해집니다. INR 확인이 필요합니다.' },
      doac: { level: 'caution', reason: '항응고 작용이 더해질 수 있어 멍·코피가 잦아지면 알려야 합니다.' }
    }
  },
  {
    name: '감마리놀렌산',
    match: ['감마리놀렌', 'GLA', '달맞이꽃'],
    base: 'caution',
    reason: '혈소판 기능에 영향을 줄 수 있고, 암 환자에서 이득을 보인 임상 근거는 없습니다.',
    evidence: 'C',
    refIds: ['espen2021']
  },
  {
    name: '홍삼·인삼',
    match: ['홍삼', '인삼', '흑삼', '산삼', '진세노사이드'],
    base: 'caution',
    reason:
      '항암 중 피로 개선에 대한 소규모 연구가 있으나 결과가 일정하지 않습니다. ' +
      '혈소판 응집을 억제하고 혈당·혈압에도 영향을 주어, 여러 약과 부딪힐 여지가 있습니다.',
    evidence: 'C',
    refIds: ['espen2021', 'warfarin-vitk'],
    byMedication: {
      warfarin: { level: 'avoid', reason: 'INR 을 올린 사례와 내린 사례가 모두 보고되어 있습니다. 예측이 안 되는 것 자체가 문제입니다.' },
      doac: { level: 'caution', reason: '혈소판 억제 작용이 더해져 출혈 위험이 커질 수 있습니다.' }
    },
    byCondition: {
      호중구감소증: { level: 'caution', reason: '혈소판이 낮은 시기에 응집 억제 작용이 겹칩니다.' }
    }
  },
  {
    name: '마늘추출물',
    match: ['마늘추출', '흑마늘', '알리신'],
    base: 'info',
    reason: '음식으로 먹는 마늘은 권장 대상입니다. 농축 보충제는 혈소판 억제 작용이 강해질 수 있습니다.',
    evidence: 'C',
    refIds: ['wcrf2018'],
    byMedication: {
      warfarin: { level: 'caution', reason: '출혈 경향을 더할 수 있습니다.' }
    }
  },

  /* ── 에스트로겐 유사 작용 ─────────────────────────────── */
  {
    name: '대두 이소플라본(농축)',
    match: ['이소플라본', '대두추출', '소이추출'],
    base: 'caution',
    reason:
      '두부·두유처럼 식품으로 먹는 대두는 유방암에서도 제한할 이유가 없고 오히려 이득 쪽입니다. ' +
      '다만 이소플라본을 수십 배 농축한 보충제는 그 근거의 대상이 아니며, 안전성 자료가 없습니다.',
    evidence: 'C',
    refIds: ['shu2009', 'nechuta2012', 'acs2022'],
    byCancer: {
      breast: { level: 'avoid', reason: '항호르몬 치료 중에는 에스트로겐 유사 작용을 하는 농축 보충제를 권하지 않습니다.' },
      gyn: { level: 'avoid', reason: '호르몬 감수성 종양에서 농축 보충제의 안전성이 확인되지 않았습니다.' }
    }
  },
  {
    name: '백수오·승마 등 갱년기 원료',
    match: ['백수오', '승마', '이엽우피소', '갱년기'],
    base: 'caution',
    reason:
      '여성호르몬 유사 작용을 표방하는 원료입니다. 간독성 보고가 있고, 호르몬 감수성 종양에서의 안전성 자료가 없습니다.',
    evidence: 'C',
    refIds: ['acs2022', 'easl-nutrition'],
    byCancer: {
      breast: { level: 'avoid', reason: '에스트로겐 수용체 양성 종양에서 호르몬 유사 작용 원료는 권하지 않습니다.' },
      gyn: { level: 'avoid', reason: '자궁내막은 에스트로겐 자극에 직접 반응합니다.' },
      liver: { level: 'avoid', reason: '간독성 보고가 있어 간 기능이 떨어진 상태에서는 피해야 합니다.' }
    }
  },
  {
    name: '석류추출물',
    match: ['석류'],
    base: 'info',
    reason: '식물성 에스트로겐 유사 성분이 있으나, 식품 수준 섭취가 문제된다는 근거는 없습니다.',
    evidence: 'C',
    refIds: ['acs2022'],
    byCancer: {
      breast: { level: 'caution', reason: '농축 보충제 형태로 장기 복용하는 것은 자료가 부족합니다.' }
    }
  },

  /* ── 간 관련 ─────────────────────────────────────────── */
  {
    name: '가르시니아캄보지아',
    match: ['가르시니아'],
    base: 'avoid',
    reason:
      '체지방 감소를 표방하는 원료입니다. 치료 중 체중 감량은 목표가 아니며, 근육 손실을 부릅니다. ' +
      '간독성 사례가 반복 보고되어 식약처도 주의를 안내한 바 있습니다.',
    evidence: 'C',
    refIds: ['espen2021', 'easl-nutrition']
  },
  {
    name: '녹차추출물(카테킨·EGCG)',
    match: ['녹차추출', '카테킨', 'EGCG', '녹차농축'],
    base: 'caution',
    reason:
      '마시는 녹차와 달리 농축 추출물은 간독성 사례가 보고되어 있습니다.',
    evidence: 'C',
    refIds: ['golden2009', 'easl-nutrition'],
    byMedication: {
      bortezomib: {
        level: 'avoid',
        reason: 'EGCG 가 보르테조밉과 직접 결합해 약효를 무력화시키는 것이 실험적으로 확인되었습니다.'
      }
    },
    byCancer: {
      liver: { level: 'avoid', reason: '간 기능이 떨어진 상태에서 간독성 보고가 있는 농축 추출물은 피해야 합니다.' }
    }
  },
  {
    name: '밀크씨슬(실리마린)',
    match: ['밀크씨슬', '실리마린', '카르두스'],
    base: 'info',
    reason:
      '간수치 개선에 대한 근거는 제한적입니다. 다만 주요 대사효소에 큰 영향을 주지 않아 병용 위험은 낮은 편입니다.',
    evidence: 'C',
    refIds: ['easl-nutrition']
  },
  {
    name: '헛개나무추출물',
    match: ['헛개'],
    base: 'caution',
    reason: '간 건강을 표방하지만 임상 근거가 약하고, 간독성 사례 보고가 있습니다.',
    evidence: 'C',
    refIds: ['easl-nutrition'],
    byCancer: {
      liver: { level: 'avoid', reason: '간 기능이 떨어진 상태에서 성분·용량이 확인되지 않은 생약은 피하는 것이 안전합니다.' }
    }
  },

  /* ── 미네랄·비타민 ──────────────────────────────────── */
  {
    name: '칼슘',
    match: ['칼슘'],
    base: 'info',
    reason: '하루 1,000~1,200 mg 을 식품과 합쳐 맞추는 것이 기준입니다.',
    evidence: 'G',
    refIds: ['kdri2020'],
    byCancer: {
      colorectal: { level: 'prefer', reason: 'WCRF 는 유제품·칼슘 섭취가 대장암 위험을 낮춘다는 근거에 probable 등급을 부여했습니다.' },
      prostate: { level: 'caution', reason: '유제품·칼슘 고섭취와 전립선암 위험 증가의 연관이 보고되어 있습니다. 하루 1,500 mg 을 넘기지 않는 것이 좋습니다.' },
      breast: { level: 'prefer', reason: '아로마타제 억제제를 쓰는 동안 골 소실이 빠릅니다. 칼슘·비타민 D 확보가 표준 관리입니다.' }
    },
    byCondition: {
      위절제후: { level: 'prefer', reason: '위산이 줄어 흡수가 떨어집니다. 위산 의존도가 낮은 구연산칼슘 형태가 유리합니다.' },
      신기능저하: { level: 'caution', reason: '고칼슘혈증과 혈관 석회화 위험이 있어 용량 조절이 필요합니다.' }
    }
  },
  {
    name: '비타민 D',
    match: ['비타민D', '비타민 D', '콜레칼시페롤'],
    base: 'prefer',
    reason:
      '암 환자에서 결핍이 매우 흔하고, 결핍을 교정하는 것은 근거가 분명합니다. ' +
      '다만 항암 효과를 기대한 초고용량 복용은 임상시험에서 확인되지 않았습니다. 상한은 하루 100 µg(4,000 IU)입니다.',
    evidence: 'G',
    refIds: ['kdri2020', 'ng2019', 'manson2019']
  },
  {
    name: '철분',
    match: ['철분', '헴철', '철(', '푸마르산철'],
    base: 'info',
    reason: '결핍이 확인되었을 때 교정하는 것이 원칙입니다. 결핍이 아닌데 넣을 이유는 없습니다.',
    evidence: 'G',
    refIds: ['kdri2020'],
    byCondition: {
      위절제후: { level: 'prefer', reason: '위산이 줄어 철 흡수가 떨어집니다. 수술 후 수년에 걸쳐 결핍이 나타나는 경우가 많습니다.' },
      변비: { level: 'caution', reason: '철분제는 변비를 흔히 악화시킵니다.' }
    }
  },
  {
    name: '아연',
    match: ['아연', '징크'],
    base: 'info',
    reason:
      '미각 변화에 흔히 쓰이지만 무작위배정 연구 결과가 일관되지 않습니다. ' +
      '장기 고용량은 구리 결핍을 부르므로 몇 주 써 보고 변화가 없으면 중단하는 편이 낫습니다.',
    evidence: 'C',
    refIds: ['espen2021'],
    byCondition: {
      '오심·구토': { level: 'prefer', reason: '미각 변화가 동반된 경우 결핍 교정 차원에서 시도해 볼 수 있습니다.' }
    }
  },
  {
    name: '마그네슘',
    match: ['마그네슘'],
    base: 'info',
    reason: '결핍이 있으면 교정합니다. 과량은 설사를 일으킵니다.',
    evidence: 'G',
    refIds: ['kdri2020'],
    byMedication: {
      cisplatin: { level: 'prefer', reason: '시스플라틴은 신세뇨관을 손상시켜 저마그네슘혈증을 자주 일으킵니다. 수치를 확인하고 보충합니다.' }
    },
    byCondition: {
      설사: { level: 'caution', reason: '마그네슘은 그 자체로 설사를 악화시킵니다.' },
      신기능저하: { level: 'caution', reason: '배설이 줄어 고마그네슘혈증이 생길 수 있습니다.' }
    }
  },

  /* ── 그 밖 ───────────────────────────────────────────── */
  {
    name: '프로바이오틱스(유산균)',
    match: ['유산균', '프로바이오틱스', '락토바실러스', '비피더스', '락티스', '플란타룸'],
    base: 'info',
    reason:
      '골반 방사선치료 설사에 대한 소규모 연구들이 있으나 결과가 엇갈립니다. 일반적으로는 안전합니다.',
    evidence: 'C',
    refIds: ['fda-foodsafety'],
    byCondition: {
      호중구감소증: {
        level: 'avoid',
        reason: '중증 호중구감소증이나 중심정맥관 보유 환자에서 프로바이오틱스 균에 의한 균혈증·패혈증 사례가 보고되었습니다.'
      },
      설사: { level: 'info', reason: '항생제 관련 설사에는 도움이 될 수 있으나, 항암제로 인한 설사에는 근거가 부족합니다.' }
    }
  },
  {
    name: '단백질 보충',
    match: ['단백질', '프로틴', 'WPI', 'WPC', '유청'],
    base: 'prefer',
    reason:
      'ESPEN 은 암 환자에게 체중 1 kg 당 1.0~1.5 g 의 단백질을 권고합니다. ' +
      '식사량을 늘리기 어려울 때 부피를 키우지 않고 단백질만 올릴 수 있습니다.',
    evidence: 'G',
    refIds: ['espen2021', 'espen-cachexia'],
    byCondition: {
      신기능저하: { level: 'caution', reason: '신기능에 따라 단백질 제한이 필요할 수 있어 담당 의료진과 상의해야 합니다.' },
      간성뇌증위험: { level: 'caution', reason: '총량보다 종류가 중요합니다. 식물성·유제품 단백질 비중을 늘리는 쪽이 낫습니다.' }
    }
  },
  {
    name: '루테인·지아잔틴',
    match: ['루테인', '지아잔틴', '마리골드'],
    base: 'info',
    reason: '황반 건강을 위한 원료로, 암 치료와 직접적인 상호작용은 알려져 있지 않습니다.',
    evidence: 'G',
    refIds: ['kdri2020']
  },
  {
    name: '글루코사민·MSM',
    match: ['글루코사민', 'MSM', '콘드로이친', '보스웰리아'],
    base: 'info',
    reason: '관절 증상에 쓰이며 암 치료와의 상호작용은 알려져 있지 않습니다. 혈당을 약간 올릴 수 있다는 보고가 있습니다.',
    evidence: 'C',
    refIds: ['kdri2020'],
    byCondition: {
      당뇨: { level: 'caution', reason: '혈당을 약간 올릴 수 있어 확인이 필요합니다.' }
    }
  },
  {
    name: '콜라겐',
    match: ['콜라겐'],
    base: 'info',
    reason:
      '먹은 콜라겐이 그대로 피부나 관절로 가지 않습니다. 소화되면 아미노산으로 분해됩니다. ' +
      '해롭지는 않지만, 같은 값이면 단백질 보충이 목적에 더 맞습니다.',
    evidence: 'C',
    refIds: ['espen2021']
  },
  {
    name: '프로폴리스',
    match: ['프로폴리스'],
    base: 'info',
    reason: '구내염에 쓰이기도 하나 근거는 제한적입니다. 벌 산물 알레르기가 있으면 피해야 합니다.',
    evidence: 'C',
    refIds: ['mascc-mucositis']
  },
  {
    name: '클로렐라·스피루리나',
    match: ['클로렐라', '스피루리나'],
    base: 'caution',
    reason:
      '비타민 K 와 요오드가 많아 와파린 복용자와 갑상선 검사·치료를 앞둔 분에게 문제가 됩니다. ' +
      '중금속 오염 가능성도 제품에 따라 다릅니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk'],
    byMedication: {
      warfarin: { level: 'avoid', reason: '비타민 K 함량이 높아 INR 을 흔듭니다.' }
    }
  },
  {
    name: '쏘팔메토',
    match: ['쏘팔메토', '소팔메토'],
    base: 'caution',
    reason:
      '전립선비대 증상에 쓰이는 원료입니다. PSA 수치에 영향을 줄 수 있어, 전립선암 추적 중에는 판단을 흐릴 수 있습니다.',
    evidence: 'C',
    refIds: ['wcrf-prostate'],
    byCancer: {
      prostate: { level: 'avoid', reason: 'PSA 를 낮출 수 있어 재발 추적을 방해합니다. 복용 중이면 반드시 알려야 합니다.' }
    }
  },
  {
    name: '커큐민(강황)',
    match: ['커큐민', '강황', '울금'],
    base: 'info',
    reason:
      '전임상 근거는 풍부하나 사람에서 항암 효과는 확립되지 않았습니다. 고용량은 철 흡수를 방해할 수 있습니다.',
    evidence: 'C',
    refIds: ['espen2021']
  },
  {
    name: '알로에',
    match: ['알로에'],
    base: 'caution',
    reason: '설사를 유발할 수 있어, 항암·방사선치료로 장이 예민한 시기에는 증상을 키웁니다.',
    evidence: 'C',
    refIds: ['espen2021'],
    byCondition: {
      설사: { level: 'avoid', reason: '설사를 직접 악화시킵니다.' }
    }
  },
  {
    name: '체지방 감소 표방 원료',
    match: ['체지방', '다이어트', '슬림', '가르시니아', '카르니틴', '녹차카테킨'],
    base: 'avoid',
    reason:
      '치료 중 체중 감량은 목표가 아닙니다. 이 시기에 빠지는 것은 지방이 아니라 근육이고, ' +
      '근육량은 항암제 용량 유지와 치료 완주율에 직접 연결됩니다.',
    evidence: 'G',
    refIds: ['espen2021', 'espen-cachexia']
  }
]

/*
 * 기능성 '설명문' 에는 원료 이름이 아닌 낱말이 그대로 들어 있다.
 *
 * 식약처 표시 문구는 정해져 있다 — 비타민 D 는 "칼슘과 인이 흡수되고 이용되는데 필요",
 * 비타민 B6 는 "단백질 및 아미노산 이용에 필요", 비타민 C 는 "철의 흡수에 필요".
 * 그래서 낱말만 훑으면 비타민 D 제품이 칼슘 제품이 되고, B6 제품이 단백질 보충제가 된다.
 * 실제로 유산균 제품이 "칼슘과 인이 흡수되고…" 한 줄 때문에 칼슘 권장 목록에 올랐고,
 * 마그네슘+B6 제품이 단백질 보충으로 잡혔다. 4만 5천 종 중 5,317종이 이 경우다.
 *
 * 원료를 찾기 전에 이 문구들을 먼저 걷어낸다. 걷어내고도 남는 '칼슘' 은 진짜 칼슘이다.
 */
const CLAIM_PHRASES = [
  '칼슘과인이흡수되고이용되는데필요',
  '단백질및아미노산이용에필요',
  '지방,탄수화물,단백질대사와에너지생성에필요',
  '지방탄수화물단백질대사와에너지생성에필요',
  '단백질대사와에너지생성에필요',
  '철의흡수에필요',
  '철의운반과이용에필요',
  '탄수화물과에너지대사에필요',
  '체내에서단백질과아미노산이용에필요'
]

function stripClaims(t: string): string {
  let out = t
  for (const p of CLAIM_PHRASES) out = out.split(p).join(' ')
  return out
}

/** 제품 이름과 기능성 문구에서 해당하는 원료를 찾는다 */
export function findIngredients(text: string): IngredientRule[] {
  const t = stripClaims(text.replace(/\s+/g, ''))
  return INGREDIENT_RULES.filter((r) => r.match.some((m) => t.includes(m.replace(/\s+/g, ''))))
}

/**
 * 이 제품이 '무엇을 위한' 것인지 — 주된 성분을 가려낸다.
 *
 * 함량이 공개 자료에 없으니 대신 쓸 것이 필요했다.
 *
 * 먼저 제품 이름을 본다. 사람도 그렇게 읽는다 —
 * '칼슘 마그네슘 비타민D' 는 칼슘을 사는 것이고,
 * '100억 유산균 아연&비타민D' 는 유산균을 사는 것이다.
 * 둘 다 비타민 D 를 기능성 원료로 신고했지만, 비타민 D 를 채우러
 * 유산균을 사시라고 할 수는 없다.
 *
 * 다만 이름만 보면 너무 좁다. '(구)본포뮬러젤리' 처럼 이름에 원료가
 * 전혀 드러나지 않는 제품이 많은데, 그 제품의 기능성 표시에는
 * "[칼슘] 뼈와 치아 형성에 필요" 라고 또렷이 적혀 있다.
 * 대괄호 안의 이름은 신고된 기능성 원료이지 설명문이 아니다.
 * 그래서 이름에서 아무것도 찾지 못했을 때만 그쪽을 본다.
 */
export function findPrimaryIngredients(name: string, functionText = ''): IngredientRule[] {
  /*
   * 이름에 여러 원료가 적혀 있으면 가장 먼저 나오는 것이 그 제품의 성격이다.
   *
   * '100억 유산균 아연&비타민D' 는 유산균을 사는 것이고
   * '칼슘 마그네슘 비타민D' 는 칼슘을 사는 것이다.
   * 뒤에 붙은 것은 곁들임이지 그것을 사러 가는 이유가 아니다.
   * 한국 제품명은 대체로 이 순서를 지킨다.
   */
  const t = stripClaims(name.replace(/\s+/g, ''))
  const at = (r: IngredientRule) => {
    let best = -1
    for (const m of r.match) {
      const i = t.indexOf(m.replace(/\s+/g, ''))
      if (i >= 0 && (best < 0 || i < best)) best = i
    }
    return best
  }
  const hits = INGREDIENT_RULES.map((r) => ({ r, i: at(r) })).filter((x) => x.i >= 0)
  if (hits.length > 0) {
    const first = Math.min(...hits.map((x) => x.i))
    return hits.filter((x) => x.i === first).map((x) => x.r)
  }

  /* 대괄호·소괄호로 표기된 기능성 원료명만 모은다 */
  const declared = (functionText.match(/[[(][^\])]{1,40}[\])]/g) ?? [])
    .join(' ')
    .replace(/\s+/g, '')
  if (declared.length === 0) return []
  return INGREDIENT_RULES.filter((r) => r.match.some((m) => declared.includes(m.replace(/\s+/g, ''))))
}
