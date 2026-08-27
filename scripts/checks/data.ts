import { readFileSync, readdirSync } from 'node:fs'
import { portionLabel } from '../../src/lib/portion'
import { INGREDIENT_DISHES } from '../../src/data/foods/ingredientDishes'
/**
 * 두 번째 검사 — 날짜 계산, 기록 정규화, 성분 판정, 데이터 무결성.
 * 첫 검사(fuzz.ts)가 추천 엔진을 봤다면 여기는 그 바깥을 본다.
 */
import { toKey, fromKey, addDays, addMonths, daysAgo, label, weekOf, monthOf, calendarGrid, monthLabel } from '../../src/lib/day'
import { judgeProduct } from '../../src/engine/ingredientVerdict'
import { defaultSlotFor } from '../../src/engine/menu'
import { foodContribution, fmt, NUTRIENT_META } from '../../src/engine/nutrition'
import { FOODS, CURATED_FOODS, FOOD_BY_ID, isIngredientOnly } from '../../src/data/foods'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { CANCERS } from '../../src/data/cancers'
import { MEAL_SLOTS } from '../../src/data/types'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { NutrientKey, PatientContext } from '../../src/data/types'
import { evaluateFood } from '../../src/engine/rules'

/** 조미료처럼 이름에 조리가 들어가도 재료인 것 */
const SEASONING_LIKE = /^(고춧가루|참기름|들기름|멸치액젓|새우젓|멸치젓|멸치육수)$/

let seed = 777
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length]

const bugs: string[] = []
const seenB = new Set<string>()
const bad = (k: string, d: string) => { const s = `${k} :: ${d}`; if (!seenB.has(s)) { seenB.add(s); bugs.push(s) } }

/* ── 1. 날짜 계산 ───────────────────────────────────── */
{
  // 연말·윤년·월말 경계를 포함해 20년치를 훑는다
  const start = new Date(2020, 0, 1)
  for (let i = 0; i < 7300; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const k = toKey(d)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) bad('날짜 형식', k)
    if (toKey(fromKey(k)) !== k) bad('왕복 변환 불일치', k)
    if (addDays(addDays(k, 1), -1) !== k) bad('addDays 왕복 불일치', k)

    const w = weekOf(k)
    if (w.length !== 7) bad('주 길이', `${k} → ${w.length}`)
    if (fromKey(w[0]).getDay() !== 0) bad('주 시작이 일요일 아님', `${k} → ${w[0]}`)
    if (!w.includes(k)) bad('그 날이 자기 주에 없음', k)
    for (let j = 1; j < 7; j++) if (addDays(w[j-1], 1) !== w[j]) bad('주가 연속하지 않음', `${k} ${w[j-1]}→${w[j]}`)

    if (i % 29 === 0) {
      const mo = monthOf(k)
      const dt = fromKey(k)
      const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
      if (mo.length !== lastDay) bad('그 달 일수 틀림', `${k} ${mo.length}≠${lastDay}`)
      if (!mo.includes(k)) bad('그 날이 자기 달에 없음', k)
      const g = calendarGrid(k)
      if (g.length % 7 !== 0) bad('달력 격자가 7의 배수 아님', `${k} ${g.length}`)
      if (g.filter(Boolean).length !== mo.length) bad('달력 격자 날짜 수 불일치', k)
      if (!monthLabel(k).includes('월')) bad('월 표시 이상', k)
      // 월 이동: 1월 31일에서 +1개월이 3월로 튀지 않아야 한다
      const nm = addMonths(k, 1)
      const expect = (dt.getMonth() + 1) % 12
      if (fromKey(nm).getMonth() !== expect) bad('addMonths 가 달을 건너뜀', `${k} → ${nm}`)
      if (addMonths(addMonths(k, 1), -1) !== toKey(new Date(dt.getFullYear(), dt.getMonth(), 1))) bad('addMonths 왕복', `${k} → ${addMonths(addMonths(k,1),-1)}`)
    }
    if (!label(k)) bad('날짜 표시 비었음', k)
  }
  // daysAgo 부호
  if (daysAgo(addDays(toKey(), -3)) !== 3) bad('daysAgo 부호', String(daysAgo(addDays(toKey(), -3))))
  if (daysAgo(toKey()) !== 0) bad('오늘의 daysAgo', String(daysAgo(toKey())))
}

