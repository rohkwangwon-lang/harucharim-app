# -*- coding: utf-8 -*-
"""
식약처 질의서를 제출용 PDF 로 만든다.

    node_modules/.bin/jiti scripts/inquiry-data.ts > /tmp/inquiry-data.json
    python3 scripts/build-inquiry.py

본문은 docs/법무/식약처-의료기기-해당여부-질의서.md 를 그대로 쓰고,
붙임 2·3 은 앱 자료(scripts/inquiry-data.ts)에서, 붙임 4 는 스토어 원고에서 뽑는다.
사람이 옮겨 적는 자리를 없애야 문서와 앱이 어긋나지 않는다.
"""
import base64, html, io, json, os, re, subprocess, sys
import markdown
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = f'{ROOT}/docs/법무/식약처-의료기기-해당여부-질의서.md'
OUT = f'{ROOT}/docs/법무/식약처-의료기기-해당여부-질의서.pdf'
DATA = sys.argv[1] if len(sys.argv) > 1 else '/tmp/inquiry-data.json'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

esc = html.escape
d = json.load(open(DATA, encoding='utf-8'))
LEVEL = {'avoid': '피하세요', 'caution': '주의', 'prefer': '권장', 'info': '참고'}
KIND = {'guideline': '진료지침', 'review': '종설', 'cohort': '코호트', 'rct': '무작위시험', 'db': '자료집', 'meta': '메타분석'}

body_md = open(SRC, encoding='utf-8').read()
body = markdown.markdown(body_md, extensions=['tables', 'sane_lists'])


def table(rows, first):
    out = ['<table class="ap"><thead><tr><th class="n">번호</th><th class="s">%s</th><th class="l">표시</th>'
           '<th class="e">근거</th><th>화면에 나오는 문구</th><th class="r">출처</th></tr></thead><tbody>' % first]
    for i, r in enumerate(rows, 1):
        out.append('<tr><td class="n">%d</td><td class="s">%s</td><td class="l lv-%s">%s</td><td class="e">%s</td><td>%s</td><td class="r">%s</td></tr>' % (
            i, esc(r['scope']), r['level'], LEVEL.get(r['level'], r['level']), esc(r['evidence']),
            esc(r['title']), ', '.join(str(x) for x in r['refs'])))
    out.append('</tbody></table>')
    return ''.join(out)


def count(rows, key):
    c = {}
    for r in rows:
        c[r[key]] = c.get(r[key], 0) + 1
    return c


