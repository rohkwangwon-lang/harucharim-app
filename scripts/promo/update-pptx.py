# -*- coding: utf-8 -*-
"""
발표 pptx 두 벌에 2026-10-23 의 새 기능 장을 끼워 넣는다(python-pptx).

HTML 발표와 같은 내용으로:
  - 하루차림-발표.pptx(12장 → 14장): 4장 엔진 6→7, 6장 검사 32종, 9장 '며칠치와 장보기', 10장 '처음 여는 분께', 견줌 표에 한 줄, 번호·진행 막대·순서말 다시 맞춤
  - 하루차림-환자-발표.pptx(10장 → 11장): 9장 '이렇게 쓰실 수 있습니다', 마무리 문구, 번호·진행 막대
새 장은 기존 장(3단 구성)을 복제해 글만 바꾼다 — 글꼴·색·자리가 원래 디자인과 같게.
이미 끼워 넣은 파일에 다시 돌리면 아무것도 하지 않는다(장 수로 안다).

  python3 scripts/promo/update-pptx.py
"""
import copy, os
from pptx import Presentation
from pptx.util import Pt, Emu

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'docs', '홍보')
GEN = os.path.join(ROOT, '하루차림-발표.pptx')
PAT = os.path.join(ROOT, '하루차림-환자-발표.pptx')


def clone_slide(prs, src):
    """같은 배치로 새 장을 만들고 도형을 통째로 복사한다(그림 없는 장만)."""
    dst = prs.slides.add_slide(src.slide_layout)
    for sh in list(dst.shapes):
        sh._element.getparent().remove(sh._element)
    for sh in src.shapes:
        dst.shapes._spTree.append(copy.deepcopy(sh._element))
    return dst


def move_slide(prs, old, new):
    lst = prs.slides._sldIdLst
    el = list(lst)[old]
    lst.remove(el)
    lst.insert(new, el)


def set_lines(shape, lines, size_first=None):
    """글상자의 문단을 바꾼다. i 번째 줄은 원래 i 번째 문단(없으면 마지막)의 글꼴을 그대로 쓴다."""
    tf = shape.text_frame
    tmpl = [copy.deepcopy(p._p) for p in tf.paragraphs]
    for p in list(tf.paragraphs):
        p._p.getparent().remove(p._p)
    for i, line in enumerate(lines):
        p = copy.deepcopy(tmpl[min(i, len(tmpl) - 1)])
        runs = p.findall('{http://schemas.openxmlformats.org/drawingml/2006/main}r')
        for r in runs[1:]:
            p.remove(r)
        if runs:
            t = runs[0].find('{http://schemas.openxmlformats.org/drawingml/2006/main}t')
            t.text = line
        tf._txBody.append(p)
    if size_first is not None and tf.paragraphs and tf.paragraphs[0].runs:
        tf.paragraphs[0].runs[0].font.size = Pt(size_first)


def set_text(shape, text, size=None):
    set_lines(shape, [text], size)


def replace_in_runs(shape, old, new):
    n = 0
    for p in shape.text_frame.paragraphs:
        for r in p.runs:
            if old in r.text:
                r.text = r.text.replace(old, new); n += 1
    return n


def renumber(prs):
    """'NN / 총' 글상자와 위쪽 진행 막대(첫 도형)를 장 수에 맞춘다."""
    n = len(prs.slides)
    for i, s in enumerate(prs.slides, 1):
        for sh in s.shapes:
            if sh.has_text_frame and '/' in sh.text_frame.text and len(sh.text_frame.text) <= 8 and sh.text_frame.text.strip()[:2].isdigit():
                set_text(sh, f'{i:02d} / {n:02d}')
        bar = list(s.shapes)[0]
        if bar.width is not None and bar.height is not None and bar.height < Emu(60000) and bar.top == 0:
            bar.width = Emu(int(prs.slide_width * i / n))