/* ── 2. 데이터 무결성 ───────────────────────────────── */
{
  const ids = new Set<string>()
  for (const f of FOODS) {
    if (ids.has(f.id)) bad('식품 id 중복', f.id)
    ids.add(f.id)
    if (!f.name?.trim()) bad('식품 이름 없음', f.id)
    if (!f.serving || !(f.serving.g > 0)) bad('1회 제공량 이상', `${f.id} ${f.name} g=${f.serving?.g}`)
    if (!f.serving?.label?.trim()) bad('제공량 표기 없음', `${f.id} ${f.name}`)
    if (!f.group) bad('식품군 없음', `${f.id} ${f.name}`)
    if (!f.per100 || typeof f.per100.kcal !== 'number') bad('열량 없음', `${f.id} ${f.name}`)
    for (const [k, v] of Object.entries(f.per100)) {
      if (v == null) continue
      if (!Number.isFinite(v as number)) bad('성분값이 숫자가 아님', `${f.id} ${k}=${v}`)
      if ((v as number) < 0) bad('성분값 음수', `${f.id} ${f.name} ${k}=${v}`)
    }
    // 100 g 안에 들어갈 수 없는 양.
    // 값이 없는 성분은 비교에서 뺀다 — 없는 것과 0 은 다르다.
    const P = f.per100
    if (P.carb !== undefined && P.protein !== undefined && P.fat !== undefined) {
      const g100 = P.carb + P.protein + P.fat
      if (g100 > 100.5) bad('다량영양소 합이 100 g 초과', `${f.id} ${f.name} ${g100.toFixed(1)}g`)
    }
    if ((P.kcal ?? 0) > 902) bad('100 g 당 열량이 지방보다 큼', `${f.id} ${f.name} ${P.kcal}`)
    if (P.satFat !== undefined && P.fat !== undefined && P.satFat > P.fat + 0.5)
      bad('포화지방>총지방', `${f.id} ${f.name} ${P.satFat}>${P.fat}`)
    if (P.sugar !== undefined && P.carb !== undefined && P.sugar > P.carb + 0.5)
      bad('당류>탄수화물', `${f.id} ${f.name} ${P.sugar}>${P.carb}`)
    if ((P.na ?? 0) > 40000) bad('나트륨 비현실적', `${f.id} ${f.name} ${P.na}`)
    // 열량이 다량영양소로 설명되는가 (셋 다 값이 있을 때만)
    // 술은 알코올이 7 kcal/g 을 내므로 다량영양소만으로는 설명되지 않는다
    const isAlcohol = (P.alcohol ?? 0) > 0 || f.tags.includes('알코올' as never)
    if (!isAlcohol && P.carb !== undefined && P.protein !== undefined && P.fat !== undefined && (P.kcal ?? 0) > 40) {
      const calc = P.carb * 4 + P.protein * 4 + P.fat * 9
      if (calc > 0 && (P.kcal! > calc * 2.2 || P.kcal! < calc * 0.45))
        bad('열량과 다량영양소가 크게 안 맞음', `${f.id} ${f.name} 표기${P.kcal} 계산${Math.round(calc)}`)
    }
    // 1회 제공량 기준으로 말이 되는가 (검토분만)
    if (CURATED_FOODS.some(c => c.id === f.id)) {
      const c = foodContribution(f, 1)
      if ((c.kcal ?? 0) > 1200) bad('1회 제공량 열량 과다(검토분)', `${f.id} ${f.name} ${Math.round(c.kcal!)}`)
      if ((c.na ?? 0) > 6000) bad('1회 제공량 나트륨 과다(검토분)', `${f.id} ${f.name} ${Math.round(c.na!)}`)
    }
    if (!MEAL_SLOTS.includes(defaultSlotFor(f))) bad('기본 끼니 이상', f.id)
  }

  const sids = new Set<string>()
  for (const s of SUPPLEMENTS) {
    if (sids.has(s.id)) bad('영양제 id 중복', s.id)
    sids.add(s.id)
    if (!s.name?.trim()) bad('영양제 이름 없음', s.id)
    if (!s.category) bad('영양제 분류 없음', s.id)
    for (const [k, v] of Object.entries(s.perDay ?? {})) {
      if (v == null) continue
      if (!Number.isFinite(v as number) || (v as number) < 0) bad('영양제 성분값 이상', `${s.id} ${k}=${v}`)
    }
  }

  for (const c of CANCERS) {
    const t = c.target
    if (t.kcalPerKg[0] > t.kcalPerKg[1]) bad('암종 열량 범위 역전', c.id)
    if (t.proteinPerKg[0] > t.proteinPerKg[1]) bad('암종 단백질 범위 역전', c.id)
    if (t.fiberTarget && t.fiberTarget[0] > t.fiberTarget[1]) bad('암종 섬유 범위 역전', c.id)
    if ((t.naLimit ?? 2000) <= 0) bad('나트륨 상한 이상', c.id)
    if (!c.name?.trim()) bad('암종 이름 없음', c.id)
  }
}

