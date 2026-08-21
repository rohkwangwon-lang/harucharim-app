import type { Food, FoodGroup, FoodTag, NutrientKey, Nutrients } from '../data/types'
import type { PackedFoods } from '../data/foods/generated'

/**
 * 확장 식품 데이터 저장소.
 *
 * 상용 가공식품 27만 건은 번들에 넣기엔 너무 크고(gzip 8.7 MB),
 * 매번 서버에서 찾기엔 오프라인이 깨진다.
 * 그래서 최초 한 번만 내려받아 기기 안(IndexedDB)에 넣어 두고, 그 뒤로는
 * 인터넷 없이도 검색과 바코드 조회가 되게 한다.
 *
 * 이름 검색은 앞글자 기준이라 인덱스로 빠르게 찾을 수 있고,
 * 중간 낱말로도 찾히도록 이름을 토막 내어 함께 색인한다.
 */

const DB_NAME = 'oncofood'
const DB_VERSION = 2
const STORE_FOOD = 'extFoods'
const STORE_BARCODE = 'barcodes'
const STORE_META = 'meta'
/** 사용자가 직접 이어 붙인 바코드 — 공공데이터에 없는 제품을 메운다 */
const STORE_MYCODE = 'myBarcodes'

/** 데이터 판을 올릴 때 이 값을 바꾸면 사용자 기기에서 다시 받는다 */
export const DATA_VERSION = '2026-08-21'

export interface InstallProgress {
  phase: '식품 데이터' | '바코드 데이터' | '마무리'
  loaded: number
  total: number
}

export interface StoreStatus {
  installed: boolean
  version?: string
  foodCount: number
  barcodeCount: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_FOOD)) {
        const s = db.createObjectStore(STORE_FOOD, { keyPath: 'i' })
        // multiEntry 로 만들어 이름의 각 토막으로도 찾을 수 있게 한다
        s.createIndex('nm', 'nm', { multiEntry: true })
        s.createIndex('rn', 'rn', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_BARCODE)) {
        db.createObjectStore(STORE_BARCODE, { keyPath: 'b' })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'k' })
      }
      if (!db.objectStoreNames.contains(STORE_MYCODE)) {
        db.createObjectStore(STORE_MYCODE, { keyPath: 'b' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
  )
}

export async function getStatus(): Promise<StoreStatus> {
  try {
    const meta = await tx<{ k: string; v: string } | undefined>(STORE_META, 'readonly', (s) => s.get('version'))
    const foodCount = await tx<number>(STORE_FOOD, 'readonly', (s) => s.count())
    const barcodeCount = await tx<number>(STORE_BARCODE, 'readonly', (s) => s.count())
    return {
      installed: !!meta && meta.v === DATA_VERSION && foodCount > 0,
      version: meta?.v,
      foodCount,
      barcodeCount
    }
  } catch {
    return { installed: false, foodCount: 0, barcodeCount: 0 }
  }
}

/** 이름을 검색용 토막으로 나눈다 — 전체 이름 + 낱말 앞 4개 */
function tokens(name: string): string[] {
  const lower = name.toLowerCase()
  const parts = lower.split(/[\s_()[\],·/]+/).filter((t) => t.length >= 2)
  return [...new Set([lower, ...parts.slice(0, 4)])]
}

/** 내려받아 기기에 저장한다. 이미 있으면 건너뛴다. */
export async function install(onProgress?: (p: InstallProgress) => void): Promise<StoreStatus> {
  const base = import.meta.env.BASE_URL || '/'

  // ── 식품 데이터 ────────────────────────────────────────────
  onProgress?.({ phase: '식품 데이터', loaded: 0, total: 1 })
  const packed = (await (await fetch(`${base}data/foods-extended.json`)).json()) as PackedFoods

  const db = await openDB()
  const CHUNK = 4000
  for (let start = 0; start < packed.items.length; start += CHUNK) {
    const slice = packed.items.slice(start, start + CHUNK)
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE_FOOD, 'readwrite')
      const store = t.objectStore(STORE_FOOD)
      slice.forEach((row, k) => {
        const i = start + k
        store.put({ i, nm: tokens(row[0]), rn: row[6] || '', r: row })
      })
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
    onProgress?.({ phase: '식품 데이터', loaded: Math.min(start + CHUNK, packed.items.length), total: packed.items.length })
  }
  // 열 이름·식품군·태그 목록은 한 번만 저장해 두고 조회할 때 쓴다
  await tx(STORE_META, 'readwrite', (s) =>
    s.put({ k: 'schema', v: { cols: packed.cols, groups: packed.groups, tags: packed.tags } })
  )

  // ── 바코드 매핑 ────────────────────────────────────────────
  onProgress?.({ phase: '바코드 데이터', loaded: 0, total: 1 })
  try {
    const codes = (await (await fetch(`${base}data/barcodes.json`)).json()) as {
      b: string; n: string; p: string
    }[]
    for (let start = 0; start < codes.length; start += CHUNK) {
      const slice = codes.slice(start, start + CHUNK)
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE_BARCODE, 'readwrite')
        const store = t.objectStore(STORE_BARCODE)
        for (const c of slice) store.put(c)
        t.oncomplete = () => resolve()
        t.onerror = () => reject(t.error)
      })
      onProgress?.({ phase: '바코드 데이터', loaded: Math.min(start + CHUNK, codes.length), total: codes.length })
    }
  } catch {
    // 바코드 파일이 아직 없어도 식품 검색은 쓸 수 있어야 한다
  }

  onProgress?.({ phase: '마무리', loaded: 1, total: 1 })
  await tx(STORE_META, 'readwrite', (s) => s.put({ k: 'version', v: DATA_VERSION }))
  return getStatus()
}

