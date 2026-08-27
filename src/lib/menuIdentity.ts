import type { PatientContext, SelectedItem } from '../data/types'

/**
 * 추천 화면이 '조건이 달라졌다' 고 볼 기준.
 *
 * 추천 화면은 지금까지 만들어 둔 안(drafts)을 들고 있다가 '다시 구성' 으로 앞뒤를 오간다.
 * 조건이 달라지면 그 안들은 다른 사람의 식단이 되므로 버려야 한다 —
 * 문제는 '달라졌다' 를 어떻게 재느냐다.
 *
 * 예전에는 리액트의 의존성 목록에 값을 그대로 넣어 껍데기(참조)로 견주었다.
 * 그것이 두 자리에서 탈이 났다.
 *
 * 하나, 담으신 것이 없는 날에는 `state.diary[day] ?? []` 가 그릴 때마다 새 빈 배열을 만들어,
 * 앱의 무엇이든 바뀌면(체중을 적으셔도) '식단이 달라졌다' 로 읽혔다.
 *
 * 둘, 보여 드린 상을 적어 두기 시작하자(shown) 상을 하나 보여 드릴 때마다
 * '최근에 드신 것' 지도가 새 것이 되었다. 담긴 내용은 똑같은데도 —
 * 오늘 것은 애초에 세지 않으므로 오늘 무엇을 보여 드렸든 내용은 그대로다.
 * 그 바람에 '다시 구성' 을 누르면 새 안을 만들자마자 버려져,
 * 눌러도 아무 일이 없는 것처럼 보였다.
 *
 * 그래서 껍데기가 아니라 내용으로 견준다. 이 함수가 그 잣대다.
 */
export function menuConditionKey(
  patient: PatientContext,
  selected: SelectedItem[],
  supplementIds: string[],
  day: string,
  recent: Map<string, number>
): string {
  const who = [
    patient.cancer, patient.phase, patient.sex, patient.age,
    patient.weightKg, patient.heightCm, patient.weightLossPct,
    [...patient.conditions].sort().join('·'),
    [...patient.medications].sort().join('·'),
    [...(patient.cuisines ?? [])].sort().join('·'),
    [...(patient.subtypes ?? [])].sort().join('·')
  ].join('|')

  /* 담으신 것 — 순서가 달라진 것만으로 다른 식단이 되지는 않는다 */
  const plate = selected
    .map((i) => `${i.foodId}:${i.servings}:${i.meal ?? ''}`)
    .sort()
    .join(',')

  const supps = [...supplementIds].sort().join(',')

  /* 최근에 드신 것 — 오늘 것은 recentFoods 가 애초에 빼므로 여기 들어올 일이 없다 */
  const hist = [...recent]
    .map(([id, ago]) => `${id}:${ago}`)
    .sort()
    .join(',')

  return `${who}#${day}#${plate}#${supps}#${hist}`
}
