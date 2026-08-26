import { useEffect, useState } from 'react'
import { track } from '../lib/stats'
import { Section } from './ui'

/**
 * 사용하는 법.
 *
 * 이 앱은 화면마다 그 자리에서 필요한 말을 적어 두었지만, 전체를 한 번에
 * 훑어볼 데가 없었다. 그래서 있는 줄도 모르고 지나치는 기능이 있다 —
 * '다시 구성' 이나 주간 보고처럼 눌러 보아야 알 수 있는 것들이다.
 *
 * 처음 여신 분이 순서대로 읽으실 수 있게, 하루를 쓰는 흐름대로 적는다.
 * 화면 이름과 단추 이름은 실제와 한 글자도 다르지 않게 쓴다 —
 * 설명서와 화면이 어긋나면 설명서 쪽을 의심하지 않고 자기가 잘못 본 줄 안다.
 */

interface Step {
  q: string
  a: React.ReactNode
}

interface Chapter {
  tab: string
  title: string
  lead: string
  steps: Step[]
}

const CHAPTERS: Chapter[] = [
  {
    tab: '처음',
    title: '처음 한 번만 하면 되는 것',
    lead: '다섯 화면입니다. 여기서 고르신 것에 따라 뒤의 모든 추천이 달라집니다.',
    steps: [
      {
        q: '로그인',
        a: <>카카오나 구글로 들어오십니다. 따로 아이디를 만들지 않으셔도 되고, 처음이시면 그 단추로 바로 가입됩니다.
          다음에 오실 때 <strong>지난번에 쓰신 방법</strong>이 위에 표시되니 같은 쪽으로 들어오세요 —
          다른 쪽으로 들어가면 아예 다른 계정이 되어 적어 두신 것이 사라진 것처럼 보입니다.</>
      },
      {
        q: '암종',
        a: <>고르신 암종에 따라 권고가 <strong>완전히 달라집니다.</strong> 같은 음식이 어떤 암에서는 권장이고 다른 암에서는 주의 대상입니다.
          유방암·위암·전립선암·간암을 고르시면 아래에 <strong>세부 사항</strong>이 함께 나옵니다(호르몬 수용체, 위 전절제 여부 등).
          아시는 것만 고르셔도 되고, 알려 주시면 해당되지 않는 안내는 아예 뜨지 않습니다.</>
      },
      {
        q: '치료 시기',
        a: <>시기에 따라 권고가 뒤집히기도 합니다. 대장암에서 식이섬유는 회복 후에는 권장이지만 수술 직후에는 제한합니다.
          치료를 마치셨다면 <strong>치료를 마쳤습니다</strong>를 고르세요 — 목표 열량이 유지 수준으로 내려갑니다.</>
      },
      {
        q: '몸 상태',
        a: <>체중·신장·나이를 넣으시면 그 자리에서 <strong>BMI 와 하루 목표</strong>가 바로 보입니다.
          숫자를 잘못 넣으셨는지도 여기서 알 수 있습니다. 최근 6개월 체중 감소율이 5 % 이상이면 경고가 함께 뜹니다.</>
      },
      {
        q: '식성',
        a: <>기본은 제철 한식입니다. 양식·중식·일식·동남아를 더하시면 식단에 함께 섞습니다.
          마지막 화면에 <strong>설정 결과</strong>가 요약되니 한 번 훑어보시고 시작하세요.</>
      }
    ]
  },
  {
    tab: '내 식단',
    title: '오늘 무엇을 드실지 짜는 곳',
    lead: '가장 자주 여실 화면입니다. 아침·점심·저녁·간식을 모두 합한 것이 하루치입니다 — 한 끼 분량이 아닙니다.',
    steps: [
      {
        q: '오늘 상태가 어제와 다르면',
        a: <>맨 위의 <strong>달라졌나요?</strong> 를 펴시면 치료 시기·증상·복용 약을 그 자리에서 고치실 수 있습니다.
          설사가 생겼다고 표시하면 식이섬유 목표가 25~35 g 에서 8~15 g 으로 <strong>즉시</strong> 바뀝니다.
          매일 바뀌는 것이라 매일 여는 화면에 두었습니다.</>
      },
      {
        q: '드신 것 담기',
        a: <>끼니마다 <strong>＋ 음식 추가</strong>로 찾아 담으십니다. 전부 채우지 않으셔도 됩니다.
          비어 있는 끼니에는 <strong>이렇게 채워 보세요</strong>로 두어 가지를 미리 보여 드립니다.</>
      },
      {
        q: '재료를 담으셨다면',
        a: <>무나 두부처럼 그 자체로는 한 끼가 되지 않는 것을 담으시면,
          <strong> 담으신 재료로 이런 메뉴는 어떠세요</strong>가 나타나 그것으로 만드는 요리를 알려 드립니다.
          거기서 담으시면 재료 대신 그 요리로 셈합니다.</>
      },
      {
        q: '하루치를 한 번에',
        a: <><strong>하루치를 한 번에 추천받기</strong>를 누르시면 추천 화면으로 넘어갑니다.
          아무것도 담지 않으셨어도 됩니다 — 처음부터 짜 드립니다.</>
      },
      {
        q: '평가 읽는 법',
        a: <>에너지·단백질·식이섬유·나트륨 네 가지를 <strong>부족·적정·주의·넘음</strong>으로 판정해 드립니다.
          신장이 걸리시거나 항호르몬 치료 중이시면 칼륨·인·칼슘 같은 것이 더 붙습니다.
          맨 위 <strong>이유 보기</strong>를 펴시면 목표를 왜 그 값으로 잡았는지 나옵니다.</>
      }
    ]
  },
  {
    tab: '추천',
    title: '하루치를 짜 드리는 곳',
    lead: '영양 목표만 맞추는 것이 아니라 상차림의 짜임새도 봅니다 — 밥에는 국이나 반찬이 함께 오릅니다.',
    steps: [
      {
        q: '마음에 안 드시면',
        a: <><strong>다시 구성</strong>을 누르시면 같은 영양 목표로 다른 조합을 짜 드립니다.
          곁들이만 바뀌지 않도록 저녁 주요리부터 바꿉니다.
          몇 번째 안인지 화면에 적혀 있고, 지나친 안이 나았다면 <strong>‹ 이전 안</strong>으로 돌아가실 수 있습니다.</>
      },
      {
        q: '왜 이것을 권하는지',
        a: <>음식마다 <strong>무엇을 채우려고 넣었는지</strong>(예: 단백질 31 g 보충)와
          어떤 권고에 따른 것인지가 함께 적혀 있습니다. <strong>근거 A·B·C·G</strong> 배지를 누르시면 그 등급이 무슨 뜻인지 나오고,
          <strong>근거 n건</strong>을 펴시면 출처를 보실 수 있습니다.</>
      },
      {
        q: '가져오기',
        a: <>마음에 드는 것만 <strong>담기</strong>로 하나씩 가져오셔도 되고,
          위의 <strong>추천 n가지를 내 식단에 담기</strong>로 한꺼번에 가져오셔도 됩니다.</>
      }
    ]
  },
  {
    tab: '찾기',
    title: '음식을 찾는 곳',
    lead: '직접 만든 자료 488종과, 받아 두시면 시중 가공식품 27만 종을 함께 찾습니다.',
    steps: [
      {
        q: '요리 계통 고르기',
        a: <>한식·양식·중식·일식·동남아를 <strong>여러 개 함께</strong> 고르실 수 있습니다.
          아무것도 고르지 않으시면 전부 보여 드립니다.</>
      },
      {
        q: '판정 읽는 법',
        a: <>음식마다 이 암종·이 시기·이 증상에서 <strong>권장·주의·피하세요</strong> 중 무엇인지 표시됩니다.
          누르시면 영양성분과 그렇게 판단한 이유가 나옵니다.</>
      },
      {
        q: '시중 제품도 찾으려면',
        a: <><strong>내 정보 → 상품 데이터 받기</strong>를 한 번 받아 두시면
          편의점·마트 상품과 시판 영양제까지 찾을 수 있습니다. 받은 뒤에는 인터넷 없이도 됩니다.</>
      }
    ]
  },
  {
    tab: '기록',
    title: '지나온 날을 보는 곳',
    lead: '하루·한 주·한 달로 나눠 봅니다. 여러 날을 모아야만 보이는 것이 있습니다.',
    steps: [
      {
        q: '날짜 옮기기',
        a: <>‹ › 로 앞뒤로 오가시고, 멀리 가셨다면 <strong>오늘로</strong>를 누르시면 한 번에 돌아옵니다.</>
      },
      {
        q: '한 주·한 달 보고',
        a: <><strong>이 주의 영양 보고</strong>는 평균만이 아니라 <strong>며칠이나 모자랐고 며칠이나 넘쳤는지</strong>를 셉니다.
          하루는 원래 오르내리므로 어제 칼슘이 적었다고 문제가 아니지만,
          열네 날 중 열세 날이 그랬다면 그건 습관이고 습관은 고칠 수 있습니다.
          띠의 왼쪽 노랑이 모자란 날, 가운데 초록이 알맞은 날, 오른쪽 빨강이 넘친 날입니다.</>
      },
      {
        q: '모자랐던 것 채우기',
        a: <>보고 아래 <strong>모자랐던 것을 채우려면</strong>에서,
          실제로 모자랐던 것만 골라 채우는 길을 알려 드립니다.
          <strong>식품으로 채우는 길이 먼저</strong> 나오고 보충제는 그다음입니다.
          지금 상태에서 늘리면 오히려 해가 되는 것은 아예 뜨지 않습니다 —
          설사 중의 식이섬유가 그렇습니다.</>
      },
      {
        q: '체중',
        a: <>하루 화면에서 체중을 적으시면 그날 기록으로 남고, 아래에 흐름이 그려집니다.
          체중이 줄고 있으면 앱이 알아서 목표를 낮추지 않습니다.</>
      }
    ]
  },
  {
    tab: '영양제',
    title: '영양제를 보는 곳',
    lead: '제품이 아니라 분류 단위로 권합니다. 어떤 브랜드를 사야 한다는 뜻이 아닙니다.',
    steps: [
      {
        q: '나에게 맞는 것 찾기',
        a: <><strong>나에게 권장되는 것만</strong>과 <strong>주의·피해야 할 것만</strong> 두 단추로 4만 5천 종을 걸러 봅니다.
          권하는 쪽은 그 원료가 <strong>제품의 주된 성분</strong>이면서 같은 통에 주의하실 성분이 없는 것만 고릅니다 —
          유산균에 비타민 D 가 곁들여 들었다고 비타민 D 를 채우러 사실 일은 아니니까요.</>
      },
      {
        q: '드시는 것 표시하기',
        a: <>아래 <strong>손으로 검토한 영양제</strong>에서 드시는 것을 고르시면
          하루 영양소 합계에 함께 더해지고, 이 암종·약제와의 문제도 함께 검사합니다.</>
      },
      {
        q: '바코드',
        a: <>영양제 통의 바코드를 찍어 찾으실 수 있습니다. 못 찾으면 번호를 직접 넣거나 이름으로 찾아 주세요.
          자주 빗나가 성가시면 <strong>내 정보</strong>에서 꺼 두셔도 됩니다.</>
      }
    ]
  },
  {
    tab: '가이드',
    title: '읽을거리',
    lead: '',
    steps: [
      {
        q: '운동',
        a: <>이 암종에서 근거가 있는 운동을 종류·빈도·강도까지 적어 두었습니다.
          뼈 전이가 있으시면 조심할 것도 함께 나옵니다.</>
      },
      {
        q: '암종 가이드',
        a: <>이 암종의 영양 목표와 권고 전체를 한 번에 보실 수 있습니다.
          세부 사항을 고르셨다면 해당되지 않는 것은 빼고 보여 드립니다.</>
      },
      {
        q: '근거 등급',
        a: <>A·B·C·G 가 각각 무슨 뜻인지, 어느 정도로 믿고 따르시면 되는지 적었습니다.</>
      }
    ]
  },
  {
    tab: '내 정보',
    title: '설정과 도움',
    lead: '',
    steps: [
      {
        q: '글자 크기',
        a: <><strong>보통·크게·더 크게</strong> 중에서 고르실 수 있습니다.
          글자와 함께 여백도 커지므로 화면이 흐트러지지 않습니다.</>
      },
      {
        q: '상품 데이터',
        a: <>한 번 받아 두시면 시중 가공식품 27만 종과 시판 영양제 4만 5천 종을 찾을 수 있습니다.
          약 16 MB 이므로 Wi-Fi 를 권합니다.</>
      },
      {
        q: '문의',
        a: <>찾으시는 음식·영양제가 없거나 내용이 이상하면 알려 주세요.
          로그인하셨다면 답변을 앱 안에서 확인하실 수 있습니다.</>
      }
    ]
  }
]

