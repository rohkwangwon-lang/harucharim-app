/**
 * 계정 삭제를 찾을 수 있는가 — 2026-11-19 애플 심사 반려(지침 5.1.1(v)).
 *
 * 삭제 기능은 있었는데 내 정보 맨 아래 가까이 다른 카드 사이에 있어 심사자가 찾지 못했다.
 * 애플은 '시작부터 확인까지' 를 본다(실기기 화면 녹화를 요구).
 *
 *  · 내 정보에서 계정 카드(AccountCard)가 맨 위 — 환자 정보(PatientPanel)보다 먼저 나오는가
 *  · 계정 카드 안에 로그아웃과 계정 삭제가 함께 있는가
 *  · 계정 삭제가 '되돌릴 수 없음' 을 알리고 두 번 눌러야 지워지는가
 *  · 지운 뒤 로그인 화면이 '계정이 삭제되었습니다' 를 보여 주는가
 *  · 서버 함수가 문의와 계정(auth.users)을 실제로 지우는가 — 비활성화가 아니라
 *  · 계정 삭제가 다른 곳(예전 자리)에 하나 더 남아 있지 않은가
 */
import { readFileSync } from 'node:fs'

const bad: string[] = []
const ok = (cond: boolean, what: string) => { if (!cond) bad.push(what) }

const app = readFileSync('src/App.tsx', 'utf8')
const card = readFileSync('src/components/AccountCard.tsx', 'utf8')
const del = readFileSync('src/components/DeleteAccount.tsx', 'utf8')
const onb = readFileSync('src/components/Onboarding.tsx', 'utf8')
const sql = readFileSync('supabase/setup.sql', 'utf8')

const me = app.slice(app.indexOf("{tab === 'me' && ("))
const iCard = me.search(/<AccountCard\b/)
const iPanel = me.search(/<PatientPanel\b/)
ok(iCard > 0 && iPanel > 0 && iCard < iPanel, '내 정보: 계정 카드가 맨 위(환자 정보보다 앞)에 있지 않음')
ok((app.match(/<DeleteAccount\b/g) ?? []).length === 0, 'App: 계정 삭제가 계정 카드 밖에 또 있음(예전 자리)')

ok(/<DeleteAccount\b/.test(card), '계정 카드에 계정 삭제가 없음')
ok(/signOut\(\)/.test(card) && />\s*로그아웃\s*</.test(card), '계정 카드에 로그아웃이 없음')
ok(/>\s*계정\s*</.test(card), "계정 카드 제목('계정')이 없음")
ok(!/if \(!user\) return null/.test(card), '계정 카드가 로그인 정보를 불러오는 사이 통째로 사라짐')

ok(/되돌릴 수 없습니다/.test(del), "계정 삭제: '되돌릴 수 없습니다' 안내가 없음")
ok((del.match(/>\s*\{?busy \? '지우는 중…' : '계정 삭제'\}?\s*</g) ?? []).length === 1 && /setOpen\(true\)/.test(del),
  '계정 삭제: 펼쳐서 한 번 더 누르는 확인 단계가 없음')
ok(/rpc\('of_delete_me'\)/.test(del), '계정 삭제: 서버 삭제 함수를 부르지 않음')
ok(/sessionStorage\.setItem\(DELETED_FLAG/.test(del), '계정 삭제: 지운 뒤 확인 안내 표시를 남기지 않음')
ok(/DELETED_FLAG/.test(onb) && /계정이 삭제되었습니다/.test(onb), "로그인 화면: '계정이 삭제되었습니다' 안내가 없음")
ok(!/카카오·구글 연결\)<\/li>/.test(del), '계정 삭제: 아이폰 앱(이메일만)에 카카오·구글을 지운다고 적음')

const fn = sql.slice(sql.indexOf('function public.of_delete_me()'), sql.indexOf('grant execute on function public.of_delete_me()'))
ok(/delete from public\.of_inquiries where user_id = uid/.test(fn), '서버: 계정 삭제가 문의를 지우지 않음')
ok(/delete from auth\.users where id = uid/.test(fn), '서버: 계정을 실제로 지우지 않음(비활성화는 애플이 반려)')

console.log(bad.length === 0
  ? '계정 삭제 검사 완료 — 문제 없음 (자리 · 카드 · 확인 단계 · 삭제 뒤 안내 · 서버)'
  : `계정 삭제 검사 — 문제 ${bad.length}종\n` + bad.map((b) => '■ ' + b).join('\n'))
if (bad.length) process.exitCode = 1
