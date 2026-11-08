# -*- coding: utf-8 -*-
"""환자·가족용 홍보 페이지 「가려 드시기 전에」(웹 + A4 인쇄 겸용 HTML 한 장)를 만든다.

흐름(선생님 지시 2026-11-09): 1 진료 시간에 다 듣기 어려웠던 이야기 → 2 주위에서 전해 들은 이야기
→ 3 그로 인한 영양 부족(근거) → 4 식재료 자료 → 5 근거로 차리는 한 상.

- 논문 수치는 docs/근거/2026-11-09-식이제한-영양부족-근거검토.md 에서 PubMed 초록과 대조한 것만 쓴다.
- 앱 숫자는 docs/보고서/numbers.json 에서만 읽는다(앱 자료에서 셈).
- 콩·생채소 문장은 앱 판정 문장과 같게 둔다(src/data/cancers/breast.ts · commonRules.ts).
- 피할 표현은 docs/홍보/게시물-문구.md 0절: '진료실에서 알려주지 않는' · 효능 표현 · 무료 약속 금지.

    python3 scripts/promo/build-story.py
    node scripts/promo/print-reports.mjs docs/홍보/가려-드시기-전에 가려-드시기-전에.html
"""
import base64, io, json, os
from PIL import Image

N = json.load(open('docs/보고서/numbers.json', encoding='utf8'))
OUT = 'docs/홍보/가려-드시기-전에'
os.makedirs(OUT, exist_ok=True)
f = lambda v: f'{v:,}'


def shot(name, top, bottom, width=520):
    im = Image.open(f'docs/출시/스크린샷/{name}').convert('RGB')
    w, h = im.size
    im = im.crop((int(w * .14), top, int(w * .86), bottom))
    im = im.resize((width, int(im.height * width / im.width)))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=82, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


# 기록 화면: 한 주 평균과 '부족' 카드 / 추천 화면: 근거 등급이 붙은 반찬
DIARY = shot('5-diary.png', 980, 1900)
WHY = shot('2-why.png', 1820, 2240)

# ── 근거 목록. 본문 [n] 은 이 순서를 따른다 ──────────────────────────
REFS = [
    ('Muscaritoli M, et al. Prevalence of malnutrition in patients at first medical oncology visit: the PreMiO study. Oncotarget. 2017;8:79884-96.', '29108370', '10.18632/oncotarget.20168'),
    ('Lacau St Guily J, et al. NutriCancer: malnutrition in elderly patients with cancer. J Geriatr Oncol. 2018;9:74-80.', '28888553', '10.1016/j.jgo.2017.08.003'),
    ('Cederholm T, et al. GLIM criteria for the diagnosis of malnutrition. J Cachexia Sarcopenia Muscle. 2019;10:207-17.', '30920778', '10.1002/jcsm.12383'),
    ('Muscaritoli M, et al. ESPEN practical guideline: Clinical Nutrition in cancer. Clin Nutr. 2021;40:2898-913.', '33946039', '10.1016/j.clnu.2021.02.005'),
    ('Kim JS, et al. Complementary and alternative medicine among patients with cancer in Korea (KCSG PC21-20). Cancer Res Treat. 2023;55:442-51.', '36596728', '10.4143/crt.2022.1483'),
    ('Johnson SB, et al. Cancer misinformation and harmful information on Facebook and other social media. J Natl Cancer Inst. 2022;114:1036-9.', '34291289', '10.1093/jnci/djab141'),
    ('Yung TKC, et al. Protein food avoidance behaviour among cancer patients. Asia Pac J Clin Nutr. 2022;31:191-200.', '35766554', '10.6133/apjcn.202206_31(2).0004'),
    ('Rinninella E, et al. The facts about food after cancer diagnosis: a systematic review of prospective cohort studies. Nutrients. 2020;12:2345.', '32764484', '10.3390/nu12082345'),
    ('Nechuta SJ, et al. Soy food intake after diagnosis of breast cancer and survival. Am J Clin Nutr. 2012;96:123-32.', '22648714', '10.3945/ajcn.112.035972'),
    ('Ma Y, et al. Neutropenic diet cannot reduce the risk of infection and mortality in oncology patients with neutropenia. Front Oncol. 2022;12:836371.', '35356218', '10.3389/fonc.2022.836371'),
    ('Fuchs MA, et al. Sugar-sweetened beverage intake and cancer recurrence and survival in CALGB 89803. PLoS One. 2014;9:e99816.', '24937507', '10.1371/journal.pone.0099816'),
    ('Fassier P, et al. Fasting and weight-loss restrictive diet practices among 2,700 cancer survivors (NutriNet-Santé). Int J Cancer. 2018;143:2687-97.', '29971783', '10.1002/ijc.31646'),
    ('de Groot S, et al. Fasting mimicking diet as an adjunct to neoadjuvant chemotherapy for breast cancer (DIRECT). Nat Commun. 2020;11:3083.', '32576828', '10.1038/s41467-020-16138-3'),
    ('Ju DL, et al. Dietary evaluation of a low-iodine diet in Korean thyroid cancer patients. Nutr Res Pract. 2016;10:167-74.', '27087900', '10.4162/nrp.2016.10.2.167'),
    ('Langius JAE, et al. Critical weight loss is a major prognostic indicator for disease-specific survival in head and neck cancer receiving radiotherapy. Br J Cancer. 2013;109:1093-9.', '23928661', '10.1038/bjc.2013.458'),
    ('Andreyev HJ, et al. Why do patients with weight loss have a worse outcome when undergoing chemotherapy for gastrointestinal malignancies? Eur J Cancer. 1998;34:503-9.', '9713300', '10.1016/s0959-8049(97)10090-9'),
    ('Martin L, et al. Diagnostic criteria for the classification of cancer-associated weight loss. J Clin Oncol. 2015;33:90-9.', '25422490', '10.1200/JCO.2014.56.1894'),
    ('Shachar SS, et al. Prognostic value of sarcopenia in adults with solid tumours: a meta-analysis. Eur J Cancer. 2016;57:58-67.', '26882087', '10.1016/j.ejca.2015.12.030'),
    ('Baldwin C, et al. Oral nutritional interventions in malnourished patients with cancer: a systematic review and meta-analysis. J Natl Cancer Inst. 2012;104:371-85.', '22345712', '10.1093/jnci/djr556'),
]


