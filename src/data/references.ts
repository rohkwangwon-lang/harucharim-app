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
  { id: 'acs2022', kind: 'guideline', year: 2022,
    citation: 'Rock CL, et al. American Cancer Society nutrition and physical activity guideline for cancer survivors. CA Cancer J Clin. 2022;72(3):230-262.' },
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
  { id: 'kdri2020', kind: 'guideline', year: 2020,
    citation: '보건복지부·한국영양학회. 2020 한국인 영양소 섭취기준(KDRIs).' },
  { id: 'knhanes', kind: 'db', year: 2023,
    citation: '질병관리청. 국민건강영양조사 — 한국인 나트륨 섭취 실태.' },
  { id: 'kfda-db', kind: 'db', year: 2024,
    citation: '식품의약품안전처. 식품영양성분 데이터베이스.' },
  { id: 'rda-table', kind: 'db', year: 2021,
    citation: '농촌진흥청 국립농업과학원. 국가표준식품성분표 제9개정판.' },

  // ── 발암성 분류 ───────────────────────────────────────────────
  { id: 'iarc114', kind: 'review', year: 2018,
    citation: 'IARC Monographs Volume 114: Red Meat and Processed Meat. International Agency for Research on Cancer.' },
  { id: 'iarc100e', kind: 'review', year: 2012,
    citation: 'IARC Monographs Volume 100E: Personal Habits and Indoor Combustions — Alcohol Consumption.' },
  { id: 'iarc116', kind: 'review', year: 2018,
    citation: 'IARC Monographs Volume 116: Drinking Coffee, Mate, and Very Hot Beverages. (65 °C 이상 음료 = Group 2A)' },
  { id: 'iarc-aflatoxin', kind: 'review', year: 2012,
    citation: 'IARC Monographs Volume 100F: Aflatoxins.' },

  // ── 대두·유방암 ───────────────────────────────────────────────
  { id: 'shu2009', kind: 'cohort', year: 2009,
    citation: 'Shu XO, et al. Soy food intake and breast cancer survival. JAMA. 2009;302(22):2437-2443.' },
  { id: 'nechuta2012', kind: 'meta', year: 2012,
    citation: 'Nechuta SJ, et al. Soy food intake after diagnosis of breast cancer and survival: an in-depth analysis of combined evidence from cohort studies. Am J Clin Nutr. 2012;96(1):123-132.' },
  { id: 'chi2013', kind: 'meta', year: 2013,
    citation: 'Chi F, et al. Post-diagnosis soy food intake and breast cancer survival: a meta-analysis of cohort studies. Asian Pac J Cancer Prev. 2013;14(4):2407-2412.' },

  // ── 항산화 보충제의 위해 ──────────────────────────────────────
  { id: 'bairati2005', kind: 'rct', year: 2005,
    citation: 'Bairati I, et al. Randomized trial of antioxidant vitamins to prevent acute adverse effects of radiation therapy in head and neck cancer patients. J Clin Oncol. 2005;23(24):5805-5813.' },
  { id: 'bairati2005b', kind: 'rct', year: 2005,
    citation: 'Bairati I, et al. A randomized trial of antioxidant vitamins to prevent second primary cancers in head and neck cancer patients. J Natl Cancer Inst. 2005;97(7):481-488.' },
  { id: 'atbc1994', kind: 'rct', year: 1994,
    citation: 'The Alpha-Tocopherol, Beta Carotene Cancer Prevention Study Group. The effect of vitamin E and beta carotene on the incidence of lung cancer in male smokers. N Engl J Med. 1994;330(15):1029-1035.' },
  { id: 'caret1996', kind: 'rct', year: 1996,
    citation: 'Omenn GS, et al. Effects of a combination of beta carotene and vitamin A on lung cancer and cardiovascular disease (CARET). N Engl J Med. 1996;334(18):1150-1155.' },
  { id: 'select2011', kind: 'rct', year: 2011,
    citation: 'Klein EA, et al. Vitamin E and the risk of prostate cancer: the Selenium and Vitamin E Cancer Prevention Trial (SELECT). JAMA. 2011;306(14):1549-1556.' },

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
  { id: 'gastrectomy-nutr', kind: 'review', year: 2020,
    citation: 'Rogers C. Postgastrectomy Nutrition. Nutr Clin Pract — 위절제 후 덤핑증후군·B12·철·칼슘 흡수장애 관리.' },

  // ── 대장암 ───────────────────────────────────────────────────
  { id: 'song2018fiber', kind: 'cohort', year: 2018,
    citation: 'Song M, et al. Fiber Intake and Survival After Colorectal Cancer Diagnosis. JAMA Oncol. 2018;4(1):71-79.' },
  { id: 'vanblarigan2018', kind: 'cohort', year: 2018,
    citation: 'Van Blarigan EL, et al. Association of Survival With Adherence to the ACS Nutrition and Physical Activity Guidelines Among Patients With Colon Cancer (CALGB 89803). JAMA Oncol. 2018;4(6):783-790.' },

  // ── 간암 ─────────────────────────────────────────────────────
  { id: 'kennedy2017coffee', kind: 'meta', year: 2017,
    citation: 'Kennedy OJ, et al. Coffee, including caffeinated and decaffeinated coffee, and the risk of hepatocellular carcinoma: a systematic review and dose-response meta-analysis. BMJ Open. 2017;7(5):e013739.' },
  { id: 'easl-nutrition', kind: 'guideline', year: 2019,
    citation: 'European Association for the Study of the Liver. EASL Clinical Practice Guidelines on nutrition in chronic liver disease. J Hepatol. 2019;70(1):172-193.' },

  // ── 전립선암 ─────────────────────────────────────────────────
  { id: 'wcrf-prostate', kind: 'review', year: 2018,
    citation: 'WCRF/AICR Continuous Update Project: Diet, nutrition, physical activity and prostate cancer. (유제품·칼슘 고섭취 — limited-suggestive 위험 증가)' },
  { id: 'adt-bone', kind: 'guideline', year: 2020,
    citation: 'Saylor PJ, et al. Bone Health and Bone-Targeted Therapies for Prostate Cancer: ASCO Endorsement. — ADT 중 칼슘·비타민 D 보충 권고.' },

  { id: 'asco-cardio', kind: 'guideline', year: 2017,
    citation: 'Armenian SH, et al. Prevention and Monitoring of Cardiac Dysfunction in Survivors of Adult Cancers: ASCO Clinical Practice Guideline. J Clin Oncol. 2017;35(8):893-911. — 심장독성 약제 사용 중 혈압·체중·지질 등 심혈관 위험 요인 관리 권고.' },

  // ── 호중구감소증 식이 ────────────────────────────────────────
  { id: 'sonbol2015', kind: 'meta', year: 2015,
    citation: 'Sonbol MB, et al. Neutropenic diets to prevent cancer infections: updated systematic review and meta-analysis. BMJ Support Palliat Care. 2019;9(4):425-433.' },
  { id: 'fda-foodsafety', kind: 'guideline', year: 2023,
    citation: 'U.S. FDA. Food Safety for People with Cancer. — 조리·보관 위생 중심의 식품안전 권고.' },

  // ── 상호작용 ─────────────────────────────────────────────────
  { id: 'bailey2013grapefruit', kind: 'review', year: 2013,
    citation: 'Bailey DG, et al. Grapefruit–medication interactions: forbidden fruit or avoidable consequences? CMAJ. 2013;185(4):309-316.' },
  { id: 'golden2009', kind: 'review', year: 2009,
    citation: 'Golden EB, et al. Green tea polyphenols block the anticancer effects of bortezomib and other boronic acid-based proteasome inhibitors. Blood. 2009;113(23):5927-5937.' },
  { id: 'sjw-interaction', kind: 'review', year: 2002,
    citation: 'Mathijssen RH, et al. Effects of St. John\'s wort on irinotecan metabolism. J Natl Cancer Inst. 2002;94(16):1247-1249.' },
  { id: 'warfarin-vitk', kind: 'review', year: 2012,
    citation: 'Holbrook A, et al. Evidence-based management of anticoagulant therapy: ACCP Guidelines. Chest. 2012;141(2 Suppl):e152S-e184S. — 비타민 K 섭취의 일관성 유지 권고.' },

  // ── 증상 관리 ────────────────────────────────────────────────
  { id: 'ryan2012ginger', kind: 'rct', year: 2012,
    citation: 'Ryan JL, et al. Ginger (Zingiber officinale) reduces acute chemotherapy-induced nausea: a URCC CCOP study of 576 patients. Support Care Cancer. 2012;20(7):1479-1489.' },
  { id: 'mascc-mucositis', kind: 'guideline', year: 2020,
    citation: 'Elad S, et al. MASCC/ISOO clinical practice guidelines for the management of mucositis secondary to cancer therapy. Cancer. 2020;126(19):4423-4431.' },
  { id: 'iddsi', kind: 'guideline', year: 2019,
    citation: 'International Dysphagia Diet Standardisation Initiative (IDDSI) Framework. — 연하곤란 식이 점도 표준.' },
  { id: 'espen-cachexia', kind: 'guideline', year: 2017,
    citation: 'Arends J, et al. ESPEN guidelines on nutrition in cancer patients. Clin Nutr. 2017;36(1):11-48. — 악액질에서 단백질 1.0~1.5 g/kg, 오메가-3 고려.' }
]

/** 식이 문헌과 운동 문헌을 함께 조회할 수 있게 합친다 */
export const ALL_REFERENCES: Reference[] = [...REFERENCES, ...EXERCISE_REFERENCES]

export const REF_BY_ID: Record<string, Reference> = Object.fromEntries(
  ALL_REFERENCES.map((r) => [r.id, r])
)
