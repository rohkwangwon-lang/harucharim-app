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
footer{grid-column:1/-1;border-top:1px solid var(--line);margin-top:40px;padding-top:22px;
  font-size:12.5px;color:var(--mute);display:flex;flex-wrap:wrap;gap:18px;justify-content:space-between}
a:focus-visible,.toc a:focus-visible{outline:2px solid var(--celadon);outline-offset:3px}
@media print{
  .toc{display:none} .wrap{grid-template-columns:1fr;max-width:none}
  .entry,.sub,.part{break-inside:avoid} body{background:#fff}
}
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
