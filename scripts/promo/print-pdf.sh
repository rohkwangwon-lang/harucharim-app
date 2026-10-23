#!/bin/zsh
# 발표 HTML 두 벌을 PDF 로(2026-10-23). 한 장에 한 쪽, 16:9 — HTML 의 @media print 가 정한다.
# file:// 로 열면 구글 폰트(Hahmlet)가 막히므로 HTTP 로 띄워 찍는다(scripts/screenshots/README.md 의 교훈).
set -e
cd "$(dirname "$0")/../../docs/홍보"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8792
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
for f in 하루차림-발표 하루차림-환자-발표; do
  URL="http://127.0.0.1:$PORT/$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$f.html")"
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
    --print-to-pdf="$PWD/$f.pdf" "$URL" 2>/dev/null
  echo "$f.pdf $(python3 -c "from pypdf import PdfReader; import sys; print(len(PdfReader(sys.argv[1]).pages), '쪽')" "$f.pdf")"
done
