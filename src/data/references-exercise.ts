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
    citation: 'Galvão DA, et al. Combined resistance and aerobic exercise program reverses muscle loss in men undergoing androgen suppression therapy for prostate cancer. J Clin Oncol. 2010;28(2):340-347.' },
  { id: 'prehab-lung', kind: 'meta', year: 2019,
    citation: 'Rosero ID, et al. Systematic Review and Meta-Analysis of Randomized Controlled Trials on Preoperative Physical Exercise Interventions in Patients with Non-Small-Cell Lung Cancer. Cancers. 2019;11(7):944.' },
  { id: 'mckenzie-shoulder', kind: 'review', year: 2020,
    citation: 'McGarvey AC, et al. Physiotherapy for accessory nerve shoulder dysfunction following neck dissection surgery: a literature review. Head Neck. 2011;33(2):274-280.' },
  { id: 'bone-mets-exercise', kind: 'review', year: 2018,
    citation: 'Campbell KL, et al. Exercise recommendation for people with bone metastases: expert consensus. J Cancer Surviv / Sheill G, et al. Considerations for exercise prescription in patients with bone metastases. 2018.' }
]
