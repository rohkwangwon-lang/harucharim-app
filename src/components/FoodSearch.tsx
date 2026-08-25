import { useEffect, useMemo, useState } from 'react'
import { IconBarcode } from './icons'
import type { Cuisine, Food, FoodGroup, MealSlot, PatientContext } from '../data/types'
import { MEAL_SLOTS } from '../data/types'
import { FOODS } from '../data/foods'
import { activeInteractions, activeRules, evaluateFood } from '../engine/rules'
import { foodContribution } from '../engine/nutrition'
import { FoodDetail } from './FoodDetail'
import { LevelDot } from './ui'
import { BarcodeScanner } from './BarcodeScanner'
import { getStatus, linkBarcode, lookupBarcode, searchExtended } from '../lib/foodStore'
import { InquiryDialog } from './InquiryDialog'

const GROUPS: (FoodGroup | '전체')[] = [
  '전체', '밥·면·죽 요리', '국·탕·찌개', '반찬·조림·볶음', '육류', '어패류',
  '가금류·난류', '채소', '과일', '두류·대두가공', '곡류·전분', '우유·유제품',
  '해조·버섯', '견과·종실', '외식·프랜차이즈', '음료', '간식·디저트',
  '가공식품', '유지·당류', '경장영양·환자식'
]

function matches(food: Food, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  if (food.name.toLowerCase().includes(needle)) return true
  if (food.aliases?.some((a) => a.toLowerCase().includes(needle))) return true
  if (food.group.includes(q)) return true
  if (food.tags.some((t) => t.includes(q))) return true
  return false
}

