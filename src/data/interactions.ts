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
  { id: 'tki-alk', name: 'ALK 표적치료제', aliases: ['잴코리', '알레센자', '로비큐아'], cls: '표적치료제' },
  { id: 'cdk46', name: 'CDK4/6 억제제', aliases: ['입랜스', '키스칼리', '버제니오', '팔보시클립'], cls: '표적치료제' },
  { id: 'sorafenib', name: '소라페닙 / 렌바티닙', aliases: ['넥사바', '렌비마'], cls: '표적치료제' },
  { id: 'warfarin', name: '와파린', aliases: ['쿠마딘', 'warfarin'], cls: '항응고제' },
  { id: 'doac', name: 'DOAC (아픽사반·리바록사반 등)', aliases: ['엘리퀴스', '자렐토', '릭시아나'], cls: '항응고제' },
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
    title: '자몽은 표적치료제의 혈중 농도를 예측 불가능하게 올립니다',
    reason:
      '대부분의 경구 표적치료제는 CYP3A4 로 대사됩니다. 자몽의 푸라노쿠마린은 이 효소를 비가역적으로 억제해 ' +
      '약물 농도를 수 배까지 올릴 수 있고, 그만큼 부작용 위험도 커집니다. ' +
      '주스 200 mL 한 잔으로도 충분하고 24시간이 지나도 최대 효과의 4분의 1이 남아, 복용 시간을 조절하는 방식으로는 피할 수 없습니다. ' +
      '라임·포멜로도 같으며, 보통 단맛 오렌지(네이블·발렌시아)는 해당되지 않습니다.',
    /*
     * 등급을 'B'(대규모 전향적 코호트) 로 두었으나 인용한 것은 종설·증례다.
     * 이 앱의 정의로는 'C'(소규모·기전 연구) 다.
     * 권고 수준(피하세요/주의)은 등급과 별개다 — 약품 설명서에 실리는 상호작용이라
     * 등급을 낮춘다고 권고가 약해지지 않는다. 다만 등급은 **인용한 것** 에 맞춘다.
     */