def r(*ns):
    return '<sup class="ref">' + ','.join(str(n) for n in ns) + '</sup>'


def stat(num, unit, body, refs):
    return f'<div class="stat"><p class="sn"><b>{num}</b><i>{unit}</i></p><p class="sb">{body}{r(*refs)}</p></div>'


def myth(heard, answer, detail, refs):
    return (f'<article class="myth"><p class="heard">{heard}</p><p class="answer">{answer}</p>'
            f'<p class="detail">{detail}{r(*refs)}</p></article>')


# ── 3장 도표: 방사선치료 전 체중 감소별 5년 생존율(두경부암 1,340명) ─────────
LANGIUS = [('줄지 않음', 71), ('5 % 이하', 59), ('5~10 %', 47), ('10 % 넘게', 42)]
chart = ''.join(
    f'<li><span class="bl">{lab}</span><span class="bt"><span class="bf" style="width:{v}%"></span></span><b>{v}%</b></li>'
    for lab, v in LANGIUS)

EX = N['examples']
LV = {'avoid': ('피하세요', 'lv-avoid'), 'caution': ('주의', 'lv-care'), 'prefer': ('권함', 'lv-ok')}
examples = ''.join(
    f'<li><b class="ef">{e["food"]}</b>'
    f'<span class="ew">{e["a"]["who"]}</span><span class="lv {LV[e["a"]["level"]][1]}">{LV[e["a"]["level"]][0]}</span>'
    f'<span class="ew">{e["b"]["who"]}</span><span class="lv {LV[e["b"]["level"]][1]}">{LV[e["b"]["level"]][0]}</span></li>'
    for e in EX)

DATA = [
    (f(N['foods']), '음식·식품', f"기본 음식 {f(N['foodsCore'])} + 시판 가공식품 {f(N['foodsExt'])}. 영양성분은 국가표준식품성분표와 제품 표시값"),
    (f(N['supps']), '건강기능식품', f"국내 {f(N['suppsDom'])} + 수입 {f(N['suppsImp'])}. 원료마다 암 종류·복용약에 따라 따로 판단"),
    (f(N['medicines']), '의약품 이름', '영양제로 착각하기 쉬운 의약품은 판정하지 않고 "의약품입니다"라고 알려 드림'),
    (str(N['total']), '판단 규칙', f"음식 {N['rules']} + 약물–음식 상호작용 {N['interactions']}. 규칙마다 근거 등급"),
    (str(N['references']), '참고 문헌', '요약이 아니라 원문을 받아 앱 문장과 한 줄씩 대조'),
    (f(N['allergenMap']), '알레르기 원재료', f"알레르기 {N['allergens']}종을 원재료 표시와 대조"),
]
data = ''.join(f'<li><b>{a}</b><h3>{b}</h3><p>{c}</p></li>' for a, b, c in DATA)

