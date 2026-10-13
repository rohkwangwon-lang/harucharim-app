/**
 * 상식 검사 — 앱 밖의 잣대로 앱이 하는 말을 본다.
 *
 * 다른 검사들은 "피해야 할 것을 권했는가" 를 엔진 스스로의 판정으로 잰다.
 * 그 잣대로는 엔진이 틀리게 판정한 것을 잡지 못한다. 실제로 두 가지가 그렇게 빠져나갔다.
 *
 *  · 치료를 마친 분께 육회가 "권장 — 채소 중심 식사는 체중과 대사 양쪽에서 도움이 됩니다" 로 떴다.
 *    자료가 식이섬유 숫자만 보고 고기에 '고식이섬유' 를 달았기 때문이다.
 *  · 자몽이 약을 하나도 고르지 않은 분께도 "항암제 농도를 예측할 수 없게 바꿉니다" 라며 '피하세요' 로 떴다.
 *
 * 둘 다 엔진 안에서는 '규칙대로' 였다. 틀린 것은 규칙과 태그가 세상과 어긋난 자리다.
 * 그래서 여기서는 **음식의 이름과 실제 영양 수치, 환자가 고른 것**만 가지고 따로 잣대를 세운다.
 *
 * 이 검사가 내는 것은 대부분 '살펴볼 것' 이다. 이름으로 세운 잣대는 거칠어서 틀린 경보가 섞인다.
 * 무너짐(예외·NaN)만 실패로 치고, 나머지는 건수와 예를 적어 사람이 판단하게 한다.
 *
 *   node_modules/.bin/jiti scripts/checks/sense.ts
 *   SEED=12345 PEOPLE=600 node_modules/.bin/jiti scripts/checks/sense.ts
 */
import fs from 'node:fs'
import { envSeed } from './_seed'
import path from 'node:path'
import { CURATED_FOODS } from '../../src/data/foods'
import { GENERATED_CORE, unpack, type PackedFoods } from '../../src/data/foods/generated'
import { COMMON_RULES } from '../../src/data/commonRules'
import { CONDITION_RULES } from '../../src/data/conditionRules'
import { CANCERS } from '../../src/data/cancers'
import { MEDICATIONS } from '../../src/data/interactions'
import { evaluateFood, activeRules, activeInteractions } from '../../src/engine/rules'
import { foodContribution, personalTarget } from '../../src/engine/nutrition'
import { buildDayMenu } from '../../src/engine/menu'
import { DEFAULT_PATIENT } from '../../src/lib/store'
import { SUBTYPE_OPTIONS } from '../../src/data/types'
import type { Food, PatientCondition, PatientContext, Phase, TreatmentHistory, MealSlot } from '../../src/data/types'

const PEOPLE = Number(process.env.PEOPLE ?? 400)
let seed = envSeed(20261013)
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length) % a.length]
const some = <T,>(a: readonly T[], n: number): T[] => {
  const pool = [...a]; const out: T[] = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  return out
}

/* ── 음식 — 내장 18,298종과, 내려받는 가공식품 27만 종까지 ───────── */
const CORE: Food[] = [...CURATED_FOODS, ...GENERATED_CORE]
const extPath = path.join(process.cwd(), 'public/data/foods-extended.json')
const EXT: Food[] = fs.existsSync(extPath) ? unpack(JSON.parse(fs.readFileSync(extPath, 'utf8')) as PackedFoods, 'kx-') : []
const ALL: Food[] = [...CORE, ...EXT]

/* ── 환자 ─────────────────────────────────────────────── */
const PHASES: Phase[] = ['during_rt', 'during_chemo', 'neutropenia', 'post_op', 'survivorship']
const CONDS = Object.keys(CONDITION_RULES) as PatientCondition[]
const HIST: TreatmentHistory[] = ['수술', '방사선치료', '항암화학요법', '항호르몬치료', '표적치료', '면역항암제', '조혈모세포이식']
const MED_IDS = MEDICATIONS.map((m) => m.id)

function person(over: Partial<PatientContext> = {}): PatientContext {
  const c = pick(CANCERS)
  const sex = c.id === 'prostate' ? 'M' : c.id === 'gyn' ? 'F' : c.id === 'breast' ? (rnd() < 0.97 ? 'F' : 'M') : pick(['M', 'F'] as const)
  const subs = (SUBTYPE_OPTIONS as Record<string, { id: string }[] | undefined>)[c.id] ?? []
  return {
    ...DEFAULT_PATIENT,
    cancer: c.id,
    subtypes: rnd() < 0.4 && subs.length ? (some(subs, 1 + Math.floor(rnd() * 2)).map((s) => s.id) as never) : [],
    phase: pick(PHASES),
    weightKg: Math.round(32 + rnd() * 90),
    heightCm: Math.round(142 + rnd() * 50),
    age: Math.round(14 + rnd() * 80),
    sex,
    weightLossPct: rnd() < 0.35 ? Math.round(rnd() * 18) : 0,
    conditions: some(CONDS, rnd() < 0.3 ? 0 : 1 + Math.floor(rnd() * 3)),
    medications: some(MED_IDS, rnd() < 0.45 ? 0 : 1 + Math.floor(rnd() * 3)),
    history: some(HIST, Math.floor(rnd() * 3)),
    cuisines: ['한식'],
    onboarded: true,
    ...over
  } as PatientContext
}
const label = (p: PatientContext) =>
  `${p.cancer}/${p.phase}/${p.sex}${p.age}/${p.weightKg}kg cond=[${p.conditions.join(',')}] med=[${p.medications.join(',')}]`