const CAUTIONS: { q: string; a: string }[] = [
  {
    q: '이 앱이 하지 않는 것',
    a: '진료·처방·영양 상담을 대체하지 않습니다. 여기 적힌 것은 담당 선생님과 이야기하실 거리이지 결론이 아닙니다.'
  },
  {
    q: '숫자는 참고값입니다',
    a: '영양성분은 국가표준식품성분표와 제품 표시값을 기준으로 한 대표값입니다. 조리법과 제품에 따라 실제 값은 달라집니다.'
  },
  {
    q: '근거가 엇갈리면 그렇다고 적습니다',
    a: '한쪽으로 몰지 않습니다. 아연과 미각 변화처럼 결과가 일치하지 않는 주제는 "해 볼 만한 것 중 하나"라고 적습니다.'
  },
  {
    q: '건강 정보는 이 기기 안에만',
    a: '체중·나이의 실제 수치와 드신 음식은 어떤 경우에도 나가지 않습니다. 문의를 보내실 때 적어 주신 내용, 그리고 이용 통계에 동의하신 경우 뭉갠 값(암종·연령대 등)만 서버로 갑니다. 통계는 기본이 꺼져 있고 내 정보에서 켜고 끄실 수 있습니다.'
  }
]

export function HowTo() {
  useEffect(() => { track('howto_view') }, [])
  const [open, setOpen] = useState<string | null>('내 식단')

  return (
    <div>
      <Section
        title="하루차림 사용하는 법"
        desc="하루를 쓰는 순서대로 적었습니다. 필요하신 곳만 펴서 보셔도 됩니다."
      >
        <div className="card border-brand-200 bg-brand-50/50 p-4">
          <p className="text-sm leading-relaxed text-stone-700">
            이 앱이 하는 일은 하나입니다 — <strong>지금 드시려는 것이 이 암종·이 시기·이 몸 상태에
            맞는지 알려 드리는 것.</strong> 그 판단마다 근거와 출처를 함께 붙였습니다.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
            암 환자를 25년간 치료해 온 방사선종양학과 전문의가 내용을 감수하고 검토했습니다.
          </p>
        </div>
      </Section>

      <div className="space-y-2.5">
        {CHAPTERS.map((c) => {
          const isOpen = open === c.tab
          return (
            <div key={c.tab} className="card overflow-hidden">
              <button
                className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
                onClick={() => setOpen(isOpen ? null : c.tab)}
                aria-expanded={isOpen}
              >
                <span className="chip shrink-0 bg-brand-600 text-white">{c.tab}</span>
                <span className="min-w-0 flex-1 text-sm font-bold text-stone-900">{c.title}</span>
                <span className={`shrink-0 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M5 9l7 7 7-7" />
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-stone-100 px-3.5 py-3">
                  {c.lead && (
                    <p className="mb-3 text-[11px] leading-relaxed text-stone-500">{c.lead}</p>
                  )}
                  <ol className="space-y-3">
                    {c.steps.map((s, i) => (
                      <li key={s.q} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-800">{s.q}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">{s.a}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Section title="알아 두실 것" desc="">
        <ul className="card divide-y divide-stone-100 overflow-hidden">
          {CAUTIONS.map((c) => (
            <li key={c.q} className="px-3.5 py-3">
              <p className="text-sm font-semibold text-stone-800">{c.q}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">{c.a}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
