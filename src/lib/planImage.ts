import type { PlanDay } from '../engine/plan'
import { sheetRows, sheetTitle, SHEET_COLS, type SheetLine } from './planSheet'

/**
 * 며칠치 식단표를 그림 한 장으로(2026-10-23) — 냉장고에 붙이는 용도.
 *
 * 사용자 요청(2026-10-23 둘째): 냉장고에 붙이기 좋은 크기와 시인성으로.
 * A4 세로 비율(1240 × 가변, 2배 해상도)에 날짜는 줄, 끼니는 칸인 표로 그린다 — 멀리서도 '오늘 저녁' 칸을 바로 찾게.
 * 글자는 인쇄했을 때 12 pt 안팎(요리 이름 28 px)이고, 요리는 한 줄에 하나씩 세운다.
 * HTML 을 그림으로 바꾸는 라이브러리 없이 캔버스에 그린다. 글꼴은 기기에 있는 것을 쓴다.
 */
export function drawPlanImage(canvas: HTMLCanvasElement, plan: PlanDay[]): void {
  const rows = sheetRows(plan)
  const W = 1240, PAD = 50, scale = 2
  const DAY_W = 170, COL_W = (W - PAD * 2 - DAY_W) / SHEET_COLS.length
  const BODY = 28, LH = 38, CELL_PAD = 16, HEAD_H = 56
  const ctx0 = canvas.getContext('2d')!
  const font = (px: number, weight: 400 | 600 | 700 = 400) => `${weight} ${px}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`

  /* 칸 너비에 맞춰 줄 바꿈(한글은 띄어쓰기가 드물어 글자 단위로 자른다) */
  const wrap = (text: string, max: number, px: number, weight: 400 | 600 | 700 = 400): string[] => {
    ctx0.font = font(px, weight); const out: string[] = []; let line = ''
    for (const ch of text) { const t = line + ch; if (ctx0.measureText(t).width > max && line) { out.push(line.trimEnd()); line = ch === ' ' ? '' : ch } else line = t }
    if (line) out.push(line); return out
  }
  const lineText = (l: SheetLine) => `${l.when ? l.when + ' ' : ''}${l.name}${l.portion ? ' ' + l.portion : ''}`
  const TAG = { '2인분': '2인분 끓여 두기', '어제 것': '어제 끓인 것' } as const
  const tagW = (tag: SheetLine['tag']) => { if (!tag) return 0; ctx0.font = font(16, 700); return ctx0.measureText(TAG[tag]).width + 14 }
  const inner = COL_W - CELL_PAD * 2
  const cellLines = rows.map((r) => SHEET_COLS.map((c) => r.cells[c].flatMap((l) => {
    const ls = wrap(lineText(l), inner, BODY, 600)
    const out = ls.map((t, i) => ({ t, tag: undefined as SheetLine['tag'], first: i === 0 }))
    if (l.tag) {
      /* 마지막 줄 옆에 자리가 있으면 옆에, 없으면 딱지만 한 줄 더(글과 겹치지 않게 — 첫 그림에서 겹쳤다) */
      ctx0.font = font(BODY, 600)
      const last = out[out.length - 1]
      if (ctx0.measureText((last.first ? '' : '  ') + last.t).width + 10 + tagW(l.tag) <= inner) last.tag = l.tag
      else out.push({ t: '', tag: l.tag, first: false })
    }
    return out
  })))
  const rowH = rows.map((_, i) => Math.max(3, ...cellLines[i].map((c) => c.length)) * LH + CELL_PAD * 2)

  const TOP = PAD + 110
  const H = TOP + HEAD_H + rowH.reduce((a, b) => a + b, 0) + 90
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  /* 바탕·제목 */
  ctx.fillStyle = '#faf9f4'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#4b6936'; ctx.font = font(24, 700); ctx.fillText('하루차림 식단표', PAD, PAD + 20)
  ctx.fillStyle = '#282621'; ctx.font = font(46, 700); ctx.fillText(sheetTitle(rows), PAD, PAD + 78)
  ctx.fillStyle = '#7a7566'; ctx.font = font(22)
  const sub = '1인분 기준'
  ctx.fillText(sub, W - PAD - ctx.measureText(sub).width, PAD + 78)

  /* 머리칸 */
  let y = TOP
  ctx.fillStyle = '#4b6936'; ctx.fillRect(PAD, y, W - PAD * 2, HEAD_H)
  ctx.fillStyle = '#faf9f4'; ctx.font = font(26, 700)
  SHEET_COLS.forEach((c, k) => {
    const x = PAD + DAY_W + COL_W * k
    ctx.fillText(c, x + (COL_W - ctx.measureText(c).width) / 2, y + 38)
  })
  y += HEAD_H

  /* 날짜 줄 */
  rows.forEach((r, i) => {
    const h = rowH[i]
    ctx.fillStyle = i % 2 === 0 ? '#faf9f4' : '#f4f7ef'; ctx.fillRect(PAD, y, W - PAD * 2, h)
    /* 날짜 칸 */
    ctx.fillStyle = '#e6ecdb'; ctx.fillRect(PAD, y, DAY_W, h)
    ctx.fillStyle = '#4b6936'; ctx.font = font(20, 700); ctx.fillText(`${r.index + 1}일째`, PAD + 16, y + CELL_PAD + 22)
    ctx.fillStyle = '#282621'; ctx.font = font(44, 700); ctx.fillText(r.weekday, PAD + 16, y + CELL_PAD + 72)
    ctx.fillStyle = '#37342e'; ctx.font = font(26, 600); ctx.fillText(r.date, PAD + 16 + 56, y + CELL_PAD + 72)
    ctx.fillStyle = '#7a7566'; ctx.font = font(18); ctx.fillText(`${r.kcal.toLocaleString()} kcal`, PAD + 16, y + CELL_PAD + 102)
    ctx.fillText(`단백질 ${r.protein} g`, PAD + 16, y + CELL_PAD + 126)
    /* 끼니 칸 */
    SHEET_COLS.forEach((_, k) => {
      const x = PAD + DAY_W + COL_W * k + CELL_PAD
      let ly = y + CELL_PAD + 30
      for (const ln of cellLines[i][k]) {
        ctx.fillStyle = '#282621'; ctx.font = font(BODY, 600)
        ctx.fillText((ln.first ? '' : '  ') + ln.t, x, ly)
        if (ln.tag) {
          const w = ln.t ? ctx.measureText((ln.first ? '' : '  ') + ln.t).width + 10 : 16
          const label = TAG[ln.tag]
          ctx.font = font(16, 700)
          const tw = ctx.measureText(label).width + 14
          const tx = x + w
          ctx.fillStyle = ln.tag === '2인분' ? '#f9edd0' : '#e4e1d6'; ctx.fillRect(tx, ly - 18, tw, 24)
          ctx.fillStyle = ln.tag === '2인분' ? '#754f12' : '#5e5a4e'; ctx.fillText(label, tx + 7, ly - 1)
        }
        ly += LH
      }
      if (cellLines[i][k].length === 0) { ctx.fillStyle = '#a29d8c'; ctx.font = font(BODY); ctx.fillText('—', x, ly) }
    })
    /* 칸 선 */
    ctx.strokeStyle = '#e4e1d6'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(PAD, y + h); ctx.lineTo(W - PAD, y + h); ctx.stroke()
    y += h
  })
  ctx.strokeStyle = '#cdc9ba'; ctx.lineWidth = 1.5
  for (let k = 0; k <= SHEET_COLS.length; k++) {
    const x = PAD + DAY_W + COL_W * k
    ctx.beginPath(); ctx.moveTo(x, TOP); ctx.lineTo(x, y); ctx.stroke()
  }
  ctx.strokeRect(PAD, TOP, W - PAD * 2, y - TOP)

  ctx.fillStyle = '#a29d8c'; ctx.font = font(20)
  ctx.fillText('국·조림은 2인분을 끓여 이틀에 나눕니다 · 치료를 대신하지 않습니다 · harucharim.com', PAD, H - 34)
}