/* ── 기록 ─────────────────────────────────────────────── */
type Finding = { n: number; ex: string[] }
const hard: string[] = []                      // 무너짐 — 실패
const look = new Map<string, Finding>()        // 살펴볼 것
function note(kind: string, example: string) {
  const f = look.get(kind) ?? { n: 0, ex: [] }
  f.n++; if (f.ex.length < 6 && !f.ex.includes(example)) f.ex.push(example)
  look.set(kind, f)
}
/*
 * 정해진 것 — 전문의가 보고 "그대로 둔다" 고 정한 것. 다시 '살펴볼 것' 으로 올리지 않고 건수만 적는다.
 *  · 상황을 전제로 한 문구("수술적 폐경 이후에는…", "위 수술을 받았다면…")는 그 상황을 고르지 않아도 띄운다 (2026-10-13)
 *  · 낫토·청국장은 와파린을 드시는 분께 '주의' — '피하세요' 로 올리지 않는다 (2026-10-13)
 */
const decided = new Map<string, number>()
const keep = (kind: string) => decided.set(kind, (decided.get(kind) ?? 0) + 1)
const t0 = Date.now()
const lap = (what: string) => console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}초] ${what}`)

console.log(`상식 검사 — 음식 ${ALL.length.toLocaleString()}종 (내장 ${CORE.length.toLocaleString()} · 내려받기 ${EXT.length.toLocaleString()}) · 가상 환자 ${PEOPLE}명 · 씨앗 ${seed}`)

/* ════ 1. 권장의 이유가 그 음식과 맞는가 ═══════════════════════
 *
 * 권장 규칙의 제목이 말하는 것(채소·섬유 / 단백질 / 칼슘)을 그 음식이 실제로 갖고 있는가.
 * 태그를 보지 않는다 — 태그가 틀렸을 때를 잡으려는 것이다. 군과 실제 수치로 본다.
 */
const ANIMAL = new Set(['육류', '가금류·난류'])
const NOT_PLANT = new Set(['육류', '가금류·난류', '유지·당류', '우유·유제품'])
/*
 * skip — 제목이 두 가지를 함께 말하면 한쪽만 맞아도 된다.
 * "열량과 단백질을 채우는 식품" 은 떡·견과처럼 열량으로 맞는 음식에도 붙는 것이 옳고,
 * "섬유와 수분은 함께" 는 물·우유에, "철분과 칼슘" 은 고기에 붙는 것이 옳다.
 * 잎채소는 1회 분량의 섬유가 적어도 채소이므로 섬유 숫자로 따지지 않는다.
 */
const TOPICS: { name: string; title: RegExp; skip?: RegExp; ok: (f: Food, n: Record<string, number | undefined>) => boolean }[] = [
  { name: '채소·섬유를 권하는 말이 식물성이 아닌 음식에', title: /채소|식이섬유|섬유|통곡|잡곡/, skip: /수분/, ok: (f) => !NOT_PLANT.has(f.group) },
  { name: '단백질을 권하는데 단백질이 1회 4 g 도 안 됨', title: /단백질/, skip: /열량|밀도/, ok: (_f, n) => n.protein === undefined || n.protein >= 4 },
  { name: '칼슘을 권하는데 칼슘이 1회 60 mg 도 안 됨', title: /칼슘/, skip: /철분/, ok: (_f, n) => n.ca === undefined || n.ca >= 60 }
]
{
  const ctxs: PatientContext[] = []
  for (const c of CANCERS) for (const ph of PHASES) ctxs.push(person({ cancer: c.id, phase: ph, conditions: [], medications: [], subtypes: [] }))
  for (let i = 0; i < 60; i++) ctxs.push(person())
  /* 내려받는 27만 종은 고르게 뽑아 본다 — 전부 × 110 맥락은 한 시간이 넘는다 */
  const extSample = EXT.filter((_f, i) => i % 9 === 0)
  const seen = new Set<string>()
  for (const p of ctxs) {
    for (const f of [...CORE, ...extSample]) {
      let v
      try { v = evaluateFood(f, p, 1) } catch (e) { hard.push(`판정이 무너짐: ${f.name} · ${label(p)} · ${(e as Error).message}`); continue }
      for (const h of v.hits) {
        if (h.rule.level !== 'prefer') continue
        const key = `${h.rule.id}|${f.id}`
        if (seen.has(key)) continue
        seen.add(key)
        const n = foodContribution(f, 1) as Record<string, number | undefined>
        for (const t of TOPICS) {
          if (t.title.test(h.rule.title) && !t.skip?.test(h.rule.title) && !t.ok(f, n)) {
            note(t.name, `${f.name} [${f.group}] ← "${h.rule.title}" (${h.rule.id})`)
          }
        }
        /* 고기에 식물 이야기는 따로 한 번 더 — 이번에 실제로 났던 일이다 */
        if (ANIMAL.has(f.group) && /채소|과일|통곡|잡곡/.test(h.rule.title)) {
          note('고기·달걀에 채소·과일·곡물을 권하는 말', `${f.name} ← "${h.rule.title}"`)
        }
      }
    }
  }
  lap(`권장의 이유 — 맥락 ${ctxs.length}가지 × 음식 ${(CORE.length + extSample.length).toLocaleString()}종, 서로 다른 (규칙·음식) ${seen.size.toLocaleString()}쌍`)
}

/* ════ 2. 고르지 않은 것을 전제로 말하는가 ═════════════════════
 *
 * 규칙의 제목이 어떤 상황을 말하는데(항암제·호중구·와파린·장루…), 환자는 그것을 고르지 않았다.
 * 자몽이 이것이었다. 제목만 본다 — 이유 글은 배경 설명으로 여러 상황을 두루 말한다.
 */
const MY_ANTICANCER = new Set(['capecitabine', 'tki-egfr', 'tki-alk', 'cdk46', 'sorafenib', 'bortezomib', 'cisplatin', 'oxaliplatin', 'irinotecan', 'methotrexate'])
const has = (p: PatientContext, c: string) => (p.conditions as string[]).includes(c)
const hist = (p: PatientContext, h: string) => ((p.history ?? []) as string[]).includes(h)
const CONTEXT: { word: RegExp; name: string; ok: (p: PatientContext) => boolean }[] = [
  { name: '항암제', word: /항암제|항암치료|항암 중|항암화학/, ok: (p) => p.phase === 'during_chemo' || p.phase === 'neutropenia' || p.medications.some((m) => MY_ANTICANCER.has(m)) || hist(p, '항암화학요법') },
  { name: '호중구', word: /호중구/, ok: (p) => p.phase === 'neutropenia' || has(p, '호중구감소증') },
  { name: '방사선', word: /방사선/, ok: (p) => p.phase === 'during_rt' || hist(p, '방사선치료') },
  { name: '수술', word: /수술|절제 후/, ok: (p) => p.phase === 'post_op' || has(p, '위절제후') || has(p, '장루보유') || hist(p, '수술') },
  { name: '와파린', word: /와파린/, ok: (p) => p.medications.includes('warfarin') || has(p, '와파린복용') },
  { name: '장루', word: /장루/, ok: (p) => has(p, '장루보유') },
  { name: '복수', word: /복수가|복수 /, ok: (p) => has(p, '복수') },
  { name: '간성뇌증', word: /간성뇌증/, ok: (p) => has(p, '간성뇌증위험') },
  { name: '신기능', word: /신기능|신장|콩팥|투석/, ok: (p) => has(p, '신기능저하') },
  { name: '당뇨', word: /당뇨/, ok: (p) => has(p, '당뇨') },
  { name: '삼킴', word: /삼키|연하/, ok: (p) => has(p, '연하곤란') || p.cancer === 'esophagus' || p.cancer === 'headneck' },
  { name: '스테로이드', word: /스테로이드/, ok: (p) => p.medications.includes('steroid') },
  { name: '항호르몬제', word: /타목시펜|아로마타제|안드로겐 차단|ADT/, ok: (p) => p.medications.some((m) => ['tamoxifen', 'ai', 'adt'].includes(m)) || hist(p, '항호르몬치료') }
]
{
  const fired = new Map<string, { title: string; level: string; ctx: string; total: number; off: number; ex: string }>()
  for (let i = 0; i < PEOPLE * 5; i++) {
    const p = person()
    let rules
    try { rules = activeRules(p) } catch (e) { hard.push(`규칙 수집이 무너짐: ${label(p)} · ${(e as Error).message}`); continue }
    for (const h of rules) {
      for (const c of CONTEXT) {
        if (!c.word.test(h.rule.title)) continue
        const k = `${h.rule.id}|${c.name}`
        const r = fired.get(k) ?? { title: h.rule.title, level: h.rule.level, ctx: c.name, total: 0, off: 0, ex: '' }
        r.total++
        if (!c.ok(p)) { r.off++; if (!r.ex) r.ex = label(p) }
        fired.set(k, r)
      }
    }
    /* 상호작용은 고른 약에만 — 고르지 않은 약의 상호작용이 나오면 안 된다 */
    for (const it of activeInteractions(p)) {
      if (!p.medications.includes(it.interaction.agent)) hard.push(`고르지 않은 약의 상호작용이 나옴: ${it.interaction.id} · ${label(p)}`)
      /*
       * 제목이 말하는 다른 약도 고르셨는가. "카페시타빈은 와파린 효과를 크게 증폭시킵니다" 가
       * 와파린을 안 드시는 분께 뜨고 있었다. 자기 약(agent) 이야기는 당연히 해당하므로 뺀다.
       */
      for (const c of CONTEXT) {
        if (!c.word.test(it.interaction.title) || c.ok(p)) continue
        if (c.name === '항암제' || c.name === '항호르몬제' || c.name === '스테로이드') continue   // 자기 약 이야기
        if (c.name === '와파린' && it.interaction.agent === 'warfarin') continue
        hard.push(`상호작용이 고르지 않은 '${c.name}' 를 전제로 말함: "${it.interaction.title}" · ${label(p)}`)
      }
    }
  }
  for (const [k, r] of [...fired].sort((a, b) => b[1].off / b[1].total - a[1].off / a[1].total)) {
    if (r.off === 0) continue
    keep('상황을 전제로 한 문구가 그 상황을 고르지 않은 분께도 뜸 — 그대로 둠 (규칙 수)')
  }
  lap(`전제 — 가상 환자 ${(PEOPLE * 5).toLocaleString()}명의 유효 규칙을 훑음`)
}

/* ════ 3. 이름으로 보아 뻔한 것 ════════════════════════════
 *
 * 이름만 보아도 아는 것 셋. 잣대는 여기 적은 낱말뿐이고 앱의 태그 규칙과 무관하다.
 * 이름 잣대는 거칠다 — '맥주효모', '와인식초' 같은 것을 덜어 내도 틀린 경보가 남는다. 그래서 '살펴볼 것' 이다.
 */
/*
 * 처음 돌렸을 때의 헛경보 — '로투스시나몬쿠키'(스시), '유부 초밥', '초밥김', '사시미간장', '물회육수',
 * '육회 시즈닝', '타르타르 소스'. 낱말을 줄이고 조미료를 걷었다. 전복장은 쪄서 담그는 것이 보통이라 뺐다.
 */
const RAW = /(육회|뭉티기|육사시미|생선회|모[둠듬]회|광어회|우럭회|연어회|참치회|방어회|숭어회|전어회|한치회|물회|회덮밥|회무침|회냉면|사시미|초밥|생굴|굴회|간장게장|양념게장|새우장|연어장|날달걀|생달걀|카르파초|세비체)/
const RAW_NOT = /(숙회|익힌|튀김|구이|찜|볶음|전골|탕|찌개|조림|향|소스|양념$|양념장|육수|간장$|쇼유|시즈닝|분말|가루|드레싱|다대기|담는|과자|스낵|칩|젤리|모양|유부|계란\s*초밥|달걀\s*초밥|김\s*초밥|초밥김|김류|초밥용|롤|생굴전|가열(?!하지)|게장\s*용?\s*(양념|간장)|덮죽|볶음밥)/
/*
 * 덜 익힌 것 — 2026-10-13 에 '피하세요' 로 정해졌다(전문의 결정). 그전에는 '살펴볼 것' 이었다.
 * 익혀 먹는 것(스테이크·카츠·구이), 삶은 햄(코시도·꼬또), 과자, 레토르트는 이름으로 덜어 낸다.
 */
const UNDERCOOKED = /(반숙|(?<![가-힣])수란|훈제\s*연어|생햄|프로슈토|하몽|전복장(?!어|아찌))/
const UNDERCOOKED_NOT = /(맛|향|소스|과자|칩|스낵|크래커|비스킷|카스테라|케이크|스테이크|카츠|구이|코시도|꼬시도|꼬또|레토르트|생강청|베지|비건)/
const ALCOHOL = /(소주|맥주|막걸리|와인|위스키|사케|칵테일|하이볼|보드카|데킬라|샴페인|동동주|복분자주|매실주|과실주|탁주|브랜디|코냑|츄하이|담금주|인삼주)/
/* '채소주스' 가 소주로, '사케라또' 가 사케로 잡혔다. 술은 음료 군에서만 본다(아래) */
const ALCOHOL_NOT = /(무알코올|무알콜|논알코올|논알콜|비알코올|0\.0|제로|식초|효모|맛|향|소스|양념|안주|주스|쥬스|커피|라떼|라또|에이드|스무디|티$|차$|칵테일$|믹스)/
const CURED = /(소시지|소세지|베이컨|스팸|런천미트|육포|살라미|페퍼로니|비엔나|프랑크푸르트|햄(?!버거|프씨드|프시드|스터))/
const CURED_NOT = /(향|과자|스낵|칩|크래커|비스킷|시즈닝|소스|식물성|비건|베지|콩|두부|어묵|맛살|비엔나\s*커피|생강청)/
{
  const neut = person({ cancer: 'colorectal', phase: 'neutropenia', conditions: [], medications: [], subtypes: [] })
  const surv = person({ cancer: 'colorectal', phase: 'survivorship', conditions: [], medications: [], subtypes: [] })
  /* 같은 상태를 증상에서 고르신 분 — 시기는 '항암치료 중' 그대로 */
  const neutByCond = person({ cancer: 'colorectal', phase: 'during_chemo', conditions: ['호중구감소증'], medications: [], subtypes: [] })
  const tally = { raw: 0, rawOk: 0, under: 0, underOk: 0, alc: 0, alcOk: 0, cured: 0, curedOk: 0 }
  for (const f of ALL) {
    const nm = f.name
    if (RAW.test(nm) && !RAW_NOT.test(nm)) {
      tally.raw++
      const lv = evaluateFood(f, neut, 1).level
      if (lv === 'avoid') tally.rawOk++
      else note('호중구감소 시기인데 날것이 피하세요가 아님', `${nm} [${f.group}] → ${lv ?? '표시 없음'}`)
      if (lv === 'avoid' && evaluateFood(f, neutByCond, 1).level !== 'avoid') hard.push(`증상으로 호중구감소증을 고르면 날것이 피하세요가 아님: ${nm}`)
    } else if (UNDERCOOKED.test(nm) && !UNDERCOOKED_NOT.test(nm)) {
      tally.under++
      const lv = evaluateFood(f, neut, 1).level
      if (lv === 'avoid') tally.underOk++
      else note('호중구감소 시기인데 덜 익힌 것(반숙·훈제연어·생햄·전복장)이 피하세요가 아님', `${nm} [${f.group}] → ${lv ?? '표시 없음'}`)
      /* 증상으로만 고르신 분께도 같아야 한다 — 한동안 이 길은 손으로 붙인 태그만 보았다 */
      if (lv === 'avoid' && evaluateFood(f, neutByCond, 1).level !== 'avoid') hard.push(`증상으로 호중구감소증을 고르면 덜 익힌 것이 피하세요가 아님: ${nm}`)
    }
    if (f.group === '음료' && ALCOHOL.test(nm) && !ALCOHOL_NOT.test(nm)) {
      tally.alc++
      const lv = evaluateFood(f, surv, 1).level
      if (lv === 'avoid') tally.alcOk++
      else note('술로 보이는데 피하세요가 아님', `${nm} [${f.group}] → ${lv ?? '표시 없음'}`)
    }
    if (CURED.test(nm) && !CURED_NOT.test(nm)) {
      tally.cured++
      const lv = evaluateFood(f, surv, 1).level
      if (lv === 'avoid' || lv === 'caution') tally.curedOk++
      else note('가공육으로 보이는데 주의·피하세요가 아님', `${nm} [${f.group}] → ${lv ?? '표시 없음'}`)
    }
  }
  lap(`이름 — 날것 ${tally.rawOk}/${tally.raw} · 덜 익힌 것 ${tally.underOk}/${tally.under} · 술 ${tally.alcOk}/${tally.alc} · 가공육 ${tally.curedOk}/${tally.cured} (경고된 것/이름으로 찾은 것)`)
  if (tally.raw < 300 || tally.alc < 10 || tally.cured < 1000) hard.push(`이름 검사가 헛돎 — 날것 ${tally.raw} · 술 ${tally.alc} · 가공육 ${tally.cured}`)
  /*
   * 이름 잣대는 거칠어서 100 % 를 요구하지는 않는다. 다만 한번 고친 것이 다시 무너지면 알아야 한다.
   * 2026-10 에 고치기 전 — 날것 31 %(322/1033) · 가공육 98.6 %. 고친 뒤의 수준 아래로 내려가면 실패다.
   */
  if (tally.rawOk / tally.raw < 0.95) hard.push(`호중구감소 시기에 날것이 피하세요가 아닌 것이 많음 — ${tally.rawOk}/${tally.raw}`)
  /* 덜 익힌 것 — 고치기 전에는 32 %(97/303) 였다 */
  if (tally.under < 200) hard.push(`덜 익힌 것 이름 검사가 헛돎 — ${tally.under}종`)
  if (tally.underOk / tally.under < 0.97) hard.push(`호중구감소 시기에 덜 익힌 것이 피하세요가 아닌 것이 많음 — ${tally.underOk}/${tally.under}`)
  if (tally.curedOk / tally.cured < 0.985) hard.push(`가공육이 주의·피하세요가 아닌 것이 많음 — ${tally.curedOk}/${tally.cured}`)
  /*
   * 술은 이름으로 가리기 어렵다 — '위스키 콜드브루', '제주맥주 탄산수', '소주친구' 는 술이 아니다.
   * 그래서 비율로 실패를 내지 않고, 이름이 술 그 자체인 것만 따로 못 박는다.
   */
  /* '청주' 는 뺐다 — '청주 소로리 빨간쌀식혜' 는 지명이다 */
  const PLAIN = /^(맥주|생맥주|흑맥주|소주|막걸리|동동주|위스키|보드카|브랜디|레드와인|화이트와인|로제와인|와인|샴페인|매실주|복분자주|고량주|럼)(\s|\(|,|$)/
  const plain = ALL.filter((f) => f.group === '음료' && PLAIN.test(f.name))
  const plainMiss = plain.filter((f) => evaluateFood(f, surv, 1).level !== 'avoid')
  if (plain.length < 4) hard.push(`술 이름 검사가 헛돎 — ${plain.length}종`)
  for (const f of plainMiss) hard.push(`술인데 피하세요가 아님: ${f.name}`)
}

/* ════ 3-2. 이번에 고친 것 — 다시 무너지면 실패 ═════════════════
 *
 * 장에 담근 날것(게장·새우장·연어장)과 젓갈. 잣대는 이름뿐이다.
 */
{
  const JANG = /(간장게장|양념게장|꽃게장|새우장|연어장)/
  const JANG_NOT = /(소스|다대기|담는|시즈닝|분말|가루|칩|과자|스낵|볶음밥|덮죽|가열(?!하지)|게장\s*용?\s*(양념|간장))/
  const JEOT = /(젓갈|액젓|(새우|명란|창[란난]|오징어|낙지|꼴뚜기|멸치|까나리|조개|어리굴|갈치속?|토하|아가미|밴댕이|황석어|가리비)젓)/
  const JEOT_NOT = /(없는|김밥|삼각|쌈장|마요|소스|김치|삼겹|고추|페이스트|무말랭|찜|찌개|젓국|전$|볶음|파스타|덮밥|비빔밥|주먹밥|바게트|빵|과자|스낵|칩|생채|무침|향|맛)/
  const neut = person({ cancer: 'lung', phase: 'neutropenia', conditions: [], medications: [], subtypes: [] })
  const stomach = person({ cancer: 'stomach', phase: 'survivorship', conditions: [], medications: [], subtypes: [] })
  const anyCtx = CANCERS.map((c) => person({ cancer: c.id, phase: 'survivorship', conditions: [], medications: [], subtypes: [] }))
  let jang = 0, jangOk = 0, jeot = 0, jeotOk = 0, praised = 0
  for (const f of ALL) {
    const nm = f.name
    if (JANG.test(nm) && !JANG_NOT.test(nm)) {
      jang++
      if (evaluateFood(f, neut, 1).level === 'avoid') jangOk++
      else note('호중구감소 시기인데 게장·새우장·연어장이 피하세요가 아님', nm)
    }
    if (JEOT.test(nm) && !JEOT_NOT.test(nm)) {
      jeot++
      if (evaluateFood(f, stomach, 1).level === 'avoid') jeotOk++
      else note('위암인데 젓갈이 피하세요가 아님', nm)
    }
  }
  /* 염장·가공육으로 보이는 음식이 어느 암종에서든 '권장' 으로 뜨면 안 된다 — 내장 식품 전부를 본다 */
  for (const f of CORE) {
    const nm = f.name
    /* '자반' 은 그대로 못 쓴다 — 콩자반·김자반·모자반은 절인 생선이 아니다 */
    const salty = (JEOT.test(nm) && !JEOT_NOT.test(nm)) || (CURED.test(nm) && !CURED_NOT.test(nm)) ||
      (/장아찌|단무지|짠지|간고등어|자반\s*고등어|고등어\s*자반/.test(nm) && !/소스|간장$|불고기|김밥/.test(nm))
    if (!salty) continue
    for (const p of anyCtx) if (evaluateFood(f, p, 1).level === 'prefer') { praised++; note('염장·가공육으로 보이는 음식이 권장으로 뜸', `${nm} · ${p.cancer}`); break }
  }
  lap(`못 박기 — 장에 담근 날것 ${jangOk}/${jang} · 젓갈(위암) ${jeotOk}/${jeot} · 염장·가공육이 권장으로 뜬 것 ${praised}`)
  if (jang < 300 || jeot < 200) hard.push(`못 박기 검사가 헛돎 — 게장류 ${jang} · 젓갈 ${jeot}`)
  if (jangOk / jang < 0.98) hard.push(`게장·새우장·연어장이 호중구감소 시기에 피하세요가 아님 — ${jangOk}/${jang}`)
  if (jeotOk / jeot < 0.95) hard.push(`젓갈이 위암에서 피하세요가 아님 — ${jeotOk}/${jeot}`)
  if (praised > 0) hard.push(`염장·가공육으로 보이는 음식 ${praised}종이 권장으로 뜸`)
}

/* ════ 4. 한 음식에 권장과 피하세요가 함께 뜨는가 ════════════════
 *
 * 틀린 것은 아니다(가장 센 것이 이긴다). 다만 화면에는 두 이유가 나란히 나오므로,
 * "피하세요" 아래에 "권장" 이유가 붙어 보인다. 얼마나 잦은지 센다.
 */
{
  let both = 0, checked = 0
  const sample = CORE.filter((_f, i) => i % 3 === 0)
  for (let i = 0; i < 40; i++) {
    const p = person()
    for (const f of sample) {
      const v = evaluateFood(f, p, 1)
      checked++
      const lv = new Set(v.hits.map((h) => h.rule.level))
      if (lv.has('avoid') && lv.has('prefer')) {
        both++
        const a = v.hits.find((h) => h.rule.level === 'avoid')!, b = v.hits.find((h) => h.rule.level === 'prefer')!
        note('한 음식에 피하세요와 권장이 함께 뜸', `${f.name} — 피하세요 "${a.rule.title}" + 권장 "${b.rule.title}"`)
      }
      /* 가장 센 것이 실제로 이겼는가 */
      const rank = { avoid: 3, caution: 2, prefer: 1, info: 0 } as const
      const all = [...v.hits.map((h) => h.rule.level), ...v.interactions.map((x) => x.interaction.level)]
      const top = all.length ? all.reduce((a, b) => (rank[b] > rank[a] ? b : a)) : null
      if (top !== v.level && !(top === null && v.level === null)) {
        hard.push(`가장 센 등급이 이기지 않음: ${f.name} — 표시 ${v.level}, 걸린 것 중 가장 센 것 ${top} · ${label(p)}`)
      }
    }
  }
  lap(`겹침 — ${checked.toLocaleString()}건 가운데 피하세요+권장 ${both.toLocaleString()}건 (${(both / checked * 100).toFixed(2)}%)`)
}

/* ════ 5. 극단에서 무너지는가 ═══════════════════════════════ */
{
  const extremes: PatientContext[] = [
    person({ weightKg: 25, heightCm: 130, age: 14 }),
    person({ weightKg: 200, heightCm: 210, age: 100 }),
    person({ weightKg: 40, heightCm: 190, weightLossPct: 40 }),
    person({ weightKg: 130, heightCm: 145, conditions: CONDS, medications: MED_IDS }),
    person({ conditions: CONDS, medications: MED_IDS, history: HIST, phase: 'neutropenia' }),
    person({ conditions: [], medications: [], history: [], subtypes: [], weightLossPct: 0 }),
    ...CANCERS.flatMap((c) => PHASES.map((ph) => person({ cancer: c.id, phase: ph, conditions: CONDS, medications: MED_IDS })))
  ]
  const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
  for (const p of extremes) {
    try {
      const prof = CANCERS.find((c) => c.id === p.cancer)!
      const t = personalTarget(p, prof.target.kcalPerKg, prof.target.proteinPerKg)
      if (![...t.kcal, ...t.protein, t.fluid].every(finite)) hard.push(`목표가 숫자가 아님: ${JSON.stringify(t)} · ${label(p)}`)
      if (t.kcal[0] > t.kcal[1] || t.protein[0] > t.protein[1]) hard.push(`목표 범위가 뒤집힘: ${JSON.stringify(t)} · ${label(p)}`)
      if (t.kcal[0] < 500 || t.kcal[1] > 6000) note('열량 목표가 상식 밖', `${t.kcal.join('~')} kcal · ${label(p)}`)
      if (t.protein[0] < 10 || t.protein[1] > 350) note('단백질 목표가 상식 밖', `${t.protein.join('~')} g · ${label(p)}`)
      const m = buildDayMenu([], p)
      const slots = Object.keys(m.meals) as MealSlot[]
      const count = slots.reduce((a, s) => a + m.meals[s].length, 0)
      if (count === 0) note('극단 환자에게 하루 식단이 통째로 빔', label(p))
      for (const [k, v] of Object.entries(m.totals)) if (v !== undefined && !finite(v)) hard.push(`합계 ${k} 가 숫자가 아님: ${v} · ${label(p)}`)
      for (const s of slots) for (const e of m.meals[s]) {
        if (!finite(e.servings) || e.servings <= 0) hard.push(`분량이 이상함: ${e.food.name} × ${e.servings} · ${label(p)}`)
        if (evaluateFood(e.food, p, e.servings).level === 'avoid') hard.push(`극단 환자에게 피하세요 음식을 올림: ${e.food.name} · ${label(p)}`)
      }
    } catch (e) {
      hard.push(`극단 환자에서 무너짐: ${(e as Error).message.slice(0, 120)} · ${label(p)}`)
    }
  }
  lap(`극단 — ${extremes.length}가지 (증상 17가지·약 18가지를 한꺼번에 고른 경우 포함)`)
}

/* ════ 6. 차려 준 상을 이름으로 다시 본다 ══════════════════════
 *
 * 추천 엔진이 올린 음식을, 엔진의 판정이 아니라 이름으로 본다.
 */
{
  let days = 0, items = 0
  for (let i = 0; i < PEOPLE; i++) {
    const p = person()
    for (let d = 0; d < 3; d++) {
      let m
      try { m = buildDayMenu([], p, { nonce: i * 10 + d }) } catch (e) { hard.push(`식단 구성이 무너짐: ${(e as Error).message.slice(0, 100)} · ${label(p)}`); continue }
      days++
      for (const s of Object.keys(m.meals) as MealSlot[]) for (const e of m.meals[s]) {
        items++
        const nm = e.food.name
        if (ALCOHOL.test(nm) && !ALCOHOL_NOT.test(nm)) note('식단에 술로 보이는 것이 올라옴', `${nm} · ${label(p)}`)
        if ((p.phase === 'neutropenia' || has(p, '호중구감소증')) && RAW.test(nm) && !RAW_NOT.test(nm)) note('호중구감소 시기 식단에 날것이 올라옴', `${nm} · ${label(p)}`)
        const chemo = p.phase === 'during_chemo' || p.phase === 'neutropenia' || p.medications.some((x) => MY_ANTICANCER.has(x))
        if (chemo && /자몽|포멜로/.test(nm) && !/맛|향/.test(nm)) note('항암제를 쓰는 분 식단에 자몽이 올라옴', `${nm} · ${label(p)}`)
        if (CURED.test(nm) && !CURED_NOT.test(nm)) note('식단에 가공육으로 보이는 것이 올라옴', `${nm} · ${label(p)}`)
        if (p.medications.includes('warfarin') && /낫토|청국장/.test(nm)) keep("와파린을 드시는 분 식단에 낫토·청국장 — '주의' 로 둠 (건수)")
        if ((p.phase === 'neutropenia' || has(p, '호중구감소증')) && UNDERCOOKED.test(nm) && !UNDERCOOKED_NOT.test(nm)) hard.push(`호중구감소 시기 식단에 덜 익힌 것이 올라옴: ${nm} · ${label(p)}`)
      }
    }
  }
  lap(`식단 — ${days.toLocaleString()}일 · 음식 ${items.toLocaleString()}건을 이름으로 다시 봄`)
  if (items < days * 5) hard.push(`식단 검사가 헛돎 — 하루 평균 ${(items / Math.max(1, days)).toFixed(1)}건`)
}

/* ════ 6-2. 와파린과 낫토·청국장 — '주의' 로 정해짐 ═════════════════
 *
 * 올리지는 않되 사라져서도 안 된다. 이름으로 찾아 모두 '주의' 이상인지 본다.
 */
{
  const w = person({ cancer: 'colorectal', phase: 'survivorship', conditions: [], medications: ['warfarin'], subtypes: [] })
  const beans = ALL.filter((f) => /낫토|청국장/.test(f.name) && !/과자|쿠키|칩|스낵|캔디|사탕|젤리|빵|케이크|크래커|향|국수|파스타|소스|시즈닝|환$|분말|가루|키나제/.test(f.name))
  if (beans.length < 20) hard.push(`낫토·청국장 검사가 헛돎 — ${beans.length}종`)
  let ok = 0
  for (const f of beans) {
    const lv = evaluateFood(f, w, 1).level
    if (lv === 'caution' || lv === 'avoid') ok++
    else note('와파린을 드시는데 낫토·청국장에 주의가 없음', `${f.name} → ${lv ?? '표시 없음'}`)
  }
  if (ok / Math.max(1, beans.length) < 0.9) hard.push(`와파린을 드시는데 낫토·청국장이 주의가 아닌 것이 많음 — ${ok}/${beans.length}`)
}

/* ════ 7. 모든 분께 뜨는 '피하세요·주의' — 사람이 한 번 읽어 볼 목록 ═══ */
const universal = [
  ...COMMON_RULES.map((r) => ({ r, where: '공통' })),
  ...CANCERS.flatMap((c) => c.rules.map((r) => ({ r, where: c.name })))
].filter(({ r }) => (r.level === 'avoid' || r.level === 'caution') && !r.phases?.length && !r.subtypes?.length && !r.onAnticancer && !r.advisory)

/* ── 보고 ─────────────────────────────────────────────── */
console.log(`\n상식 검사 완료 — 무너짐 ${hard.length}건 · 살펴볼 것 ${look.size}종`)
if (hard.length) {
  console.log('\n■■ 무너짐 (실패)')
  for (const h of [...new Set(hard)].slice(0, 20)) console.log('   -', h)
}
for (const [k, f] of [...look].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`\n■ ${k} — ${f.n.toLocaleString()}건`)
  for (const e of f.ex) console.log('   -', e)
}
if (decided.size) {
  console.log('\n□ 정해진 것 (다시 묻지 않음)')
  for (const [k, n] of decided) console.log(`   - ${k}: ${n}`)
}
console.log(`\n□ 시기·약과 무관하게 뜨는 피하세요·주의 ${universal.length}건 (읽어 보실 목록)`)
for (const { r, where } of universal) console.log(`   - [${r.level === 'avoid' ? '피하세요' : '주의'}·${where}] ${r.title}`)
if (hard.length) process.exitCode = 1
