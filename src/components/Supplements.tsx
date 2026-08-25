import { useEffect, useMemo, useState } from 'react'
import { IconBarcode } from './icons'
import type { PatientContext, SupplementCategory } from '../data/types'
import { SUPPLEMENTS } from '../data/supplements'
import { activeInteractions, activeRules, evaluateSupplement } from '../engine/rules'
import { NUTRIENT_META_BY_KEY, fmt } from '../engine/nutrition'
import { REF_BY_ID } from '../data/references'
import { EvidenceBadge, LevelBadge, LevelDot, Section } from './ui'
import { adviseSupplements, type AdviceLevel } from '../engine/supplementAdvice'
import { nutritionRisk } from '../engine/nutrition'
import { getStatus, lookupSupplementByBarcode, scanSupplements, searchSupplements, type ExtSupplement } from '../lib/foodStore'
import { BarcodeScanner } from './BarcodeScanner'
import { ingredientKeywords, judgeProduct } from '../engine/ingredientVerdict'

const CATEGORIES: (SupplementCategory | '전체')[] = [
  '전체', '종합비타민', '비타민B군', '비타민C', '비타민D', '오메가3',
  '칼슘·마그네슘', '철분', '아연·미네랄', '유산균', '단백질보충',
  '경장영양(균형영양식)', '간건강', '홍삼·인삼', '항산화·기타', '식이섬유'
]

