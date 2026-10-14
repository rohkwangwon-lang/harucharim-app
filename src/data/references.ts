import type { Reference } from './types'
import { EXERCISE_REFERENCES } from './references-exercise'

/**
 * 이 앱의 모든 임상 권고는 아래 문헌 중 하나 이상에 연결되어 있다.
 * 근거가 없는 권고는 넣지 않으며, 근거가 엇갈리는 주제는 그 사실 자체를 표시한다.
 */
export const REFERENCES: Reference[] = [
  // ── 종합 가이드라인 ────────────────────────────────────────────
  { id: 'wcrf2018', kind: 'guideline', year: 2018, verified: '적색육 주 3회분 = 조리 후 350~500 g(생고기 700~750 g) · 식이섬유 하루 30 g 이상 · 유방암 음주 역치 확인 안 됨 · 염장식품 위암 probable · 직화구이 고기·생선 위암 limited-suggestive · 유제품·칼슘 보충제 대장암 감소 strong, 유제품 전립선암 증가 limited-suggestive(유제품 권고 없음) · 가공육 \'very little, if any\' · 당 음료 정의에 과일주스·농축액의 당 포함, 무가당 과일주스도 많이 마시지 말 것 · 비전분 채소·과일 하루 400 g 이상(1회분 약 80 g × 5회) · 비전분 채소는 섬유가 많고 에너지 밀도가 낮음 · 지방·전분·당이 많은 가공식품 제한, 견과·종실은 체중 증가와 연관 안 됨 · 유제품과 칼슘 보충제는 대장암을 막는다는 강한 근거(probable) · 마늘은 대장암 limited – no conclusion', access: 'open', fulltext: 'https://www.wcrf.org/wp-content/uploads/2024/11/Summary-of-Third-Expert-Report-2018.pdf',
    citation: 'World Cancer Research Fund / American Institute for Cancer Research. Diet, Nutrition, Physical Activity and Cancer: a Global Perspective. Continuous Update Project Expert Report 2018.',
    /* 예전 주소는 연구·정책 첫 화면으로 넘어갔다(2026-10-14 확인) — 보고서 요약 PDF 로 */
    url: 'https://www.wcrf.org/wp-content/uploads/2024/11/Summary-of-Third-Expert-Report-2018.pdf' },
  { id: 'espen2021', kind: 'guideline', year: 2021, verified: '의료영양 적응: 필요량 50 % 미만이 1주 넘게 또는 50~75 % 가 2주 넘게 · 권고 26: 두경부·흉부·위장관 방사선 중 개별 상담·ONS 로 섭취 확보 · 권고 4) 단백질 1 g/kg/일 초과, 가능하면 1.5 g/kg/일까지(B2-2) · 권고 7) 영양불량·위험군에 상담·증상 치료·ONS(strong), 심한 영양불량 전에 시작 · 두경부·식도 방사선 시 점막염·섭취/체중 감소 최대 80 %, 골반 방사선 위장 증상 최대 80 % · 권고 28) 심한 점막염·폐색성 종양에 관 영양, 고위험(하인두·T4·동시항암방사선)에서 예방적 관 영양은 주로 후향 근거 · 만성 장폐색·복막 파종으로 장 기능 부전이면 정맥영양 · 원문: edoc.unibas.ch 저장소 PDF · 단백질 1 g/kg/일 초과, 가능하면 1.5 g/kg/일까지(60 kg 이면 60 g 초과~90 g) · 스테로이드(식욕 촉진) 부작용으로 인슐린 저항성 · 섬유·잔사·유당·카페인·국물·크래커·장루 서술 없음 · 권고 4: 단백질 1 g/kg 이상, 가능하면 1.5 g/kg/일 · 권고 5: 비타민·무기질은 권장량 수준, 고용량 미량영양소는 권하지 않음 · 권고 16: 체중감소 위험 진행암 항암 중 오메가-3 제안(약한 권고, 근거 낮음) · 권고 31: 방사선 설사에 프로바이오틱스 권할 일관된 자료 부족, 면역저하 안전성 미확립 · 권고 32 해설: 근육이 적으면 독성 위험 요인', access: 'open',
    citation: 'Muscaritoli M, et al. ESPEN practical guideline: Clinical Nutrition in cancer. Clin Nutr. 2021;40(5):2898-2913.',
    url: 'https://doi.org/10.1016/j.clnu.2021.02.005' },
  { id: 'asco2022', kind: 'guideline', year: 2022, verified: '유산소·저항운동 권고는 \'완치 목적의 적극적 치료 중\'(strong, 근거 중등도~낮음) · 권고 2.2 호중구감소증 식단 비권고 — 근거 수준 낮음·권고 강도 약함(\'harms likely to outweigh benefits\') · 권고 3 치료 중 의도적 감량·체중 증가 예방은 찬반 근거 불충분 · 완치 목적 치료 중 유산소·저항운동 권고 · 권고 3: 치료 중 의도적 체중 감량을 권하거나 말릴 근거 부족 · 건강기능식품은 범위 밖', access: 'open',
    citation: 'Ligibel JA, et al. Exercise, Diet, and Weight Management During Cancer Treatment: ASCO Guideline. J Clin Oncol. 2022;40(22):2491-2507.',
    url: 'https://doi.org/10.1200/JCO.22.00687' },
  /* 전문 공개(Open Access). 표3 '무엇이 연결되고 무엇이 아직 아닌가' 를 규칙마다 대조했다. */
  { id: 'acs2022', kind: 'guideline', year: 2022, verified: '(C-fix 가 dl/acs2022.txt 원문 대조) 전립선: 비만-진행·사망 결론 없음 · 진단 뒤 서구식 식사 926명 코호트 전립선암 사망 HR 2.53, 전체 사망 1.67 · 지중해식 4,538명 전체 사망 HR 0.78, 전립선암 결과와 무관 · 진단 후 신체활동 전립선암 사망 RR 0.69 · 자궁내막암: 진단 시 BMI≥30 전체 사망 20 % 증가, 자궁내막암 사망·재발과 무관, 체중 변화 역할 미상, 식사-예후 체계적 고찰 없음 · 음주와 사망의 근거는 생존자 별도 권고를 낼 만큼 충분하지 않으나 새로운 암 예방 위해 금주 권고 관련 · 표 2(ACS 암 예방 지침): 술은 마시지 않는 것이 가장 좋고 마신다면 여성 하루 1잔·남성 2잔 이하 · 진단 뒤 체중 증가가 유방암 사망 증가와 연관된다는 연구들 · 성인기 체중 증가 피하기', access: 'open',
    citation: 'Rock CL, et al. American Cancer Society nutrition and physical activity guideline for cancer survivors. CA Cancer J Clin. 2022;72(3):230-262.',
    url: 'https://doi.org/10.3322/caac.21719' },
  /*
   * NCCN Survivorship 을 여기서 뺐다.
   * 구독자용 문서라 이용약관상 이 작업에서 원문을 열어 대조할 수 없었고,
   * 읽지 못한 문헌을 근거로 남겨 둘 수는 없다.
   * 여덟 규칙이 이 출처에 걸려 있었는데, 모두 공개된 문헌으로 갈아 끼웠다.
   */
  { id: 'hadji2017aibl', kind: 'guideline', year: 2017, verified: '아로마타제 억제제 복용 폐경 여성에게 비타민 D 하루 800 IU 이상(최대 2000 IU) · 골절 고위험군은 혈중 25-OH 비타민 D 측정 · 관절통 언급 없음 · 골표적치료: T < −2.0, 또는 T < −1.5 + 위험인자 1개, 또는 위험인자 2개 이상 · 아로마타제 억제제는 골 소실을 가속(생리적 폐경 대비 2~4배) · AI 시작 시 운동·칼슘/비타민 D 보충 권고', access: 'pmc', fulltext: 'PMC5384888',
    url: 'https://doi.org/10.1016/j.jbo.2017.03.001',
    citation:
      'Hadji P, et al. Management of aromatase inhibitor-associated bone loss (AIBL) in postmenopausal women with hormone sensitive breast cancer: ' +
      'joint position statement of the IOF, CABS, ECTS, IEG, ESCEO, IMS, and SIOG. J Bone Oncol. 2017;7:1-12. ' +
      '(국제골다공증재단 권고 칼슘 1,200 mg·비타민 D 800~1,000 IU · 골표적치료 기준 T-score < −2.0 등)' },
  /* 스페인 전문가 46인 델파이 합의 — 주요 학회·기관 지침이 아니다(2026-10-14 전수 대조). 'G' 를 달 수 없게 review 로 */
  { id: 'oic-consensus2021', kind: 'review', year: 2021, verified: '변비 치료는 개인화(100 %)·정기 재평가·오피오이드 쓰는 동안 유지(91.5 %) · 항목 30 식이 권고는 필요하나 충분히 효과적이지 않음 · 항목 31 완하제는 흔히 효과가 없음 · PAMORA 권장(97.9 %)', access: 'pmc', fulltext: 'PMC7778791',
    url: 'https://doi.org/10.1186/s12904-020-00693-z',
    citation:
      'Gironés Sarrió R, et al. Delphi consensus on strategies in the management of opioid-induced constipation in cancer patients. ' +
      'BMC Palliat Care. 2021;20(1):1. (전문가 46인 · 항목 91 % 합의)' },
  { id: 'radiation-caries-review', kind: 'review', year: 2015, access: 'pmc', fulltext: 'PMC4922225',
    url: 'https://doi.org/10.4103/0975-5950.183870',
    citation:
      'Gupta N, et al. Radiation-induced dental caries, prevention and treatment — a systematic review. Natl J Maxillofac Surg. 2015;6(2):160-166. ' +
      '(방사선치료 후 3개월 이내 발생 가능 · 빠르게 진행 · 불소 자가도포 · 치료 후 발치는 예외로 둠)' },
  { id: 'acr-giop', kind: 'guideline', year: 2023, access: 'open',
    citation: 'Humphrey MB, et al. 2022 ACR Guideline for the Prevention and Treatment of Glucocorticoid-Induced Osteoporosis. Arthritis Rheumatol. 2023;75(12):2088-2102.',
    url: 'https://doi.org/10.1002/art.42646' },
  { id: 'fda-ppi-mg', kind: 'guideline', year: 2011, access: 'open',
    citation: 'U.S. Food and Drug Administration. Drug Safety Communication: Low magnesium levels can be associated with long-term use of proton pump inhibitor drugs (PPIs). 2011.',
    url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-low-magnesium-levels-can-be-associated-long-term-use-proton-pump' },
  /* 'lam2013ppi-b12' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  { id: 'nice-refeeding', kind: 'guideline', year: 2017, access: 'open',
    citation: 'National Institute for Health and Care Excellence. Nutrition support for adults (CG32) — refeeding problems. 2006, updated 2017.',
    url: 'https://www.nice.org.uk/guidance/cg32' },
  { id: 'nightingale2020stoma', kind: 'review', year: 2022, verified: '고배출 장루: 대개 하루 1.5~2.0 L 초과 · 저장성 음료(차·커피·물·주스)는 배출과 나트륨 손실을 늘림 → 제한 · 나트륨 90~120 mmol/L 포도당-식염 용액을 하루 동안 조금씩 · 알아차리지 못한 만성 탈수는 말기 신부전으로 (PMC 본문 대조)', access: 'pmc', fulltext: 'PMC8862462',
    citation: 'Nightingale JMD. How to manage a high-output stoma. Frontline Gastroenterol. 2022;13(2):140-151.',
    url: 'https://doi.org/10.1136/flgastro-2018-101108' },
  { id: 'lyckholm2012zinc', kind: 'rct', year: 2012, access: 'pmc', fulltext: 'PMC4042409',
    citation: 'Lyckholm L, et al. A randomized, placebo controlled trial of oral zinc for chemotherapy-related taste and smell disorders. J Pain Palliat Care Pharmacother. 2012;26(2):111-114.',
    url: 'https://doi.org/10.3109/15360288.2012.676618' },
  { id: 'kdoqi2020', kind: 'guideline', year: 2020, access: 'open',
    citation: 'Ikizler TA, et al. KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update. Am J Kidney Dis. 2020;76(3 Suppl 1):S1-S107.',
    url: 'https://doi.org/10.1053/j.ajkd.2020.05.006' },
  /*
   * 골 소실 관리에 쓰는 1,000~1,200 mg·800 IU 는 KDRI 의 숫자가 아니다.
   * KDRI 성인 기준은 칼슘 700~800 mg, 비타민 D 10~15 µg(400~600 IU) 이고,
   * 질병관리청도 "골다공증 치료를 위해서는 더 많은 양을" 이라고 따로 적는다.
   * 두 숫자를 섞어 쓰면 어느 쪽도 못 믿게 되므로 출처를 나눈다.
   */
  /* 'kdca-bone' 를 지웠다(2026-10-14 전수 대조) — 주소 404, 같은 숫자는 kdri2020 원표로 확인되어 그쪽으로 옮김 */
  /*
   * 공식 개정본(보건복지부 발간·한국영양학회 공개)을 내려받아 요약표를 직접 대조했다.
   * 2020 판에서 나트륨에 '만성질환위험감소섭취량(CDRR)' 이 새로 생겼고,
   * 2015 판의 '목표섭취량 2,000 mg' 이라는 용어·값은 더 이상 쓰지 않는다.
   *   나트륨 19-64세 충분섭취량 1,500 · CDRR 2,300 (65-74세 1,300/2,100 · 75세 이상 1,100/1,700)
   *   칼슘 권장 남 800→750→700 · 여 700→800 (상한 19-49세 2,500 · 50세 이상 2,000)
   *   인 권장 700 · 상한 3,500 / 칼륨 충분 3,500 / 비타민 D 충분 10 µg(65세 이상 15) · 상한 100 µg
   *   비타민 K 충분 남 75 µg · 여 65 µg
   */
  { id: 'kdri2020', kind: 'guideline', year: 2020, verified: '비타민 K 충분섭취량 성인 남 75 µg·여 65 µg · 비타민 D 충분섭취량 19~64세 10 µg·65세 이상 15 µg, 상한섭취량 100 µg · 칼슘 권장섭취량 성인 700~800 mg · 칼슘 권장 성인 700~800 mg · 상한 50세 이상 2,000 mg · 비타민 D 충분섭취량 10~15 µg · 상한 100 µg (B-cancer1 갈래가 KNS 자료실 원문 표로 대조, B-fix 는 재확인 못 함) · (C-fix 가 KNS 자료실 ZIP \'03 무기질\' 원문 표로 재확인) 칼슘 권장섭취량 성인 남 700~800·여 700~800 mg · 상한 19~49세 2,500 mg, 50세 이상 2,000 mg · 비타민 D 충분섭취량 19~64세 10 µg, 65세 이상 15 µg · 상한 100 µg · 무기질 편 나트륨 장: 2018년 한국인 나트륨 일일 평균섭취량 3,255 mg · 요약표(다량무기질, 남녀 같음): 나트륨 충분섭취량 19-64세 1,500 · 만성질환위험감소섭취량 2,300(65-74세 2,100, 75세 이상 1,700) (3,255 ÷ 2,300 ≈ 1.4배) · 칼륨 충분섭취량 3,500 · 인 권장 700, 상한 3,500(75세 이상 3,000) · 인 장: 첨가물 무기 인산염은 흡수율이 일반 식품 속 인보다 상당히 높음 · 칼륨 장: 신기능 정상이면 소변으로 배설, 칼륨 대체 소금으로 고칼륨혈증(말기 신부전 사례). (KDRI 나트륨 개정 논문 PMC9127518 본문의 노인 남녀별 값 1,900/1,800·2,200/1,700 은 요약표와 다름 — 요약표를 따름) · 비타민 C 권장섭취량 성인 100 mg · 상한 2,000 mg · 2~3 g/일에서 위장 증상, 일부는 1 g/일에서도 · 비타민 D 상한 100 µg(4,000 IU) · 칼슘 권장 성인 700~800 mg, 상한 19~49세 2,500 mg·50세 이상 2,000 mg · 아연 상한 성인 35 mg(과량은 구리 흡수 저하) · 비타민 E 결핍 증세를 보이는 사람은 없는 실정', access: 'open',
    url: 'https://www.kns.or.kr/FileRoom/FileRoom_view.asp?idx=108&BoardID=Kdr',
    citation: '보건복지부·한국영양학회. 2020 한국인 영양소 섭취기준(KDRIs).' },
  /* 'knhanes' 를 지웠다(2026-10-14 전수 대조) — 3,255 mg(2018) 의 원 자료를 끝내 찾지 못했고 인용하는 규칙도 없어짐 */
  { id: 'kfda-db', kind: 'db', year: 2024, access: 'open',
    citation: '식품의약품안전처. 식품영양성분 데이터베이스.',
    url: 'https://various.foodsafetykorea.go.kr/nutrient/' },
  /* '제9개정판(2021)' 이라 적혀 있었으나 9판은 2016년이다. 손으로 넣은 13 품목이 몇 판 값인지 기록이 없어 판을 단정하지 않는다(2026-10-14) */
  { id: 'rda-table', kind: 'db', year: 2021, access: 'open',
    citation: '농촌진흥청 국립농업과학원. 국가표준식품성분표 / 국가표준식품성분 데이터베이스.',
    url: 'https://koreanfood.rda.go.kr/' },

  // ── 발암성 분류 ───────────────────────────────────────────────
  /* 공개 Q&A 문서를 받아 대조했다 — 분류 근거·50 g/18 %·100 g/17 % 가 모두 여기에 있다 */
  { id: 'iarc114', kind: 'review', year: 2018, verified: '가공육 Group 1 — 10편, 하루 50 g 당 대장암 약 18 % · 적색육 Group 2A(제한적 근거) — 인과 가정 시 100 g 당 17 % · 기전 아직 완전히 밝혀지지 않음 · 조리법이 위험을 바꾸는지 결론 낼 자료 부족 · 가공 중 생기는 발암물질의 예: N-니트로소 화합물·다환방향족탄화수소 · 보존법이 얼마나 기여하는지는 알 수 없음 · Group 1 은 근거의 확실성이지 위험의 크기가 아님', access: 'open',
    url: 'https://www.iarc.who.int/wp-content/uploads/2018/07/Monographs-QA_Vol114.pdf',
    citation: 'IARC Monographs Volume 114: Red Meat and Processed Meat. International Agency for Research on Cancer. (공개 Q&A 포함)' },
  { id: 'iarc100e', kind: 'review', year: 2012, verified: '알코올이 간세포 손상→섬유화·간경변 · 간염 감염자·비감염자 모두에서 간암 위험 증가 일관 관찰(크기는 정량 불가) · 구강·인두암 음주×흡연 \'곱셈 이상\' 상호작용 · 췌장암은 하루 30 g 이상에서 작은 증가, 흡연 교란 배제 못 함', access: 'open',
    citation: 'IARC Monographs Volume 100E: Personal Habits and Indoor Combustions — Alcohol Consumption. (주류 = Group 1 · 구강·인두·후두·식도·간·대장·여성 유방)',
    url: 'https://publications.iarc.who.int/122' },
  /* 공개 보도자료(PR 244) 대조. '매우 뜨거움' 의 정의가 65 ℃ 초과이고, 커피 자체는 Group 3 으로 내려갔다 */
  { id: 'iarc116', kind: 'review', year: 2016, access: 'open',
    url: 'https://www.iarc.who.int/wp-content/uploads/2018/07/pr244_E.pdf',
    citation:
      'IARC Monographs Volume 116: Drinking Coffee, Mate, and Very Hot Beverages (2016). ' +
      '65 ℃ 초과 음료 = Group 2A(제한적 근거) · 커피 자체 = Group 3(1991년 2B 에서 하향)' },
  /* 공개 전문(NCBI Bookshelf) 대조. 'greater than multiplicative interaction' 이 원문 표현이다 */
  { id: 'iarc-aflatoxin', kind: 'review', year: 2012, verified: 'Omer 2004(한 연구) 아플라톡신 노출+HBsAg 양성의 기여위험 약 80 % · 원문 PDF publications.iarc.who.int/download/mono100F-23 대조', access: 'open',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK304413/',
    citation:
      'IARC Monographs Volume 100F: Aflatoxins. — Group 1 · B형 간염과 곱셈보다 더 크게 겹침 · TP53 코돈 249 변이' },

  // ── 대두·유방암 ───────────────────────────────────────────────
  { id: 'shu2009', kind: 'cohort', year: 2009, verified: '상하이 유방암 생존자 5,042명(수술 5,033명, 중앙 3.9년) · 대두 단백 최상위 vs 최하위 4분위: 총사망 HR 0.71(95 % CI 0.54~0.92), 재발·유방암 사망 HR 0.68(0.54~0.87) — 출판본(JAMA) 초록 값 · 타목시펜 복용·비복용 모두에서 관련(present in both) · 주의: PMC 저자 원고판(PMC2874068)에는 0.67·0.66 으로 실려 있다 · 상하이 유방암 생존자 5,042명 · 4년 재발 11.2 % 대 8.0 %(JAMA 출판본 초록 — PMC 저자원고는 5년 13.0 % 대 8.9 %) · 재발 HR 0.68(95 % CI 0.54~0.87) · 타목시펜 하위군 HR 0.60·0.61 은 통계적으로 유의하지 않음 · 고찰: 대두 보충제·이소플라본 보충제의 효과는 식품과 다를 수 있음', access: 'pmc', fulltext: 'PMC2874068',
    citation: 'Shu XO, et al. Soy food intake and breast cancer survival. JAMA. 2009;302(22):2437-2443.',
    url: 'https://doi.org/10.1001/jama.2009.1783' },
  { id: 'nechuta2012', kind: 'meta', year: 2012, verified: '미국·중국 코호트 9,514명 · 이소플라본 ≥10 mg/일 재발 HR 0.75(95 % CI 0.61~0.92) · 전체 사망 0.87(0.70~1.10)·유방암 사망 0.83(0.64~1.07) 유의하지 않음 (PMC 원문은 PDF)', access: 'pmc', fulltext: 'PMC3374736',
    citation: 'Nechuta SJ, et al. Soy food intake after diagnosis of breast cancer and survival: an in-depth analysis of combined evidence from cohort studies of US and Chinese women. Am J Clin Nutr. 2012;96(1):123-132. (메타분석이 아니라 3개 코호트 개인자료 합동분석 — ABCPP)',
    url: 'https://doi.org/10.3945/ajcn.112.035972' },
  { id: 'chi2013', kind: 'meta', year: 2013, access: 'open',
    citation: 'Chi F, et al. Post-diagnosis soy food intake and breast cancer survival: a meta-analysis of cohort studies. Asian Pac J Cancer Prev. 2013;14(4):2407-2412.',
    url: 'https://doi.org/10.7314/apjcp.2013.14.4.2407' },

  // ── 항산화 보충제의 위해 ──────────────────────────────────────
  /* 'bairati2005' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  /*
   * '국소 재발·사망 증가(특히 흡연자)' 의 실제 출처. 같은 540명 시험의 후속 분석이다.
   * 두 Bairati 2005 논문은 각각 급성 부작용과 이차암을 다루지 이 결과를 다루지 않는다.
   * 그리고 이 논문의 핵심은 '흡연자에서만' 이라는 것이다 — 비흡연자의 위험비는 1에 가까웠다.
   */
  { id: 'meyer2008smoking', kind: 'rct', year: 2008, verified: '재발 2.41(약 2.4배) · 전체 사망 2.26(약 2.3배) (초록 대조) · 540명 · 비타민 E 400 IU·베타카로틴 30 mg/일 · 흡연자 재발 2.4배·사망 2.3배', access: 'open',
    citation: 'Meyer F, et al. Interaction between antioxidant vitamin supplementation and cigarette smoking during radiation therapy in relation to long-term effects on recurrence and mortality: a randomized trial among head and neck cancer patients. Int J Cancer. 2008;122(7):1679-1683. (방사선치료 중 흡연자에서 재발 HR 2.41, 전체 사망 2.26, 두경부암 사망 3.38 · 비흡연자는 모두 1에 가까움)',
    url: 'https://doi.org/10.1002/ijc.23200' },
  /* 'bairati2005b' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  { id: 'atbc1994', kind: 'rct', year: 1994, verified: '남성 흡연자 29,133명 · 베타카로틴 20 mg/일 · 폐암 발생 18 % 증가(95 % CI 3~36 %) · 전체 사망 8 % 증가(1~16 %) (PubMed 초록 대조) · 남성 흡연자 29,133명 · 베타카로틴 20 mg/일 · 폐암 발생 18 % 증가(95 % CI 3~36 %) — PubMed 초록 대조', access: 'open',
    citation: 'The Alpha-Tocopherol, Beta Carotene Cancer Prevention Study Group. The effect of vitamin E and beta carotene on the incidence of lung cancer and other cancers in male smokers. N Engl J Med. 1994;330(15):1029-1035.',
    url: 'https://doi.org/10.1056/NEJM199404143301501' },
  { id: 'caret1996', kind: 'rct', year: 1996, verified: '흡연자·석면 노출자 18,314명 · 베타카로틴 30 mg + 레티놀 25,000 IU · 폐암 RR 1.28(95 % CI 1.04~1.57) · 폐암 사망 1.46(1.07~2.00) · 21개월 조기 중단 (PubMed 초록 대조) · 흡연자·과거 흡연자·석면 노출자 18,314명 · 베타카로틴 30 mg+레티닐 팔미테이트 25,000 IU · 폐암 RR 1.28(1.04~1.57) · 계획보다 21개월 일찍 중단 — PubMed 초록 대조', access: 'open',
    citation: 'Omenn GS, et al. Effects of a combination of beta carotene and vitamin A on lung cancer and cardiovascular disease (CARET). N Engl J Med. 1996;334(18):1150-1155.',
    url: 'https://doi.org/10.1056/NEJM199605023341802' },
  { id: 'select2011', kind: 'rct', year: 2011, access: 'pmc', fulltext: 'PMC4169010',
    citation: 'Klein EA, et al. Vitamin E and the risk of prostate cancer: the Selenium and Vitamin E Cancer Prevention Trial (SELECT). JAMA. 2011;306(14):1549-1556. (n=35,533 · 비타민 E 400 IU HR 1.17, 99% CI 1.004-1.36 · 셀레늄 200 µg HR 1.09, 99% CI 0.93-1.27)',
    url: 'https://doi.org/10.1001/jama.2011.1437' },
  /*
   * 기저 셀레늄 수치에 따라 결과가 갈린다는 것은 위 논문이 아니라 이 사후 분석에 있다.
   * 한동안 이 주장을 select2011 하나에 붙여 두었는데, 그 논문 초록에는 없는 내용이었다.
   * "A 를 다룬 논문" 과 "A 가 그렇다는 근거" 는 다르다.
   */
  { id: 'kristal2014', kind: 'cohort', year: 2014, verified: 'P=0.007 (원문 표기 P = .007)', access: 'pmc', fulltext: 'PMC3975165',
    citation: 'Kristal AR, et al. Baseline selenium status and effects of selenium and vitamin E supplementation on prostate cancer risk. J Natl Cancer Inst. 2014;106(3):djt456. (SELECT 사후 case-cohort · 기저 셀레늄이 높던 군에서 고위험 전립선암 91% 증가, P=.007)',
    url: 'https://doi.org/10.1093/jnci/djt456' },

  // ── 비타민 D ─────────────────────────────────────────────────
  { id: 'ng2019', kind: 'rct', year: 2019, verified: 'SUNSHINE 2상 139명 · 무진행생존 13.0 대 11.0개월(P=.07), 다변량 HR 0.64 · 전체 생존 24.3 대 24.3개월 · SUNSHINE 2상 139명 · 중앙 PFS 13 vs 11개월(유의하지 않음) · 다변량 HR 0.64(유의)', access: 'pmc', fulltext: 'PMC6459117',
    citation: 'Ng K, et al. Effect of High-Dose vs Standard-Dose Vitamin D3 Supplementation on Progression-Free Survival Among Patients With Advanced or Metastatic Colorectal Cancer (SUNSHINE). JAMA. 2019;321(14):1370-1379.',
    url: 'https://doi.org/10.1001/jama.2019.2402' },
  { id: 'manson2019', kind: 'rct', year: 2019, verified: 'VITAL 25,871명 · 비타민 D 2,000 IU · 중앙 5.3년 · 암 발생 HR 0.96(0.88~1.06) · 대장암 1.09(0.73~1.62) · VITAL 25,871명 · 비타민 D3 2,000 IU/일 · 암 발생 HR 0.96(0.88~1.06)', access: 'pmc', fulltext: 'PMC6425757',
    citation: 'Manson JE, et al. Vitamin D Supplements and Prevention of Cancer and Cardiovascular Disease (VITAL). N Engl J Med. 2019;380(1):33-44.',
    url: 'https://doi.org/10.1056/NEJMoa1809944' },

  // ── 위암·염장식품 ─────────────────────────────────────────────
  { id: 'ge2012salt', kind: 'meta', year: 2012, verified: '95 % CI · 총 2,076,498명(환자대조 7·코호트 4편이라 오즈비)', access: 'pmc', fulltext: 'PMC3485508',
    url: 'https://doi.org/10.1155/2012/808120',
    citation:
      'Ge S, et al. Association between habitual dietary salt intake and risk of gastric cancer: a systematic review of observational studies. ' +
      'Gastroenterol Res Pract. 2012;2012:808120. (11편·207만 명 · 고염 대 저염 OR 2.05 [1.60~2.62] · 아시아 하위군 OR 1.27 [1.22~1.32])' },
  /*
   * 'dagostino-kim2013' 을 여기서 뺐다.
   * 인용문 자체가 서지 형태가 아니었고("Int J Cancer / Korean cohort evidence on ..."),
   * PubMed 에서 해당 논문을 찾을 수 없었다. 확인되지 않는 출처를 근거로 둘 수는 없다.
   * 대신 실제로 존재하고 확인한 한국 자료 세 편으로 바꾼다.
   */
  { id: 'kim2010saltpref', kind: 'cohort', year: 2010, access: 'open',
    url: 'https://doi.org/10.3945/ajcn.2009.28732',
    citation:
      'Kim J, Park S, Nam BH. Gastric cancer and salt preference: a population-based cohort study in Korea. Am J Clin Nutr. 2010;91(5):1289-1293. ' +
      '(224만 명 · 짜게 먹는 기호 위험비 1.10 [1.04~1.16] — 저자 표현은 "marginal")' },
  { id: 'yoo2020pickled', kind: 'meta', year: 2020, verified: '95 % CI · 김치·장아찌를 절임채소로 정의', access: 'pmc', fulltext: 'PMC7225928',
    url: 'https://doi.org/10.3390/cancers12040996',
    citation:
      'Yoo JY, et al. Pickled vegetable and salted fish intake and the risk of gastric cancer: two prospective cohort studies and a meta-analysis. Cancers. 2020;12(4):996. ' +
      '(한국인유전체역학조사·다기관암코호트 · 절임채소 하루 40 g 당 상대위험 1.15 [1.07~1.23] · 젓갈 1.17 [0.99~1.38])' },
  { id: 'kimhj2010veg', kind: 'meta', year: 2010, access: 'pmc', fulltext: 'PMC11159166',
    url: 'https://doi.org/10.1111/j.1349-7006.2009.01374.x',
    citation:
      'Kim HJ, et al. Fresh and pickled vegetable consumption and gastric cancer in Japanese and Korean populations: a meta-analysis of observational studies. Cancer Sci. 2010;101(2):508-516. ' +
      '(신선 채소 오즈비 0.62 [0.46~0.85] · 절임 채소 1.28 [1.06~1.53])' },
  /*
   * 연도가 2020 으로 적혀 있었으나 실제는 2011 이다(PubMed 21447764).
   * 단독저자 초청 종설이며 학회 합의문이 아니다 — 그래서 이 출처만으로는 'G' 를 달 수 없다.
   * 그리고 이 종설 자신이 결론에서 "표준 위절제 후 식단을 뒷받침할 문헌이 충분하지 않고,
   * 증상에 맞춘 개별 조정이 권고된다" 고 적는다. 앱도 그 말을 그대로 옮긴다.
   */
  /* 'gastrectomy-nutr' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  /* 위절제 후 B12 결핍의 빈도를 실제 숫자로 말하는 유일한 상위 근거 */
  /* 'b12-gastrectomy-meta' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */

  // ── 대장암 ───────────────────────────────────────────────────
  { id: 'song2018fiber', kind: 'cohort', year: 2018, verified: '1~3기 1,575명·중앙 8년 · 진단 후 섬유 5 g/일 당 대장암 사망 HR 0.78(0.65~0.93) · 진단 후 증가 5 g 당 18 % 감소 · 곡물 섬유 HR 0.67(0.50~0.90) · 채소 섬유 전체 사망만 0.83 · 과일 섬유 무관', access: 'pmc', fulltext: 'PMC5776713',
    citation: 'Song M, et al. Fiber Intake and Survival After Colorectal Cancer Diagnosis. JAMA Oncol. 2018;4(1):71-79.',
    url: 'https://doi.org/10.1001/jamaoncol.2017.3684' },
  { id: 'vanblarigan2018', kind: 'cohort', year: 2018, verified: 'CALGB 89803 3기 결장암 992명·중앙 7년 · 점수 5~6 대 0~1 사망 HR 0.58(0.34~0.99) · 음주 포함 6~8 대 0~2 HR 0.49(0.32~0.76) · 점수 기준은 ACS 2012 지침 (PMC 는 초록만, 원문 미대조)', access: 'pmc', fulltext: 'PMC6145685',
    citation: 'Van Blarigan EL, et al. Association of Survival With Adherence to the American Cancer Society Nutrition and Physical Activity Guidelines for Cancer Survivors After Colon Cancer Diagnosis: The CALGB 89803/Alliance Trial. JAMA Oncol. 2018;4(6):783-790.',
    url: 'https://doi.org/10.1001/jamaoncol.2018.0126' },

  // ── 간암 ─────────────────────────────────────────────────────
  { id: 'kennedy2017coffee', kind: 'meta', year: 2017, verified: '코호트 18편(2,272,642명)+환자대조군 8편 · 하루 2잔당 RR 0.65(95 % CI 0.59~0.72) · 코호트만 0.71(0.65~0.77) · 카페인 0.73(코호트 2편, 27 % 감소)·디카페인 0.86(0.74~1.00, 3편, 14 % 감소) · GRADE 매우 낮음', access: 'pmc', fulltext: 'PMC5730000',
    citation: 'Kennedy OJ, et al. Coffee, including caffeinated and decaffeinated coffee, and the risk of hepatocellular carcinoma: a systematic review and dose-response meta-analysis. BMJ Open. 2017;7(5):e013739.',
    url: 'https://doi.org/10.1136/bmjopen-2016-013739' },
  { id: 'easl-nutrition', kind: 'guideline', year: 2019, verified: '간경변 단백질 1.2~1.5 g/kg/일 · 복수 시 나트륨 약 80 mmol/일(2 g, 소금 5 g) · 60 mmol/일(약 1,400 mg) 미만 금지 · 복수 나트륨 제한 근거는 제한적·상충 · 야식은 대사·삶의 질 개선, 근육량 비일관 · BCAA 코크런 16편·827명: HE 개선, 사망·삶의 질·영양 영향 없음(권고 Grade I-1) · 복수 시 나트륨 약 80 mmol/일(= 나트륨 2 g = 2,000 mg = 소금 5 g) · 나트륨 제한 근거는 제한적이고 엇갈림 · 60 mmol/일(나트륨 약 1,400 mg) 아래로는 줄이지 말 것 · 저나트륨혈증은 나트륨이 적고 물은 그대로·많을 때 생기기 쉬워 나트륨·물 섭취를 함께 관찰', access: 'pmc', fulltext: 'PMC6657019',
    citation: 'European Association for the Study of the Liver. EASL Clinical Practice Guidelines on nutrition in chronic liver disease. J Hepatol. 2019;70(1):172-193.',
    url: 'https://doi.org/10.1016/j.jhep.2018.06.024' },

  // ── 전립선암 ─────────────────────────────────────────────────
  { id: 'wcrf-prostate', kind: 'review', year: 2018, verified: '칼슘 고섭취 식사·유제품 — limited-suggestive(2007 의 strong 에서 강등) · PROSTATE CANCER REPORT 2014(Revised 2018) p8: 리코펜 함유 식품·셀레늄 보충제 — 2차 보고서(2007) \'probable\' 감소에서 \'결론 불가(limited – no conclusion)\'로 강등', access: 'open', fulltext: 'https://www.wcrf.org/wp-content/uploads/2024/10/prostate-cancer-report.pdf',
    citation: 'WCRF/AICR Continuous Update Project: Diet, nutrition, physical activity and prostate cancer. (유제품·칼슘 고섭취 — limited-suggestive 위험 증가)',
    url: 'https://www.wcrf.org/wp-content/uploads/2024/10/prostate-cancer-report.pdf' },
  { id: 'adt-bone', kind: 'guideline', year: 2020, access: 'open',
    citation:
      'Saylor PJ, et al. Bone Health and Bone-Targeted Therapies for Prostate Cancer: ASCO Endorsement of a Cancer Care Ontario Guideline. ' +
      'J Clin Oncol. 2020;38(15):1736-1743. — ADT 시작 전 골밀도 검사 권장 · 골전이 표적치료제 병용 시 칼슘 500 mg 이상·비타민 D 400 IU 이상',
    url: 'https://doi.org/10.1200/JCO.19.03148' },
  /*
   * '연 2~5 %' 의 실제 값은 이 무작위 시험에 있다.
   * 부위와 측정법에 따라 다르다 — 그래서 문헌마다 숫자가 달라 보인다.
   */
  { id: 'smith2001adt', kind: 'rct', year: 2001, access: 'open',
    citation: 'Smith MR, et al. Pamidronate to prevent bone loss during androgen-deprivation therapy for prostate cancer. N Engl J Med. 2001;345(13):948-955. (48주 · 대조군 골밀도 요추 3.3 %, 대전자 2.1 %, 고관절 1.8 % 감소 · 요추 해면골은 8.5 %)',
    url: 'https://doi.org/10.1056/NEJMoa010845' },

  { id: 'asco-cardio', kind: 'guideline', year: 2017, verified: '권고 3.1 위험 요인(흡연·고혈압·당뇨·이상지질혈증·비만) 관리, 근거 수준 불충분 · 심장 포함 방사선 30 Gy 이상 고위험 (B-cancer1 갈래 브라우저 대조 — B-fix 는 403 으로 재확인 못 함)', access: 'open', fulltext: 'https://ascopubs.org/doi/10.1200/JCO.2016.70.5400',
    citation: 'Armenian SH, et al. Prevention and Monitoring of Cardiac Dysfunction in Survivors of Adult Cancers: ASCO Clinical Practice Guideline. J Clin Oncol. 2017;35(8):893-911. — 심장독성 약제 사용 중 혈압·체중·지질 등 심혈관 위험 요인 관리 권고.',
    url: 'https://doi.org/10.1200/JCO.2016.70.5400' },

  // ── 호중구감소증 식이 ────────────────────────────────────────
  /*
   * id 는 'sonbol2015' 이지만 실제로 인용하는 것은 2019년 갱신판이다(초판이 2015년).
   * id 는 읽음 표시처럼 여기저기 걸려 있어 그대로 두고, 연도와 내용을 사실에 맞춘다.
   */
  /* 'sonbol2015' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  /*
   * 비브리오 치사율의 실제 출처. EASL 영양 지침에는 비브리오도 생식도 한 번도 나오지 않는다 —
   * 그 지침을 근거로 달아 두었던 것은 인용과 주장이 어긋난 경우였다.
   */
  { id: 'vibrio-meta2019', kind: 'meta', year: 2019, verified: '대상은 비브리오 괴사성 피부·연조직 감염 환자 · RR 은 위험비가 아니라 상대위험', access: 'pmc', fulltext: 'PMC6814278',
    citation: 'Chuang PY, et al. Hepatic disease and the risk of mortality of Vibrio vulnificus necrotizing skin and soft tissue infections: a systematic review and meta-analysis. PLoS One. 2019;14(10):e0223513. (12편·1,157명 · 간질환군 53.9 % 대 비간질환군 16.1 %, RR 2.61, 95 % CI 2.14~3.19)',
    url: 'https://doi.org/10.1371/journal.pone.0223513' },
  { id: 'cdc-vibrio', kind: 'guideline', year: 2024, access: 'open',
    citation: 'U.S. CDC. Clinical Overview of Vibriosis. — 비브리오 불니피쿠스 감염자의 약 5명 중 1명이 사망하며, 간질환이 있으면 특히 위험하다.',
    url: 'https://www.cdc.gov/vibrio/hcp/clinical-overview/index.html' },
  /*
   * 연도를 2023 으로 적어 두었으나 문서 표지와 마지막 쪽은 'July 2020' 이다(2026-10-13 에 PDF 를 받아 확인).
   * 같은 날 덜 익힌 것의 짝도 원문에서 확인했다 — "Refrigerated smoked fish", "Soft-boiled or over-easy eggs,
   * as the yolks are not fully cooked", "Hot dogs, deli, and luncheon meats that have not been reheated" 가 높은 쪽,
   * "Previously cooked seafood heated to 165°F", "Fully cooked eggs with firm yolk and whites" 가 낮은 쪽.
   * 프로슈토·하몽·전복장이라는 이름은 원문에 없다 — 데우지 않은 델리 미트, 다시 데우지 않은 익힌 해산물로 묶인다.
   */
  { id: 'fda-foodsafety', kind: 'guideline', year: 2020, verified: '외식: 익히지 않은 재료(달걀·새싹·고기·가금·해산물)가 들었는지 묻고 확실하지 않으면 다른 메뉴 · 회·비채식 초밥·세비체 위험 높음 · 생 새싹 든 샐러드·랩·샌드위치 위험 높음, 다른 생채소는 씻은 것이 낮은 쪽 · 가게에서 만든 델리 샐러드 위험 높음 · Vibrio·probiotic 언급 없음', access: 'open',
    citation: 'U.S. FDA. Food Safety for Older Adults and People with Cancer, Diabetes, HIV/AIDS, Organ Transplants, and Autoimmune Diseases. July 2020. — 위험이 높은 것과 낮은 것을 짝지어 제시한다. 생 새싹채소는 높은 쪽, 익힌 새싹이 낮은 쪽이다. 냉장 훈제 생선·노른자가 덜 익은 달걀·데우지 않은 햄(델리 미트)은 높은 쪽, 속까지 익힌 것과 74 ℃(165 °F)로 다시 데운 것이 낮은 쪽이다. 조리 후 2시간 안에 냉장(32 ℃ 넘으면 1시간).',
    url: 'https://www.fda.gov/media/83744/download' },

  // ── 상호작용 ─────────────────────────────────────────────────
  /* 전문 공개. 200 mL·24시간 25 %·라임/포멜로/세비야오렌지·단맛오렌지 제외·정맥주사 무영향이 모두 여기에 있다 */
  { id: 'lakmal2021starfruit', kind: 'review', year: 2021, verified: '스타후르츠 섭취 뒤 신독성·신경독성 사례(증례·증례 모음) · 독성 성분은 카람복신과 옥살산 · 만성 콩팥병·위장 질환·만성 췌장염·탈수·빈속 섭취·옥살산 농도가 독성을 부추김 · 독성 용량은 정해지지 않음(반 개~50개, 주스 25~3,000 mL) · 빈속에는 적은 양으로도 독성 보고 · 2026-10-15 원문 대조', access: 'pmc', fulltext: 'PMC7958541',
    citation: 'Lakmal K, Yasawardene P, Jayarajah U, Seneviratne SL. Nutritional and medicinal properties of Star fruit (Averrhoa carambola): A review. Food Sci Nutr. 2021;9(3):1810-1823. doi:10.1002/fsn3.2135',
    url: 'https://doi.org/10.1002/fsn3.2135' },
  { id: 'bailey2013grapefruit', kind: 'review', year: 2013, verified: '자몽 1개 또는 주스 200 mL 로 충분 · 펠로디핀에서 24시간 간격이면 최대 효과의 25 %(4분의 1) · 라임·포멜로·세비야 오렌지도 같고 네이블·발렌시아 단맛 오렌지는 아님 · 정맥 투여 약은 영향 없음 · 표1: 엘로티닙·크리조티닙 위험 High(크리조티닙 용량 관련 이상반응 QT·골수 억제), 소라페닙은 파조파닙·수니티닙의 \'대체 약\' 칸 · 정맥 투여 약의 약동학은 변하지 않음(\'intravenously administered drugs are unchanged\') — 상호작용은 먹는 약에만', access: 'pmc', fulltext: 'PMC3589309',
    url: 'https://doi.org/10.1503/cmaj.120951',
    citation: 'Bailey DG, et al. Grapefruit–medication interactions: forbidden fruit or avoidable consequences? CMAJ. 2013;185(4):309-316.' },
  /* 'golden2009' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  /*
   * 카페시타빈–와파린은 증례 보고가 근거다. 한동안 ACCP 항응고 지침 하나만 달아 두었는데,
   * 그 지침은 비타민 K 섭취의 일관성을 다루지 카페시타빈을 다루지 않는다.
   * 주장을 실제로 뒷받침하는 문헌을 따로 단다.
   */
  /* 'capecitabine-warfarin' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  /*
   * 항호르몬제와 음식 — 2026-10-13 에 원문을 받아 확인한 것들.
   * 약품 설명서는 DailyMed 의 SPL 을 받아 낱말을 세었다('grapefruit' 0건).
   * 암 약물 상호작용 자료는 2022-06 에 갱신이 멈춘 보관본이다 — 그 사실을 인용에 적는다.
   */
  { id: 'cdi-liverpool', kind: 'db', year: 2022, access: 'open',
    citation: 'Radboud UMC · University of Liverpool. Cancer Drug Interactions (2022년 6월 보관본). — 자몽주스: 타목시펜 "Do Not Coadminister", 레트로졸 "Potential Interaction(권장하지 않음)", 아팔루타미드·엔잘루타미드 "Potential Weak Interaction", 아비라테론 "No Interaction Expected". 세인트존스워트: 타목시펜·아비라테론·엔잘루타미드 "Do Not Coadminister", 레트로졸·아팔루타미드 "Potential Interaction". 근거의 질은 모두 Very Low~Low 이며 요약은 "함께 쓴 연구는 없다" 로 시작한다. 아나스트로졸·엑스메스탄·비칼루타미드·고세렐린·류프로렐린·다롤루타미드는 항목이 없다.',
    url: 'https://cancer-druginteractions.org/checker' },
  { id: 'bccancer-tamoxifen', kind: 'db', year: 2024, access: 'open',
    citation: 'BC Cancer Drug Manual. Tamoxifen monograph (2024년 5월 1일 개정). — "자몽주스는 장에서 타목시펜의 CYP3A4 대사를 억제해 혈중 농도를 올릴 수 있다. 활성 대사물로 덜 바뀌는 것의 임상적 의미는 알려져 있지 않다."',
    url: 'https://www.bccancer.bc.ca/drug-database-site/Drug%20Index/Tamoxifen_monograph.pdf' },
  { id: 'fda-label-tamoxifen', kind: 'guideline', year: 2021, access: 'open',
    citation: 'SOLTAMOX (tamoxifen citrate) 미국 허가사항. DailyMed. — 강한 CYP3A4 유도제와 함께 쓰지 말 것(리팜핀이 타목시펜 AUC 를 86 % 낮춤). 음식은 흡수에 영향을 주지 않는다. 자몽에 관한 언급은 없다.',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1e6ff055-590c-41e6-9530-1fdf04cdbd02' },
  { id: 'fda-label-ai', kind: 'guideline', year: 2026, verified: 'url 이 AROMASIN 하나만 가리킨다 — FEMARA setid 82b77d74-085f-45ac-a7dd-1f5c038bf406, ARIMIDEX setid acbfaaa9-503c-4691-9828-76a7146ed6de 를 함께 적을 것 · 아리미덱스: 음식은 흡수 속도만 늦추고 흡수량은 그대로(Cmax 16 % 감소, Tmax 2→5시간) · 페마라: CYP3A4·CYP2A6 대사', access: 'open',
    citation: 'FEMARA (letrozole) · ARIMIDEX (anastrozole) · AROMASIN (exemestane) 미국 허가사항. DailyMed. — 엑스메스탄: 식후 복용. CYP3A4 유도제(리팜피신·페니토인·세인트존스워트 등)가 노출을 크게 낮출 수 있다. 케토코나졸(강한 CYP3A4 억제제)은 엑스메스탄 약동학에 의미 있는 영향이 없었다. 아나스트로졸: 에스트로겐이 든 제제·타목시펜과 함께 쓰지 말 것, 음식과 무관하게 복용. 세 약 모두 자몽에 관한 언급은 없다.',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=cf066b7a-032a-416c-8d40-15ba581423e3' },
  { id: 'fda-label-adt', kind: 'guideline', year: 2026, access: 'open',
    citation: 'CASODEX (bicalutamide) · ZOLADEX (goserelin) · LUPRON DEPOT (leuprolide) 미국 허가사항. DailyMed. — 비칼루타미드: 음식은 흡수에 의미 있는 영향이 없다. 졸라덱스: 다른 약과의 상호작용이 확인된 바 없다. 세 약 모두 자몽에 관한 언급은 없다.',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=dfee4fe7-8478-4a3e-925d-00be3cd0ab67' },
  { id: 'fda-label-arpi', kind: 'guideline', year: 2026, verified: '얼리다: 케토코나졸 병용 시 아팔루타미드 정상상태 AUC 51 % 증가 예측(활성 성분 합계 28 %)', access: 'open',
    citation: 'ZYTIGA (abiraterone) · XTANDI (enzalutamide) · ERLEADA (apalutamide) · NUBEQA (darolutamide) 미국 허가사항. DailyMed. — 자이티가: 빈속에 복용(복용 전 2시간·후 1시간 금식), 음식과 함께 먹으면 AUC 가 저지방식에서 약 5배, 고지방식에서 약 10배. 뉴베카: 음식과 함께 복용. 엑스탄디·얼리다: 음식과 무관. 자이티가·엑스탄디는 강한 CYP3A4 유도제를, 뉴베카는 P-gp·CYP3A4 유도제를 피할 것. 네 약 모두 자몽에 관한 언급은 없다.',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4e338e89-3cf2-48eb-b6e2-a06c608c6513' },
  /* 16명의 무작위 교차 약동학 연구(two-arm, three-period, randomized, cross-over)다 — 2026-10-14 원문 대조로 rct 로 고쳤다. 소규모 PK 라 규칙 등급은 C */
  { id: 'hussaarts2019', kind: 'rct', year: 2019, access: 'pmc', fulltext: 'PMC6468355',
    citation: 'Hussaarts KGAM, et al. Impact of curcumin (with or without piperine) on the pharmacokinetics of tamoxifen. Cancers. 2019;11(3):403. (16명 · 커큐민 하루 3.6 g: 엔독시펜 AUC −7.7 %, 95 % CI −15.4~0.7 · 피페린을 더하면 −12.4 %, −21.9~−1.9)',
    url: 'https://doi.org/10.3390/cancers11030403' },
  { id: 'cdc-listeria', kind: 'guideline', year: 2025, access: 'open',
    citation: 'U.S. CDC. Preventing Listeria Infection (2025년 1월 31일). — 면역이 약한 사람은 "데우지 않은 델리 미트·콜드컷·핫도그·발효 또는 건조 소시지" 를 피하고, 74 ℃(165 °F) 또는 김이 날 때까지 다시 데운 것을 고를 것. 냉장 훈제 생선도 같다.',
    url: 'https://www.cdc.gov/listeria/prevention/index.html' },
  /*
   * 석류추출물 원료 규칙의 출처. 처음에는 Auerbach 2012(씨 기름 RCT)를 달았으나 원문이 구독제라 초록으로만 대조할 수 있었다 —
   * "참고 문헌 전부 원문 대조" 를 지키려고 PMC 원문이 있는 이 종설로 바꿨다(2026-10-14). 아래 괄호 안은 원문에서 확인한 문장이다.
   * 서술적 종설이고 MDPI 학술지다. 본문에 Huber 2017 의 기간을 "46개월" 로 잘못 옮긴 곳이 있어(원 연구는 8주) 그 부분은 인용하지 않는다.
   */
  { id: 'jang2024', kind: 'review', year: 2024, access: 'pmc', fulltext: 'PMC11509572',
    citation: 'Jang JY, Kim D, Im E, Kim ND. Therapeutic potential of pomegranate extract for women\'s reproductive health and breast cancer. Life (Basel). 2024;14(10):1264. (3.5절: 석류 씨에 에스트론·에스트리올·테스토스테론 등 성호르몬이 있음 · 7.3절: 유방암 관련 임상 연구는 Kapoor 2015 하나뿐 — 건강한 폐경 후 여성 64명, 석류즙 3주, 전체적으로 성호르몬·SHBG 유의한 변화 없음 · 결론: 유방암 세포의 호르몬 수용체에 영향을 줄 수 있고, 제형·용량을 정하려면 임상 연구가 더 필요)',
    url: 'https://doi.org/10.3390/life14101264' },
  /* 석류·아마씨 규칙의 출처 — 둘 다 PMC 원문 대조(2026-10-14) */
  { id: 'chen2018juice', kind: 'review', year: 2018, access: 'pmc', fulltext: 'PMC9326888',
    citation: 'Chen M, et al. Food-drug interactions precipitated by fruit juices other than grapefruit juice: an update review. J Food Drug Anal. 2018;26(2S):S61-S71. (무작위 연구 46편 종설 · 3.2.7절: 석류즙은 사람에서 플루르비프로펜(CYP2C9)·미다졸람(CYP3A) 청소율을 바꾸지 않음, 자몽과 대비 · 4.3절: 석류즙 증례 보고 — 와파린 2·로수바스타틴 1·농축액-타크롤리무스 1)',
    url: 'https://doi.org/10.1016/j.jfda.2018.01.009' },
  { id: 'vandie2024', kind: 'meta', year: 2024, access: 'pmc', fulltext: 'PMC10868383',
    citation: 'van Die MD, et al. Phytonutrients and outcomes following breast cancer: a systematic review and meta-analysis of observational studies. JNCI Cancer Spectr. 2024;8(1):pkad104. (진단 전 리그난 3편: 유방암 사망 HR 0.91, 0.74~1.12 · 폐경 후 0.66, 0.42~1.03 · 폐경 전 1.55, 1.01~2.39 / 혈중 엔테로락톤 3편: 유방암 사망 0.72, 0.58~0.90 · 전체 사망 0.69 · 표 2 전체 사망의 ER 양성 하위군(2편) 0.75, 0.56~1.00 · 재발(2편) 0.91, 0.67~1.23 / 고찰: 아마씨 하루 25 g 에서 Ki-67·HER2 감소, 세포사멸 증가)',
    url: 'https://doi.org/10.1093/jncics/pkad104' },
  /* 홍삼 — PMC 원문 대조(2026-10-14). 진단 전 복용과 생존을 본 Cui 2006(AJE)은 구독제라 인용하지 않는다 */
  { id: 'bao2012ginseng', kind: 'cohort', year: 2012, access: 'pmc', fulltext: 'PMC3379976',
    citation: 'Bao PP, et al. Ginseng and Ganoderma lucidum use after breast cancer diagnosis and quality of life: a report from the Shanghai Breast Cancer Survival Study. PLoS One. 2012;7(6):e39343. (4,149명 · 진단 후 6·18·36개월 · 인삼 복용과 36개월 삶의 질 총점 관련 없음 · ER/PR 상태와 상호작용 없음 · 타목시펜 53.5 % · 인삼 복용자의 80 % 이상이 미국 인삼)',
    url: 'https://doi.org/10.1371/journal.pone.0039343' },
  /* 칡·로열젤리 — PMC 원문 대조(2026-10-14) */
  /* 다섯 용량군에 무작위로 나눴지만 위약군이 없는 개방표지 탐색 연구다 — 대조 시험이 아니므로 cohort 로 둔다(C 까지) */
  { id: 'bihlet2021', kind: 'cohort', year: 2021, access: 'pmc', fulltext: 'PMC8568880',
    citation: 'Bihlet AR, et al. The efficacy and safety of multiple dose regimens of Kudzu (Pueraria lobata) root extract on bone and cartilage turnover and menopausal symptoms. Front Pharmacol. 2021;12:760629. (폐경 후 여성 50명 · 4주 · 개방표지·위약군 없음 · 칡뿌리 이소플라본은 주로 푸에라린, 그보다 적게 다이드제인·다이드진 · 식물성 에스트로겐 작용 가능 · 디설피람 유사 반응 보고로 금주 권고 · 인용: Woo 등 136명 3개월 칡뿌리 가루 — 증상 효과 없음)',
    url: 'https://doi.org/10.3389/fphar.2021.760629' },
  { id: 'balan2020', kind: 'review', year: 2020, access: 'pmc', fulltext: 'PMC7397171',
    citation: 'Bălan A, et al. Royal jelly — a traditional and natural remedy for postmenopausal symptoms and aging-related pathologies. Molecules. 2020;25(14):3291. (2.4·3.1절: 지방산 성분이 에스트로겐 수용체 신호를 매개, ERα·ERβ 결합은 식물성 에스트로겐보다 약함 · 3절: 사람 임상시험은 적고 대부분 난소절제 동물 · 4절: MRJP 알레르기 — 천식·피부염·기관지경련·아나필락시스, 드물게 사망 · 와파린 병용 87세 혈뇨 증례)',
    url: 'https://doi.org/10.3390/molecules25143291' },
  /* 2026-10-14 전수 대조 — fix-D-fix.json 에서 더한 출처(원문 공개분만) */
  { id: 'fda-label-egfr', kind: 'guideline', year: 2026, access: 'open', fulltext: 'erlotinib 2c4c7353-b81c-4651-8aac-6d15e88145af; IRESSA 827d60e8-7e07-41b7-c28b-49ef1c4a5a41; GILOTRIF fd638e5e-8032-e7ca-0179-95e96ab5d387; TAGRISSO 5e81b4a7-b971-45e1-9c31-29cea8c87ce7 (DailyMed setid)',
    citation: 'ERLOTINIB (Armas, 구 TARCEVA 판) · IRESSA (gefitinib) · GILOTRIF (afatinib) · TAGRISSO (osimertinib) 미국 허가사항. DailyMed. (엘로티닙: 강한 CYP3A4 억제제 — 자몽·자몽주스 포함 — 병용을 피할 것, 케토코나졸로 AUC 67 % 증가 · 게피티닙: 이트라코나졸로 AUC 80 % 증가, 자몽 언급 없음 · 오시머티닙: 이트라코나졸로 AUC 24 % 증가 — \'임상적으로 의미 없음\' · 아파티닙: CYP 대사 약 9 %, CYP3A4 탈메틸화 검출 안 됨)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2c4c7353-b81c-4651-8aac-6d15e88145af' },
  { id: 'fda-label-alk', kind: 'guideline', year: 2026, access: 'open', fulltext: 'XALKORI 2a51b0de-47d6-455e-a94c-d2c737b04ff7; ALECENSA 42c49deb-713b-427a-9670-08af08adcffb; LORBRENA 2b34d62d-e02a-4af3-bc0d-1571dd4ee76d',
    citation: 'XALKORI (crizotinib) · ALECENSA (alectinib) · LORBRENA (lorlatinib) 미국 허가사항. DailyMed. (크리조티닙: 자몽·자몽주스를 피할 것, 케토코나졸로 AUC 216 % 증가 · 알렉티닙: 강한 CYP3A 억제제(포사코나졸)로 알렉티닙+M4 노출에 의미 있는 변화 없음 · 로라티닙: 강한 CYP3A 억제제 병용을 피할 것, 자몽 언급 없음)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2a51b0de-47d6-455e-a94c-d2c737b04ff7' },
  { id: 'fda-label-cdk46', kind: 'guideline', year: 2026, access: 'open', fulltext: 'IBRANCE fecbdd7d-b729-41b5-9872-231b8fe104ce; VERZENIO be4bc0de-0fdc-4d46-8d25-be43c79e6a06; KISQALI aaeaef94-f3f5-4367-8ea2-b181d7be2da8',
    citation: 'IBRANCE (palbociclib) · VERZENIO (abemaciclib) · KISQALI (ribociclib) 미국 허가사항. DailyMed. (입랜스: "Avoid grapefruit or grapefruit juice" · 버제니오: 자몽 제품을 피할 것 · 키스칼리: 주로 CYP3A4 대사, 리토나비르로 AUC 3.2배, 강한 CYP3A 억제제를 피할 것 — 미국 허가사항에 자몽 문장은 없음)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fecbdd7d-b729-41b5-9872-231b8fe104ce' },
  { id: 'fda-label-sorafenib-lenvatinib', kind: 'guideline', year: 2026, access: 'open', fulltext: 'NEXAVAR b50667e4-5ebc-4968-a646-d605058dbef0; LENVIMA f4bedd21-efde-44c6-9d9c-b48b78d7ed1e',
    citation: 'NEXAVAR (sorafenib) · LENVIMA (lenvatinib) 미국 허가사항. DailyMed. (넥사바: 케토코나졸(강한 CYP3A4·P-gp 억제제)이 소라페닙 AUC 를 바꾸지 않음 · 렌비마: 케토코나졸로 AUC 15 %·Cmax 19 % 증가 · 두 약 모두 자몽 언급 없음)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b50667e4-5ebc-4968-a646-d605058dbef0' },
  { id: 'fda-label-warfarin', kind: 'guideline', year: 2026, access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=558b7a0d-5490-4c1b-802e-3ab3f1efe760',
    citation: 'Warfarin sodium tablets (Amneal) 미국 허가사항. DailyMed. (7.5: 비타민 K 를 일정한 양으로 유지하는 고른 식사, 녹색 잎채소를 많이 먹는 것 같은 큰 식사 변화를 피할 것 · 코엔자임Q10·세인트존스워트·인삼은 와파린 효과를 줄일 수 있음 · 허브 제품·다른 약을 시작·중단할 때 INR 을 더 자주 확인)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=558b7a0d-5490-4c1b-802e-3ab3f1efe760' },
  { id: 'javaid2024omega3', kind: 'meta', year: 2024, access: 'pmc', fulltext: 'PMC11179820',
    citation: 'Javaid M, et al. Bleeding Risk in Patients Receiving Omega-3 Polyunsaturated Fatty Acids: A Systematic Review and Meta-Analysis of Randomized Clinical Trials. J Am Heart Assoc. 2024;13(10):e032390. (무작위 시험 11건·120 643명(약 12만 명) · 오메가-3 전체 출혈 비율비 1.09(95 % CI 0.91~1.31) · 고용량 정제 EPA 만 상대위험 50 % 증가(RR 1.50), 절대위험 0.6 %p · 서론: 오메가-3 는 혈소판 응집 조절에 관여 · 연구비 일부 Amarin)',
    url: 'https://doi.org/10.1161/JAHA.123.032390' },
  { id: 'bannerman2011', kind: 'review', year: 2011, access: 'pmc', fulltext: 'PMC3215871',
    citation: 'Bannerman B, et al. Preclinical evaluation of the antitumor activity of bortezomib in combination with vitamin C or with epigallocatechin gallate, a component of green tea. Cancer Chemother Pharmacol. 2011;68(5):1145-1154. (전임상 동물 실험 — 등급 C 까지만 · 제조사(Millennium) 연구진 · EGCG 혈중 >200 µM 에서만 보르테조밉 효과 소실, 11~16 µM(보충제 복용 시 0.6~3 µM 의 몇 배)에서는 방해 없음 · 결론: 보통의 녹차 섭취는 피할 필요 없음)',
    url: 'https://doi.org/10.1007/s00280-011-1591-2' },
  { id: 'fda-label-capecitabine', kind: 'guideline', year: 2025, verified: '5.2: INR·PT 상승은 시작 며칠~몇 달 뒤, 드물게 중단 1개월 안에도 · 간 전이 유무와 관계없이', access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e702d84d-7162-4751-bf37-d724cc7e45a5',
    citation: 'XELODA (capecitabine) 미국 허가사항(2025-10 개정). DailyMed. (상자 경고: 비타민 K 길항제 병용 시 출혈 위험 증가·사망 포함 · 7.2 CYP2C9 기질 노출 증가 · 12.3 암 환자 4명에서 S-와파린 AUC 57 % 증가, 청소율 37 % 감소)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e702d84d-7162-4751-bf37-d724cc7e45a5' },
  { id: 'fda-label-oxaliplatin', kind: 'guideline', year: 2024, access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e51a62ba-d163-4c57-835c-8c86cf097e40',
    citation: 'Oxaliplatin injection (Hospira) 미국 허가사항(2024-9 개정). DailyMed. (5.2 급성 신경독성: 투여 뒤 몇 시간~2일 안에 생기고 14일 안에 회복, 찬 온도·찬 물체에 노출되면 생기거나 심해짐 · 17 환자 상담: 찬 음료·얼음을 피할 것 · 환자용 안내: 음료는 따뜻하게 또는 상온으로)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e51a62ba-d163-4c57-835c-8c86cf097e40' },
  { id: 'fda-label-cisplatin', kind: 'guideline', year: 2024, access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=de6302d5-85f0-4116-a709-57826c2c84fe',
    citation: 'Cisplatin injection (Fresenius Kabi) 미국 허가사항. DailyMed. (저마그네슘혈증·저칼슘혈증·저나트륨혈증·저칼륨혈증·저인산혈증 보고, 세뇨관 손상과 관련 · 투여 뒤 24시간 동안 충분한 수분·소변량 유지)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=de6302d5-85f0-4116-a709-57826c2c84fe' },
  { id: 'fda-label-methotrexate', kind: 'guideline', year: 2026, access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=dd035a9f-cd40-4314-b9d8-2294b8a924e2',
    citation: 'Methotrexate injection (Accord) 미국 허가사항. DailyMed. (5.12·7.1: 엽산이나 그 유도체가 든 제품은 약효를 떨어뜨릴 수 있어 임상적으로 필요할 때만 · 비종양 적응증에서는 부작용을 줄이려 엽산·폴린산 투여)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=dd035a9f-cd40-4314-b9d8-2294b8a924e2' },
  { id: 'fda-label-levothyroxine', kind: 'guideline', year: 2024, access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1e11ad30-1041-4520-10b0-8f9d30d30fcc',
    citation: 'SYNTHROID (levothyroxine) 미국 허가사항. DailyMed. (2.1: 빈속에, 아침 식사 30분~1시간 전(one-half to one hour) · 흡수를 방해하는 약과는 4시간 이상 간격 · 표: 탄산칼슘·황산철 4시간 간격 · 7.9: 콩가루·면실박·호두·식이섬유가 흡수를 줄일 수 있고 자몽주스는 흡수를 늦출 수 있음)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1e11ad30-1041-4520-10b0-8f9d30d30fcc' },
  { id: 'fda-label-dexamethasone', kind: 'guideline', year: 2026, access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6b9cf32c-6d60-4853-bbfd-2304ffc2c129',
    citation: 'HEMADY (dexamethasone) 미국 허가사항. DailyMed. (5.1 고혈당 · 5.3 혈압 상승, 염분·수분 저류, 칼륨·칼슘 배설 증가 — 식사의 소금 제한과 칼륨 보충이 필요할 수 있음)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6b9cf32c-6d60-4853-bbfd-2304ffc2c129' },
  { id: 'fda-label-ppi', kind: 'guideline', year: 2026, access: 'open', fulltext: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f4853677-1622-4037-688b-fdf533a11d96',
    citation: 'NEXIUM (esomeprazole) 미국 허가사항. DailyMed. (5.8 비타민 B12(시아노코발라민) — 장기(예: 3년 넘게) 매일 쓰면 흡수 장애·결핍 가능 · 5.9 저마그네슘혈증 — 3개월 이상 쓴 환자에서 드물게 보고)',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f4853677-1622-4037-688b-fdf533a11d96' },
  { id: 'vandervelde2014calcium', kind: 'review', year: 2014, access: 'pmc', fulltext: 'PMC4126954',
    citation: 'van der Velde RY, et al. Calcium and vitamin D supplementation: state of the art for daily practice. Food Nutr Res. 2014;58:21796. (종설 · 구연산칼슘 흡수가 탄산칼슘보다 약 24 % 높음(식사와 무관, Sakhaee 1999 메타분석) · 에스오메프라졸 20 mg 과 위약의 무작위 시험에서 칼슘 흡수 차이 없음 · PPI 복용자에서 칼슘 염 종류별 흡수 차이를 본 연구는 없음)',
    url: 'https://doi.org/10.3402/fnr.v58.21796' },
  /* 2026-10-14 전수 대조 — fix-B-fix.json 에서 더한 출처(원문 공개분만) */
  { id: 'jeong2021sodium', kind: 'cohort', year: 2021, access: 'pmc', fulltext: 'PMC8155222',
    citation: 'Jeong Y, Kim ES, Lee J, Kim Y. Trends in sodium intake and major contributing food groups and dishes in Korea: the Korea National Health and Nutrition Examination Survey 2013-2017. Nutr Res Pract. 2021;15(3):382-395. (국민건강영양조사 24시간 회상 · 하루 나트륨 3,477~3,890 mg · 나트륨 기여 음식군 1~3위 면·만두 537~573 mg, 김치 487~540 mg, 국 368~429 mg · 결론 \'국과 김치를 줄이는 것이 효과적\')',
    url: 'https://doi.org/10.4162/nrp.2021.15.3.382' },
  { id: 'park2023b12', kind: 'cohort', year: 2023, access: 'pmc', fulltext: 'PMC10605534',
    citation: 'Park SH, et al. Effect of Vitamin B12 Replacement Intervals on Clinical Symptoms and Laboratory Findings in Gastric Cancer Patients after Total Gastrectomy. Cancers (Basel). 2023;15(20):4938. (국립암센터 후향 · 전절제 B12 결핍 4년 내 78.0~100 %, 부분절제 3.2~15.7 % · 보충은 시아노코발라민 1,000 µg 근주 매달·격월 또는 메코발라민 1,000~1,500 µg 매일 경구 · 정기 190명 대 검사 기반 216명, 혈색소·증상 차이 없음)',
    url: 'https://doi.org/10.3390/cancers15204938' },
  { id: 'teixeira2023micro', kind: 'review', year: 2023, verified: '철·칼슘 주 흡수 부위인 십이지장이 대개 우회되고 위산 감소 · 저위산으로 칼슘염 용해 감소 · B12 결핍은 위산·내인자 감소로, 저장 12~18개월이라 대개 수술 2년 이후 발견', access: 'pmc', fulltext: 'PMC10376982',
    citation: 'Teixeira Farinha H, et al. Gastro-Intestinal Disorders and Micronutrient Deficiencies following Oncologic Esophagectomy and Gastrectomy. Cancers (Basel). 2023;15(14):3554. (B12 결핍은 먹는 약·주사로 평생 관리, 매년 검사 · 위절제 2년 뒤 철 결핍 40~70 %·철결핍빈혈 31 % · 칼슘 부족이 위절제 후 뼈 질환의 주원인)',
    url: 'https://doi.org/10.3390/cancers15143554' },
  { id: 'scarpellini2020dumping', kind: 'guideline', year: 2020, verified: '단백질 음식·수분 지연의 이득을 보인 대조 연구는 문헌에 없음 · 섬유·단백질 풍부한 음식 권함', access: 'pmc', fulltext: 'PMC7351708',
    citation: 'Scarpellini E, et al. International consensus on the diagnosis and management of dumping syndrome. Nat Rev Endocrinol. 2020;16(8):448-466. (Delphi 합의 · 후기 덤핑 식후 1~3시간 · 식이 조절이 첫 치료 · 식사량 줄이고 물은 식후 30분 이상 뒤(동의 90 %) · 빠른 흡수 당 제거 · 식후 30분 눕기는 채택 안 됨(동의 55 %))',
    url: 'https://doi.org/10.1038/s41574-020-0357-5' },
  { id: 'yamagata2017bezoar', kind: 'case', year: 2017, access: 'pmc', fulltext: 'PMC5706413',
    citation: 'Yamagata Y, et al. Obstruction in the third portion of the duodenum due to a diospyrobezoar: a case report. BMC Surg. 2017;17(1):117. (조기 위암 원위부 위절제 15개월 후 감 위석 장폐색·수술 · 감의 시부올(탄닌)이 위액과 만나 섬유가 엉김 · 위절제가 위석 형성과 관련)',
    url: 'https://doi.org/10.1186/s12893-017-0308-9' },
  { id: 'lawrie2018cochrane', kind: 'meta', year: 2018, access: 'pmc', fulltext: 'PMC6491191',
    citation: 'Lawrie TA, et al. Interventions to reduce acute and late adverse gastrointestinal effects of pelvic radiotherapy for primary pelvic cancers. Cochrane Database Syst Rev. 2018;1(1):CD012529. (예방 중재 중 질 높은 근거 있는 것 없음 · 고섬유 식이 1편 108명: 1년 장 증상·삶의 질 개선, 낮은 확실성)',
    url: 'https://doi.org/10.1002/14651858.CD012529.pub2' },
  { id: 'jeong2016dexa', kind: 'cohort', year: 2016, access: 'pmc', fulltext: 'PMC5080830',
    citation: 'Jeong Y, et al. A Pilot Study Evaluating Steroid-Induced Diabetes after Antiemetic Dexamethasone Therapy in Chemotherapy-Treated Cancer Patients. Cancer Res Treat. 2016;48(4):1429-1437. (당뇨 없던 위장관암 77명 · 항암 3·6개월에 22.1 % 스테로이드 당뇨, 58.4 % 인슐린 저항 · 덱사메타손 누적 용량과 연관)',
    url: 'https://doi.org/10.4143/crt.2015.464' },
  /* 2026-10-14 전수 대조 — fix-C-fix.json 에서 더한 출처(원문 공개분만) */
  { id: 'suk2012dili', kind: 'review', year: 2012, access: 'pmc', fulltext: 'PMC3467427',
    citation: 'Suk KT, Kim DJ. Drug-induced liver injury: present and future. Clin Mol Hepatol. 2012;18(3):249-257. (국내 DILI 원인 — 한약 27.5 %·처방약 20.8 %·건강식품/건강기능식품 13.7 %·약초 9.4 %·민간요법 8.6 % · 달인 물(herbal decoction)이 가장 흔한 형태 · 생약 제품은 성분이 표준화되지 않음)',
    url: 'https://doi.org/10.3350/cmh.2012.18.3.249' },
  { id: 'schaefer2020lfd', kind: 'cohort', year: 2020, access: 'pmc', fulltext: 'PMC6993432',
    citation: 'Schaefer C, et al. Impact of a low FODMAP diet on the amount of rectal gas and rectal volume during radiotherapy in patients with prostate cancer – a prospective pilot study. Radiat Oncol. 2020;15:27. (전립선 방사선치료 25명 저FODMAP 대 과거 대조 25명 · 직장 가스 점수 4~5 비율 16 % 대 33 %, 직장 용적 64 대 71 cm³ 감소 · 환자 내 용적 변동 22 대 23 cm³ 차이 없음 · 이전 식이 시험 대부분 유의한 효과 없음 · 비무작위)',
    url: 'https://doi.org/10.1186/s13014-020-1474-y' },
  { id: 'hart2016t3c', kind: 'review', year: 2016, access: 'pmc', fulltext: 'PMC5495015',
    citation: 'Hart PA, et al. Type 3c (pancreatogenic) diabetes mellitus secondary to chronic pancreatitis and pancreatic cancer. Lancet Gastroenterol Hepatol. 2016;1(3):226-237. (인슐린 부족이 핵심 기전 · 만성 췌장염 당뇨 36명 중 인슐린 사용자 78 % 저혈당, 17 % 중증 · 췌장암 치료 후 혈당 호전 가능 — 혈당 자주 확인)',
    url: 'https://doi.org/10.1016/S2468-1253(16)30106-6' },
  { id: 'dominguez2025pei', kind: 'guideline', year: 2025, access: 'pmc', fulltext: 'PMC11866322',
    citation: 'Dominguez-Muñoz JE, et al. European guidelines for the diagnosis and treatment of pancreatic exocrine insufficiency: UEG, EPC, EDS, ESPEN, ESPGHAN, ESDO, and ESPCG evidence-based recommendations. United European Gastroenterol J. 2025;13(1):125-172. (전문판 · St 3.5 효소는 식사·간식과 함께 — 교차 시험 지방 소화 정상화 식전 50 %·식후 54 %·식사 중 63 % · St 3.7 반응 부족 시 복약 확인→증량/PPI→다른 질환 배제 · 적절한 효소면 대개 지방 제한 불필요, 소량 다회는 근거 부족 · St 6.1.1 췌장암의 약 70 % 에서 PEI · 지용성 비타민 결핍·추적 항목·PERT 가 비타민 D 흡수 개선 · 금주·금연 생활 관리 · St 10.9 PEI 와 3c형 당뇨는 같은 췌장 손상에서)',
    url: 'https://doi.org/10.1002/ueg2.12674' },
  { id: 'xue2026reflux', kind: 'meta', year: 2026, access: 'pmc', fulltext: 'PMC13326162',
    citation: 'Xue Z, et al. A systematic review and meta-analysis of the prevalence of reflux symptoms after esophagectomy: patient-reported outcomes and management. BMC Geriatr. 2026;26(1). (28편·5,276명 · 역류 증상 38 %(95 % CI 29~47 %) · 역류성 식도염 33 % · 수년 지속 가능 · 생활 상담을 기록한 연구 2편뿐)',
    url: 'https://doi.org/10.1186/s12877-026-07561-0' },
  { id: 'andreou2021', kind: 'meta', year: 2021, access: 'pmc', fulltext: 'PMC8655625',
    citation: 'Andreou L, Burrows T, Surjan Y. The effect of nutritional interventions involving dietary counselling on gastrointestinal toxicities in adults receiving pelvic radiotherapy – A systematic review. J Med Radiat Sci. 2021;68(4):453-464. (무작위 시험 11편(논문 12편) · 지방·섬유·유당·단백·FODMAP 조절 · 설사 감소 보고 3편, 결과 연구마다 다름)',
    url: 'https://doi.org/10.1002/jmrs.531' },
  /* 2026-10-14 전수 대조 — fix-A-fix.json 에서 더한 출처(원문 공개분만) */
  { id: 'nci-pdq-nutrition', kind: 'guideline', year: 2024, access: 'open', fulltext: 'https://www.cancer.gov/about-cancer/treatment/side-effects/appetite-loss/nutrition-hp-pdq',
    citation: 'PDQ® Supportive and Palliative Care Editorial Board. Nutrition in Cancer Care (PDQ®)–Health Professional Version. National Cancer Institute. Updated 2024-09-20. (Behavioral strategies for symptom management · 식욕부진: 식사 중 액체는 조금씩, 입맛이 가장 좋을 때 단백질 음식 먼저, 고형식을 못 먹으면 밀크셰이크·스무디·수프 · 오심: 담백·부드러운 음식, 강한 냄새 피하기, 너무 뜨겁거나 차지 않게, 아침 오심이면 일어나기 전 마른 토스트·크래커, 빈속이면 오심 악화 · 설사: 수분·스포츠음료, 나트륨·칼륨 음식(바나나·감자·맑은 국물), 저섬유, 피할 것: 고섬유·고당·기름지고 튀긴 음식·가스 유발·유제품(유당 뺀 것 제외)·매운 음식·카페인 · 변비: 물·따뜻한 음료·푸룬 주스, 섬유 음식, 섬유 보충제 고려 · 입 헐었을 때 피할 것: 감귤·매운 음식·토마토·케첩·짠 음식·생채소·날카롭고 바삭한 음식·술)',
    url: 'https://www.cancer.gov/about-cancer/treatment/side-effects/appetite-loss/nutrition-hp-pdq' },
  { id: 'ambrosone2020', kind: 'cohort', year: 2020, access: 'pmc', fulltext: 'PMC7062457',
    citation: 'Ambrosone CB, et al. Dietary Supplement Use During Chemotherapy and Survival Outcomes of Patients With Breast Cancer Enrolled in a Cooperative Group Clinical Trial (SWOG S0221). J Clin Oncol. 2020;38(8):804-814. (임상시험 S0221 부속 전향 연구 1,134명 · 치료 전과 중 모두 항산화 보충제(비타민 A·C·E, 카로티노이드, 코엔자임Q10) 사용 시 재발 adjHR 1.41(95 % CI 0.98~2.04, P=.06 — 재발 위험 41 % 높은 경향, 확정 아님) · 사망 adjHR 1.40(0.90~2.18))',
    url: 'https://doi.org/10.1200/JCO.19.01203' },
  { id: 'glim2019', kind: 'guideline', year: 2019, access: 'pmc', fulltext: 'PMC6438340',
    citation: 'Cederholm T, Jensen GL, et al. GLIM criteria for the diagnosis of malnutrition – A consensus report from the global clinical nutrition community. J Cachexia Sarcopenia Muscle. 2019;10(1):207-217. (영양불량 진단 = 표현형 기준 1개 이상 + 원인 기준 1개 이상 · 체중 감소: 6개월 안 5 % 초과 또는 6개월 넘어 10 % 초과 · 원인 기준의 염증/질병 부담에 암 포함)',
    url: 'https://doi.org/10.1002/jcsm.12383' },
  { id: 'rogaczewski2026b12', kind: 'review', year: 2026, access: 'pmc', fulltext: 'PMC13524985',
    citation: 'Rogaczewski P, et al. Oral vitamin B12 after total gastrectomy for gastric cancer: mapping the evidence. Gastric Cancer. 2026;29(5):920-929. (주제 범위 종설 · 7편·449명(경구 310명) · 대부분 메코발라민 하루 500~1,500 µg · 경구로 혈중 농도 정상화·증상 완화, 생화학 반응은 주사에 열등하지 않음 · 추적 대개 6개월 미만, 무작위배정 1편 · 전절제 후 내인자 없음 → 수동 확산만 남음)',
    url: 'https://doi.org/10.1007/s10120-026-01745-8' },
  { id: 'nccih-probiotics', kind: 'guideline', year: 2019, verified: '항암치료로 인한 설사: 2018 종설 12편 1,554명, 이로운 효과 근거 불충분 · 항생제 사용 중 C. difficile 설사 위험 감소는 중등도 확실 (이미 references.ts 에 있어 new_refs 대신 주석으로)', access: 'open', fulltext: 'https://www.nccih.nih.gov/health/probiotics-what-you-need-to-know',
    citation: 'National Center for Complementary and Integrative Health (NIH). Probiotics: What You Need To Know. Last updated August 2019. ("프로바이오틱스의 해로운 영향 위험은 중병이 있거나 면역이 약한 사람에서 더 크다" · 항생제와 함께 쓰는 것은 대체로 안전하나 매우 쇠약하거나 면역 기능이 낮은 환자는 예외)',
    url: 'https://www.nccih.nih.gov/health/probiotics-what-you-need-to-know' },
  { id: 'medlineplus-warfarin', kind: 'guideline', year: 2026, access: 'open', fulltext: 'https://medlineplus.gov/druginfo/meds/a682277.html',
    citation: 'U.S. National Library of Medicine. MedlinePlus Drug Information: Warfarin (a682277). Last revised 2026-03-15. ("비타민 K 가 든 음식을 주마다 일정한 양으로" · "비타민 K 가 많은 잎채소·식물성 기름을 많이 먹지 말 것" · 와파린은 피가 굳는 능력을 낮춤)',
    url: 'https://medlineplus.gov/druginfo/meds/a682277.html' },
  /* 2026-10-14 전수 대조 — fix-E-fix.json 에서 더한 출처(원문 공개분만) */
  { id: 'nccih-coq10', kind: 'db', year: 2019, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/coenzyme-q10',
    citation: 'National Center for Complementary and Integrative Health (NIH). Coenzyme Q10 (Last Updated January 2019). (암 치료에 가치가 입증되지 않음 · 일부 항암치료와 맞지 않을 수 있음)',
    url: 'https://www.nccih.nih.gov/health/coenzyme-q10' },
  { id: 'msk-coq10', kind: 'db', year: 2026, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/coenzyme-q10',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Coenzyme Q10. (2026-09-29 갱신 · 비타민 K 와 구조가 비슷해 와파린 효과를 약하게 할 수 있음 · 반대로 와파린 병용 출혈 증가 보고도 있음)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/coenzyme-q10' },
  { id: 'dobre2025bleeding', kind: 'review', year: 2025, access: 'pmc', fulltext: 'PMC12564107',
    citation: 'Dobre MZ, et al. Navigating the Effects of Anti-Atherosclerotic Supplements and Acknowledging Associated Bleeding Risks. Int J Mol Sci. 2025;26(20):10183. (서술 종설 · 코엔자임 Q10: 와파린 복용 24명 무작위 교차시험에서 INR 변화 없음, 그 밖의 보고는 INR 저하 · 은행잎: 와파린 병용 큰 출혈 증가(진료기록 약 807,399명), 재향군인 코호트 출혈 HR 1.38(1.20~1.58) · 미국삼 무작위시험에서 INR 저하, 고려인삼-DOAC 직접 자료 없음(이론상 노출 감소) · 생선기름+와파린 출혈 증례 1건 · 마늘은 와파린 복용자에서 전반적으로 안전)',
    url: 'https://doi.org/10.3390/ijms262010183' },
  { id: 'nccih-ginkgo', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/ginkgo',
    citation: 'National Center for Complementary and Integrative Health (NIH). Ginkgo (Last Updated February 2025). (와파린 등 항응고제 복용자에서 출혈 위험을 높일 수 있음)',
    url: 'https://www.nccih.nih.gov/health/ginkgo' },
  { id: 'efsa2026dha', kind: 'guideline', year: 2026, access: 'pmc', fulltext: 'PMC12802091',
    citation: 'EFSA Panel on Nutrition, Novel Foods and Food Allergens (NDA). Scientific opinion on the tolerable upper intake level for supplemental docosahexaenoic acid (DHA). EFSA J. 2026;24(1):e9858. (출혈 합병증 절: EPA+DHA 하루 약 5 g·최장 2년까지는 항혈소판·항혈전제 복용자를 포함해 자발 출혈·출혈 합병증 증가 없음 — EFSA 2012 결론 재인용)',
    url: 'https://doi.org/10.2903/j.efsa.2026.9858' },
  { id: 'msk-epo', kind: 'db', year: 2022, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/evening-primrose-oil',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Evening Primrose Oil. (2022-02-16 갱신 · 달맞이꽃 GLA 를 수개월 복용한 12명 중 9명에서 출혈 시간 유의 증가 · 암 환자 연구는 매우 제한적(간암 1건 효과 없음, 유방암 보조요법 1건))',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/evening-primrose-oil' },
  { id: 'nccih-epo', kind: 'db', year: 2024, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/evening-primrose-oil',
    citation: 'National Center for Complementary and Integrative Health (NIH). Evening Primrose Oil (Last Updated November 2024). (어떤 건강 상태에도 쓸 만한 근거가 충분하지 않음)',
    url: 'https://www.nccih.nih.gov/health/evening-primrose-oil' },
  { id: 'barton2013ginseng', kind: 'rct', year: 2013, access: 'pmc', fulltext: 'PMC3888141',
    citation: 'Barton DL, et al. Wisconsin Ginseng (Panax quinquefolius) to improve cancer-related fatigue: a randomized, double-blind trial, N07C2. J Natl Cancer Inst. 2013;105(16):1230-1238. (3상 · 40개 기관 364명 · 미국삼 2,000 mg/일 8주 · 1차 종점 4주 P=.07, 8주 P=.003 · 고려인삼(Panax ginseng)이 아님)',
    url: 'https://doi.org/10.1093/jnci/djt181' },
  { id: 'nccih-asian-ginseng', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/asian-ginseng',
    citation: 'National Center for Complementary and Integrative Health (NIH). Asian Ginseng (Last Updated February 2025). (혈액 응고에 영향을 줄 수 있음 · 혈당을 낮출 수 있음)',
    url: 'https://www.nccih.nih.gov/health/asian-ginseng' },
  { id: 'msk-asian-ginseng', kind: 'db', year: 2026, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/ginseng-asian',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Asian Ginseng. (2026-07-23 갱신 · 항응고제와의 상호작용 연구는 결과가 엇갈림 · 암 관련 피로 효과는 분명하지 않음)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/ginseng-asian' },
  { id: 'nccih-garlic', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/garlic',
    citation: 'National Center for Complementary and Integrative Health (NIH). Garlic (Last Updated February 2025). (마늘 보충제는 출혈 위험을 높일 수 있음 · 마늘 섭취가 위암 위험을 낮추지 않는 듯하고 대장암은 불확실)',
    url: 'https://www.nccih.nih.gov/health/garlic' },
  { id: 'msk-garlic', kind: 'db', year: 2022, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/garlic',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Garlic. (2022-11-18 갱신 · 와파린 항응고 작용을 강화할 수 있음(혈소판 응집 감소·섬유소 용해 증가))',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/garlic' },
  { id: 'nccih-black-cohosh', kind: 'db', year: 2024, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/black-cohosh',
    citation: 'National Center for Complementary and Integrative Health (NIH). Black Cohosh (Last Updated November 2024). (승마 표기 제품에서 간 손상 사례(드물고 일부 심함, 인과 불확실) · 유방암·자궁암 등 호르몬 민감 질환을 겪은 여성에서 안전성 불확실)',
    url: 'https://www.nccih.nih.gov/health/black-cohosh' },
  { id: 'msk-black-cohosh', kind: 'db', year: 2022, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/black-cohosh',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Black Cohosh. (2022-05-26 갱신 · 식물성 에스트로겐으로 작용하는지 불분명, LH·FSH·프로락틴·에스트라디올에 영향 없음 · 간 질환을 악화시킬 수 있음 · 유방암 안전성 불분명)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/black-cohosh' },
  { id: 'nccih-garcinia', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/garcinia-cambogia',
    citation: 'National Center for Complementary and Integrative Health (NIH). Garcinia Cambogia (Last Updated February 2025). (간 손상 사례 여러 건(일부 심함, 드묾) · 체중 감량 효과는 불분명)',
    url: 'https://www.nccih.nih.gov/health/garcinia-cambogia' },
  { id: 'mfds2025garcinia', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.mfds.go.kr/brd/m_99/view.do?seq=49356',
    citation: '식품의약품안전처. 보도자료 「가르시니아캄보지아 추출물 이상사례 해당 제품 회수」 2025년 9월 23일. (간 관련 이상사례 2건 · 해당 제품 회수 · 섭취 시 주의사항에 \'드물게 간에 해를 끼칠 수 있으며 섭취 기간 중 알코올 섭취를 피해야\' 추가 예정)',
    url: 'https://www.mfds.go.kr/brd/m_99/view.do?seq=49356' },
  { id: 'nccih-green-tea', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/green-tea',
    citation: 'National Center for Complementary and Integrative Health (NIH). Green Tea (Last Updated February 2025). (드물지만 주로 알약·캡슐형 녹차 추출물에서 간 손상 보고 · 카테킨·카페인의 체중 효과는 작음)',
    url: 'https://www.nccih.nih.gov/health/green-tea' },
  { id: 'efsa2018catechins', kind: 'guideline', year: 2018, access: 'pmc', fulltext: 'PMC7009618',
    citation: 'EFSA Panel on Food Additives and Nutrient Sources added to Food (ANS). Scientific opinion on the safety of green tea catechins. EFSA J. 2018;16(4):e05239. (보충제로 EGCG 하루 800 mg 이상에서 혈청 간수치 유의 상승 · 전통 방식으로 우린 녹차는 일반적으로 안전, 드문 간 손상)',
    url: 'https://doi.org/10.2903/j.efsa.2018.5239' },
  { id: 'msk-green-tea', kind: 'db', year: 2026, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/green-tea',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Green Tea. (2026-08-12 갱신 · EGCG 등 폴리페놀이 보르테조밉 등 보론산 계열 프로테아좀 억제제의 효과를 막을 수 있음(실험 근거) · 미국약전 권장 표시: 간 질환이 있으면 사용하지 말 것)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/green-tea' },
  { id: 'nccih-milk-thistle', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/milk-thistle',
    citation: 'National Center for Complementary and Integrative Health (NIH). Milk Thistle (Last Updated February 2025). (항암제로 인한 간 문제를 포함한 간 질환 임상 결과는 엇갈리거나 부족해 결론 불가)',
    url: 'https://www.nccih.nih.gov/health/milk-thistle' },
  { id: 'msk-milk-thistle', kind: 'db', year: 2026, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/milk-thistle',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Milk Thistle. (2026-07-22 갱신 · CYP3A4 억제 자료와 영향 없음 자료가 엇갈림 · 와파린 병용 INR 상승 증례)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/milk-thistle' },
  { id: 'kim2012hovenia', kind: 'case', year: 2012, access: 'open', fulltext: 'https://synapse.koreamed.org/upload/SynapseData/PDFData/1121pghn/pghn-15-111.pdf',
    citation: 'Kim YJ, et al. A pediatric case of toxic hepatitis induced by Hovenia dulcis. Pediatr Gastroenterol Hepatol Nutr. 2012;15(2):111-116. (증례 — 3세 남아, 헛개나무 달인 물 약 1년 · 서론에 국내 성인 독성 간염 2건 보고 언급 · 모두 달인 물)',
    url: 'https://doi.org/10.5223/pghn.2012.15.2.111' },
  { id: 'lim2012gastrectomy', kind: 'cohort', year: 2012, access: 'pmc', fulltext: 'PMC3496888',
    citation: 'Lim CH, et al. Anemia after gastrectomy for early gastric cancer: long-term follow-up observational study. World J Gastroenterol. 2012;18(42):6114-6119. (조기위암 위절제 161명 후향 추적 · 빈혈 3개월 24.5 % → 48개월 37.1 % · 48개월째 빈혈의 주원인은 철결핍)',
    url: 'https://doi.org/10.3748/wjg.v18.i42.6114' },
  { id: 'tolkien2015iron', kind: 'meta', year: 2015, access: 'pmc', fulltext: 'PMC4336293',
    citation: 'Tolkien Z, et al. Ferrous sulfate supplementation causes significant gastrointestinal side-effects in adults: a systematic review and meta-analysis. PLoS One. 2015;10(2):e0117383. (무작위 43편 6,831명 · 위약 대비 위장관 부작용 OR 2.32 · 변비 보고 27편 통합 발생률 12 %, 95 % CI 10~15 %)',
    url: 'https://doi.org/10.1371/journal.pone.0117383' },
  { id: 'msk-zinc', kind: 'db', year: 2022, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/zinc',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Zinc. (2022-05-25 갱신 · 방사선치료 중 미각 보존 효과는 결과가 엇갈림 · 하루 100~300 mg 고용량은 구리 결핍 등 만성 독성)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/zinc' },
  { id: 'msk-lutein', kind: 'db', year: 2022, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/lutein',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Lutein. (2022-11-16 갱신 · 부작용 보고 없음 · 약물 상호작용 항목 없음)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/lutein' },
  { id: 'nccih-glucosamine', kind: 'db', year: 2023, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/glucosamine-and-chondroitin-for-osteoarthritis',
    citation: 'National Center for Complementary and Integrative Health (NIH). Glucosamine and Chondroitin for Osteoarthritis (Last Updated October 2023). (일부에서 혈당 상승 · 와파린 복용자에서 출혈 위험 증가와 관련)',
    url: 'https://www.nccih.nih.gov/health/glucosamine-and-chondroitin-for-osteoarthritis' },
  { id: 'msk-glucosamine', kind: 'db', year: 2026, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/glucosamine',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Glucosamine. (2026-09-30 갱신 · 글루코사민·콘드로이친이 와파린 효과를 키워 INR 상승 가능 · 조절이 안 되는 당뇨·내당능장애는 혈당 관찰)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/glucosamine' },
  { id: 'msk-collagen', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/collagen',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Collagen. (2025-05-09 갱신 · 가수분해 콜라겐 펩타이드는 장에서 흡수 · 피부 보호 효과는 결론 없음 · 부작용 보고 없음)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/collagen' },
  { id: 'msk-propolis', kind: 'db', year: 2022, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/propolis',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Propolis. (2022-07-06 갱신 · 항암치료 구강점막염 효과는 아직 불분명 · 벌독·꿀·돼지풀·국화 알레르기는 피할 것)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/propolis' },
  { id: 'rzeski2026algae', kind: 'review', year: 2026, access: 'pmc', fulltext: 'PMC13209791',
    citation: 'Rzeski W, Rzeska W. Chlorella and Arthrospira (Spirulina) as multi-pathway biological response modulators: molecular mechanisms, signaling pathways and clinical evidence. Molecules. 2026;31(10):1595. (서술 종설 · 비타민 K 함량으로 항응고제 상호작용 가능 · 주된 안전 문제는 중금속·남조류 독소 오염)',
    url: 'https://doi.org/10.3390/molecules31101595' },
  { id: 'msk-blue-green-algae', kind: 'db', year: 2023, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/blue-green-algae',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Blue-Green Algae. (2023-06-05 갱신 · 독성 조류(Microcystis 등)에 오염될 수 있음)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/blue-green-algae' },
  { id: 'camus2013', kind: 'rct', year: 2013, access: 'pmc', fulltext: 'PMC3979451',
    citation: 'Andriole GL, et al. The effect of increasing doses of saw palmetto fruit extract on serum prostate specific antigen: analysis of the CAMUS randomized trial. J Urol. 2013;189(2):486-492. (369명 · 72주 · 320→640→960 mg 증량 · PSA 변화 위약 0.16 vs 쏘팔메토 0.23 ng/ml, p=0.50 — 고용량에서도 PSA 영향 없음)',
    url: 'https://doi.org/10.1016/j.juro.2012.09.037' },
  { id: 'nccih-saw-palmetto', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/saw-palmetto',
    citation: 'National Center for Complementary and Integrative Health (NIH). Saw Palmetto (Last Updated April 2025). (2023 종설 27편: 단독으로는 전립선비대 증상 개선이 거의 없음 · 고용량에서도 PSA 수치에 영향 없음)',
    url: 'https://www.nccih.nih.gov/health/saw-palmetto' },
  { id: 'nccih-turmeric', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/turmeric',
    citation: 'National Center for Complementary and Integrative Health (NIH). Turmeric (Last Updated April 2025). (경구 강황·커큐민이 여러 건강 상태에 이로운지 결론 내릴 근거 부족 · 흡수 강화 제형에서 간 손상 보고)',
    url: 'https://www.nccih.nih.gov/health/turmeric' },
  { id: 'smith2019turmeric', kind: 'case', year: 2019, access: 'pmc', fulltext: 'PMC6414192',
    citation: 'Smith TJ, Ashar BH. Iron deficiency anemia due to high-dose turmeric. Cureus. 2019;11(1):e3858. (증례 — 66세, 강황 추출물 538 mg 캡슐 하루 6개 복용 중 철결핍성 빈혈, 중단 2주 뒤 회복 · 동물에서 장내 철 결합)',
    url: 'https://doi.org/10.7759/cureus.3858' },
  { id: 'nccih-aloe', kind: 'db', year: 2025, access: 'open', fulltext: 'https://www.nccih.nih.gov/health/aloe-vera',
    citation: 'National Center for Complementary and Integrative Health (NIH). Aloe Vera (Last Updated February 2025). (알로에 라텍스 경구 복용은 복통·경련·설사 · 알로에 겔은 42일까지 단기 복용 안전)',
    url: 'https://www.nccih.nih.gov/health/aloe-vera' },
  { id: 'msk-aloe', kind: 'db', year: 2026, access: 'open', fulltext: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/aloe-vera',
    citation: 'Memorial Sloan Kettering Cancer Center. About Herbs: Aloe Vera. (2026-10-02 갱신 · 알로에 겔은 안트라퀴논(완하 성분)이 든 알로에 주스·라텍스와 구별)',
    url: 'https://www.mskcc.org/cancer-care/integrative-medicine/herbs/aloe-vera' },
  /* 2026-10-14 전수 대조 — fix-G-apply.json 에서 더한 출처(원문 공개분만) */
  { id: 'ma2022-neutropenic-diet', kind: 'meta', year: 2022, access: 'pmc', fulltext: 'PMC8959862',
    citation: 'Ma Y, Lu X, Liu H. Neutropenic diet cannot reduce the risk of infection and mortality in oncology patients with neutropenia. Front Oncol. 2022;12:836371. (6편(무작위 방법 4편·환자-대조군 1편 포함)·1,114명 · 감염 RR 1.13, 95 % CI 0.97~1.31 · 사망 RR 1.06, 95 % CI 0.76~1.48 · 소아·성인 하위군 모두 차이 없음)',
    url: 'https://doi.org/10.3389/fonc.2022.836371' },
  { id: 'pedretti2024-nd-peds', kind: 'review', year: 2024, access: 'pmc', fulltext: 'PMC11013746',
    citation: 'Pedretti L, Leardini D, Muratore E, et al. Managing the risk of foodborne infections in pediatric patients with cancer: is the neutropenic diet still an option? Nutrients. 2024;16(7):966. (Trifilio 2012 2차 인용: 조혈모세포이식 성인 726명 후향 비교, 일반식 군에서 미생물학적 확진 감염이 유의하게 적음(p<0.027) · 일반식도 날고기·생선·비살균 유제품은 제외)',
    url: 'https://doi.org/10.3390/nu16070966' },
  { id: 'meliante2023-hnc-antiox', kind: 'review', year: 2023, access: 'pmc', fulltext: 'PMC10525582',
    citation: 'Meliante PG, Petrella C, Fiore M, Minni A, Barbato C. Antioxidant use after diagnosis of head and neck squamous cell carcinoma (HNSCC): a systematic review of application during radiotherapy and in second primary cancer prevention. Antioxidants (Basel). 2023;12(9):1753. (Bairati 2005 JNCI 2차 인용: 540명, α-토코페롤 400 IU·β-카로틴 30 mg 을 방사선치료 첫날부터 종료 후 3년까지, β-카로틴은 156명 뒤 중단 · 보충 중 이차암 HR 2.42(95 % CI 1.45~4.04), α-토코페롤 단독 시기 HR 2.88(95 % CI 1.56~5.31, 약 2.9배) · 보충 중단 후 HR 0.41(95 % CI 0.16~1.03) · Meyer 2008: 흡연자에서만 재발 HR 2.41·전체 사망 2.26·두경부암 사망 3.38, 비흡연자는 1에 가까움 · 흡연+α-토코페롤이 방사선치료 작용을 방해했을 가설)',
    url: 'https://doi.org/10.3390/antiox12091753' },
  { id: 'nguyen2018-hnc-integrative', kind: 'review', year: 2018, access: 'pmc', fulltext: 'PMC6209621',
    citation: 'Nguyen CT, Taw MB, Wang MB. Integrative care of the patient with head and neck cancer. Laryngoscope Investig Otolaryngol. 2018;3(5):364-371. (Bairati 2005 JNCI 2차 인용: 540명, 방사선치료 첫날부터 α-토코페롤 400 IU, 위약 대비 보충 기간 중 이차암 HR 2.88(95 % CI 1.56~5.31, 약 2.9배), 보충 중단 후 HR 0.41(95 % CI 0.16~1.03))',
    url: 'https://doi.org/10.1002/lio2.184' },
  { id: 'verro2025-hnc-cam', kind: 'review', year: 2025, access: 'pmc', fulltext: 'PMC12026399',
    citation: 'Verro B, Fiumara S, Saraniti G, Ottoveggio G, Saraniti C. Beyond conventional treatments: the role of complementary therapies in head and neck cancer. Cancers (Basel). 2025;17(8):1269. (Bairati 2005 JCO 2차 인용: 540명, 베타카로틴 30 mg·비타민 E 400 IU 를 방사선치료 중과 이후 3년, 방사선치료 부작용 감소(후두 OR 0.38), 국소 재발 HR 1.37 — 원 초록상 95 % CI 0.93~2.02 로 유의하지 않은 경향)',
    url: 'https://doi.org/10.3390/cancers17081269' },
  { id: 'tan2024-ugi-micro', kind: 'review', year: 2024, access: 'pmc', fulltext: 'PMC12989006',
    citation: 'Tan SYC, Tsoukalas T, Javier K, et al. Recommendations on the surveillance and supplementation of vitamins and minerals for upper gastrointestinal cancer survivors: a scoping review. J Cancer Surviv. 2026;20(2):506-521 (온라인 2024). (Bahardoust 2024 메타분석 2차 인용: 위암 위절제 2,627명, 전절제 후 거의 두 명 중 한 명(48.8 %) B12 결핍)',
    url: 'https://doi.org/10.1007/s11764-024-01666-4' },
  { id: 'osmola2025-b12-cancer', kind: 'review', year: 2025, access: 'pmc', fulltext: 'PMC12566637',
    citation: 'Osmola M, Tyszka M, Jirka A, et al. Vitamin B12 in cancer patients: clinical insights into deficiency, excess, diagnosis, and management. Nutrients. 2025;17(20):3272. (내인자는 위 벽세포에서 생성, 위절제 후 내인자 없음 · 내인자 없이 약 1 % 수동 흡수 · 위절제 후 B12 결핍 48.8 %(메타분석 2차 인용) · 전절제 후 누적 100 %·중앙 15개월, 아전절제 4년 15.7 % · 치료가 늦으면 되돌리기 어려운 신경 손상 · 위절제 후 평생 보충)',
    url: 'https://doi.org/10.3390/nu17203272' },
  { id: 'porter2016-bvit', kind: 'review', year: 2016, access: 'pmc', fulltext: 'PMC5133110',
    citation: 'Porter K, Hoey L, Hughes CF, Ward M, McNulty H. Causes, consequences and public health implications of low B-vitamin status in ageing. Nutrients. 2016;8(11):725. (Lam 2013 2차 인용: 미국 지역사회 환자 25,956명·대조 184,199명, H2RA·PPI 를 2년 넘게 쓰면 이후 B12 결핍 진단 위험 25~65 % 증가)',
    url: 'https://doi.org/10.3390/nu8110725' },
  { id: 'miller2018ppi-b12', kind: 'review', year: 2018, access: 'pmc', fulltext: 'PMC6054240',
    citation: 'Miller JW. Proton pump inhibitors, H2-receptor antagonists, metformin, and vitamin B-12 deficiency: clinical implications. Adv Nutr. 2018;9(4):511S-518S. (위산·펩신이 음식 단백질에서 B12 를 떼어 냄 · 보충제 B12 는 단백질 결합이 아니어서 위산 없이 흡수 · 사용 2년 미만에서 연관이 더 약함, 장기 사용 시 위험 증가 가설과 일치하나 확정적이지 않음)',
    url: 'https://doi.org/10.1093/advances/nmy023' },
  { id: 'jia2013-bortezomib-green', kind: 'review', year: 2013, access: 'pmc', fulltext: 'PMC3860349',
    citation: 'Jia L, Liu FT. Why bortezomib cannot go with \'green\'? Cancer Biol Med. 2013;10(4):206-213. (Golden 2009 2차 인용: EGCG 10 µM 이 보르테조밉 10 nM 의 세포사멸을 완전 차단, 보론산 계열에만 선택적, 누드마우스 실험, NMR 로 공유결합 확인 · 식이 플라보노이드는 보르테조밉 중 피하는 편이 낫다는 결론 · 반대 결과 Bannerman 2011 요약: 사람 보충제 수준 농도에서는 길항 없음, 식사로 마시는 녹차는 피할 필요 없음)',
    url: 'https://doi.org/10.7497/j.issn.2095-3941.2013.04.004' },
  { id: 'althiab2021-cape-warf', kind: 'case', year: 2022, access: 'pmc', fulltext: 'PMC8842720',
    citation: 'Althiab K, Aljohani M, Alraddadi S, Algarni M. Capecitabine and warfarin interaction: a case report with review of literature and management options. Front Cardiovasc Med. 2022;8:707361. (Copur 2001 두 증례 포함 6건 표: 병용 1~8주 뒤 INR 10 초과, 질-직장 출혈·흑색변·쇼크 동반 위장관 출혈)',
    url: 'https://doi.org/10.3389/fcvm.2021.707361' },
  { id: 'tan2014-panc-cachexia', kind: 'review', year: 2014, access: 'pmc', fulltext: 'PMC3939686',
    citation: 'Tan CR, Yaffee PM, Jamil LH, et al. Pancreatic cancer cachexia: a review of mechanisms and therapeutics. Front Physiol. 2014;5:88. (Fearon 2011 국제 합의 진단 기준 2차 인용·표 1: 최근 6개월 체중 감소 5 % 초과, 또는 BMI 20 미만에서 2 % 초과, 또는 근감소가 있으면서 2 % 초과)',
    url: 'https://doi.org/10.3389/fphys.2014.00088' },
  { id: 'esmo2021-cachexia', kind: 'guideline', year: 2021, access: 'pmc', fulltext: 'PMC8233663',
    citation: 'Arends J, Strasser F, Gonella S, et al. Cancer cachexia in adult patients: ESMO Clinical Practice Guidelines. ESMO Open. 2021;6(3):100092. (지방은 열량 밀도가 높아 적은 부피로 공급 가능, 염증·인슐린 저항성에서 탄수화물 이용 저하 · 악액질에서는 비단백 열량의 절반을 지방으로 [II, B])',
    url: 'https://doi.org/10.1016/j.esmoop.2021.100092' },
  { id: 'shida2026-challenge', kind: 'review', year: 2026, access: 'pmc', fulltext: 'PMC13565172',
    citation: 'Shida D, Bruera E, Licht T, et al. Exercise as a disease-modifying therapy in colon cancer: practice-changing evidence from the CHALLENGE trial. Cancers (Basel). 2026;18(17):2883. (CHALLENGE 2차 인용: 절제된 3기·고위험 2기 결장암 889명, 보조항암 후 2~6개월, 구조화 운동 3년 대 건강교육 · 중앙 추적 7.9년 DFS HR 0.72(95 % CI 0.55~0.94), 5년 DFS 80.3 % 대 73.9 % · 목표는 기저 대비 주당 10 MET-시간 이상 증가 ≈ 빠르게 걷기 45~60분 주 3~4회)',
    url: 'https://doi.org/10.3390/cancers18172883' },
  { id: 'courneya2026-challenge-tpb', kind: 'rct', year: 2026, access: 'pmc', fulltext: 'PMC13247338',
    citation: 'Courneya KS, Booth CM, Vardy JL, et al. Effects of a structured exercise program on motivational outcomes in patients with colon cancer. J Natl Cancer Inst. 2026;118(6):1054-1062. (CHALLENGE 2차 분석: 공인 운동 전문가 3년 지원 · 목표는 처음 6개월 기저 대비 주당 10 MET-시간 이상 증가, 이후 최대 약 30 MET-시간/주 · 빠르게 걷기 ≈4~5 MET)',
    url: 'https://doi.org/10.1093/jnci/djag023' },
  { id: 'shao2022-adt-exercise', kind: 'meta', year: 2022, access: 'pmc', fulltext: 'PMC8846498',
    citation: 'Shao W, Zhang H, Qi H, Zhang Y. The effects of exercise on body composition of prostate cancer patients receiving androgen deprivation therapy: an update systematic review and meta-analysis. PLoS One. 2022;17(2):e0263918. (RCT 12편·715명: 운동이 제지방량(MD 0.88 kg)·체지방량·체지방률 개선, 국소·전신 골밀도는 유의한 효과 없음 · 저항운동이 제지방량에 가장 효과적 · Galvão 2010(12주 유산소+저항 주 2회, 뼈 전이 없는 남성) 포함)',
    url: 'https://doi.org/10.1371/journal.pone.0263918' },
  { id: 'carvalho2012-cochrane-shoulder', kind: 'meta', year: 2012, access: 'pmc', fulltext: 'PMC11537249',
    citation: 'Carvalho AP, Vital FM, Soares BG. Exercise interventions for shoulder dysfunction in patients treated for head and neck cancer. Cochrane Database Syst Rev. 2012;(4):CD008693. (경부 곽청술 후 어깨 처짐·날개 견갑·으쓱 불가·통증 · 점진적 저항운동 RCT 2편 69명 합산: SPADI 통증 MD −6.26(95 % CI −12.20~−0.31), 장애 MD −8.48(−15.07~−1.88), 삶의 질 차이 없음, 효과 작음 · 12주·주 3회 · 수술 직후 시작의 효과는 불확실)',
    url: 'https://doi.org/10.1002/14651858.CD008693.pub2' },
  { id: 'sjw-interaction', kind: 'rct', year: 2002, access: 'open',
    citation: 'Mathijssen RH, et al. Effects of St. John\'s wort on irinotecan metabolism. J Natl Cancer Inst. 2002;94(16):1247-1249. (환자 5명 무작위배정 교차설계 · SN-38 농도 42 % 감소, 95 % CI 14~70 %)',
    url: 'https://doi.org/10.1093/jnci/94.16.1247' },
  /* ACCP 항응고 치료 지침이다 — 'review' 가 아니라 'guideline' 이 맞다 */
  /*
   * 전문 대조. 이 지침은 비타민 K 길항제(와파린) 관리 지침이다 —
   * omega·fish oil·ginseng 은 전문에 0건이고, DOAC 은 다루지 않는다.
   * 반면 보완요법 표에는 코엔자임Q10(오즈비 3.69)과 생강(3.20)이 출혈 위험 증가로 올라 있다.
   */
  { id: 'warfarin-vitk', kind: 'guideline', year: 2012, verified: '표 8 보완요법: 코엔자임Q10 오즈비 3.69(95 % CI 1.88~7.24, 약 3.7배) · 생강 오즈비 3.20(95 % CI 2.42~4.24, 약 3.2배) — Shalansky 2007 · 본문 3.8: \'these also require confirmation\' · 3.4: 비타민 K 보충은 일상적으로 쓰지 말 것(2C)', access: 'pmc', fulltext: 'PMC3278055',
    url: 'https://doi.org/10.1378/chest.11-2295',
    citation:
      'Holbrook A, et al. Evidence-based management of anticoagulant therapy: Antithrombotic Therapy and Prevention of Thrombosis, 9th ed: ACCP Evidence-Based Clinical Practice Guidelines. ' +
      'Chest. 2012;141(2 Suppl):e152S-e184S. — 비타민 K 섭취 일관성·병용 주의.' },

  // ── 증상 관리 ────────────────────────────────────────────────
  { id: 'ryan2012ginger', kind: 'rct', year: 2012, verified: '744명 무작위·576명 분석 · 위약/생강 0.5·1.0·1.5 g/일, 항암 3일 전부터 6일 · 1일째 급성 오심 감소 P=0.003 · 0.5·1.0 g 에서 감소 가장 큼 · 1캡슐 = 생강 뿌리 250 mg 상당(진저롤 등 8.5 mg) · 와파린·헤파린 치료 중인 환자는 제외', access: 'pmc', fulltext: 'PMC3361530',
    citation: 'Ryan JL, et al. Ginger (Zingiber officinale) reduces acute chemotherapy-induced nausea: a URCC CCOP study of 576 patients. Support Care Cancer. 2012;20(7):1479-1489.',
    url: 'https://doi.org/10.1007/s00520-011-1236-3' },
  /*
   * 전문을 받아 대조했다. 이 지침은 '무엇을 쓸 것인가'(구강 냉각·광생체조절·벤지다민 등)를 다루지
   * '무엇을 먹을 것인가'를 다루지 않는다 — 전문에 spicy·acidic·citrus·food·texture·soft·
   * temperature·caffeine·alcohol 이 모두 0건이다. 식이 중재(지방조절식·섬유)는 검토했으나
   * "근거가 불충분하거나 상충되어 권고를 낼 수 없었다"고 적는다.
   * 그러므로 이 출처는 '통증 조절과 식이 지원이 핵심' 이라는 틀과 구강 냉각에만 붙일 수 있다.
   */
  { id: 'mascc-mucositis', kind: 'guideline', year: 2020, verified: '볼루스 5-FU 투여 중 30분 구강 냉각(권고) · 고용량 멜팔란 전처치 자가조혈모세포이식에서 구강 냉각(권고) · \'통증 조절·식이 지원·이차 감염 예방이 관리의 핵심\' · 맵고 신 음식 회피는 다루지 않음(spicy·acidic 0건) · Table 3: 골반 방사선(항암)치료 설사 예방에 락토바실러스 함유 프로바이오틱스 제안(LoE III) · 천연물·생약은 지침을 만들기에 근거 불충분', access: 'pmc', fulltext: 'PMC7540329',
    url: 'https://doi.org/10.1002/cncr.33100',
    citation: 'Elad S, et al. MASCC/ISOO clinical practice guidelines for the management of mucositis secondary to cancer therapy. Cancer. 2020;126(19):4423-4431.' },
  /*
   * IDDSI 는 두 문서로 되어 있다 — 단계 정의(Detailed Definitions)와 확인법(Testing Methods).
   * 앱이 적은 수치(0~7의 8단계, 어른 1.5 cm·4 mm, 10 mL 주사기 10초)는 두 문서를 내려받아 대조했다.
   * CC BY-SA 4.0 문서라 표를 그대로 옮기지 않고 사실만 우리 문장으로 적는다.
   */
  { id: 'iddsi', kind: 'guideline', year: 2026, verified: '어른 조각 1.5 cm(15 mm) · 다진 단계 폭 4 mm(포크 살 간격) · 씹기 쉬운 단계도 단단·질김·섬유질·바삭·씨앗 제외, 끈적한 것 피함, 액체가 음식과 분리되지 않게, 마른 빵 제외 (IDDSI 2.2, 2026) · Level 6 어른 한 조각 1.5 cm × 1.5 cm 이하 · Level 5 다진 것 4 mm · 엄지손톱이 하얘질 만큼의 포크 압력 · 마른 빵·토스트·샌드위치 불가 · 혼합 질감(건더기 든 국 등) 주의', access: 'open',
    url: 'https://iddsi.org/framework/',
    citation:
      'International Dysphagia Diet Standardisation Initiative. Complete IDDSI Framework: Detailed Definitions 2.2 (2026) · Testing Methods 2.0 (2019). ' +
      '원 논문 Cichero JAY, et al. Dysphagia. 2017;32:293-314. — 연하곤란 식이의 점도·질감 국제 표준(0~7의 8단계).' },
  /*
   * 악액질 진단 기준의 실제 출처. ESPEN 두 판(2017 전체·2021 축약) 전문을 다 훑어도
   * '5 % / 6개월' 기준은 나오지 않는다 — 그것은 이 국제 합의문의 정의다.
   */
  /*
   * 췌장 외분비기능부전의 유럽 지침. 췌장암에서의 PEI 관리를 따로 다룬다.
   * 그동안 이 대목에 ESPEN 암 영양 지침을 달아 두었는데, 그 문서에는 췌장 효소도
   * 식사 분할도 나오지 않는다(전문 검색으로 확인).
   */
  /*
   * 유방암 알코올의 '10 g 당 몇 %' 는 IARC·WCRF 가 아니라 이 집단 재분석의 숫자다.
   * 53편·유방암 58,515명·대조 95,067명을 한자리에 모아 다시 분석한 것으로,
   * 이 분야에서 그 수치의 출처다.
   */
  { id: 'hamajima2002', kind: 'meta', year: 2002, verified: '유방암 58,515명·대조 95,067명(약 15만 명) · 흡연자·비흡연자에서 같은 7.1 % · 10 g = 한 잔(1 unit)', access: 'pmc', fulltext: 'PMC2562507',
    citation: 'Collaborative Group on Hormonal Factors in Breast Cancer (Hamajima N, et al). Alcohol, tobacco and breast cancer — collaborative reanalysis of individual data from 53 epidemiological studies. Br J Cancer. 2002;87(11):1234-1245. (하루 10 g 당 상대위험 7.1 % 증가, 95 % CI 5.5~8.7)',
    url: 'https://doi.org/10.1038/sj.bjc.6600596' },
  { id: 'brooks2009aldh2', kind: 'review', year: 2009, verified: '흡연은 음주와 상승적(synergistic)으로 식도암 위험을 높임 · 53 % 는 일본 남성 인구의 인구기여위험 추정', access: 'pmc', fulltext: 'PMC2659709',
    citation: 'Brooks PJ, et al. The alcohol flushing response: an unrecognized risk factor for esophageal cancer from alcohol consumption. PLoS Med. 2009;6(3):e50. (동아시아인 약 36 % · 이형접합자 오즈비 3.7~18.1 · 음주를 줄이면 일본 남성 식도편평세포암의 53 % 예방 가능 추정)',
    url: 'https://doi.org/10.1371/journal.pmed.1000050' },
  /*
   * 장루 식이 조언은 임상에서 널리 쓰이지만 근거가 얇다.
   * 그 사실 자체를 정리한 문헌이 있어, 조언과 함께 그 한계도 같이 인용한다.
   */
  { id: 'ileostomy-diet-review', kind: 'review', year: 2021, access: 'open',
    url: 'https://doi.org/10.11124/JBIES-20-00377',
    citation:
      'Mitchell A, et al. Dietary management for people with an ileostomy: a scoping review. JBI Evid Synth. 2021;19(9):2188-2306. ' +
      '— "장루 식이 조언은 흔히 제공되지만 서로 엇갈리고 불충분하며, 질 높은 연구가 부족하다"' },
  { id: 'eras-colorectal', kind: 'guideline', year: 2019, access: 'open',
    citation:
      'Gustafsson UO, et al. Guidelines for Perioperative Care in Elective Colorectal Surgery: ERAS Society Recommendations 2018. World J Surg. 2019;43(3):659-695. ' +
      '— "대부분의 환자는 수술 당일부터 음식과 경구영양보충을 시작해야 한다"(강한 권고)',
    url: 'https://doi.org/10.1007/s00268-018-4844-y' },
  { id: 'ueg-pei2025', kind: 'guideline', year: 2025, verified: '같은 지침의 전문판은 Dominguez-Muñoz 2025 UEG J (PMC11866322, new_refs dominguez2025pei) — 이 요약판으로는 해설 수치를 대조할 수 없다', access: 'open',
    citation: 'Vujasinovic M, et al. Recommendations from the European guidelines for the diagnosis and therapy of pancreatic exocrine insufficiency. Pancreatology. 2025;25(3):293-300.',
    url: 'https://doi.org/10.1016/j.pan.2025.02.015' },
  /* 'fearon2011' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  /*
   * 전문 대조. 단백질(1 g 초과·1.5 까지·STRONG), 오메가-3(WEAK·근거 낮음),
   * EFSA 안전 용량(EPA+DHA 5 g/일, EPA 단독 1.8 g/일)이 모두 여기에 있다.
   */
  { id: 'espen-cachexia', kind: 'guideline', year: 2017, verified: 'EFSA: EPA+DHA 하루 5 g, EPA 단독 1.8 g 까지 성인 안전 · 섭취 부족 정의 <60 % 가 1~2주 · 근육량이 기준 미만이면 사망·수술 합병증·전신치료의 용량 제한 독성과 강하게 연관 · C2-5 해설: 프로바이오틱스는 면역저하 환자에 권하기 전에 안전성이 확인되어야 함', access: 'open',
    url: 'https://doi.org/10.1016/j.clnu.2016.07.015',
    citation: 'Arends J, et al. ESPEN guidelines on nutrition in cancer patients. Clin Nutr. 2017;36(1):11-48. — ESPEN 암 영양 지침 전체판(2021 은 축약본).' }
]

/** 식이 문헌과 운동 문헌을 함께 조회할 수 있게 합친다 */
export const ALL_REFERENCES: Reference[] = [...REFERENCES, ...EXERCISE_REFERENCES]

export const REF_BY_ID: Record<string, Reference> = Object.fromEntries(
  ALL_REFERENCES.map((r) => [r.id, r])
)
