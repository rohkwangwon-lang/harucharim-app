/**
 * 이름 검사.
 *
 * 앱 이름을 온코푸드에서 하루차림으로 바꿨다.
 * 이런 일은 한 번에 끝나는 것처럼 보이지만 실제로는 늘 몇 군데가 남는다 —
 * 화면에는 새 이름인데 브라우저 탭에는 옛 이름이 뜨거나,
 * 홈 화면에 추가하면 옛 이름으로 저장되는 식이다.
 *
 * 실제로 이번에도 하나 빠질 뻔했다.
 * .github/workflows/deploy.yml 이 ONCOFOOD_BASE 를 넘기고 있었는데
 * vite 쪽 변수명만 바꾸는 바람에, 그대로 나갔으면 배포된 앱의
 * 모든 파일 경로가 깨져 흰 화면이 됐을 것이다.
 *
 * 그리고 저장소 열쇠.
 * 이 앱의 건강 정보는 서버에 사본이 없어서, 열쇠 이름이 어긋나면
 * 이미 쓰시던 분의 설정·식단·체중이 조용히 사라진다.
 * 옮기는 장치(migrate.ts)가 제대로 붙어 있는지 함께 본다.
 */
import { inflateSync } from 'node:zlib'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const NAME = '하루차림'
const SLUG = 'harucharim'
const OLD_NAME = '온코푸드'
const OLD_SLUG = 'oncofood'

/** 예전 이름이 남아 있어야 하는 곳 — 옮기는 장치와, 그것을 보는 이 검사 자신 */
const MIGRATOR = 'src/lib/migrate.ts'
const SELF = 'scripts/checks/naming.ts'
/* 옮기기를 시험하는 검사도 예전 이름을 알아야 한다 */
const MIG_TEST = 'scripts/checks/migrate.ts'

const bads: string[] = []
function no(cond: boolean, msg: string) { if (cond) bads.push(msg) }

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === '.git') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|html|json|ya?ml|css)$/.test(p)) out.push(p)
  }
  return out
}

const files = [
  ...walk('src'), ...walk('public'), ...walk('scripts'), ...walk('.github'),
  'index.html', 'vite.config.ts', 'package.json'
]

/* ── 1. 예전 이름이 남아 있지 않은가 ────────────────────── */
const left: string[] = []
for (const f of files) {
  if (f === MIGRATOR || f === SELF || f === MIG_TEST) continue
  let t: string
  try { t = readFileSync(f, 'utf-8') } catch { continue }
  const hits = [...t.matchAll(new RegExp(`${OLD_NAME}|${OLD_SLUG}|ONCOFOOD`, 'gi'))]
  if (hits.length) left.push(`${f} (${hits.length}곳)`)
}
no(left.length > 0, `예전 이름이 남아 있음\n   - ${left.join('\n   - ')}`)

/* 옮기는 장치에는 반대로 남아 있어야 한다 */
const mig = readFileSync(MIGRATOR, 'utf-8')
no(!mig.includes(`${OLD_SLUG}.`), '옮기는 장치가 예전 열쇠 이름을 모름 — 옮길 대상을 못 찾는다')
no(!mig.includes(`${SLUG}.`), '옮기는 장치가 새 열쇠 이름을 모름')

/* ── 2. 옮기는 장치가 실제로 불리는가 ───────────────────── */
const main = readFileSync('src/main.tsx', 'utf-8')
no(!/migrateStorage\(\)/.test(main), 'migrateStorage 를 부르지 않음 — 만들어 두고 안 쓰면 기록이 사라진다')

/*
 * render 보다 먼저 불려야 한다 — 앱이 저장소를 읽기 전이어야 하기 때문.
 *
 * 처음에는 indexOf('createRoot') 로 찾았는데, 그러면 맨 윗줄의 import 가 잡혀
 * 멀쩡한 코드를 빨간불로 만든다. 부르는 자리는 괄호가 붙는다.
 */
