// 手机遥控网页（手机模式下由船上的 ESP32 提供，地址 http://192.168.4.1）
// 一个摇杆：手指按下的位置就是中心，上下 = 油门，左右 = 转向，松手回 0。
// 每 50 ms 通过 WebSocket 发一次 "x,y"（-1..1），船超过 0.5 s 收不到就停。
// 船回传 {"v":电压,"r":信号dBm,"t":修正%,"c":芯片温度°C,"l":左电机输出%,"m":右电机输出%,"s":状态}。
// 电机没有测速，显示的是固件给的输出（PWM 占空比，正 = 前进）。
// 直线修正：右下角 ◀ ▶，发 "t,-1" / "t,1"；长按中间的数字 1 秒归零（发 "t,0"）。
#pragma once
static const char PHONE_PAGE[] = R"HTML(<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>QB12</title>
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#14202c;color:#e8eef4;font:15px -apple-system,sans-serif;
  -webkit-user-select:none;user-select:none;touch-action:none}
canvas{position:fixed;inset:0;width:100%;height:100%}
#bar{position:fixed;left:14px;top:10px;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;opacity:.9;z-index:2;pointer-events:none;font-size:14px}
#bar i{font-style:normal;opacity:.6;margin-right:4px}
#mot{position:fixed;left:14px;bottom:12px;display:flex;gap:10px;align-items:flex-end;z-index:2;pointer-events:none;font-size:12px;opacity:.85}
.mb{width:16px;height:80px;background:#22344a;border-radius:4px;position:relative;overflow:hidden}
.mb div{position:absolute;left:0;right:0;background:#3498db}
.mc{text-align:center}
.dot{width:10px;height:10px;border-radius:5px;background:#c0392b}
#warn{position:fixed;left:25%;right:25%;top:44px;border-radius:8px;padding:8px;text-align:center;background:#c0392b;font-size:18px;font-weight:700;display:none;z-index:3}
#trim{position:fixed;right:12px;bottom:12px;display:flex;gap:8px;align-items:center;z-index:2;opacity:.8}
#trim button{font:16px sans-serif;width:40px;height:36px;border-radius:8px;border:1px solid #3d5266;background:#22344a;color:#e8eef4}
#tv{min-width:44px;text-align:center;font-size:13px}
</style></head><body>
<canvas id="c"></canvas>
<div id="bar"><span class="dot" id="dot"></span><span><i>电量</i><b id="bp">-</b> <span id="v"></span></span><span><i>信号</i><b id="r">-</b></span><span><i>温度</i><b id="tc">-</b></span><span id="s" style="color:#f5b041"></span></div>
<div id="mot"><div class="mc"><div class="mb"><div id="lb"></div></div><div id="lt">左 0</div></div><div class="mc"><div class="mb"><div id="rb"></div></div><div id="rt">右 0</div></div></div>
<div id="warn">信号弱，往回开</div>
<div id="trim"><button data-t="-1">◀</button><span id="tv">直线 0</span><button data-t="1">▶</button></div>
<script>
const R=80;                               // 摇杆满量程（像素）
const cv=document.getElementById('c'),g=cv.getContext('2d'),$=id=>document.getElementById(id);
let p=null,ax=0,ay=0;                     // p：当前触点 {id,x0,y0,x,y}
function rs(){cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio;g.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
addEventListener('resize',rs);rs();
const cl=v=>Math.max(-1,Math.min(1,v));
function onT(e){e.preventDefault();
  for(const t of e.changedTouches){
    if(e.type==='touchstart'){if(!p)p={id:t.identifier,x0:t.clientX,y0:t.clientY,x:t.clientX,y:t.clientY}}
    else if(p&&p.id===t.identifier){if(e.type==='touchmove'){p.x=t.clientX;p.y=t.clientY}else p=null}}
  ax=p?cl((p.x-p.x0)/R):0;ay=p?cl(-(p.y-p.y0)/R):0}
['touchstart','touchmove','touchend','touchcancel'].forEach(n=>cv.addEventListener(n,onT,{passive:false}));
function draw(){const W=innerWidth,H=innerHeight;g.clearRect(0,0,W,H);
  if(!p){g.fillStyle='#5d7185';g.font='17px sans-serif';g.textAlign='center';g.fillText('按住屏幕任意位置拖动',W/2,H/2)}
  else{g.strokeStyle='#5dade2';g.lineWidth=2;g.beginPath();g.arc(p.x0,p.y0,R,0,7);g.stroke();
    g.fillStyle='#3498db';g.beginPath();g.arc(p.x0+ax*R,p.y0-ay*R,30,0,7);g.fill()}
  requestAnimationFrame(draw)}
draw();
let ws=null,last=0;
function ok(on){$('dot').style.background=on?'#27ae60':'#c0392b'}
function conn(){ws=new WebSocket('ws://'+location.host+'/ws');
  ws.onclose=()=>{ok(false);setTimeout(conn,1000)};
  ws.onmessage=m=>{last=Date.now();ok(true);try{const d=JSON.parse(m.data);
    $('bp').textContent=pct(d.v)+'%';$('v').textContent=d.v.toFixed(2)+' V';
    $('r').textContent=d.r?d.r+' dBm':'-';$('tc').textContent=d.c?d.c+' °C':'-';$('s').textContent=d.s==='正常'?'':d.s;
    bar('lb','lt','左',d.l);bar('rb','rt','右',d.m);
    $('tv').textContent='直线 '+(d.t>0?'右':d.t<0?'左':'')+Math.abs(d.t);
    const weak=d.r&&d.r<-78;$('warn').style.display=weak?'block':'none';if(weak&&navigator.vibrate)navigator.vibrate(150)}catch(e){}}}
// 1S 锂电池静置电压 → 电量（电机转时电压会掉，读数偏低）
const CURVE=[[3.30,0],[3.50,5],[3.60,10],[3.70,25],[3.75,40],[3.80,55],[3.85,65],[3.90,75],[4.00,85],[4.10,95],[4.20,100]];
function pct(v){if(v<=CURVE[0][0])return 0;for(let i=1;i<CURVE.length;i++){const[a,pa]=CURVE[i-1],[b,pb]=CURVE[i];
  if(v<=b)return Math.round(pa+(pb-pa)*(v-a)/(b-a))}return 100}
// 电机输出条：中线以上前进、以下后退
function bar(id,tid,n,v){const e=$(id),h=Math.min(Math.abs(v),100)/2;e.style.height=h+'%';
  if(v>=0){e.style.bottom='50%';e.style.top='';e.style.background='#3498db'}else{e.style.top='50%';e.style.bottom='';e.style.background='#e67e22'}
  $(tid).textContent=n+' '+(v>0?'+':'')+v}
conn();
const send=m=>{if(ws&&ws.readyState===1)ws.send(m)};
setInterval(()=>{if(!document.hidden)send(ax.toFixed(2)+','+ay.toFixed(2));if(Date.now()-last>1500)ok(false)},50);
// 直线修正：船往左偏点 ▶，往右偏点 ◀；长按中间的数字 1 秒归零
document.querySelectorAll('#trim button').forEach(b=>b.addEventListener('touchstart',e=>{e.preventDefault();send('t,'+b.dataset.t)},{passive:false}));
let hold=null;const tv=$('tv');
tv.addEventListener('touchstart',e=>{e.preventDefault();hold=setTimeout(()=>send('t,0'),1000)},{passive:false});
tv.addEventListener('touchend',()=>clearTimeout(hold));
</script></body></html>)HTML";