export function FoodSearch({
  patient,
  onAdd,
  selectedIds,
  initialMeal,
  onDone,
  onNeedData
}: {
  patient: PatientContext
  onAdd: (foodId: string, servings: number, meal: MealSlot) => void
  selectedIds: Set<string>
  /** 오늘 식단에서 넘어온 경우 어느 끼니에 담을지 */
  initialMeal?: MealSlot
  /** 담기를 마치고 내 식단으로 돌아간다 */
  onDone?: () => void
  /** 상품 데이터를 받으러 내 정보로 보낸다 */
  onNeedData?: () => void
}) {
  const [q, setQ] = useState('')
  /** 저장소 조회는 입력이 잠깐 멈춘 뒤에 한다 */
  const [qDeferred, setQDeferred] = useState('')
  const [group, setGroup] = useState<FoodGroup | '전체'>('전체')
  const [detail, setDetail] = useState<Food | null>(null)
  /** 담을 끼니 — 여기서 미리 정해 두면 매번 고르지 않아도 된다 */
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? '점심')
  /** 식재료만 보기 — 조리된 메뉴가 아니라 재료 단위로 짜고 싶을 때 */
  const [onlyIngredient, setOnlyIngredient] = useState(false)
  /*
   * 요리 계통은 여러 개를 함께 고를 수 있어야 한다.
   *
   * 하나만 고르게 두었더니 "한식과 일식을 같이 보고 싶다" 를 할 수가 없었다.
   * 실제로 드시는 것은 한 계통으로 나뉘지 않는다.
   * 아무것도 고르지 않으면 전부 보여 준다 — '전체' 라는 칸을 따로 두지 않아도 된다.
   */
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const cuisineOk = (c: string | undefined) =>
    cuisines.length === 0 || c === '무관' || cuisines.includes((c ?? '한식') as Cuisine)
  /**
   * 기기에 받아 둔 확장 데이터에서 찾은 결과.
   * 저장소 조회는 비동기라 늦게 도착한다. 어떤 검색어의 결과인지 함께 담아 두지 않으면
   * 검색어를 바꾼 뒤에도 이전 결과가 남아 엉뚱한 항목이 섞인다.
   */
  const [extra, setExtra] = useState<{ q: string; items: Food[] }>({ q: '', items: [] })
  const [hasExt, setHasExt] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState<string | null>(null)
  /** 스캔했지만 못 찾아서, 사용자가 직접 이어 주기를 기다리는 바코드 */
  const [linking, setLinking] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{
    kind: 'no-data' | 'not-found' | 'no-nutrition' | 'stale'
    code: string
    productName?: string
    /** 끝난 등록이라도 성분을 찾았으면 확인 후 담을 수 있게 들고 있는다 */
    food?: Food
    message: string
  } | null>(null)
  const [asking, setAsking] = useState(false)
  /** 한 번에 그리는 개수. 1만 8천 건을 통째로 그리면 화면이 멈춘다. */
  const [limit, setLimit] = useState(60)

  useEffect(() => { getStatus().then((st) => setHasExt(st.installed)) }, [])

  // 앱에 든 것에서 충분히 찾았으면 굳이 저장소까지 뒤지지 않는다
  useEffect(() => {
    const dq = qDeferred.trim()
    if (!hasExt || dq.length < 2) { setExtra({ q: dq, items: [] }); return }
    let alive = true
    searchExtended(dq, 40).then((r) => { if (alive) setExtra({ q: dq, items: r }) })
    return () => { alive = false }
  }, [qDeferred, hasExt])

  useEffect(() => {
    const t = setTimeout(() => setQDeferred(q), 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => { setLimit(60) }, [q, group, onlyIngredient, cuisines])

  const cached = useMemo(
    () => ({ rules: activeRules(patient), interactions: activeInteractions(patient) }),
    [patient]
  )

  /** 조건에 맞는 전체 건수 — 화면에 그리는 수와 별개로 알려 준다 */
  const totalMatched = useMemo(() => {
    return FOODS.filter(
      (f) =>
        (group === '전체' || f.group === group) &&
        (!onlyIngredient || f.form === 'ingredient') &&
        cuisineOk(f.cuisine) &&
        matches(f, q.trim())
    ).length
  }, [q, group, onlyIngredient, cuisines])

  const results = useMemo(() => {
    const list = FOODS.filter(
      (f) =>
        (group === '전체' || f.group === group) &&
        (!onlyIngredient || f.form === 'ingredient') &&
        cuisineOk(f.cuisine) &&
        matches(f, q.trim())
    )
    // 임상 규칙 평가는 한 건당 비용이 있다. 1만 8천 건 전부에 돌리면 입력이 버벅이므로
    // 먼저 잘라 낸 다음 평가한다. 자를 때는 손으로 검토한 항목을 앞세운다.
    const needle = q.trim().toLowerCase()

    /**
     * 검색 순위.
     * 식품군 이름도 검색 대상이라 "우유"로 찾으면 유제품이 통째로 걸린다.
     * 그래서 이름이 맞은 것을 먼저, 그중에서도 앞쪽에서 맞은 것을 먼저 보여 준다.
     */
    const score = (f: Food): number => {
      if (!needle) return f.auto ? 1 : 0
      const name = f.name.toLowerCase()
      const alias = f.aliases?.some((a) => a.toLowerCase().includes(needle)) ?? false
      let s: number
      if (name === needle) s = 0
      else if (name.startsWith(needle)) s = 1
      else if (name.includes(needle)) s = 2
      else if (alias) s = 3
      else s = 6                       // 식품군·태그만 맞은 경우
      if (f.auto) s += 0.5             // 같은 조건이면 손으로 검토한 항목을 앞에
      return s
    }

    const ordered = list.sort((a, b) => {
      const d = score(a) - score(b)
      if (d !== 0) return d
      return a.name.length - b.name.length
    })

    const page = ordered.slice(0, limit)
    const scored = page.map((f) => ({ food: f, verdict: evaluateFood(f, patient, 1, cached) }))

    // 검색어가 없을 때만 권장 우선으로 다시 세운다
    if (!q.trim()) {
      const rank = (l: string | null) =>
        l === 'prefer' ? 0 : l === null ? 1 : l === 'info' ? 2 : l === 'caution' ? 3 : 4
      scored.sort((a, b) => rank(a.verdict.level) - rank(b.verdict.level))
    }
    // 앱에 든 결과가 적으면 기기에 받아 둔 확장 데이터에서 더 채운다.
    // 지금 검색어의 결과일 때만 쓴다.
    if (needle && extra.q === needle && extra.items.length > 0) {
      const have = new Set(scored.map((x) => x.food.name))
      for (const f of extra.items) {
        if (scored.length >= limit) break
        if (have.has(f.name)) continue
        if (onlyIngredient) continue
        if (group !== '전체' && f.group !== group) continue
        // 앱에 든 결과와 같은 조건을 적용한다.
        // 요리 계통만 빠져 있어서, 중식으로 걸러 놓아도 확장분은 그대로 나왔다.
        if (!cuisineOk(f.cuisine)) continue
        have.add(f.name)
        scored.push({ food: f, verdict: evaluateFood(f, patient, 1, cached) })
      }
    }
    return scored
  }, [q, group, onlyIngredient, cuisines, patient, cached, extra, limit])

  return (
    <div>
      {onDone && (
        <button
          className="sticky top-0 z-20 -mx-4 mb-2 flex w-[calc(100%+2rem)] items-center justify-between gap-2 bg-brand-600 px-4 py-3 text-left text-white shadow-md transition-colors hover:bg-brand-700"
          onClick={onDone}
        >
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-base leading-none">←</span>
            <span className="text-sm font-bold">내 식단으로 돌아가기</span>
          </span>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold tabular-nums">
            {selectedIds.size}가지 담김
          </span>
        </button>
      )}

      <div className={`sticky ${onDone ? 'top-[52px]' : 'top-0'} z-10 -mx-4 mb-3 bg-stone-50/95 px-4 pb-2 pt-1 backdrop-blur`}>
        <div className="flex gap-1.5">
          <input
            className="input flex-1"
            placeholder="음식 이름으로 검색 — 예: 된장찌개, 두부, 삼겹살"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {patient.useBarcode !== false && (
          <button
            className="btn-outline shrink-0 px-3"
            onClick={() => { setScanMsg(null); setScanning(true) }}
            title="제품 바코드를 카메라로 찍어 찾습니다"
          >
            <IconBarcode className="h-4 w-4" />
            <span className="ml-1">바코드</span>
          </button>
          )}
        </div>
        {scanMsg && (
          <p className="mt-1.5 rounded-lg bg-warn-50 px-3 py-2 text-[11px] leading-relaxed text-warn-700">
            {scanMsg}
          </p>
        )}

        {linking && (
          <div className="mt-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-brand-700">바코드 {linking}</p>
                <p className="mt-1 text-xs font-semibold text-stone-900">
                  이 바코드에 연결할 제품을 골라 주세요
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                  아래에서 제품을 찾아 누르시면 이 바코드와 이어집니다.
                  다음부터는 스캔만으로 바로 찾을 수 있습니다.
                </p>
              </div>
              <button
                className="shrink-0 text-brand-700/60 hover:text-brand-700"
                onClick={() => setLinking(null)}
                aria-label="취소"
              >✕</button>
            </div>
          </div>
        )}

        {scanResult && (
          <div className="mt-1.5 rounded-xl border border-warn-200 bg-warn-50 px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-warn-700">바코드 {scanResult.code}</p>
                {scanResult.productName && (
                  <p className="mt-0.5 truncate text-sm font-semibold text-stone-900">
                    {scanResult.productName}
                  </p>
                )}
                <p className="mt-1 text-[11px] leading-relaxed text-warn-700">{scanResult.message}</p>
              </div>
              <button
                className="shrink-0 text-warn-700/60 hover:text-warn-700"
                onClick={() => setScanResult(null)}
                aria-label="닫기"
              >✕</button>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {scanResult.kind === 'no-data' && (
                <button className="btn-primary py-1.5 text-xs" onClick={onNeedData}>
                  상품 데이터 받으러 가기
                </button>
              )}
              {scanResult.kind === 'no-nutrition' && (
                <>
                  <span className="w-full text-[11px] leading-relaxed text-stone-600">
                    제품명으로 비슷한 것을 찾아 두었습니다. 아래에서 고르신 뒤 이 바코드에 연결해 두시면
                    다음부터는 스캔만으로 바로 담기실 수 있습니다.
                  </span>
                  {/*
                    * 공공 바코드 자료에는 제품명만 있고 성분이 없는 것이 70 % 다.
                    * 예전에는 이 경우에 연결 버튼이 없어서, 매번 다시 검색해야 했다.
                    * 성분을 지어낼 수는 없으니, 사용자가 직접 이어 두게 하는 것이 답이다.
                    */}
                  <button
                    className="btn-primary py-1.5 text-xs"
                    onClick={() => { setLinking(scanResult.code); setScanResult(null) }}
                  >
                    이 바코드에 연결하기
                  </button>
                </>
              )}
              {scanResult.kind === 'stale' && (
                <>
                  {scanResult.food && (
                    <button
                      className="btn-outline py-1.5 text-xs"
                      onClick={() => { const f = scanResult.food!; setScanResult(null); setDetail(f) }}
                    >
                      맞습니다 — {scanResult.productName} 담기
                    </button>
                  )}
                  <button
                    className="btn-primary py-1.5 text-xs"
                    onClick={() => { setLinking(scanResult.code); setScanResult(null) }}
                  >
                    아닙니다 — 직접 찾아 연결하기
                  </button>
                </>
              )}
              {scanResult.kind === 'not-found' && (
                <button
                  className="btn-primary py-1.5 text-xs"
                  onClick={() => { setLinking(scanResult.code); setScanResult(null) }}
                >
                  이름으로 찾아 연결하기
                </button>
              )}
              {/*
                * 코리안넷은 국내 바코드의 공식 등록처(GS1 Korea)라 식약처 자료보다 최신이다.
                * 다만 그곳 자료는 대한상공회의소 귀속 자산이고 무단 수집이 금지되어 있어,
                * 우리가 긁어와 담아 두지 않는다. 공개된 조회 페이지로 보내 드릴 뿐이다.
                * 거기서 제품명을 확인하시고 돌아와 연결하시면 된다.
                */}
              {scanResult.kind !== 'no-data' && (
                <a
                  className="btn-outline py-1.5 text-xs"
                  href={`https://gs1.koreannet.or.kr/pr/${scanResult.code.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  코리안넷에서 확인하기
                </a>
              )}
              <button
                className="btn-outline py-1.5 text-xs"
                onClick={() => { setAsking(true) }}
              >
                이 제품 추가 요청하기
              </button>
            </div>
          </div>
        )}
        {/* 담을 끼니를 먼저 정해 두면 음식을 고를 때마다 다시 묻지 않는다 */}
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium text-stone-500">담을 끼니</span>
          <div className="flex flex-1 gap-1">
            {MEAL_SLOTS.map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`flex-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                  meal === m
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-stone-300 bg-white text-stone-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setOnlyIngredient((v) => !v)}
            className={`chip shrink-0 border ${
              onlyIngredient
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-stone-200 bg-white text-stone-600'
            }`}
          >
            식재료만
          </button>
          {(['한식', '양식', '중식', '일식', '동남아'] as const).map((c) => {
            const on = cuisines.includes(c)
            return (
              <button
                key={c}
                onClick={() =>
                  setCuisines((prev) => (on ? prev.filter((x) => x !== c) : [...prev, c]))
                }
                className={`chip shrink-0 border ${
                  on ? 'border-sky-500 bg-sky-500 text-white' : 'border-stone-200 bg-white text-stone-600'
                }`}
              >
                {c}
              </button>
            )
          })}
          {cuisines.length > 0 && (
            <button
              onClick={() => setCuisines([])}
              className="chip shrink-0 border border-stone-300 bg-stone-100 text-stone-600"
            >
              계통 해제
            </button>
          )}
        </div>

        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`chip shrink-0 border ${
                group === g
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-stone-200 bg-white text-stone-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="card px-4 py-8 text-center">
          <p className="text-sm text-stone-500">‘{q}’ 을(를) 찾지 못했습니다.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
            다른 이름으로 찾아보시거나, 저희에게 알려 주시면 자료를 추가하겠습니다.
          </p>
          <button className="btn-primary mx-auto mt-4 text-xs" onClick={() => setAsking(true)}>
            이 음식 추가 요청하기
          </button>
          {!hasExt && (
            <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
              ‘내 정보 → 편의점·마트 상품 데이터’ 를 받으시면 시중 가공식품 27만 종에서도 찾습니다.
            </p>
          )}
        </div>
      ) : (
        <>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <span className="text-xs text-stone-500">
            {totalMatched.toLocaleString()}가지 중 {Math.min(results.length, totalMatched).toLocaleString()}가지 표시
          </span>
          {hasExt && <span className="text-[11px] text-stone-400">기기 저장 데이터 포함</span>}
        </div>
        <ul className="card divide-y divide-stone-100 overflow-hidden">
          {results.map(({ food, verdict }) => {
            const per = foodContribution(food, 1)
            return (
              <li key={food.id}>
                <button
                  onClick={async () => {
                    if (linking) {
                      await linkBarcode(linking, food.id, food.name)
                      setLinking(null)
                      setScanMsg(`${food.name} 을(를) 바코드 ${linking} 에 연결했습니다. 다음부터 스캔으로 바로 찾습니다.`)
                      return
                    }
                    setDetail(food)
                  }}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-stone-50 ${
                    linking ? 'hover:bg-brand-50' : ''
                  }`}
                >
                  <LevelDot level={verdict.level} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-stone-900">{food.name}</span>
                      {selectedIds.has(food.id) && (
                        <span className="chip shrink-0 bg-brand-100 text-brand-700">담김</span>
                      )}
                      {food.auto && (
                        <span
                          className="chip shrink-0 bg-stone-100 text-stone-500"
                          title="식약처 공공데이터에서 자동으로 들여온 항목입니다. 성분값은 정확하지만 임상 태그는 성분으로 판정 가능한 것만 붙어 있습니다."
                        >
                          식약처
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-stone-400">
                      {food.maker ? `${food.maker} · ` : ''}
                      {food.serving.label} · {Math.round(per.kcal ?? 0)} kcal · 단백질{' '}
                      {(per.protein ?? 0).toFixed(1)} g · 나트륨 {per.na === undefined ? '정보 없음' : `${Math.round(per.na)} mg`}
                    </div>
                  </div>
                  <span className="shrink-0 text-stone-300">›</span>
                </button>
              </li>
            )
          })}
        </ul>

        {results.length < totalMatched && (
          <button
            className="btn-outline mt-3 w-full text-xs"
            onClick={() => setLimit((n) => n + 120)}
          >
            더 보기 · 남은 {(totalMatched - results.length).toLocaleString()}가지
          </button>
        )}
        </>
      )}

      {asking && (
        <InquiryDialog
          onClose={() => setAsking(false)}
          presetSubject={scanResult?.productName || scanResult?.code || q.trim()}
          presetKind="food"
        />
      )}

      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onDetect={async (code) => {
            setScanning(false)
            setScanMsg(null)

            if (!hasExt) {
              setScanResult({
                kind: 'no-data',
                code,
                message: '상품을 찾으려면 먼저 상품 데이터를 받아야 합니다.'
              })
              return
            }

            const hit = await lookupBarcode(code)

            if (!hit) {
              setScanResult({
                kind: 'not-found',
                code,
                message: '등록되지 않은 바코드입니다.'
              })
              return
            }

            /*
             * 끝난 등록이 걸린 경우.
             *
             * 바코드는 제품이 단종되면 몇 해 뒤 다른 제품에 다시 쓰인다.
             * 그래서 이 경우에는 찾은 것을 바로 담게 하지 않고 먼저 확인을 받는다.
             * 확인 없이 담게 두면, 펩시 제로를 찍었는데 헤이루사과사이다가
             * 조용히 식단에 들어간다.
             */
            if (hit.stale) {
              setScanResult({
                kind: 'stale',
                code,
                productName: hit.productName,
                food: hit.food,
                message:
                  '이 바코드로 등록된 제품은 판매가 끝난 것으로 나옵니다. ' +
                  '바코드는 단종되면 다른 제품에 다시 쓰이기 때문에, 지금 손에 드신 것과 다를 수 있습니다.'
              })
              setQ(hit.productName)
              return
            }

            if (hit.food) {
              setDetail(hit.food)
              if (hit.linkedByUser) {
                setScanMsg(`직접 연결해 두신 제품입니다 — ${hit.productName}`)
              }
              return
            }

            // 제품은 확인됐지만 성분 자료가 없다.
            // 그냥 "없다"로 끝내지 않고 제품명으로 찾아 준다.
            setScanResult({
              kind: 'no-nutrition',
              code,
              productName: hit.productName,
              message: '제품은 확인했지만 영양성분 자료가 등록되어 있지 않습니다.'
            })
            setQ(hit.productName)
          }}
        />
      )}

      {detail && (
        <FoodDetail
          food={detail}
          patient={patient}
          onClose={() => setDetail(null)}
          defaultMeal={meal}
          onAdd={(s, m) => {
            onAdd(detail.id, s, m)
            setDetail(null)
          }}
        />
      )}
    </div>
  )
}
