import type { Food, FoodGroup, FoodTag } from '../types'
import { grains } from './grains'
import { legumes } from './legumes'
import { nuts } from './nuts'
import { vegetables } from './vegetables'
import { seaweedMushroom } from './seaweedMushroom'
import { fruits } from './fruits'
import { meat } from './meat'
import { poultryEgg } from './poultryEgg'
import { seafood } from './seafood'
import { dairy } from './dairy'
import { fatsSugar } from './fatsSugar'
import { soups } from './soups'
import { sidedish } from './sidedish'
import { riceNoodle } from './riceNoodle'
import { eatout } from './eatout'
import { beverages } from './beverages'
import { snacks } from './snacks'
import { processed } from './processed'
import { clinical } from './clinical'
import { vegetables2 } from './vegetables2'
import { fruits2 } from './fruits2'
import { dishes2 } from './dishes2'
import { misc2 } from './misc2'
import { western } from './western'
import { ramyeon } from './ramyeon'
import { gimbap } from './gimbap'
import { ASIA_FOODS } from './asia'
import { CALCIUM_FOODS } from './calcium'
import { CHINESE_MORE, WORLD_FOODS } from './worldMore'
import { CUISINE_MAP, SEASON_MAP } from './seasonCuisine'
import { GENERATED_CORE } from './generated'

/** 손으로 검토해 태그를 붙인 식품. 검색에서 먼저 보여 준다. */
/**
 * '고나트륨' 을 실제로 드시는 양으로 다시 매긴다.
 *
 * 이 태그는 손으로 붙여 왔고, 기준이 100 g 농도였다. 그래서 한 접시가 70 g 인
 * 시금치나물(1회 210 mg)과 한 봉지가 5 g 인 김자반(1회 110 mg)도 '고나트륨' 이 되었다.
 * 태그가 붙은 190종 가운데 37종이 1회 제공량 400 mg 아래였다.
 *
 * 이것이 조용히 큰 일을 하고 있었다. 유방암 규칙 하나가 '고나트륨' 태그 전체에
 * '주의' 를 걸어 두었는데, 엔진은 '주의' 를 추천 후보에서 통째로 뺀다.
 * 그래서 유방암 환자분께 시금치나물·가지나물·무생채·배추김치·콩자반이
 * 한 번도 추천되지 않았다 — 국이 아닌 반찬 128종 중 79종이 그렇게 사라졌다.
 *
 * 나트륨은 농도가 아니라 드신 총량이 문제다. 실제로 드시는 한 번의 양으로 본다.
 */
const HIGH_SODIUM_PER_SERVING = 400
function withSodiumTag(f: Food): FoodTag[] {
  const na = f.per100.na
  /* 나트륨 값이 없는 것은 손으로 붙인 판단을 그대로 둔다 */
  if (na === undefined) return f.tags
  const perServing = (na * f.serving.g) / 100
  const high = perServing >= HIGH_SODIUM_PER_SERVING
  const has = f.tags.includes('고나트륨')
  if (high === has) return f.tags
  return high ? [...f.tags, '고나트륨'] : f.tags.filter((t) => t !== '고나트륨')
}

export const CURATED_FOODS: Food[] = [
  ...grains, ...legumes, ...nuts, ...vegetables, ...seaweedMushroom, ...fruits,
  ...meat, ...poultryEgg, ...seafood, ...dairy, ...fatsSugar,
  ...soups, ...sidedish, ...riceNoodle, ...eatout,
  ...beverages, ...snacks, ...processed, ...clinical,
  ...vegetables2, ...fruits2, ...dishes2, ...misc2, ...western,
  ...ramyeon, ...gimbap, ...ASIA_FOODS, ...CALCIUM_FOODS, ...WORLD_FOODS, ...CHINESE_MORE
].map((f) => ({
  // 제철·요리 계통은 seasonCuisine.ts 한 곳에서 관리하고 여기서 붙인다
  ...f,
  tags: withSodiumTag(f),
  season: f.season ?? SEASON_MAP[f.id],
  cuisine: f.cuisine ?? CUISINE_MAP[f.id] ?? '한식'
}))

