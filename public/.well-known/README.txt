assetlinks.json — 구글 플레이 TWA 검증 파일

이 파일은 https://도메인/.well-known/assetlinks.json 으로 열려야 합니다.
지금처럼 github.io 하위 경로(github.io/harucharim-app/)에 있으면 구글이 찾지 못합니다.
자체 도메인을 연결한 뒤에야 제 구실을 합니다.

넣어야 할 값 두 가지
 1) package_name — 안드로이드 패키지 이름. 지금은 com.harucharim.app 로 적어 두었습니다.
    Bubblewrap/PWABuilder 로 만들 때 정한 값과 반드시 같아야 합니다.
 2) sha256_cert_fingerprints — 플레이 콘솔의
    [설정 → 앱 서명 → 앱 서명 키 인증서] 에 있는 SHA-256 지문을 그대로 붙입니다.
    업로드 키가 아니라 **앱 서명 키** 쪽입니다. 이걸 헷갈리면 링크 검증이 조용히 실패합니다.

확인 방법
    https://도메인/.well-known/assetlinks.json 을 브라우저로 열어 JSON 이 보이면 됩니다.
    구글 도구: https://developers.google.com/digital-asset-links/tools/generator
