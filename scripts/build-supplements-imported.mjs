/**
 * 수입 건강기능식품 표시사항을 앱이 쓰는 형태로 만든다.
 *
 *   node scripts/build-supplements-imported.mjs
 *
 * 한 건에 통의 표시 문구가 통째로 들어 있어 판단 재료가 많지만, 2026-11-04 시험에서 두 가지를 배웠다.
 *
 * 1. 원료명을 판정에 그대로 넣으면 안 된다. 스테아린산마그네슘(부형제) 하나로 마그네슘 판정이 900건 났고,
 *    눈개승마가 '승마' 규칙에 걸렸다. 원료명 줄은 여기서 버리고, 기능성 문구와 품목만 남긴다.
 * 2. 절반 가까이가 공장에 들어가는 원료다. 소비자가 살 수 없으니 뺀다.
 *
 * 표시 문구 전문은 담지 않는다. 화면에 띄울 수 없는 표현이 섞여 있다(의료기기법 제26조 — 면역력 등).
 */
import fs from 'node:fs'
import path from 'node:path'
import { functionOf, intakeOf, isRawMaterial } from './imported-label.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data/raw-supplement-imported')

/** 무엇이든 담을 수 있는 품목명은 판정에 도움이 안 된다 */
const GENERIC_ITEM = /복합|기타|제품$/

const byProduct = new Map()
for (const f of fs.readdirSync(RAW).filter((x) => x.endsWith('.json')).sort()) {
  for (const r of JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'))) {
    const key = `${r.BSN_OFC_NAME}|${r.PRDUCT_KOREAN_NM}`
    const cur = byProduct.get(key)
    if (!cur || String(r.PROCS_DTM) > String(cur.PROCS_DTM)) byProduct.set(key, r)
  }
}
const items = []
let raw = 0, unclear = 0
for (const r of byProduct.values()) {
  const label = String(r.KORLABEL ?? '')
  const item = String(r.ITM_NM ?? '').trim()
  if (isRawMaterial(label, item)) { raw++; continue }
  const use = intakeOf(label)
  /* 먹는 방법을 읽어 내지 못한 것은 원료일 수 있어 넣지 않는다. 몇몇 완제품이 함께 빠지지만, 공장 원료를 권하는 것보다 낫다 */
  if (!use) { unclear++; continue }
  /* 'kg' 단위인데 스푼으로 뜨는 제품(단백질 보충제)이 아니면 공장용이다 */
  if (/\d\s*kg/i.test(String(r.PRDUCT_KOREAN_NM)) && !/스푼|스쿱/.test(use)) { raw++; continue }
  const fn = [GENERIC_ITEM.test(item) ? '' : `[${item}]`, functionOf(label)].filter(Boolean).join(' ').slice(0, 1200)
  items.push([
    String(r.PRDUCT_KOREAN_NM).trim(),
    String(r.BSN_OFC_NAME).trim(),
    fn,
    '',
    use,
    String(r.MNF_NTNCD_NM ?? '').trim(),
    `${r.PRDUCT_NM ?? ''} ${r.OVSMNFST_NM ?? ''}`.replace(/\s+/g, ' ').trim()
  ])
}
items.sort((a, b) => a[0].localeCompare(b[0], 'ko'))
const dest = path.join(ROOT, 'public/data/supplements-imported.json')
fs.writeFileSync(dest, JSON.stringify({ cols: ['name', 'maker', 'fn', 'no', 'use', 'country', 'search'], items }))
console.log(`제품 ${byProduct.size.toLocaleString()} → 완제품 ${items.length.toLocaleString()} (원료 ${raw.toLocaleString()} · 애매 ${unclear.toLocaleString()} 제외)`)
console.log(`supplements-imported.json ${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB`)
