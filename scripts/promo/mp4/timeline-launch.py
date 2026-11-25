# 출시 영상 시간표 + 나레이션 잇기(2026-11-25). timeline.py 와 같되 장면 경계를 <작업폴더>/P.json 에서 읽는다.
# 사용(작업폴더에서): python3 <이 파일> <voice 폴더>
import json,wave,sys
VD=sys.argv[1] if len(sys.argv)>1 else 'voice'
P=json.load(open('P.json'))
secs=json.load(open(f'{VD}/secs.json'))
assert len(secs)==len(P)-1, f'나레이션 {len(secs)}줄 · 장면 {len(P)-1}개'
LEAD,TAIL,END_HOLD=0.5,0.8,2.5
segs=[];v=0.0;starts=[]
for i in range(len(P)-1):
    dp=P[i+1]-P[i]
    dv=max(dp,LEAD+secs[i]+(END_HOLD if i==len(P)-2 else TAIL))
    segs.append([round(v,4),round(dv,4),P[i],dp]); starts.append(v); v+=dv
segs[0][2],segs[0][3]=2.6,P[1]-2.6   # 첫 장면은 제목이 보인 채로 시작(미리보기 그림이 빈 화면이 되지 않게)
total=round(v,3)
json.dump({'segs':segs,'total':total},open('timeline.json','w'))
print('총',total,'초',[round(s[1],2) for s in segs])
SR=24000; buf=bytearray((int(total*SR)+SR)*2)
for i,st in enumerate(starts):
    w=wave.open(f'{VD}/{i:02d}.wav'); assert w.getframerate()==SR and w.getnchannels()==1 and w.getsampwidth()==2
    d=w.readframes(w.getnframes()); off=int((st+LEAD)*SR)*2; buf[off:off+len(d)]=d
o=wave.open('narration.wav','wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(bytes(buf[:int(total*SR)*2])); o.close()
