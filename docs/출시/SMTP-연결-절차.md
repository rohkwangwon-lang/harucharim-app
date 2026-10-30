# 가입 확인 메일(SMTP) 연결 — 따라 하기

작성 2026년 9월 11일 · 대상 Supabase 프로젝트 `oncofood` · 보내는 곳 **Resend**

> **2026-10-30 현재:** 9월 18일 날짜 문은 지났으므로 아래를 한 번에 하셔도 됩니다.
> 가비아에는 Resend 용 DNS 넷(`resend._domainkey`·`send`·`rsend`·`_dmarc`)이 **이미 들어가 있습니다**(10월 30일 조회).
> 남은 것은 **1-4 확인 → 2-1 키 → 2-2 SMTP → 2-3 한도 → 2-4 편지 → 3 확인** 입니다.
>
> ⚠️ Supabase 기본 발송기는 **Supabase 팀원 주소로만** 편지를 보냅니다(공식 문서, 2026-10-30 확인).
> 그래서 이 연결 전에는 심사용 계정(`rohkwangwon+review@gmail.com`)도, 환자분들의 이메일 가입도 확인 편지를 받지 못합니다.

---

## 먼저 — 왜 날을 나누는가

이메일 가입을 붙인 9월 9일, 약관과 처리방침은 여전히
"카카오·구글로만 로그인, 비밀번호는 받지 않는다" 였습니다. 게다가 Resend 는 새 수탁자이고
미국 회사라 **국외 이전**으로도 밝혀야 합니다(개인정보 보호법 제28조의8).

두 문서를 고쳐 **9월 11일 앱 안에 알렸고, 시행일은 9월 18일**입니다 —
약관 10항이 "시행일 7일 전에 알린다" 고 약속했기 때문입니다.
그래서 앱의 이메일 가입도 **9월 18일 아침에 저절로 열리도록** 날짜로 막아 두었습니다.
그 전에 Resend 로 편지를 보내면, 문서가 아직 밝히지 않은 곳으로 주소를 넘기게 됩니다.

> ⚠️ **Resend 말고 다른 곳을 쓰시려면 먼저 말씀해 주십시오.**
> 처리방침에 `Plus Five Five, Inc. (Resend) · 미국` 이라고 적었습니다.
> 다른 곳으로 가면 방침부터 다시 고치고 7일을 다시 기다려야 합니다.

---

## 0. 지금 확인하실 것 — Supabase 주소 설정 (1분)

가입 확인 편지와 재설정 편지의 단추는 **Site URL** 로 사람을 돌려보냅니다.
도메인을 옮긴(9월 9일) 뒤에 이곳을 고쳤는지 제가 밖에서 확인할 방법이 없었습니다.

Supabase 대시보드 → `oncofood` → **Authentication → URL Configuration**

| 칸 | 있어야 할 값 |
|---|---|
| Site URL | `https://harucharim.com` |
| Redirect URLs | `https://harucharim.com/**` (없으면 **Add URL** 로 더하기) |

옛 주소(`…github.io/harucharim-app/`)나 `localhost` 가 Site URL 에 남아 있으면,
편지의 단추를 누른 분이 엉뚱한 곳에 떨어집니다.

---

## 1. 지금 해도 되는 것 — Resend 준비 (메일은 아직 안 나갑니다)

### 1-1. Resend 가입
`https://resend.com` → **Sign up** — 가입은 직접 하셔야 합니다.
무료 요금제로 충분합니다: **하루 100통 · 달 3,000통 · 도메인 3개 · 기록 30일 보관**.

### 1-2. 도메인 등록
Resend → **Domains → Add Domain**

| 칸 | 값 |
|---|---|
| Name | `harucharim.com` |
| Region | **North Virginia (us-east-1)** ← 처리방침에 '미국' 이라 적었으므로 이것으로 |

누르면 **DNS 레코드 서너 줄**이 나옵니다. 창을 닫지 마십시오.

### 1-3. 가비아에 DNS 넣기
가비아 → **My가비아 → 서비스 관리 → 도메인 → harucharim.com → DNS 관리 → 설정**

Resend 화면의 줄을 **하나씩 그대로** 옮깁니다. 가비아의 '호스트' 칸에는
**도메인 뒷부분을 빼고** 적습니다.

> **2026-10-14 에 Resend 화면이 바뀐 것을 확인했습니다.** 예전처럼 `send` 에 MX·TXT 를 넣는 방식이 아니라
> 아래처럼 **TXT 둘 + CNAME 둘** 입니다. 화면에 보이는 대로 넣으시면 됩니다.
> Resend 화면은 긴 값을 `p=MIGfMA[…]QIDAQAB` 처럼 **가운데를 줄여서** 보여 줍니다.
> 보이는 글자를 손으로 옮기지 말고, 값을 눌러(또는 옆의 복사 단추로) **복사**해서 붙여 넣으십시오.

