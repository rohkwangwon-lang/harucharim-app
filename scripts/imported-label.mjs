/**
 * 수입 건강기능식품 표시 문구를 읽는 규칙. 파일을 건드리지 않아 검사에서 그대로 부른다.
 */

/** 공장에 들어가는 원료 */
export const isRawMaterial = (label, item) =>
  /건강기능식품\s*원료|제조\s*(용|원료)|가공\s*원료/.test(label) || /외화획득/.test(item)
/** '1일 1회', '1회 2캡슐' 처럼 먹는 횟수나 양을 말하는 표현 */
const INTAKE = /(1\s*일|하루|1\s*회|일\s*\d\s*회)[^\n\r]{0,24}?\d*\s*(회|정|캡슐|포|병|알|스틱|티스푼|스푼|스쿱|소프트젤|젤리|앰플|분사|방울|ml|mL|g)/
/** 양을 말하지만 먹는 방법이 아닌 줄 — '1일 섭취량 당 아연 15mg' 따위 */
const NOT_INTAKE = /함량|함유|영양|열량|섭취량\s*당|섭취량당|원료명|원재료|주의|총\s*\d+\s*일분|제품명|\d\s*m$/

const lines = (s) => s.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean)

const tidyIntake = (s) => {
  const t = s.replace(/\s+/g, ' ').replace(/^[*·\-\s]+/, '').trim()
  const sentence = t.match(/^.+?(?:십시오|세요|합니다)\.?/)?.[0] ?? t
  return sentence.length > 70 ? `${sentence.slice(0, 70)}…` : sentence
}

/** 섭취 방법 한 줄. 또렷한 것만 — 어중간하면 그 제품을 넣지 않는다 */
export function intakeOf(label) {
  const all = lines(label)
  const usable = (b) => b && INTAKE.test(b) && !NOT_INTAKE.test(b)
  for (const l of all) {
    const b = l.match(/섭취\s*방법[^:：]{0,24}[:：]\s*(.+)$/)?.[1]
    if (usable(b)) return tidyIntake(b)
  }
  for (const l of all) {
    const b = l.match(/섭취\s*(?:량|법)[^:：]{0,24}[:：]\s*(.+)$/)?.[1]
    if (usable(b)) return tidyIntake(b)
  }
  for (const l of all) {
    if (/섭취|드십시오|드세요|복용|음용|분사|1\s*회\s*\d/.test(l) && usable(l)) return tidyIntake(l)
  }
  return ''
}

/**
 * 표시된 기능성 문구와, 제품 유형으로 밝힌 기능성 원료.
 *
 * 원료명 줄은 버린다 — 부형제가 판정을 흐린다.
 * 처음엔 '에 필요' 만 찾아 '보호하는데 필요' 를 놓쳤고, 비타민 E 1,149개 가운데 1,081개를 읽지 못했다.
 * 주의 쪽을 놓치는 일이니 줄을 넓게 받고 길이도 넉넉히 둔다.
 */
export function functionOf(label) {
  const out = []
  for (const l of lines(label)) {
    if (/원료명|원재료|스테아린|이산화규소|셀룰로|주의|보관|질병의\s*예방|인체에\s*유용/.test(l)) continue
    if (/도움을\s*줄?\s*수?\s*있|도움을\s*줌|필요/.test(l) || /제품\s*유형|보충용\s*제품|함유\s*(제품|건강기능식품)|주표시면|건강기능식품\s*[(\[]|제품명[^:：]*[:：].*[(\[]/.test(l)) out.push(l)
  }
  return out.join(' ').replace(/영양[·ㆍ.,\s]*기능\s*정보\s*[:：]?/g, '').replace(/\s+/g, ' ').trim()
}