FEATURES = [
    ('체중에 맞춘 하루 목표', '키·체중·치료 시기로 하루 열량과 단백질 목표를 셈합니다. 단백질은 체중 1 kg당 1~1.5 g을 기준으로 잡습니다.', (4,)),
    ('체중이 줄면, 먼저 채웁니다', '6개월 안에 5 % 넘게 줄면 알려 드립니다. 입안이 헐거나 설사·메스꺼움 때문에 \'피하세요\'로 두었던 음식 일부는 \'주의\'로 낮춥니다. 지금은 드실 수 있는 것을 드셔서 열량과 단백질을 채우는 것이 먼저이기 때문입니다.', (3, 4)),
    ('모자란 날을 짚어 드립니다', '하루치 평균만 보지 않고, 일주일 가운데 며칠이나 열량·단백질이 모자랐는지 함께 보여 드립니다.', ()),
    ('왜 권하는지까지', '반찬마다 근거 등급(A·B·C·G)과 출처가 붙습니다. 근거가 없는 것은 "아직 모릅니다"라고 적습니다.', ()),
]
feats = ''.join(f'<li><h3>{a}</h3><p>{b}{r(*c) if c else ""}</p></li>' for a, b, c in FEATURES)

refs = ''.join(
    f'<li>{c}' + (f' PMID {p}.' if p else '') + (f' <a href="https://doi.org/{d}">doi:{d}</a>' if d else '') + '</li>'
    for c, p, d in REFS)

TITLE = '가려 드시기 전에'
DESC = '암 치료 중 음식을 가리다 생기는 영양 부족과 그 근거, 하루차림이 근거로 차리는 한 상을 정리했습니다.'
SEAL = '20년 넘게 암 환자를 치료해 온 방사선종양학과 전문의가 내용을 감수했습니다.'
LEGAL = ('하루차림은 의료기기가 아니며 진단·치료를 목적으로 하지 않습니다. 이 페이지는 일반 정보이며, '
         '개인의 치료와 식사는 담당 의료진과 정하십시오. 만 14세 이상 이용할 수 있습니다.')

