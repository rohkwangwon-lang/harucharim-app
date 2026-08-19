import { F } from './_helper'

/**
 * 경장영양·환자식 — 경구 영양보충(ONS) 제품.
 * ESPEN 은 경구 섭취만으로 필요량의 60 % 미만이 3일 이상 지속되면 ONS 를 권고한다.
 */
export const clinical = [
  F('ons-standard', '균형영양식(일반형, 1.0 kcal/mL)', '경장영양·환자식', 'beverage', 200, '1팩',
    { kcal: 100, carb: 13.5, protein: 4.0, fat: 3.3, satFat: 0.5, fiber: 1.0, na: 80, k: 150, ca: 80, p: 70, mg: 20, fe: 1.2, zn: 1.2, se: 5, vitA: 75, vitD: 1.0, vitE: 2.0, vitC: 10, b12: 0.3, folate: 30 },
    ['부드러움', '고단백', '수분보충'],
    { aliases: ['뉴케어', '그린비아', '메디푸드'], note: '1팩(200 mL) = 200 kcal, 단백질 8 g' }),
  F('ons-highcal', '균형영양식(고열량형, 1.5 kcal/mL)', '경장영양·환자식', 'beverage', 200, '1팩',
    { kcal: 150, carb: 18.0, protein: 6.8, fat: 5.5, fiber: 1.5, na: 100, k: 200, ca: 110, p: 100, mg: 28, fe: 1.8, zn: 1.8, se: 7, vitD: 1.5, vitE: 3.0, vitC: 15, b12: 0.5 },
    ['부드러움', '고단백', '고열량밀도'],
    { note: '적은 부피로 열량을 올려야 하는 식욕부진·조기포만감에 적합' }),
  F('ons-diabetic', '균형영양식(당뇨용)', '경장영양·환자식', 'beverage', 200, '1팩',
    { kcal: 100, carb: 11.0, protein: 4.5, fat: 4.0, fiber: 1.8, sugar: 1.0, na: 90, k: 160, ca: 85, p: 80, mg: 22, zn: 1.3, vitD: 1.0 },
    ['부드러움', '고단백'], { note: '서서히 흡수되는 탄수화물로 구성' }),
  F('ons-renal', '균형영양식(신장용)', '경장영양·환자식', 'beverage', 200, '1팩',
    { kcal: 150, carb: 18.5, protein: 3.5, fat: 7.0, na: 40, k: 50, ca: 40, p: 30, mg: 8 },
    ['부드러움', '고열량밀도'], { note: '칼륨·인·단백질을 낮춘 조성 — 신기능 저하 시 사용' }),
  F('protein-powder-wpi', '유청단백분말(WPI)', '경장영양·환자식', 'ingredient', 30, '1스쿱',
    { kcal: 370, carb: 6.0, protein: 85.0, fat: 2.0, na: 300, k: 400, ca: 500, p: 350, mg: 40, zn: 2.0 },
    ['고단백', '부드러움'],
    { note: '식사 부피를 늘리지 않고 단백질만 올릴 때 가장 효율적. 1스쿱 = 단백질 약 25 g' }),
  F('thickener', '점도증진제(연하보조)', '경장영양·환자식', 'ingredient', 3, '1작은술',
    { kcal: 250, carb: 90.0, protein: 0.5, fat: 0.1, fiber: 80.0, na: 900, k: 30 },
    ['부드러움'], { note: '연하곤란 환자에서 액체를 걸쭉하게 만들어 흡인을 줄인다' }),
  F('bcaa-supplement', '분지사슬아미노산(BCAA) 제제', '경장영양·환자식', 'ingredient', 15, '1포',
    { kcal: 330, carb: 20.0, protein: 60.0, fat: 0.5, na: 100, k: 50 },
    ['고단백'],
    { note: '간성뇌증을 동반한 간경변에서 근거가 있는 보충제 — 간암 환자에서 자주 사용된다' })
]