# 붙임 1 — 앱 장터에 올릴 그림 그대로
shots = []
for f in ['1-suggest', '2-why', '3-search', '4-supp', '5-diary', '6-guide']:
    im = Image.open(f'{ROOT}/docs/출시/스크린샷/{f}.png').convert('RGB')
    im = im.resize((430, round(im.height * 430 / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=80, optimize=True)
    shots.append('data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode())
ap1 = '<div class="shots">' + ''.join(f'<img src="{s}" alt="">' for s in shots) + '</div>'

# 붙임 4 — 스토어 원고에서 그대로
store = open(f'{ROOT}/docs/출시/스토어-등록-자료.md', encoding='utf-8').read()
names = re.findall(r'\| (앱 이름 \(플레이·30자\)|짧은 설명 \(플레이·80자\)) \| `([^`]+)`', store)
full = re.search(r'## 2\. 전체 설명.*?```\n(.*?)```', store, re.S).group(1).strip()
assert len(names) == 2 and len(full) > 300, '스토어 원고에서 문구를 못 찾음'
ap4 = '<table class="kv">' + ''.join(f'<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>' for k, v in names) + '</table>' \
      + '<p class="cap">전체 설명</p><pre class="store">' + esc(full) + '</pre>'

rc, ic = count(d['rules'], 'level'), count(d['interactions'], 'level')
refs = '<ol class="refs">' + ''.join(
    f'<li><span class="k">{KIND.get(r["kind"], r["kind"])} · {r["year"]}</span> {esc(r["citation"])}</li>' for r in d['references']) + '</ol>'

page = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>의료기기 해당 여부 질의서 — 하루차림</title><style>
@page {{ size: A4; margin: 19mm 18mm 20mm; @bottom-center {{ content: counter(page) " / " counter(pages); font: 8pt -apple-system, sans-serif; color: #777; }} }}
* {{ box-sizing: border-box; }}
html, body {{ background: #fff; }}
body {{ font: 10.2pt/1.62 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #1c1c1a; margin: 0; }}
h1 {{ font-size: 19pt; margin: 0 0 12pt; letter-spacing: -.01em; }}
h2 {{ font-size: 12.5pt; margin: 20pt 0 7pt; padding-bottom: 3pt; border-bottom: 1.2pt solid #1c1c1a; break-after: avoid; }}
h3 {{ font-size: 10.8pt; margin: 13pt 0 5pt; break-after: avoid; }}
h4 {{ font-size: 10.2pt; margin: 10pt 0 4pt; break-after: avoid; }}
p {{ margin: 5pt 0; }}
hr {{ display: none; }}
ul, ol {{ margin: 5pt 0; padding-left: 16pt; }} li {{ margin: 2pt 0; }}
table {{ border-collapse: collapse; width: 100%; margin: 7pt 0; font-size: 9.4pt; }}
th, td {{ border: .6pt solid #9a9a94; padding: 4pt 6pt; text-align: left; vertical-align: top; }}
th {{ background: #f0efe9; font-weight: 600; }}
thead {{ display: table-header-group; }} tr {{ break-inside: avoid; }}
blockquote {{ margin: 7pt 0; padding: 6pt 10pt; border-left: 2.4pt solid #6f7f5c; background: #f6f6f1; font-size: 9.6pt; break-inside: avoid; }}
blockquote p {{ margin: 2pt 0; }}
.ap-title {{ break-before: page; font-size: 13pt; margin: 0 0 3pt; border-bottom: 1.2pt solid #1c1c1a; padding-bottom: 3pt; }}
.cap {{ font-size: 9pt; color: #555; margin: 3pt 0 7pt; }}
table.ap {{ font-size: 7.9pt; line-height: 1.42; }} table.ap th, table.ap td {{ padding: 2.6pt 4pt; }}
.n {{ width: 22pt; text-align: right; }} .s {{ width: 76pt; }} .l {{ width: 36pt; white-space: nowrap; }} .e {{ width: 24pt; text-align: center; }} .r {{ width: 50pt; }}
.lv-avoid {{ font-weight: 700; }} .lv-prefer {{ color: #3c542c; }}
ol.refs {{ font-size: 8pt; line-height: 1.45; padding-left: 20pt; }} ol.refs li {{ margin: 2.4pt 0; break-inside: avoid; }}
.k {{ color: #666; }}
.shots {{ display: grid; grid-template-columns: repeat(3, 49mm); gap: 6pt 10pt; justify-content: center; }} .shots img {{ width: 100%; border: .6pt solid #bbb; }}
table.kv th {{ width: 110pt; }}
pre.store {{ font: 8.8pt/1.6 'Apple SD Gothic Neo', sans-serif; white-space: pre-wrap; border: .6pt solid #9a9a94; padding: 8pt 10pt; margin: 4pt 0; }}
</style></head><body>
{body}

<h2 class="ap-title">붙임 1. 주요 화면 6장</h2>
<p class="cap">앱 장터에 올릴 그림 그대로입니다. 위쪽 큰 글씨는 홍보 문구이며, 질의 6의 검토 대상에 포함됩니다.
화면 속 예시는 유방암 · 항암치료 중 · 오심·구토를 고른 경우입니다.</p>
{ap1}

<h2 class="ap-title">붙임 2-가. 식이 정보 규칙 {len(d['rules'])}건</h2>
<p class="cap">표시 구분 — 권장 {rc.get('prefer', 0)} · 주의 {rc.get('caution', 0)} · 피하세요 {rc.get('avoid', 0)} · 참고 {rc.get('info', 0)}.
근거 — A 무작위 임상시험·메타분석, B 대규모 전향 코호트, C 소규모·후향·기전 연구, G 주요 학회 지침의 합의.
'출처'의 숫자는 붙임 3의 문헌 번호입니다. 앱 자료에서 그대로 뽑은 것으로, 화면에는 이 문구와 함께 이유 설명이 나옵니다.</p>
{table(d['rules'], '대상')}

<h2 class="ap-title">붙임 2-나. 약물·음식 상호작용 규칙 {len(d['interactions'])}건</h2>
<p class="cap">표시 구분 — 피하세요 {ic.get('avoid', 0)} · 주의 {ic.get('caution', 0)} · 참고 {ic.get('info', 0)} · 권장 {ic.get('prefer', 0)}.
이용자가 해당 약의 종류를 고른 경우에만 나옵니다.</p>
{table(d['interactions'], '약의 종류')}

<h2 class="ap-title">붙임 3. 참고 문헌 {len(d['references'])}종</h2>
{refs}

<h2 class="ap-title">붙임 4. 앱 장터 등록 예정 문구</h2>
{ap4}
</body></html>'''

tmp = '/tmp/harucharim-inquiry.html'
open(tmp, 'w', encoding='utf-8').write(page)
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
                f'--print-to-pdf={OUT}', 'file://' + tmp], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('만듦', OUT, f'{os.path.getsize(OUT) // 1024} KB')
