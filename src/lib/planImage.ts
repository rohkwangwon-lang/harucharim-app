import type { PlanDay } from '../engine/plan'
import { MEAL_SLOTS } from '../data/types'
import { portionLabel } from './portion'

/**
 * 며칠치 식단표를 그림 한 장으로(2026-10-23) — 냉장고에 붙이거나 보내는 용도.
 * HTML 을 그림으로 바꾸는 라이브러리 없이 캔버스에 글로 그린다. 글꼴은 기기에 있는 것을 쓴다.
 */
export function drawPlanImage(canvas: HTMLCanvasElement, plan: PlanDay[], label: (d: string) => string): void {
  const W = 1080, PAD = 48, LH = 40, scale = 2
  const rows = plan.map((p) => MEAL_SLOTS.filter((s) => p.menu.meals[s].length > 0).map((s) => ({
    slot: s, text: p.menu.meals[s].map((e) => e.food.name + (e.servings !== 1 ? ` ${portionLabel(e.food.serving.label, e.servings)}` : '')).join(' · ')
  })))
  const ctx0 = canvas.getContext('2d')!
  const font = (px: number, bold = false) => `${bold ? '700' : '400'} ${px}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`
  /* 줄 바꿈이 몇 줄인지 먼저 세어 높이를 정한다 */
  const wrap = (text: string, max: number, px: number): string[] => {
    ctx0.font = font(px); const out: string[] = []; let line = ''
    for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (ctx0.measureText(t).width > max && line) { out.push(line); line = w } else line = t }
    if (line) out.push(line); return out
  }
  const bodyW = W - PAD * 2 - 90
  const blocks = rows.map((r) => r.map((x) => ({ ...x, lines: wrap(x.text, bodyW, 26) })))
  let H = PAD + 70 + 30
  for (const b of blocks) { H += 52; for (const x of b) H += x.lines.length * LH; H += 22 }
  H += 60
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#faf9f4'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#4b6936'; ctx.font = font(22, true); ctx.fillText('하루차림', PAD, PAD + 8)
  ctx.fillStyle = '#282621'; ctx.font = font(34, true)
  ctx.fillText(`${plan.length}일치 식단 · ${label(plan[0].day)} ~ ${label(plan[plan.length - 1].day)}`, PAD, PAD + 52)
  let y = PAD + 70 + 30
  blocks.forEach((b, i) => {
    ctx.fillStyle = '#e6ecdb'; ctx.fillRect(PAD, y, W - PAD * 2, 40)
    ctx.fillStyle = '#2a3821'; ctx.font = font(24, true)
    ctx.fillText(`${i + 1}일째  ${label(plan[i].day)}`, PAD + 14, y + 28)
    ctx.font = font(20); ctx.fillStyle = '#5e5a4e'
    const kc = `${Math.round(plan[i].menu.totals.kcal ?? 0).toLocaleString()} kcal · 단백질 ${Math.round(plan[i].menu.totals.protein ?? 0)} g`
    ctx.fillText(kc, W - PAD - 14 - ctx.measureText(kc).width, y + 28)
    y += 52
    for (const x of b) {
      ctx.fillStyle = '#7a7566'; ctx.font = font(24, true); ctx.fillText(x.slot, PAD + 4, y + 28)
      ctx.fillStyle = '#282621'; ctx.font = font(26)
      for (const ln of x.lines) { ctx.fillText(ln, PAD + 90, y + 28); y += LH }
    }
    y += 22
  })
  ctx.fillStyle = '#a29d8c'; ctx.font = font(18)
  ctx.fillText('1인분 기준 · 치료를 대신하지 않습니다 · harucharim.com', PAD, H - 28)
}
