import type { Interaction } from './types'

/**
 * 약제 × 식품/영양제 상호작용.
 * 환자가 복용 중인 약을 입력하면 해당 항목만 평가된다.
 */

/** 사용자가 고를 수 있는 약제 목록 (성분명 기준, 상품명은 aliases 로 검색) */
export interface Medication {
  id: string
  name: string
  aliases: string[]
  cls: string
  /**
   * 이 약이 딸린 윗칸. 윗칸을 고르셨을 때만 화면에 나온다.
   *
   * 2026-10-13 에 생겼다. 자몽을 두고 레트로졸·아나스트로졸·엑스메스탄의 근거가 서로 달라
   * '아로마타제 억제제' 한 칸으로는 답할 수 없게 됐다. 윗칸('ai')은 그대로 두고 그 아래에 약 이름을 고르게 했다 —
   * 뼈 건강 안내처럼 계열 전체에 해당하는 것은 윗칸 id 로 계속 걸리고, 약마다 다른 것만 아랫칸 id 로 건다.
   * 2세대 호르몬제(자이티가·엑스탄디·얼리다·뉴베카)도 같다. 이 약들은 안드로겐 차단요법에 더해 쓰는 약이다
   * (허가사항: GnRH 유사체를 함께 쓰거나 고환절제를 받은 환자).
   */
  parent?: string
}

export const MEDICATIONS: Medication[] = [
  { id: 'tamoxifen', name: '타목시펜', aliases: ['놀바덱스', 'tamoxifen'], cls: '항호르몬' },
  { id: 'ai', name: '아로마타제 억제제', aliases: ['아나스트로졸', '레트로졸', '엑스메스탄', '페마라', '아리미덱스'], cls: '항호르몬' },
  { id: 'ai-letrozole', name: '레트로졸 (페마라)', aliases: ['페마라', 'letrozole', 'femara'], cls: '항호르몬', parent: 'ai' },
  { id: 'ai-anastrozole', name: '아나스트로졸 (아리미덱스)', aliases: ['아리미덱스', 'anastrozole', 'arimidex'], cls: '항호르몬', parent: 'ai' },
  { id: 'ai-exemestane', name: '엑스메스탄 (아로마신)', aliases: ['아로마신', 'exemestane', 'aromasin'], cls: '항호르몬', parent: 'ai' },
  { id: 'adt', name: '안드로겐 차단요법(ADT)', aliases: ['졸라덱스', '루프린', '엘리가드', '비칼루타미드'], cls: '항호르몬' },
  { id: 'adt-abiraterone', name: '아비라테론 (자이티가)', aliases: ['자이티가', 'abiraterone', 'zytiga'], cls: '항호르몬', parent: 'adt' },
  { id: 'adt-enzalutamide', name: '엔잘루타미드 (엑스탄디)', aliases: ['엑스탄디', 'enzalutamide', 'xtandi'], cls: '항호르몬', parent: 'adt' },
  { id: 'adt-apalutamide', name: '아팔루타미드 (얼리다)', aliases: ['얼리다', 'apalutamide', 'erleada'], cls: '항호르몬', parent: 'adt' },
  { id: 'adt-darolutamide', name: '다롤루타미드 (뉴베카)', aliases: ['뉴베카', 'darolutamide', 'nubeqa'], cls: '항호르몬', parent: 'adt' },
  { id: 'capecitabine', name: '카페시타빈', aliases: ['젤로다', 'xeloda'], cls: '경구 항암제' },
  { id: 'tki-egfr', name: 'EGFR 표적치료제', aliases: ['이레사', '타쎄바', '지오트립', '타그리소', '오시머티닙', '게피티닙'], cls: '표적치료제' },
  { id: 'tki-alk', name: 'ALK 표적치료제', aliases: ['잴코리', '알레센자', '로비큐아', '알룬브릭', '브리가티닙'], cls: '표적치료제' },
  { id: 'cdk46', name: 'CDK4/6 억제제', aliases: ['입랜스', '키스칼리', '버제니오', '팔보시클립'], cls: '표적치료제' },
  { id: 'sorafenib', name: '소라페닙 / 렌바티닙', aliases: ['넥사바', '렌비마'], cls: '표적치료제' },
  { id: 'warfarin', name: '와파린', aliases: ['쿠마딘', 'warfarin'], cls: '항응고제' },
  { id: 'doac', name: 'DOAC (아픽사반·리바록사반 등)', aliases: ['엘리퀴스', '자렐토', '릭시아나', '프라닥사', '다비가트란'], cls: '항응고제' },
  { id: 'bortezomib', name: '보르테조밉', aliases: ['벨케이드'], cls: '항암제' },
  { id: 'cisplatin', name: '시스플라틴', aliases: ['백금계'], cls: '항암제' },
  { id: 'oxaliplatin', name: '옥살리플라틴', aliases: ['엘록사틴', 'FOLFOX'], cls: '항암제' },
  { id: 'irinotecan', name: '이리노테칸', aliases: ['캠푸토', 'FOLFIRI'], cls: '항암제' },
  { id: 'methotrexate', name: '메토트렉세이트', aliases: ['MTX'], cls: '항암제' },
  { id: 'steroid', name: '스테로이드(덱사메타손 등)', aliases: ['덱사', '프레드니솔론'], cls: '보조약제' },
  { id: 'ppi', name: '위산분비억제제(PPI)', aliases: ['넥시움', '판토록', '란스톤'], cls: '보조약제' },
  { id: 'levothyroxine', name: '갑상선호르몬제', aliases: ['씬지로이드', '신지록신'], cls: '보조약제' }
]

export const MED_BY_ID: Record<string, Medication> = Object.fromEntries(MEDICATIONS.map((m) => [m.id, m]))

/** 윗칸을 고르셨을 때 그 아래에서 고르는 약들 */
export const childrenOf = (id: string): Medication[] => MEDICATIONS.filter((m) => m.parent === id)

/** 화면에 보일 약 — 윗칸은 늘, 아랫칸은 윗칸을 고르셨을 때만 */
export function visibleMedications(selected: readonly string[]): Medication[] {
  return MEDICATIONS.filter((m) => !m.parent || selected.includes(m.parent))
}

/**
 * 약 하나를 켜거나 끈다.
 *
 * 윗칸을 끄면 아랫칸도 함께 꺼진다 — 화면에서 사라진 칸이 켜진 채 남으면 끌 길이 없다.
 * 같은 윗칸 아래에서는 하나만 고른다(레트로졸과 아나스트로졸을 함께 드시지는 않는다).
 * 화면 두 군데(내 정보·내 식단)가 이 함수 하나를 쓴다.
 */
