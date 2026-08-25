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

# 대규모 실행 — 위 규칙들을 한자리에 모아 훨씬 큰 표본으로 돌린다.
# 돌면서 무엇이 얼마나 자주 추천되는지 세어 docs/추천-식단-top100.md 에 적는다.
PEOPLE=2000 DAYS=90 node_modules/.bin/jiti scripts/checks/bigrun.ts
```

검사가 헛돌지 않는지 보려면 engine.ts 가 찍는 커버리지 숫자를 본다.
제외 건수나 추천 건수가 0 이면 그 검사는 아무것도 확인하지 않은 것이다.

가짜 값에 주의한다. 한동안 모든 검사가 치료 시기를 'survivor'·'pre_op' 로 적고 있었는데
실제 값은 'survivorship'·'post_op' 였다. 타입이 any 로 새면서 조용히 통과했고,
그 바람에 생존기 규칙 8 건과 호중구감소증 규칙 2 건이 한 번도 검사되지 않았다.
검사를 새로 쓸 때는 데이터에서 실제로 쓰이는 값을 먼저 세어 보고 그것만 쓴다.
