import type { Supplement } from './types'

/**
 * 국내 약국·드럭스토어에서 흔히 유통되는 영양제.
 *
 * 주의: 함량은 각 제품의 "1일 섭취량" 표시값을 기준으로 정리했다.
 * 제조사가 처방을 변경하는 일이 잦으므로, 실제 상담 시에는 환자가 가져온 제품의
 * 라벨을 확인하는 것을 원칙으로 한다. 이 표는 성분 규모를 가늠하기 위한 것이다.
 *
 * '대표 조성' 으로 표기된 항목은 특정 제품이 아니라 해당 분류에서 흔한 조성이다.
 */

const LABEL_NOTE = '제품 리뉴얼로 함량이 바뀔 수 있어 실제 라벨 확인이 필요하다'

export const SUPPLEMENTS: Supplement[] = [
  // ── 종합비타민 ────────────────────────────────────────────────
  {
    id: 'centrum-adult', name: '센트룸 A to Z', brand: '한국화이자', category: '종합비타민',
    dosageLabel: '1일 1정', otc: true, hf: true,
    perDay: { vitA: 800, vitD: 5, vitE: 12, vitK: 30, vitC: 100, b1: 1.4, b2: 1.6, b3: 18, b6: 2, folate: 200, b12: 2.5, ca: 162, mg: 100, fe: 5, zn: 5, se: 55, p: 125, k: 40 },
    note: `종합비타민의 표준적 조성. ${LABEL_NOTE}`
  },
  {
    id: 'centrum-silver', name: '센트룸 실버', brand: '한국화이자', category: '종합비타민',
    dosageLabel: '1일 1정', otc: true, hf: true,
    perDay: { vitA: 600, vitD: 10, vitE: 15, vitK: 30, vitC: 100, b1: 1.5, b2: 1.7, b3: 20, b6: 3, folate: 400, b12: 25, ca: 200, mg: 100, zn: 7, se: 55 },
    note: '50세 이상 대상 — 철분이 빠지고 비타민 D·B12 가 강화된 조성'
  },
  {
    id: 'multi-generic', name: '종합비타민미네랄 (대표 조성)', brand: '-', category: '종합비타민',
    dosageLabel: '1일 1정', otc: true, hf: true,
    perDay: { vitA: 700, vitD: 10, vitE: 11, vitC: 100, b1: 1.2, b2: 1.4, b3: 16, b6: 1.5, folate: 400, b12: 2.4, ca: 150, mg: 90, fe: 8, zn: 8.5, se: 55 },
    note: '권장섭취량(RNI) 100 % 내외로 맞춘 일반적인 조성'
  },

  // ── 활성비타민 B군 ────────────────────────────────────────────
  {
    id: 'aronamin-gold', name: '아로나민 골드', brand: '일동제약', category: '비타민B군',
    dosageLabel: '1일 1~2정', otc: true,
    perDay: { b1: 50, b2: 20, b6: 20, b12: 0.02, vitC: 100, vitE: 10 },
    actives: [{ name: '푸르설티아민(활성형 B1)', amount: '50 mg' }],
    note: '활성형 비타민 B1 제제. 피로·신경통에 널리 쓰인다'
  },
  {
    id: 'impactamin-power', name: '임팩타민 파워', brand: '대웅제약', category: '비타민B군',
    dosageLabel: '1일 1정', otc: true,
    perDay: { b1: 100, b2: 30, b6: 50, b12: 0.5, b3: 40, folate: 0.4, vitC: 500, vitE: 100, zn: 15, mg: 50 },
    actives: [{ name: '벤포티아민(활성형 B1)', amount: '100 mg' }],
    note: '고함량 B군 — 소변이 진한 노란색이 되는 것은 리보플라빈 때문으로 정상이다'
  },
  {
    id: 'bcomplex-generic', name: '비타민B 컴플렉스 (대표 조성)', brand: '-', category: '비타민B군',
    dosageLabel: '1일 1정', otc: true,
    perDay: { b1: 50, b2: 50, b3: 50, b6: 50, b12: 0.05, folate: 0.4 },
    note: '항암 중 말초신경병증에 B6 를 자가로 고용량 복용하는 사례가 있으나, B6 는 장기 과량 시 오히려 신경병증을 유발한다'
  },

  // ── 비타민 C ─────────────────────────────────────────────────
  {
    id: 'koreaeundan-c1000', name: '고려은단 비타민C 1000', brand: '고려은단', category: '비타민C',
    dosageLabel: '1일 1정', otc: true,
    perDay: { vitC: 1000 },
    note: '고용량 경구 비타민 C. 방사선치료·항암 중 항산화제 고용량 복용은 별도 검토가 필요하다'
  },
  {
    id: 'vitc-generic-500', name: '비타민C 500 mg (대표 조성)', brand: '-', category: '비타민C',
    dosageLabel: '1일 1~2정', otc: true, perDay: { vitC: 500 },
    note: '식품 수준을 크게 넘지 않는 용량'
  },

  // ── 비타민 D ─────────────────────────────────────────────────
  {
    id: 'vitd-1000', name: '비타민D 1000 IU', brand: '-', category: '비타민D',
    dosageLabel: '1일 1정', otc: true, hf: true, perDay: { vitD: 25 },
    note: '1000 IU = 25 µg'
  },
  {
    id: 'vitd-2000', name: '비타민D 2000 IU', brand: '-', category: '비타민D',
    dosageLabel: '1일 1정', otc: true, hf: true, perDay: { vitD: 50 },
    note: '2000 IU = 50 µg. 국내 성인 상한섭취량은 100 µg(4000 IU)'
  },
  {
    id: 'vitd-5000', name: '비타민D 5000 IU', brand: '-', category: '비타민D',
    dosageLabel: '1일 1정', otc: true, perDay: { vitD: 125 },
    note: '상한섭취량(100 µg)을 넘는 용량 — 혈중 25(OH)D 확인 없이 상시 복용은 권하지 않는다'
  },

  // ── 오메가-3 ─────────────────────────────────────────────────
  {
    id: 'omega3-rtg', name: 'rTG 오메가3 (대표 조성)', brand: '-', category: '오메가3',
    dosageLabel: '1일 1~2캡슐', otc: true, hf: true,
    perDay: { kcal: 18, fat: 2.0, omega3: 1.2, vitE: 10 },
    actives: [{ name: 'EPA + DHA', amount: '1,000~1,200 mg' }],
    note: '악액질·체중감소 환자에서 고려 대상. 항응고제 병용 시 출혈 경향에 주의'
  },
  {
    id: 'omega3-highdose', name: '고함량 오메가3 (EPA+DHA 2 g)', brand: '-', category: '오메가3',
    dosageLabel: '1일 2캡슐', otc: true, hf: true,
    perDay: { kcal: 36, fat: 4.0, omega3: 2.4, vitE: 15 },
    actives: [{ name: 'EPA + DHA', amount: '2,000 mg' }],
    note: 'ESPEN 은 진행암 체중감소 환자에서 오메가-3 보충을 "고려할 수 있다" 수준으로 언급한다'
  },

  // ── 칼슘·마그네슘 ────────────────────────────────────────────
  {
    id: 'cal-mag-d', name: '칼슘 마그네슘 비타민D (대표 조성)', brand: '-', category: '칼슘·마그네슘',
    dosageLabel: '1일 2정', otc: true, hf: true,
    perDay: { ca: 500, mg: 250, vitD: 10, zn: 5 },
    note: 'ADT·아로마타제 억제제 사용 중 골밀도 관리에 기본이 되는 조합'
  },
  {
    id: 'calcium-carbonate', name: '탄산칼슘 500 mg', brand: '-', category: '칼슘·마그네슘',
    dosageLabel: '1일 1~2정', otc: true, perDay: { ca: 500 },
    note: '위산이 있어야 흡수되므로 식후 복용. 위절제·PPI 복용자는 구연산칼슘이 유리하다'
  },

  // ── 철분 ─────────────────────────────────────────────────────
  {
    id: 'ferrous-generic', name: '철분제(건조황산제일철)', brand: '-', category: '철분',
    dosageLabel: '1일 1정', otc: true, perDay: { fe: 80, vitC: 50 },
    note: '변비·흑색변·속쓰림이 흔하다. 비타민 C 와 함께 복용하면 흡수가 오른다'
  },
  {
    id: 'ferrochel', name: '헴철 / 킬레이트철 제제', brand: '-', category: '철분',
    dosageLabel: '1일 1정', otc: true, hf: true, perDay: { fe: 12 },
    note: '위장장애가 적으나 함량이 낮아 치료적 철결핍 교정에는 부족할 수 있다'
  },

  // ── 아연·미네랄 ──────────────────────────────────────────────
  {
    id: 'zinc-generic', name: '아연 (대표 조성)', brand: '-', category: '아연·미네랄',
    dosageLabel: '1일 1정', otc: true, hf: true, perDay: { zn: 15 },
    note: '미각 변화에 흔히 쓰이나 임상 근거는 일관되지 않는다. 장기 고용량은 구리 결핍을 유발한다'
  },
  {
    id: 'selenium-generic', name: '셀레늄 200 µg', brand: '-', category: '아연·미네랄',
    dosageLabel: '1일 1정', otc: true, hf: true, perDay: { se: 200 },
    note: 'SELECT 연구에서 전립선암 예방 효과가 없었고 일부 지표는 악화되었다'
  },
  {
    id: 'magnesium-generic', name: '마그네슘 (산화/구연산)', brand: '-', category: '아연·미네랄',
    dosageLabel: '1일 1~2정', otc: true, hf: true, perDay: { mg: 300 },
    note: '시스플라틴·세툭시맙 사용 중 저마그네슘혈증 보정에 쓰인다. 과량 시 설사'
  },

  // ── 유산균 ───────────────────────────────────────────────────
  {
    id: 'lactofit', name: '락토핏 생유산균 골드', brand: '종근당건강', category: '유산균',
    dosageLabel: '1일 1~2포', otc: true, hf: true,
    perDay: { kcal: 8, carb: 1.8 },
    actives: [{ name: '유산균 혼합물', amount: '1포당 100억 CFU 보장' }],
    note: '중증 호중구감소증·중심정맥관 보유 환자에서는 균혈증 사례 보고가 있어 신중히 판단한다'
  },
  {
    id: 'probiotics-generic', name: '프로바이오틱스 (대표 조성)', brand: '-', category: '유산균',
    dosageLabel: '1일 1캡슐', otc: true, hf: true,
    perDay: { kcal: 5 },
    actives: [{ name: 'Lactobacillus·Bifidobacterium 복합', amount: '100억~500억 CFU' }],
    note: '골반 방사선치료로 인한 설사에 대해 소규모 연구들이 있으나 결과가 엇갈린다'
  },

  // ── 단백질·경장영양 ──────────────────────────────────────────
  {
    id: 'nucare-standard', name: '뉴케어 (일반형)', brand: '대상웰라이프', category: '경장영양(균형영양식)',
    dosageLabel: '1일 1~3팩(200 mL)', otc: true,
    perDay: { kcal: 200, carb: 27, protein: 8, fat: 6.6, fiber: 2, na: 160, k: 300, ca: 160, p: 140, fe: 2.4, zn: 2.4, vitD: 2 },
    note: '1팩 기준. 경구 섭취가 필요량의 60 % 에 못 미치면 ESPEN 은 이런 경구영양보충(ONS) 을 권고한다'
  },
  {
    id: 'greenbia', name: '그린비아 뉴프로', brand: '정식품', category: '경장영양(균형영양식)',
    dosageLabel: '1일 1~3팩(200 mL)', otc: true,
    perDay: { kcal: 200, carb: 24, protein: 12, fat: 6.5, fiber: 2.5, na: 180, k: 320, ca: 200, p: 160, zn: 3, vitD: 3 },
    note: '단백질을 강화한 조성 — 치료 중 근육량 유지가 목표일 때 유리'
  },
  {
    id: 'harmonilan', name: '하모닐란', brand: '엔테라', category: '경장영양(균형영양식)',
    dosageLabel: '1일 1~3팩', otc: true,
    perDay: { kcal: 200, carb: 26, protein: 8, fat: 7, fiber: 3, na: 200, k: 300, ca: 130, p: 120 },
    note: '경관영양에도 사용되는 균형영양식'
  },
  {
    id: 'wpi-powder', name: '유청단백분말(WPI)', brand: '-', category: '단백질보충',
    dosageLabel: '1일 1~2스쿱(30 g)', otc: true,
    perDay: { kcal: 111, protein: 25.5, carb: 1.8, fat: 0.6, ca: 150, na: 90 },
    note: '식사량을 늘리기 어려울 때 단백질만 선택적으로 올릴 수 있다'
  },

  // ── 간건강 ───────────────────────────────────────────────────
  {
    id: 'silymarin', name: '밀크씨슬(실리마린)', brand: '-', category: '간건강', otc: true, hf: true,
    dosageLabel: '1일 1~2캡슐', perDay: {},
    actives: [{ name: '실리마린', amount: '130~260 mg' }],
    note: '간수치 개선에 대한 근거는 제한적이다. 다만 CYP 효소 영향이 크지 않아 병용 위험은 낮은 편'
  },
  {
    id: 'udca', name: '우루사(UDCA) 일반의약품', brand: '대웅제약', category: '간건강', otc: true,
    dosageLabel: '1일 3회', perDay: {},
    actives: [{ name: 'Ursodeoxycholic acid', amount: '100 mg/정' }],
    note: '영양제가 아닌 의약품 — 간질환 환자에서는 처방 맥락에서 판단해야 한다'
  },

  // ── 홍삼·기타 기능성 ─────────────────────────────────────────
  {
    id: 'red-ginseng', name: '홍삼정 (대표 조성)', brand: '-', category: '홍삼·인삼', otc: true, hf: true,
    dosageLabel: '1일 1~3 g', perDay: { kcal: 10, carb: 2.5 },
    actives: [{ name: '진세노사이드 Rg1+Rb1+Rg3', amount: '3~80 mg' }],
    note: '항암 중 피로 개선에 대한 소규모 연구가 있으나, 항응고제·혈당강하제와의 상호작용 가능성이 보고되어 있다'
  },
  {
    id: 'coq10', name: '코엔자임Q10', brand: '-', category: '항산화·기타', otc: true, hf: true,
    dosageLabel: '1일 1캡슐', perDay: {},
    actives: [{ name: 'Coenzyme Q10', amount: '100 mg' }],
    note: '와파린 효과를 감소시킬 수 있다'
  },
  {
    id: 'vite-400', name: '비타민E 400 IU', brand: '-', category: '항산화·기타', otc: true, hf: true,
    dosageLabel: '1일 1캡슐', perDay: { vitE: 268 },
    note: 'SELECT 연구에서 고용량 비타민 E 는 전립선암 발생을 오히려 17 % 증가시켰다'
  },
  {
    id: 'curcumin', name: '커큐민(강황추출물)', brand: '-', category: '항산화·기타', otc: true, hf: true,
    dosageLabel: '1일 1~2캡슐', perDay: {},
    actives: [{ name: '커큐미노이드', amount: '200~500 mg' }],
    note: '전임상 근거는 풍부하나 사람 대상 항암 효과는 아직 확립되지 않았다. 고용량은 철 흡수를 방해할 수 있다'
  },
  {
    id: 'ahcc-mushroom', name: '버섯균사체 추출물(AHCC 등)', brand: '-', category: '항산화·기타', otc: true,
    dosageLabel: '1일 1~3 g', perDay: {},
    actives: [{ name: '베타글루칸', amount: '제품별 상이' }],
    note: '국내에서 "면역력" 목적으로 흔히 구매되나, 생존율 개선을 보인 대규모 임상시험은 없다'
  },

  // ── 식이섬유 ─────────────────────────────────────────────────
  {
    id: 'psyllium', name: '차전자피 식이섬유', brand: '-', category: '식이섬유', otc: true, hf: true,
    dosageLabel: '1일 1~2포', perDay: { kcal: 20, carb: 6, fiber: 5 },
    note: '변비와 설사 모두에 쓰이는 수용성 섬유. 반드시 충분한 물과 함께 복용한다'
  },
  {
    id: 'inulin', name: '이눌린(프리바이오틱스)', brand: '-', category: '식이섬유', otc: true, hf: true,
    dosageLabel: '1일 1포', perDay: { kcal: 15, carb: 5, fiber: 4.5 },
    note: '가스·복부팽만을 유발할 수 있어 장 수술 직후에는 서서히 늘린다'
  }
]

export const SUPPLEMENT_BY_ID: Record<string, Supplement> = Object.fromEntries(
  SUPPLEMENTS.map((s) => [s.id, s])
)