/**
 * 전체 식품 = 수작업 검토분 + 공공데이터 자동 수집분.
 * 수작업 검토분을 앞에 두어 검색 결과에서 먼저 걸리게 한다.
 */
export const FOODS: Food[] = [...CURATED_FOODS, ...GENERATED_CORE]

/** id → Food 조회용 인덱스 */
export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(
  FOODS.map((f) => [f.id, f])
)

/** 중복 id 는 데이터 오류이므로 개발 중 즉시 드러나게 한다 */
if (import.meta.env?.DEV) {
  const seen = new Set<string>()
  for (const f of FOODS) {
    if (seen.has(f.id)) console.error(`[foods] 중복 id: ${f.id}`)
    seen.add(f.id)
  }
}

/* ────────────────── 상에 오르는 것과 재료를 가른다 ────────────────── */

/**
 * 이것 하나로 상에 오를 수 있는가.
 *
 * 자료의 `form: 'ingredient'` 를 그대로 '추천하면 안 되는 것' 으로 써 왔는데,
 * 그 둘은 다른 이야기였다. 쌀밥도 김치도 두부도 김도 자료에서는 재료로 적혀 있다.
 * 그래서 한식 식단이라면서 밥이 스무 날 동안 한 번도 나오지 않았고,
 * 김치도 나물도 함께 빠졌다 — 488종 가운데 148종이 그렇게 사라졌다.
 * 과일에서 한 번, 조리된 단백질에서 또 한 번 겪은 것과 같은 오분류다.
 *
 * 이번에는 반대로 적는다. 무엇이 재료인지를 밝히고, 나머지는 상에 오른다고 본다.
 * 재료는 네 갈래뿐이다 — 기름·조미료, 장류, 손질 전의 것, 그리고 생고기·생선살.
 *
 * 생선회처럼 날로 먹는 것은 여기서 막지 않는다. 그건 '재료' 라서가 아니라
 * 호중구감소증 같은 상황에서 문제가 되는 것이므로 규칙이 따로 판단한다.
 */
const SEASONING = /^(된장|고추장|간장|쌈장|춘장|초고추장|저염된장|멸치액젓|소금|설탕|꿀|식초|케첩|마요네즈)$/
/*
 * '사리' 를 낱말 안에서 찾다가 '고사리나물' 이 걸렸다.
 * 고사리나물은 이미 무친 반찬이다. 라면사리처럼 그 낱말로 끝나는 것만 본다.
 */