CSS = r"""
:root{
  --paper:#f2f0e8; --sheet:#faf9f4; --ink:#282621; --soft:#4f4b40; --line:#e2dfd3;
  --rice:#4b6936; --rice-tint:#e6ecdb; --soy:#875326; --soy-tint:#f4e5d2;
  --plum:#7a3b45; --plum-tint:#f3e3e3; --mist:#5e6b78; --bar:#c9d5b8;
  --display:"Gowun Batang","AppleMyungjo","Nanum Myeongjo",serif;
  --body:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#1e1d19; --sheet:#282621; --ink:#ece9df; --soft:#c4bfb1; --line:#3d3a33;
  --rice:#a8bf90; --rice-tint:#2f3a27; --soy:#d5a875; --soy-tint:#3e3021;
  --plum:#e0a3ab; --plum-tint:#3e2a2d; --mist:#a9b6c2; --bar:#56693f; color-scheme:dark}}
:root[data-theme="dark"]{
  --paper:#1e1d19; --sheet:#282621; --ink:#ece9df; --soft:#c4bfb1; --line:#3d3a33;
  --rice:#a8bf90; --rice-tint:#2f3a27; --soy:#d5a875; --soy-tint:#3e3021;
  --plum:#e0a3ab; --plum-tint:#3e2a2d; --mist:#a9b6c2; --bar:#56693f; color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:19px;line-height:1.75;
  letter-spacing:-.01em;word-break:keep-all;overflow-wrap:break-word}
.wrap{max-width:740px;margin:0 auto;padding:52px 20px 72px}
h1,h2,h3{font-family:var(--display);line-height:1.3;text-wrap:balance;margin:0}
p{margin:0}
.brand{font-size:15px;font-weight:700;color:var(--rice);letter-spacing:.06em}
.hero{display:grid;gap:22px;padding-bottom:36px}
.hero h1{font-size:clamp(40px,9vw,64px);font-weight:700}
.kick{font-size:17px;color:var(--soy);font-weight:500}
.lede{font-size:21px;color:var(--soft);max-width:31em}
.lede strong{color:var(--ink)}
.seal{font-size:16px;color:var(--rice);font-weight:500;padding-left:12px;border-left:3px solid var(--bar)}
.flow{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:0;border-top:1px solid var(--line)}
.flow li{display:grid;grid-template-columns:36px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:17px}
.flow a{color:var(--ink);text-decoration:none}.flow a:hover{color:var(--rice)}
.flow a:focus-visible,.cta a:focus-visible{outline:3px solid var(--soy);outline-offset:3px;border-radius:4px}
.flow span{font-family:var(--display);color:var(--rice);font-weight:700;font-size:20px;line-height:1.5}
.ch{padding:56px 0 8px;border-top:2px solid var(--ink);margin-top:40px;display:grid;gap:22px}
.chn{display:flex;align-items:baseline;gap:14px;color:var(--rice)}
.chn b{font-family:var(--display);font-size:54px;line-height:.9}
.chn span{font-size:16px;font-weight:700;letter-spacing:.03em}
.ch h2{font-size:clamp(28px,5.4vw,38px);font-weight:700}
.ch>p{max-width:34em}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:22px 28px;padding:6px 0}
.stat{display:grid;gap:6px;align-content:start}
.sn b{font-family:var(--display);font-size:46px;line-height:1;color:var(--soy);font-variant-numeric:tabular-nums}
.sn i{font-style:normal;color:var(--soy);font-size:20px;margin-left:3px;font-weight:700}
.sb{font-size:16px;color:var(--soft);line-height:1.6}
.ref{font-size:.68em;color:var(--mist);margin-left:2px;font-weight:500}
.keys{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.keys li{background:var(--sheet);border:1px solid var(--line);border-radius:14px;padding:18px 20px;display:grid;gap:4px}
.keys h3{font-size:21px;color:var(--rice)}
.keys p{font-size:17px;color:var(--ink)}
.myths{display:grid;gap:14px}
.myth{background:var(--sheet);border:1px solid var(--line);border-radius:14px;padding:20px 22px;display:grid;gap:8px}
.heard{font-family:var(--display);font-size:20px;color:var(--soft)}
.answer{font-size:21px;font-weight:700;color:var(--rice);line-height:1.45}
.myth.care .answer{color:var(--soy)}
.detail{font-size:17px}
.chart{background:var(--sheet);border:1px solid var(--line);border-radius:14px;padding:22px}
.chart h3{font-family:var(--body);font-size:18px;font-weight:700}
.chart .cs{font-size:15px;color:var(--soft);margin:4px 0 16px}
.chart ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.chart li{display:grid;grid-template-columns:92px 1fr 48px;align-items:center;gap:12px;font-size:16px}
.bt{height:22px;background:var(--rice-tint);border-radius:4px;overflow:hidden;
  background-image:repeating-linear-gradient(90deg,transparent 0 calc(25% - 1px),var(--line) calc(25% - 1px) 25%)}
.bf{display:block;height:100%;background:var(--rice);border-radius:4px 0 0 4px}
.chart li b{font-variant-numeric:tabular-nums;text-align:right;font-size:17px}
.axis{display:grid;grid-template-columns:92px 1fr 48px;gap:12px;font-size:12px;color:var(--mist);margin-top:4px}
.axis span:nth-child(2){display:flex;justify-content:space-between}
.chart .cn{font-size:15px;color:var(--soft);margin-top:14px}
.honest{background:var(--plum-tint);border-radius:14px;padding:22px 24px;display:grid;gap:10px}
.honest h3{color:var(--plum);font-size:22px}
.honest ul{margin:0;padding-left:1.1em;display:grid;gap:8px;font-size:17px}
.honest strong{color:var(--plum)}
.same{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.same li{display:grid;grid-template-columns:100px 1fr auto 1fr auto;gap:8px 12px;align-items:center;
  background:var(--sheet);border:1px solid var(--line);border-radius:12px;padding:12px 16px;font-size:16px}
.ef{font-family:var(--display);font-size:19px}
.ew{color:var(--soft);text-align:right}
.lv{font-size:14px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap}
.lv-avoid{color:var(--plum);background:var(--plum-tint)}.lv-care{color:var(--soy);background:var(--soy-tint)}.lv-ok{color:var(--rice);background:var(--rice-tint)}
.data{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:22px 28px}
.data li{display:grid;gap:2px;align-content:start;border-top:1px solid var(--line);padding-top:12px}
.data b{font-family:var(--display);font-size:32px;color:var(--rice);font-variant-numeric:tabular-nums;line-height:1.2}
.data h3{font-family:var(--body);font-size:17px}
.data p{font-size:15px;color:var(--soft);line-height:1.55}
.feats{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.feats li{border-left:3px solid var(--rice);padding:2px 0 2px 16px;display:grid;gap:4px}
.feats h3{font-size:21px}
.feats p{font-size:17px}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.shots figure{margin:0;display:grid;gap:8px}
.shots img{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);display:block}
.shots figcaption{font-size:14px;color:var(--soft)}
.cta{background:var(--rice);color:var(--sheet);border-radius:18px;padding:28px;display:grid;gap:12px;margin-top:48px}
.cta h2{font-size:28px;color:var(--sheet)}
.cta p{color:var(--rice-tint);font-size:17px}
.cta a{justify-self:start;background:var(--sheet);color:var(--rice);font-weight:700;text-decoration:none;padding:13px 24px;border-radius:12px;font-size:18px}
.legal{font-size:14px;color:var(--soft);margin-top:24px}
.refs{margin-top:36px;padding-top:20px;border-top:1px solid var(--line)}
.refs h2{font-size:22px;margin-bottom:10px}
.refs p{font-size:14px;color:var(--soft);margin-bottom:10px}
.refs ol{margin:0;padding-left:1.6em;font-size:13px;color:var(--soft);display:grid;gap:4px;line-height:1.5}
.refs a{color:var(--mist);word-break:break-all}
@media (max-width:520px){
  body{font-size:18px}.wrap{padding:36px 16px 56px}.lede{font-size:19px}
  .sn b{font-size:40px}.chart li,.axis{grid-template-columns:78px 1fr 42px}
  .same li{grid-template-columns:1fr auto;}.same .ef{grid-column:1/-1}.same .ew{text-align:left}
  .shots{grid-template-columns:1fr}
}
@media print{
  @page{size:A4;margin:14mm 15mm 16mm}
  :root{--paper:#fff;--sheet:#faf9f4}
  body{font-size:10.5pt;line-height:1.62;background:#fff}
  .wrap{max-width:none;padding:0}
  .hero h1{font-size:34pt}.lede{font-size:12pt}.kick,.seal{font-size:10pt}.flow li{font-size:10pt;padding:5px 0}
  .ch{break-before:page;margin-top:0;padding-top:10px;gap:14px}
  .chn b{font-size:32pt}.ch h2{font-size:21pt}
  .sn b{font-size:26pt}.sb,.keys p,.detail,.feats p,.honest ul,.chart .cn{font-size:9.5pt}
  .keys h3,.feats h3,.honest h3{font-size:12.5pt}.answer{font-size:12pt}.heard{font-size:11pt}
  .myth,.keys li,.chart,.honest,.same li,.feats li,.stat,.data li,.shots figure{break-inside:avoid}
  .myth,.keys li{padding:11px 14px}.chart{padding:14px}
  .data b{font-size:19pt}.data p,.same li,.chart li{font-size:9pt}
  .shots{grid-template-columns:1fr 1fr}.shots img{max-height:105mm;width:auto;max-width:100%}
  .cta{break-inside:avoid;margin-top:20px;padding:16px}.cta a{display:none}
  .refs{break-before:page}.refs ol{font-size:8pt}
  /* 표지는 한 쪽을 다 쓴다 — 제목을 키우고 흐름 목록을 아래로 */
  .hero{min-height:250mm;align-content:start;gap:16px;padding-top:30mm}
  .hero h1{font-size:46pt}.lede{font-size:14pt;max-width:none}.kick{font-size:12pt}.seal{font-size:11pt}
  .flow{margin-top:28mm}.flow li{font-size:12pt;padding:8px 0}.flow span{font-size:14pt}
  /* 한 장에 한 이야기가 들어가게 조인다 */
  .ch{gap:11px}.ch>p{max-width:none}
  .stats{gap:10px 22px;padding:0}.sn b{font-size:22pt}
  .myths,.keys{gap:8px}.myth{padding:9px 13px;gap:4px}.keys li{padding:9px 13px;gap:2px}
  .detail,.sb,.keys p{font-size:9pt;line-height:1.55}
  .chart{padding:12px 14px}.chart .cs{margin:2px 0 8px}.chart ol{gap:6px}.bt{height:14px}
  .honest{padding:12px 16px;gap:6px}.honest ul{gap:4px;font-size:9pt}
  .same li{padding:7px 12px}.data{gap:10px 22px}.data b{font-size:17pt}
  .feats{gap:8px}.shots img{max-height:72mm}.shots figcaption{font-size:8.5pt}
  .cta{padding:12px 16px;gap:6px}.cta h2{font-size:15pt}.cta p{font-size:9.5pt}
  .legal{font-size:8.5pt;margin-top:10px}
}
@media (prefers-reduced-motion:no-preference){.bf{animation:grow .9s ease-out both}@keyframes grow{from{transform:scaleX(.001);transform-origin:left}}}
"""