def general():
    prs = Presentation(GEN)
    if len(prs.slides) >= 14:
        print('하루차림-발표.pptx: 이미 14장 — 건너뜀'); return
    S = list(prs.slides)
    # 1 표지 날짜
    for sh in S[0].shapes:
        if sh.has_text_frame: replace_in_runs(sh, '2026년 9월', '2026년 10월')
    # 4 엔진 6 → 7 + 상자 하나
    s4 = S[3]
    for sh in s4.shapes:
        if sh.has_text_frame and sh.text_frame.text.startswith('6'):
            replace_in_runs(sh, '6', '7')
        if sh.has_text_frame and sh.text_frame.text.startswith('src/engine'):
            set_text(sh, sh.text_frame.text + ' · plan')
    boxes = [sh for sh in s4.shapes if sh.has_text_frame and sh.text_frame.text.startswith('하루·주·월 평가')]
    if boxes:
        el = copy.deepcopy(boxes[0]._element)
        s4.shapes._spTree.append(el)
        nb = list(s4.shapes)[-1]
        nb.left, nb.top, nb.height = Emu(369 * 9525), Emu(575 * 9525), Emu(70 * 9525)
        set_lines(nb, ['며칠치 계획', '닷새까지 날을 잇고 재료를 모아 장보기로'])
    # 6 검사 32종
    for sh in S[5].shapes:
        if sh.has_text_frame: replace_in_runs(sh, '검사 24종', '검사 32종')
    # 9·10 새 장 — 10장(개인정보, 3단)을 복제
    tmpl = S[9]
    specs = [
        ('일곱 · 며칠치와 장보기', '닷새까지 한 번에 — 식단과 1인분 장보기 목록',
         ['며칠치 식단', '· 1~5일 한 번에, 날마다 다른 상', '· 생선·고기 든 날은 앞에', '· 국·조림은 2인분 끓여 이틀에', '· 앞날 재료로 만들 수 있는 요리 우선 — 재료 13 % 적게'],
         ['장보기 목록', '1인분 양 · 흔한 포장 단위(두부 1모) · 냉장 보관 기간을 한 줄에.', '집에 있는 재료는 빼고, 산 것은 눌러 표시. 복사·보내기로 옮깁니다.'],
         ['식단표 저장 · 인쇄', '날짜 × 끼니 표를 큰 글씨 그림으로 만들어 냉장고에 붙입니다.', '인쇄는 표와 장보기 목록을 A4 한 장에 맞춥니다.'],
         '5일까지 — 고기·생선을 냉장으로 신선하게 둘 수 있는 기간 · 보관 기간은 미국 FoodSafety.gov·FoodKeeper 원문 대조'),
        ('여덟 · 처음 여는 분께', '손가락이 눌러 가며, 목소리로 읽어 줍니다',
         ['움직이는 사용법', '· 처음 등록부터 몸 상태가 달라졌을 때까지 6장 17장면', '· 내가 고르고 나머지를 추천받는 법도', '· 화면을 본뜬 그림 위를 손 모양이 눌러 감', '· 가이드 → 사용법, 로그인 화면에서도'],
         ['음성 안내', '자막 65개를 신경망 음성으로 녹음해 어느 기기에서나 같은 목소리로 읽어 줍니다.', '읽기가 끝나야 다음으로 넘어갑니다.'],
         ['알레르기 · 글자 크기', '이름만이 아니라 식약처 품목제조보고 원재료로 시판 제품 174,048건을 확인합니다.', '글자는 내 정보에서 더 크게로 키웁니다.'],
         '2026년 10월에 더한 것'),
    ]
    for k, (eyebrow, title, c1, c2, c3, foot) in enumerate(specs):
        ns = clone_slide(prs, tmpl)
        sh = list(ns.shapes)
        set_text(sh[2], eyebrow); set_text(sh[3], title)
        set_lines(sh[5], c1); set_lines(sh[7], c2); set_lines(sh[9], c3)
        set_text(sh[12], foot)
        move_slide(prs, len(prs.slides) - 1, 8 + k)
    S = list(prs.slides)
    # 11 견줌 표에 한 줄
    for sh in S[10].shapes:
        if sh.has_table:
            tbl = sh.table
            rows = tbl._tbl.tr_lst
            new = copy.deepcopy(rows[-1])
            rows[-1].addprevious(new)
            texts = ['닷새치 식단과 1인분 장보기 목록 · 냉장고용 식단표', '○', '○', '●', '◐', '●']
            cells = new.findall('{http://schemas.openxmlformats.org/drawingml/2006/main}tc')
            for c, t in zip(cells, texts):
                ts = c.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}t')
                if ts:
                    ts[0].text = t
                    for extra in ts[1:]: extra.text = ''
            for r in tbl.rows: r.height = Emu(int(384 * 9525 / len(tbl.rows)))
    # 순서말
    for s, (old, new) in zip([S[10], S[11], S[12]], [('일곱 · 무엇이 다른가', '아홉 · 무엇이 다른가'), ('여덟 · 개인정보', '열 · 개인정보'), ('아홉 · 원칙', '열하나 · 원칙')]):
        for sh in s.shapes:
            if sh.has_text_frame and sh.text_frame.text == old: set_text(sh, new)
    renumber(prs)
    prs.save(GEN)
    print(f'하루차림-발표.pptx: {len(prs.slides)}장')


def patient():
    prs = Presentation(PAT)
    if len(prs.slides) >= 11:
        print('하루차림-환자-발표.pptx: 이미 11장 — 건너뜀'); return
    S = list(prs.slides)
    ns = clone_slide(prs, S[2])
    sh = list(ns.shapes)
    set_text(sh[4], '이렇게 쓰실 수 있습니다')
    set_text(sh[6], '먹고 싶은 것 먼저'); set_text(sh[7], '내가 고르고', 44); set_text(sh[8], '나머지는 추천받습니다'); set_text(sh[9], '담은 것은 두고 빈자리만 채웁니다')
    set_text(sh[11], '장보기까지 한 번에'); set_text(sh[12], '5일치', 48); set_text(sh[13], '1인분 장보기 목록이 따라옵니다'); set_text(sh[14], '식단표는 냉장고 그림 · 인쇄는 A4 한 장')
    set_text(sh[16], '처음이라도'); set_text(sh[17], ''); set_text(sh[18], '움직이는 사용법', 36); set_text(sh[19], '손가락이 눌러 가며 보여 드립니다'); set_text(sh[20], '음성 안내 · 글자 더 크게')
    set_text(sh[22], '이렇게 쓰실 수 있습니다'); set_text(sh[23], '가이드 → 사용법에서 언제든 다시 보실 수 있습니다 · 집에 있는 재료는 장보기에서 빠집니다')
    move_slide(prs, len(prs.slides) - 1, 8)
    S = list(prs.slides)
    for sh in S[10].shapes:
        if sh.has_text_frame and '하루 세 끼 한식 상차림을 추천합니다' in sh.text_frame.text:
            set_lines(sh, ['암종·치료 단계·드시는 약에 맞춰', '하루 세 끼, 닷새까지 한식 상차림과 장보기 목록을'])
    renumber(prs)
    prs.save(PAT)
    print(f'하루차림-환자-발표.pptx: {len(prs.slides)}장')


general()
patient()