const RAW_MARK = /\((생쌀|가루|건면|분쇄|생물|살)\)|사리$|사리\(|전분$/
/** 조리 표시가 없으면 아직 재료인 갈래 — 굽거나 삶기 전의 고기·생선 */
const RAW_PROTEIN_GROUPS = new Set<FoodGroup>(['육류', '가금류·난류'])
const COOKED_MARK = /\((구이|데친 것|찐 것|삶은 것|조림|볶음|찜|훈제)\)/
/** 손질만 해 두고 요리에 넣는 수산물 */
const SEAFOOD_STOCK = /^(멸치\(마른 것\)|북어\(황태\)|대구\(살\)|동태\(생물\)|알탕용 명태알|바지락|홍합|전복|해삼)$/

/*
 * 채소와 버섯은 대부분 그대로 상에 오르지 않는다.
 *
 * 처음에는 '재료' 를 좁게 잡고 나머지는 상에 오른다고 보았는데, 그러다 보니
 * 쑥·냉이·물냉이·건표고버섯이 반찬으로 추천되었다. 쑥은 떡이나 국에 넣는 것이지
 * 한 접시로 놓는 것이 아니고, 마른 표고는 불려서 볶아야 반찬이 된다.
 *
 * 채소가 상에 오르려면 둘 중 하나다 —
 * 손질해서 무치거나 익혔거나(나물·무침·데친 것·구이·김치), 아니면 날로 먹는 것이거나.
 * 상추와 깻잎은 씻어서 그대로 쌈으로 놓고, 오이와 방울토마토도 그렇다.
 * 그 밖의 것은 아직 요리 전이다.
 */
const COOKED_OR_PICKLED = /나물|무침|볶음|조림|찜|구이|전$|김치|장아찌|지$|\((데친 것|삶은 것|찐 것|가열|구운 것|불린 것|익힌 것)|가열/
/*
 * 씻어서 그대로 상에 놓는 것.
 *
 * 목록을 손으로 적는다. 규칙으로 가리려 했더니 가지와 도라지가 통과했는데,
 * 가지는 구워야 하고 도라지는 무쳐야 한다.
 * '날로 먹는가' 는 이름이나 식품군으로는 알 수 없고 사람이 아는 것이다.
 */
const EATEN_RAW = new Set([
  '상추', '깻잎', '치커리', '오이', '토마토', '방울토마토',
  '파프리카(빨강)', '파프리카(노랑)', '셀러리', '적양배추', '브로콜리 새싹'
])
/** 국물이나 양념으로 들어가는 것 — 그 자체를 드시지는 않는다 */
const FOR_FLAVOUR = new Set([
  '마늘(생)', '양파', '대파', '쪽파', '마늘종', '고춧가루', '생강', '리크(서양대파)',
  '늙은호박',
  /* 익히거나 무쳐야 반찬이 되는 것들 — 이름만으로는 그것이 드러나지 않는다 */
  '가지', '도라지', '양배추', '배추', '무', '청경채', '케일', '갓', '부추',
  '쑥갓', '미나리', '쑥', '애호박', '풋고추', '당근', '우엉', '연근', '아스파라거스',
  '비트', '콜리플라워', '꽈리고추', '냉이', '물냉이', '순무', '오크라', '스위트콘(알)',
  '새송이버섯', '팽이버섯', '느타리버섯', '양송이버섯', '톳', '매생이',
  '다시마', '멸치육수', '새우젓', '멸치젓', '무청(시래기)', '건표고버섯', '목이버섯(불린 것)',
  '미역(불린 것)',
  /*
   * 삶기만 한 콩류 — 그 자체로 먹지 않는다.
   *
   * "잡곡밥 + 팥(삶은 것)" 이 아침으로, "검은콩(삶은 것) + 보리밥" 이 점심으로 나갔다.
   * 한국 사람은 삶은 팥을 그냥 떠먹지 않는다. 콩자반이 되거나, 팥죽이 되거나,
   * 밥에 섞여 잡곡밥이 된다. 셋 다 이미 따로 있는 음식이다.
   *
   * '반찬이 아니다' 로는 모자랐다 — 반찬이 아니어도 곁들임으로는 나갔기 때문이다.
   * 애초에 메뉴로 내놓지 않는다. 담으시면 그것으로 만드는 요리를 일러 드린다.
   */
  '대두(삶은 것)', '검은콩(삶은 것)', '팥(삶은 것)', '병아리콩(삶은 것)', '렌틸콩(삶은 것)',
  /* 삶은 면은 사리다. 국수·비빔국수가 되어야 한 그릇이 된다 */
  '메밀국수(삶은 것)', '우동면(삶은 것)', '당면(삶은 것)', '쌀국수(삶은 것)',
  /* 불리거나 삶아 두었을 뿐, 무치거나 볶아야 반찬이 된다 */
  '고사리(불린 것)', '죽순(삶은 것)', '시금치(데친 것)',
  /*
   * 향을 내는 과일 — 그대로 먹지 않는다.
   * 실제로 "꽃게(찐 것) + 오리고기(구이) + 찹쌀밥 + 레몬" 이 점심으로 나갔다.
   * 레몬 한 개를 점심에 드시는 분은 없다.
   */
  '레몬', '라임', '유자(청)',
  /*
   * 고등어통조림 — 한국에서는 재료다.
   *
   * 그대로 상에 올리는 경우보다 시래기와 지지거나 무를 깔고 조리는 쪽이 훨씬 흔하다.
   * 그런데 자주 추천되는 자리에 올라 있었다. 그 요리들을 자료에 넣고, 통조림은 재료로 옮긴다.
   */
  '고등어통조림',
  /*
   * 순두부 — 그대로 떠먹기보다 찌개로 끓인다.
   * 단독 메뉴로 오르고 있었는데, 한국에서 그것은 순두부찌개의 재료다.
   */
  '순두부',
  /*
   * 두부(부침용) — 이름이 곧 "부쳐 드시라" 는 말이다.
   *
   * 그대로 상에 올라 스무여드레 중 열 번 추천되었다. 되풀이를 엿새 막아 두었는데도
   * 그랬던 것은, 회전이 새어서가 아니라 애초에 나오지 말아야 할 것이 나오고 있었기 때문이다.
   * 부침용 두부 한 모를 그대로 드시지는 않는다 — 부치거나, 조리거나, 찌개에 넣는다.
   *
   * 두부피(유바)도 마찬가지다. 한국에서는 불려서 무치거나 국에 넣는 재료다.
   */
  '두부(부침용)',
  '두부피(유바)'
])

export function isIngredientOnly(f: Food): boolean {
  /* 국물·양념으로 들어가는 것 */
  if (FOR_FLAVOUR.has(f.name)) return true
  /* 채소·버섯은 익히거나 무쳤거나, 날로 먹는 것만 상에 오른다 */
  if (f.group === '채소' || f.group === '해조·버섯') {
    /* '(생)' 이 붙었으면 아직 손질 전이다 — 콩나물(생)은 데쳐야 나물이 된다 */
    if (/\((생것|생|말린 것)\)$/.test(f.name)) return true
    if (EATEN_RAW.has(f.name)) return false
    if (COOKED_OR_PICKLED.test(f.name)) return false
    return true
  }
  /* 기름과 당류, 조미료는 그 자체로 먹지 않는다 */
  if (f.group === '유지·당류') return true
  if (SEASONING.test(f.name)) return true
  /* 아직 손질 전이거나 가루·건면인 것 */
  if (RAW_MARK.test(f.name)) return true
  /*
   * '불린 것' 은 이미 손질을 마친 상태다 — 고사리나물은 그대로 상에 오른다.
   * 반면 '생것' 과 '말린 것' 은 아직 요리 전이다.
   */
  if (/\((생것|말린 것|생)\)$/.test(f.name)) return true
  /* 굽거나 삶기 전의 고기 */
  if (RAW_PROTEIN_GROUPS.has(f.group) && f.form === 'ingredient' && !COOKED_MARK.test(f.name)) {
    /* 달걀·치즈처럼 그대로 먹는 것은 예외 — 이름에 조리가 없어도 상에 오른다 */
    if (!/달걀|계란|메추리알/.test(f.name)) return true
  }
  /* 국물이나 조림에 넣는 수산물 */
  if (SEAFOOD_STOCK.test(f.name)) return true
  /* 우유·유제품 중 조리에 쓰는 것 */
  if (/^(생크림|탈지분유|크림치즈)$/.test(f.name)) return true
  /* 고명·요리에 쓰는 것 — 참깨 한 접시를 드시지는 않는다 */
  if (/^(참깨|들깨|달걀흰자)$/.test(f.name)) return true
  return false
}

/* ────────────────── 상에서 맡는 자리 ────────────────── */

/**
 * 한 상에서 이것이 맡는 자리.
 *
 * 이 앱은 여태 영양소만 맞추고 상차림은 보지 않았다. 그래서 아침에 흑미밥 한 공기만
 * 올라가거나, 저녁이 찹쌀밥과 복숭아 두 가지로 끝나는 일이 생겼다.
 * 열량과 단백질은 맞았지만 그건 밥상이 아니다.
 *
 * 한국 상차림은 밥·국·반찬이 한 벌이다. 밥은 혼자 서지 못하고 반드시 무언가와
 * 함께 오르며, 과일은 후식이지 반찬이 아니다.
 * 그 관계를 알려면 음식마다 '어느 자리에 놓이는가' 를 알아야 한다.
 *
 *  · staple  주식 — 밥·면. 혼자서는 한 끼가 되지 않는다
 *  · onedish  한 그릇 — 죽·국수·비빔밥처럼 그것만으로 한 끼가 되는 것
 *  · soup    국·탕·찌개
 *  · main    주찬 — 고기·생선·두부·달걀
 *  · side    부찬 — 나물·김치·해조·버섯
 *  · dessert 후식 — 과일·유제품·견과·음료. 끼니를 이루는 자리가 아니다
 *  · supp    보충 — 경장영양·단백질분말
 */
export type MealRole = 'staple' | 'onedish' | 'soup' | 'main' | 'side' | 'dessert' | 'supp'

const ONE_DISH = /죽$|미음|국수|냉면|비빔밥|덮밥|볶음밥|김밥|우동|라면|파스타|리소토|쌈밥|카레|짜장|짬뽕|초밥|백반|정식/

/** 이름이 이렇게 끝나면 국물 요리다 */
const SOUPY = /(국|탕|찌개|전골|수프|스프)$/

/*
 * 밥 노릇을 하는 빵.
 *
 * 이름으로 가르려 했더니 '마늘빵'·'단팥빵'·'도넛' 까지 주식이 되어 버렸다.
 * 한 끼의 바탕이 되는 것만 손으로 적는다 — 나머지는 후식이다.
 */
const BREAD_STAPLE = new Set([
  '식빵', '통밀식빵', '바게트', '모닝빵', '베이글', '사워도우', '토르티야(밀)', '크루아상'
])

export function mealRole(f: Food): MealRole {
  switch (f.group) {
    case '경장영양·환자식':
      return 'supp'
    case '국·탕·찌개':
      return 'soup'
    case '육류': case '가금류·난류': case '어패류':
      return 'main'
    case '두류·대두가공':
      /* 두유·두유라떼는 마시는 것이라 반찬이 아니다 — 두부·콩자반은 주찬이다 */
      return /두유|음료|라떼/.test(f.name) ? 'dessert' : 'main'
    case '채소': case '해조·버섯': case '반찬·조림·볶음':
      return 'side'
    case '간식·디저트':
      /* 빵집 빵 중에도 끼니가 되는 것이 있다 — 베이글 한 개는 아침 한 끼다 */
      return BREAD_STAPLE.has(f.name) ? 'staple' : 'dessert'
    case '과일': case '우유·유제품': case '견과·종실': case '음료':
      return 'dessert'
    case '밥·면·죽 요리':
      /* 죽 한 그릇, 국수 한 그릇은 그것만으로 한 끼다 */
      return ONE_DISH.test(f.name) ? 'onedish' : 'staple'
    case '외식·프랜차이즈':
      /*
       * 사 먹는 것은 대개 이미 차려진 한 끼이거나 한 접시다.
       * 보쌈을 '주식' 으로 두었더니 밥 자리를 차지하고도 반찬이 없어
       * '보쌈 + 수박' 이 한 끼로 나갔다. 밥이 아니면 주찬으로 본다.
       */
      if (ONE_DISH.test(f.name)) return 'onedish'
      if (/밥$|공기밥/.test(f.name)) return 'staple'
      /*
       * 국물 요리는 갈래가 어디에 적혀 있든 국이다.
       *
       * 미소국·단호박 수프·크림 스프가 '외식·프랜차이즈' 로 묶여 있어 주찬으로 잡혔다.
       * 그래서 양식을 고르신 분께는 국이 한 가지도 없었고, 두 그릇이 한 상에 오르는 것도
       * 막히지 않았다 — 국이 아닌 것으로 보였으니까.
       */
      if (SOUPY.test(f.name)) return 'soup'
      return 'main'
    case '곡류·전분':
      /*
       * 밥과 빵은 주식, 감자·고구마·옥수수는 곁들이로 본다.
       *
       * 빵을 곁들임으로 두었더니 '식빵 + 계란말이' 가 주식 없는 상으로 잡혔다.
       * 빵은 그 자리에서 밥 노릇을 한다 — 서양식 아침의 주식이다.
       * 다만 스콘·머핀·도넛처럼 후식 쪽인 것은 아래 간식·디저트에서 따로 본다.
       */
      if (/밥/.test(f.name)) return 'staple'
      if (ONE_DISH.test(f.name)) return 'onedish'
      return BREAD_STAPLE.has(f.name) ? 'staple' : 'side'
    default:
      return 'side'
  }
}

/*
 * 조리된 반찬인가, 그냥 곁들이는 것인가.
 *
 * 역할(mealRole)만으로는 모자랐다. 삶은 콩과 찐 고구마와 생토마토가
 * 전부 main·side 로 잡히는 바람에 "쌀밥 + 옥수수 + 복숭아" 나
 * "현미밥 + 대두(삶은 것)" 가 한 끼로 통과했다. 한국 사람은 그렇게 먹지 않는다.
 *
 * 밥상을 이루는 것은 국이거나 조리된 반찬이다.
 * 삶은 콩·찐 고구마·옥수수·생채소는 곁들여 놓을 수는 있어도
 * 그것만으로 밥상을 세우지는 못한다.
 */
const COOKED_DISH = /찌개|국$|탕$|전골|나물|무침|볶음|조림|찜|구이|전$|튀김|김치|장아찌|쌈|절임|자반|강정|산적|불고기|수육|편육|숙회|회$|샐러드/

/** 그냥 익히기만 한 단품 — 곁들임이지 반찬이 아니다 */
const PLAIN_ITEM = /\((삶은 것|찐 것|생것|데친 것|구운 것|불린 것)\)$/

export function isAnchorDish(f: Food): boolean {
  const r = mealRole(f)
  if (r === 'soup') return true                       // 국·탕·찌개는 그 자체로 상을 세운다
  if (r === 'dessert' || r === 'supp' || r === 'staple' || r === 'onedish') return false

  if (COOKED_DISH.test(f.name)) return true           // 이름이 조리를 말하면 반찬이다
  if (f.group === '반찬·조림·볶음') return true

  /*
   * 고기·생선·달걀·두부는 조리 표시가 없어도 주찬으로 본다 —
   * '닭가슴살(삶은 것)' 은 한 접시가 되지만 '대두(삶은 것)' 은 그렇지 않다.
   * 다만 그중에서도 그냥 익히기만 한 콩류는 곁들임으로 남긴다.
   */
  if (f.group === '육류' || f.group === '가금류·난류' || f.group === '어패류') return true
  if (f.group === '외식·프랜차이즈') return true          // 사 먹는 것은 이미 차려진 한 접시다
  if (f.group === '두류·대두가공') return !PLAIN_ITEM.test(f.name)

  return false                                        // 채소·해조·곡류 단품은 곁들임
}

/**
 * 이만하면 한 끼로 볼 수 있는가.
 *
 * 밥만 있으면 아니다. 밥에는 국이든 조리된 반찬이든 하나는 붙어야 상이 된다.
 * 옥수수나 삶은 콩을 곁들인 것은 상이 아니라 밥에 무언가를 얹은 것이다.
 * 죽이나 국수 한 그릇은 그것만으로 한 끼다 — 죽상에 반찬을 요구할 일은 아니다.
 * 과일은 몇 가지가 오르든 끼니를 이루지 못한다. 후식이기 때문이다.
 */
export function mealIsComplete(foods: Food[]): boolean {
  if (foods.length === 0) return true // 비어 있는 끼니는 여기서 따질 일이 아니다
  const roles = foods.map(mealRole)
  if (roles.includes('onedish')) return true

  /*
   * 반찬은 곁들임이다 — 혼자 서지 못한다.
   *
   * '고구마(찐 것) + 단감 + 취나물' 이 아침으로 나갔다.
   * 고구마는 혼자 드실 수 있고 단감은 후식이 되지만, 취나물을 그것만 드시지는 않는다.
   * 나물·무침·조림·국은 밥에 곁들이는 것이라, 밥(또는 빵·죽·면)이 없으면 상이 아니다.
   */
  if (!roles.includes('staple')) return false

  return foods.some(isAnchorDish)
}
