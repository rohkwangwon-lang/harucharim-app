import { F } from './_helper'

/** 해조·버섯 — 갑상선(요오드), 베타글루칸, 비타민 D 관련 문의가 많은 군 */
export const seaweedMushroom = [
  F('gim', '김(구운 것)', '해조·버섯', 'ingredient', 2, '1장',
    { kcal: 180, carb: 40.0, protein: 38.0, fat: 2.0, fiber: 33.0, na: 800, k: 2400, ca: 300, p: 700, mg: 300, fe: 12.0, zn: 3.0, vitA: 1500, vitC: 30, vitK: 400, b12: 30 },
    ['고식이섬유', '고칼륨', '고비타민K'], { note: '요오드 함량이 높다 — 갑상선 스캔·방사성요오드 치료 전 저요오드식 기간에는 제한' }),
  F('miyeok-soaked', '미역(불린 것)', '해조·버섯', 'ingredient', 30, '1인분',
    { kcal: 15, carb: 3.0, protein: 1.5, fat: 0.2, fiber: 2.5, na: 300, k: 180, ca: 100, p: 30, mg: 60, fe: 1.0, vitA: 30, vitK: 60 },
    ['고식이섬유'], { note: '요오드 급원. 저요오드식 기간에는 제외' }),
  F('dashima', '다시마', '해조·버섯', 'ingredient', 5, '1조각',
    { kcal: 138, carb: 45.0, protein: 7.0, fat: 1.0, fiber: 28.0, na: 2800, k: 6100, ca: 700, p: 200, mg: 550, fe: 3.0 },
    ['고나트륨', '고칼륨', '고식이섬유'], { note: '요오드가 매우 높다' }),
  /*
   * 100 g 값은 마른 톳 기준이다. 물에 불리면 대여섯 배로 부니,
   * 나물 한 접시에 들어가는 마른 톳은 8 g 남짓이다.
   * 30 g 으로 잡아 두었더니 한 접시에 식이섬유가 12.9 g, 나트륨이 420 mg 으로 계산되어
   * 섬유를 채우는 데 압도적으로 유리해졌고, 18만 일 추천에서 1위(44 %)에 올랐다.
   * 상에 실제로 오르는 양으로 고친다.
   */
  F('tot', '톳', '해조·버섯', 'ingredient', 8, '나물 1접시(마른 톳 기준)',
    { kcal: 140, carb: 40.0, protein: 9.0, fat: 3.0, fiber: 43.0, na: 1400, k: 4200, ca: 1400, p: 100, mg: 620, fe: 6.0 },
    ['고식이섬유', '고칼슘', '고칼륨'], {}),
  F('maesaengi', '매생이', '해조·버섯', 'ingredient', 50, '1인분',
    { kcal: 30, carb: 5.0, protein: 3.0, fat: 0.4, fiber: 3.0, na: 250, k: 400, ca: 130, p: 60, mg: 60, fe: 3.0, vitA: 100 },
    ['부드러움', '고식이섬유'], {}),
  F('shiitake', '표고버섯(생)', '해조·버섯', 'ingredient', 50, '3개',
    { kcal: 34, carb: 6.8, protein: 2.2, fat: 0.5, fiber: 2.5, na: 9, k: 304, ca: 2, p: 112, mg: 20, fe: 0.4, zn: 1.0, vitD: 0.4, b2: 0.22, b3: 3.9 },
    ['폴리페놀'], { note: '렌티난(베타글루칸) 함유. 햇볕에 말리면 비타민 D 가 크게 증가한다' }),
  F('shiitake-dried', '건표고버섯', '해조·버섯', 'ingredient', 10, '3개',
    { kcal: 296, carb: 63.4, protein: 19.3, fat: 1.0, fiber: 41.0, na: 13, k: 2100, ca: 12, p: 290, mg: 132, fe: 1.7, zn: 7.7, vitD: 3.9, b2: 1.4 },
    ['고식이섬유', '고칼륨'], { note: '자연건조 표고는 비타민 D2 의 드문 식물성 급원' }),
  F('king-oyster', '새송이버섯', '해조·버섯', 'ingredient', 60, '1개',
    { kcal: 32, carb: 6.0, protein: 2.6, fat: 0.3, fiber: 2.4, na: 3, k: 340, ca: 1, p: 89, mg: 12, fe: 0.3, zn: 0.6, b3: 6.0 },
    [], {}),
  F('enoki', '팽이버섯', '해조·버섯', 'ingredient', 50, '1/2봉',
    { kcal: 34, carb: 7.8, protein: 2.7, fat: 0.3, fiber: 2.7, na: 3, k: 359, ca: 1, p: 105, mg: 16, fe: 1.2, zn: 0.7, b3: 7.0 },
    ['거친질감'], { note: '섬유가 질겨 위절제 후·장협착 시 잘게 썰어 섭취' }),
  F('oyster-mushroom', '느타리버섯', '해조·버섯', 'ingredient', 60, '1줌',
    { kcal: 33, carb: 6.1, protein: 3.3, fat: 0.4, fiber: 2.3, na: 18, k: 420, ca: 3, p: 120, mg: 18, fe: 1.3, zn: 0.8, b3: 5.0 },
    [], {}),
  F('button-mushroom', '양송이버섯', '해조·버섯', 'ingredient', 60, '3개',
    { kcal: 22, carb: 3.3, protein: 3.1, fat: 0.3, fiber: 1.0, na: 5, k: 318, ca: 3, p: 86, mg: 9, fe: 0.5, zn: 0.5, vitD: 0.2, b2: 0.4, b3: 3.6 },
    ['부드러움'], {}),
  F('wood-ear', '목이버섯(불린 것)', '해조·버섯', 'ingredient', 30, '1접시',
    { kcal: 25, carb: 6.0, protein: 0.6, fat: 0.1, fiber: 5.0, na: 5, k: 60, ca: 30, p: 15, mg: 20, fe: 1.0 },
    ['고식이섬유', '거친질감'], {})
]
