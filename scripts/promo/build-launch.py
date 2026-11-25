"""
앱스토어 출시 홍보물(2026-11-25) — 대기실 포스터 · 손에 쥐여 드리는 카드 · 카카오톡/SNS 그림.

숫자는 docs/보고서/numbers.json(앱 자료에서 센 값)에서만 읽는다.
QR 은 하나 — https://harucharim.com/get/ (아이폰 → App Store, 안드로이드 → '출시 예정' 안내. public/get/index.html).
2026-11-25 선생님 요청: 홍보물에는 App Store 만 싣고, 안드로이드는 '출시 예정'으로만 적는다(웹 주소도 싣지 않음).
구글 플레이가 열리면 그 페이지만 고치면 되고, 인쇄물은 다시 찍지 않아도 된다.

환자용 자료의 말 규칙(docs/홍보/게시물-문구.md 0절):
 - '무료'·'판매 없음'·'전문의가 만든' 쓰지 않음 · 효능('재발을 막는'·'면역력')을 내세우지 않음
 - 별점·리뷰를 부탁하지 않음(애플 지침) · 애플 로고·배지 그림을 흉내 내지 않고 'App Store' 글자만 씀
 - 바코드는 이 홍보물에서 말하지 않음(말하면 '약 20 %' 를 함께 적어야 한다)

쓰는 법:  python3 scripts/promo/build-launch.py   → docs/홍보/앱스토어-출시/*.html
그다음:   zsh scripts/promo/print-launch.sh        → PDF·PNG
"""
import base64, io, json, os
import qrcode, qrcode.image.svg
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'docs/홍보/앱스토어-출시')
os.makedirs(OUT, exist_ok=True)
N = json.load(open(os.path.join(ROOT, 'docs/보고서/numbers.json'), encoding='utf8'))

GET = 'https://harucharim.com/get/'
SOON = '안드로이드 앱은 출시 예정입니다.'
REFS = N['references']                              # 172
RULES = N['total']                                  # 158
FOODS = f"{N['foodsCore'] // 1000 * 1000:,}여"     # 18,000여
CANCERS = N['cancers']                              # 10
LEGAL = '이 앱은 의료기기가 아니며 진료를 대신하지 않습니다. 치료에 관한 결정은 담당 의료진과 상의하세요. 만 14세 이상 이용할 수 있습니다.'


def qr_svg(url: str, color='#3d5630') -> str:
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    q.add_data(url)
    q.make(fit=True)
    m = q.get_matrix()
    n = len(m)
    rects = ''.join(f'<rect x="{x}" y="{y}" width="1.02" height="1.02"/>'
                    for y, row in enumerate(m) for x, v in enumerate(row) if v)
    return (f'<svg class="qr" viewBox="0 0 {n} {n}" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="QR 코드 — {url}" shape-rendering="crispEdges"><rect width="{n}" height="{n}" fill="#fff"/>'
            f'<g fill="{color}">{rects}</g></svg>')


def shot(name: str, width=560) -> str:
    """스토어 스크린샷에서 휴대폰 화면만 오려 작은 JPEG data URI 로"""
    im = Image.open(os.path.join(ROOT, f'docs/출시/스크린샷/{name}.png')).convert('RGB')
    # 1290×2796 원본에서 앱 화면 테두리 안쪽(머리글 문구 아래)
    im = im.crop((178, 618, 1112, 2560))   # 흰 앱 화면 안쪽만(바깥 회색 판은 뺀다)
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=82, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def icon(size=192) -> str:
    im = Image.open(os.path.join(ROOT, 'public/icon-512.png')).convert('RGBA').resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


FONT = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700'
        '&family=Noto+Sans+KR:wght@400;500;700&display=swap">')
TOKENS = """
:root{--rice:#faf9f4;--ink:#282621;--soft:#5e5a4e;--line:#e4e1d6;--leaf:#3d5630;--leaf2:#628548;--wash:#eef2e6;--soy:#875326;--soywash:#f4e5d2;--paper:#fff}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--rice);color:var(--ink);font-family:'Noto Sans KR',system-ui,sans-serif;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}
.serif{font-family:'Gowun Batang',serif}
.qr{display:block;width:100%;height:auto;background:#fff}
"""
ICON = icon()
POINTS = [
    ('내 상황에 맞춘 하루 세 끼', f'암종 {CANCERS}가지 · 치료 시기 · 증상 · 드시는 약에 맞춰 밥과 반찬, 국으로 한 상을 짜 드립니다.'),
    ('왜 권하는지, 어디서 나온 말인지', '음식마다 권장 · 주의 · 피하세요와 그 이유, 출처를 함께 적었습니다. 모르는 것은 "아직 모릅니다"라고 적었습니다.'),
    ('기록은 이 기기 안에', '체중과 식단 기록은 휴대폰 안에만 저장됩니다.'),
]
STATS = [(f'{REFS}', '종', '참고 문헌 — 요약이 아니라 원문으로 확인'), (f'{RULES}', '개', '판단 기준'), (FOODS, '종', '한국 음식')]


