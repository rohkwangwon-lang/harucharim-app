import type { Cuisine, Season } from '../types'

/**
 * 제철·요리 계통 부가 정보.
 *
 * 식품 파일마다 흩어 놓으면 계절이 바뀔 때 손볼 곳이 여러 군데가 된다.
 * 여기 한 곳에 모아 두고 index.ts 에서 병합한다.
 * 여기 없는 식품은 '연중' · '한식' 으로 본다.
 */

/** 제철이 뚜렷한 식재료 */
export const SEASON_MAP: Record<string, Season[]> = {
  // 봄
  'mugwort': ['봄'], 'shepherd-purse': ['봄'], 'water-parsley': ['봄'], 'bamboo-shoot': ['봄'],
  'crown-daisy': ['봄'], 'aster': ['봄'], 'chive': ['봄', '여름'], 'strawberry': ['봄'],
  'clam': ['봄'], 'garlic-stem': ['봄', '여름'], 'bracken': ['봄'],

  // 여름
  'cucumber': ['여름'], 'zucchini': ['여름'], 'watermelon': ['여름'], 'melon': ['여름'],
  'peach': ['여름'], 'plum': ['여름'], 'grape': ['여름', '가을'], 'tomato': ['여름'],
  'cherry-tomato': ['여름'], 'eggplant': ['여름'], 'chili-green': ['여름'],
  'green-pepper-sweet': ['여름'], 'perilla-leaf': ['여름'], 'apricot': ['여름'],
  'fig': ['여름', '가을'], 'abalone': ['여름'], 'chicken-samgyetang': ['여름'],

  // 가을
  'apple': ['가을'], 'pear': ['가을'], 'persimmon-sweet': ['가을'], 'persimmon-dried': ['가을', '겨울'],
  'chestnut-boiled': ['가을'], 'ginkgo-nut': ['가을'], 'jujube-dried': ['가을'],
  'sweetpotato-steamed': ['가을'], 'sweetpotato-roasted': ['가을', '겨울'],
  'pumpkin-steamed': ['가을'], 'pumpkin-old': ['가을', '겨울'],
  'mackerel-grilled': ['가을'], 'saury': ['가을'], 'lotus-root': ['가을', '겨울'],
  'burdock': ['가을', '겨울'], 'shiitake': ['가을'], 'crab': ['가을'],

  // 겨울
  'mandarin': ['겨울'], 'orange-hallabong': ['겨울'], 'napa-cabbage': ['겨울'],
  'radish': ['겨울'], 'radish-leaf': ['겨울'], 'oyster-raw': ['겨울'],
  'pollock-fresh': ['겨울'], 'cod': ['겨울'], 'maesaengi': ['겨울'], 'tot': ['겨울'],
  'gim': ['겨울'], 'miyeok-soaked': ['봄', '겨울'], 'spinach-blanched': ['겨울'],
  'mustard-leaf': ['겨울'], 'gat-kimchi': ['겨울'], 'kimchi-baechu': ['겨울'],
  'yam': ['겨울'], 'sea-cucumber': ['겨울'], 'hairtail': ['가을', '겨울'],

  /*
   * 제철 '요리'.
   *
   * 여기까지는 재료에만 제철을 붙여 두었다. 그런데 추천은 요리에서만 고르므로
   * (재료를 끼니로 내놓을 수는 없다) 계절이 결과에 아무 영향을 주지 못했다.
   * 실제로 네 계절 모두 같은 일곱 가지가 나왔다.
   *
   * 그래서 관습적으로 굳어진 제철 요리에 계절을 붙인다.
   * 지어내지 않고, 한국에서 그 계절 음식으로 통하는 것만 적는다.
   */
  // 봄 — 봄나물
  'gosari-namul': ['봄'], 'bean-sprout-mixed': ['봄'],

  // 여름 — 찬 국수와 보양식
  'naengmyeon': ['여름'], 'bibim-naengmyeon': ['여름'], 'kongguksu': ['여름'],
  'makguksu': ['여름'], 'bibim-guksu': ['여름'],
  'samgyetang-soup': ['여름'], 'samgyetang-half': ['여름'],

  // 가을 — 추어탕과 추석
  'chueotang': ['가을'], 'tteok-songpyeon': ['가을'], 'juk-pumpkin': ['가을', '겨울'],

  // 겨울 — 설날과 뜨거운 국물
  'tteokguk': ['겨울'], 'mandu-guk': ['겨울'], 'fishcake': ['겨울'],
  'shabu-shabu': ['겨울'], 'sigeumchi-namul': ['겨울', '봄']
}

