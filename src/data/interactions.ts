import type { Interaction } from './types'

/**
 * 약제 × 식품/영양제 상호작용.
 * 환자가 복용 중인 약을 입력하면 해당 항목만 평가된다.
 */

/** 사용자가 고를 수 있는 약제 목록 (성분명 기준, 상품명은 aliases 로 검색) */
export const MEDICATIONS: { id: string; name: string; aliases: string[]; cls: string }[] = [
  { id: 'tamoxifen', name: '타목시펜', aliases: ['놀바덱스', 'tamoxifen'], cls: '항호르몬' },
  { id: 'ai', name: '아로마타제 억제제', aliases: ['아나스트로졸', '레트로졸', '엑스메스탄', '페마라', '아리미덱스'], cls: '항호르몬' },
  { id: 'adt', name: '안드로겐 차단요법(ADT)', aliases: ['졸라덱스', '루프린', '엘리가드', '비칼루타미드'], cls: '항호르몬' },
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
      '약물 농도를 수 배까지 올릴 수 있고, 그만큼 부작용 위험도 커집니다. 한 잔의 영향이 24시간 이상 지속되므로 ' +
      '복용 시간을 조절하는 방식으로는 피할 수 없습니다.',
    evidence: 'B',
    refIds: ['bailey2013grapefruit']
  },
  {
    id: 'int-grapefruit-cdk',
    agent: 'cdk46',
    match: { tags: ['자몽계'] },
    level: 'avoid',
    title: 'CDK4/6 억제제 복용 중 자몽은 금기입니다',
    reason:
      '팔보시클립·리보시클립·아베마시클립 모두 CYP3A4 기질입니다. 농도 상승은 호중구감소증 악화로 직결되므로 ' +
      '제품 설명서에서도 자몽과 자몽주스를 명시적으로 금하고 있습니다.',
    evidence: 'B',
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
      '"어제는 많이, 오늘은 전혀"처럼 들쭉날쭉하면 INR 이 흔들립니다. 매일 비슷한 양을 유지하는 것이 목표입니다.',
    evidence: 'G',
    refIds: ['warfarin-vitk']
  },
  {
    id: 'int-warfarin-omega3',
    agent: 'warfarin',
    match: { supplementCategories: ['오메가3'] },
    level: 'caution',
    title: '오메가-3 고용량은 출혈 경향을 더할 수 있습니다',
    reason:
      '오메가-3 는 혈소판 응집을 억제합니다. 와파린과 함께 쓰면 출혈 위험이 더해질 수 있어, ' +
      '시작하거나 끊을 때 INR 을 확인하는 것이 좋습니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk']
  },
  {
    id: 'int-warfarin-coq10',
    agent: 'warfarin',
    match: { supplementIds: ['coq10', 'red-ginseng'] },
    level: 'caution',
    title: '코엔자임Q10·홍삼은 와파린 효과에 영향을 줄 수 있습니다',
    reason:
      '코엔자임Q10 은 구조가 비타민 K 와 비슷해 와파린 효과를 줄일 수 있고, ' +
      '인삼류는 반대로 INR 을 올린 사례와 내린 사례가 모두 보고되어 있습니다. 예측이 어렵다는 점 자체가 문제입니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk']
  },
  {
    id: 'int-doac-omega3',
    agent: 'doac',
    match: { supplementCategories: ['오메가3'] },
    level: 'caution',
    title: 'DOAC 과 오메가-3 를 함께 쓰면 출혈에 유의하세요',
    reason: '항응고 작용이 더해질 수 있습니다. 멍이 잘 들거나 코피가 잦아지면 알려 주셔야 합니다.',
    evidence: 'C',
    refIds: ['warfarin-vitk']
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
      '실험적으로 확인되었습니다. 특히 농축된 녹차추출물 보충제는 피해야 합니다.',
    evidence: 'C',
    refIds: ['golden2009']
  },
  {
    id: 'int-capecitabine-warfarin',
    agent: 'capecitabine',
    match: { tags: ['고비타민K'] },
    level: 'caution',
    title: '카페시타빈은 와파린 효과를 크게 증폭시킵니다',
    reason:
      '카페시타빈은 CYP2C9 를 억제해 와파린 농도를 올리며, 심각한 출혈 사례가 보고되어 경고문이 붙어 있습니다. ' +
      '두 약을 함께 쓰는 동안에는 INR 을 자주 확인해야 하고, 여기에 비타민 K 섭취량 변동까지 겹치면 조절이 매우 어려워집니다.',
    evidence: 'B',
    refIds: ['warfarin-vitk']
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
    reason:
      '세인트존스워트는 CYP3A4 를 강력하게 유도해, 이리노테칸의 활성대사체 농도를 42 % 낮춘 것이 사람에서 확인되었습니다. ' +
      '약효가 줄어드는 방향의 상호작용이라 더 위험합니다. 우울·불면 목적의 수입 건강기능식품에 흔히 들어 있습니다.',
    evidence: 'B',
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
    evidence: 'B',
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
    match: { tags: ['식물성에스트로겐'] },
    level: 'info',
    title: '타목시펜을 드시는 중에도 콩 음식은 괜찮습니다',
    reason:
      '가장 흔한 질문입니다. 상하이 유방암 코호트 등에서 타목시펜 복용자 중 대두 섭취가 많은 군의 재발이 오히려 낮았습니다. ' +
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
      '안드로겐 차단은 골밀도를 빠르게 떨어뜨립니다. 칼슘 1,000~1,200 mg, 비타민 D 400~1,000 IU 를 ' +
      '식품과 보충제로 확보하고 정기적으로 골밀도를 확인하는 것이 표준 관리입니다.',
    evidence: 'G',
    refIds: ['adt-bone']
  },
  {
    id: 'int-ai-calcium',
    agent: 'ai',
    match: { supplementCategories: ['칼슘·마그네슘', '비타민D'], tags: ['고칼슘'] },
    level: 'prefer',
    title: '아로마타제 억제제 사용 중 칼슘·비타민 D 를 챙기세요',
    reason:
      '에스트로겐이 거의 없어지면서 골 소실이 빨라집니다. 관절통도 흔한데, ' +
      '비타민 D 결핍이 있으면 증상이 더 심하다는 보고가 있어 결핍 교정이 도움이 될 수 있습니다.',
    evidence: 'G',
    refIds: ['nccn-survivorship']
  }
]