evidence: 'C',
    refIds: ['bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-cdk',
    agent: 'cdk46',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: 'CDK4/6 억제제 복용 중 자몽은 피하세요',
    reason:
      '팔보시클립·리보시클립·아베마시클립 모두 CYP3A4 기질입니다. 농도 상승은 호중구감소증 악화로 직결되므로 ' +
      '제품 설명서에서도 자몽과 자몽주스를 명시적으로 금하고 있습니다.',
    /*
     * 등급을 'B'(대규모 전향적 코호트) 로 두었으나 인용한 것은 종설·증례다.
     * 이 앱의 정의로는 'C'(소규모·기전 연구) 다.
     * 권고 수준(피하세요/주의)은 등급과 별개다 — 약품 설명서에 실리는 상호작용이라
     * 등급을 낮춘다고 권고가 약해지지 않는다. 다만 등급은 **인용한 것** 에 맞춘다.
     */
evidence: 'C',
    refIds: ['bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-alk',
    agent: 'tki-alk',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: 'ALK 표적치료제도 자몽과 함께 드시면 안 됩니다',
    reason: '크리조티닙·알렉티닙 등은 CYP3A4 기질로, 자몽에 의한 농도 상승 시 간독성과 QT 연장 위험이 커집니다.',
    evidence: 'C',
    refIds: ['bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-sorafenib',
    agent: 'sorafenib',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: '소라페닙·렌바티닙 복용 중 자몽을 피하세요',
    reason: 'CYP3A4 억제로 농도가 올라가면 수족피부반응과 고혈압 등 부작용이 심해집니다.',
    evidence: 'C',
    refIds: ['bailey2013grapefruit']
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
      '라임·포멜로도 같고, 귤과 보통 단맛 오렌지는 해당하지 않습니다.',
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
      '확인된 해가 아니라 기전에 근거해 조심하는 것입니다.',
    evidence: 'C',
    refIds: ['cdi-liverpool', 'fda-label-ai']
  },
  {
    id: 'int-grapefruit-anastrozole',
    agent: 'ai-anastrozole',
    match: { tags: ['자몽계'] },
    level: 'caution',
    title: '아나스트로졸(아리미덱스)과 자몽 — 근거는 없지만 많이 드시지는 마세요',
    reason:
      '아나스트로졸과 자몽을 함께 본 연구는 없고, 미국 허가사항에도, 암 약물 상호작용 자료에도 이 조합은 실려 있지 않습니다. ' +
      '허가사항에서 함께 쓰지 말라고 한 것은 에스트로겐이 든 제제와 타목시펜뿐이고, 음식이 약 농도를 바꾼다는 내용은 없습니다. ' +
      '같은 계열인 레트로졸에 "권장하지 않는다" 는 의견이 있어, 그에 준해 조심하는 쪽으로 둔 것입니다. ' +
      '가끔 한두 쪽 드시는 것까지 막을 근거는 없습니다. 매일 드시거나 주스로 많이 드시는 것은 삼가세요.',
    evidence: 'C',
    refIds: ['fda-label-ai', 'cdi-liverpool']
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
      '그래서 피하시라고 할 근거는 없으며, 매일 드시거나 주스로 많이 드시는 것만 삼가시면 됩니다.',
    evidence: 'C',
    refIds: ['fda-label-ai']
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
      '"내 정보" 의 복용 중인 약에서 드시는 약 이름을 골라 주시면 그 약에 맞춰 알려 드립니다.',
    evidence: 'C',
    refIds: ['cdi-liverpool', 'fda-label-ai']
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
      '함께 드시는 약(자이티가·엑스탄디·얼리다·뉴베카)이 있으면 "내 정보" 에서 골라 주세요.',
    evidence: 'C',
    refIds: ['fda-label-adt', 'cdi-liverpool']
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
      '자몽과 직접 본 연구는 없습니다. 암 약물 상호작용 자료는 "약한 상호작용 가능 — 주의할 것" 으로 분류합니다(근거의 질 매우 낮음).',
    evidence: 'C',
    refIds: ['cdi-liverpool', 'fda-label-arpi']
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
      '"어제는 많이, 오늘은 전혀"처럼 들쭉날쭉하면 INR 이 흔들립니다. 매일 비슷한 양을 유지하는 것이 목표입니다. ' +
      '가늠이 필요하시면 한국인 하루 기준치가 남자 75 µg·여자 65 µg 입니다 — 시금치 한 접시로도 이 값을 훌쩍 넘습니다. ' +
      '많고 적음이 문제가 아니라 날마다 달라지는 것이 문제라는 뜻입니다.',
    evidence: 'G',
    /* 카페시타빈 증례 보고를 비타민 K 규칙에 달아 두고 있었다 — 두 출처가 서로 바뀌어 있었다 */
    refIds: ['warfarin-vitk', 'kdri2020']
  },
  {
    id: 'int-warfarin-omega3',
    agent: 'warfarin',
    match: { supplementCategories: ['오메가3'] },
    level: 'caution',
    title: '오메가-3 고용량은 출혈 경향을 더할 수 있습니다',
    reason:
      '오메가-3 는 혈소판 응집을 억제합니다. 와파린과 함께 쓰면 출혈 위험이 더해질 수 있어, ' +
      '시작하거나 끊을 때 INR 을 확인하는 것이 좋습니다. ' +
      '다만 무게는 알고 계시는 편이 낫습니다 — 유럽식품안전청은 EPA·DHA 를 합쳐 하루 5 g 까지 드셔도 ' +
      '자발 출혈이 늘지 않는다고 정리했습니다. 항응고제와 함께 쓸 때를 따로 본 자료가 없어서 드리는 주의입니다.',
    evidence: 'C',
    /*
     * ACCP 2012 전문에 omega·fish oil 이 0건이다 — 그 지침은 이 말을 하지 않는다.
     * 대신 ESPEN 이 EFSA 의 안전 용량 정리를 싣고 있어 그쪽을 붙인다.
     */
    refIds: ['espen-cachexia']
  },
  {
    id: 'int-warfarin-coq10',
    agent: 'warfarin',
    match: { supplementIds: ['coq10', 'red-ginseng'] },
    level: 'caution',
    title: '코엔자임Q10·홍삼은 와파린 효과에 영향을 줄 수 있습니다',
    reason:
      '코엔자임Q10 은 구조가 비타민 K 와 비슷해 이론상 와파린 효과를 줄일 것으로 예상되었지만, ' +
      '실제 관찰 자료는 반대쪽이었습니다 — 항응고 지침이 인용한 연구에서 코엔자임Q10 을 함께 드신 분들의 ' +
      '출혈 위험이 3.7배 높았습니다(95 % 신뢰구간 1.88~7.24). 같은 표에 생강도 3.2배로 올라 있습니다. ' +
      '지침 자신은 "더 확인이 필요하다"고 단서를 답니다. 인삼류는 INR 을 올린 사례와 내린 사례가 모두 보고되어 있습니다. ' +
      '이론과 실제가 반대로 나온다는 것 자체가 이 조합을 피해야 할 이유입니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk']
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
      '항응고 지침이 인용한 연구에서 생강을 함께 드신 분들의 출혈 위험이 3.2배 높았습니다(95 % 신뢰구간 2.42~4.24). ' +
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
    match: { foodIds: ['green-tea'], supplementCategories: ['항산화·기타'] },
    level: 'avoid',
    title: '보르테조밉 치료 중 녹차·녹차추출물은 약효를 떨어뜨릴 수 있습니다',
    reason:
      '녹차의 EGCG 가 보르테조밉의 보론산기와 직접 결합해 프로테아좀 억제 작용을 무력화시키는 것이 ' +
      '세포와 동물 실험에서 확인되었습니다(사람 대상 시험은 아직 없습니다). ' +
      '같은 현상은 보론산 계열 약제에서만 나타났고 다른 계열 프로테아좀 억제제에서는 나타나지 않았습니다. ' +
      '저자들은 이 약을 쓰는 동안 녹차 제품을 피해야 할 수 있다고 적었습니다. 특히 농축된 녹차추출물 보충제는 피해야 합니다.',
    evidence: 'C',
    refIds: ['golden2009']
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
    reason:
      '카페시타빈은 CYP2C9 를 억제해 와파린 농도를 올리며, 심각한 출혈 사례가 보고되어 경고문이 붙어 있습니다. ' +
      '보고된 증례에서는 병용 6주 뒤 INR 이 10을 넘고 위장관 출혈이 생겼습니다. ' +
      '두 약을 함께 쓰는 동안에는 INR 을 자주 확인해야 하고, 여기에 비타민 K 섭취량 변동까지 겹치면 조절이 매우 어려워집니다.',
    evidence: 'C',
    /* 이 증례를 실제로 보고한 문헌이 빠져 있었다 */
    refIds: ['capecitabine-warfarin']
  },
  {
    id: 'int-oxaliplatin-cold',
    agent: 'oxaliplatin',
    // 차갑게 마시는 것이 문제이므로 음료로 한정한다
    match: { restrictGroups: ['음료'], tags: ['수분보충'] },
    level: 'caution',
    title: '옥살리플라틴 투여 후 며칠간은 찬 음식·찬 음료를 피하세요',
    reason:
      '옥살리플라틴은 한랭 유발 말초신경병증을 일으켜, 찬 것을 만지거나 마실 때 손발이 저리고 ' +
      '목이 조이는 느낌(인후 감각이상)이 생깁니다. 미지근하게 드시는 것만으로 상당히 줄일 수 있습니다.',
    evidence: 'G',
    refIds: ['espen2021']
  },
  {
    id: 'int-cisplatin-mg',
    agent: 'cisplatin',
    match: { supplementIds: ['magnesium-generic'], tags: ['고칼륨'] },
    level: 'info',
    title: '시스플라틴은 마그네슘·칼륨을 소변으로 빼앗아 갑니다',
    reason:
      '신세뇨관 손상으로 저마그네슘혈증·저칼륨혈증이 흔합니다. 보충이 필요한 경우가 많고, ' +
      '동시에 신독성이 있으므로 수분을 충분히 드시는 것이 중요합니다.',
    evidence: 'G',
    refIds: ['espen2021']
  },
  {
    id: 'int-irinotecan-sjw',
    agent: 'irinotecan',
    match: { supplementCategories: ['항산화·기타', '홍삼·인삼'] },
    level: 'avoid',
    title: '세인트존스워트(성요한초)는 항암제 농도를 떨어뜨립니다',
    /*
     * 근거 등급이 'B'(대규모 전향적 코호트) 로 매겨져 있었는데, 인용한 연구는 환자 5명의 교차설계다.
     * 이 앱의 등급 정의로는 'C'(소규모·기전 연구) 다. 권고 자체는 어느 상호작용 자료에나 실려 있지만,
     * 등급은 **인용한 것** 에 맞춰야 한다. 부풀리면 진짜 A·B 의 값이 함께 떨어진다.
     */
    reason:
      '세인트존스워트는 CYP3A4 를 강력하게 유도합니다. 암 환자 5명을 대상으로 한 교차설계 연구에서 ' +
      '이리노테칸의 활성대사체(SN-38) 혈중 농도가 42 % 낮아졌습니다(95 % 신뢰구간 14~70 %). ' +
      '작은 연구이지만 약효가 줄어드는 방향이라 위험 쪽으로 봅니다. ' +
      '우울·불면 목적의 수입 건강기능식품에 흔히 들어 있습니다.',
    evidence: 'C',
    refIds: ['sjw-interaction']
  },
  {
    id: 'int-mtx-folate',
    agent: 'methotrexate',
    match: { supplementCategories: ['비타민B군', '종합비타민'] },
    level: 'caution',
    title: '메토트렉세이트 사용 중 엽산 보충은 임의로 하지 마세요',
    reason:
      '메토트렉세이트는 엽산 대사를 차단해 작용합니다. 엽산 보충 시점과 용량은 치료 목적에 따라 정해지므로, ' +
      '엽산이 든 종합비타민을 자가로 추가하면 계획이 흐트러질 수 있습니다.',
    evidence: 'G',
    refIds: ['espen2021']
  },
  {
    id: 'int-ppi-calcium',
    agent: 'ppi',
    match: { supplementIds: ['calcium-carbonate'] },
    level: 'caution',
    title: '위산억제제를 드시면 탄산칼슘 흡수가 떨어집니다',
    reason:
      '탄산칼슘은 위산이 있어야 녹습니다. PPI 복용 중이거나 위절제를 받은 경우에는 ' +
      '위산에 덜 의존하는 구연산칼슘 형태가 유리합니다. 장기 PPI 사용 시 B12·마그네슘도 함께 확인합니다.',
    /*
     * 등급을 'B'(대규모 전향적 코호트) 로 두었으나 인용한 것은 종설·증례다.
     * 이 앱의 정의로는 'C'(소규모·기전 연구) 다.
     * 권고 수준(피하세요/주의)은 등급과 별개다 — 약품 설명서에 실리는 상호작용이라
     * 등급을 낮춘다고 권고가 약해지지 않는다. 다만 등급은 **인용한 것** 에 맞춘다.
     */
evidence: 'C',
    refIds: ['gastrectomy-nutr']
  },
  {
    id: 'int-levothyroxine-ca-fe',
    agent: 'levothyroxine',
    match: { supplementCategories: ['칼슘·마그네슘', '철분'], tags: ['고칼슘'] },
    level: 'caution',
    title: '갑상선호르몬제는 칼슘·철분과 4시간 이상 띄워 드세요',
    reason:
      '칼슘과 철은 갑상선호르몬제와 결합해 흡수를 크게 방해합니다. 두유·우유도 마찬가지입니다. ' +
      '아침 공복에 물과 함께 복용하고, 칼슘·철분제는 점심 이후로 옮기는 것이 표준적인 방법입니다.',
    evidence: 'B',
    refIds: ['kdri2020']
  },
  {
    id: 'int-steroid-sugar-na',
    agent: 'steroid',
    match: { tags: ['고당', '고나트륨'] },
    level: 'caution',
    title: '스테로이드를 쓰는 날에는 혈당과 부종이 함께 올라갑니다',
    reason:
      '덱사메타손은 혈당을 올리고 나트륨·수분을 저류시킵니다. 항암 전후 며칠간 단 음식과 짠 음식이 겹치면 ' +
      '고혈당과 부종이 뚜렷해집니다. 이 시기만 한시적으로 조절해도 충분합니다.',
    evidence: 'G',
    refIds: ['espen2021']
  },
  {
    id: 'int-tamoxifen-soy',
    agent: 'tamoxifen',
    match: { tags: ['대두이소플라본'] },
    level: 'info',
    title: '타목시펜을 드시는 중에도 콩 음식은 괜찮습니다',
    reason:
      '가장 흔한 질문입니다. 상하이 유방암 생존자 5,042명을 추적한 연구에서 대두를 많이 드신 군은 ' +
      '전체 사망이 29 %, 재발이 32 % 낮았고(위험비 0.71·0.68), 이 이득은 타목시펜을 드시는 분에서도 안 드시는 분에서도 똑같았습니다. ' +
      '두부·두유·된장을 제한할 근거는 없습니다. 다만 이소플라본 농축 보충제는 별개로 판단합니다.',
    evidence: 'B',
    refIds: ['shu2009', 'nechuta2012', 'chi2013']
  },
  {
    id: 'int-adt-calcium',
    agent: 'adt',
    match: { supplementCategories: ['칼슘·마그네슘', '비타민D'] },
    level: 'prefer',
    title: 'ADT 중에는 칼슘·비타민 D 보충이 권고됩니다',
    reason:
      '안드로겐 차단은 골밀도를 빠르게 떨어뜨립니다. 미국임상종양학회가 승인한 지침은 ' +
      'ADT 를 시작하기 전 골밀도 검사를 받도록 권합니다. ' +
      '칼슘과 비타민 D 는 먼저 식품으로 채우시고(한국 성인 권장량은 칼슘 700~800 mg, 비타민 D 10~15 µg), ' +
      '보충이 필요한지와 얼마나 할지는 골밀도 결과를 보고 정하는 것이 순서입니다.',
    evidence: 'G',
    refIds: ['adt-bone', 'kdri2020']
  },
  {
    id: 'int-ai-calcium',
    agent: 'ai',
    match: { supplementCategories: ['칼슘·마그네슘', '비타민D'], tags: ['고칼슘'] },
    level: 'prefer',
    title: '아로마타제 억제제 사용 중 칼슘·비타민 D 를 챙기세요',
    reason:
      '에스트로겐이 거의 없어지면서 골 소실이 빨라집니다. 국제학회 공동 입장문은 아로마타제 억제제를 시작할 때 ' +
      '골절 위험을 평가하고 칼슘·비타민 D 를 안내하도록 권하며, 그 기준은 하루 칼슘 1,200 mg·비타민 D 800~1,000 IU 입니다. ' +
      '골절 위험이 높은 분은 혈중 25-OH 비타민 D 를 재 보는 것이 권장됩니다. ' +
      '관절통도 흔한데, 비타민 D 결핍이 있으면 증상이 더 심하다는 보고가 있어 결핍 교정이 도움이 될 수 있습니다.',
    evidence: 'G',
    refIds: ['hadji2017aibl']
  }
]