/* ── 3. 성분 판정 (시판 제품) ───────────────────────── */
{
  const NAMES = [
    '비타민C 1000', '오메가3 알티지', '홍삼정 에브리타임', '밀크씨슬 실리마린',
    '쏘팔메토 옥타코사놀', '루테인 지아잔틴', '프로바이오틱스 유산균', '가르시니아 다이어트',
    '백수오 궁', '종합비타민 미네랄', '칼슘 마그네슘 비타민D 아연', '아르기닌 5000',
    '글루타민 파우더', '노니 분말', '차전자피 식이섬유', '', '???', '알 수 없는 제품명'
  ]
  const FNS = ['항산화', '혈행 개선', '면역력 증진', '간 건강', '전립선 건강', '체지방 감소', '', '갱년기 여성 건강']
  let judged = 0, unknown = 0
  for (let i = 0; i < 3000; i++) {
    const patient: PatientContext = {
      ...DEFAULT_PATIENT, onboarded: true,
      cancer: pick(CANCERS).id as any,
      phase: pick(['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']) as any,
      conditions: rnd() < 0.5 ? ['호중구감소증'] : rnd() < 0.5 ? ['와파린복용'] : [],
      medications: rnd() < 0.4 ? ['tamoxifen'] : []
    }
    let v: ReturnType<typeof judgeProduct>
    try { v = judgeProduct(pick(NAMES), pick(FNS), patient) }
    catch (e: any) { bad('judgeProduct 예외', e?.message); continue }
    judged++
    if (v.unknown) { unknown++; continue }
    if (!v.items.length) bad('판정했는데 근거 항목 없음', `${v.level}`)
    for (const it of v.items) {
      /*
       * 이름 칸은 name 이 아니라 ingredient 다.
       * 타입 검사를 안 받던 동안 여기가 늘 undefined 로 찍혔다 —
       * 문제를 잡아도 '무엇이' 인지 알 수 없는 메시지가 나갔다.
       */
      if (!it.reason?.trim()) bad('성분 판정에 사유 없음', `${it.ingredient}`)
      if (!it.evidence) bad('성분 판정에 근거수준 없음', `${it.ingredient}`)
      if (!['avoid','caution','prefer','info'].includes(it.level)) bad('성분 판정 등급 이상', `${it.ingredient}=${it.level}`)
    }
    // 개별 성분 중 avoid 가 있으면 전체도 avoid 여야 한다
    if (v.items.some(i => i.level === 'avoid') && v.level !== 'avoid') bad('금기 성분인데 전체 판정이 완화됨', `${v.level}`)
  }
  console.log(`  성분 판정 ${judged}건 (원료 못 찾음 ${unknown}건)`)
}

/* ── 4. 표시 형식 ───────────────────────────────────── */
{
  for (const m of NUTRIENT_META) {
    for (const v of [0, 0.004, 0.5, 1, 999.95, 123456.789]) {
      const s = fmt(v, m.digits)
      if (!s || s === 'NaN' || s.includes('undefined')) bad('숫자 표시 이상', `${m.key} ${v} → ${s}`)
    }
  }
}


/* ─────────────────── 내보내고 안 쓰는 것 ─────────────────── */

