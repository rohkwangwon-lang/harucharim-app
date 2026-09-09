# -*- coding: utf-8 -*-
"""
찍어 온 화면에 스토어용 문구를 얹는다.
문구는 위쪽 25 % 안에 두라는 것이 두 스토어 공통 권고라, 캡션 칸을 600 px 로 고정한다.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

W, H = 1290, 2796
CAP_H = 600                      # 600/2796 = 21.5 %
BG_TOP = (243, 245, 239)         # 연한 연둣빛 미색
BG_BOT = (255, 255, 255)
INK = (47, 71, 40)               # 브랜드 짙은 초록
SUB = (108, 112, 98)
RULE = (198, 210, 190)

F = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
bold = lambda s: ImageFont.truetype(F, s, index=6)
med = lambda s: ImageFont.truetype(F, s, index=2)

SHOTS = [
    ('1-suggest', '오늘 무엇을 드실지', '암종·치료 시기·증상에 맞춰 한 상으로'),
    ('2-why', '왜 이걸 권하는지까지', '항목마다 근거 등급과 출처가 붙습니다'),
    ('3-search', '이거 먹어도 되나요?', '검색 한 번으로 권장·주의·피하세요'),
    ('4-supp', '이건 근거가 있고, 이건 없습니다', '드시는 약과의 상호작용까지 함께 봅니다'),
    ('5-diary', '일주일치를 모아 보면 보입니다', '모자란 것과 넘치는 것을 짚어 드립니다'),
    ('6-guide', '참고 문헌 79종, 전부 원문 대조', '근거를 부풀리지도, 낮추지도 않습니다'),
]


def wrap(draw, text, font, maxw):
    """한글은 어절 단위로 접는다"""
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def rounded_shadow(img, radius, blur, offset, spread):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    sh = Image.new('RGBA', (img.width + spread * 2, img.height + spread * 2), (0, 0, 0, 0))
    sm = Image.new('L', sh.size, 0)
    ImageDraw.Draw(sm).rounded_rectangle(
        [spread, spread, spread + img.width - 1, spread + img.height - 1], radius, fill=70)
    sh.putalpha(sm.filter(ImageFilter.GaussianBlur(blur)))
    return m, sh


os.makedirs('store', exist_ok=True)
for name, head, sub in SHOTS:
    canvas = Image.new('RGB', (W, H), BG_BOT)
    d = ImageDraw.Draw(canvas)
    for y in range(H):
        k = min(1.0, y / (CAP_H * 1.6))
        d.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * k) for a, b in zip(BG_TOP, BG_BOT)))

    # 문구
    size = 88
    while size > 54:
        f = bold(size)
        lines = wrap(d, head, f, W - 200)
        if len(lines) <= 2:
            break
        size -= 4
    f = bold(size)
    lines = wrap(d, head, f, W - 200)
    lh = int(size * 1.32)
    y = 150 if len(lines) == 1 else 118
    for ln in lines:
        d.text((100, y), ln, font=f, fill=INK)
        y += lh
    y += 18
    d.line([(104, y), (104 + 92, y)], fill=RULE, width=6)
    y += 40
    fs = med(42)
    for ln in wrap(d, sub, fs, W - 200):
        d.text((100, y), ln, font=fs, fill=SUB)
        y += int(42 * 1.45)

    # 화면
    shot = Image.open(f'raw/{name}.png').convert('RGB')
    avail_h = H - CAP_H - 96
    sw = round(shot.width * avail_h / shot.height)
    shot = shot.resize((sw, avail_h), Image.LANCZOS)
    mask, shadow = rounded_shadow(shot, 46, 34, 0, 40)
    x = (W - sw) // 2
    canvas.paste(shadow, (x - 40, CAP_H - 40 + 14), shadow)
    canvas.paste(shot, (x, CAP_H), mask)
    canvas.save(f'store/{name}.png')
    print('store/%s.png' % name)