FONT = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap">')

FLOW = ['진료 시간에 다 듣기 어려웠던 이야기', '주위에서 전해 들은 이야기', '그 사이에 생기는 영양 부족',
        '음식 하나하나를 살핀 자료', '근거로 차리는 한 상']
flow = ''.join(f'<li><span>{i}</span><a href="#c{i}">{t}</a></li>' for i, t in enumerate(FLOW, 1))


def head(i):
    return f'<div class="chn"><b>{i}</b><span>{FLOW[i - 1]}</span></div>'


html = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE}</title><meta name="description" content="{DESC}">
{FONT}<style>{CSS}</style></head>
<body><div class="wrap">
<header class="hero">
  <p class="brand">하루차림</p>
  <p class="kick">암 치료 중 식사 이야기</p>
  <h1>{TITLE}</h1>
  <p class="lede">치료가 시작되면 식탁에서 하나둘 빠지는 음식이 생깁니다. 대부분 걱정과 정성에서 나온 일입니다.
  그런데 그렇게 줄어든 한 숟가락이 쌓이면, <strong>치료를 견딜 힘도 함께 줄어듭니다.</strong>
  연구가 말하는 것과 아직 말하지 않는 것을 나누어 정리했습니다.</p>
  <p class="seal">{SEAL}</p>
  <ol class="flow">{flow}</ol>
