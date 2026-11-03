#!/usr/bin/env python3
"""플레이용 스크린샷을 만든다.

플레이는 긴 변이 짧은 변의 두 배를 넘으면 받지 않는데 원본(1290×2796)은 2.17 배다.
자르면 화면이 잘리므로 좌우 끝 색을 늘려 폭만 넓히고, 투명도는 뺀다.
"""
from pathlib import Path
from PIL import Image

SRC = Path('docs/출시/스크린샷')
OUT = SRC / '플레이'
W = 1440

OUT.mkdir(exist_ok=True)
for p in sorted(SRC.glob('[1-6]-*.png')):
    im = Image.open(p).convert('RGB')
    h = im.height
    pad = (W - im.width) // 2
    out = Image.new('RGB', (W, h))
    out.paste(im, (pad, 0))
    out.paste(im.crop((0, 0, 1, h)).resize((pad, h)), (0, 0))
    out.paste(im.crop((im.width - 1, 0, im.width, h)).resize((W - pad - im.width, h)), (pad + im.width, 0))
    out.save(OUT / p.name, optimize=True)
    print(p.name, out.size, round(max(out.size) / min(out.size), 3))
