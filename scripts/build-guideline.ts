/**
 * 환자용 식이·영양 가이드라인을 앱 데이터에서 직접 만들어 낸다.
 *
 * 손으로 옮겨 적으면 문서와 앱이 반드시 어긋난다.
 * 규칙·출처·목표를 모두 같은 자리에서 읽어 오므로,
 * 앱을 고치면 다음 생성 때 문서도 따라 고쳐진다.
 */
import fs from 'node:fs'
import { COMMON_RULES } from '../src/data/commonRules'
import { CONDITION_RULES } from '../src/data/conditionRules'
import { CANCERS } from '../src/data/cancers'
import { INTERACTIONS, MEDICATIONS } from '../src/data/interactions'
import { INGREDIENT_RULES } from '../src/data/ingredientRules'
import { ALL_REFERENCES } from '../src/data/references'

type R = {
  id: string; level: string; title: string; reason: string
  refIds?: string[]; evidence?: string; phases?: string[]; subtypes?: string[]
}

const e = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* 본문에 별표 강조가 남아 있으면 문서에서는 <em> 으로 바꾼다 */
const body = (s: string) => e(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>')

const LEVEL: Record<string, { ko: string; cls: string }> = {
  avoid: { ko: '피하세요', cls: 'lv-avoid' },
  caution: { ko: '주의', cls: 'lv-caution' },
  prefer: { ko: '권장', cls: 'lv-prefer' },
  info: { ko: '참고', cls: 'lv-info' }
}
const PHASE: Record<string, string> = {
  pre_treatment: '치료 전', during_rt: '방사선치료 중', during_chemo: '항암치료 중',
  post_op: '수술 후 회복기', survivorship: '치료 종료 후', neutropenia: '호중구감소 시기', all: '모든 시기'
}

const refIndex = new Map<string, number>()
ALL_REFERENCES.forEach((r, i) => refIndex.set(r.id, i + 1))

function sources(ids: string[] | undefined): string {
  if (!ids || ids.length === 0) return ''
  const items = ids
    .map((id) => ({ id, n: refIndex.get(id) }))
    .filter((x) => x.n)
    .map((x) => `<a href="#ref-${x.n}">${x.n}</a>`)
  if (items.length === 0) return ''
  return `<p class="src">근거 문헌 ${items.join(' · ')}</p>`
}

/** 본문 산문 안에서 각주 번호를 다는 헬퍼 — 참고 문헌 목록으로 이어진다 */
function cite(...ids: string[]): string {
  const n = ids.map((id) => refIndex.get(id)).filter(Boolean)
  if (n.length === 0) return ''
  return `<sup class="cite">${n.map((x) => `<a href="#ref-${x}">${x}</a>`).join(',')}</sup>`
}

function entry(r: R): string {
  const lv = LEVEL[r.level] ?? { ko: r.level, cls: 'lv-info' }
  const tags: string[] = []
  if (r.phases?.length && !(r.phases.length === 1 && r.phases[0] === 'all')) {
    tags.push(r.phases.map((p) => PHASE[p] ?? p).join(' · '))
  }
  if (r.subtypes?.length) tags.push(r.subtypes.join(' · '))
  return `<article class="entry" id="r-${e(r.id)}">
  <div class="mark"><span class="grade" title="근거 등급 ${e(r.evidence ?? '')}">${e(r.evidence ?? '–')}</span></div>
  <div class="say">
    <p class="lv ${lv.cls}">${lv.ko}${tags.length ? `<span class="when">${e(tags.join(' / '))}</span>` : ''}</p>
    <h4>${e(r.title)}</h4>
    <p>${body(r.reason)}</p>
    ${sources(r.refIds)}
  </div>
</article>`
}

/* ── 목차 ─────────────────────────────────────────────── */
const conditionKeys = Object.keys(CONDITION_RULES)
const toc = `
<nav class="toc" aria-label="목차">
  <p class="toc-h">차례</p>
  <ol>
    <li><a href="#p0">읽기 전에</a></li>
    <li><a href="#pA">총론 — 암 환자에게 영양이란</a>
      <ol>
        <li><a href="#a1">왜 영양이 치료의 일부인가</a></li>
        <li><a href="#a2">체중 감소와 악액질</a></li>
        <li><a href="#a3">내 하루 목표 계산하기</a></li>
        <li><a href="#a4">모자랄 때 무엇부터 하는가</a></li>
        <li><a href="#a5">언제 의료진에게 알려야 하는가</a></li>
        <li><a href="#a6">흔한 오해 여섯 가지</a></li>
      </ol>
    </li>
    <li><a href="#pB">영양소별 권고</a>
      <ol>
        <li><a href="#n-macro">열량 · 단백질 · 지방 · 탄수화물</a></li>
        <li><a href="#n-fiber">식이섬유와 수분</a></li>
        <li><a href="#n-min">나트륨 · 칼륨 · 인 · 칼슘</a></li>
        <li><a href="#n-vit">비타민 D · K · B12 · 철 · 아연</a></li>
        <li><a href="#n-anti">항산화제 — 치료 중이 문제다</a></li>
        <li><a href="#n-supp">보충제 성분 한눈에 보기</a></li>
      </ol>
    </li>
    <li><a href="#p1">공통 원칙</a></li>
    <li><a href="#p2">증상과 상태</a>
      <ol>${conditionKeys.map((k) => `<li><a href="#c-${encodeURIComponent(k)}">${e(k)}</a></li>`).join('')}</ol>
    </li>
    <li><a href="#p3">암종별</a>
      <ol>${CANCERS.map((c) => `<li><a href="#k-${e(c.id)}">${e(c.name)}</a></li>`).join('')}</ol>
    </li>
    <li><a href="#p4">약과 음식</a></li>
    <li><a href="#p5">참고 문헌</a></li>
  </ol>
</nav>`

/* ── 본문 ─────────────────────────────────────────────── */
const nRules = COMMON_RULES.length + Object.values(CONDITION_RULES).flat().length +
  CANCERS.reduce((n, c) => n + (c.rules?.length ?? 0), 0) + INTERACTIONS.length

const part1 = `<section id="p1" class="part">
  <p class="pn">1부</p><h2>공통 원칙</h2>
  <p class="lead">암종과 무관하게, 치료를 받는 거의 모든 분께 해당하는 것들입니다. 여기부터 읽으십시오.</p>
  ${(COMMON_RULES as unknown as R[]).map(entry).join('\n')}
</section>`

const part2 = `<section id="p2" class="part">
  <p class="pn">2부</p><h2>증상과 상태</h2>
  <p class="lead">실제 진료에서 “무엇을 드실까”를 좌우하는 것은 암종보다 이쪽인 경우가 많습니다.
  해당하는 항목만 찾아 보셔도 됩니다.</p>
  ${conditionKeys.map((k) => `<div class="sub" id="c-${encodeURIComponent(k)}">
    <h3>${e(k)}</h3>
    ${(CONDITION_RULES[k as keyof typeof CONDITION_RULES] as unknown as R[]).map(entry).join('\n')}
  </div>`).join('\n')}
</section>`

function targetBlock(c: (typeof CANCERS)[number]): string {
  const t = c.target
  const row = (label: string, v: string) => `<div><dt>${label}</dt><dd>${v}</dd></div>`
  return `<div class="target">
    <p class="tl">하루 영양 목표 <span>체중 1 kg 당</span></p>
    <dl>
      ${row('열량', `${t.kcalPerKg[0]}~${t.kcalPerKg[1]} kcal`)}
      ${row('단백질', `${t.proteinPerKg[0]}~${t.proteinPerKg[1]} g`)}
      ${t.fluidPerKg ? row('수분', `${t.fluidPerKg} mL`) : ''}
      ${t.naLimit ? row('나트륨', `하루 ${t.naLimit.toLocaleString()} mg 이하`) : ''}
      ${t.fiberTarget ? row('식이섬유', `하루 ${t.fiberTarget[0]}~${t.fiberTarget[1]} g`) : ''}
    </dl>
    ${t.notes?.length ? `<p class="tn">${t.notes.map((n) => body(n)).join(' ')}</p>` : ''}
  </div>`
}

const part3 = `<section id="p3" class="part">
  <p class="pn">3부</p><h2>암종별</h2>
  <p class="lead">암종마다 문제가 되는 자리가 다릅니다. 해당하는 암종만 보시면 됩니다.</p>
  ${CANCERS.map((c) => `<div class="sub" id="k-${e(c.id)}">
    <h3>${e(c.name)}</h3>
    <p class="summary">${body(c.summary)}</p>
    ${c.keyIssues?.length ? `<p class="issues">자주 문제가 되는 것 — ${c.keyIssues.map(e).join(' · ')}</p>` : ''}
    ${targetBlock(c)}
    ${(c.rules as unknown as R[]).map(entry).join('\n')}
    ${Object.entries(c.phaseNotes ?? {}).length ? `<div class="phase">
      <p class="tl">시기별 실무 지침</p>
      ${Object.entries(c.phaseNotes ?? {}).map(([k, v]) => `<div><dt>${e(PHASE[k] ?? k)}</dt><dd>${body(String(v))}</dd></div>`).join('')}
    </div>` : ''}
  </div>`).join('\n')}
</section>`

const part4 = `<section id="p4" class="part">
  <p class="pn">4부</p><h2>약과 음식</h2>
  <p class="lead">약을 드시는 동안에만 해당하는 것들입니다. 아래 약제 가운데 드시는 것이 있으면 그 항목을 보십시오.</p>
  <div class="meds"><p class="tl">이 문서가 다루는 약제 ${MEDICATIONS.length}가지</p>
    <p>${MEDICATIONS.map((m) => `<span class="med">${e(m.name)}${m.aliases?.length ? ` <i>${e(m.aliases.join(', '))}</i>` : ''}</span>`).join('')}</p>
  </div>
  ${(INTERACTIONS as unknown as R[]).map(entry).join('\n')}
</section>`

const KIND: Record<string, string> = {
  guideline: '학회 지침', rct: '무작위배정 시험', meta: '메타분석',
  review: '종설', cohort: '코호트 연구', db: '자료원'
}
const part5 = `<section id="p5" class="part">
  <p class="pn">5부</p><h2>참고 문헌</h2>
  <p class="lead">${ALL_REFERENCES.length}종입니다. 모두 원문을 받아 이 문서의 문장과 맞춰 본 것들입니다.
  링크가 있는 것은 눌러 원문으로 가실 수 있습니다.</p>
  <ol class="refs">
    ${ALL_REFERENCES.map((r, i) => `<li id="ref-${i + 1}">
      <span class="rk">${e(KIND[r.kind] ?? r.kind)}</span>
      <span class="rc">${e(r.citation)}</span>
      ${r.url ? `<a class="ru" href="${e(r.url)}" target="_blank" rel="noopener">원문 보기</a>` : ''}
    </li>`).join('\n')}
  </ol>
</section>`


/* ── A부 총론 ───────────────────────────────────────── */
const partA = `<section id="pA" class="part">
  <p class="pn">총론</p><h2>암 환자에게 영양이란</h2>
  <p class="lead">개별 음식으로 들어가기 전에, 왜 이것을 챙겨야 하는지와
    내 몫이 얼마인지를 먼저 정리합니다. 이 장만 읽으셔도 큰 틀은 잡히실 것입니다.</p>

  <div class="sub" id="a1">
    <h3>1. 왜 영양이 치료의 일부인가</h3>
    <p>영양은 치료를 돕는 곁가지가 아니라 치료를 <em>완주하게 하는 조건</em>입니다.
      먹지 못해 몸이 축나면 항암제 용량을 줄이거나 미루게 되고, 수술 뒤 회복이 늦어지며,
      감염이 늘고, 결국 치료 결과 자체가 나빠집니다.
      유럽임상영양대사학회는 그래서 암 환자에게 영양 상태를 <em>일찍, 반복해서</em>
      확인하도록 권고합니다.${cite('espen2021', 'espen-cachexia')}</p>
    <p>반대 방향도 중요합니다. 음식으로 암을 낫게 할 수는 없습니다.
      확인된 바 없는 이야기에 시간과 돈을 쓰다가 정작 필요한 열량과 단백질을 놓치는 일이
      진료실에서 드물지 않습니다. 이 문서가 하려는 일은 그 사이를 갈라 놓는 것입니다.</p>
    <p>치료를 마치신 뒤에도 영양은 남습니다. 다만 목표가 바뀝니다 —
      치료 중에는 <em>지키는 것</em>이, 그 뒤에는 <em>두 번째 암과 다른 병을 막는 것</em>이
      목표가 됩니다. 조기 유방암이나 전립선암처럼 예후가 좋은 암에서는
      암보다 심혈관질환이 더 흔한 사망 원인이 되기도 합니다.${cite('wcrf2018', 'acs2022')}</p>
  </div>

  <div class="sub" id="a2">
    <h3>2. 체중 감소와 악액질 — 숫자로 알아 두십시오</h3>
    <p>“조금 빠졌다”는 말은 사람마다 뜻이 다릅니다. 국제 합의 기준은 이렇습니다.${cite('fearon2011')}</p>
    <div class="target">
      <p class="tl">악액질에 해당하는 체중 감소 <span>둘 중 하나만 맞아도</span></p>
      <dl>
        <div><dt>보통 체격</dt><dd>6개월 안에 5 % 초과</dd></div>
        <div><dt>마르신 분 (체질량지수 20 미만)</dt><dd>2 % 초과</dd></div>
        <div><dt>근감소가 있는 분</dt><dd>2 % 초과</dd></div>
      </dl>
      <p class="tn">60 kg 인 분이 6개월에 3 kg 이면 5 % 입니다.
        마르신 분은 1.2 kg 만 빠져도 같은 기준에 해당합니다 — 이것이 잘 알려지지 않은 부분입니다.</p>
    </div>
    <p>여기서 빠지는 것은 지방이 아니라 <em>근육</em>이라는 점이 중요합니다.
      근육량은 항암제 용량 유지와 치료 완주율에 직접 연결됩니다.
      그래서 치료 중에는 체중을 줄이는 것이 목표가 아니며,
      체중계 숫자가 그대로여도 근육이 줄고 지방이 느는 일이 흔합니다.${cite('espen2021', 'asco2022')}</p>
    <p>주 1회, 같은 시간·같은 옷차림으로 재시는 것으로 충분합니다.
      매일 재면 물빠짐에 따른 흔들림에 마음만 쓰이게 됩니다.</p>
  </div>

  <div class="sub" id="a3">
    <h3>3. 내 하루 목표 계산하기</h3>
    <p>암종별 세부 목표는 3부에 있지만, 계산법은 공통입니다.
      유럽임상영양대사학회의 권고를 체중에 곱해 씁니다.${cite('espen2021', 'espen-cachexia')}</p>
    <div class="target">
      <p class="tl">계산 <span>체중 1 kg 당</span></p>
      <dl>
        <div><dt>열량</dt><dd>25~30 kcal</dd></div>
        <div><dt>단백질</dt><dd>1 g 초과 · 가능하면 1.5 g 까지</dd></div>
        <div><dt>수분</dt><dd>30~35 mL</dd></div>
      </dl>
      <p class="tn">60 kg 이면 하루 1,500~1,800 kcal, 단백질 60 g 을 넘겨 90 g 쪽,
        물 1.8~2.1 L 입니다. 단백질 권고는 <em>“1.0~1.5”가 아니라 “1 g 을 넘겨 1.5 까지”</em>입니다 —
        원문이 그렇게 적혀 있고, 하한이 다릅니다.
        체중이 줄고 있거나 마르신 분은 열량을 30~35 kcal 쪽 상단으로 잡습니다.</p>
    </div>
    <p>단백질 90 g 은 막연합니다. 손으로 가늠하시는 편이 낫습니다 —
      달걀 1개 6 g, 두부 반 모 15 g, 생선 한 토막 20 g, 닭가슴살 100 g 에 30 g,
      우유 한 잔 6 g, 밥 한 공기 6 g. 매 끼니에 손바닥만 한 단백질 반찬이 하나씩 있으면 대개 채워집니다.</p>
  </div>

  <div class="sub" id="a4">
    <h3>4. 모자랄 때 무엇부터 하는가 — 순서가 있습니다</h3>
    <p>모자란다고 곧바로 영양제를 사는 것이 아닙니다. 단계가 정해져 있습니다.${cite('espen2021')}</p>
    <div class="phase">
      <p class="tl">순서</p>
      <div><dt>① 먼저 식사</dt><dd>같은 부피에서 열량·단백질을 올립니다. 죽에 참기름·달걀·단백질분말을 섞고,
        우유에 미숫가루를 타고, 간식으로 견과·치즈를 둡니다. 양을 늘리는 것보다 <em>한 입의 밀도</em>를 올리는 쪽이 실행됩니다.</dd></div>
      <div><dt>② 그래도 모자라면 경구영양보충</dt><dd>이른바 영양음료입니다. 식사를 대신하는 것이 아니라 더하는 것입니다.</dd></div>
      <div><dt>③ 그래도 안 되면 관을 통한 영양</dt><dd>코를 통하거나 위루관을 통해 넣습니다.
        식도암·두경부암에서는 치료 시작 전에 미리 논의하는 편이 낫습니다.</dd></div>
      <div><dt>④ 장을 쓸 수 없을 때만 정맥영양</dt><dd>순서상 마지막입니다.</dd></div>
    </div>
    <p>어느 시점에 ②로 넘어가야 하는지도 기준이 있습니다 —
      섭취가 <em>필요량의 절반에 못 미치는 상태가 1주를 넘거나</em>,
      <em>절반에서 4분의 3 수준이 2주를 넘으면</em> 의학적 영양요법을 시작하도록 권고합니다.${cite('espen2021')}</p>
    <p>인슐린 저항성이 있으면서 체중이 줄고 있는 분께는 탄수화물보다 지방 쪽 열량 비중을 올리도록 권합니다 —
      부피당 열량을 높이면서 혈당 부담은 낮추려는 것입니다. 참기름·견과·치즈를 먼저 드는 이유가 여기 있습니다.${cite('espen-cachexia')}</p>
  </div>

  <div class="sub" id="a5">
    <h3>5. 언제 의료진에게 알려야 하는가</h3>
    <p>아래는 다음 진료를 기다리지 마시고 알리셔야 하는 것들입니다.</p>
    <div class="phase">
      <p class="tl">알리십시오</p>
      <div><dt>체중</dt><dd>한 달에 2 % 넘게 빠질 때. 60 kg 이면 1.2 kg 입니다.</dd></div>
      <div><dt>먹는 양</dt><dd>평소의 절반도 못 드시는 날이 사나흘 이어질 때.</dd></div>
      <div><dt>삼킴</dt><dd>삼킬 때 기침이 나거나 목소리가 젖은 소리로 변할 때 — 연하 평가가 필요합니다.</dd></div>
      <div><dt>구토·설사</dt><dd>하루를 넘겨 이어지거나 소변이 줄 때(탈수).</dd></div>
      <div><dt>발열</dt><dd>호중구가 낮은 시기의 38 ℃ 이상은 응급입니다.</dd></div>
      <div><dt>새 영양제</dt><dd>드시기 <em>전에</em> 말씀하십시오. 항암제와 부딪히는 것이 실제로 있습니다.</dd></div>
    </div>
  </div>

  <div class="sub" id="a6">
    <h3>6. 흔한 오해 여섯 가지</h3>
    <p>진료실에서 반복해 바로잡게 되는 것들입니다. 근거는 각 항목의 번호를 따라가시면 됩니다.</p>
    <div class="myth">
      <div><b>“암세포가 굶어 죽게 설탕을 끊어야 한다”</b>
        <span>당을 끊는다고 암세포만 굶지 않습니다. 굶는 것은 환자분이고, 먼저 빠지는 것은 근육입니다.
          단 음료·과자를 줄이는 것은 다른 이유(영양 밀도)로 맞는 말입니다.${cite('espen2021', 'wcrf2018')}</span></div>
      <div><b>“유방암이면 콩·두부를 끊어야 한다”</b>
        <span>반대입니다. 진단 후 대두 섭취가 많은 군에서 재발이 낮았고, 이 경향은 수용체 양성에서도
          타목시펜 복용자에서도 같았습니다. 다만 이소플라본을 수십 배 농축한 <em>보충제</em>는 별개입니다.${cite('shu2009', 'nechuta2012', 'acs2022')}</span></div>
      <div><b>“가공육이 담배와 같은 1군이라니 큰일이다”</b>
        <span>국제암연구소가 직접 밝혀 두었습니다 — 이 등급은 <em>근거가 얼마나 확실한가</em>를 말하는 것이지
          <em>얼마나 위험한가</em>를 재는 것이 아닙니다.${cite('iarc114')}</span></div>
      <div><b>“면역력에 좋다니 이것저것 챙겨 먹자”</b>
        <span>치료 중 고용량 항산화 보충제는 오히려 해가 될 수 있습니다.
          두경부암 무작위배정 시험에서 보충 기간 중 이차암이 2.9배 많았습니다.${cite('bairati2005', 'bairati2005b', 'meyer2008smoking')}</span></div>
      <div><b>“호중구가 낮으니 생과일·생채소를 다 끊어야 한다”</b>
        <span>이른바 호중구감소증 식단이 감염을 줄인다는 근거는 메타분석에서 확인되지 않았고,
          조혈모세포이식군에서는 오히려 감염이 더 많았습니다. 익히고 씻어 안전하게 다루는 쪽이 맞습니다.
          다만 생 새싹채소만은 예외라 익혀 드셔야 합니다.${cite('sonbol2015', 'fda-foodsafety')}</span></div>
      <div><b>“수술했으니 죽만 몇 주 먹어야 한다”</b>
        <span>수술 후 회복 지침은 반대로 말합니다 — 정상 식사 재개가 늦어질수록 감염이 늘고 회복이 느려지므로,
          대부분의 환자는 수술 당일부터 음식을 시작해야 한다고 강하게 권고합니다.${cite('eras-colorectal')}</span></div>
    </div>
  </div>
</section>`


/* ── B부 영양소별 ───────────────────────────────────── */
const ING = INGREDIENT_RULES as unknown as {
  name: string; base: string; reason: string; evidence: string; refIds?: string[]
  duringTreatment?: { level: string; reason: string }
}[]

const ingRow = (nm: string): string => {
  const r = ING.find((x) => x.name === nm)
  if (!r) return ''
  const lv = LEVEL[r.base] ?? { ko: r.base, cls: 'lv-info' }
  const dt = r.duringTreatment
  const dlv = dt ? (LEVEL[dt.level] ?? { ko: dt.level, cls: 'lv-info' }) : null
  return `<div class="ing">
    <div class="ing-h"><b>${e(r.name)}</b>
      <span class="lv ${lv.cls}">평소 ${lv.ko}</span>
      ${dlv ? `<span class="lv ${dlv.cls}">치료 중 ${dlv.ko}</span>` : ''}
      <span class="grade sm">${e(r.evidence)}</span></div>
    <p>${body(r.reason)}</p>
    ${dt ? `<p class="dt">치료 중 — ${body(dt.reason)}</p>` : ''}
    ${sources(r.refIds)}
  </div>`
}

const partB = `<section id="pB" class="part">
  <p class="pn">각론</p><h2>영양소별 권고</h2>
  <p class="lead">“이 성분은 어떻습니까”라는 질문에 답하는 장입니다.
    음식으로 먹는 것과 보충제로 농축한 것은 답이 다른 경우가 많아, 그 둘을 나누어 적었습니다.</p>

  <div class="sub" id="n-macro">
    <h3>열량 · 단백질 · 지방 · 탄수화물</h3>
    <div class="target">
      <p class="tl">기본 목표 <span>체중 1 kg 당 · 자세한 것은 총론 3장</span></p>
      <dl>
        <div><dt>열량</dt><dd>25~30 kcal</dd></div>
        <div><dt>단백질</dt><dd>1 g 초과 ~ 1.5 g</dd></div>
        <div><dt>수분</dt><dd>30~35 mL</dd></div>
      </dl>
      <p class="tn">체중이 줄고 있거나 마르신 분은 열량을 상단(30~35)으로 잡습니다.
        신장 기능이 떨어져 있으면 단백질은 검사 수치를 보고 담당 의료진이 정합니다 — 임의로 늘리지 마십시오.${cite('espen2021')}</p>
    </div>
    <p><strong>단백질.</strong> 암 환자에게는 모자란 것보다 조금 넘치는 쪽이 낫고,
      체중 1 kg 당 2.0 g 까지는 대체로 안전하다고 봅니다. 신장 기능이 떨어진 경우만 예외입니다.${cite('espen2021')}
      식사량을 늘리기 어려울 때는 단백질 보충제로 부피를 키우지 않고 단백질만 올릴 수 있습니다.</p>
    <p><strong>지방.</strong> 체중이 줄고 인슐린 저항성이 있는 분께는 탄수화물보다 지방 쪽 열량 비중을 올리도록 권고합니다.
      부피당 열량이 높으면서 혈당 부담이 낮기 때문입니다.${cite('espen-cachexia')}
      오메가-3 는 아래 보충제 표를 보십시오.</p>
    <p><strong>탄수화물·당.</strong> 단 음료와 과자는 포만감만 만들고 영양은 남기지 않습니다.
      다만 “당을 끊으면 암세포가 굶는다”는 말은 사실이 아닙니다(총론 6장).
      과일에 든 당은 식이섬유·미량영양소와 함께 들어오므로 여기서 말하는 대상이 아닙니다.${cite('wcrf2018', 'acs2022')}</p>
  </div>

  <div class="sub" id="n-fiber">
    <h3>식이섬유와 수분</h3>
    <p><strong>식이섬유.</strong> 세계암연구기금은 식품으로 하루 30 g 이상을 권고합니다.${cite('wcrf2018')}
      다만 <em>시기에 따라 정반대</em>가 됩니다 — 수술 직후, 장이 좁아진 상태, 장루를 만든 초기,
      골반 방사선치료로 설사가 심한 시기에는 오히려 줄여야 합니다. 해당 항목은 2부와 3부에 있습니다.</p>
    <p>대장암에서는 어디서 온 섬유인지가 갈립니다. 1~3기 환자 1,575명을 8년 추적한 코호트에서
      진단 후 섬유를 하루 5 g 더 드실 때마다 대장암 사망이 22 % 낮았는데,
      <em>곡물 섬유가 가장 뚜렷했고 과일 섬유는 연관이 확인되지 않았습니다.</em>${cite('song2018fiber')}</p>
    <p><strong>채소·과일.</strong> 세계암연구기금의 목표는 “채소 400 g”이 아니라
      <em>비전분 채소와 과일을 합쳐 하루 400 g 이상(1회 약 80 g × 5회 이상)</em>입니다.
      감자·고구마·마 같은 전분질 뿌리채소는 여기에 들어가지 않습니다.${cite('wcrf2018')}</p>
    <p><strong>수분.</strong> 체중 1 kg 당 30~35 mL 가 기준입니다. 다만 복수가 있거나 심부전이 있으면 다릅니다.
      회장루가 있는 분은 수분과 나트륨 손실이 커 따로 챙기셔야 합니다(2부 장루보유).</p>
  </div>

  <div class="sub" id="n-min">
    <h3>나트륨 · 칼륨 · 인 · 칼슘</h3>
    <div class="target">
      <p class="tl">한국인 기준 <span>2020 한국인 영양소 섭취기준</span></p>
      <dl>
        <div><dt>나트륨 충분섭취량</dt><dd>1,500 mg</dd></div>
        <div><dt>나트륨 만성질환위험감소섭취량</dt><dd>2,300 mg</dd></div>
        <div><dt>칼륨 충분섭취량</dt><dd>3,500 mg</dd></div>
        <div><dt>인 권장섭취량</dt><dd>700 mg (상한 3,500)</dd></div>
        <div><dt>칼슘 권장섭취량</dt><dd>700~800 mg</dd></div>
      </dl>
      <p class="tn">65~74세는 나트륨 기준이 2,100 mg, 75세 이상은 1,700 mg 으로 더 낮습니다.
        칼슘 상한은 19~49세 2,500 mg, 50세 이상 2,000 mg 입니다.${cite('kdri2020')}</p>
    </div>
    <p><strong>나트륨.</strong> 한국인 평균 섭취량은 하루 3,255 mg 으로 기준의 1.4배입니다.${cite('knhanes')}
      대부분이 국·찌개·김치·젓갈에서 옵니다 — <em>국물을 남기는 것만으로 한 끼의 절반 가까이가 줄어듭니다.</em>
      만성질환위험감소섭취량은 “그 아래로 반드시 내려가라”는 뜻이 아니라,
      그보다 많이 드시고 계시면 줄이는 만큼 위험이 낮아진다는 뜻입니다.${cite('kdri2020')}</p>
    <p>위암에서는 별도의 의미가 있습니다. 207만 명을 모은 메타분석에서 고염군의 위암 위험이
      저염군의 2.05배였고, <em>아시아만 따로 보면 1.27배</em>였습니다.
      한국 코호트를 포함한 분석에서는 절임채소를 하루 40 g 더 드실 때마다 위험이 15 % 씩 올라갔습니다.${cite('ge2012salt', 'yoo2020pickled')}</p>
    <p><strong>칼륨·인.</strong> 신장 기능이 떨어지면 배설이 줄어 문제가 됩니다.
      칼륨은 바나나·감자·토마토·건과일·저염소금(염화칼륨)이 대표적 급원이고,
      채소는 잘게 썰어 데쳐 물을 버리면 상당히 줄어듭니다.
      인은 <em>가공식품에 첨가된 무기 인산염이 자연 식품의 인보다 훨씬 잘 흡수된다</em>는 것이 요점입니다 —
      콜라·가공치즈·햄류가 대표적입니다.${cite('kdri2020')}</p>
    <p><strong>칼슘.</strong> 평소 기준은 700~800 mg 이지만,
      아로마타제 억제제나 안드로겐 차단요법으로 골 소실이 진행 중일 때는 더 높게 잡습니다.
      국제골다공증재단이 폐경 후 여성에게 권하는 양은 칼슘 1,200 mg, 비타민 D 800~1,000 IU 입니다.
      골밀도 T값이 −2.0 아래이거나 −1.5 아래이면서 위험 인자가 있으면
      식사가 아니라 약물치료로 넘어갑니다.${cite('hadji2017aibl', 'kdri2020')}</p>
  </div>

  <div class="sub" id="n-vit">
    <h3>비타민 D · K · B12 · 철 · 아연</h3>
    <p><strong>비타민 D.</strong> 한국인 충분섭취량은 성인 10 µg, 65세 이상 15 µg 이고 상한은 100 µg(4,000 IU)입니다.${cite('kdri2020')}
      암 환자에서 결핍이 매우 흔하고 결핍을 교정하는 것은 근거가 분명합니다.
      다만 <em>항암 효과나 예방을 기대한 초고용량은 다릅니다</em> —
      건강한 성인 25,871명에게 2,000 IU 를 5.3년간 드리게 한 시험에서 암 발생이 줄지 않았고(위험비 0.96),
      전이성 대장암 환자에게 고용량을 더한 2상 시험에서도 전체 생존은 양군 모두 24.3개월로 같았습니다.${cite('manson2019', 'ng2019')}</p>
    <p><strong>비타민 K.</strong> 와파린을 드시는 분께만 해당합니다.
      한국인 충분섭취량은 남 75 µg, 여 65 µg 인데 <em>시금치 한 접시로도 이 값을 훌쩍 넘습니다.</em>
      끊으라는 뜻이 아니라 날마다 비슷한 양을 유지하시라는 뜻입니다 — 들쭉날쭉한 것이 문제입니다.${cite('warfarin-vitk', 'kdri2020')}</p>
    <p><strong>비타민 B12.</strong> 위절제를 받으신 분께 특히 중요합니다.
      B12 흡수에 필요한 내인자가 위 벽세포에서 만들어지기 때문입니다.
      위암으로 위절제를 받은 2,627명을 모은 메타분석에서 B12 결핍은 48.8 % 에서 확인되었습니다.
      증상은 빈혈·쉽게 지침·손발 시림·저림·어지럼이었고,
      <em>결핍은 되돌리기 어려운 신경 손상으로 이어질 수 있습니다.</em>${cite('b12-gastrectomy-meta')}</p>
    <p><strong>철.</strong> 결핍이 확인되었을 때 교정하는 것이 원칙입니다. 결핍이 아닌데 넣을 이유는 없습니다.
      위절제 후에는 위산이 줄어 흡수가 떨어지므로 수년에 걸쳐 서서히 나타나는 경우가 많습니다.${cite('kdri2020')}</p>
    <p><strong>아연.</strong> 미각 변화에 흔히 쓰이지만 무작위배정 연구 결과가 일관되지 않습니다.
      장기 고용량은 구리 결핍을 부르므로, 몇 주 써 보고 변화가 없으면 중단하시는 편이 낫습니다.${cite('espen2021')}</p>
  </div>

  <div class="sub" id="n-anti">
    <h3>항산화제 — 치료 중이 문제입니다</h3>
    <div class="note">
      <p><strong>이 장이 이 문서에서 가장 자주 오해되는 부분입니다.</strong>
        “항산화”라는 말이 좋게 들리지만, 방사선치료와 상당수 항암제는 <em>활성산소를 통해 암세포를 죽입니다.</em>
        식품 수준을 넘는 고용량 항산화제가 그 기전을 방해할 수 있습니다.</p>
      <p>두경부암 환자 540명 무작위배정 시험에서, 비타민 E 400 IU 와 베타카로틴 30 mg 을
        방사선치료 첫날부터 드신 군은 보충 기간 중 이차암이 2.9배 많았습니다(95 % 신뢰구간 1.56~5.31).
        재발과 사망은 <em>치료 중에도 담배를 피우신 분에게 몰렸고</em>, 피우지 않으신 분에서는 거의 차이가 없었습니다.${cite('bairati2005', 'bairati2005b', 'meyer2008smoking')}</p>
      <p>흡연력이 있으시면 베타카로틴 보충제는 더 분명합니다.
        핀란드 시험에서 폐암 발생이 18 % 많았고 전체 사망도 8 % 많았으며,
        미국 시험에서는 폐암이 28 % 많고 폐암 사망이 46 % 많아 예정보다 21개월 일찍 중단되었습니다.
        <em>“효과가 없었다”가 아니라 “더 나빴다”는 결과입니다.</em>${cite('atbc1994', 'caret1996')}</p>
      <p>채소·과일에 든 항산화 성분은 해당되지 않습니다. 문제가 되는 것은 분리·농축한 보충제입니다.</p>
    </div>
  </div>

  <div class="sub" id="n-supp">
    <h3>보충제 성분 한눈에 보기</h3>
    <p>제품 이름이 아니라 <em>성분</em>으로 보십시오. 같은 성분이 여러 이름으로 팔립니다.
      “평소”와 “치료 중”의 판단이 다른 것이 여럿 있습니다.</p>
    <div class="ings">
      ${ING.map((r) => ingRow(r.name)).join('\n')}
    </div>
    <p class="tn" style="margin-top:20px">새 보충제를 시작하시기 <em>전에</em> 담당 의료진께 말씀하십시오.
      특히 항암치료·방사선치료 중, 수술 전후, 와파린이나 경구 표적치료제를 드시는 동안에는 반드시 확인이 필요합니다.</p>
  </div>
</section>`

const today = new Date().toISOString().slice(0, 10)

const html = `<title>암 환자 식이·영양 지침서</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@400;600;700&family=IBM+Plex+Sans+KR:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
:root{
  --paper:#F6F8F6; --card:#FFFFFF; --ink:#141C1A; --mute:#5E6B66; --line:#DCE3DF;
  --celadon:#2F5D52; --celadon-2:#5E8C80; --wash:#EAF0EC;
  --seal:#A2382B; --amber:#7E6216; --sky:#2C5A73;
  --shadow:0 1px 2px rgba(20,28,26,.05);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --paper:#0F1413; --card:#161D1B; --ink:#E4EAE6; --mute:#93A29C; --line:#26302D;
    --celadon:#8FBDB0; --celadon-2:#6E9A8D; --wash:#182220;
    --seal:#E08A7C; --amber:#D6B45E; --sky:#8FBBD4; --shadow:none;
  }
}
:root[data-theme="dark"]{
  --paper:#0F1413; --card:#161D1B; --ink:#E4EAE6; --mute:#93A29C; --line:#26302D;
  --celadon:#8FBDB0; --celadon-2:#6E9A8D; --wash:#182220;
  --seal:#E08A7C; --amber:#D6B45E; --sky:#8FBBD4; --shadow:none;
}
*{box-sizing:border-box}
body{background:var(--paper);color:var(--ink);
  font-family:"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;
  font-weight:400;line-height:1.75;letter-spacing:-.005em;margin:0;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px 96px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:56px}
@media (max-width:900px){.wrap{grid-template-columns:1fr;gap:0;padding:0 18px 72px}}
h1,h2,h3,h4{font-family:Hahmlet,"Nanum Myeongjo",serif;text-wrap:balance;margin:0}
.cover{grid-column:1/-1;padding:72px 0 40px;border-bottom:2px solid var(--celadon)}
.eyebrow{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.22em;
  text-transform:uppercase;color:var(--celadon);margin:0 0 18px}
h1{font-size:clamp(34px,6vw,58px);font-weight:700;line-height:1.18;letter-spacing:-.02em;max-width:16ch}
.sub{}
.cover .deck{font-size:17px;color:var(--mute);max-width:60ch;margin:18px 0 0;line-height:1.8}
.facts{display:flex;flex-wrap:wrap;gap:0;margin:34px 0 0;border-top:1px solid var(--line)}
.facts div{padding:16px 28px 14px 0;margin-right:28px;border-right:1px solid var(--line)}
.facts div:last-child{border-right:0}
.facts b{display:block;font-family:"IBM Plex Mono",monospace;font-size:24px;font-weight:600;
  color:var(--celadon);font-variant-numeric:tabular-nums;line-height:1.2}
.facts span{font-size:12px;color:var(--mute)}
.toc{position:sticky;top:24px;align-self:start;max-height:calc(100vh - 48px);overflow-y:auto;
  padding:32px 0;font-size:13.5px}
@media (max-width:900px){.toc{position:static;max-height:none;border-bottom:1px solid var(--line);margin-bottom:8px}}
.toc-h{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--mute);margin:0 0 14px}
.toc ol{list-style:none;margin:0;padding:0;counter-reset:t}
.toc>ol>li{counter-increment:t;margin:0 0 10px}
.toc>ol>li>a::before{content:counter(t) ". ";font-family:"IBM Plex Mono",monospace;color:var(--celadon-2)}
.toc ol ol{margin:6px 0 14px 14px;border-left:1px solid var(--line);padding-left:12px}
.toc ol ol li{margin:0 0 4px}
.toc a{color:var(--ink);text-decoration:none;display:block;padding:2px 0}
.toc ol ol a{color:var(--mute);font-size:12.5px}
.toc a:hover{color:var(--celadon);text-decoration:underline;text-underline-offset:3px}
main{padding-top:32px;min-width:0}
.part{margin:0 0 88px;scroll-margin-top:24px}
.pn{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.2em;color:var(--celadon);margin:0 0 6px}
.part>h2{font-size:clamp(26px,4vw,36px);font-weight:700;letter-spacing:-.015em;
  padding-bottom:14px;border-bottom:1px solid var(--line)}
.lead{color:var(--mute);max-width:62ch;margin:16px 0 34px;font-size:15px}
.sub{margin:0 0 52px;scroll-margin-top:24px}
.sub>h3{font-size:22px;font-weight:600;color:var(--celadon);margin:0 0 6px;
  padding-left:12px;border-left:3px solid var(--celadon)}
.summary{max-width:62ch;margin:14px 0 8px}
.issues{font-size:13px;color:var(--mute);margin:0 0 20px}
.entry{display:grid;grid-template-columns:44px minmax(0,1fr);gap:16px;padding:20px 0;
  border-top:1px solid var(--line)}
.entry:first-of-type{border-top:0}
.mark{padding-top:4px}
.grade{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);
  font-family:"IBM Plex Mono",monospace;font-size:13px;font-weight:600;color:var(--celadon);
  background:var(--wash)}
.say>h4{font-size:17.5px;font-weight:600;line-height:1.5;margin:2px 0 8px}
.say>p{margin:0 0 8px;max-width:64ch}
.say em{font-style:normal;font-weight:600;box-shadow:inset 0 -.42em 0 var(--wash)}
.lv{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.12em;margin:0}
.lv-avoid{color:var(--seal)} .lv-caution{color:var(--amber)}
.lv-prefer{color:var(--celadon)} .lv-info{color:var(--sky)}
.when{color:var(--mute);letter-spacing:0;font-family:inherit;margin-left:10px;
  font-size:11.5px;font-family:"IBM Plex Sans KR",sans-serif}
.src{font-size:12px;color:var(--mute);margin:6px 0 0}
.src a{color:var(--celadon);text-decoration:none;font-family:"IBM Plex Mono",monospace;
  border-bottom:1px solid var(--line)}
.src a:hover{border-color:var(--celadon)}
.target,.phase,.meds{background:var(--card);border:1px solid var(--line);padding:18px 20px;
  margin:0 0 24px;box-shadow:var(--shadow)}
.tl{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--mute);margin:0 0 12px}
.tl span{text-transform:none;letter-spacing:0;font-family:"IBM Plex Sans KR",sans-serif;color:var(--celadon-2)}
.target dl{display:flex;flex-wrap:wrap;gap:0;margin:0}
.target dl>div{padding-right:26px;margin-right:26px;border-right:1px solid var(--line)}
.target dl>div:last-child{border-right:0;margin-right:0;padding-right:0}
.target dt{font-size:11.5px;color:var(--mute)}
.target dd{margin:2px 0 0;font-family:"IBM Plex Mono",monospace;font-size:15px;font-weight:600;
  color:var(--ink);font-variant-numeric:tabular-nums}
.tn{font-size:13px;color:var(--mute);margin:14px 0 0;padding-top:12px;border-top:1px solid var(--line)}
.phase>div{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:9px 0;
  border-top:1px solid var(--line)}
.phase>div:first-of-type{border-top:0}
.phase dt{font-size:12.5px;color:var(--celadon);font-weight:500}
.phase dd{margin:0;font-size:14px}
.med{display:inline-block;background:var(--wash);padding:3px 10px;margin:0 6px 6px 0;font-size:13px}
.med i{font-style:normal;color:var(--mute);font-size:11.5px}
.refs{list-style:none;counter-reset:r;margin:0;padding:0;font-size:13.5px}
.refs li{counter-increment:r;display:grid;grid-template-columns:34px 96px minmax(0,1fr);gap:12px;
  padding:12px 0;border-top:1px solid var(--line);scroll-margin-top:24px}
.refs li::before{content:counter(r);font-family:"IBM Plex Mono",monospace;color:var(--celadon-2);
  font-variant-numeric:tabular-nums}
.refs li:target{background:var(--wash)}
.rk{font-size:11.5px;color:var(--mute)}
.rc{line-height:1.65}
.ru{grid-column:3;font-size:12px;color:var(--celadon);text-decoration:none;
  border-bottom:1px solid var(--line);justify-self:start;margin-top:2px}
@media (max-width:640px){.refs li{grid-template-columns:28px minmax(0,1fr)}.rk{grid-column:2}.ru{grid-column:2}
  .entry{grid-template-columns:36px minmax(0,1fr);gap:12px}
  .phase>div{grid-template-columns:1fr;gap:2px}
  .target dl>div{border-right:0;margin-right:0;padding-right:20px}}
.note{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--seal);
  padding:18px 20px;margin:0 0 28px}
.note p{margin:0 0 8px;font-size:14.5px}
.note p:last-child{margin:0}
.gradekey{display:grid;gap:0;margin:20px 0 30px;border:1px solid var(--line);background:var(--card)}
.gradekey>div{display:grid;grid-template-columns:52px minmax(0,1fr);gap:14px;padding:13px 18px;
  border-top:1px solid var(--line);align-items:baseline}
.gradekey>div:first-child{border-top:0}
.gradekey b{font-family:"IBM Plex Mono",monospace;font-size:14px;color:var(--celadon);font-weight:600}
.gradekey span{font-size:14px}
.gradekey i{font-style:normal;color:var(--mute);font-size:13px;display:block;margin-top:2px}
/* 산문 각주 */
.cite{font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.03em;
  vertical-align:super;line-height:0;margin-left:2px}
.cite a{color:var(--celadon-2);text-decoration:none;padding:0 1px}
.cite a:hover{color:var(--celadon);text-decoration:underline}
/* 흔한 오해 */
.myth{margin:18px 0 0;display:grid;gap:0;border-top:1px solid var(--line)}
.myth>div{padding:16px 0;border-bottom:1px solid var(--line)}
.myth b{display:block;font-family:Hahmlet,serif;font-size:16px;font-weight:600;
  color:var(--seal);margin:0 0 6px;line-height:1.5}
.myth span{display:block;font-size:14.5px;max-width:62ch}
/* 성분 카드 */
.ings{display:grid;gap:0;margin:18px 0 0;border-top:1px solid var(--line)}
.ing{padding:16px 0;border-bottom:1px solid var(--line)}
.ing-h{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 7px}
.ing-h b{font-family:Hahmlet,serif;font-size:16.5px;font-weight:600}
.ing-h .lv{font-size:10.5px;border:1px solid currentColor;padding:1px 7px}
.grade.sm{width:20px;height:20px;font-size:11px;margin-left:auto}
.ing p{margin:0 0 5px;font-size:14.5px;max-width:64ch}
.ing .dt{color:var(--seal)}
.ing .src{margin-top:5px}
footer{grid-column:1/-1;border-top:1px solid var(--line);margin-top:40px;padding-top:22px;
  font-size:12.5px;color:var(--mute);display:flex;flex-wrap:wrap;gap:18px;justify-content:space-between}
a:focus-visible,.toc a:focus-visible{outline:2px solid var(--celadon);outline-offset:3px}
@media print{
  /*
   * 인쇄·PDF. 화면용 2단을 1단으로 펴고, 색을 종이에 맞게 낮춘다.
   * 각주는 종이에서 눌러 갈 수 없으므로 번호만 남긴다.
   */
  :root{--paper:#fff;--card:#fff;--ink:#111;--mute:#555;--line:#CFCFCF;
    --celadon:#20463D;--celadon-2:#4C6F65;--wash:#F0F3F1;--shadow:none}
  .toc{display:none}
  .wrap{grid-template-columns:1fr;max-width:none;padding:0;gap:0}
  body{background:#fff;font-size:10.5pt;line-height:1.65}
  .cover{padding:0 0 18pt;border-bottom:1.5pt solid var(--celadon)}
  h1{font-size:26pt}
  .part{margin:0 0 24pt;break-before:page}
  #p0.part{break-before:auto}
  .part>h2{font-size:17pt}
  .sub>h3{font-size:13pt}
  .say>h4{font-size:11.5pt}
  .entry,.sub,.ing,.myth>div,.target,.phase,.gradekey>div,.refs li{break-inside:avoid}
  .part>h2,.sub>h3{break-after:avoid}
  a{color:var(--ink);text-decoration:none}
  .src a,.cite a{color:var(--celadon-2)}
  .ru{display:none}
  .refs li{grid-template-columns:26px 84px minmax(0,1fr)}
  footer{margin-top:20pt}
}
@page{size:A4;margin:16mm 15mm}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="wrap">
  <header class="cover">
    <p class="eyebrow">하루차림 · 근거 대조판 ${today}</p>
    <h1>암 환자 식이·영양 지침서</h1>
    <p class="deck">암 치료를 받는 동안, 그리고 마친 뒤에 무엇을 어떻게 드실지에 대한 안내입니다.
      규칙 ${nRules}개와 참고 문헌 ${ALL_REFERENCES.length}종으로 이루어져 있으며,
      각 항목마다 그 말이 어느 문헌에서 나왔는지와 근거가 얼마나 단단한지를 함께 적었습니다.
      방사선종양학과 전문의가 감수했습니다.</p>
    <div class="facts">
      <div><b>${nRules}</b><span>임상 규칙</span></div>
      <div><b>${ALL_REFERENCES.length}</b><span>참고 문헌 (전부 원문 대조)</span></div>
      <div><b>${CANCERS.length}</b><span>암종</span></div>
      <div><b>${conditionKeys.length}</b><span>증상·상태</span></div>
      <div><b>${MEDICATIONS.length}</b><span>약제</span></div>
    </div>
  </header>

  ${toc}

  <main>
    <section id="p0" class="part">
      <p class="pn">0부</p><h2>읽기 전에</h2>
      <div class="note">
        <p><strong>이 문서는 담당 의료진의 지시를 대신하지 않습니다.</strong>
        여기 적힌 것은 일반적인 안내이고, 여러분의 검사 수치와 치료 계획을 아는 것은 담당 의료진입니다.
        두 이야기가 다르면 담당 의료진의 지시를 따르십시오.</p>
        <p>치료 자체(약, 방사선, 수술)에 대한 판단은 이 문서의 범위가 아닙니다.
        음식과 영양보충제에 한정된 안내입니다.</p>
      </div>
      <h3 style="font-size:20px;margin:34px 0 4px">왜 이런 문서를 만들었는가</h3>
      <p style="max-width:62ch;margin:10px 0 0">진료실에서 가장 많이 나오는 질문이 “무엇을 먹으면 되느냐”인데,
      정작 그 답을 정리해 드릴 시간은 가장 적습니다. 그래서 환자분들은 검색과 주변의 말에 기대게 되고,
      거기에는 근거가 없는 것과 있는 것이 섞여 있습니다.
      이 문서는 그 사이를 갈라 놓으려는 것입니다.</p>
      <p style="max-width:62ch">한 가지 원칙을 지켰습니다 —
      <em style="font-style:normal;font-weight:600;box-shadow:inset 0 -.42em 0 var(--wash)">근거를 부풀리지도 낮추지도 않는다.</em>
      어떤 항목은 “하지 마십시오”라고 단정하고, 어떤 항목은 “아직 모릅니다”라고 적혀 있습니다.
      후자를 지운 문서가 읽기에는 편하지만, 그것은 도움이 되지 않습니다.</p>

      <h3 style="font-size:20px;margin:38px 0 4px">근거 등급 읽는 법</h3>
      <p style="max-width:62ch;margin:10px 0 0">각 항목 왼쪽의 글자는 그 말이 어떤 종류의 연구에서 나왔는지를 뜻합니다.
      <strong>등급이 높다고 위험이 크다는 뜻이 아닙니다</strong> — 얼마나 확실히 아는가를 나타냅니다.</p>
      <div class="gradekey">
        <div><b>A</b><span>무작위배정 시험 또는 메타분석<i>사람을 나누어 비교해 본 결과. 가장 단단한 종류입니다.</i></span></div>
        <div><b>B</b><span>대규모 전향적 코호트<i>많은 사람을 오래 따라가며 관찰한 결과. 연관은 보이지만 원인이라 단정하긴 어렵습니다.</i></span></div>
        <div><b>C</b><span>소규모·후향적 연구 또는 기전<i>이론과 경험에 근거한 조정. 방향은 그럴듯하나 증명된 것은 아닙니다.</i></span></div>
        <div><b>G</b><span>주요 학회 지침의 합의<i>전문가들이 모여 정리한 권고. 근거의 강도는 지침마다 다르므로 본문에 함께 적었습니다.</i></span></div>
      </div>
      <p style="max-width:62ch;font-size:14px;color:var(--mute)">본문에서 <em style="font-style:normal;font-weight:600;box-shadow:inset 0 -.42em 0 var(--wash)">굵게 표시된 부분</em>은
      특히 놓치기 쉬운 지점입니다.</p>
    </section>

    ${partA}
    ${partB}
    ${part1}
    ${part2}
    ${part3}
    ${part4}
    ${part5}
  </main>

  <footer>
    <span>하루차림 — 암 환자 식이·영양 도우미 · 감수 방사선종양학과 전문의</span>
    <span>본문 생성일 ${today} · 앱 데이터에서 자동 생성</span>
  </footer>
</div>`

const dest = process.env.OUT ?? 'guideline.html'
fs.writeFileSync(dest, html)
console.log('작성 완료:', dest, Math.round(html.length / 1024), 'KB')
console.log('규칙', nRules, '· 출처', ALL_REFERENCES.length, '· 암종', CANCERS.length, '· 증상', conditionKeys.length)