| Resend 에 보이는 것 | 가비아 '타입' | 가비아 '호스트' | 가비아 '값' |
|---|---|---|---|
| DKIM · TXT · `resend._domainkey` | TXT | `resend._domainkey` | `p=MIGfMA…` 긴 값 통째로(복사) |
| SPF · CNAME · `rsend` | CNAME | `rsend` | `rsend.fo…mta.net` 통째로(복사) |
| SPF · CNAME · `send` | CNAME | `send` | `send.for…mta.net` 통째로(복사) |
| DMARC · TXT · `_dmarc` | TXT | `_dmarc` | `v=DMARC1; p=none;` |

- CNAME 값 끝에 점(`.`)을 붙이라는 칸이 따로 있으면 가비아 안내를 따르십시오. 가비아는 보통 점 없이 넣어도 됩니다.
- **Enable Receiving(받기)은 켜지 마십시오.** 이 앱은 메일을 보내기만 합니다. 켜면 MX 줄이 더 생깁니다.

> 지금 이 도메인에는 A 넷·www CNAME 하나 말고는 아무것도 없어서 부딪칠 것이 없습니다(10월 14일 조회).
> 기존 **A 레코드 넷과 www CNAME 은 절대 건드리지 마십시오** — 앱 주소입니다.

### 1-4. 확인
Resend 로 돌아가 **Verify DNS Records**. 몇 분~몇 시간 걸립니다.
줄마다 초록색 **Verified** 가 되면 준비 끝입니다.

---

## 2. 9월 18일 이후 — Supabase 를 Resend 에 잇기

### 2-1. Resend API 키 만들기
Resend → **API Keys → Create API Key**

| 칸 | 값 |
|---|---|
| Name | `supabase-oncofood` |
| Permission | **Sending access** |
| Domain | `harucharim.com` |

`re_` 로 시작하는 키가 **한 번만** 보입니다.

> 🔒 **이 키는 비밀번호와 같습니다.** 저에게 보내지 마시고, 파일이나 깃허브에도 넣지 마십시오.
> 바로 아래 Supabase 칸에만 붙여 넣으십시오.

### 2-2. Supabase SMTP 설정
Supabase → `oncofood` → **Authentication → Emails → SMTP Settings → Enable Custom SMTP**

| 칸 | 값 |
|---|---|
| Sender email | `no-reply@harucharim.com` |
| Sender name | `하루차림` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | 2-1 의 `re_…` 키 |

**Save**.

### 2-2-1. 링크 추적은 끄기
Resend → **Domains → harucharim.com → Configuration** 에서 **Click Tracking · Open Tracking 이 꺼져 있는지**.
켜져 있으면 확인 단추의 주소가 바뀌어 눌러도 가입이 안 될 수 있습니다(Supabase 권고). 기본값은 꺼짐입니다.

### 2-3. 보내는 양 한도
같은 화면 또는 **Authentication → Rate Limits** 에서
`Rate limit for sending emails` 를 **시간당 30통** 정도로 두십시오.
Resend 무료 한도(하루 100통)를 넘기지 않게 막는 난간입니다.

### 2-4. 한국어 편지 넣기
**Authentication → Emails → Templates** — [`supabase/email-templates/`](../../supabase/email-templates/README.md) 의 두 파일.

| 서식 | 제목 | 본문 |
|---|---|---|
| Confirm signup | `[하루차림] 가입을 마무리해 주세요` | `confirm-signup.html` 통째로 |
| Reset Password | `[하루차림] 비밀번호를 다시 정하는 주소입니다` | `reset-password.html` 통째로 |

---

## 3. 확인 — 심사용 계정을 만들면서

1. `https://harucharim.com` → 만 14세 확인 → **이메일로 하기 → 처음이에요 (가입)**
2. `rohkwangwon+review@gmail.com` 과 새 비밀번호(8자 이상)
3. 메일함에서 확인할 것 셋

| 볼 것 | 맞으면 |
|---|---|
| 보낸 이 | `하루차림 <no-reply@harucharim.com>` |
| 제목·본문 | 한국어 · 초록 단추 |
| 편지함 | **받은편지함** (스팸함이면 DMARC·DKIM 을 다시 봅니다) |

4. 단추를 누르면 `harucharim.com` 으로 돌아와 다음 단계로 넘어가는지
5. 들어간 뒤 **'문의 관리' 단추가 보이지 않는지** — 보이면 관리자 주소로 만든 것입니다

여기까지 되면 [플레이-콘솔-등록-절차.md](플레이-콘솔-등록-절차.md) 의 `앱 액세스 권한` 칸에 이 계정을 넣으시면 됩니다.

---

## 걸리면

| 증상 | 자리 |
|---|---|
| 편지가 아예 안 온다 | Resend → **Emails** 에 기록이 있는지 → 없으면 2-2 의 값, 있으면 스팸함 |
| Resend 기록에 `bounced` | 받는 주소가 틀림 |
| 단추를 누르면 엉뚱한 곳 | 0번 Site URL |
| 앱에 "이메일 가입이 서버에서 아직 열려 있지 않습니다" | Supabase → Authentication → Providers → Email 이 꺼져 있음 |
| 9월 18일 전인데 이메일 칸이 안 보인다 | 정상입니다 — 날짜로 막아 두었습니다 |
