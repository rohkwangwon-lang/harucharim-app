#!/bin/zsh
# 구글 플레이용 AAB 를 만든다(2026-10-26). 키 비밀번호는 ~/.config/harucharim/android-upload-key.txt 에서 읽어 화면에 내지 않는다.
set -e
cd "$(dirname "$0")/../android-twa"
KEYINFO=~/.config/harucharim/android-upload-key.txt
[ -f "$KEYINFO" ] || { echo "키 정보 파일이 없습니다: $KEYINFO"; exit 1; }
PW=$(sed -n 's/^storepass=//p' "$KEYINFO")
export PATH="$HOME/.bubblewrap/jdk/jdk-17.0.11+9/Contents/Home/bin:$PATH"
export JAVA_HOME="$HOME/.bubblewrap/jdk/jdk-17.0.11+9/Contents/Home"
# 프로젝트가 없으면 twa-manifest.json 에서 만든다(update 는 있는 것을 갱신)
if [ ! -f app/build.gradle ]; then
  npx -y @bubblewrap/cli update --skipVersionUpgrade --manifest ./twa-manifest.json
fi
# build 는 키 비밀번호를 두 번 묻는다(키 저장소, 키). 파이프로 넣으면 묻는 창(inquirer)이 닫혀 버려 expect 로 단말을 흉내 낸다
export BW_PW="$PW"
expect <<'EOF'
set timeout 1800
spawn npx -y @bubblewrap/cli build --skipPwaValidation --manifest ./twa-manifest.json
expect {
  -re {Accept\? \(y/N\)} { send "y\r"; exp_continue }
  -re {Password for the Key Store} { send "$env(BW_PW)\r"; exp_continue }
  -re {Password for the Key:} { send "$env(BW_PW)\r"; exp_continue }
  eof
}
EOF
unset BW_PW
ls -la app-release-bundle.aab app-release-signed.apk