export function toggleMedication(selected: readonly string[], id: string): string[] {
  const med = MED_BY_ID[id]
  if (!med) return [...selected]
  if (selected.includes(id)) {
    const drop = new Set([id, ...childrenOf(id).map((c) => c.id)])
    return selected.filter((m) => !drop.has(m))
  }
  if (!med.parent) return [...selected, id]
  const siblings = new Set(childrenOf(med.parent).map((c) => c.id))
  const kept = selected.filter((m) => !siblings.has(m))
  return [...(kept.includes(med.parent) ? kept : [...kept, med.parent]), id]
}

/**
 * 저장된 약 목록을 성하게 만든다 — 모르는 id 는 버리고, 윗칸 없는 아랫칸에는 윗칸을 채운다.
 * 예전 판이 남긴 자료나 손상된 자료를 읽을 때 쓴다(lib/store.ts).
 */
export function normalizeMedications(list: readonly unknown[]): string[] {
  const known = list.filter((m): m is string => typeof m === 'string' && !!MED_BY_ID[m])
  const out: string[] = []
  for (const m of known) {
    const parent = MED_BY_ID[m].parent
    if (parent && !out.includes(parent) && !known.includes(parent)) out.push(parent)
    if (!out.includes(m)) out.push(m)
  }
  return out
}

/**
 * 식사와 얽힌 복용법 — 음식 하나에 매이지 않아 상호작용 표에 넣을 수 없는 것.
 *
 * 2026-10-13 에 2세대 호르몬제를 넣으면서 생겼다. 자이티가는 "무엇을 피하는가" 가 아니라 "언제 먹는가" 가 전부다 —
 * 음식과 함께 먹으면 약 농도가 5~10배가 된다. 이것을 빼고 자몽 이야기만 하면 정작 중요한 것을 빠뜨린 것이 된다.
 * 허가사항(DailyMed, 2026-10-13 확인)에 적힌 문장만 옮긴다. 용량·횟수는 적지 않는다 — 그것은 처방이다.
 */
export const MEAL_TIMING: { med: string; text: string; refIds: string[] }[] = [
  {
    med: 'adt-abiraterone',
    text: '자이티가(아비라테론)는 빈속에 드세요 — 드시기 전 2시간과 드신 뒤 1시간은 음식을 드시지 않습니다. ' +
      '음식과 함께 드시면 약 농도가 5~10배까지 올라갑니다(허가사항).',
    refIds: ['fda-label-arpi']
  },
  { med: 'adt-darolutamide', text: '뉴베카(다롤루타미드)는 음식과 함께 드세요(허가사항).', refIds: ['fda-label-arpi'] },
  { med: 'ai-exemestane', text: '아로마신(엑스메스탄)은 식후에 드세요(허가사항).', refIds: ['fda-label-ai'] }
]

/** 고르신 약 가운데 식사와 얽힌 복용법이 있는 것 */
export const mealTimingFor = (medications: readonly string[]) => MEAL_TIMING.filter((t) => medications.includes(t.med))