</header>
<main>

<section class="ch" id="c1">
  {head(1)}
  <h2>얼마나 드시는지는, 진료실에서 잘 보이지 않습니다</h2>
  <p>진료 시간은 짧고, 그 시간에는 검사 결과와 치료 일정을 먼저 이야기하게 됩니다.
  "무엇을 피해야 하나요?"는 여쭤보셔도, "요즘 하루에 얼마나 드세요?"까지 오가기는 어렵습니다.
  그런데 식사는 치료가 시작되기 전부터 이미 흔들리고 있는 경우가 많습니다.</p>
  <div class="stats">
    {stat('51', '%', '이탈리아 22개 병원에서 처음 항암 진료를 받으러 온 환자 1,952명 가운데, 이미 영양 상태에 문제가 있거나 그 위험이 있던 분의 비율.', (1,))}
    {stat('64', '%', '같은 환자들 가운데 진료 전 6개월 동안 체중이 1~10 kg 줄어 있던 분. 치료를 시작하기도 전입니다.', (1,))}
  </div>
  <p>프랑스 전국 조사에서는 의사들이 환자의 식사량을 실제보다 많게 짐작했고, 나이 드신 환자에서 특히 그랬습니다.{r(2)}
  진료실에서는 잘 드시는 것처럼 보여도, 집 식탁은 다를 수 있다는 뜻입니다.</p>
  <h3 style="font-size:24px">그래서 먼저 말씀드리고 싶은 세 가지</h3>
  <ul class="keys">
    <li><h3>체중은 치료 경과의 일부입니다</h3><p>6개월 안에 체중이 5 % 넘게 줄면(60 kg이면 3 kg) 담당 의료진께 알려야 할 신호입니다. 영양불량을 진단하는 국제 기준이 쓰는 문턱입니다.{r(3)}</p></li>
    <li><h3>단백질은 오히려 더 필요합니다</h3><p>치료 중에는 체중 1 kg당 하루 1~1.5 g을 권합니다. 60 kg이면 60~90 g입니다.{r(4)}</p></li>
    <li><h3>따로 정해 받은 제한이 없다면, 가리기보다 드시는 것이 먼저입니다</h3><p>담당 의료진이 정해 준 식사 제한(저요오드식, 수술 뒤 식사 단계 등)은 꼭 지키시고, 그 밖의 음식은 스스로 끊기 전에 한 번 더 확인해 주세요.</p></li>
  </ul>
</section>

