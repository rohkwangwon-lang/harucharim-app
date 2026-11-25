#!/bin/zsh
# 앱스토어 출시 홍보물(2026-11-25) — HTML 을 PDF(포스터·카드)와 PNG(카카오톡·SNS 그림)로.
# file:// 로 열면 구글 폰트가 막히므로 HTTP 로 띄워 찍는다(print-pdf.sh 와 같은 까닭).
set -e
cd "$(dirname "$0")/../../docs/홍보/앱스토어-출시"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8793
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
u() { echo "http://127.0.0.1:$PORT/$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$1")" }
for f in 포스터-A4 안내카드-A4-10장; do
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
    --print-to-pdf="$PWD/$f.pdf" "$(u $f.html)" 2>/dev/null
  echo "$f.pdf"
done
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=8000 --window-size=1080,1080 \
  --screenshot="$PWD/그림-정사각.png" "$(u 그림-정사각.html)" 2>/dev/null && echo 그림-정사각.png
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=8000 --window-size=1080,1920 \
  --screenshot="$PWD/그림-세로.png" "$(u 그림-세로.html)" 2>/dev/null && echo 그림-세로.png
