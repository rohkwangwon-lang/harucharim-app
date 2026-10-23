# -*- coding: utf-8 -*-
"""
발표 HTML 에 전화기 사진을 data URI 로 심는다(2026-10-23).

scripts/screenshots/raw/*.png(1290 × 2796)을 폭 540 px 로 줄이고 색을 줄여(PNG 160색) 글자가 뭉개지지 않게 넣는다.
처음에는 <img … src="SHOT_PLAN"> 같은 자리표를, 다음부터는 같은 alt 를 가진 <img> 의 src 를 바꾼다 —
사진을 다시 찍어도 HTML 을 손으로 고칠 일이 없다.

  python3 scripts/promo/embed-shots.py
"""
import base64, io, os, re, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
RAW = os.path.join(ROOT, 'scripts', 'screenshots', 'raw')
DECK = os.path.join(ROOT, 'docs', '홍보', '하루차림-발표.html')

# (자리표, 사진, alt 의 앞부분)
SHOTS = [
    ('SHOT_PLAN', '7-plan.png', '3일치 식단 화면'),
    ('SHOT_SHOP', '8-shop.png', '장보기 목록 화면'),
    ('SHOT_TOUR', '9-tour.png', '움직이는 사용법 화면'),
]


def data_uri(path, width=540):
    im = Image.open(path).convert('RGB')
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im = im.quantize(160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


s = open(DECK, encoding='utf-8').read()
done = []
for placeholder, png, alt in SHOTS:
    p = os.path.join(RAW, png)
    if not os.path.exists(p):
        print(f'사진 없음: {png} — scripts/screenshots/README.md 순서로 먼저 찍으십시오'); sys.exit(1)
    uri = data_uri(p)
    if f'src="{placeholder}"' in s:
        s = s.replace(f'src="{placeholder}"', f'src="{uri}"')
    else:
        pat = re.compile(r'(<img alt="' + re.escape(alt) + r'[^"]*" src=")[^"]*(")')
        if not pat.search(s): print(f'자리를 못 찾음: {alt}'); sys.exit(1)
        s = pat.sub(lambda m: m.group(1) + uri + m.group(2), s, count=1)
    done.append(f'{png} {len(uri) // 1024} KB')
open(DECK, 'w', encoding='utf-8').write(s)
print('심음 — ' + ' · '.join(done))