<section class="ch" id="c2">
  {head(2)}
  <h2>걱정에서 나온 말이, 식탁을 좁힙니다</h2>
  <p>먼저 치료받은 친척, 같은 병실 환자분, 인터넷 카페에서 전해 들은 이야기는 대개 정성에서 나옵니다.
  다만 그 말들이 하나둘 겹치면, 드실 수 있는 음식이 생각보다 빠르게 줄어듭니다.</p>
  <div class="stats">
    {stat('78.2', '%', '국내 온라인 암 환우 모임 응답자 221명 가운데 보완·대체요법을 써 본 분. 그중 주치의와 상의한 분은 30.6 %였습니다.', (5,))}
    {stat('32.5', '%', '미국 SNS에서 많이 공유된 암 치료 글 200건 가운데 잘못된 정보가 담긴 글. 해로울 수 있는 글이 반응을 더 많이 받았습니다.', (6,))}
    {stat('86', '%', '홍콩의 암 환자 245명 가운데 음식을 가리는 분. 많이 가릴수록 단백질·아연·철을 적게 드셨습니다.', (7,))}
  </div>
  <p>그 가운데 자주 듣는 이야기 다섯 가지를 원문으로 확인했습니다.</p>
  <div class="myths">
    {myth('"암 환자는 고기를 끊어야 한대요."', '고기·유제품을 통째로 끊을 근거는 없습니다.',
          '진단 뒤 식사를 다룬 전향 연구 29편을 모은 분석은 어떤 식품군도 없앨 필요는 없다고 결론지었습니다. 줄이실 것은 햄·소시지 같은 가공육이고, 단백질은 오히려 넉넉히 드셔야 합니다.', (8, 4))}
    {myth('"유방암이면 두부·된장·두유를 끊어야 한대요."', '끊지 않으셔도 됩니다.',
          '유방암 환자 9,514명 연구에서 콩 이소플라본을 하루 10 mg 이상 드신 분들의 재발이 25 % 낮았습니다. 농축 보충제는 따로 봅니다.', (9,))}
    {myth('"항암 중에는 생과일·생채소를 먹으면 안 된대요."', '잘 씻어 드시면 됩니다. 새싹채소만은 익혀 드세요.',
          '가려 먹는 식단이 감염을 줄인다는 근거는 6편·1,114명 분석에서 확인되지 않았습니다. 담당 의료진이 따로 정해 준 기준이 있으면 그것을 먼저 따르세요.', (10,))}
    {myth('"설탕이 암을 키우니 단 것은 다 끊어야 한대요."', '끊는다고 암이 굶는다는 연구는 없습니다. 다만 단 음료는 줄이세요.',
          '설탕을 끊은 환자의 결과를 본 시험은 찾지 못했습니다. 한편 3기 대장암 1,011명 관찰에서 가당 음료를 하루 2잔 넘게 마신 분은 재발·사망 위험이 높았습니다(1.67배). 밥과 과일까지 끊을 일은 아닙니다.', (11,))}
    {myth('"굶으면 암도 굶는대요."', '혼자 시작하는 단식은 권하지 않습니다.',
          '프랑스 생존자 2,741명 가운데 6.0 %가 단식을 해 보았고, 예후가 좋아질 거라는 믿음과 관련이 있었습니다. 의료진에게 영양 정보를 받은 분은 단식을 덜 했습니다. 단식은 지금 의료진이 관리하는 시험 안에서 연구되는 단계이고, 그 시험도 마른 분과 당뇨가 있는 분은 받지 않았습니다.', (12, 13))}
  </div>
</section>

<section class="ch" id="c3">
  {head(3)}
  <h2>체중이 줄면, 치료를 견디기가 어려워집니다</h2>
  <p>꼭 필요한 제한 하나도 식탁 전체를 줄입니다. 서울대병원에서 갑상선암 환자 92명이 방사성 요오드 치료를 앞두고 저요오드식을 하는 동안,
  하루 열량이 평소보다 <strong>446 kcal</strong> 적었습니다.{r(14)} 꼭 필요해서 하는 제한도 이렇습니다. 그래서 제한은 필요한 만큼, 필요한 기간만 하는 것이 좋습니다.</p>
  <figure class="chart" style="margin:0">
    <h3>방사선치료 전 체중이 줄어든 정도와 5년 생존율</h3>
    <p class="cs">두경부암으로 방사선치료를 받은 1,340명, 네덜란드{r(15)}</p>
    <ol>{chart}</ol>
    <div class="axis" aria-hidden="true"><span></span><span><i>0</i><i>25</i><i>50</i><i>75</i><i>100 %</i></span><span></span></div>
    <p class="cn">나이·병기 같은 다른 요인을 맞춘 뒤에도, 치료 전 10 % 넘게 줄었던 분의 사망 위험은 1.7배였습니다. 치료 중에 체중이 크게 준 경우도 결과가 나빴습니다.</p>
  </figure>
  <ul class="keys">
    <li><h3>부작용은 늘고, 받은 치료는 줄었습니다</h3><p>위장관암으로 항암치료를 받은 1,555명에서, 체중이 줄어 있던 분은 손발 피부 반응과 입안 염증이 더 잦고 심했습니다. 치료는 평균 한 달(18 %) 덜 받으셨습니다. 연구진은 결과가 나빴던 까닭을 약이 덜 들어서가 아니라, 치료를 덜 받고 부작용이 많았던 데서 찾았습니다.{r(16)}</p></li>
    <li><h3>많이 줄고 마를수록, 생존 기간이 짧았습니다</h3><p>캐나다·유럽 8,160명에서 체중 감소와 마른 정도를 함께 본 등급에 따라 생존 기간 중앙값이 20.9개월부터 4.3개월까지 벌어졌습니다.{r(17)}</p></li>
    <li><h3>근육은 체중계에 바로 드러나지 않습니다</h3><p>38편·7,843명을 모은 분석에서 CT로 잰 근육량이 적은 분은 사망 위험이 1.44배였습니다.{r(18)} 단백질을 챙기는 이유입니다.</p></li>
  </ul>
  <div class="honest">
    <h3>연구가 아직 말하지 않는 것</h3>
    <ul>
      <li>위 연구는 모두 <strong>관찰 연구</strong>입니다. 체중이 줄어서 결과가 나빴는지, 병이 깊어서 체중이 줄었는지를 완전히 가를 수는 없습니다.</li>
      <li>영양 상담과 보충은 식사량·체중·삶의 질을 지키는 데 도움이 되었습니다. 그러나 13개 시험·1,414명을 모은 분석에서 <strong>생존을 늘렸다는 결과는 나오지 않았습니다</strong>(사망 위험 1.06배, 차이 없음).{r(19)}</li>
      <li>그래서 하루차림은 "잘 드시면 오래 사신다"고 말하지 않습니다. 치료를 끝까지 받으실 수 있도록 몸을 지키는 일로 봅니다.</li>
    </ul>
  </div>
