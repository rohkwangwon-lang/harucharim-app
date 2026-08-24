/**
 * 두 번째 검사 — 날짜 계산, 기록 정규화, 성분 판정, 데이터 무결성.
 * 첫 검사(fuzz.ts)가 추천 엔진을 봤다면 여기는 그 바깥을 본다.
 */
import { toKey, fromKey, addDays, addMonths, daysAgo, label, weekOf, monthOf, calendarGrid, monthLabel } from '../../src/lib/day'
import { judgeProduct } from '../../src/engine/ingredientVerdict'
import { defaultSlotFor } from '../../src/engine/menu'
import { foodContribution, fmt, NUTRIENT_META } from '../../src/engine/nutrition'
import { FOODS, CURATED_FOODS, FOOD_BY_ID } from '../../src/data/foods'
import { SUPPLEMENTS } from '../../src/data/supplements'
import { CANCERS } from '../../src/data/cancers'
import { MEAL_SLOTS } from '../../src/data/types'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import type { PatientContext } from '../../src/data/types'

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
      if (!it.reason?.trim()) bad('성분 판정에 사유 없음', `${it.name}`)
      if (!it.evidence) bad('성분 판정에 근거수준 없음', `${it.name}`)
      if (!['avoid','caution','prefer','info'].includes(it.level)) bad('성분 판정 등급 이상', `${it.name}=${it.level}`)
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

console.log(`\n두 번째 검사 완료 — 문제 ${bugs.length}종`)
const grouped = new Map<string, string[]>()
for (const b of bugs) { const k = b.split(' :: ')[0]; if (!grouped.has(k)) grouped.set(k, []); grouped.get(k)!.push(b.split(' :: ')[1]) }
for (const [k, list] of [...grouped].sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`■ ${k}  (${list.length}종)`)
  list.slice(0, 5).forEach(d => console.log('   -', d))
  if (list.length > 5) console.log(`   … 외 ${list.length-5}종`)
}
if (!bugs.length) console.log('문제 없음')
