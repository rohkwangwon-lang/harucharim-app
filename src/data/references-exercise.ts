import type { Reference } from './types'

/** 운동 권고의 근거 문헌 */
export const EXERCISE_REFERENCES: Reference[] = [
  { id: 'acsm2019', kind: 'guideline', year: 2019, access: 'pmc', fulltext: 'PMC8576825',
    citation: 'Campbell KL, et al. Exercise Guidelines for Cancer Survivors: Consensus Statement from International Multidisciplinary Roundtable. Med Sci Sports Exerc. 2019;51(11):2375-2390.',
    url: 'https://doi.org/10.1249/MSS.0000000000002116' },
  /* 'asco-exercise2022' 는 asco2022 와 같은 논문(Ligibel 2022)이라 지우고 asco2022 로 합쳤다(2026-10-14) */
  /* 'challenge2025' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  { id: 'pal2009', kind: 'rct', year: 2009, access: 'open',
    citation: 'Schmitz KH, et al. Weight lifting in women with breast-cancer-related lymphedema (PAL trial). N Engl J Med. 2009;361(7):664-673.',
    url: 'https://doi.org/10.1056/NEJMoa0810118' },
  /* 'galvao2010' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  { id: 'prehab-lung', kind: 'meta', year: 2019, access: 'pmc', fulltext: 'PMC6678369',
    citation: 'Rosero ID, et al. Systematic Review and Meta-Analysis of Randomized Controlled Trials on Preoperative Physical Exercise Interventions in Patients with Non-Small-Cell Lung Cancer. Cancers. 2019;11(7):944.',
    url: 'https://doi.org/10.3390/cancers11070944' },
  /* 'mckenzie-shoulder' — 원문이 구독제라 원문 공개 출처로 바꾸고 지웠다(2026-10-14 전수 대조) */
  /*
   * 아래 셋은 '섭취가 모자란 때 운동을 어떻게 할 것인가' 에 붙는 출처다.
   *
   * 이 물음에 직접 답하는 시험은 없다는 것이 요점이라, 그 사실을 보여 주는 문헌을 함께 싣는다.
   * Cochrane 갱신판은 악액질에서 운동의 **효과와 안전성 모두** 불확실하다고 결론짓는다
   * (4편·178명, GRADE 전 항목 very low). 근거가 없다는 것도 근거다 —
   * 없는 것을 있는 것처럼 말하지 않기 위해 인용한다.
   */
  { id: 'cochrane-cachexia-exercise', kind: 'meta', year: 2021, access: 'pmc', fulltext: 'PMC8094916',
    citation: 'Grande AJ, et al. Exercise for cancer cachexia in adults. Cochrane Database Syst Rev. 2021;3(3):CD010804. (RCT 4편·178명, GRADE very low — 효과·수용성·안전성 모두 불확실)',
    url: 'https://doi.org/10.1002/14651858.CD010804.pub3' },
  { id: 'asco-cachexia2020', kind: 'guideline', year: 2020, access: 'open',
    citation: 'Roeland EJ, et al. Management of Cancer Cachexia: ASCO Guideline. J Clin Oncol. 2020;38(21):2438-2453. (체계적 문헌고찰 20편·RCT 13편 검토, 운동을 포함한 그 밖의 중재는 이득 없음 또는 근거 불충분)',
    url: 'https://doi.org/10.1200/JCO.20.00611' },
  /*
   * 대상이 암 환자가 아니다. 젊은 건강한 남성 40명의 4주 시험이다.
   * 그래도 싣는 이유는, '에너지가 모자랄 때 근육을 지키는 것' 에 관해
   * 방향을 보여 주는 유일한 무작위 자료이기 때문이다.
   * 화면에서도 대상이 다르다는 것을 반드시 함께 적는다.
   */
  { id: 'longland2016', kind: 'rct', year: 2016, access: 'open',
    citation: 'Longland TM, et al. Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss. Am J Clin Nutr. 2016;103(3):738-746. (건강한 젊은 남성 40명·4주 — 암 환자 대상 아님)',
    url: 'https://doi.org/10.3945/ajcn.115.119339' },
  /*
   * 두 문헌(Campbell 2022 전문가 합의 + Sheill 2018 종설)을 한 출처에 섞고 학술지·연도까지 틀리게 적었었다(2026-10-14 전수 대조).
   * 원문이 공개된 Campbell 2022 만 남긴다 — Sheill 2018(PM R)은 구독제라 원문 대조를 할 수 없다.
   */
  { id: 'bone-mets-exercise', kind: 'guideline', year: 2022, verified: '운동 평가·처방은 뼈 병변의 위치와 상태를 고려, 위험-이득은 환자·의료진·운동 전문가 상의로 (PMC 원문 확인)',
    citation: 'Campbell KL, et al. Exercise Recommendation for People With Bone Metastases: Expert Consensus for Health Care Providers and Exercise Professionals. JCO Oncol Pract. 2022;18(5):e697-e709.',
    url: 'https://doi.org/10.1200/OP.21.00454', access: 'pmc', fulltext: 'PMC9810134' }
]
