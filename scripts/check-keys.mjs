/**
 * 인증키가 실제로 동작하는지 확인한다.
 *
 *   node scripts/check-keys.mjs
 *
 * 키 값 자체는 절대 출력하지 않는다. 길이와 앞 4자리만 보여 준다.
 */
import { loadEnv, serviceKey } from '../src/lib/env.mjs'

/** 키를 화면에 그대로 찍지 않기 위한 표기 */
const mask = (k) => (k ? `${k.slice(0, 4)}…(${k.length}자)` : '(비어 있음)')

const env = loadEnv()

const FS_KEY = env.FOODSAFETY_KEY
const fsKeyFor = (name) => env[name] || FS_KEY

console.log('── 키 확인 ──────────────────────────────')
console.log('공공데이터포털      :', mask(env.DATA_GO_KR_KEY))
console.log('식품안전나라 공통   :', mask(FS_KEY))
console.log('  · 유통바코드      :', mask(fsKeyFor('FOODSAFETY_KEY_BARCODE')))
console.log('  · 제품정보        :', mask(fsKeyFor('FOODSAFETY_KEY_PRODUCT')))
console.log('  · 품목제조보고    :', mask(fsKeyFor('FOODSAFETY_KEY_MANUFACTURE')))

const sameKey =
  [fsKeyFor('FOODSAFETY_KEY_BARCODE'), fsKeyFor('FOODSAFETY_KEY_PRODUCT'), fsKeyFor('FOODSAFETY_KEY_MANUFACTURE')]
    .every((k) => k === FS_KEY)
console.log(sameKey ? '  → 세 서비스가 같은 키를 씁니다 (정상)' : '  → 서비스마다 키가 다릅니다')
console.log('')

async function tryFetch(label, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    const text = await res.text()
    // 응답 안에 키가 되비쳐 나올 수 있으니 화면에 찍기 전에 지운다
    const safe = text.replace(new RegExp(Object.values(env).filter(Boolean).join('|'), 'g'), '***')
    const ok = res.ok && !/ERROR|에러|INVALID|NOT_REGISTERED/i.test(safe.slice(0, 400))
    console.log(`${ok ? '✅' : '❌'} ${label}  HTTP ${res.status}`)
    if (!ok) console.log('   응답 앞부분:', safe.slice(0, 220).replace(/\s+/g, ' '))
    return ok ? safe : null
  } catch (e) {
    console.log(`❌ ${label}  요청 실패: ${e.message}`)
    return null
  }
}

console.log('── 실제 호출 시험 ───────────────────────')

if (env.DATA_GO_KR_KEY) {
  await tryFetch(
    '공공데이터포털 · 식품영양성분DB',
    'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02' +
      `?serviceKey=${serviceKey(env.DATA_GO_KR_KEY)}&pageNo=1&numOfRows=3&type=json`
  )
} else {
  console.log('⏭  공공데이터포털 키가 비어 있어 건너뜁니다')
}

if (FS_KEY) {
  await tryFetch(
    '식품안전나라 · 유통바코드(I2570)',
    `http://openapi.foodsafetykorea.go.kr/api/${fsKeyFor('FOODSAFETY_KEY_BARCODE')}/I2570/json/1/3`
  )
  await tryFetch(
    '식품안전나라 · 품목제조보고(I1250)',
    `http://openapi.foodsafetykorea.go.kr/api/${fsKeyFor('FOODSAFETY_KEY_MANUFACTURE')}/I1250/json/1/3`
  )
} else {
  console.log('⏭  식품안전나라 키가 비어 있어 건너뜁니다')
}

console.log('')
console.log('모두 ✅ 이면 데이터 수집을 시작할 수 있습니다.')
