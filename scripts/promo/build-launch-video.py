# -*- coding: utf-8 -*-
"""앱스토어 출시 영상(2026-11-25) — 인스타그램 릴스·암 환자 카페용. 움직이는 HTML 한 파일(세로 1080×1920).

비공개 테스트 영상(build-recruit-video.py)과 같은 장면 엔진·같은 MP4 길(scripts/promo/mp4/).
숫자와 판정 예시는 docs/보고서/numbers.json 에서만 읽는다.

환자용 말 규칙(docs/홍보/게시물-문구.md 0절 · 앱스토어-출시/README.md):
 App Store 만 싣고 안드로이드는 '출시 예정'만 · '무료'·'전문의가 만든' 없음 · 효능 없음 · 별점·리뷰 부탁 없음

    python3 scripts/promo/build-launch-video.py
    → docs/홍보/앱스토어-출시/출시-영상.html (브라우저에서 재생)
    → <작업폴더>/site/video.html (mp4/capture.mjs 가 찍는 판) — 작업폴더는 첫 인자, 없으면 만들지 않음
"""
import base64, io, json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = json.load(open(os.path.join(ROOT, 'docs/보고서/numbers.json'), encoding='utf8'))
OUT = os.path.join(ROOT, 'docs/홍보/앱스토어-출시')

# 장면 경계(초). scripts/promo/mp4/timeline-launch.py 가 같은 값을 쓴다 — 바꾸면 함께.
P = [0, 6, 13, 19.5, 26.5, 33, 38, 47]
END = P[-1]


def shot(name):
    im = Image.open(os.path.join(ROOT, f'docs/출시/스크린샷/{name}')).convert('RGB')
    w, h = im.size
    im = im.crop((int(w * .115), 575, int(w * .885), 2760))
    im = im.resize((760, int(im.height * 760 / im.width)))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=80, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


S1, S2 = shot('1-suggest.png'), shot('2-why.png')
LV = {'avoid': ('피하세요', 'a'), 'caution': ('주의', 'c'), 'prefer': ('권장', 'p'), 'info': ('참고', 'i')}
BOWL = ('<svg viewBox="90 96 332 372" aria-hidden="true"><rect x="112" y="227" width="288" height="24" rx="12" fill="currentColor"/>'
        '<path d="M112 299a144 164 0 0 0 288 0z" fill="currentColor"/><ellipse cx="227.5" cy="175.5" rx="37.5" ry="52" fill="currentColor"/>'
        '<ellipse cx="284" cy="163.5" rx="37.5" ry="52" fill="currentColor"/></svg>')


def verdict(ex, at):
    a, b = ex['a'], ex['b']
    return (f'<div class="vd" data-in="{at:.1f}"><h3>{ex["food"]}</h3>'
            f'<div class="vrow"><span>{a["who"]}</span><b class="lv {LV[a["level"]][1]}">{LV[a["level"]][0]}</b></div>'
            f'<div class="vrow"><span>{b["who"]}</span><b class="lv {LV[b["level"]][1]}">{LV[b["level"]][0]}</b></div></div>')


VERDICTS = ''.join(verdict(ex, 7.6 + i * 1.2) for i, ex in enumerate(N['examples']))
INPUTS = [(N['cancers'], '암 종류'), (N['phases'], '치료 시기'), (N['conditions'], '증상·상태'), (N['meds'], '드시는 약'), (N['allergens'], '알레르기')]
INPUT_HTML = ''.join(f'<div class="inrow" data-in="{14.0 + i * .5:.1f}"><b data-count="{v}" data-at="{14.0 + i * .5:.1f}">0</b><span>{t}</span></div>'
                     for i, (v, t) in enumerate(INPUTS))
EVID = [(N['references'], '종', '참고 문헌 — 요약이 아니라 원문으로 확인'), (N['total'], '개', '판단 기준 · 판정마다 근거 등급과 출처')]
EVID_HTML = ''.join(f'<div class="trow" data-in="{20.8 + i * .9:.1f}"><b data-count="{v}" data-at="{20.9 + i * .9:.1f}">0</b><i>{u}</i><span>{t}</span></div>'
                    for i, (v, u, t) in enumerate(EVID))
LEGAL = '하루차림은 의료기기가 아니며 진단·치료를 목적으로 하지 않습니다. 치료에 관한 결정은 담당 의료진과 상의해 주세요. 만 14세 이상 이용할 수 있습니다.'

html = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>하루차림 App Store 출시 영상</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
:root{{--rice:#faf9f4;--ink:#282621;--soft:#5e5a4e;--line:#e4e1d6;--leaf:#3d5630;--leaf2:#628548;--wash:#eef2e6;--soy:#875326;--soywash:#f4e5d2;--outer:#2a3821;--a:#a3362b;--c:#a8730f;--p:#3f6b2c;--i:#5e5a4e}}
*{{box-sizing:border-box}}html,body{{height:100%;margin:0}}body{{background:var(--outer);overflow:hidden;font-family:'Noto Sans KR','Apple SD Gothic Neo',system-ui,sans-serif;color:var(--ink)}}
#fit{{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}}#holder{{position:relative;flex:none}}
#stage{{position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:0 0;overflow:hidden;background:var(--rice);word-break:keep-all;cursor:pointer}}
h1,h2,h3{{margin:0;font-family:'Gowun Batang',serif;color:var(--leaf);line-height:1.22}}
.scene{{position:absolute;inset:0;padding:150px 84px 170px;opacity:0;visibility:hidden;transition:opacity .45s ease;display:flex;flex-direction:column;justify-content:center}}.scene.show{{opacity:1;visibility:visible}}
[data-in]{{opacity:0;transform:translateY(34px);transition:opacity .55s ease,transform .6s cubic-bezier(.2,.8,.2,1)}}[data-in].on{{opacity:1;transform:none}}
.eyebrow{{color:var(--soy);font-size:42px;font-weight:500;margin:0 0 30px}}
.big{{font-size:132px}}.mid{{font-size:84px}}.body{{font-size:46px;line-height:1.6;color:var(--soft);margin:38px 0 0}}.body strong{{color:var(--ink)}}
.logo{{width:190px;height:190px;color:var(--leaf);margin:0 0 54px}}
.tag{{display:inline-block;align-self:flex-start;border:4px solid var(--leaf);color:var(--leaf);border-radius:99px;padding:12px 34px;font-size:40px;font-weight:700;margin:0 0 50px}}
.vd{{background:#fff;border:2px solid var(--line);border-radius:28px;padding:30px 40px;margin-top:26px}}.vd h3{{font-size:52px;margin-bottom:14px}}.vrow{{display:flex;justify-content:space-between;align-items:center;font-size:38px;color:var(--soft);padding:6px 0}}
.lv{{color:#fff;font-weight:500;font-size:34px;padding:6px 24px;border-radius:10px;white-space:nowrap}}.lv.a{{background:var(--a)}}.lv.c{{background:var(--c)}}.lv.p{{background:var(--p)}}.lv.i{{background:var(--i)}}
.inrow{{display:flex;align-items:baseline;gap:32px;padding:22px 0;border-bottom:2px solid var(--line)}}.inrow b{{font-family:'Gowun Batang',serif;font-size:112px;color:var(--leaf);min-width:210px;font-variant-numeric:tabular-nums;line-height:1}}.inrow span{{font-size:52px}}
.trow{{padding:32px 0;border-bottom:2px solid var(--line)}}.trow b{{font-family:'Gowun Batang',serif;font-size:136px;color:var(--soy);font-variant-numeric:tabular-nums;line-height:1.1}}.trow i{{font-style:normal;font-size:58px;color:var(--soy);margin-left:8px}}.trow span{{display:block;font-size:42px;color:var(--soft);margin-top:6px}}
.unk{{margin-top:44px;background:var(--soywash);border-radius:26px;padding:30px 38px;font-size:44px;line-height:1.5}}.unk b{{color:var(--soy)}}
.phones{{position:relative;height:1020px;margin-top:44px;overflow:hidden;border-radius:30px}}.phones img{{position:absolute;width:520px;border-radius:40px;box-shadow:0 24px 60px rgba(61,86,48,.25);background:#fff}}.phones .p1{{left:0;top:0}}.phones .p2{{right:0;top:100px}}
.lock{{width:300px;height:300px;margin:0 0 50px;border-radius:50%;background:var(--wash);display:flex;align-items:center;justify-content:center;color:var(--leaf)}}.lock svg{{width:150px;height:150px}}
.dark{{background:var(--leaf)}}.dark h1,.dark h2{{color:#fff}}.dark .body{{color:#e6ecdb}}.dark .body strong{{color:#fff}}.dark .eyebrow{{color:#e7cba7}}.dark .tag{{border-color:#fff;color:#fff}}
.store{{margin-top:60px;background:#fff;border-radius:34px;padding:44px 50px;display:flex;align-items:center;gap:40px}}.store .ic{{width:150px;height:150px;border-radius:34px;background:var(--leaf);color:#fff;display:flex;align-items:center;justify-content:center;flex:none}}.store .ic svg{{width:104px;height:104px}}.store b{{display:block;font-family:'Gowun Batang',serif;font-size:66px;color:var(--leaf);line-height:1.2}}.store span{{font-size:38px;color:var(--soft)}}
.soon{{font-size:42px;color:#e6ecdb;margin:40px 0 0}}
.legal{{font-size:30px;color:#cfd9bf;line-height:1.6;margin-top:56px}}
#bar{{position:absolute;left:0;bottom:0;height:12px;background:var(--leaf2);width:0}}#hint{{position:absolute;right:40px;top:40px;font-size:28px;color:var(--soft);background:rgba(255,255,255,.85);border-radius:99px;padding:10px 24px;opacity:0;transition:opacity .3s}}#hint.on{{opacity:1}}
#again{{position:absolute;left:84px;right:84px;bottom:110px;height:130px;border:0;border-radius:24px;background:#fff;color:var(--leaf);font:700 46px 'Noto Sans KR',sans-serif;cursor:pointer;display:none}}#again.on{{display:block}}#again:focus-visible{{outline:6px solid var(--soywash)}}
.still [data-in],.still .scene{{transition:none}}
</style></head><body><div id="fit"><div id="holder"><div id="stage" role="img" aria-label="하루차림 App Store 출시 안내 영상">
<div class="scene" data-t="{P[0]},{P[1]}"><svg class="logo" data-in="0.2" viewBox="90 96 332 372" aria-hidden="true"><rect x="112" y="227" width="288" height="24" rx="12" fill="currentColor"/><path d="M112 299a144 164 0 0 0 288 0z" fill="currentColor"/><ellipse cx="227.5" cy="175.5" rx="37.5" ry="52" fill="currentColor"/><ellipse cx="284" cy="163.5" rx="37.5" ry="52" fill="currentColor"/></svg>
<h1 class="big" data-in=".6">“뭘 먹어야<br>하나요?”</h1><p class="body" data-in="2.4">진료실에서 가장 자주 듣는<br>질문입니다.</p></div>
<div class="scene" data-t="{P[1]},{P[2]}"><p class="eyebrow" data-in="6.2">앱이 실제로 내리는 판정</p><h2 class="mid" data-in="6.5">같은 음식도<br>사람마다 다릅니다</h2>{VERDICTS}</div>
<div class="scene" data-t="{P[2]},{P[3]}"><p class="eyebrow" data-in="13.2">내 상황을 넣으면</p><h2 class="mid" data-in="13.5">나에게 맞춘 답을</h2><div style="margin-top:34px">{INPUT_HTML}</div></div>
<div class="scene" data-t="{P[3]},{P[4]}"><p class="eyebrow" data-in="19.7">왜 권하는지, 어디서 나온 말인지</p><h2 class="mid" data-in="20">모든 판정에<br>출처를 붙였습니다</h2><div style="margin-top:20px">{EVID_HTML}</div><p class="unk" data-in="23.6">근거가 없는 것은<br><b>“아직 모릅니다”</b>라고 적었습니다.</p></div>
<div class="scene" data-t="{P[4]},{P[5]}"><h2 class="mid" data-in="26.7">하루 세 끼를<br>한국식 한 상으로</h2><p class="body" data-in="27.3">길게는 {N['planDays']}일 치까지, 장보기 목록도.<br>음식마다 이유와 출처가 함께.</p><div class="phones"><img class="p1" data-in="27.9" src="{S1}" alt=""><img class="p2" data-in="28.8" src="{S2}" alt=""></div></div>
<div class="scene" data-t="{P[5]},{P[6]}"><div class="lock" data-in="33.2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18.5h4"/><rect x="9.5" y="8.5" width="5" height="4.5" rx="1"/><path d="M10.5 8.5V7.3a1.5 1.5 0 0 1 3 0v1.2"/></svg></div>
<h2 class="mid" data-in="33.5">기록은<br>이 휴대폰 안에만</h2><p class="body" data-in="34.4">적어 두신 체중과 식단은<br>서버로 보내지 않습니다.</p></div>
<div class="scene dark" data-t="{P[6]},999"><span class="tag" data-in="38.2">App Store 출시</span><h1 class="big" data-in="38.5" style="font-size:118px">하루차림</h1><p class="body" data-in="39.2">암 치료 중 식사,<br>근거를 붙여 하루 세 끼로.</p>
<div class="store" data-in="40.4"><div class="ic">{BOWL}</div><div><b>App Store</b><span>에서 ‘하루차림’ 검색</span></div></div>
<p class="soon" data-in="41.6">안드로이드 앱은 출시 예정입니다.</p><p class="legal" data-in="42.4">{LEGAL}</p><button id="again" type="button">처음부터 다시 보기</button></div>
<div id="bar"></div><div id="hint">일시정지</div>
</div></div></div>
<script>
(function(){{
  var END={END},stage=document.getElementById('stage'),holder=document.getElementById('holder'),bar=document.getElementById('bar'),hint=document.getElementById('hint'),again=document.getElementById('again');
  var still=false;try{{still=matchMedia('(prefers-reduced-motion: reduce)').matches}}catch(e){{}}
  if(still)document.documentElement.classList.add('still');
  function fit(){{var s=Math.min(innerWidth/1080,innerHeight/1920);stage.style.transform='scale('+s+')';holder.style.width=1080*s+'px';holder.style.height=1920*s+'px'}}
  addEventListener('resize',fit);fit();
  var scenes=[].map.call(document.querySelectorAll('.scene'),function(el){{var t=el.getAttribute('data-t').split(',').map(Number);return{{el:el,a:t[0],b:t[1]}}}});
  var items=[].map.call(document.querySelectorAll('[data-in]'),function(el){{return{{el:el,at:Number(el.getAttribute('data-in'))}}}});
  var counts=[].map.call(document.querySelectorAll('[data-count]'),function(el){{return{{el:el,to:Number(el.getAttribute('data-count')),at:Number(el.getAttribute('data-at'))}}}});
  var t=0,last=null,paused=false,done=false;
  function draw(){{
    scenes.forEach(function(s){{s.el.classList.toggle('show',t>=s.a&&t<s.b)}});
    items.forEach(function(i){{i.el.classList.toggle('on',t>=i.at)}});
    counts.forEach(function(c){{var p=Math.max(0,Math.min(1,(t-c.at)/1.3));if(still)p=t>=c.at?1:0;var e=1-Math.pow(1-p,3);c.el.textContent=Math.round(c.to*e).toLocaleString('ko-KR')}});
    bar.style.width=Math.min(100,t/END*100)+'%';
    again.classList.toggle('on',t>=END);
  }}
  function tick(now){{
    if(last===null)last=now;
    if(!paused&&!done){{t+=(now-last)/1000;if(t>=END){{t=END;done=true}}draw()}}
    last=now;requestAnimationFrame(tick)
  }}
  stage.addEventListener('click',function(e){{if(e.target===again||done)return;paused=!paused;hint.classList.toggle('on',paused)}});
  again.addEventListener('click',function(){{t=0;done=false;paused=false;hint.classList.remove('on');draw()}});
  addEventListener('keydown',function(e){{if(e.code==='Space'&&!done){{e.preventDefault();paused=!paused;hint.classList.toggle('on',paused)}}}});
  var m=/[#&]t=([\\d.]+)/.exec(location.hash);if(m){{t=Number(m[1]);paused=true}}
  draw();requestAnimationFrame(tick);
}})();
</script></body></html>"""

open(os.path.join(OUT, '출시-영상.html'), 'w', encoding='utf8').write(html)
print('출시-영상.html', round(len(html) / 1024), 'KB · 길이', END, '초')
if len(sys.argv) > 1:
    site = os.path.join(sys.argv[1], 'src')
    os.makedirs(site, exist_ok=True)
    open(os.path.join(site, 'video.html'), 'w', encoding='utf8').write(html)
    json.dump(P, open(os.path.join(sys.argv[1], 'P.json'), 'w'))
    print('찍을 판:', site + '/video.html')
