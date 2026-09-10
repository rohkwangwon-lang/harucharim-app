# 가입 확인·비밀번호 재설정 편지 (한국어)

Supabase 가 기본으로 보내는 편지는 영어이고, 보낸 이도 `Supabase Auth` 입니다.
항암 중이신 분께 영어로 "Confirm your signup" 이 오면 스팸이나 사기 편지로 보고 지우십니다.
그래서 두 편지를 우리 말로 바꿔 둡니다.

| Supabase 서식 이름 | 제목(Subject) 칸 | 본문(Body) 칸 |
|---|---|---|
| Confirm signup | `[하루차림] 가입을 마무리해 주세요` | `confirm-signup.html` 통째로 |
| Reset Password | `[하루차림] 비밀번호를 다시 정하는 주소입니다` | `reset-password.html` 통째로 |

넣는 곳: Supabase 대시보드 → 프로젝트 `oncofood` → **Authentication → Emails → Templates**

- 파일 맨 위의 `<!-- … -->` 줄까지 함께 붙여도 괜찮습니다(편지에는 보이지 않습니다).
- `{{ .ConfirmationURL }}` 은 Supabase 가 채우는 자리입니다. 지우거나 고치지 마십시오.
- 나머지 서식(Magic Link·Change Email·Invite)은 이 앱이 쓰지 않으므로 그대로 두셔도 됩니다.

`login` 검사가 두 파일이 제자리에 있는지, 영어 기본 문구가 섞이지 않았는지 봅니다.
