#!/bin/zsh
# 알레르기 원재료 색인 매주 갱신(2026-10-15) — launchd(com.harucharim.allergens.weekly)가 월요일 아침에 부른다.
#
#  1) C002 최근 7일 증분과 HACCP 표지정보 전체(약 1만 5천, 147회 호출)를 받는다
#  2) 색인을 다시 만든다(scripts/build-allergens.ts)
#  3) 색인 내용(map)이 실제로 바뀌었을 때만, 안전·문서·데이터 검사가 모두 통과하면 커밋·푸시(= harucharim.com 배포)
# 실패해도 앱은 지난 색인을 그대로 쓴다 — 이 작업이 멈춰서 위험해지는 것은 없다.
set -u
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
APP="/Users/kwangwonroh/클로드 작업/harucharim-app"
cd "$APP" || exit 1
echo "== $(date '+%F %T') 알레르기 색인 주간 갱신"

git pull -q --rebase origin main || { echo "pull 실패 — 중단"; exit 1; }
node scripts/fetch-rawmtrl-weekly.mjs || { echo "증분 수집 실패 — 지난 색인 유지"; exit 1; }
node scripts/fetch-haccp.mjs || echo "HACCP 표지정보 수집 실패 — 지난 자료로 계속"
node_modules/.bin/jiti scripts/build-allergens.ts || { echo "색인 실패"; git checkout -q public/data/allergens.json; exit 1; }

CHANGED=$(python3 -I - <<'PY'
import json, subprocess
new = json.load(open('public/data/allergens.json'))['map']
try:
    old = json.loads(subprocess.check_output(['git', 'show', 'HEAD:public/data/allergens.json']))['map']
except Exception:
    old = {}
diff = sum(1 for k in set(new) | set(old) if new.get(k) != old.get(k))
print(diff)
PY
)
echo "바뀐 제품: $CHANGED"
if [ "$CHANGED" = "0" ]; then git checkout -q public/data/allergens.json; echo "바뀐 것 없음 — 끝"; exit 0; fi

S=$(node_modules/.bin/jiti scripts/checks/safety.ts 2>&1 | tail -1); echo "$S"
D=$(node_modules/.bin/jiti scripts/checks/docs.ts 2>&1 | tail -1); echo "$D"
T=$(node_modules/.bin/jiti scripts/checks/data.ts 2>&1 | grep -m1 "완료"); echo "$T"
if echo "$S" | grep -q "문제 0건" && echo "$D" | grep -q "문제 없음" && echo "$T" | grep -q "문제 0종"; then
  git add public/data/allergens.json
  git commit -q -m "data: 알레르기 원재료 색인 주간 갱신 — 제품 ${CHANGED}건 바뀜(C002 최근 7일)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -q origin main && echo "배포 $(git log --oneline -1)"
else
  git checkout -q public/data/allergens.json
  echo "검사 실패 — 배포하지 않음"
  exit 1
fi
