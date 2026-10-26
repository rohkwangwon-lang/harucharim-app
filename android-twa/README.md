# 구글 플레이용 안드로이드 포장(TWA) — Bubblewrap

`twa-manifest.json` 이 원본이다. 생성된 그레이들 프로젝트와 결과물(`app-release-bundle.aab`, `app-release-signed.apk`)은 커밋하지 않는다.
서명 키는 저장소 밖 `~/.config/harucharim/android-upload.keystore`(비밀번호는 같은 폴더 `android-upload-key.txt`)에 있다 — 잃어버리면 업데이트를 못 올리니 백업할 것.

```bash
# 처음 한 번: Bubblewrap 이 JDK 17 과 Android SDK 를 ~/.bubblewrap 에 받는다(2026-10-26 완료)
# 다시 만들기(버전 올릴 때는 twa-manifest.json 의 appVersionCode 를 1 올리고)
zsh scripts/build-android.sh
```
