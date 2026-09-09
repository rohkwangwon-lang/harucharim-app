# 스토어 스크린샷 만드는 법

결과물은 `docs/출시/스크린샷/*.png` (1290 × 2796) 여섯 장이다.
애플 6.7 인치 요구 규격이고, 구글 플레이는 이 크기를 그대로 받는다.

## 순서

```bash
# 1. 로그인 없이 열리도록 Supabase 값을 비운 채로 빌드한다
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build

# 2. 사본을 만들고 촬영용 부트스트랩을 <head> 끝에 붙인다
rm -rf /tmp/shot-site && cp -R dist /tmp/shot-site
rm -f /tmp/shot-site/sw.js /tmp/shot-site/registerSW.js   # 서비스 워커가 옛 화면을 붙든다
python3 - <<'PY'
b = open('scripts/screenshots/bootstrap.html', encoding='utf-8').read()
p = '/tmp/shot-site/index.html'
s = open(p, encoding='utf-8').read()
open(p, 'w', encoding='utf-8').write(s.replace('</head>', b + '\n</head>'))
PY

# 3. 띄운다
python3 -m http.server 8791 --directory /tmp/shot-site &

# 4. 찍고, 문구를 얹는다
node scripts/screenshots/shoot.mjs      # → raw/*.png
python3 scripts/screenshots/frame.py    # → store/*.png
```

## 걸렸던 자리 — 다시 밟지 말 것

- **헤드리스 크롬의 `--window-size` 는 폭 500 px 아래로 내려가지 않는다.**
  430 을 주면 화면은 500 으로 짜이고 사진만 1290 px 로 잘려, 오른쪽이 통째로 날아간다.
  (탭 일곱 개 중 여섯 개만 보이고 본문이 잘려 나온 사진이 그것이었다.)
  그래서 CDP `Emulation.setDeviceMetricsOverride` 로 기기 크기를 잡는다.
- **서비스 워커가 index.html 을 캐시한다.** 부트스트랩을 고쳐도 이전 것이 나온다.
  `shoot.mjs` 는 매번 크롬 프로필(`/tmp/harucharim-shot-profile`)을 지우고 시작한다.
- **체중은 배열이 아니라 `Record<날짜, kg>` 이다**(`src/lib/store.ts`).
  배열로 심었더니 기록 탭이 React error #31 로 통째로 멈췄다. 앱 버그가 아니라 심은 자료가 틀린 것이었다.
- **`textContent` 는 줄이 붙어 나온다.** 목록에서 이름만 견주려면 `innerText` 를 봐야 한다.
- **`file://` 로는 구글 폰트가 막힌다.** 반드시 HTTP 로 띄운다.

## 부트스트랩이 받는 값

| 값 | 하는 일 |
|---|---|
| `shot=<탭 이름>` | 그 탭으로 옮긴다 (`추천`·`찾기`·`기록`·`영양제`·`가이드` …) |
| `sub=<하위 이름>` | 탭 안의 갈래를 한 번 더 누른다 (예: `암종 가이드`) |
| `q=<검색어>` | 찾기 화면의 검색칸에 넣는다 |
| `pick=<음식 이름>` | 검색 결과에서 그 줄을 눌러 상세를 편다 |
| `why=1` | 추천 화면의 '이유' 를 펴고 그 자리로 옮긴다 |
| `to=<문구>` | 그 문구가 화면 위쪽에 오도록 굴린다 |

환자 설정은 유방암·호르몬수용체양성·항암치료 중·54 kg·오심·구토·타목시펜으로 고정한다.
타목시펜이 있어야 자몽이 '피하세요' 로 뜬다 — 3 번 사진이 보여 주려는 것이 그것이다.
