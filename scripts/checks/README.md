# 무작위 대량 검사

가상의 환자 조건과 식단을 마구 만들어 돌리면서
"이건 절대 일어나면 안 된다"에 해당하는 것들을 잡아낸다.
난수는 고정 씨앗을 쓰므로 같은 결과가 다시 나온다.

```bash
node_modules/.bin/jiti scripts/checks/engine.ts   # 추천 엔진 — 빈 끼니·금기 추천·합계
node_modules/.bin/jiti scripts/checks/data.ts     # 식품/영양제 데이터·날짜 계산·성분 판정
node_modules/.bin/jiti scripts/checks/diary.ts    # 기록 정규화·주월 집계·체중 추이
```

검사가 헛돌지 않는지 보려면 engine.ts 가 찍는 커버리지 숫자를 본다.
제외 건수나 추천 건수가 0 이면 그 검사는 아무것도 확인하지 않은 것이다.
