/**
 * 받아 온 식품에 임상 태그가 제대로 붙는가.
 *
 * 규칙은 태그로 걸린다. 그런데 손으로 등록한 542종에만 태그가 붙어 있어서,
 * 검색으로 만나는 것의 97%에서 규칙의 상당 부분이 조용히 작동하지 않았다.
 * 실제로 호중구감소증 환자에게 회덮밥·물회가 아무 말 없이 지나갔고,
 * 모듬회는 분류가 육류라 단백질 규칙에 걸려 **권장**으로 나왔다.
 *
 * 이 검사는 두 방향을 다 본다.
 *   1. 붙어야 할 것에 붙는가 — 안 붙으면 드시면 안 될 것을 드시게 된다
 *   2. 붙지 말아야 할 것에 안 붙는가 — 헛경보가 잦으면 진짜 경고를 안 믿게 된다
 *
 * 기대값은 autoTags 를 불러서 만들지 않는다. 그 함수가 틀리면 기대값도 함께 틀린다.
 * 아래 목록은 실제 자료에서 눈으로 골라 손으로 적은 것이다.
 */
import { evaluateFood } from '../../src/engine/rules'
import { GENERATED_CORE } from '../../src/data/foods/generated'
import { CURATED_FOODS } from '../../src/data/foods/index'
import { autoTags } from '../../src/data/foods/autoTag'
import type { Food, PatientContext } from '../../src/data/types'

const bads: string[] = []
const no = (cond: boolean, msg: string) => { if (cond) bads.push(msg) }

/* ── 손으로 고른 기대값 ──────────────────────────────── */

/** 날것 동물성이 맞는 것 */
const RAW_YES = [
  '회덮밥', '회덮밥_모듬', '회덮밥_참치', '물회', '물회_생선', '물회_오징어',
  '회무침', '회무침_서대', '회무침_가오리', '모듬회', '육회', '육회비빔밥',
  '회냉면', '초밥_광어', '초밥_모듬', '홍어회무침', '간재미회무침',
  /* 식약처가 양념까지 포함한 요리를 적는 방식 — 조미료가 아니라 회덮밥이다 */
  '우럭회덮밥_양념장', '참치회덮밥_양념장', '넙치(광어)회덮밥_양념장'
]
/** 이름이 비슷하지만 날것이 아닌 것 — 여기 붙으면 헛경보다 */
const RAW_NO = [
  '유부 초밥',            // 날생선이 없다
  '문어숙회',              // 숙회 — 데쳐 익힌 것
  '오징어무침',            // 데쳐 무친다
  '낙지무침', '문어무침', '갑오징어무침',
  '사시미간장', '회초장', '육회소스', '물회육수',   // 조미료
  '초밥김', '스시노리 토비 60컷',                 // 김
  '강릉상회 국내산 소고기육포세트',                 // 상호
  '한강 회오리 라떡볶이', '페스츄리회오리핫도그',
  '청경채한우죽 밀키트(2회분)',                   // 수량
  '로투스시나몬쿠키', '파머스시크릿 과일향 쥬브스 젤리',  // 이름에 우연히 든 것
  '초밥용 조미가리비(자숙) (가리비살97%함유)'        // 자숙 — 삶은 것
]
const CURED_YES = ['소시지볶음', '김치찌개_햄', '핫도그_핫도그', '피자_베이컨체다 피자']
const CURED_NO = ['햄버거', '햄버거_불고기버거']
const GRAPE_YES = ['과ㆍ채주스_자몽 주스', '기타차_자몽 그린티 (J)']
const GRAPE_NO = ['더 듬뿍 오렌지 앤 자몽 케이크', '저분자몽모랑시타트체리콜라겐스틱']

const has = (name: string, tag: string) => autoTags(name).includes(tag as never)

