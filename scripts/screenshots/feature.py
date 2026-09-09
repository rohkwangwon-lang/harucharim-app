# -*- coding: utf-8 -*-
"""구글 플레이 그래픽 이미지 1024 x 500."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 500
BG = (75, 105, 54)        # brand-600
BG2 = (60, 84, 44)        # brand-700
CREAM = (250, 249, 244)   # stone-50
SOFT = (204, 217, 186)    # brand-200

F = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
bold = lambda s: ImageFont.truetype(F, s, index=6)
med = lambda s: ImageFont.truetype(F, s, index=2)

img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)
for x in range(W):
    k = x / W
    d.line([(x, 0), (x, H)], fill=tuple(round(a + (b - a) * k) for a, b in zip(BG, BG2)))

# 그릇 표시 — 아이콘과 같은 꼴을 흰색으로 그린다
cx, cy, r = 176, 250, 96
d.ellipse([cx - 44, cy - 96, cx - 4, cy - 40], fill=SOFT)
d.ellipse([cx + 2, cy - 104, cx + 46, cy - 44], fill=CREAM)
d.rounded_rectangle([cx - r, cy - 34, cx + r, cy - 12], 11, fill=CREAM)
d.pieslice([cx - r + 14, cy - 30 - 62, cx + r - 14, cy + 92], 0, 180, fill=CREAM)

x0 = 336
d.text((x0, 128), '하루차림', font=bold(78), fill=CREAM)
d.text((x0, 232), '암 환자를 위한 식이·영양 도우미', font=med(38), fill=SOFT)
d.line([(x0 + 3, 300), (x0 + 78, 300)], fill=SOFT, width=4)
d.text((x0, 330), '오늘 무엇을 드실지, 왜 그런지까지', font=med(31), fill=(226, 233, 214))
d.text((x0, 378), '참고 문헌 79종 · 임상 규칙 144개 · 전부 원문 대조', font=med(27), fill=(178, 197, 158))

img.save('store/feature-1024x500.png')
print('store/feature-1024x500.png')
