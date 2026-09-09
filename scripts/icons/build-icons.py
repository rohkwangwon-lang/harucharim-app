# -*- coding: utf-8 -*-
"""
앱 아이콘 넉 장과 favicon.svg 를 한 정의에서 만든다.

여태 아이콘은 청록(#0d9482)이고 앱 화면과 그래픽 이미지는 올리브 초록(brand-600)이었다.
스토어에서 아이콘과 스크린샷이 나란히 놓이면 다른 앱처럼 보이므로 브랜드 색으로 맞춘다.
favicon.svg 는 아예 다른 그림(가로로 누운 잎)이었는데, 그것도 여기서 함께 만들어
앞으로는 넉 장과 파비콘이 갈라지지 않게 한다.

치수는 기존 icon-512.png 에서 그대로 떠 왔다(512 기준):
  · 둥근 모서리 r=102     · 막대 x112~400 y227~251, r=12
  · 그릇 = 반타원 중심(256,299) rx=144 ry=164
  · 잎 두 개 = 타원 rx=37.5 ry=52, 중심 (227.5,175.5) 과 (284,163.5)

    python3 scripts/icons/build-icons.py
"""
from PIL import Image, ImageDraw

OUT = 'public'
SS = 4  # 4배로 그린 뒤 줄여서 계단을 없앤다

# 브랜드 색 — tailwind.config.js 와 vite.config.ts 의 theme_color 를 따른다
BG = (75, 105, 54)        # brand-600 #4b6936 — theme_color 와 같은 값
BOWL = (250, 249, 244)    # stone-50 #faf9f4 — manifest 의 background_color 와 같은 값
LEAF_BACK = (204, 217, 186)   # brand-200 #ccd9ba
LEAF_FRONT = (230, 236, 219)  # brand-100 #e6ecdb

# 512 기준 비율
R_CORNER = 102 / 512
BAR = (112 / 512, 227 / 512, 400 / 512, 251 / 512)
BAR_R = 12 / 512
BOWL_C, BOWL_RX, BOWL_RY = (256 / 512, 299 / 512), 144 / 512, 164 / 512
LEAF_RX, LEAF_RY = 37.5 / 512, 52 / 512
LEAF_BACK_C = (227.5 / 512, 175.5 / 512)
LEAF_FRONT_C = (284 / 512, 163.5 / 512)


def draw(size, corner=True, opaque=False, inset=1.0):
    """inset < 1 이면 그림만 가운데로 줄인다(maskable 안전 영역)"""
    n = size * SS
    img = Image.new('RGBA', (n, n), BG + (255,) if opaque or not corner else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if corner and not opaque:
        d.rounded_rectangle([0, 0, n - 1, n - 1], R_CORNER * n, fill=BG + (255,))

    def px(v):
        """가운데를 축으로 inset 만큼 오므린다"""
        return (v - 0.5) * inset * n + n / 2

    d.rounded_rectangle([px(BAR[0]), px(BAR[1]), px(BAR[2]), px(BAR[3])],
                        BAR_R * n * inset, fill=BOWL)
    cx, cy = px(BOWL_C[0]), px(BOWL_C[1])
    rx, ry = BOWL_RX * n * inset, BOWL_RY * n * inset
    d.pieslice([cx - rx, cy - ry, cx + rx, cy + ry], 0, 180, fill=BOWL)
    for (lx, ly), col in ((LEAF_BACK_C, LEAF_BACK), (LEAF_FRONT_C, LEAF_FRONT)):
        cx, cy = px(lx), px(ly)
        rx, ry = LEAF_RX * n * inset, LEAF_RY * n * inset
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=col)
    return img.resize((size, size), Image.LANCZOS)


jobs = [
    # 홈 화면·매니페스트용 — 모서리를 둥글게 깎는다
    ('icon-192.png', draw(192)),
    ('icon-512.png', draw(512)),
    # maskable 은 안드로이드가 제 모양으로 오려 낸다. 모서리를 비워 두면
    # 네모난 틀을 쓰는 런처에서 귀퉁이가 뚫린 채로 보이므로 네모를 꽉 채운다.
    ('icon-maskable-512.png', draw(512, corner=False, inset=0.78)),
    # iOS 는 투명한 자리를 검게 깐다. 역시 꽉 채우고 모서리는 iOS 가 깎게 둔다.
    ('apple-touch-icon.png', draw(180, corner=False, opaque=True)),
]
for name, img in jobs:
    img.convert('RGB' if name == 'apple-touch-icon.png' else 'RGBA').save(f'{OUT}/{name}')
    print(f'{OUT}/{name}')


def h(c):
    return '#%02x%02x%02x' % c


svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="102" fill="{h(BG)}"/>
  <rect x="112" y="227" width="288" height="24" rx="12" fill="{h(BOWL)}"/>
  <path d="M112 299a144 164 0 0 0 288 0z" fill="{h(BOWL)}"/>
  <ellipse cx="227.5" cy="175.5" rx="37.5" ry="52" fill="{h(LEAF_BACK)}"/>
  <ellipse cx="284" cy="163.5" rx="37.5" ry="52" fill="{h(LEAF_FRONT)}"/>
</svg>
'''
open(f'{OUT}/favicon.svg', 'w', encoding='utf-8').write(svg)
print(f'{OUT}/favicon.svg')
