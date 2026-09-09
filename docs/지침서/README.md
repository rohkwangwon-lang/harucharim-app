# 암 환자 식이·영양 지침서 — 출판본

**앱에는 들어가지 않습니다.** 배포·인쇄용 문서입니다.

| 파일 | 쓰임 |
|---|---|
| `암환자-식이영양-지침서.html` | 웹 배포·열람용 (각주가 참고 문헌으로 연결됨) |
| `암환자-식이영양-지침서.pdf` | 인쇄·배포용 A4 76쪽 |

## 다시 만드는 법

문서는 **앱 데이터에서 생성**합니다. 손으로 고치지 마십시오 —
앱을 고치고 다시 생성해야 둘이 어긋나지 않습니다.

```bash
# HTML
OUT=docs/지침서/암환자-식이영양-지침서.html node_modules/.bin/jiti scripts/build-guideline.ts

# PDF (Chrome 헤드리스 · dev 서버가 떠 있어야 합니다)
cp docs/지침서/암환자-식이영양-지침서.html public/_pv.html
npm run dev &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --virtual-time-budget=20000 --print-to-pdf-no-header \
  --print-to-pdf="$PWD/docs/지침서/암환자-식이영양-지침서.pdf" \
  "http://localhost:5173/_pv.html"
rm public/_pv.html
```

`file://` 로 열면 구글 폰트가 막혀 서체가 달라집니다. 반드시 dev 서버를 거치십시오.

## 구성

- 0부 읽기 전에 — 근거 등급 읽는 법
- **총론** — 왜 영양이 치료의 일부인가 · 체중 감소와 악액질 · 하루 목표 계산 ·
  모자랄 때의 순서 · 의료진에게 알릴 때 · 흔한 오해 여섯
- **각론(영양소별)** — 열량·단백질·지방·탄수화물 / 식이섬유·수분 /
  나트륨·칼륨·인·칼슘 / 비타민 D·K·B12·철·아연 / 항산화제 / 보충제 성분 33종
- 1부 공통 원칙 · 2부 증상 17 · 3부 암종 10 · 4부 약과 음식 · 5부 참고 문헌 79
