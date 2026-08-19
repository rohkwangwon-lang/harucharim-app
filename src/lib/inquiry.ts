import { supabase } from './supabase'

/**
 * 1:1 문의.
 *
 * 받는 범위를 데이터에 관한 것으로 한정한다.
 * 개별 치료 상담을 앱으로 받으면 진료가 되어 버리고, 그건 이 앱이 할 일이 아니다.
 * 화면에서도 그렇게 안내한다.
 */

export type InquiryKind = 'food' | 'supplement' | 'error' | 'etc'

export const KIND_LABEL: Record<InquiryKind, string> = {
  food: '음식 추가 요청',
  supplement: '영양제 추가 요청',
  error: '내용 오류 신고',
  etc: '기타 의견'
}

export const KIND_HINT: Record<InquiryKind, string> = {
  food: '찾으시는 음식 이름과, 아는 만큼의 정보(제조사·포장 표시 열량 등)를 적어 주세요.',
  supplement: '제품명과 제조사를 적어 주세요. 포장의 １일 섭취량 표시를 함께 알려주시면 정확합니다.',
  error: '어떤 항목의 어떤 값이 이상한지, 그리고 맞다고 생각하시는 값을 적어 주세요.',
  etc: '불편한 점이나 바라시는 기능을 자유롭게 적어 주세요.'
}

export interface Inquiry {
  id: string
  created_at: string
  kind: InquiryKind
  subject: string
  body: string
  status: 'open' | 'answered' | 'closed'
  answer: string | null
  answered_at: string | null
}

export interface NewInquiry {
  kind: InquiryKind
  subject: string
  body: string
  /** 로그인하지 않았을 때 답변받을 주소 */
  contactEmail?: string
}

export async function submitInquiry(input: NewInquiry, userId?: string, userEmail?: string) {
  if (!supabase) throw new Error('문의 기능이 아직 준비되지 않았습니다.')

  const row = {
    user_id: userId ?? null,
    contact_email: userId ? (userEmail ?? null) : (input.contactEmail ?? null),
    kind: input.kind,
    subject: input.subject.trim(),
    body: input.body.trim(),
    app_version: __APP_VERSION__
  }
  if (!row.user_id && !row.contact_email) {
    throw new Error('답변받으실 이메일을 적어 주세요.')
  }

  const { error } = await supabase.from('of_inquiries').insert(row)
  if (error) throw new Error(friendly(error.message))
}

export async function listMyInquiries(): Promise<Inquiry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('of_my_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Inquiry[]
}

/** Supabase 오류 문구를 그대로 보여 주면 무슨 말인지 알 수 없다 */
function friendly(msg: string): string {
  if (/row-level security|violates/i.test(msg)) return '문의를 보낼 권한이 없습니다. 다시 로그인해 보세요.'
  if (/relation .* does not exist/i.test(msg)) return '문의 기능이 아직 서버에 준비되지 않았습니다.'
  if (/network|fetch/i.test(msg)) return '인터넷 연결을 확인해 주세요.'
  return msg
}
