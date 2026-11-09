# 모집 영상 → MP4 (카카오톡에 바로 올리는 동영상 파일)

`public/tester/video.html`(움직이는 웹 영상)을 프레임마다 찍고, 나레이션을 입혀 MP4로 만든다. 이 컴퓨터에는 ffmpeg 가 없어 macOS 기본 AVFoundation(Swift)으로 인코딩한다.

1. 나레이션 — `narration.json`(장면 11개, 화면 글 내용을 말하듯 풀어 쓴 해요체)을 고친 뒤
   `node tts.mjs <작업폴더> [목소리] [출력폴더]` (작업폴더에 narration.json 을 복사해 둘 것). 기본 목소리는 남성 대화체 `ko-KR-Chirp3-HD-Achird`(2026-11-09 사용자 요청: 남자 목소리·구어체·말하듯). Chirp3 는 속도·높낮이 값을 받지 않아 뺀다. 키는 `~/.config/harucharim/google-tts.key` 에서만 읽는다.
2. 시간표 — `python3 timeline.py voice` 가 장면마다 max(원래 길이, 0.5 + 나레이션 + 0.8)초로 늘린다(마지막 장면 끝 2.2초 머묾). 첫 장면은 제목이 다 보인 상태(쪽 3.6초)에서 시작해 카카오 미리보기 그림이 빈 화면이 되지 않게 한다. `timeline-예시.json` 형식: segs = [영상 시작, 영상 길이, 쪽 시작, 쪽 길이].
3. 찍기 — `node capture.mjs public/tester <작업폴더>/frames 30 <작업폴더>/timeline.json` (약 3분, 4천여 장). 페이지 시계를 직접 옮기고 CSS 전환도 멈춘 채 시각을 맞추므로 프레임이 빠지지 않는다. '처음부터 다시 보기' 등 누르는 단추는 감춘다.
4. 인코딩 — `swiftc -O encode.swift -o encode` 후
   `./encode <frames> <narration.wav> <출력.mp4> 30 1080 1920 5000000` (가벼운 판: 720 1280 2000000).

2026-11-09 결과(남성 대화체): 2분 14초, 1080×1920 14.2 MB · 720×1280 8.4 MB. 다른 목소리 견본(Umbriel·Algieba·Charon)은 docs/홍보/비공개테스트/목소리-견본/. 결과 파일은 git 에 넣지 않는다(docs/홍보/비공개테스트/).