def poster() -> str:
    pts = ''.join(f'<li><h3>{t}</h3><p>{d}</p></li>' for t, d in POINTS)
    sts = ''.join(f'<li><b class="serif">{v}<i>{u}</i></b><span>{d}</span></li>' for v, u, d in STATS)
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>하루차림 출시 포스터</title>{FONT}<style>{TOKENS}
@page{{size:A4;margin:0}}
body{{background:#d9d6cb}}
.sheet{{width:210mm;height:297mm;margin:10mm auto;background:var(--rice);position:relative;overflow:hidden;padding:14mm 15mm 10mm;display:flex;flex-direction:column}}
@media print{{body{{background:none}}.sheet{{margin:0}}}}
.top{{display:flex;align-items:center;gap:4mm}}.top img{{width:15mm;height:15mm;border-radius:3.5mm}}
.top b{{font-size:17pt;color:var(--leaf);font-family:'Gowun Batang',serif}}.top span{{display:block;font-size:9pt;color:var(--soft)}}
.tag{{margin-left:auto;border:1.5px solid var(--leaf);color:var(--leaf);border-radius:20mm;padding:1.5mm 4.5mm;font-size:10pt;font-weight:700;letter-spacing:.02em}}
h1{{font-family:'Gowun Batang',serif;font-size:44pt;line-height:1.12;color:var(--leaf);margin:10mm 0 4mm;letter-spacing:-.01em}}
.lead{{font-size:15.5pt;line-height:1.5;margin:0;color:var(--ink)}}.lead em{{font-style:normal;border-bottom:2.2px solid var(--soy)}}
.mid{{display:grid;grid-template-columns:1fr 56mm;gap:9mm;margin-top:9mm;height:92mm}}
.pts{{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5mm}}
.pts li{{border-top:1.6px solid var(--leaf2);padding-top:3mm}}.pts h3{{margin:0 0 1.2mm;font-size:13.5pt;color:var(--ink)}}.pts p{{margin:0;font-size:10.5pt;color:var(--soft);line-height:1.55}}
.phone{{height:92mm;border-radius:7mm;overflow:hidden;border:2.2mm solid #2b2a26;background:#fff}}.phone img{{display:block;width:100%;height:100%;object-fit:cover;object-position:top}}
.stats{{list-style:none;padding:0;margin:8mm 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}}
.stats li{{background:var(--wash);border-radius:3mm;padding:3.5mm 4mm}}.stats b{{display:block;font-size:25pt;color:var(--leaf);line-height:1.1;font-variant-numeric:tabular-nums}}.stats i{{font-style:normal;font-size:12pt;margin-left:.6mm}}.stats span{{font-size:8.8pt;color:var(--soft);line-height:1.4;display:block;margin-top:1mm}}
.get{{display:grid;grid-template-columns:38mm 1fr;gap:7mm;align-items:center;margin-top:auto;padding:5mm 6mm;background:var(--paper);border:1px solid var(--line);border-radius:4mm}}
.get h2{{font-family:'Gowun Batang',serif;color:var(--leaf);font-size:19pt;margin:0 0 2.5mm}}.get p{{margin:0 0 1.2mm;font-size:10.5pt}}.get p b{{color:var(--leaf)}}.get small{{display:block;margin-top:2mm;font-size:8.6pt;color:var(--soft)}}
.legal{{margin:5mm 0 0;font-size:8.2pt;color:var(--soft);text-align:center}}
</style></head><body><main class="sheet">
<div class="top"><img src="{ICON}" alt=""><div><b>하루차림</b><span>암 치료 중 식사, 근거와 함께</span></div><span class="tag">App Store 출시</span></div>
<h1>“뭘 먹어야<br>하나요?”</h1>
<p class="lead">진료실에서 가장 자주 나오는 이 질문에,<br><em>근거를 붙여 하루 세 끼로</em> 답하는 앱입니다.</p>
<div class="mid"><ul class="pts">{pts}</ul><div class="phone"><img src="{shot('1-suggest')}" alt="하루차림 추천 식단 화면"></div></div>
<ul class="stats">{sts}</ul>
<section class="get">{qr_svg(GET)}<div>
<h2>아이폰 카메라로 비춰 보세요</h2>
<p><b>아이폰</b> · App Store에서 ‘하루차림’ 검색</p>
<p>App Store로 바로 연결됩니다.</p>
<small>{SOON}</small>
</div></section>
<p class="legal">{LEGAL}</p>
</main></body></html>"""


def cards() -> str:
    """A4 한 장에 명함 크기(85×55 mm) 카드 10장 — 자르는 선 포함"""
    q = qr_svg(GET)
    one = f"""<div class="card"><div class="l"><div class="hd"><img src="{ICON}" alt=""><b class="serif">하루차림</b></div>
<p class="q serif">“뭘 먹어야 하나요?”</p><p class="s">암 치료 중 식사를<br>근거와 함께 하루 세 끼로</p>
<p class="w"><b>App Store</b>에서 ‘하루차림’<br>{SOON}</p></div><div class="r">{q}<span>아이폰 카메라로</span></div></div>"""
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>하루차림 안내 카드</title>{FONT}<style>{TOKENS}
@page{{size:A4;margin:0}}body{{background:#d9d6cb}}
.sheet{{width:210mm;height:297mm;margin:10mm auto;background:#fff;padding:11mm 20mm;display:grid;grid-template-columns:repeat(2,85mm);grid-auto-rows:55mm;gap:0;align-content:start}}
@media print{{body{{background:none}}.sheet{{margin:0}}}}
.card{{border:.2mm dashed #b8b4a6;display:grid;grid-template-columns:1fr 25mm;gap:3mm;padding:4.5mm 4.5mm 4mm 5mm;background:var(--rice)}}
.hd{{display:flex;align-items:center;gap:2mm}}.hd img{{width:7mm;height:7mm;border-radius:1.6mm}}.hd b{{font-size:12pt;color:var(--leaf)}}
.q{{margin:2.4mm 0 .6mm;font-size:12.5pt;color:var(--leaf);line-height:1.2}}.s{{margin:0;font-size:7.6pt;line-height:1.45;color:var(--ink)}}
.w{{margin:2.2mm 0 0;font-size:6.6pt;line-height:1.5;color:var(--soft)}}.w b{{color:var(--leaf)}}
.r{{align-self:center;text-align:center}}.r span{{display:block;font-size:5.8pt;color:var(--soft);margin-top:1mm}}
</style></head><body><main class="sheet">{one * 10}</main></body></html>"""


def social(kind: str) -> str:
    """카카오톡·인스타그램 그림. square 1080×1080, story 1080×1920"""
    sq = kind == 'square'
    W, H = (1080, 1080) if sq else (1080, 1920)
    pts = ''.join(f'<li>{t}</li>' for t, _ in POINTS)
    phone = '' if sq else f'<div class="phone"><img src="{shot("1-suggest", 620)}" alt="하루차림 추천 식단 화면"></div>'
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width={W}">
<title>하루차림 출시 {kind}</title>{FONT}<style>{TOKENS}
html,body{{width:{W}px;height:{H}px;overflow:hidden}}
.f{{width:{W}px;height:{H}px;padding:{80 if sq else 110}px 84px;display:flex;flex-direction:column;background:linear-gradient(180deg,var(--rice),var(--wash))}}
.top{{display:flex;align-items:center;gap:22px}}.top img{{width:92px;height:92px;border-radius:22px}}.top b{{font-family:'Gowun Batang',serif;font-size:50px;color:var(--leaf)}}
.tag{{margin-left:auto;border:3px solid var(--leaf);color:var(--leaf);border-radius:99px;padding:10px 26px;font-size:30px;font-weight:700}}
h1{{font-family:'Gowun Batang',serif;font-size:{104 if sq else 116}px;line-height:1.12;color:var(--leaf);margin:{58 if sq else 90}px 0 26px}}
.lead{{font-size:38px;line-height:1.5;margin:0}}.lead em{{font-style:normal;border-bottom:5px solid var(--soy)}}
ul{{list-style:none;padding:0;margin:{46 if sq else 60}px 0 0;display:flex;flex-direction:column;gap:16px}}li{{font-size:33px;font-weight:500;padding-left:34px;position:relative}}li::before{{content:'';position:absolute;left:0;top:.6em;width:16px;height:16px;border-radius:50%;background:var(--leaf2)}}
.phone{{margin:70px auto 0;width:520px;border-radius:44px;overflow:hidden;border:14px solid #2b2a26;flex:1;min-height:0}}.phone img{{width:100%;display:block}}
.bot{{margin-top:auto;padding-top:40px;display:flex;align-items:flex-end;justify-content:space-between;gap:30px}}
.bot p{{margin:0;font-size:30px;color:var(--soft);line-height:1.45}}.bot p b{{color:var(--leaf)}}.bot .qrw{{width:{180 if sq else 210}px;flex:none;padding:12px;background:#fff;border-radius:16px}}
</style></head><body><div class="f">
<div class="top"><img src="{ICON}" alt=""><b>하루차림</b><span class="tag">App Store 출시</span></div>
<h1>“뭘 먹어야<br>하나요?”</h1>
<p class="lead">암 치료 중 식사, <em>근거를 붙여</em><br>하루 세 끼로 답합니다.</p>
<ul>{pts}</ul>{phone}
<div class="bot"><p><b>App Store</b>에서 ‘하루차림’<br>{SOON}</p><div class="qrw">{qr_svg(GET)}</div></div>
</div></body></html>"""


for name, html in [('포스터-A4', poster()), ('안내카드-A4-10장', cards()),
                   ('그림-정사각', social('square')), ('그림-세로', social('story'))]:
    with open(os.path.join(OUT, f'{name}.html'), 'w', encoding='utf8') as fp:
        fp.write(html)
    print(name + '.html')
