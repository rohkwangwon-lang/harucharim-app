import type { Reference } from './types'

/** 운동 권고의 근거 문헌 */
export const EXERCISE_REFERENCES: Reference[] = [
  { id: 'acsm2019', kind: 'guideline', year: 2019,
    citation: 'Campbell KL, et al. Exercise Guidelines for Cancer Survivors: Consensus Statement from International Multidisciplinary Roundtable. Med Sci Sports Exerc. 2019;51(11):2375-2390.',
    url: 'https://doi.org/10.1249/MSS.0000000000002116' },
  { id: 'asco-exercise2022', kind: 'guideline', year: 2022,
    citation: 'Ligibel JA, et al. Exercise, Diet, and Weight Management During Cancer Treatment: ASCO Guideline. J Clin Oncol. 2022;40(22):2491-2507.' },
  { id: 'challenge2025', kind: 'rct', year: 2025,
    citation: 'Courneya KS, et al. Structured Exercise after Adjuvant Chemotherapy in Colon Cancer (CHALLENGE). N Engl J Med. 2025;393(1):13-25.',
    url: 'https://doi.org/10.1056/NEJMoa2502760' },
  { id: 'pal2009', kind: 'rct', year: 2009,
    citation: 'Schmitz KH, et al. Weight lifting in women with breast-cancer-related lymphedema (PAL trial). N Engl J Med. 2009;361(7):664-673.' },
  { id: 'galvao2010', kind: 'rct', year: 2010,
    url: 'https://doi.org/10.1200/JCO.2009.23.2488',
    citation:
      'Galvão DA, et al. Combined resistance and aerobic exercise program reverses muscle loss in men undergoing androgen suppression therapy for prostate cancer ' +
      'without bone metastases: a randomized controlled trial. J Clin Oncol. 2010;28(2):340-347. (57명·12주 · 뼈 전이가 없는 남성만 대상)' },
  { id: 'prehab-lung', kind: 'meta', year: 2019,
    citation: 'Rosero ID, et al. Systematic Review and Meta-Analysis of Randomized Controlled Trials on Preoperative Physical Exercise Interventions in Patients with Non-Small-Cell Lung Cancer. Cancers. 2019;11(7):944.' },
  { id: 'mckenzie-shoulder', kind: 'review', year: 2020,
    citation: 'McGarvey AC, et al. Physiotherapy for accessory nerve shoulder dysfunction following neck dissection surgery: a literature review. Head Neck. 2011;33(2):274-280.' },
  /*
   * 아래 셋은 '섭취가 모자란 때 운동을 어떻게 할 것인가' 에 붙는 출처다.
   *
   * 이 물음에 직접 답하는 시험은 없다는 것이 요점이라, 그 사실을 보여 주는 문헌을 함께 싣는다.
   * Cochrane 갱신판은 악액질에서 운동의 **효과와 안전성 모두** 불확실하다고 결론짓는다
   * (4편·178명, GRADE 전 항목 very low). 근거가 없다는 것도 근거다 —
   * 없는 것을 있는 것처럼 말하지 않기 위해 인용한다.
   */
  { id: 'cochrane-cachexia-exercise', kind: 'meta', year: 2021,
    citation: 'Grande AJ, et al. Exercise for cancer cachexia in adults. Cochrane Database Syst Rev. 2021;3(3):CD010804. (RCT 4편·178명, GRADE very low — 효과·수용성·안전성 모두 불확실)',
    url: 'https://doi.org/10.1002/14651858.CD010804.pub3' },
  { id: 'asco-cachexia2020', kind: 'guideline', year: 2020,
    citation: 'Roeland EJ, et al. Management of Cancer Cachexia: ASCO Guideline. J Clin Oncol. 2020;38(21):2438-2453. (체계적 문헌고찰 20편·RCT 13편 검토, 운동을 포함한 그 밖의 중재는 이득 없음 또는 근거 불충분)',
    url: 'https://doi.org/10.1200/JCO.20.00611' },
  /*
   * 대상이 암 환자가 아니다. 젊은 건강한 남성 40명의 4주 시험이다.
   * 그래도 싣는 이유는, '에너지가 모자랄 때 근육을 지키는 것' 에 관해
   * 방향을 보여 주는 유일한 무작위 자료이기 때문이다.
   * 화면에서도 대상이 다르다는 것을 반드시 함께 적는다.
   */
  { id: 'longland2016', kind: 'rct', year: 2016,
    citation: 'Longland TM, et al. Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss. Am J Clin Nutr. 2016;103(3):738-746. (건강한 젊은 남성 40명·4주 — 암 환자 대상 아님)',
    url: 'https://doi.org/10.3945/ajcn.115.119339' },
  { id: 'bone-mets-exercise', kind: 'review', year: 2018,
    citation: 'Campbell KL, et al. Exercise recommendation for people with bone metastases: expert consensus. J Cancer Surviv / Sheill G, et al. Considerations for exercise prescription in patients with bone metastases. 2018.' }
]
