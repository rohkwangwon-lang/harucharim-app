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
    title: 'CDK4/6 억제제 복용 중 자몽은 금기입니다',
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
      '저자들은 이 약을 쓰는 동안 녹차 제품 섭취가 금기일 수 있다고 적었습니다. 특히 농축된 녹차추출물 보충제는 피해야 합니다.',
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
    match: { tags: ['식물성에스트로겐'] },
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
      '에스트로겐이 거의 없어지면서 골 소실이 빨라집니다. 관절통도 흔한데, ' +
      '비타민 D 결핍이 있으면 증상이 더 심하다는 보고가 있어 결핍 교정이 도움이 될 수 있습니다.',
    evidence: 'G',
    refIds: ['nccn-survivorship']
  }
]
