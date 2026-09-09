import type { Reference } from './types'
import { EXERCISE_REFERENCES } from './references-exercise'

/**
 * 이 앱의 모든 임상 권고는 아래 문헌 중 하나 이상에 연결되어 있다.
 * 근거가 없는 권고는 넣지 않으며, 근거가 엇갈리는 주제는 그 사실 자체를 표시한다.
 */
export const REFERENCES: Reference[] = [
  // ── 종합 가이드라인 ────────────────────────────────────────────
  { id: 'wcrf2018', kind: 'guideline', year: 2018,
    citation: 'World Cancer Research Fund / American Institute for Cancer Research. Diet, Nutrition, Physical Activity and Cancer: a Global Perspective. Continuous Update Project Expert Report 2018.',
    url: 'https://www.wcrf.org/diet-activity-and-cancer/' },
  { id: 'espen2021', kind: 'guideline', year: 2021,
    citation: 'Muscaritoli M, et al. ESPEN practical guideline: Clinical Nutrition in cancer. Clin Nutr. 2021;40(5):2898-2913.',
    url: 'https://doi.org/10.1016/j.clnu.2021.02.005' },
  { id: 'asco2022', kind: 'guideline', year: 2022,
    citation: 'Ligibel JA, et al. Exercise, Diet, and Weight Management During Cancer Treatment: ASCO Guideline. J Clin Oncol. 2022;40(22):2491-2507.',
    url: 'https://doi.org/10.1200/JCO.22.00687' },
  /* 전문 공개(Open Access). 표3 '무엇이 연결되고 무엇이 아직 아닌가' 를 규칙마다 대조했다. */
  { id: 'acs2022', kind: 'guideline', year: 2022,
    citation: 'Rock CL, et al. American Cancer Society nutrition and physical activity guideline for cancer survivors. CA Cancer J Clin. 2022;72(3):230-262.',
    url: 'https://doi.org/10.3322/caac.21719' },
  { id: 'nccn-survivorship', kind: 'guideline', year: 2024,
    citation: 'NCCN Clinical Practice Guidelines in Oncology: Survivorship. National Comprehensive Cancer Network.' },
  { id: 'acr-giop', kind: 'guideline', year: 2023,
    citation: 'Humphrey MB, et al. 2022 ACR Guideline for the Prevention and Treatment of Glucocorticoid-Induced Osteoporosis. Arthritis Rheumatol. 2023;75(12):2088-2102.',
    url: 'https://doi.org/10.1002/art.42646' },
  { id: 'fda-ppi-mg', kind: 'guideline', year: 2011,
    citation: 'U.S. Food and Drug Administration. Drug Safety Communication: Low magnesium levels can be associated with long-term use of proton pump inhibitor drugs (PPIs). 2011.',
    url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-low-magnesium-levels-can-be-associated-long-term-use-proton-pump' },
  { id: 'lam2013ppi-b12', kind: 'cohort', year: 2013,
    citation: 'Lam JR, et al. Proton pump inhibitor and histamine 2 receptor antagonist use and vitamin B12 deficiency. JAMA. 2013;310(22):2435-2442.',
    url: 'https://doi.org/10.1001/jama.2013.280490' },
  { id: 'nice-refeeding', kind: 'guideline', year: 2017,
    citation: 'National Institute for Health and Care Excellence. Nutrition support for adults (CG32) — refeeding problems. 2006, updated 2017.',
    url: 'https://www.nice.org.uk/guidance/cg32' },
  { id: 'nightingale2020stoma', kind: 'review', year: 2020,
    citation: 'Nightingale JMD. How to manage a high-output stoma. Frontline Gastroenterol. 2022;13(2):140-151.',
    url: 'https://doi.org/10.1136/flgastro-2018-101108' },
  { id: 'lyckholm2012zinc', kind: 'rct', year: 2012,
    citation: 'Lyckholm L, et al. A randomized, placebo controlled trial of oral zinc for chemotherapy-related taste and smell disorders. J Pain Palliat Care Pharmacother. 2012;26(2):111-114.',
    url: 'https://doi.org/10.3109/15360288.2012.676618' },
  { id: 'kdoqi2020', kind: 'guideline', year: 2020,
    citation: 'Ikizler TA, et al. KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update. Am J Kidney Dis. 2020;76(3 Suppl 1):S1-S107.',
    url: 'https://doi.org/10.1053/j.ajkd.2020.05.006' },
  /*
   * 골 소실 관리에 쓰는 1,000~1,200 mg·800 IU 는 KDRI 의 숫자가 아니다.
   * KDRI 성인 기준은 칼슘 700~800 mg, 비타민 D 10~15 µg(400~600 IU) 이고,
   * 질병관리청도 "골다공증 치료를 위해서는 더 많은 양을" 이라고 따로 적는다.
   * 두 숫자를 섞어 쓰면 어느 쪽도 못 믿게 되므로 출처를 나눈다.
   */
  { id: 'kdca-bone', kind: 'guideline', year: 2023,
    citation: '질병관리청. 골다공증 예방관리 보도자료 — 우리나라 성인의 1일 칼슘 권장섭취량은 700~800 mg, 비타민 D 는 10~15 µg 이며, 골다공증 치료를 위해서는 더 많은 양을 섭취하도록 할 수 있다.',
    url: 'https://www.kdca.go.kr/board/board.es?mid=a20501010000&bid=0015&act=view&list_no=723657' },
  { id: 'kdri2020', kind: 'guideline', year: 2020,
    citation: '보건복지부·한국영양학회. 2020 한국인 영양소 섭취기준(KDRIs).' },
  { id: 'knhanes', kind: 'db', year: 2023,
    citation: '질병관리청. 국민건강영양조사 — 한국인 1일 나트륨 섭취량 3,255 mg(2018년 기준)으로 목표섭취량 2,000 mg 의 약 1.6배.' },
  { id: 'kfda-db', kind: 'db', year: 2024,
    citation: '식품의약품안전처. 식품영양성분 데이터베이스.' },
  { id: 'rda-table', kind: 'db', year: 2021,
    citation: '농촌진흥청 국립농업과학원. 국가표준식품성분표 제9개정판.' },

  // ── 발암성 분류 ───────────────────────────────────────────────
  /* 공개 Q&A 문서를 받아 대조했다 — 분류 근거·50 g/18 %·100 g/17 % 가 모두 여기에 있다 */
  { id: 'iarc114', kind: 'review', year: 2018,
    url: 'https://www.iarc.who.int/wp-content/uploads/2018/07/Monographs-QA_Vol114.pdf',
    citation: 'IARC Monographs Volume 114: Red Meat and Processed Meat. International Agency for Research on Cancer. (공개 Q&A 포함)' },
  { id: 'iarc100e', kind: 'review', year: 2012,
    citation: 'IARC Monographs Volume 100E: Personal Habits and Indoor Combustions — Alcohol Consumption. (주류 = Group 1 · 구강·인두·후두·식도·간·대장·여성 유방)',
    url: 'https://publications.iarc.who.int/122' },
  { id: 'iarc116', kind: 'review', year: 2018,
    citation: 'IARC Monographs Volume 116: Drinking Coffee, Mate, and Very Hot Beverages. (65 °C 이상 음료 = Group 2A)' },
  { id: 'iarc-aflatoxin', kind: 'review', year: 2012,
    citation: 'IARC Monographs Volume 100F: Aflatoxins.' },

  // ── 대두·유방암 ───────────────────────────────────────────────
  { id: 'shu2009', kind: 'cohort', year: 2009,
    citation: 'Shu XO, et al. Soy food intake and breast cancer survival. JAMA. 2009;302(22):2437-2443.',
    url: 'https://doi.org/10.1001/jama.2009.1783' },
  { id: 'nechuta2012', kind: 'meta', year: 2012,
    citation: 'Nechuta SJ, et al. Soy food intake after diagnosis of breast cancer and survival: an in-depth analysis of combined evidence from cohort studies. Am J Clin Nutr. 2012;96(1):123-132.',
    url: 'https://doi.org/10.3945/ajcn.112.035972' },
  { id: 'chi2013', kind: 'meta', year: 2013,
    citation: 'Chi F, et al. Post-diagnosis soy food intake and breast cancer survival: a meta-analysis of cohort studies. Asian Pac J Cancer Prev. 2013;14(4):2407-2412.',
    url: 'https://doi.org/10.7314/apjcp.2013.14.4.2407' },

  // ── 항산화 보충제의 위해 ──────────────────────────────────────
  { id: 'bairati2005', kind: 'rct', year: 2005,
    citation: 'Bairati I, et al. Randomized trial of antioxidant vitamins to prevent acute adverse effects of radiation therapy in head and neck cancer patients. J Clin Oncol. 2005;23(24):5805-5813.' },
  /*
   * '국소 재발·사망 증가(특히 흡연자)' 의 실제 출처. 같은 540명 시험의 후속 분석이다.
   * 두 Bairati 2005 논문은 각각 급성 부작용과 이차암을 다루지 이 결과를 다루지 않는다.
   * 그리고 이 논문의 핵심은 '흡연자에서만' 이라는 것이다 — 비흡연자의 위험비는 1에 가까웠다.
   */
  { id: 'meyer2008smoking', kind: 'rct', year: 2008,
    citation: 'Meyer F, et al. Interaction between antioxidant vitamin supplementation and cigarette smoking during radiation therapy in relation to long-term effects on recurrence and mortality: a randomized trial among head and neck cancer patients. Int J Cancer. 2008;122(7):1679-1683. (방사선치료 중 흡연자에서 재발 HR 2.41, 전체 사망 2.26, 두경부암 사망 3.38 · 비흡연자는 모두 1에 가까움)',
    url: 'https://doi.org/10.1002/ijc.23200' },
  { id: 'bairati2005b', kind: 'rct', year: 2005,
    citation: 'Bairati I, et al. A randomized trial of antioxidant vitamins to prevent second primary cancers in head and neck cancer patients. J Natl Cancer Inst. 2005;97(7):481-488. (비타민 E 400 IU·베타카로틴 30 mg, 방사선치료 첫날부터 · 보충 기간 중 이차암 HR 2.88, 95 % CI 1.56~5.31)' },
  { id: 'atbc1994', kind: 'rct', year: 1994,
    citation: 'The Alpha-Tocopherol, Beta Carotene Cancer Prevention Study Group. The effect of vitamin E and beta carotene on the incidence of lung cancer in male smokers. N Engl J Med. 1994;330(15):1029-1035.' },
  { id: 'caret1996', kind: 'rct', year: 1996,
    citation: 'Omenn GS, et al. Effects of a combination of beta carotene and vitamin A on lung cancer and cardiovascular disease (CARET). N Engl J Med. 1996;334(18):1150-1155.' },
  { id: 'select2011', kind: 'rct', year: 2011,
    citation: 'Klein EA, et al. Vitamin E and the risk of prostate cancer: the Selenium and Vitamin E Cancer Prevention Trial (SELECT). JAMA. 2011;306(14):1549-1556. (n=35,533 · 비타민 E 400 IU HR 1.17, 99% CI 1.004-1.36 · 셀레늄 200 µg HR 1.09, 99% CI 0.93-1.27)',
    url: 'https://doi.org/10.1001/jama.2011.1437' },
  /*
   * 기저 셀레늄 수치에 따라 결과가 갈린다는 것은 위 논문이 아니라 이 사후 분석에 있다.
   * 한동안 이 주장을 select2011 하나에 붙여 두었는데, 그 논문 초록에는 없는 내용이었다.
   * "A 를 다룬 논문" 과 "A 가 그렇다는 근거" 는 다르다.
   */
  { id: 'kristal2014', kind: 'cohort', year: 2014,
    citation: 'Kristal AR, et al. Baseline selenium status and effects of selenium and vitamin E supplementation on prostate cancer risk. J Natl Cancer Inst. 2014;106(3):djt456. (SELECT 사후 case-cohort · 기저 셀레늄이 높던 군에서 고위험 전립선암 91% 증가, P=.007)',
    url: 'https://doi.org/10.1093/jnci/djt456' },

  // ── 비타민 D ─────────────────────────────────────────────────
  { id: 'ng2019', kind: 'rct', year: 2019,
    citation: 'Ng K, et al. Effect of High-Dose vs Standard-Dose Vitamin D3 Supplementation on Progression-Free Survival Among Patients With Advanced or Metastatic Colorectal Cancer (SUNSHINE). JAMA. 2019;321(14):1370-1379.' },
  { id: 'manson2019', kind: 'rct', year: 2019,
    citation: 'Manson JE, et al. Vitamin D Supplements and Prevention of Cancer and Cardiovascular Disease (VITAL). N Engl J Med. 2019;380(1):33-44.' },

  // ── 위암·염장식품 ─────────────────────────────────────────────
  { id: 'ge2012salt', kind: 'meta', year: 2012,
    citation: 'Ge S, et al. Association between habitual dietary salt intake and risk of gastric cancer: a systematic review of observational studies. Gastroenterol Res Pract. 2012;2012:808120.' },
  { id: 'dagostino-kim2013', kind: 'cohort', year: 2013,
    citation: 'Kim J, et al. Dietary factors and gastric cancer in Korea: a case-control study. Int J Cancer / Korean cohort evidence on salted foods and kimchi intake.' },
  /*
   * 연도가 2020 으로 적혀 있었으나 실제는 2011 이다(PubMed 21447764).
   * 단독저자 초청 종설이며 학회 합의문이 아니다 — 그래서 이 출처만으로는 'G' 를 달 수 없다.
   * 그리고 이 종설 자신이 결론에서 "표준 위절제 후 식단을 뒷받침할 문헌이 충분하지 않고,
   * 증상에 맞춘 개별 조정이 권고된다" 고 적는다. 앱도 그 말을 그대로 옮긴다.
   */
  { id: 'gastrectomy-nutr', kind: 'review', year: 2011,
    url: 'https://doi.org/10.1177/0884533611400070',
    citation:
      'Rogers C. Postgastrectomy nutrition. Nutr Clin Pract. 2011;26(2):126-136. (초청 종설) ' +
      '— 위절제 후 덤핑증후군·B12·철·칼슘 흡수장애 관리. 표준 식단을 뒷받침할 문헌은 충분하지 않으며 증상별 개별 조정을 권한다.' },
  /* 위절제 후 B12 결핍의 빈도를 실제 숫자로 말하는 유일한 상위 근거 */
  { id: 'b12-gastrectomy-meta', kind: 'meta', year: 2024,
    url: 'https://doi.org/10.1097/CEJ.0000000000000838',
    citation:
      'Bahardoust M, et al. Vitamin B12 deficiency after total gastrectomy for gastric cancer, prevalence, and symptoms: ' +
      'a systematic review and meta-analysis. Eur J Cancer Prev. 2024;33(3):208-216. (14편·2,627명)' },

  // ── 대장암 ───────────────────────────────────────────────────
  { id: 'song2018fiber', kind: 'cohort', year: 2018,
    citation: 'Song M, et al. Fiber Intake and Survival After Colorectal Cancer Diagnosis. JAMA Oncol. 2018;4(1):71-79.',
    url: 'https://doi.org/10.1001/jamaoncol.2017.3684' },
  { id: 'vanblarigan2018', kind: 'cohort', year: 2018,
    citation: 'Van Blarigan EL, et al. Association of Survival With Adherence to the ACS Nutrition and Physical Activity Guidelines Among Patients With Colon Cancer (CALGB 89803). JAMA Oncol. 2018;4(6):783-790.',
    url: 'https://doi.org/10.1001/jamaoncol.2018.0126' },

  // ── 간암 ─────────────────────────────────────────────────────
  { id: 'kennedy2017coffee', kind: 'meta', year: 2017,
    citation: 'Kennedy OJ, et al. Coffee, including caffeinated and decaffeinated coffee, and the risk of hepatocellular carcinoma: a systematic review and dose-response meta-analysis. BMJ Open. 2017;7(5):e013739.' },
  { id: 'easl-nutrition', kind: 'guideline', year: 2019,
    citation: 'European Association for the Study of the Liver. EASL Clinical Practice Guidelines on nutrition in chronic liver disease. J Hepatol. 2019;70(1):172-193.' },

  // ── 전립선암 ─────────────────────────────────────────────────
  { id: 'wcrf-prostate', kind: 'review', year: 2018,
    citation: 'WCRF/AICR Continuous Update Project: Diet, nutrition, physical activity and prostate cancer. (유제품·칼슘 고섭취 — limited-suggestive 위험 증가)' },
  { id: 'adt-bone', kind: 'guideline', year: 2020,
    citation: 'Saylor PJ, et al. Bone Health and Bone-Targeted Therapies for Prostate Cancer: ASCO Endorsement of a Cancer Care Ontario Guideline. J Clin Oncol. 2020;38(15):1736-1743.',
    url: 'https://doi.org/10.1200/JCO.19.03148' },
  /*
   * '연 2~5 %' 의 실제 값은 이 무작위 시험에 있다.
   * 부위와 측정법에 따라 다르다 — 그래서 문헌마다 숫자가 달라 보인다.
   */
  { id: 'smith2001adt', kind: 'rct', year: 2001,
    citation: 'Smith MR, et al. Pamidronate to prevent bone loss during androgen-deprivation therapy for prostate cancer. N Engl J Med. 2001;345(13):948-955. (48주 · 대조군 골밀도 요추 3.3 %, 대전자 2.1 %, 고관절 1.8 % 감소 · 요추 해면골은 8.5 %)',
    url: 'https://doi.org/10.1056/NEJMoa010845' },

  { id: 'asco-cardio', kind: 'guideline', year: 2017,
    citation: 'Armenian SH, et al. Prevention and Monitoring of Cardiac Dysfunction in Survivors of Adult Cancers: ASCO Clinical Practice Guideline. J Clin Oncol. 2017;35(8):893-911. — 심장독성 약제 사용 중 혈압·체중·지질 등 심혈관 위험 요인 관리 권고.' },

  // ── 호중구감소증 식이 ────────────────────────────────────────
  /*
   * id 는 'sonbol2015' 이지만 실제로 인용하는 것은 2019년 갱신판이다(초판이 2015년).
   * id 는 읽음 표시처럼 여기저기 걸려 있어 그대로 두고, 연도와 내용을 사실에 맞춘다.
   */
  { id: 'sonbol2015', kind: 'meta', year: 2019,
    citation: 'Sonbol MB, et al. Neutropenic diets to prevent cancer infections: updated systematic review and meta-analysis. BMJ Support Palliat Care. 2019;9(4):425-433. (6편·1,116명 · 주요 감염 RR 1.16, 95 % CI 0.94~1.42 · 조혈모세포이식군에서는 제한식이가 오히려 감염 증가 RR 1.25, 95 % CI 1.02~1.54 · 제한식이 대신 미국 FDA 식품취급 지침을 따르라고 권고)',
    url: 'https://doi.org/10.1136/bmjspcare-2018-001742' },
  /*
   * 비브리오 치사율의 실제 출처. EASL 영양 지침에는 비브리오도 생식도 한 번도 나오지 않는다 —
   * 그 지침을 근거로 달아 두었던 것은 인용과 주장이 어긋난 경우였다.
   */
  { id: 'vibrio-meta2019', kind: 'meta', year: 2019,
    citation: 'Chuang PY, et al. Hepatic disease and the risk of mortality of Vibrio vulnificus necrotizing skin and soft tissue infections: a systematic review and meta-analysis. PLoS One. 2019;14(10):e0223513. (12편·1,157명 · 간질환군 53.9 % 대 비간질환군 16.1 %, RR 2.61, 95 % CI 2.14~3.19)',
    url: 'https://doi.org/10.1371/journal.pone.0223513' },
  { id: 'cdc-vibrio', kind: 'guideline', year: 2024,
    citation: 'U.S. CDC. Clinical Overview of Vibriosis. — 비브리오 불니피쿠스 감염자의 약 5명 중 1명이 사망하며, 간질환이 있으면 특히 위험하다.',
    url: 'https://www.cdc.gov/vibrio/hcp/clinical-overview/index.html' },
  { id: 'fda-foodsafety', kind: 'guideline', year: 2023,
    citation: 'U.S. FDA. Food Safety for Older Adults and People with Cancer, Diabetes, HIV/AIDS, Organ Transplants, and Autoimmune Diseases. — 위험이 높은 것과 낮은 것을 짝지어 제시한다. 생 새싹채소는 높은 쪽, 익힌 새싹이 낮은 쪽이다. 조리 후 2시간 안에 냉장(32 ℃ 넘으면 1시간).',
    url: 'https://www.fda.gov/media/83744/download' },

  // ── 상호작용 ─────────────────────────────────────────────────
  /* 전문 공개. 200 mL·24시간 25 %·라임/포멜로/세비야오렌지·단맛오렌지 제외·정맥주사 무영향이 모두 여기에 있다 */
  { id: 'bailey2013grapefruit', kind: 'review', year: 2013,
    url: 'https://doi.org/10.1503/cmaj.120951',
    citation: 'Bailey DG, et al. Grapefruit–medication interactions: forbidden fruit or avoidable consequences? CMAJ. 2013;185(4):309-316.' },
  { id: 'golden2009', kind: 'review', year: 2009,
    citation: 'Golden EB, et al. Green tea polyphenols block the anticancer effects of bortezomib and other boronic acid-based proteasome inhibitors. Blood. 2009;113(23):5927-5937.' },
  /*
   * 카페시타빈–와파린은 증례 보고가 근거다. 한동안 ACCP 항응고 지침 하나만 달아 두었는데,
   * 그 지침은 비타민 K 섭취의 일관성을 다루지 카페시타빈을 다루지 않는다.
   * 주장을 실제로 뒷받침하는 문헌을 따로 단다.
   */
  { id: 'capecitabine-warfarin', kind: 'review', year: 2001,
    citation: 'Copur MS, et al. An adverse interaction between warfarin and capecitabine: a case report and review of the literature. Clin Colorectal Cancer. 2001;1(3):182-184. (증례 2건 — 병용 6주 뒤 INR 10 초과·위장관 출혈)',
    url: 'https://doi.org/10.3816/CCC.2001.n.019' },
  { id: 'sjw-interaction', kind: 'rct', year: 2002,
    citation: 'Mathijssen RH, et al. Effects of St. John\'s wort on irinotecan metabolism. J Natl Cancer Inst. 2002;94(16):1247-1249. (환자 5명 무작위배정 교차설계 · SN-38 농도 42 % 감소, 95 % CI 14~70 %)',
    url: 'https://doi.org/10.1093/jnci/94.16.1247' },
  /* ACCP 항응고 치료 지침이다 — 'review' 가 아니라 'guideline' 이 맞다 */
  { id: 'warfarin-vitk', kind: 'guideline', year: 2012,
    citation: 'Holbrook A, et al. Evidence-based management of anticoagulant therapy: ACCP Guidelines. Chest. 2012;141(2 Suppl):e152S-e184S. — 비타민 K 섭취의 일관성 유지 권고.' },

  // ── 증상 관리 ────────────────────────────────────────────────
  { id: 'ryan2012ginger', kind: 'rct', year: 2012,
    citation: 'Ryan JL, et al. Ginger (Zingiber officinale) reduces acute chemotherapy-induced nausea: a URCC CCOP study of 576 patients. Support Care Cancer. 2012;20(7):1479-1489.' },
  /*
   * 전문을 받아 대조했다. 이 지침은 '무엇을 쓸 것인가'(구강 냉각·광생체조절·벤지다민 등)를 다루지
   * '무엇을 먹을 것인가'를 다루지 않는다 — 전문에 spicy·acidic·citrus·food·texture·soft·
   * temperature·caffeine·alcohol 이 모두 0건이다. 식이 중재(지방조절식·섬유)는 검토했으나
   * "근거가 불충분하거나 상충되어 권고를 낼 수 없었다"고 적는다.
   * 그러므로 이 출처는 '통증 조절과 식이 지원이 핵심' 이라는 틀과 구강 냉각에만 붙일 수 있다.
   */
  { id: 'mascc-mucositis', kind: 'guideline', year: 2020,
    url: 'https://doi.org/10.1002/cncr.33100',
    citation: 'Elad S, et al. MASCC/ISOO clinical practice guidelines for the management of mucositis secondary to cancer therapy. Cancer. 2020;126(19):4423-4431.' },
  /*
   * IDDSI 는 두 문서로 되어 있다 — 단계 정의(Detailed Definitions)와 확인법(Testing Methods).
   * 앱이 적은 수치(0~7의 8단계, 어른 1.5 cm·4 mm, 10 mL 주사기 10초)는 두 문서를 내려받아 대조했다.
   * CC BY-SA 4.0 문서라 표를 그대로 옮기지 않고 사실만 우리 문장으로 적는다.
   */
  { id: 'iddsi', kind: 'guideline', year: 2026,
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
  { id: 'hamajima2002', kind: 'meta', year: 2002,
    citation: 'Collaborative Group on Hormonal Factors in Breast Cancer (Hamajima N, et al). Alcohol, tobacco and breast cancer — collaborative reanalysis of individual data from 53 epidemiological studies. Br J Cancer. 2002;87(11):1234-1245. (하루 10 g 당 상대위험 7.1 % 증가, 95 % CI 5.5~8.7)',
    url: 'https://doi.org/10.1038/sj.bjc.6600596' },
  { id: 'brooks2009aldh2', kind: 'review', year: 2009,
    citation: 'Brooks PJ, et al. The alcohol flushing response: an unrecognized risk factor for esophageal cancer from alcohol consumption. PLoS Med. 2009;6(3):e50. (동아시아인 약 36 % · 이형접합자 오즈비 3.7~18.1 · 음주를 줄이면 일본 남성 식도편평세포암의 53 % 예방 가능 추정)',
    url: 'https://doi.org/10.1371/journal.pmed.1000050' },
  { id: 'eras-colorectal', kind: 'guideline', year: 2019,
    citation: 'Gustafsson UO, et al. Guidelines for Perioperative Care in Elective Colorectal Surgery: ERAS Society Recommendations 2018. World J Surg. 2019;43(3):659-695.',
    url: 'https://doi.org/10.1007/s00268-018-4844-y' },
  { id: 'ueg-pei2025', kind: 'guideline', year: 2025,
    citation: 'Vujasinovic M, et al. Recommendations from the European guidelines for the diagnosis and therapy of pancreatic exocrine insufficiency. Pancreatology. 2025;25(3):293-300.',
    url: 'https://doi.org/10.1016/j.pan.2025.02.015' },
  { id: 'fearon2011', kind: 'guideline', year: 2011,
    citation: 'Fearon K, et al. Definition and classification of cancer cachexia: an international consensus. Lancet Oncol. 2011;12(5):489-495. (체중 감소 5 % 초과, 또는 BMI 20 미만이거나 근감소가 있으면 2 % 초과)',
    url: 'https://doi.org/10.1016/S1470-2045(10)70218-7' },
  { id: 'espen-cachexia', kind: 'guideline', year: 2017,
    citation: 'Arends J, et al. ESPEN guidelines on nutrition in cancer patients. Clin Nutr. 2017;36(1):11-48. — ESPEN 암 영양 지침 전체판(2021 은 축약본).' }
]

/** 식이 문헌과 운동 문헌을 함께 조회할 수 있게 합친다 */
export const ALL_REFERENCES: Reference[] = [...REFERENCES, ...EXERCISE_REFERENCES]

export const REF_BY_ID: Record<string, Reference> = Object.fromEntries(
  ALL_REFERENCES.map((r) => [r.id, r])
)