export function Supplements({
  patient,
  taking,
  onToggle
}: {
  patient: PatientContext
  taking: string[]
  onToggle: (id: string) => void
}) {
  const [cat, setCat] = useState<SupplementCategory | '전체'>('전체')
  const [open, setOpen] = useState<string | null>(null)
  /** 시판 제품(공공데이터) 검색 */
  const [q, setQ] = useState('')
  const [market, setMarket] = useState<ExtSupplement[]>([])
  const [hasExt, setHasExt] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState<string | null>(null)
  /*
   * 판정으로 걸러 보기.
   *
   * 4만 5천 종 앞에서 이름을 쳐 넣어야만 무언가 나오는 것은,
   * 무엇을 찾아야 할지 이미 아시는 분에게만 쓸모가 있다.
   * 정작 필요한 물음은 "나한테 뭐가 괜찮은가" 와 "뭘 피해야 하나" 다.
   */
  const [pick, setPick] = useState<'none' | 'good' | 'bad'>('none')
  const [picking, setPicking] = useState(false)

  /* 이 환자에게 어떤 원료가 권장이고 어떤 원료가 주의·금기인지 */
  const goodIng = useMemo(() => ingredientKeywords(patient, ['prefer']), [patient])
  const badIng = useMemo(() => ingredientKeywords(patient, ['caution', 'avoid']), [patient])

  useEffect(() => { getStatus().then((st) => setHasExt(st.installed && st.suppCount > 0)) }, [])
  /*
   * 검색어가 없어도 목록을 보여 준다.
   * 예전에는 두 글자 이상 쳐야만 결과가 나와서, 45,618 종을 받아 두고도
   * 화면에는 검토한 35 종만 보였다. 받은 것이 어디 갔는지 알 수 없다는 말이 나온 이유다.
   */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!hasExt) { setMarket([]); return }
      if (pick !== 'none') {
        /*
         * 이름 앞부분 색인으로는 안 된다 — '비타민D' 는 이름 한가운데 있기도 하고
         * 아예 기능성 문구에만 적혀 있기도 하다. 처음부터 훑되 채워지면 멈춘다.
         */
        setPicking(true)
        const kw = pick === 'good' ? goodIng.keywords : badIng.keywords
        /*
         * 낱말로 걸러 낸 뒤 제품으로 한 번 더 판정한다.
         *
         * 낱말만 보면 '오메가3 + 비타민 E' 제품이 오메가3 때문에 권장 목록에 오른다.
         * 그런데 치료 중이라면 그 제품의 판정은 비타민 E 때문에 '피하세요' 다.
         * "권장되는 것만" 이라고 써 놓고 피해야 할 것을 보여 주는 셈이 된다.
         * 제품 하나에 여러 원료가 든 것이 오히려 흔하므로, 마지막 판정으로 거른다.
         *
         * 그래서 넉넉히 훑고 걸러 낸 뒤 잘라 낸다 —
         * 걸러지고 나면 예순 개를 못 채우는 경우가 있다.
         */
        scanSupplements(kw, 400)
          .then((rows) => {
            const kept = rows.filter((r) => {
              const v = judgeProduct(r.name, r.fn, patient)
              /*
               * 권할 때와 말릴 때의 잣대를 다르게 둔다.
               *
               * 권하는 쪽은 '이 제품이 무엇을 위한 것인가' 로 본다.
               * 유산균 한 통에 비타민 D 가 곁들여 들었다고 해서
               * 비타민 D 를 채우러 그것을 사시라고 할 수는 없다.
               * 함량이 공개 자료에 없으니 제품 이름에 드러난 주성분으로 가른다.
               *
               * 말리는 쪽은 반대로 곁들여 든 것까지 본다.
               * 치료 중 피해야 할 것이 조금이라도 들어 있으면 알려 드리는 편이 안전하다.
               * 놓쳐서 생기는 손해가 한쪽은 헛걸음이고 다른 쪽은 해가 되는 일이다.
               */
              return pick === 'good'
                ? v.primaryLevel === 'prefer'
                : v.level === 'caution' || v.level === 'avoid'
            })
            setMarket(kept.slice(0, 60))
          })
          .finally(() => setPicking(false))
        return
      }
      if (q.trim().length === 1) { setMarket([]); return }
      searchSupplements(q.trim(), 30).then(setMarket)
    }, 250)
    return () => clearTimeout(t)
  }, [q, hasExt, pick, goodIng, badIng, patient])

  const cached = useMemo(
    () => ({ rules: activeRules(patient), interactions: activeInteractions(patient) }),
    [patient]
  )

  const list = useMemo(
    () =>
      SUPPLEMENTS.filter((s) => cat === '전체' || s.category === cat).map((s) => ({
        s,
        v: evaluateSupplement(s, patient, cached)
      })),
    [cat, patient, cached]
  )

  const advice = useMemo(() => adviseSupplements(patient), [patient])
  const risk = nutritionRisk(patient)
  const rec = advice.filter((a) => a.level === 'recommend')
  const con = advice.filter((a) => a.level === 'consider')
  const avo = advice.filter((a) => a.level === 'avoid')
  const cau = advice.filter((a) => a.level === 'caution')

  return (
    <div>
      <Section
        title={patient.name ? `${patient.name}님께 맞춘 추천` : '내 몸에 맞춘 추천'}
        desc={`${CANCER_LABEL[patient.cancer] ?? ''} · BMI ${risk.bmi} · 치료 이력과 증상을 함께 반영한 결과입니다.`}
      >
        {advice.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-stone-400">
            현재 입력하신 정보로는 특별히 권하거나 피할 영양제가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {rec.length > 0 && <AdviceGroup title="챙기시면 좋습니다" level="recommend" items={rec} />}
            {avo.length > 0 && <AdviceGroup title="피하시는 편이 좋습니다" level="avoid" items={avo} />}
            {cau.length > 0 && <AdviceGroup title="드셔도 되지만 방법을 지키세요" level="caution" items={cau} />}
            {con.length > 0 && <AdviceGroup title="상황에 따라 고려" level="consider" items={con} />}
          </div>
        )}
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-stone-400">
          제품이 아니라 <strong>분류</strong> 단위로 권합니다. 어떤 브랜드를 사야 한다는 뜻이 아니며,
          이미 식사로 충분한 성분이라면 보충제를 더할 이유가 없습니다.
        </p>
      </Section>

      <Section
        title="시판 영양제 찾기"
        desc={
          hasExt
            ? '식약처에 신고된 건강기능식품 45,618종에서 찾습니다. 성분을 보고 이 환자에게 맞는지 판단해 드립니다.'
            : '내 정보에서 상품 데이터를 받으시면 시판 제품 45,618종을 검색할 수 있습니다.'
        }
      >
        {/*
          * 판정으로 걸러 보기.
          *
          * 이름을 쳐 넣어야만 무언가 나오는 검색은, 무엇을 찾을지 이미 아시는 분에게만
          * 쓸모가 있다. 정작 물으시는 것은 "나한테 뭐가 괜찮은가" 와 "뭘 피해야 하나" 다.
          * 제품이 아니라 그 안에 든 원료로 고른다 — 그래야 왜 나왔는지 말할 수 있다.
          */}
        {hasExt && (
          <div className="mb-3 flex gap-1.5">
            {([
              ['good', '나에게 권장되는 것만', goodIng, 'border-brand-500 bg-brand-500 text-white'],
              ['bad', '주의·피해야 할 것만', badIng, 'border-danger-500 bg-danger-500 text-white']
            ] as const).map(([id, label, ing, on]) => (
              <button
                key={id}
                disabled={ing.names.length === 0}
                onClick={() => { setPick(pick === id ? 'none' : id); setQ('') }}
                className={`flex-1 rounded-xl border-2 px-2.5 py-2 text-xs font-bold transition-colors disabled:opacity-40 ${
                  pick === id ? on : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {pick !== 'none' && (
          <div className="mb-3 rounded-xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-200">
            <p className="text-[11px] leading-relaxed text-stone-600">
              {pick === 'good' ? (
                <>지금 상태에서 <strong>권장</strong>으로 보는 원료{' '}
                  <strong className="text-brand-700">{goodIng.names.join(' · ')}</strong>{' '}
                  이(가) 든 제품입니다.</>
              ) : (
                <>지금 상태에서 <strong>주의하거나 피하시는 편이 좋은</strong> 원료{' '}
                  <strong className="text-danger-700">{badIng.names.join(' · ')}</strong>{' '}
                  이(가) 든 제품입니다.</>
              )}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
              {pick === 'good'
                ? '그 원료가 제품의 주된 성분인 것만 골랐습니다 — 유산균에 비타민 D 가 곁들여 들었다고 비타민 D 를 채우러 사실 일은 아니니까요. 공개 자료에 함량이 없어 제품 이름과 표시된 기능성으로 판단했으니, 드시기 전에 성분표를 확인하고 담당 선생님과 상의하세요.'
                : '곁들여 든 것까지 넓게 보았습니다 — 피해야 할 것은 조금이라도 알려 드리는 편이 안전하기 때문입니다. 제품 이름과 표시된 기능성으로 판단한 것이니 성분표를 함께 확인하세요.'}
            </p>
          </div>
        )}

        <div className="mb-3 flex gap-1.5">
          <input
            className="input flex-1"
            placeholder={hasExt ? '제품명으로 검색 — 예: 락토핏, 오메가3, 홍삼' : '먼저 상품 데이터를 받아 주세요'}
            value={q}
            onChange={(e) => { setQ(e.target.value); if (e.target.value) setPick('none') }}
            disabled={!hasExt}
          />
          {patient.useBarcode !== false && (
          <button
            className="btn-outline shrink-0 px-3"
            disabled={!hasExt}
            onClick={() => { setScanMsg(null); setScanning(true) }}
            title="영양제 통의 바코드를 찍어 찾습니다"
          >
            <IconBarcode className="h-4 w-4" />
            <span className="ml-1">바코드</span>
          </button>
          )}
        </div>

        {hasExt && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {['유산균', '오메가3', '비타민D', '종합비타민', '홍삼', '루테인', '칼슘', '단백질', '밀크씨슬', '마그네슘'].map((k) => (
              <button
                key={k}
                onClick={() => setQ(q === k ? '' : k)}
                className={`chip shrink-0 border ${
                  q === k ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-200 bg-white text-stone-600'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {scanMsg && (
          <p className="mb-3 rounded-lg bg-warn-50 px-3 py-2 text-[11px] leading-relaxed text-warn-700">
            {scanMsg}
          </p>
        )}

        {scanning && (
          <BarcodeScanner
            onClose={() => setScanning(false)}
            onDetect={async (code) => {
              setScanning(false)
              const hit = await lookupSupplementByBarcode(code)
              if (hit) {
                setMarket([hit])
                setQ(hit.name)
                setScanMsg(null)
              } else {
                setScanMsg(
                  `바코드 ${code} 로 등록된 건강기능식품을 찾지 못했습니다. ` +
                  '제품 통에 적힌 이름으로 검색해 보세요.'
                )
              }
            }}
          />
        )}

        {picking && (
          <p className="card px-4 py-6 text-center text-sm text-stone-400">4만 5천 종에서 고르는 중입니다…</p>
        )}

        {!picking && market.length > 0 && (
          <>
            <p className="mb-2 text-[11px] text-stone-400">
              {pick !== 'none'
                ? <>{pick === 'good' ? '권장' : '주의·금기'} 원료가 든 제품 {market.length}건{market.length >= 60 && ' 이상'}</>
                : q.trim()
                  ? <>&lsquo;{q.trim()}&rsquo; 검색 결과 {market.length}건{market.length >= 30 && ' 이상'}</>
                  : <>45,618종 가운데 처음 {market.length}건입니다. 위 단추나 검색으로 좁혀 보세요.</>}
            </p>
            <div className="space-y-2">
              {market.map((m) => (
                <MarketProduct key={m.id} product={m} patient={patient} />
              ))}
            </div>
          </>
        )}
        {!picking && hasExt && pick === 'none' && q.trim().length >= 2 && market.length === 0 && (
          <p className="card px-4 py-6 text-center text-sm text-stone-400">
            찾는 제품이 없습니다. 다른 이름으로 검색해 보세요.
          </p>
        )}
        {!picking && pick !== 'none' && market.length === 0 && (
          <p className="card px-4 py-6 text-center text-sm leading-relaxed text-stone-500">
            해당하는 시판 제품을 찾지 못했습니다. 제품 이름과 표시된 기능성에서 원료를 읽어 고르는 방식이라,
            이름에 원료가 드러나지 않는 제품은 걸리지 않습니다.
          </p>
        )}
      </Section>

      <Section
        title={`손으로 검토한 영양제 ${SUPPLEMENTS.length}종`}
        desc="성분과 근거를 하나하나 확인한 것들입니다. 복용 중인 것을 선택하면 영양소 합계에 더해지고, 이 암종·약제와의 문제도 함께 검사합니다. 시판 제품 전체는 위에서 찾으실 수 있습니다."
      >
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`chip shrink-0 border ${
                cat === c ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-200 bg-white text-stone-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="card divide-y divide-stone-100 overflow-hidden">
          {list.map(({ s, v }) => {
            const isOpen = open === s.id
            const isTaking = taking.includes(s.id)
            return (
              <li key={s.id}>
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <LevelDot level={v.level} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-stone-900">{s.name}</span>
                      {v.level && v.level !== 'info' && <LevelBadge level={v.level} />}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-stone-400">
                      {s.brand !== '-' ? `${s.brand} · ` : ''}{s.category} · {s.dosageLabel}
                    </div>
                  </button>
                  <button
                    onClick={() => onToggle(s.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      isTaking ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {isTaking ? '복용 중' : '추가'}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-stone-100 bg-stone-50/60 px-3.5 py-3">
                    {s.note && <p className="mb-3 text-xs leading-relaxed text-stone-600">{s.note}</p>}

                    {Object.keys(s.perDay).length > 0 && (
                      <>
                        <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                          1일 섭취량 기준 영양성분
                        </h5>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {Object.entries(s.perDay).map(([k, val]) => {
                            const m = NUTRIENT_META_BY_KEY[k as keyof typeof NUTRIENT_META_BY_KEY]
                            if (!m || typeof val !== 'number') return null
                            return (
                              <span key={k} className="chip bg-white text-stone-600 ring-1 ring-stone-200">
                                {m.label} {fmt(val, m.digits)} {m.unit}
                              </span>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {s.actives && s.actives.length > 0 && (
                      <>
                        <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                          기능성 원료
                        </h5>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {s.actives.map((a) => (
                            <span key={a.name} className="chip bg-white text-stone-600 ring-1 ring-stone-200">
                              {a.name} {a.amount}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {(v.hits.length > 0 || v.interactions.length > 0) && (
                      <div className="space-y-2">
                        {v.hits.map((h) => (
                          <div key={h.rule.id} className="rounded-lg border border-stone-200 bg-white p-2.5">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <LevelBadge level={h.rule.level} />
                              <EvidenceBadge level={h.rule.evidence} />
                            </div>
                            <p className="text-xs font-semibold text-stone-900">{h.rule.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">{h.rule.reason}</p>
                            <Cites ids={h.rule.refIds} />
                          </div>
                        ))}
                        {v.interactions.map((h) => (
                          <div key={h.interaction.id} className="rounded-lg border border-sky-200 bg-white p-2.5">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <LevelBadge level={h.interaction.level} />
                              <span className="chip bg-sky-100 text-sky-700">약물 상호작용</span>
                            </div>
                            <p className="text-xs font-semibold text-stone-900">{h.interaction.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">{h.interaction.reason}</p>
                            <Cites ids={h.interaction.refIds} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <p className="mt-3 px-1 text-[11px] leading-relaxed text-stone-400">
          함량은 제품의 1일 섭취량 표시값을 기준으로 정리했습니다. 제조사가 처방을 바꾸는 일이 잦으므로,
          실제로는 가지고 계신 제품의 라벨을 확인하는 것이 정확합니다.
        </p>
      </Section>
    </div>
  )
}

function Cites({ ids }: { ids: string[] }) {
  const refs = ids.map((id) => REF_BY_ID[id]).filter(Boolean)
  if (refs.length === 0) return null
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-[10px] font-medium text-stone-400">근거 {refs.length}건</summary>
      <ul className="mt-1 space-y-0.5">
        {refs.map((r) => (
          <li key={r.id} className="text-[10px] leading-relaxed text-stone-500">{r.citation}</li>
        ))}
      </ul>
    </details>
  )
}

const CANCER_LABEL: Record<string, string> = {
  breast: '유방암', prostate: '전립선암', lung: '폐암', stomach: '위암', colorectal: '대장암',
  liver: '간암', pancreas: '췌장암', esophagus: '식도암', headneck: '두경부암', gyn: '부인암'
}

const ADVICE_STYLE: Record<AdviceLevel, { cls: string; chip: string; label: string }> = {
  recommend: { cls: 'border-brand-200 bg-brand-50/40', chip: 'bg-brand-600 text-white', label: '권장' },
  consider: { cls: 'border-stone-200', chip: 'bg-stone-500 text-white', label: '고려' },
  caution: { cls: 'border-warn-200 bg-warn-50/40', chip: 'bg-warn-600 text-white', label: '주의' },
  avoid: { cls: 'border-danger-200 bg-danger-50/40', chip: 'bg-danger-600 text-white', label: '피하세요' }
}

function AdviceGroup({
  title, level, items
}: {
  title: string
  level: AdviceLevel
  items: ReturnType<typeof adviseSupplements>
}) {
  const st = ADVICE_STYLE[level]
  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-stone-400">{title}</h3>
      <div className="space-y-2">
        {items.map((a, i) => (
          <div key={a.category + i} className={`card p-3.5 ${st.cls}`}>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`chip ${st.chip}`}>{st.label}</span>
              <span className="chip bg-white text-stone-600 ring-1 ring-stone-200">{a.category}</span>
              <EvidenceBadge level={a.evidence} />
            </div>
            <p className="text-sm font-semibold text-stone-900">{a.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">{a.reason}</p>
            <p className="mt-2 text-[11px] text-stone-500">
              이 추천이 나온 이유: <span className="font-medium text-stone-700">{a.trigger}</span>
            </p>
            {a.products.length > 0 && level !== 'avoid' && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.products.slice(0, 4).map((p) => (
                  <span key={p.id} className="chip bg-white text-stone-500 ring-1 ring-stone-200">{p.name}</span>
                ))}
              </div>
            )}
            <Cites ids={a.refIds} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 시판 제품 한 건.
 *
 * 제품 자체를 검토한 것이 아니라, 표시된 제품명·기능성에서 원료를 알아보고
 * 그 원료의 근거로 판단한다. 그래서 판단 근거를 원료 단위로 밝힌다.
 */
function MarketProduct({ product, patient }: { product: ExtSupplement; patient: PatientContext }) {
  const [open, setOpen] = useState(false)
  const verdict = useMemo(
    () => judgeProduct(product.name, product.fn, patient),
    [product, patient]
  )

  const tone =
    verdict.level === 'avoid' ? 'border-danger-200 bg-danger-50/40'
    : verdict.level === 'caution' ? 'border-warn-200 bg-warn-50/40'
    : verdict.level === 'prefer' ? 'border-brand-200 bg-brand-50/40'
    : ''

  return (
    <div className={`card p-3.5 ${tone}`}>
      <button className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {verdict.level && verdict.level !== 'info' && <LevelBadge level={verdict.level} />}
          <span className="chip bg-stone-100 text-stone-500">식약처 신고</span>
          {verdict.items.slice(0, 2).map((v) => (
            <span key={v.ingredient} className="chip bg-white text-stone-600 ring-1 ring-stone-200">
              {v.ingredient}
            </span>
          ))}
        </div>
        <p className="text-sm font-semibold text-stone-900">{product.name}</p>
        <p className="mt-0.5 text-[11px] text-stone-400">{product.maker}</p>
        {product.fn && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-500">{product.fn}</p>
        )}
      </button>

      {open && (
        <div className="mt-3 border-t border-stone-200 pt-3">
          {verdict.unknown ? (
            <p className="text-xs leading-relaxed text-stone-500">
              제품명에서 아는 원료를 찾지 못했습니다. 성분표를 보고 판단하셔야 합니다.
              궁금하시면 문의로 알려 주세요.
            </p>
          ) : (
            <div className="space-y-2">
              {verdict.items.map((v) => (
                <div key={v.ingredient} className="rounded-lg bg-white p-2.5 ring-1 ring-stone-200">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <LevelBadge level={v.level} />
                    <EvidenceBadge level={v.evidence} />
                    <span className="chip bg-stone-100 text-stone-600">{v.ingredient}</span>
                    {v.because && <span className="chip bg-sky-100 text-sky-700">{v.because}</span>}
                  </div>
                  <p className="text-[11px] leading-relaxed text-stone-600">{v.reason}</p>
                  <Cites ids={v.refIds} />
                </div>
              ))}
            </div>
          )}
          {product.use && (
            <p className="mt-2 text-[11px] text-stone-400">섭취 방법: {product.use}</p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
            제품에 표시된 이름과 기능성으로 판단한 것입니다. 실제 성분표와 함량은 제품 포장을 확인하세요.
          </p>
        </div>
      )}
    </div>
  )
}