/*
 * 아무 데서도 부르지 않는 함수가 남아 있으면, 읽는 사람은 그것이
 * 어딘가 쓰이는 줄 알고 함부로 고치지 못한다. 실제로 아홉 개가 쌓여 있었다 —
 * 화면을 고치면서 자리를 옮기고 옛 자리를 지우지 않은 것들이다.
 *
 * 쓰이지 않는 출처를 검사하는 것과 같은 이유다. 넣어 두고 안 쓰는 것이 있으면
 * 그건 앱의 일부가 아니라 앱에 대한 잘못된 설명이 된다.
 */
{
  const files: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${e.name}`
      if (e.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(e.name)) files.push(full)
    }
  }
  walk('src')
  walk('scripts')

  const text = files.map((f) => readFileSync(f, 'utf8')).join('\n')
  const declared = new Map<string, string>()
  for (const f of files) {
    if (!f.startsWith('src/')) continue
    const t = readFileSync(f, 'utf8')
    for (const m of t.matchAll(/export (?:async )?(?:function|const) (\w+)/g)) declared.set(m[1], f)
  }
  /* 진입점은 스스로를 부르지 않는다 */
  const ENTRY = new Set(['App'])
  for (const [name, file] of declared) {
    if (ENTRY.has(name)) continue
    const uses = text.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0
    /* 선언 한 번 + 그 파일 안 쓰임까지 쳐서, 다른 데서 한 번도 안 부르면 죽은 것이다 */
    if (uses <= 1) bad('내보내고 아무 데서도 쓰지 않음', `${name} — ${file}`)
  }
}


/* ─────────────────── 위험한 성분을 실제로 잡는가 ─────────────────── */

/*
 * 처음에는 "값이 높은데 태그가 없다" 를 셌다. 그런데 131건이 나왔고,
 * 그걸 다 손으로 붙이는 것은 또 다른 사람이 또 빠뜨릴 일을 만드는 것뿐이었다.
 * 라벨은 사람이 붙이니 언제든 빠진다.
 *
 * 그래서 규칙이 성분표의 숫자로도 걸리게 고치고, 여기서는 라벨이 아니라
 * 결과를 본다 — 이 환자에게 위험한 양이 든 음식을 앱이 실제로 잡아내는가.
 * 시금치된장국(건더기 위주)이 와파린 드시는 분께 '권장' 으로 나가던 것이
 * 이 검사에 걸린다.
 */
{
  const CASES: { what: string; key: NutrientKey; over: number; patient: Partial<PatientContext> }[] = [
    { what: '와파린 · 비타민 K', key: 'vitK', over: 100, patient: { medications: ['warfarin'] } },
    { what: '신기능저하 · 칼륨', key: 'k', over: 400, patient: { conditions: ['신기능저하'] } },
    { what: '신기능저하 · 인', key: 'p', over: 300, patient: { conditions: ['신기능저하'] } }
  ]
  for (const c of CASES) {
    const p = { ...DEFAULT_PATIENT, conditions: [], medications: [], subtypes: [], ...c.patient } as PatientContext
    let missed = 0
    for (const f of CURATED_FOODS) {
      const v = f.per100[c.key]
      if (typeof v !== 'number') continue
      /* 규칙은 '초과' 로 걸린다. 검사도 같은 눈금을 써야 경계값에서 헛돌지 않는다 */
      if ((v * f.serving.g) / 100 <= c.over) continue
      const verdict = evaluateFood(f, p, 1)
      if (verdict.level === 'caution' || verdict.level === 'avoid') continue
      missed++
      if (missed <= 3)
        bad('위험한 양인데 아무 말도 하지 않음', `${c.what} — ${f.name} ${Math.round((v * f.serving.g) / 100)}`)
    }
    if (missed > 3) bad('위험한 양인데 아무 말도 하지 않음', `${c.what} — 외 ${missed - 3}종`)
  }
}


/* ─────────────────── 재료를 반찬으로 내놓지 않는가 ─────────────────── */

/*
 * 쑥·냉이·물냉이·건표고버섯이 반찬으로 추천되었다.
 * 쑥은 떡이나 국에 넣는 것이지 한 접시로 놓는 것이 아니고,
 * 마른 표고는 불려서 볶아야 반찬이 된다.
 *
 * 과일에서 한 번, 조리된 생선·고기에서 한 번, 밥과 김치에서 한 번,
 * 그리고 이번이 네 번째다. 매번 '무엇이 재료인가' 를 손으로 고쳐 왔는데
 * 그 판단이 맞는지 확인할 길이 없어서 같은 일이 되풀이됐다.
 *
 * 손으로 적은 판단이라 규칙으로 검사할 수는 없다. 대신 눈으로 볼 수 있게
 * 목록을 뽑아 두고, 뻔한 것만 못 박는다 —
 * 조리 표시가 붙었는데 재료라고 하거나, 그 반대인 경우.
 */
{
  /* 이름에 조리·저장이 드러나면 상에 오르는 것이다 */
  const COOKED = /나물|무침|볶음|조림|찜$|구이|김치|장아찌|\((데친 것|삶은 것|찐 것|구운 것|가열)/
  /* 이름에 손질 전이 드러나면 재료다 */
  const RAW = /\((생것|생|말린 것|가루|건면|생쌀)\)$/

  for (const f of CURATED_FOODS) {
    const ing = isIngredientOnly(f)
    /*
     * '(생)' 이 붙었으면 이름에 '나물' 이 있어도 아직 재료다 — 콩나물(생).
     * 손질 전이라는 표시가 조리 표시보다 앞선다.
     */
    if (RAW.test(f.name)) {
      if (!ing) bad('손질 전인데 상에 오른다고 봄', f.name)
      continue
    }
    /*
     * 조리 표시가 있어도 재료인 것이 있다.
     *
     * 처음에는 '삶은/데친' 이 붙으면 먹는 것으로 보았다. 그런데 삶은 팥과 삶은 콩,
     * 삶은 면(사리)은 그대로 먹지 않는다 — 콩자반이 되고, 팥죽이 되고, 국수가 된다.
     * 실제로 "잡곡밥 + 팥(삶은 것)" 이 아침으로 나갔다.
     *
     * 그러니 규칙을 바꾼다. 조리 표시가 있는데 재료로 두었다면,
     * **그것으로 만드는 요리를 등록해 두었는가** 를 본다.
     * 빼기만 하고 길을 안 알려 주면 담으신 분이 "왜 아무 말이 없지" 로 끝난다.
     */
    if (COOKED.test(f.name) && ing && !SEASONING_LIKE.test(f.name)) {
      if (!INGREDIENT_DISHES[f.name]?.length)
        bad('재료로 두었는데 만들 요리를 안 알려 줌', f.name)
    }
  }

  /*
   * 채소·버섯 가운데 상에 오른다고 본 것을 모두 적어 둔다.
   * 숫자가 크게 움직이면 누군가 분류를 건드린 것이고, 그때 이 목록을 보면 된다.
   */
  const produce = CURATED_FOODS
    .filter((f) => (f.group === '채소' || f.group === '해조·버섯') && !isIngredientOnly(f))
    .map((f) => f.name)
  console.log(`  채소·해조 중 그대로 상에 오르는 것 ${produce.length}종`)
  console.log(`    ${produce.join(', ')}`)
  if (produce.length > 30) bad('채소를 너무 많이 상에 올림', `${produce.length}종 — 대부분은 조리해야 반찬이 된다`)
}

/*
 * 반 접시를 반 접시라고 읽히게 적는가.
 *
 * 엔진이 0.5 인분을 놓기 시작하자 화면에 '밥 1공기 반' 이 나왔다.
 * 반 공기를 담으라는 말인데 한 공기 반으로 읽힌다 — 양을 세 배로 잘못 읽게 만든다.
 * 담는 양을 잘못 읽으시면 하루 열량이 통째로 어긋나므로, 모든 담는 단위를 한 번씩 훑는다.
 */
{
  const labels = [...new Set(CURATED_FOODS.map((f) => f.serving.label))]
  for (const l of labels) {
    const half = portionLabel(l, 0.5)
    /* 숫자 뒤에 '반' 이 붙으면 '한 공기 반' 으로 읽힌다 */
    if (/\d\s*[가-힣]+\s*반$/.test(half))
      bad('반 접시 표기가 더 많은 양으로 읽힘', `'${l}' 의 절반이 '${half}' 로 나온다`)
    /* 절반인데 '반' 도 '0.5' 도 없으면 몇을 담으라는 것인지 알 수 없다 */
    if (!/반/.test(half) && !/0\.5/.test(half))
      bad('절반인데 절반으로 보이지 않음', `'${l}' → '${half}'`)
  }
  console.log(`  담는 단위 ${labels.length}종의 절반 표기 확인`)
}

console.log(`\n두 번째 검사 완료 — 문제 ${bugs.length}종`)
const grouped = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!grouped.has(k)) grouped.set(k, []); grouped.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, list] of [...grouped].sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`■ ${k}  (${list.length}종)`)
  list.slice(0, 5).forEach(d => console.log('   -', d))
  if (list.length > 5) console.log(`   … 외 ${list.length-5}종`)
}
if (!bugs.length) console.log('문제 없음')