/** 저장한 데이터를 지운다 */
export async function clearStore(): Promise<void> {
  const db = await openDB()
  await Promise.all(
    [STORE_FOOD, STORE_BARCODE, STORE_META].map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const t = db.transaction(name, 'readwrite')
          t.objectStore(name).clear()
          t.oncomplete = () => resolve()
          t.onerror = () => reject(t.error)
        })
    )
  )
}

/* ─────────────────── 직접 이어 붙인 바코드 ─────────────────── */

/**
 * 공공데이터 바코드는 23만 건이지만 시중 제품을 다 담지 못한다.
 * 검색으로는 찾아지는데 바코드만 없는 제품이 많다.
 * 그런 경우 한 번 이어 두면 다음부터 스캔으로 바로 찾을 수 있게 한다.
 */
export async function linkBarcode(code: string, foodId: string, foodName: string) {
  await tx(STORE_MYCODE, 'readwrite', (s) =>
    s.put({ b: code.trim(), foodId, name: foodName, at: Date.now() })
  )
}

export async function unlinkBarcode(code: string) {
  await tx(STORE_MYCODE, 'readwrite', (s) => s.delete(code.trim()))
}

export async function getLinkedBarcode(code: string) {
  return tx<{ b: string; foodId: string; name: string } | undefined>(STORE_MYCODE, 'readonly', (s) =>
    s.get(code.trim())
  )
}

export async function listLinkedBarcodes() {
  return tx<{ b: string; foodId: string; name: string; at: number }[]>(STORE_MYCODE, 'readonly', (s) =>
    s.getAll()
  )
}

/* ────────────────────────── 조회 ────────────────────────── */

let schemaCache: { cols: string[]; groups: string[]; tags: string[] } | null = null

async function schema() {
  if (schemaCache) return schemaCache
  const rec = await tx<{ k: string; v: typeof schemaCache } | undefined>(STORE_META, 'readonly', (s) => s.get('schema'))
  schemaCache = rec?.v ?? null
  return schemaCache
}

type Row = PackedFoods['items'][number]

function toFood(i: number, row: Row, sc: { cols: string[]; groups: string[]; tags: string[] }): Food {
  const [name, gi, servingG, tagIdx, vals, maker, reportNo] = row
  const per100 = {} as Nutrients
  for (let c = 0; c < vals.length; c++) {
    const v = vals[c]
    if (v !== null && v !== undefined) per100[sc.cols[c] as NutrientKey] = v
  }
  if (per100.kcal === undefined) per100.kcal = 0
  if (per100.carb === undefined) per100.carb = 0
  if (per100.protein === undefined) per100.protein = 0
  if (per100.fat === undefined) per100.fat = 0
  if (per100.na === undefined) per100.na = 0
  const food: Food = {
    id: `kx-${i}`,
    name,
    group: sc.groups[gi] as FoodGroup,
    form: 'processed',
    serving: { g: servingG, label: `1회 제공량 ${servingG} g` },
    per100,
    tags: tagIdx.map((t) => sc.tags[t] as FoodTag),
    src: 'kfda',
    auto: true
  }
  if (maker) food.maker = String(maker)
  if (reportNo) food.reportNo = String(reportNo)
  return food
}

/** 이름 앞글자로 확장 데이터를 찾는다 */
export async function searchExtended(query: string, limit = 40): Promise<Food[]> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const sc = await schema()
  if (!sc) return []

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const out: Food[] = []
    const seen = new Set<number>()
    const t = db.transaction(STORE_FOOD, 'readonly')
    const idx = t.objectStore(STORE_FOOD).index('nm')
    const range = IDBKeyRange.bound(q, q + '￿')
    const cur = idx.openCursor(range)
    cur.onsuccess = () => {
      const c = cur.result
      if (!c || out.length >= limit) return resolve(out)
      const rec = c.value as { i: number; r: Row }
      if (!seen.has(rec.i)) {
        seen.add(rec.i)
        out.push(toFood(rec.i, rec.r, sc))
      }
      c.continue()
    }
    cur.onerror = () => reject(cur.error)
  })
}

export interface BarcodeHit {
  barcode: string
  productName: string
  reportNo: string
  /** 영양성분까지 찾았으면 채워진다 */
  food?: Food
  /** 사용자가 직접 이어 둔 것인지 */
  linkedByUser?: boolean
}

/** 바코드로 제품을 찾는다. 영양성분은 품목보고번호로 이어붙인다. */
export async function lookupBarcode(code: string): Promise<BarcodeHit | null> {
  // 직접 이어 둔 것이 있으면 그것을 우선한다
  const mine = await getLinkedBarcode(code)
  if (mine) {
    const sc = await schema()
    let food: Food | undefined
    if (mine.foodId.startsWith('kx-') && sc) {
      const i = Number(mine.foodId.slice(3))
      const rec = await tx<{ i: number; r: Row } | undefined>(STORE_FOOD, 'readonly', (s) => s.get(i))
      if (rec) food = toFood(rec.i, rec.r, sc)
    }
    return { barcode: code, productName: mine.name, reportNo: '', food, linkedByUser: true }
  }

  const rec = await tx<{ b: string; n: string; p: string } | undefined>(STORE_BARCODE, 'readonly', (s) =>
    s.get(code)
  )
  if (!rec) return null

  const sc = await schema()
  let food: Food | undefined
  if (sc) {
    const hit = await tx<{ i: number; r: Row } | undefined>(STORE_FOOD, 'readonly', (s) =>
      s.index('rn').get(rec.n)
    )
    if (hit) food = toFood(hit.i, hit.r, sc)
  }
  return { barcode: code, productName: rec.p, reportNo: rec.n, food }
}
