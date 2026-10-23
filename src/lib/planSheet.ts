import type { PlanDay } from '../engine/plan'
import type { MealSlot } from '../data/types'
import { portionLabel } from './portion'
import { fromKey } from './day'

/**
 * 식단표(그림·인쇄)에 올릴 줄 — 화면용 MealPlan 과 그림(planImage)·인쇄(MealPlan 의 인쇄 판)가 같은 내용을 보도록 한 곳에서 만든다(2026-10-23).
 * 오전·오후 간식은 '간식' 한 칸에 모은다 — 냉장고에 붙이는 표에 칸이 다섯이면 글자가 작아진다.
 */
export const SHEET_COLS = ['아침', '점심', '저녁', '간식'] as const
export type SheetCol = typeof SHEET_COLS[number]

export interface SheetLine {
  name: string
  /** 1인분이 아닐 때만 — '½ 공기' */
  portion?: string
  /** 2인분 끓여 두기 / 어제 끓인 것 */
  tag?: '2인분' | '어제 것'
  /** 오전·오후 간식 구분 */
  when?: '오전' | '오후'
}

export interface SheetRow {
  day: string
  index: number
  /** '10/27' */
  date: string
  /** '월' */
  weekday: string
  kcal: number
  protein: number
  cells: Record<SheetCol, SheetLine[]>
}

const WD = ['일', '월', '화', '수', '목', '금', '토']

export function sheetRows(plan: PlanDay[]): SheetRow[] {
  return plan.map((p, index) => {
    const d = fromKey(p.day)
    const cells: Record<SheetCol, SheetLine[]> = { 아침: [], 점심: [], 저녁: [], 간식: [] }
    const put = (slot: MealSlot, col: SheetCol, when?: '오전' | '오후') => {
      for (const e of p.menu.meals[slot]) {
        cells[col].push({
          name: e.food.name,
          portion: e.servings !== 1 ? portionLabel(e.food.serving.label, e.servings) : undefined,
          tag: e.contribution && /2인분 끓여/.test(e.contribution) ? '2인분' : e.contribution === '어제 끓인 것' ? '어제 것' : undefined,
          when
        })
      }
    }
    put('아침', '아침'); put('점심', '점심'); put('저녁', '저녁')
    const both = p.menu.meals['오전간식'].length > 0 && p.menu.meals['오후간식'].length > 0
    put('오전간식', '간식', both ? '오전' : undefined); put('오후간식', '간식', both ? '오후' : undefined)
    return {
      day: p.day, index, date: `${d.getMonth() + 1}/${d.getDate()}`, weekday: WD[d.getDay()],
      kcal: Math.round(p.menu.totals.kcal ?? 0), protein: Math.round(p.menu.totals.protein ?? 0), cells
    }
  })
}

/** 그림·인쇄 제목 — '10/27(월) ~ 10/31(금) · 5일치' */
export function sheetTitle(rows: SheetRow[]): string {
  const a = rows[0], b = rows[rows.length - 1]
  return rows.length === 1 ? `${a.date}(${a.weekday})` : `${a.date}(${a.weekday}) ~ ${b.date}(${b.weekday}) · ${rows.length}일치`
}
