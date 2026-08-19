import { F } from './_helper'

/** 가금류·난류 — 치료 중 단백질 보충의 1차 급원 */
export const poultryEgg = [
  F('chicken-breast', '닭가슴살(삶은 것)', '가금류·난류', 'ingredient', 100, '1쪽',
    { kcal: 165, carb: 0, protein: 31.0, fat: 3.6, satFat: 1.0, chol: 85, na: 74, k: 256, ca: 15, p: 228, mg: 29, fe: 1.0, zn: 1.0, se: 27, b3: 13.7, b6: 0.6, b12: 0.3, purine: 140 },
    ['고단백', '부드러움'], { src: 'rda', note: '지방이 적고 단백질 밀도가 가장 높은 실용적 급원' }),
  F('chicken-thigh', '닭다리살', '가금류·난류', 'ingredient', 100, '1개',
    { kcal: 209, carb: 0, protein: 26.0, fat: 10.9, satFat: 3.0, chol: 95, na: 84, k: 230, ca: 12, p: 180, fe: 1.3, zn: 2.0, b3: 6.0, b12: 0.6, purine: 120 },
    ['고단백', '부드러움'], {}),
  F('chicken-fried', '후라이드치킨', '가금류·난류', 'eatout', 200, '1/4마리',
    { kcal: 290, carb: 14.0, protein: 22.0, fat: 16.5, satFat: 4.5, transFat: 0.2, chol: 90, na: 550, k: 220, ca: 25, p: 180, fe: 1.2, zn: 1.8 },
    ['튀김', '고지방', '고나트륨', '고열량밀도', '거친질감'], {}),
  F('chicken-samgyetang', '삼계탕', '가금류·난류', 'dish', 600, '1그릇',
    { kcal: 105, carb: 5.5, protein: 10.5, fat: 4.5, satFat: 1.3, chol: 40, na: 380, k: 130, ca: 12, p: 95, fe: 0.7, zn: 0.9 },
    ['고단백', '부드러움', '수분보충'], { note: '국물까지 먹으면 1그릇 나트륨이 2,000 mg 을 넘길 수 있다' }),
  F('egg-boiled', '달걀(삶은 것)', '가금류·난류', 'ingredient', 55, '1개',
    { kcal: 155, carb: 1.1, protein: 12.6, fat: 10.6, satFat: 3.3, chol: 373, na: 124, k: 126, ca: 50, p: 172, mg: 10, fe: 1.2, zn: 1.1, se: 31, vitA: 149, vitD: 2.0, vitE: 1.0, b2: 0.51, b12: 1.1, folate: 44 },
    ['고단백', '부드러움'], { src: 'rda', note: '완전히 익힌 것만 섭취 — 반숙은 호중구감소증에서 금기' }),
  F('egg-raw-yolk', '날달걀·반숙', '가금류·난류', 'ingredient', 55, '1개',
    { kcal: 143, carb: 0.7, protein: 12.6, fat: 9.5, satFat: 3.1, chol: 372, na: 142, k: 138, ca: 56, p: 198, fe: 1.8, zn: 1.3, vitA: 160, vitD: 2.0, b12: 0.9 },
    ['생식', '고단백'], { note: '살모넬라 위험 — 호중구감소증·항암 중에는 피한다' }),
  F('egg-steamed', '계란찜', '가금류·난류', 'dish', 150, '1공기',
    { kcal: 105, carb: 1.5, protein: 9.0, fat: 7.0, satFat: 2.2, chol: 250, na: 320, k: 110, ca: 45, p: 130, fe: 0.9, zn: 0.8, vitD: 1.3 },
    ['부드러움', '고단백'], { note: '구강점막염·연하곤란 시 가장 실용적인 단백질 반찬' }),
  F('quail-egg', '메추리알', '가금류·난류', 'ingredient', 50, '5개',
    { kcal: 158, carb: 0.4, protein: 13.0, fat: 11.1, satFat: 3.6, chol: 844, na: 141, k: 132, ca: 64, p: 226, fe: 3.7, zn: 1.5, vitA: 156, b12: 1.6 },
    ['고단백'], {})
]
