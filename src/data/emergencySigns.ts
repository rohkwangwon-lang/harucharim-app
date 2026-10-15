import type { PatientContext } from './types'
import { refeedingStage } from '../engine/nutrition'

/**
 * 바로 병원에 연락하셔야 하는 신호.
 *
 * 2026-10-15 안전 검토 — 앱 어디에도 응급 안내가 없었다. 고지는 "진료를 대신하지 않습니다" 하나뿐이었고,
 * 호중구감소증을 고르면 날것 안내는 나오는데 "열이 나면 바로 병원" 은 없었다.
 * 식단 앱이 다룰 일이 아니라는 것까지 분명히 말해 드리는 것이 이 앱의 몫이다.
 *
 * 숫자는 넣지 않는다(38 ℃ 만 예외 — 국내 항암 안내문과 지침이 공통으로 쓰는 기준이다).
 * 그 밖의 문턱은 병원마다 다르게 안내하므로 "담당 의료진이 알려 준 기준" 으로 돌려보낸다.
 */
export interface EmergencySign {
  id: string
  /** 무엇이 보이면 */
  when: string
  /** 어떻게 하시라 */
  then: string
}

export function emergencySigns(patient: PatientContext): EmergencySign[] {
  const c = new Set(patient.conditions)
  const meds = new Set(patient.medications)
  const out: EmergencySign[] = []
  const neutropenic = patient.phase === 'neutropenia' || c.has('호중구감소증') ||
    patient.phase === 'during_chemo'
  if (neutropenic) {
    out.push({
      id: 'fever',
      when: '열이 38 ℃ 이상이거나 오한이 들 때',
      then: '해열제로 열만 내리고 기다리지 마시고 바로 병원(응급실)에 연락하세요. 항암치료 중의 열은 몇 시간 안에 나빠질 수 있습니다.'
    })
  }
  if (c.has('와파린복용') || meds.has('warfarin')) {
    out.push({
      id: 'bleeding',
      when: '검은 변, 피 섞인 소변, 멎지 않는 코피·잇몸 피가 날 때',
      then: '바로 담당 의료진께 연락하세요.'
    })
  }
  if (c.has('설사') || c.has('장루보유') || c.has('오심·구토')) {
    out.push({
      id: 'dehydration',
      when: '설사·구토가 멎지 않고 소변이 눈에 띄게 줄거나 어지러울 때',
      then: '물을 마셔도 따라잡지 못하는 상태일 수 있습니다. 담당 의료진께 연락하세요.'
    })
  }
  if (c.has('연하곤란')) {
    out.push({
      id: 'aspiration',
      when: '드실 때마다 기침·사레가 들거나, 식사 뒤 열이 날 때',
      then: '음식이 기도로 넘어가고 있을 수 있습니다. 담당 의료진께 알려 주세요.'
    })
  }
  if (c.has('장루보유') || patient.cancer === 'colorectal' || patient.cancer === 'gyn') {
    out.push({
      id: 'obstruction',
      when: '배가 아프면서 토하고, 가스·변이 나오지 않을 때',
      then: '드시는 것을 멈추고 바로 진료를 받으세요.'
    })
  }
  /* 재영양 단계(처음 일주일) — 재영양증후군의 신호 */
  if (refeedingStage(patient)) {
    out.push({
      id: 'refeeding',
      when: '드시기 시작한 뒤 가슴이 두근거리거나, 숨이 차거나, 몸이 붓거나, 심하게 기운이 없을 때',
      then: '재영양증후군의 신호일 수 있습니다. 바로 담당 의료진께 연락하세요.'
    })
  }
  return out
}
