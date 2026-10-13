# 무작위 대량 검사

가상의 환자 조건과 식단을 마구 만들어 돌리면서
"이건 절대 일어나면 안 된다"에 해당하는 것들을 잡아낸다.
난수는 고정 씨앗을 쓰므로 같은 결과가 다시 나온다.

```bash
node_modules/.bin/jiti scripts/checks/engine.ts   # 추천 엔진 — 빈 끼니·금기 추천·합계
node_modules/.bin/jiti scripts/checks/data.ts     # 식품/영양제 데이터·날짜 계산·성분 판정
node_modules/.bin/jiti scripts/checks/diary.ts    # 기록 정규화·주월 집계·체중 추이
node_modules/.bin/jiti scripts/checks/barcode.ts  # 바코드 표 무결성·스캐너 표기 흔들림
node_modules/.bin/jiti scripts/checks/season.ts   # 계절이 실제로 추천을 바꾸는가
node_modules/.bin/jiti scripts/checks/targets.ts  # 열량·단백질 목표와 조정 사유
node_modules/.bin/jiti scripts/checks/rules.ts    # 임상 규칙·출처·상호작용 무결성
node_modules/.bin/jiti scripts/checks/journey.ts  # 120명이 45일을 실제로 지나가 본다
node_modules/.bin/jiti scripts/checks/weight.ts   # 체중이 오르내릴 때 목표·권고가 따라오는가
node_modules/.bin/jiti scripts/checks/micro.ts    # 칼륨·인·칼슘·철과 결핍 영양제 권고가 서로 부딪치지 않는가
node_modules/.bin/jiti scripts/checks/intent.ts   # 하기로 한 일이 실제로 일어나는가 (오류 찾기가 아니라 동작 확인표)
node_modules/.bin/jiti scripts/checks/notice.ts   # 약관이 약속한 고지 기간(7일·불리한 변경 30일)을 지켰는가
node_modules/.bin/jiti scripts/checks/autotag.ts  # 받아 온 식품에 날것·가공육·자몽 태그가 붙는가 (양쪽 방향)
node_modules/.bin/jiti scripts/checks/login.ts    # 로그인 문 — 소셜이 없는 분의 길, 재설정 순서, 오류 문구, 날짜 문, 편지 서식
node_modules/.bin/jiti scripts/checks/expiry.ts   # 기한 목록이 키·바깥 주소·도메인을 다 덮는가, 휴면 점검 간격
node_modules/.bin/jiti scripts/checks/sense.ts    # 상식 — 권장의 이유가 그 음식에 맞는가, 날것·젓갈·술이 이름으로 봐도 걸리는가 (약 29만 종)
node_modules/.bin/jiti scripts/checks/restore.ts  # 저장된 자료가 낡았거나 깨졌어도 앱이 열리는가
PEOPLE=3000 node_modules/.bin/jiti scripts/checks/patient.ts  # 환자 입장 — 읽을 수 있는가, 이유가 오는가, 앱이 스스로 어긋나지 않는가

# 대규모 실행 — 위 규칙들을 한자리에 모아 훨씬 큰 표본으로 돌린다.
# 돌면서 무엇이 얼마나 자주 추천되는지 세어 docs/추천-식단-top100.md 에 적는다.
PEOPLE=2000 DAYS=90 node_modules/.bin/jiti scripts/checks/bigrun.ts
```

## 다른 씨앗으로 돌리기

난수를 쓰는 검사는 `SEED=<정수>` 로 씨앗을 바꿀 수 있다. 고정 씨앗만 돌리면
"그 씨앗에서 안 걸리는 것" 은 영영 안 걸린다 — 2026-10-13 에 새 씨앗 여섯 개로 돌려서
고정 씨앗으로는 한 번도 안 걸리던 것 두 가지를 찾았다(목표를 낮추고 사유를 안 밝힌 경우,
하루에 읽을 것이 25가지인 날).

```bash
SEED=20261013 node_modules/.bin/jiti scripts/checks/compose.ts
```

- 정수가 아닌 값을 주면 검사가 멈춘다(`_seed.ts`). 예전에는 NaN 이 조용히 0 으로 바뀌어
  "다른 씨앗 여섯 개" 가 실은 같은 씨앗 하나였다.
- `bigrun.ts` 는 SEED 를 주면 `docs/추천-식단-top100.md` 를 덮어쓰지 않는다.

## 화면 자가시험

엔진 검사는 화면을 열어 보지 않는다. `scripts/selftest/ui-monkey.mjs` 는 무작위 상태
(보통 · 극단 · 낡거나 깨진 저장 자료)를 머리 없는 크롬에 넣고 일곱 탭을 다 눌러 보며
멈춤 · 깨진 글자(NaN·undefined) · 가로 넘침 · 콘솔 오류 · 글자 크기 미적용을 찾는다.

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite build --outDir /tmp/hc-nologin --emptyOutDir
node_modules/.bin/jiti scripts/selftest/dump-ids.ts > /tmp/harucharim-ids.json
node scripts/selftest/ui-monkey.mjs /tmp/hc-nologin /tmp/harucharim-ids.json /tmp/hc-monkey 200 <씨앗>
```

10분쯤 걸려 평소 검사 묶음에는 넣지 않았다. 저장 형식(`AppState`)이나 화면 틀을 바꾼 뒤에 돌린다.

검사가 헛돌지 않는지 보려면 engine.ts 가 찍는 커버리지 숫자를 본다.
제외 건수나 추천 건수가 0 이면 그 검사는 아무것도 확인하지 않은 것이다.

가짜 값에 주의한다. 한동안 모든 검사가 치료 시기를 'survivor'·'pre_op' 로 적고 있었는데
실제 값은 'survivorship'·'post_op' 였다. 타입이 any 로 새면서 조용히 통과했고,
그 바람에 생존기 규칙 8 건과 호중구감소증 규칙 2 건이 한 번도 검사되지 않았다.
검사를 새로 쓸 때는 데이터에서 실제로 쓰이는 값을 먼저 세어 보고 그것만 쓴다.

## 타입 검사

`npm run build` 의 `tsc -b` 가 이제 `scripts/` 까지 본다(tsconfig.scripts.json).
여태 `src` 만 보고 있어서, 앱을 지키는 검사 자체가 무방비였다.
실제로 patient.ts 가 존재하지 않는 치료 시기(`pre_op`)를 쓰고 있었고,
없는 속성(`DayNote.label`)을 읽어 검사 두 개가 한 번도 돈 적이 없었다.
검사를 새로 만들거든 `npx tsc -b` 를 먼저 돌릴 것.

## 잣대가 틀릴 수 있다

`DayNote.label` 을 고쳐 돌렸더니 714종이 걸렸는데, 틀린 것은 앱이 아니라 잣대였다.
앱이 "단백질이 많습니다" 라고 할 때 덧붙이는 말이
"암 환자에게는 **모자란** 것보다 나은 쪽" 이었고, 정규식이 그 '모자란' 을 물었다.
**산문을 정규식으로 읽지 말고 구조화된 값(tone·level)을 볼 것.**
