import type { Food, FoodGroup } from '../types'
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
import { CUISINE_MAP, SEASON_MAP } from './seasonCuisine'
import { GENERATED_CORE } from './generated'

/** 손으로 검토해 태그를 붙인 식품. 검색에서 먼저 보여 준다. */
export const CURATED_FOODS: Food[] = [
  ...grains, ...legumes, ...nuts, ...vegetables, ...seaweedMushroom, ...fruits,
  ...meat, ...poultryEgg, ...seafood, ...dairy, ...fatsSugar,
  ...soups, ...sidedish, ...riceNoodle, ...eatout,
  ...beverages, ...snacks, ...processed, ...clinical,
  ...vegetables2, ...fruits2, ...dishes2, ...misc2, ...western,
  ...ramyeon, ...gimbap
].map((f) => ({
  // 제철·요리 계통은 seasonCuisine.ts 한 곳에서 관리하고 여기서 붙인다
  ...f,
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
  '미역(불린 것)'
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
    case '과일': case '우유·유제품': case '견과·종실': case '음료': case '간식·디저트':
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
      return ONE_DISH.test(f.name) ? 'onedish' : /밥$|공기밥/.test(f.name) ? 'staple' : 'main'
    case '곡류·전분':
      /* 밥은 주식, 감자·고구마·빵은 곁들이로 본다 */
      return /밥/.test(f.name) ? 'staple' : ONE_DISH.test(f.name) ? 'onedish' : 'side'
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
  return foods.some(isAnchorDish)
}