for (const n of RAW_YES) no(!has(n, '생식동물성'), `"${n}" 에 생식동물성이 안 붙는다 — 날것인데 조용히 지나간다`)
for (const n of RAW_NO) no(has(n, '생식동물성'), `"${n}" 에 생식동물성이 붙었다 — 날것이 아니다. 헛경보는 진짜 경고를 죽인다`)
for (const n of CURED_YES) no(!has(n, '가공육'), `"${n}" 에 가공육이 안 붙는다`)
for (const n of CURED_NO) no(has(n, '가공육'), `"${n}" 에 가공육이 붙었다 — 패티는 가공육이 아니다`)
for (const n of GRAPE_YES) no(!has(n, '자몽계'), `"${n}" 에 자몽계가 안 붙는다 — 약물 상호작용을 놓친다`)
for (const n of GRAPE_NO) no(has(n, '자몽계'), `"${n}" 에 자몽계가 붙었다 — 향만 낸 것까지 막으면 진짜 경고를 안 믿게 된다`)

/* ── 자료 전체에서 실제로 작동하는가 ─────────────────── */

const ALL: Food[] = [...CURATED_FOODS, ...GENERATED_CORE]
const patient = {
  cancer: 'breast', phase: 'neutropenia', weightKg: 60, heightCm: 163,
  age: 55, sex: 'F', weightLossPct: 0, conditions: [], medications: [],
  history: [], cuisines: ['한식'], onboarded: true
} as unknown as PatientContext

/*
 * 이름만 보고 '이건 날것이다' 라고 사람이 읽을 수 있는 것을 따로 훑는다.
 * autoTags 와 다른 잣대여야 의미가 있으므로, 여기서는 좁고 확실한 것만 본다.
 */
const OBVIOUS = /^(회덮밥|물회|육회|모듬회|회무침|회냉면|생선회)|회$|초밥/
/*
 * 이 그물도 넓으면 헛것을 잡는다. 실제로 두 가지가 걸렸다 —
 * '파강회' 는 데친 쪽파로 묶는 것이고, '김류,초밥김,전체,말린것' 은 마른 김이다.
 * 둘 다 날것이 아니므로 앱이 조용한 것이 옳다.
 */
const NOT_RAW = /유부|계란|강회|숙회|김류|초밥김|스시노리|소스|간장|초장|육수|자숙/
const obvious = ALL.filter((f) => OBVIOUS.test(f.name) && !NOT_RAW.test(f.name))

let silent = 0, praised = 0
for (const f of obvious) {
  const v = evaluateFood(f, patient) as { level?: string }
  if (v.level === 'prefer') {
    praised++
    bads.push(`호중구감소증인데 "${f.name}" 을 권장으로 내놓는다`)
  } else if (v.level !== 'avoid' && v.level !== 'caution') {
    silent++
    bads.push(`호중구감소증인데 "${f.name}" 에 아무 말이 없다`)
  }
}

/* 검사가 헛돌지 않는지 — 훑은 것이 0 이면 아무것도 확인하지 않은 것이다 */
const tagged = { raw: 0, cured: 0, grape: 0 }
for (const f of GENERATED_CORE) {
  const t = f.tags ?? []
  if (t.includes('생식동물성' as never)) tagged.raw++
  if (t.includes('가공육' as never)) tagged.cured++
  if (t.includes('자몽계' as never)) tagged.grape++
}
no(tagged.raw === 0, '생식동물성이 하나도 안 붙었다 — 자동 태그가 끊겼다')
no(tagged.cured === 0, '가공육이 하나도 안 붙었다')
no(tagged.grape === 0, '자몽계가 하나도 안 붙었다')
no(obvious.length < 20, `훑은 날것이 ${obvious.length}건뿐 — 검사가 헛돌고 있다`)

console.log(
  bads.length
    ? `자동 태그 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
    : `자동 태그 검사 완료 — 날것 ${obvious.length}건이 모두 경고됨 · ` +
      `번들에 붙은 태그 (생식동물성 ${tagged.raw} · 가공육 ${tagged.cured} · 자몽계 ${tagged.grape}), 문제 없음`
)
if (bads.length) process.exitCode = 1