const callAt = main.indexOf('migrateStorage()')
const renderAt = main.search(/^createRoot\(/m)
no(callAt > renderAt && renderAt >= 0,
   'migrateStorage 가 render 뒤에 있음 — 앱이 먼저 저장소를 읽어 빈 값을 본다')

/* ── 3. 저장소 열쇠가 모두 새 이름인가 ──────────────────── */
const keys = new Set<string>()
for (const f of files) {
  if (f === MIGRATOR) continue
  let t: string
  try { t = readFileSync(f, 'utf-8') } catch { continue }
  for (const m of t.matchAll(/localStorage(?:\.getItem|\.setItem|\.removeItem)?\[?\(?\s*['"`]([\w.]+)['"`]/g)) {
    keys.add(m[1])
  }
  for (const m of t.matchAll(/=\s*['"`]((?:harucharim|oncofood)\.[\w.]+)['"`]/g)) keys.add(m[1])
}
const strayKeys = [...keys].filter((k) => k.includes('.') && !k.startsWith(`${SLUG}.`))
no(strayKeys.length > 0, `새 이름을 안 쓰는 저장소 열쇠: ${strayKeys.join(', ')}`)
no(keys.size < 5, `저장소 열쇠를 ${keys.size}개밖에 못 찾음 — 검사가 헛돌고 있다`)

/* ── 4. 사용자 눈에 보이는 자리 ─────────────────────────── */
const SPOTS: [string, string, string][] = [
  ['index.html', '<title>', '브라우저 탭 제목'],
  ['index.html', 'apple-mobile-web-app-title', '아이폰 홈 화면 이름'],
  ['vite.config.ts', 'short_name', '안드로이드 홈 화면 이름'],
  ['vite.config.ts', "name:", 'PWA 설치 이름'],
  ['public/privacy.html', NAME, '개인정보처리방침']
]
for (const [file, marker, what] of SPOTS) {
  const t = readFileSync(file, 'utf-8')
  const i = t.indexOf(marker)
  no(i < 0, `${what}: "${marker}" 를 ${file} 에서 못 찾음`)
  if (i >= 0) {
    const line = t.slice(i, t.indexOf('\n', i) + 1)
    no(!line.includes(NAME) && marker !== NAME, `${what} 이 아직 새 이름이 아님 — ${line.trim()}`)
  }
}

/* ── 5. 배포 설정이 짝이 맞는가 ─────────────────────────── */
/*
 * 예전에는 'base 환경변수를 워크플로가 넘기는가' 만 보았다.
 * github.io/<repo>/ 하위에 올릴 때는 그것이 맞았지만, 자체 도메인으로 옮기면 정반대가 된다 —
 * 뿌리에서 서빙되는데 base 를 넘기면 모든 경로가 한 칸씩 밀린다.
 *
 * 그래서 한쪽을 못 박는 대신 **두 사실이 서로 맞는지** 를 본다.
 * 어디에 올리는지를 말해 주는 것은 public/CNAME 이다.
 */
const vite = readFileSync('vite.config.ts', 'utf-8')
const wf = readFileSync('.github/workflows/deploy.yml', 'utf-8')
const envName = vite.match(/process\.env\.(\w+)/)?.[1]
no(!envName, 'vite.config.ts 에서 base 환경변수 이름을 못 찾음')
const custom = existsSync('public/CNAME')
if (envName) {
  if (custom) {
    const host = readFileSync('public/CNAME', 'utf-8').trim()
    no(!host, 'public/CNAME 이 비어 있음 — 사용자 지정 도메인 설정이 배포마다 지워진다')
    no(/^https?:|\/$/.test(host),
       `public/CNAME 에는 도메인 이름만 적는다 — 지금은 "${host}"`)
    no(wf.includes(envName),
       `자체 도메인(${host})은 뿌리에서 서빙되는데 배포 워크플로가 ${envName} 을 넘긴다 — 모든 경로가 한 칸씩 밀린다`)
  } else {
    no(!wf.includes(envName),
       `배포 워크플로가 ${envName} 을 넘기지 않음 — base 가 '/' 로 잡혀 github.io 하위 경로에서 모든 경로가 깨진다`)
  }
}

/* ── 6. 이름 뒤 조사가 맞는가 ───────────────────────────
 *
 * 이름을 바꾸면 받침이 달라져서 뒤따르는 조사가 전부 어긋난다.
 * '온코푸드'는 받침이 없어 를·는·가·와·로 를 쓰지만,
 * '하루차림'은 ㅁ 받침이라 을·은·이·과·으로 를 써야 한다.
 *
 * 실제로 이번에 다섯 군데가 어긋났다. 화면에 "하루차림를 시작합니다" 라고 떴다.
 * 코드는 멀쩡히 돌고 검사도 통과하므로, 이걸 잡는 자리는 여기밖에 없다.
 */
const lastCh = NAME.charCodeAt(NAME.length - 1)
/* 한글 음절은 (초성×21 + 중성)×28 + 종성 으로 짜인다. 나머지가 0 이면 받침이 없다. */
const hasFinal = lastCh >= 0xac00 && lastCh <= 0xd7a3 && (lastCh - 0xac00) % 28 !== 0

/* 받침이 있으면 왼쪽이 틀린 것, 없으면 오른쪽이 틀린 것 */
const WRONG: [string, string][] = hasFinal
  ? [['를', '을'], ['는', '은'], ['가', '이'], ['와', '과'], ['로', '으로']]
  : [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['으로', '로']]

const badParticles: string[] = []
for (const f of files) {
  if (f === MIGRATOR || f === SELF) continue
  let t: string
  try { t = readFileSync(f, 'utf-8') } catch { continue }
  for (const [bad, good] of WRONG) {
    /* '로' 는 '으로' 의 뒷부분과 겹치므로 이름 바로 뒤만 본다 */
    let at = t.indexOf(NAME + bad)
    while (at >= 0) {
      const line = t.slice(t.lastIndexOf('\n', at) + 1, t.indexOf('\n', at))
      badParticles.push(`${f}: "${NAME}${bad}" → "${NAME}${good}"  (${line.trim().slice(0, 50)})`)
      at = t.indexOf(NAME + bad, at + 1)
    }
  }
}
no(badParticles.length > 0,
   `이름 뒤 조사가 어긋남 (${badParticles.length}곳)\n   - ${badParticles.join('\n   - ')}`)

/* ── 7. 설치했을 때 색이 화면과 맞는가 ──────────────────
 *
 * 디자인을 쑥·솔잎빛으로 바꾼 뒤에도 매니페스트와 index.html 의 색은
 * 예전 청록(#0d9482)으로 남아 있었다. 브라우저로 열면 안 보이지만,
 * 홈 화면에 설치해 여시면 상태바와 실행 화면만 청록이라 어긋나 보인다.
 *
 * 스토어에 올릴 앱에서는 이게 그대로 심사자 눈에 띈다.
 * 색은 tailwind 에 적힌 값에서만 가져오게 묶는다.
 */
const tw = readFileSync('tailwind.config.js', 'utf-8')
function twColor(name: string, step: string): string | null {
  const block = tw.match(new RegExp(`${name}:\\s*\\{([^}]*)\\}`, 's'))?.[1]
  return block?.match(new RegExp(`${step}:\\s*'(#[0-9a-f]{6})'`, 'i'))?.[1] ?? null
}
const brand600 = twColor('brand', '600')
const stone50 = twColor('stone', '50')
no(!brand600 || !stone50, 'tailwind.config.js 에서 색을 읽지 못함 — 검사가 헛돌고 있다')

if (brand600 && stone50) {
  const themes = [
    ['vite.config.ts', vite.match(/theme_color:\s*'(#[0-9a-f]{6})'/i)?.[1], brand600, '매니페스트 상태바 색'],
    ['vite.config.ts', vite.match(/background_color:\s*'(#[0-9a-f]{6})'/i)?.[1], stone50, '매니페스트 실행 화면 색'],
    ['index.html', readFileSync('index.html', 'utf-8').match(/name="theme-color"\s+content="(#[0-9a-f]{6})"/i)?.[1], brand600, 'index.html 상태바 색']
  ] as const
  for (const [file, got, want, what] of themes) {
    no(!got, `${what} 을 ${file} 에서 못 찾음`)
    no(Boolean(got) && got!.toLowerCase() !== want.toLowerCase(),
       `${what} 이 지금 디자인과 다름 — ${got} (tailwind 는 ${want})`)
  }
}

/*
 * 7-2. 아이콘과 바깥 페이지도 같은 색인가.
 *
 * 위의 7번은 매니페스트와 index.html 만 보았다. 그래서 아이콘 넉 장과
 * 약관·처리방침·계정삭제 페이지는 예전 청록(#0d9482)으로 반년을 남아 있었다.
 * 브라우저로 앱만 열어 보면 드러나지 않는다 — 스토어에서 아이콘과 스크린샷이
 * 나란히 놓이고 나서야, 심사자 눈에 서로 다른 앱처럼 보인다.
 *
 * 색을 고칠 자리는 언제나 한 곳이 아니다. 그래서 여기서 나머지를 함께 붙든다.
 */
if (brand600 && stone50) {
  const brand300 = twColor('brand', '300')

  /* 파비콘 — 아이콘 넉 장과 같은 정의(scripts/icons/build-icons.py)에서 나온다 */
  const fav = readFileSync('public/favicon.svg', 'utf-8')
  const favBg = fav.match(/<rect[^>]*fill="(#[0-9a-f]{6})"/i)?.[1]
  no(!favBg, 'favicon.svg 에서 바탕색을 못 찾음')
  no(Boolean(favBg) && favBg!.toLowerCase() !== brand600.toLowerCase(),
     `파비콘 바탕색이 지금 디자인과 다름 — ${favBg} (tailwind 는 ${brand600})`)

  /*
   * 설치용 아이콘 — 그림 파일이라 눈으로만 보고 지나치기 쉽다.
   * 가운데 점 하나를 실제로 뽑아 본다. 잣대는 tailwind 에서만 가져온다.
   */
  for (const f of ['public/icon-192.png', 'public/icon-512.png',
                   'public/icon-maskable-512.png', 'public/apple-touch-icon.png']) {
    const got = sampleBackground(f)
    if (!got) { no(true, `${f} 에서 색을 읽지 못함`); continue }
    no(got.toLowerCase() !== brand600.toLowerCase(),
       `${f} 바탕색이 지금 디자인과 다름 — ${got} (tailwind 는 ${brand600})`)
  }

  /*
   * maskable 은 안드로이드가 제 모양으로 오려 내고, iOS 는 투명한 자리를 검게 깐다.
   * 둘 다 네 귀퉁이가 비어 있으면 안 된다.
   */
  for (const f of ['public/icon-maskable-512.png', 'public/apple-touch-icon.png']) {
    no(cornerIsClear(f) === true,
       `${f} 의 귀퉁이가 비어 있음 — ${f.includes('maskable')
         ? '네모난 틀을 쓰는 런처에서 귀퉁이가 뚫려 보인다'
         : 'iOS 홈 화면에서 그 자리가 검게 깔린다'}`)
  }

  /* 설치 없이 열리는 세 페이지 — 심사자가 제일 먼저 여는 자리다 */
  for (const f of ['public/privacy.html', 'public/terms.html', 'public/delete-account.html']) {
    const t = readFileSync(f, 'utf-8')
    const accents = [...t.matchAll(/--accent:\s*(#[0-9a-f]{6})/gi)].map((m2) => m2[1].toLowerCase())
    no(accents.length < 2, `${f} 에서 강조색을 ${accents.length}개밖에 못 찾음 — 밝은 쪽과 어두운 쪽 둘이어야 한다`)
    if (accents.length >= 2) {
      no(accents[0] !== brand600.toLowerCase(),
         `${f} 의 강조색이 지금 디자인과 다름 — ${accents[0]} (tailwind 는 ${brand600})`)
      no(Boolean(brand300) && accents[1] !== brand300!.toLowerCase(),
         `${f} 의 어두운 화면 강조색이 지금 디자인과 다름 — ${accents[1]} (tailwind 는 ${brand300})`)
    }
  }
}

/* ── 8. 기기 저장소를 갈아탈 때 예전 것을 치우는가 ────────
 *
 * 이름을 바꾸면 IndexedDB 이름도 함께 바뀐다.
 * 상품 데이터 27만 종(14 MB)이 거기 들어 있는데, 예전 저장소를 지우지 않으면
 * 아무도 쓰지 않는 채로 브라우저에 남아 자리만 차지한다.
 * 일괄 치환으로 이름을 바꾸면 이 뒷정리가 조용히 빠진다 — 실제로 이번에 빠졌다.
 */
const store = readFileSync('src/lib/foodStore.ts', 'utf-8')
const dbName = store.match(/DB_NAME\s*=\s*'([\w-]+)'/)?.[1]
no(!dbName, 'foodStore.ts 에서 저장소 이름을 못 찾음')
no(Boolean(dbName) && dbName !== SLUG,
   `기기 저장소 이름이 앱 이름과 다름 — "${dbName}" (${SLUG} 여야)`)
no(!/deleteDatabase/.test(mig),
   '예전 기기 저장소를 지우지 않음 — 쓰이지 않는 14 MB 가 브라우저에 남는다')

/*
 * 소스 어디에도 예전 색이 남아 있지 않은가.
 *
 * 매니페스트와 index.html 만 보았더니, 갱신 배너(updatePrompt.ts)가
 * 예전 청록(#0f766a)을 그대로 쓰고 있는 것을 놓쳤다.
 * 그 배너는 Tailwind 를 못 쓰고 색을 직접 적어야 해서, 디자인을 바꿀 때 빠지기 쉽다.
 * 지금 팔레트에 없는 색이 소스에 박혀 있으면 잡는다.
 */
const PALETTE = new Set(
  [...tw.matchAll(/'(#[0-9a-fA-F]{6})'/g)].map((m2) => m2[1].toLowerCase())
)
no(PALETTE.size < 20, `tailwind 에서 색을 ${PALETTE.size}개밖에 못 읽음 — 검사가 헛돌고 있다`)

/*
 * 남의 브랜드색은 마음대로 바꿀 수 없다.
 * 카카오는 로그인 단추 색을 규정해 두었고, 다르게 칠하면 심사에서 걸린다.
 */
const BRAND_OK = new Set(['#fee500', '#191600', '#f5dc00'])

const strayColors: string[] = []
for (const f of files) {
  /*
   * 소스만 본다.
   *
   * 처음에는 files 전부를 훑었는데, 바코드가 담긴 데이터 파일에서
   * 우연히 여섯 자리 16진수처럼 보이는 문자열이 잡혀 186곳을 잘못 셌다.
   * 색을 칠하는 곳은 화면 소스와 설정뿐이다.
   */
  if (!/^(src\/.*\.tsx?|index\.html|vite\.config\.ts)$/.test(f)) continue
  let t: string
  try { t = readFileSync(f, 'utf-8') } catch { continue }
  for (const m2 of t.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    const c = m2[0].toLowerCase()
    if (PALETTE.has(c) || BRAND_OK.has(c)) continue
    if (c === '#ffffff' || c === '#000000') continue      // 흰색·검정은 팔레트 밖이라도 쓴다
    const line = t.slice(t.lastIndexOf('\n', m2.index!) + 1, t.indexOf('\n', m2.index!)).trim()
    strayColors.push(`${f}: ${c}  (${line.slice(0, 60)})`)
  }
}
no(strayColors.length > 0,
   `팔레트에 없는 색이 박혀 있음 (${strayColors.length}곳)\n   - ${strayColors.slice(0, 8).join('\n   - ')}`)

/* ── 9. 화면에 부르는 이름이 하나로 통일됐는가 ──────────── */
const app = readFileSync('src/App.tsx', 'utf-8')
no(!app.includes(NAME), `App.tsx 에 앱 이름(${NAME})이 없음`)

console.log(bads.length
  ? `이름 검사 — 문제 ${bads.length}종\n` + bads.map((b) => '■ ' + b).join('\n')
  : `이름 검사 완료 — ${files.length}개 파일·저장소 열쇠 ${keys.size}개 대조, 문제 없음`)

/*
 * PNG 에서 한 점의 색을 뽑는다.
 *
 * 그림 파일은 검사에서 늘 빠지는 자리다 — 열어 보지 않으면 색이 틀린 줄 모른다.
 * 라이브러리를 더하지 않으려고 8비트 RGB/RGBA 만 읽는 최소한만 적었다.
 * 이 앱의 아이콘은 전부 그 꼴이고, 아니면 null 을 돌려 검사가 스스로 소리를 낸다.
 */
function decodePng(file: string): { w: number; h: number; ch: number; px: Buffer } | null {
  let buf: Buffer
  try { buf = readFileSync(file) } catch { return null }
  if (buf.readUInt32BE(0) !== 0x89504e47) return null

  let at = 8
  let w = 0, h = 0, ch = 0
  const idat: Buffer[] = []
  while (at + 8 <= buf.length) {
    const len = buf.readUInt32BE(at)
    const kind = buf.toString('ascii', at + 4, at + 8)
    const body = buf.subarray(at + 8, at + 8 + len)
    if (kind === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4)
      if (body[8] !== 8) return null                 // 8비트만
      if (body[9] === 2) ch = 3
      else if (body[9] === 6) ch = 4
      else return null                               // 팔레트·회색조는 안 읽는다
      if (body[12] !== 0) return null                // 인터레이스는 안 읽는다
    } else if (kind === 'IDAT') idat.push(body)
    else if (kind === 'IEND') break
    at += 12 + len
  }
  if (!w || !ch || idat.length === 0) return null

  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const px = Buffer.alloc(h * stride)
  let src = 0
  for (let y = 0; y < h; y++) {
    const filter = raw[src++]
    const row = src; src += stride
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[y * stride + x - ch] : 0
      const b = y > 0 ? px[(y - 1) * stride + x] : 0
      const c = y > 0 && x >= ch ? px[(y - 1) * stride + x - ch] : 0
      let v = raw[row + x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      px[y * stride + x] = v & 0xff
    }
  }
  return { w, h, ch, px }
}

/**
 * 바탕색을 #rrggbb 로.
 *
 * 처음에는 한가운데를 짚었는데, 그 자리가 그릇 막대와 가까워
 * 작은 아이콘에서는 줄이는 과정의 번짐이 섞여 두 단계씩 어긋났다.
 * 위쪽 가운데(12 %)는 잎보다 위이면서 둥근 모서리 밖이 아니라 늘 바탕이다.
 */
function sampleBackground(file: string): string | null {
  const img = decodePng(file)
  if (!img) return null
  const i = (Math.round(img.h * 0.12) * img.w + Math.floor(img.w / 2)) * img.ch
  return '#' + [0, 1, 2].map((k) => img.px[i + k].toString(16).padStart(2, '0')).join('')
}

/** 네 귀퉁이가 비어 있는가(투명한가). 알파가 없는 그림이면 false */
function cornerIsClear(file: string): boolean | null {
  const img = decodePng(file)
  if (!img) return null
  if (img.ch !== 4) return false
  return img.px[3] < 128
}