</section>

<section class="ch" id="c4">
  {head(4)}
  <h2>같은 음식도, 누가 드시느냐에 따라 답이 다릅니다</h2>
  <p>'좋은 음식·나쁜 음식' 목록은 편하지만, 한 가지 답으로는 모든 분께 맞출 수 없습니다.
  그래서 음식마다 성분을 따로 쌓고, 암 종류·치료 시기·증상·드시는 약에 따라 판단을 나누었습니다.</p>
  <ul class="same">{examples}</ul>
  <ul class="data">{data}</ul>
  <p style="font-size:16px;color:var(--soft)">영양 목표는 2025 한국인 영양소 섭취기준과 유럽임상영양대사학회(ESPEN) 암 영양 지침을 따릅니다. 판단의 근거가 된 문헌은 앱 안에서 항목마다 열어 보실 수 있습니다.</p>
</section>

<section class="ch" id="c5">
  {head(5)}
  <h2>빼는 목록이 아니라, 채우는 상차림</h2>
  <p>하루차림은 무엇을 피할지만 알려 드리지 않습니다. 체중과 치료 시기에 맞춰 하루 목표를 정하고,
  밥을 먼저 앉힌 뒤 반찬과 국을 더해 한국식 한 상을 차립니다. 앞에서 본 근거가 화면에서는 이렇게 쓰입니다.</p>
  <ul class="feats">{feats}</ul>
  <div class="shots">
    <figure><img src="{DIARY}" alt="기록 화면: 한 주 평균 열량 1,083 kcal(목표 1,350~1,620), 단백질 31 g(목표 54 g 이상)이 부족으로 표시되고, 3일 내리 모자랐다는 안내가 보인다" loading="lazy"><figcaption>일주일 기록에서 모자란 것을 짚어 드립니다(예시 화면)</figcaption></figure>
    <figure><img src="{WHY}" alt="추천 화면: 닭안심 청경채 두부볶음에 '단백질 34 g 보충'과 근거 등급 표시가 붙어 있다" loading="lazy"><figcaption>반찬마다 왜 권하는지와 근거 등급이 붙습니다(예시 화면)</figcaption></figure>
  </div>
  <div class="cta">
    <h2>오늘 한 상부터 차려 보세요</h2>
    <p>암 종류·치료 시기·드시는 약을 넣으면 하루 세 끼 한식 상차림을 추천합니다. 치료를 대신하지 않으며, 모든 안내는 "담당 의료진과 상의하세요"로 끝납니다. 기록은 기기 안에 저장됩니다.</p>
    <a href="https://harucharim.com">하루차림 열기</a>
  </div>
  <p class="legal">{LEGAL}</p>
</section>

<section class="refs">
  <h2>근거 목록</h2>
  <p>논문 수치는 모두 PubMed 초록 원문과 대조했습니다(2026년 11월 9일). 앱 숫자는 같은 날 앱 자료에서 셈한 값입니다.</p>
  <ol>{refs}</ol>
</section>
</main>
</div></body></html>
'''

open(f'{OUT}/{TITLE.replace(" ", "-")}.html', 'w', encoding='utf8').write(html)
print('ok', f'{OUT}/{TITLE.replace(" ", "-")}.html', len(html) // 1024, 'KB')
