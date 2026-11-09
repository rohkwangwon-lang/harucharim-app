# 장면 시간표 + 나레이션 한 줄 잇기. 사용: python3 timeline.py <voice 폴더>
import json,wave,sys
VD=sys.argv[1] if len(sys.argv)>1 else 'voice'
P=[0,7,15,22,28,37,44,52,60.6,68,76.4,82.5]
secs=json.load(open(f'{VD}/secs.json'))
LEAD,TAIL,END_HOLD=0.5,0.8,2.2
segs=[];v=0.0;starts=[]
for i in range(len(P)-1):
    dp=P[i+1]-P[i]
    dv=max(dp,LEAD+secs[i]+(END_HOLD if i==len(P)-2 else TAIL))
    segs.append([round(v,4),round(dv,4),P[i],dp]); starts.append(v); v+=dv
segs[0][2],segs[0][3]=3.6,3.4   # 첫 장면은 제목이 다 보인 채로 시작(카카오 미리보기 그림)
total=round(v,3)
json.dump({'segs':segs,'total':total},open('timeline.json','w'))
print('총',total,'초',[round(s[1],2) for s in segs])
SR=24000; buf=bytearray((int(total*SR)+SR)*2)
for i,st in enumerate(starts):
    w=wave.open(f'{VD}/{i:02d}.wav'); assert w.getframerate()==SR and w.getnchannels()==1 and w.getsampwidth()==2
    d=w.readframes(w.getnframes()); off=int((st+LEAD)*SR)*2; buf[off:off+len(d)]=d
o=wave.open('narration.wav','wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(bytes(buf[:int(total*SR)*2])); o.close()