export const INTERACTIONS: Interaction[] = [
  // ── CYP3A4 ──────────────────────────────────────────────────
  {
    id: 'int-grapefruit-tki',
    agent: 'tki-egfr',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    /*
     * 2026-10-14 전수 대조 — 이레사·타쎄바·지오트립·타그리소를 한 칸에 두고 "표적치료제의 농도를 예측 불가능하게 올립니다" 라고
     * 했는데, 허가사항(DailyMed)을 보니 약마다 다르다. 자몽을 적은 것은 엘로티닙뿐이고, 오시머티닙은 강한 억제제로도
     * 의미 있는 변화가 없었으며, 아파티닙은 CYP3A4 로 거의 대사되지 않는다. 제목·이유를 약별로 고쳤다.
     * 타그리소·지오트립에 '피하세요' 를 둘지는 전문의 판단으로 남긴다(판정은 그대로).
     */
    title: 'EGFR 표적치료제 복용 중 자몽은 피하세요',
    reason:
      '이 약들은 자몽과의 관계가 약마다 다릅니다. 엘로티닙(타쎄바)은 허가사항이 자몽과 자몽주스를 강한 CYP3A4 억제제와 함께 ' +
      '피하라고 적고 있고, 게피티닙(이레사)은 강한 억제제(이트라코나졸)와 함께 쓰면 농도가 80 % 올랐습니다. ' +
      '반면 오시머티닙(타그리소)은 강한 억제제와 함께 써도 농도에 의미 있는 변화가 없었고, 아파티닙(지오트립)은 이 효소로 거의 대사되지 않습니다. ' +
      '자몽은 한 개나 주스 200 mL 로도 작용하고, 24시간이 지나도 최대 효과의 4분의 1이 남아 복용 시간을 띄우는 것으로는 피할 수 없습니다. ' +
      '라임·포멜로도 같으며, 보통 단맛 오렌지(네이블·발렌시아)는 해당되지 않습니다.',
    /*
     * 등급을 'B'(대규모 전향적 코호트) 로 두었으나 인용한 것은 종설·증례다.
     * 이 앱의 정의로는 'C'(소규모·기전 연구) 다.
     * 권고 수준(피하세요/주의)은 등급과 별개다 — 약품 설명서에 실리는 상호작용이라
     * 등급을 낮춘다고 권고가 약해지지 않는다. 다만 등급은 **인용한 것** 에 맞춘다.
     */
evidence: 'C',
    refIds: ['fda-label-egfr', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-cdk',
    agent: 'cdk46',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: 'CDK4/6 억제제 복용 중 자몽은 피하세요',
    /*
     * 2026-10-14 전수 대조 — Bailey 2013 에는 CDK4/6 억제제가 없다. 실제 출처는 허가사항이다.
     * 입랜스·버제니오는 자몽을 피하라고 적고, 키스칼리 미국 허가사항에는 자몽 문장이 없다('모두 금한다' 를 고침).
     */
    reason:
      '팔보시클립(입랜스)과 아베마시클립(버제니오)은 허가사항이 자몽과 자몽 제품을 피하라고 적고 있습니다. ' +
      '리보시클립(키스칼리)도 주로 CYP3A4 로 대사되어, 강한 억제제와 함께 쓰면 농도(AUC)가 3.2배 올랐고 허가사항은 강한 억제제를 피하도록 합니다. ' +
      '농도가 오르면 호중구감소증 같은 부작용이 심해질 수 있습니다.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    /*
     * 등급을 'B'(대규모 전향적 코호트) 로 두었으나 인용한 것은 종설·증례다.
     * 이 앱의 정의로는 'C'(소규모·기전 연구) 다.
     * 권고 수준(피하세요/주의)은 등급과 별개다 — 약품 설명서에 실리는 상호작용이라
     * 등급을 낮춘다고 권고가 약해지지 않는다. 다만 등급은 **인용한 것** 에 맞춘다.
     */
evidence: 'C',
    refIds: ['fda-label-cdk46', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-alk',
    agent: 'tki-alk',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: 'ALK 표적치료제도 자몽과 함께 드시면 안 됩니다',
    /*
     * 2026-10-14 전수 대조 — 예로 든 알렉티닙은 허가사항상 강한 억제제(포사코나졸)로도 의미 있는 변화가 없었다.
     * 간독성은 Bailey 표에 없다(크리조티닙: QT 연장·골수 억제). 예시와 부작용을 허가사항·Bailey 에 맞췄다.
     */
    reason: '크리조티닙(잴코리)은 허가사항이 자몽과 자몽주스를 피하라고 적고 있습니다 — 농도가 오르면 QT 연장(심장 리듬 이상)과 ' +
      '골수 억제 위험이 커집니다. 로라티닙(로비큐아)도 허가사항이 강한 CYP3A 억제제를 피하도록 합니다. ' +
      '반면 알렉티닙(알레센자)은 강한 억제제와 함께 써도 농도에 의미 있는 변화가 없었습니다.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['fda-label-alk', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-sorafenib',
    agent: 'sorafenib',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: '소라페닙·렌바티닙 복용 중 자몽을 피하세요',
    /*
     * 2026-10-14 전수 대조 — "CYP3A4 억제로 농도가 올라가면" 은 허가사항과 어긋났다. 넥사바는 케토코나졸로 AUC 변화가 없었고,
     * 렌비마는 15 % 올랐다. 두 허가사항에 자몽은 없고, Bailey 2013 은 소라페닙을 오히려 '대체 약' 칸에 둔다.
     * 사실대로 적는다. '피하세요' 를 유지할지는 전문의 판단으로 남긴다(판정은 그대로).
     */
    reason: '소라페닙(넥사바)은 강한 CYP3A4 억제제(케토코나졸)와 함께 써도 약 농도가 변하지 않았고, ' +
      '렌바티닙(렌비마)도 15 % 오르는 데 그쳤습니다. 두 약의 허가사항에는 자몽에 관한 말이 없고, 자몽과 함께 본 연구도 없습니다. ' +
      '자몽 상호작용 종설은 소라페닙을 오히려 자몽 영향이 큰 약 대신 쓸 수 있는 약으로 듭니다. ' +
      '확인된 해가 아니라 조심하는 쪽으로 둔 안내입니다.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['fda-label-sorafenib-lenvatinib', 'bailey2013grapefruit']
  },

  // ── 항호르몬제와 자몽 ─────────────────────────────────────────
  /*
   * 2026-10-13 전문의 결정: 항호르몬제를 드시는 동안 자몽은 피하도록(타목시펜·레트로졸),
   * 근거를 찾지 못한 약(아나스트로졸·엑스메스탄·ADT)은 '주의' 로.
   *
   * 같은 날 원문을 확인했다. 숨기지 않고 적는다.
   *  · 미국 허가사항 11종(Soltamox·Femara·Arimidex·Aromasin·Casodex·Zoladex·Lupron·Zytiga·Xtandi·Erleada·Nubeqa)에
   *    'grapefruit' 라는 낱말이 **한 번도 나오지 않는다.**
   *  · PubMed 에 타목시펜·아로마타제 억제제·ADT 계열과 자몽을 함께 쓴 임상 연구가 없다.
   *  · 라드바우드·리버풀대 Cancer Drug Interactions(2022-06 보관본)만 등급을 매겨 두었다 —
   *    타목시펜 'Do Not Coadminister', 레트로졸 'Potential Interaction(not recommended)', 아팔루타미드·엔잘루타미드
   *    'Potential Weak Interaction', 아비라테론 'No Interaction Expected'. 근거의 질은 모두 Very Low~Low 이고
   *    요약은 한결같이 "Coadministration has not been studied" 로 시작한다.
   *    아나스트로졸·엑스메스탄·비칼루타미드·고세렐린·류프로렐린·다롤루타미드는 그 자료에 항목이 없다.
   *
   * 그래서 등급은 전부 'C'(기전) 이고, 이유 글마다 "함께 써 본 연구는 없다" 를 적는다.
   * 권고 수준(피하세요·주의)은 전문의가 정한 것이고 등급은 인용한 것에 맞춘 것이다 — 둘은 별개다.
   */
  {
    id: 'int-grapefruit-tamoxifen',
    agent: 'tamoxifen',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: '타목시펜을 드시는 동안 자몽은 피하세요',
    reason:
      '타목시펜은 몸 안에서 CYP3A4·CYP2D6 효소를 거쳐 훨씬 강한 활성 대사물(엔독시펜 등)로 바뀌어 작용합니다. ' +
      '자몽은 장의 CYP3A4 를 억제하므로 타목시펜 농도는 올리고 활성 대사물은 낮출 수 있습니다. ' +
      '다만 두 가지를 함께 써 본 임상 연구는 없습니다. ' +
      '라드바우드·리버풀대의 암 약물 상호작용 자료는 근거의 질을 "매우 낮음" 으로 매기면서도 함께 쓰지 말라고 하고, ' +
      '캐나다 BC Cancer 약물 자료는 "임상적 의미는 알 수 없다" 고 적습니다. 미국 허가사항에는 자몽에 관한 말이 없습니다. ' +
      '즉 확인된 해가 아니라 기전에 근거해 조심하는 것입니다. ' +
      /* 2026-10-14 전수 대조 — '귤' 은 어느 출처에도 없다. Bailey 2013 이 말하는 것은 네이블·발렌시아 단맛 오렌지다 */
      '라임·포멜로도 같고, 보통 단맛 오렌지(네이블·발렌시아)는 해당하지 않습니다.',
    evidence: 'C',
    refIds: ['cdi-liverpool', 'bccancer-tamoxifen', 'fda-label-tamoxifen']
  },
  {
    id: 'int-grapefruit-letrozole',
    agent: 'ai-letrozole',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: '레트로졸(페마라)을 드시는 동안 자몽은 피하세요',
    reason:
      '레트로졸은 CYP3A4 와 CYP2A6 로 대사됩니다. 자몽이 CYP3A4 를 억제하면 레트로졸 농도가 올라갈 수 있습니다. ' +
      '함께 써 본 임상 연구는 없습니다. 라드바우드·리버풀대의 암 약물 상호작용 자료는 근거의 질을 "매우 낮음" 으로 매기고 ' +
      '"권장하지 않는다 — 피할 수 없으면 부작용을 잘 살필 것" 이라고 적습니다. 미국 허가사항에는 자몽에 관한 말이 없습니다. ' +
      '확인된 해가 아니라 기전에 근거해 조심하는 것입니다.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['cdi-liverpool', 'fda-label-ai', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-anastrozole',
    agent: 'ai-anastrozole',
    match: { tags: ['자몽계'] },
    level: 'caution',
    title: '아나스트로졸(아리미덱스)과 자몽 — 근거는 없지만 많이 드시지는 마세요',
    reason:
      '아나스트로졸과 자몽을 함께 본 연구는 없고, 미국 허가사항에도, 암 약물 상호작용 자료에도 이 조합은 실려 있지 않습니다. ' +
      /* 2026-10-14 전수 대조 — 허가사항은 음식이 흡수 속도를 늦춘다고 적는다(흡수량은 그대로). '내용이 없다' 를 고쳤다 */
      '허가사항에서 함께 쓰지 말라고 한 것은 에스트로겐이 든 제제와 타목시펜뿐이고, 음식은 흡수 속도만 조금 늦출 뿐 흡수되는 양은 바꾸지 않는다고 적혀 있습니다. ' +
      '같은 계열인 레트로졸에 "권장하지 않는다" 는 의견이 있어, 그에 준해 조심하는 쪽으로 둔 것입니다. ' +
      '가끔 한두 쪽 드시는 것까지 막을 근거는 없습니다. 매일 드시거나 주스로 많이 드시는 것은 삼가세요.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['fda-label-ai', 'cdi-liverpool', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-exemestane',
    agent: 'ai-exemestane',
    match: { tags: ['자몽계'] },
    level: 'caution',
    title: '엑스메스탄(아로마신)과 자몽 — 근거는 없지만 많이 드시지는 마세요',
    reason:
      '엑스메스탄은 CYP3A4 로 대사되지만, 허가사항에 따르면 강한 CYP3A4 억제제(케토코나졸)를 함께 썼을 때 ' +
      '엑스메스탄 농도에 의미 있는 변화가 없었고 "억제제에 의한 영향은 없을 것으로 보인다" 고 적혀 있습니다. ' +
      '자몽과 직접 본 연구는 없고 허가사항에도 자몽에 관한 말은 없습니다. ' +
      '그래서 피하시라고 할 근거는 없으며, 매일 드시거나 주스로 많이 드시는 것만 삼가시면 됩니다.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['fda-label-ai', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-ai',
    agent: 'ai',
    unlessTaking: ['ai-letrozole', 'ai-anastrozole', 'ai-exemestane'],
    match: { tags: ['자몽계'] },
    level: 'caution',
    title: '아로마타제 억제제와 자몽 — 어느 약인지에 따라 다릅니다',
    reason:
      '레트로졸(페마라)은 자몽과 함께 쓰는 것을 권장하지 않는다는 의견이 있고, ' +
      '아나스트로졸(아리미덱스)과 엑스메스탄(아로마신)은 그런 근거가 없습니다. 어느 쪽이든 함께 써 본 임상 연구는 없습니다. ' +
      '"내 정보" 의 복용 중인 약에서 드시는 약 이름을 골라 주시면 그 약에 맞춰 알려 드립니다.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['cdi-liverpool', 'fda-label-ai', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-adt',
    agent: 'adt',
    match: { tags: ['자몽계'] },
    level: 'caution',
    title: '안드로겐 차단요법과 자몽 — 근거는 없지만 많이 드시지는 마세요',
    reason:
      '주사제(졸라덱스·루프린)와 비칼루타미드의 미국 허가사항에는 자몽에 관한 말이 없습니다. ' +
      '졸라덱스 허가사항은 다른 약과의 상호작용이 확인된 바 없다고 적고, 비칼루타미드는 음식이 흡수에 영향을 주지 않는다고 적습니다. ' +
      '자몽과 함께 본 임상 연구도 없습니다. 피하시라고 할 근거는 없으며, ' +
      '오래 드시는 약이라 매일 드시거나 주스로 많이 드시는 것만 삼가도록 둔 것입니다. ' +
      '함께 드시는 약(자이티가·엑스탄디·얼리다·뉴베카)이 있으면 "내 정보" 에서 골라 주세요.' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['fda-label-adt', 'cdi-liverpool', 'bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-apalutamide',
    agent: 'adt-apalutamide',
    match: { tags: ['자몽계'] },
    level: 'caution',
    title: '아팔루타미드(얼리다)를 드시는 동안 자몽은 조심하세요',
    reason:
      '아팔루타미드는 CYP2C8 과 CYP3A4 로 대사됩니다. 허가사항은 강한 CYP3A4 억제제(케토코나졸)를 계속 함께 쓰면 ' +
      '약 농도가 올라갈 것으로 예측된다고 적고(정상상태 AUC 51 % 증가 예측), 부작용이 생기면 용량을 줄이도록 합니다. ' +
      '자몽과 직접 본 연구는 없습니다. 암 약물 상호작용 자료는 "약한 상호작용 가능 — 주의할 것" 으로 분류합니다(근거의 질 매우 낮음).' +
      ' 라임·포멜로와 세비야 오렌지도 같은 작용을 해서 함께 표시합니다.',
    evidence: 'C',
    refIds: ['cdi-liverpool', 'fda-label-arpi', 'bailey2013grapefruit']
  },

  // ── 와파린 ───────────────────────────────────────────────────
  {
    id: 'int-warfarin-vitk',
    agent: 'warfarin',
    /* 태그가 빠진 음식도 성분표의 숫자로 걸리게 한다 — 시금치된장국 건더기가 그랬다 */
    match: { tags: ['고비타민K'], nutrient: { key: 'vitK', op: '>', value: 100, basis: 'serving' } },
    level: 'caution',
    title: '비타민 K 섭취량을 갑자기 바꾸지 마세요',
    reason:
      '시금치·케일·브로콜리·청국장·낫토는 비타민 K 가 많습니다. 끊을 필요는 없지만 ' +
      '"어제는 많이, 오늘은 전혀"처럼 들쭉날쭉하면 INR 이 흔들립니다. 와파린 허가사항은 비타민 K 를 일정한 양으로 유지하는 ' +
      '고른 식사를 하고, 녹색 잎채소를 갑자기 많이 드시는 것 같은 큰 식사 변화를 피하도록 합니다. ' +
      '가늠이 필요하시면 한국인 하루 충분섭취량이 남자 75 µg·여자 65 µg 입니다 — 시금치 한 접시로도 이 값을 훌쩍 넘습니다. ' +
      '많고 적음이 문제가 아니라 날마다 달라지는 것이 문제라는 뜻입니다.',
    evidence: 'G',
    /*
     * 카페시타빈 증례 보고를 비타민 K 규칙에 달아 두고 있었다 — 두 출처가 서로 바뀌어 있었다.
     * 2026-10-14 전수 대조 — ACCP 2012 는 '매일 비슷한 양' 을 직접 권하지 않는다(식사 변화를 INR 검사 빈도 요인으로 든다).
     * 그 말을 그대로 하는 와파린 허가사항을 붙였다. KDRI 의 75·65 µg 은 '권장량' 이 아니라 충분섭취량이다.
     */
    refIds: ['fda-label-warfarin', 'warfarin-vitk', 'kdri2025']
  },
  {
    id: 'int-warfarin-omega3',
    agent: 'warfarin',
    match: { supplementCategories: ['오메가3'] },
    level: 'caution',
    title: '오메가-3 고용량은 출혈 경향을 더할 수 있습니다',
    reason:
      '오메가-3 는 혈소판 응집에 관여합니다. 와파린과 함께 쓰면 출혈 경향이 더해질 수 있어, ' +
      '시작하거나 끊을 때 INR 을 확인하는 것이 좋습니다 — 와파린 허가사항도 다른 약이나 허브 제품을 시작·중단할 때 INR 을 더 자주 보도록 합니다. ' +
      '다만 무게는 알고 계시는 편이 낫습니다 — 유럽식품안전청은 EPA·DHA 를 합쳐 하루 5 g 까지 드셔도 ' +
      '자발 출혈이 늘지 않는다고 정리했고, 무작위 시험 11건(약 12만 명)을 모은 분석에서도 오메가-3 전체로는 출혈이 늘지 않았습니다' +
      '(비율비 1.09). 고용량 정제 EPA 만 상대위험이 50 % 늘었지만 절대 차이는 0.6 %p 였습니다. ' +
      '항응고제와 함께 쓸 때를 따로 본 자료가 없어서 드리는 주의입니다.',
    evidence: 'C',
    /*
     * ACCP 2012 전문에 omega·fish oil 이 0건이다 — 그 지침은 이 말을 하지 않는다.
     * 대신 ESPEN 이 EFSA 의 안전 용량 정리를 싣고 있어 그쪽을 붙인다.
     * 2026-10-14 전수 대조 — '혈소판'·'INR 확인' 은 ESPEN 에 없다. 혈소판은 Javaid 2024 메타분석 서론,
     * INR 은 와파린 허가사항 7.5 에서 가져왔다. 메타분석의 결과(출혈 증가 없음)도 함께 적는다.
     */
    refIds: ['espen-cachexia', 'javaid2024omega3', 'fda-label-warfarin']
  },
  {
    id: 'int-warfarin-coq10',
    agent: 'warfarin',
    match: { supplementIds: ['coq10', 'red-ginseng'] },
    level: 'caution',
    title: '코엔자임Q10·홍삼은 와파린 효과에 영향을 줄 수 있습니다',
    /*
     * 2026-10-14 전수 대조 — '3.7배' 는 상대위험이 아니라 오즈비(3.69)다. '인삼 INR 오르내림' 은 ACCP 에 없고,
     * '구조가 비타민 K 와 비슷해' 도 출처가 없었다. 와파린 허가사항 7.5 가 코엔자임Q10·인삼을 '효과를 줄일 수 있는 것' 으로 들어
     * 그것으로 바꿨다. '피해야 할 이유' 는 판정(주의)과 어긋나 'INR 확인' 으로 맺는다.
     */
    reason:
      '와파린 허가사항은 코엔자임Q10 과 인삼을 와파린 효과를 줄일 수 있는 것으로 적고 있습니다. ' +
      '그런데 관찰 자료는 반대쪽이었습니다 — 항응고 지침(ACCP 2012) 표에 실린 연구에서 코엔자임Q10 을 함께 드신 분들은 ' +
      '출혈이 더 많이 보고되었습니다(오즈비 3.69, 95 % 신뢰구간 1.88~7.24 — 출혈 오즈가 약 3.7배). ' +
      '지침 자신은 "더 확인이 필요하다"고 단서를 답니다. ' +
      '이렇게 어느 쪽으로 움직일지 예측하기 어려우니, 시작하거나 끊을 때는 INR 을 확인하세요 — 허가사항도 그렇게 하도록 합니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk', 'fda-label-warfarin']
  },
  {
    /*
     * 오심 규칙이 생강을 '권장' 으로 내보내는데, ACCP 2012 표에는 와파린 병용 시
     * 출혈 위험 증가(오즈비 3.20)로 올라 있었다. 권장과 주의가 만나는 자리인데 아무도 잡지 않았다.
     */
    id: 'int-warfarin-ginger',
    agent: 'warfarin',
    match: { tags: ['생강'] },
    level: 'caution',
    title: '와파린을 드시는 동안에는 생강을 늘리지 마세요',
    reason:
      '생강은 항암 오심에 근거가 있어 이 앱도 권해 드리지만, 와파린을 함께 드시는 경우에는 이야기가 다릅니다. ' +
      /* 2026-10-14 전수 대조 — 3.20 은 오즈비다. '출혈 위험 3.2배' 는 상대위험처럼 읽혀 고쳤다 */
      '항응고 지침이 인용한 연구에서 생강을 함께 드신 분들은 출혈이 더 많이 보고되었습니다' +
      '(오즈비 3.20, 95 % 신뢰구간 2.42~4.24 — 출혈 오즈가 약 3.2배). ' +
      '지침 자신은 "더 확인이 필요하다"는 단서를 달고 있으니 생강차 한 잔에 놀라실 일은 아닙니다. ' +
      '다만 오심 때문에 생강을 새로 시작하거나 양을 늘리실 생각이라면 담당 의료진과 먼저 상의하시고 INR 을 확인하십시오.',
    evidence: 'C',
    refIds: ['warfarin-vitk']
  },
  {
    id: 'int-doac-omega3',
    agent: 'doac',
    match: { supplementCategories: ['오메가3'] },
    level: 'caution',
    title: 'DOAC 과 오메가-3 를 함께 쓰면 출혈에 유의하세요',
    reason:
      '항응고 작용이 더해질 수 있습니다. 멍이 잘 들거나 코피가 잦아지면 알려 주셔야 합니다. ' +
      '일반 성인에서는 EPA·DHA 를 합쳐 하루 5 g 까지 자발 출혈이 늘지 않는 것으로 정리되어 있으니, ' +
      '항응고제와 함께 쓸 때를 따로 본 자료가 없어서 드리는 주의로 보시면 됩니다.',
    evidence: 'C',
    /* ACCP 2012 는 비타민 K 길항제 중심의 지침이라 DOAC·오메가3 를 다루지 않는다 */
    refIds: ['espen-cachexia']
  },

  // ── 기타 약제 ────────────────────────────────────────────────
  {
    id: 'int-bortezomib-greentea',
    agent: 'bortezomib',
    /* '항산화·기타' 분류 전체(코엔자임Q10·비타민E·커큐민…)에 붙어 있었다 — 녹차추출물 제품은 원료 규칙이 맡는다(2026-10-14) */
    match: { foodIds: ['green-tea'] },
    level: 'avoid',
    /*
     * 2026-10-14 전수 대조 — 제목은 '녹차·녹차추출물' 인데 실제로 걸리는 것은 우린 녹차 하나다(추출물 제품은 원료 규칙이 맡는다).
     * 제목을 대상에 맞췄다. 반대 방향 실험(Bannerman 2011, PMC 전문)도 함께 적는다 — 판정(피하세요)은 전문의 판단으로 남긴다.
     */
    title: '보르테조밉 치료 중 녹차는 약효를 떨어뜨릴 수 있습니다',
    reason:
      '녹차의 EGCG 가 보르테조밉의 보론산기와 직접 결합해 프로테아좀 억제 작용을 무력화시키는 것이 ' +
      '세포와 동물 실험에서 확인되었습니다(사람 대상 시험은 아직 없습니다). ' +
      '같은 현상은 보론산 계열 약제에서만 나타났고 다른 계열 프로테아좀 억제제에서는 나타나지 않았습니다. ' +
      '이 실험들을 정리한 종설은 보르테조밉을 쓰는 동안 이런 성분을 피하는 편이 낫다고 보았습니다. ' +
      '다만 반대 결과도 있습니다 — 약을 만든 회사 연구진의 동물 실험에서는 EGCG 혈중 농도가 아주 높을 때만 약효가 막혔고, ' +
      '보충제를 먹을 때보다 몇 배 높은 농도에서도 방해가 없어 저자들은 보통으로 마시는 녹차는 피할 필요가 없다고 결론지었습니다. ' +
      '농축된 녹차추출물 보충제는 피하시는 쪽이 안전합니다.',
    evidence: 'C',
    /*
     * Golden 2009(Blood)는 원문을 열지 못해 초록만 봤다(2026-10-14 전수 대조) — 그 실험(EGCG 가 보르테조밉의 세포사멸을
     * 차단, 보론산 계열에만 선택적, NMR 로 결합 확인)을 옮기고 반대 결과(Bannerman 2011)까지 함께 정리한 원문 공개 종설
     * Jia 2013(PMC3860349)으로 바꿨다. '저자들은 녹차 제품을 피해야 할 수 있다고 적었다' 는 Golden 초록의 말이라,
     * 종설이 실제로 쓴 말('dietary flavonoids should be avoided')로 고쳤다.
     */
    refIds: ['jia2013-bortezomib-green', 'bannerman2011']
  },
  {
    id: 'int-capecitabine-warfarin',
    agent: 'capecitabine',
    /*
     * 와파린을 함께 드실 때만 낸다. 이 조건이 없던 동안에는 카페시타빈만 고른 분께도
     * 비타민 K 음식마다 "와파린 효과를 크게 증폭시킵니다" 가 떴다 — 드시지 않는 약 이야기다.
     */
    alsoTaking: { medications: ['warfarin'], conditions: ['와파린복용'] },
    match: { tags: ['고비타민K'] },
    level: 'caution',
    title: '카페시타빈은 와파린 효과를 크게 증폭시킵니다',
    /*
     * 2026-10-14 전수 대조 — 증례 보고(Copur)는 기전을 "아직 모른다" 고 적는다. 'CYP2C9 억제' 는 허가사항(7.2·12.3)의 말이라
     * 그 출처를 붙이고 문장을 허가사항대로 고쳤다(S-와파린 AUC 57 % 증가, 상자 경고).
     */
    reason:
      '카페시타빈은 와파린(S-와파린)의 혈중 노출을 57 % 올렸고, 허가사항 맨 앞 상자 경고에 출혈 위험(사망 포함)이 적혀 있습니다. ' +
      '허가사항은 CYP2C9 로 대사되는 약의 노출이 늘어난다고 설명합니다. ' +
      '보고된 증례들에서는 함께 쓴 지 1~8주 만에 INR 이 10을 넘고 장 출혈이 생겼으며, ' +
      '허가사항은 카페시타빈을 시작하고 며칠 뒤부터 몇 달 뒤까지, 드물게는 끊은 뒤 한 달 안에도 생길 수 있다고 적고 있습니다. ' +
      '두 약을 함께 쓰는 동안에는 INR 을 자주 확인해야 하고, 여기에 비타민 K 섭취량 변동까지 겹치면 조절이 매우 어려워집니다.',
    evidence: 'C',
    /*
     * 증례 보고(Copur 2001)는 구독제라 초록만 볼 수 있었다(2026-10-14 전수 대조). 'Copur 증례: 병용 6주 뒤 INR 10 초과·위장관 출혈' 은
     * 사실 두 증례(6주·질-직장 출혈 / 8주·흑색변)를 섞은 표현이었다. Copur 두 증례를 포함한 6건을 표로 정리한 원문 공개 증례·문헌고찰
     * Althiab 2021(PMC8842720)로 바꾸고, 1~8주·INR 10 초과로 고쳤다. 발생 시점은 허가사항 5.2 의 문장이다.
     */
    refIds: ['fda-label-capecitabine', 'althiab2021-cape-warf']
  },
  {
    id: 'int-oxaliplatin-cold',
    agent: 'oxaliplatin',
    // 차갑게 마시는 것이 문제이므로 음료로 한정한다
    /*
     * 2026-10-14 전수 대조 — ESPEN 2021 원문에 oxaliplatin 이 0건이다. 이 말을 그대로 하는 것은 옥살리플라틴 허가사항이라
     * 출처를 바꿨다. '미지근하게 드시면 상당히 줄일 수 있다' 는 효과 크기를 보여 주는 자료가 없어 뺐고, 대신 허가사항의
     * 환자 안내("음료는 따뜻하게 또는 상온으로")를 howTo 로 둔다 — 물·보리차에 붙어도 '줄이라' 가 아니라 '데워 드시라' 로 읽히게.
     * 아이스 음료·아이스크림·빙수·냉면은 이 match 로 잡히지 않는다(찬 음식 태그가 없다) — 남은 일로 적어 둔다.
     */
    match: { restrictGroups: ['음료'], tags: ['수분보충'] },
    level: 'caution',
    title: '옥살리플라틴 투여 후 며칠간은 찬 음식·찬 음료를 피하세요',
    reason:
      '옥살리플라틴은 투여 뒤 몇 시간에서 이틀 사이에 손발·입 주위·목이 저리거나 조이는 느낌(급성 신경독성)을 일으킬 수 있고, ' +
      '찬 것에 닿거나 찬 것을 마시면 이 증상이 생기거나 심해집니다. ' +
      '허가사항은 찬 음료와 얼음을 피하고, 음료는 따뜻하게 또는 상온으로 드시도록 안내합니다. ' +
      '물을 줄이시라는 뜻이 아닙니다 — 온도만 바꿔 드세요.',
    howTo: '따뜻하게 또는 상온으로 드세요',
    evidence: 'G',
    refIds: ['fda-label-oxaliplatin']
  },
  {
    /*
     * 찬 음식 쪽(2026-10-15 안전 검토). 위 규칙은 음료(수분보충)에만 걸려, 점막염이 있는 분께 아이스크림·빙수가
     * '권장'(cond-muc-cold)으로 남아 있었다. 같은 허가사항, 같은 말이다. 음료는 위 규칙이 맡으므로 여기서는 뺀다.
     */
    id: 'int-oxaliplatin-cold-food',
    agent: 'oxaliplatin',
    match: { tags: ['찬음식'], excludeTags: ['수분보충'] },
    level: 'caution',
    title: '옥살리플라틴 투여 후 며칠간은 찬 음식·찬 음료를 피하세요',
    reason:
      '옥살리플라틴은 투여 뒤 몇 시간에서 이틀 사이에 손발·입 주위·목이 저리거나 조이는 느낌(급성 신경독성)을 일으킬 수 있고, ' +
      '찬 것에 닿거나 찬 것을 마시면 이 증상이 생기거나 심해집니다. ' +
      '허가사항은 찬 음료와 얼음을 피하고 찬 것에 닿지 않도록 안내합니다 — 아이스크림·빙수·냉면도 입과 목에 닿는 찬 것입니다. ' +
      '입이 헐었을 때 얼음을 물고 있으라는 안내(구강 냉각)를 들으셨더라도, 이 약을 맞는 동안에는 얼음을 피하라는 허가사항이 먼저입니다.',
    howTo: '데우거나 상온에 두었다가 드세요',
    evidence: 'G',
    refIds: ['fda-label-oxaliplatin']
  },
  {
    id: 'int-cisplatin-mg',
    agent: 'cisplatin',
    match: { supplementIds: ['magnesium-generic'], tags: ['고칼륨'] },
    level: 'info',
    title: '시스플라틴은 마그네슘·칼륨을 소변으로 빼앗아 갑니다',
    /*
     * 2026-10-14 전수 대조 — ESPEN 2021 원문에 cisplatin 이 0건이다. 허가사항(전해질 이상·수분 유지)으로 바꿨다.
     * '흔합니다·보충이 필요한 경우가 많다' 는 허가사항이 빈도를 말하지 않아 '생길 수 있다·혈액검사로 정한다' 로 줄였다.
     */
    reason:
      '시스플라틴은 콩팥의 세뇨관을 손상시켜 마그네슘·칼륨·칼슘 등이 낮아질 수 있습니다(허가사항). ' +
      '보충이 필요한지는 혈액검사를 보고 의료진이 정합니다. ' +
      '동시에 신독성이 있어 허가사항은 투여 뒤 충분한 수분과 소변량을 유지하도록 합니다.',
    evidence: 'G',
    refIds: ['fda-label-cisplatin']
  },
  /*
   * 'int-irinotecan-sjw'(세인트존스워트 — 이리노테칸 농도 감소)를 2026-10-14 뺐다.
   * 영양제 목록에 세인트존스워트 제품이 없어서, '항산화·기타'·'홍삼·인삼' 분류 전체 — 홍삼·코엔자임Q10·비타민E·커큐민·버섯균사체 — 에
   * "세인트존스워트는 항암제 농도를 떨어뜨립니다" 가 붙어 있었다. 정작 세인트존스워트 제품에는 붙지 않았다.
   * 같은 내용(Mathijssen 2002, SN-38 42 % 감소, '피하세요')은 영양제 원료 규칙 '세인트존스워트(성요한초)' 의
   * byMedication.irinotecan 이 제품 이름으로 정확히 잡는다. scripts/checks/scope.ts 가 이런 꼴을 막는다.
   */
  {
    id: 'int-mtx-folate',
    agent: 'methotrexate',
    /* 분류 전체에 걸려 엽산이 없는 아로나민 골드에도 붙었다 — 성분표(perDay.folate)에 엽산이 있는 제품만(2026-10-14) */
    match: { supplementIds: ['centrum-adult', 'centrum-silver', 'multi-generic', 'impactamin-power', 'bcomplex-generic'] },
    level: 'caution',
    title: '메토트렉세이트 사용 중 엽산 보충은 임의로 하지 마세요',
    /* 2026-10-14 전수 대조 — ESPEN 2021 원문에 folate·methotrexate 가 0건이다. 메토트렉세이트 허가사항(5.12·7.1)으로 바꿨다 */
    reason:
      '메토트렉세이트는 엽산 대사를 차단해 작용합니다. 허가사항은 엽산이 든 제품이 약효를 떨어뜨릴 수 있어 ' +
      '의료진이 필요하다고 할 때만 쓰도록 하고, 반대로 부작용을 줄이려고 의료진이 엽산을 처방하기도 합니다. ' +
      '그래서 엽산이 든 종합비타민을 스스로 더하지 마시고 먼저 의료진과 상의하세요.',
    evidence: 'G',
    refIds: ['fda-label-methotrexate']
  },
  {
    id: 'int-ppi-calcium',
    agent: 'ppi',
    match: { supplementIds: ['calcium-carbonate'] },
    level: 'caution',
    /*
     * 2026-10-14 전수 대조 — 인용하던 위절제 종설(Rogers 2011)은 구독제이고 초록에 PPI·탄산칼슘이 없다.
     * 원문 공개 종설(van der Velde 2014)을 보니 "PPI 가 칼슘 흡수를 떨어뜨린다" 는 확인되지 않았다 —
     * 에스오메프라졸 무작위 시험에서 차이가 없었고, PPI 복용자에서 두 제형을 견준 연구는 없다. 제목·이유를 그만큼으로 줄였다.
     * B12·마그네슘은 PPI 허가사항(5.8·5.9)에서 확인했다. 판정(주의)은 전문의 판단으로 남긴다.
     */
    title: '위산억제제를 오래 드시면 칼슘제 형태와 B12·마그네슘을 함께 살피세요',
    reason:
      '탄산칼슘은 위산이 있어야 잘 녹는다고 알려져, 위산억제제(PPI)를 드시면 흡수가 떨어질 수 있다는 우려가 있습니다. ' +
      '다만 실제로 재 본 연구는 적고 결과가 엇갈립니다 — 에스오메프라졸 20 mg 과 위약을 비교한 무작위 시험에서는 칼슘 흡수에 차이가 없었습니다. ' +
      '구연산칼슘은 식사와 관계없이 탄산칼슘보다 흡수가 약 24 % 좋았지만, PPI 를 드시는 분에서 두 형태를 직접 견준 연구는 없습니다. ' +
      'PPI 를 여러 해 매일 드시면 비타민 B12 가, 석 달 넘게 드시면 드물게 마그네슘이 낮아질 수 있다고 허가사항에 적혀 있어 함께 확인합니다.',
    /*
     * 등급을 'B'(대규모 전향적 코호트) 로 두었으나 인용한 것은 종설·증례다.
     * 이 앱의 정의로는 'C'(소규모·기전 연구) 다.
     * 권고 수준(피하세요/주의)은 등급과 별개다 — 약품 설명서에 실리는 상호작용이라
     * 등급을 낮춘다고 권고가 약해지지 않는다. 다만 등급은 **인용한 것** 에 맞춘다.
     */
evidence: 'C',
    refIds: ['vandervelde2014calcium', 'fda-label-ppi']
  },
  {
    id: 'int-levothyroxine-ca-fe',
    agent: 'levothyroxine',
    /*
     * 2026-10-14 전수 대조 — 출처가 KDRI 였는데 KDRI 에 갑상선호르몬제 이야기는 없다(등급 B 도 맞지 않았다).
     * 허가사항(SYNTHROID 2.1·7.9·표 5)으로 바꾸고 등급을 G 로. 허가사항의 4시간은 탄산칼슘·황산철 같은 약·보충제에 대한 것이라
     * '고칼슘' 음식 579종(깻잎·두부·멸치…)에서는 뗐다. '두유·우유도 마찬가지' 는 허가사항에 없어 콩가루·호두·식이섬유로 바꿨다.
     */
    match: { supplementCategories: ['칼슘·마그네슘', '철분'] },
    level: 'caution',
    title: '갑상선호르몬제는 칼슘·철분과 4시간 이상 띄워 드세요',
    reason:
      '탄산칼슘·황산철 같은 칼슘제와 철분제는 갑상선호르몬제와 결합해 흡수를 막을 수 있어, 허가사항은 4시간 이상 띄워 드시도록 합니다. ' +
      '갑상선호르몬제는 아침 빈속에, 아침 식사 30분~1시간 전에 드시는 것이 기본입니다. ' +
      '음식 가운데는 콩가루·호두·식이섬유가 흡수를 줄일 수 있다고 허가사항에 적혀 있습니다.',
    evidence: 'G',
    refIds: ['fda-label-levothyroxine']
  },
  {
    id: 'int-steroid-sugar-na',
    agent: 'steroid',
    match: { tags: ['고당', '고나트륨'] },
    level: 'caution',
    title: '스테로이드를 쓰는 날에는 혈당과 부종이 함께 올라갑니다',
    /*
     * 2026-10-14 전수 대조 — ESPEN 은 스테로이드 부작용으로 인슐린 저항성만 들고 나트륨·부종은 말하지 않는다.
     * 덱사메타손 허가사항(5.1 고혈당·5.3 염분·수분 저류, 식사 소금 제한)으로 바꿨다. '조절해도 충분합니다' 는 근거가 없어 고쳤다.
     */
    reason:
      '덱사메타손 같은 스테로이드는 혈당을 올리고 나트륨·수분을 몸에 붙잡아 둡니다. ' +
      '허가사항은 고혈당과 부종(수분 과다)을 살피고, 필요하면 식사의 소금을 줄이도록 적고 있습니다. ' +
      '항암 전후 며칠간 단 음식과 짠 음식이 겹치면 고혈당과 부종이 뚜렷해질 수 있으니, 이 시기에는 둘 다 조금 덜어 내 보세요.',
    evidence: 'G',
    refIds: ['fda-label-dexamethasone']
  },
  {
    id: 'int-tamoxifen-soy',
    agent: 'tamoxifen',
    match: { tags: ['대두이소플라본'] },
    level: 'info',
    title: '타목시펜을 드시는 중에도 콩 음식은 괜찮습니다',
    reason:
      '가장 흔한 질문입니다. 상하이 유방암 생존자 5,042명을 추적한 연구에서 대두를 많이 드신 군은 ' +
      /* 2026-10-14 전수 대조 — 원문은 "present in both users and nonusers" 다. 크기가 같다는 뜻이 아니어서 '똑같았습니다' 를 고쳤다 */
      '전체 사망이 29 %, 재발(또는 유방암 사망)이 32 % 낮았고(위험비 0.71·0.68), 이 관련성은 타목시펜을 드시는 분과 안 드시는 분 모두에서 나타났습니다. ' +
      '두부·두유·된장을 제한할 근거는 없습니다. 다만 이소플라본 농축 보충제는 별개로 판단합니다.',
    evidence: 'B',
    refIds: ['shu2009', 'nechuta2012', 'chi2013']
  },
  {
    id: 'int-adt-calcium',
    agent: 'adt',
    /*
     * 2026-10-14 전수 대조 — 분류 전체에 걸려 '비타민D 5000 IU'(125 µg, 성인 상한섭취량 100 µg 초과)에도 '권장' 이 붙었다.
     * 영양제 자료 스스로 "상시 복용은 권하지 않는다" 고 적는 제품이다. 상한을 넘지 않는 칼슘·비타민 D 제품만 이름으로 건다
     * (새 제품을 넣으면 여기도 넣을 것). 제목도 이유 글(먼저 식품, 보충은 골밀도를 보고)과 맞췄다.
     */
    match: { supplementIds: ['vitd-1000', 'vitd-2000', 'cal-mag-d', 'calcium-carbonate'] },
    level: 'prefer',
    title: 'ADT 중에는 칼슘·비타민 D 를 충분히 드세요 — 보충은 골밀도를 보고 정합니다',
    reason:
      '안드로겐 차단은 골밀도를 빠르게 떨어뜨립니다. 미국임상종양학회가 승인한 지침은 ' +
      'ADT 를 시작하기 전 골밀도 검사를 받도록 권합니다. ' +
      '칼슘과 비타민 D 는 먼저 식품으로 채우시고(2025 한국인 영양소 섭취기준 성인 남성 칼슘 권장섭취량 800 mg, 비타민 D 충분섭취량 10~15 µg), ' +
      '보충이 필요한지와 얼마나 할지는 골밀도 결과를 보고 정하는 것이 순서입니다.',
    evidence: 'G',
    refIds: ['adt-bone', 'kdri2025']
  },
  {
    id: 'int-ai-calcium',
    agent: 'ai',
    /*
     * 2026-10-14 전수 대조 — (1) 비타민D 5000 IU(상한 100 µg 초과)에 '권장' 이 붙던 것을 뗐다(int-adt-calcium 과 같음).
     * (2) 1,200 mg·800~1,000 IU 는 국제골다공증재단의 폐경 여성 일반 권고이고, 입장문이 아로마타제 억제제 복용자에게 적은 것은
     *     비타민 D 하루 800 IU 이상(최대 2000 IU)이다 — 둘을 갈라 적었다.
     * (3) 관절통 문장은 Hadji 원문에 관절통 언급이 없어 뺐다.
     */
    match: { supplementIds: ['vitd-1000', 'vitd-2000', 'cal-mag-d', 'calcium-carbonate'], tags: ['고칼슘'] },
    level: 'prefer',
    title: '아로마타제 억제제 사용 중 칼슘·비타민 D 를 챙기세요',
    reason:
      '에스트로겐이 거의 없어지면서 골 소실이 빨라집니다. 국제학회 공동 입장문은 아로마타제 억제제를 시작할 때 ' +
      '골절 위험을 평가하고 칼슘·비타민 D 를 안내하도록 권합니다. 국제골다공증재단은 폐경 여성에게 하루 칼슘 1,200 mg·비타민 D 800~1,000 IU 를 권하고, ' +
      '이 입장문은 아로마타제 억제제를 드시는 분께 비타민 D 를 하루 800 IU 이상(최대 2,000 IU) 권합니다. ' +
      '골절 위험이 높은 분은 혈중 25-OH 비타민 D 를 재 보는 것이 권장됩니다.',
    evidence: 'G',
    refIds: ['hadji2017aibl']
  }
]