/** 한식이 아닌 항목 */
export const CUISINE_MAP: Record<string, Cuisine> = {
  'bread-white': '양식', 'bread-wholewheat': '양식', 'bread-baguette': '양식',
  'bread-croissant': '양식', 'bread-tortilla': '양식', 'bread-cream': '양식',
  'oat-rolled': '양식', 'quinoa-cooked': '양식', 'cereal-corn': '양식',
  'cheese-slice': '양식', 'cheese-mozzarella': '양식', 'cheese-cottage': '양식',
  'cheese-cream': '양식', 'butter': '양식', 'cream-whipping': '양식',
  'yogurt-greek': '양식', 'icecream-vanilla': '양식', 'cake-shortcake': '양식',
  'cookie-butter': '양식', 'pudding': '양식', 'biscuit-plain': '양식',
  'oil-olive': '양식', 'mayonnaise': '양식', 'ketchup': '양식',
  'avocado': '양식', 'blueberry': '양식', 'blackberry': '양식', 'cherry': '양식',
  'asparagus': '양식', 'celery': '양식', 'leek': '양식', 'beet': '양식',
  'cauliflower': '양식', 'kale': '양식', 'bellpepper-red': '양식', 'paprika-yellow': '양식',
  'chickpea-boiled': '양식', 'lentil-boiled': '양식', 'flaxseed': '양식',
  'almond': '양식', 'cashew': '양식', 'pumpkin-seed': '양식',
  'salmon': '양식', 'salmon-sashimi': '일식', 'sardine-canned': '양식',
  'turkey-breast': '양식', 'lamb': '양식',
  'pizza-cheese': '양식', 'hamburger': '양식', 'french-fries': '양식',
  'salad-chicken': '양식', 'protein-bar': '양식', 'nut-bar': '양식',
  'latte': '양식', 'coffee-americano': '양식', 'decaf-coffee': '양식',
  'wine-red': '양식', 'beer': '양식', 'orange-juice': '양식', 'grapefruit-juice': '양식',
  'noodle-udon-cooked': '일식', 'udon-dish': '일식', 'noodle-buckwheat-cooked': '일식',
  'sushi-set': '일식', 'natto': '일식', 'yuba': '일식', 'donkatsu': '일식',
  'eel-grilled': '일식', 'yubu-chobap': '일식',
  'jjajangmyeon': '중식', 'jjamppong': '중식', 'mandu-steamed': '중식',
  'noodle-glass': '중식', 'wood-ear': '중식', 'bamboo-shoot': '중식',
  'noodle-rice': '동남아', 'pho': '동남아', 'mango': '동남아', 'papaya': '동남아',
  'dragonfruit': '동남아', 'pineapple': '동남아',
  'water': '무관', 'milk-whole': '무관', 'milk-lowfat': '무관', 'milk-lactose-free': '무관',
  'egg-boiled': '무관', 'egg-steamed': '무관', 'chicken-breast': '무관',
  'ons-standard': '무관', 'ons-highcal': '무관', 'ons-diabetic': '무관', 'ons-renal': '무관',
  'protein-powder-wpi': '무관', 'thickener': '무관', 'bcaa-supplement': '무관',
  'protein-shake': '무관', 'ors': '무관', 'sports-drink': '무관'
}
