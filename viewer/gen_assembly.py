"""生成 viewer/QB12_装配动画.html：可拖动旋转的 3D 整船装配动画。
船体、甲板、舱罩来自 outputs/QB12、泡棉条来自 hardware/hull/out 里的 STL（11-11 起船体和甲板分件）；PCB 用 KiCad 导出的真实 3D（pcb_preview.glb）；
电机、尾轴、桨、电池、橡皮筋、电机线按 build_model.py 的参数现画（尾轴线读 shaft_info.npy）。从仓库根目录运行：python viewer/gen_assembly.py"""
import base64, json
import numpy as np, trimesh
from scipy.spatial import ConvexHull
d = "outputs/QB12/"
B = "hardware/hull/out/"
shafts = np.load(B + "shaft_info.npy").tolist()          # [左 +y, 右 -y] × [a 内端口, b 出口]


def band_profile(cx, hook_y):
    """舱罩在 x=cx 的截面外轮廓（上半部分凸包，外扩 0.8），给橡皮筋用；两端接到挂钩 (±hook_y, 50)"""
    sec = trimesh.load(d + "QB12_canopy.stl").section(plane_origin=[cx, 0, 0], plane_normal=[1, 0, 0])
    P = np.vstack(sec.discrete)[:, 1:]
    P = P[P[:, 1] >= 44.5]
    h = P[ConvexHull(P).vertices]
    h = h[np.argsort(h[:, 0])]
    c = h.mean(axis=0)
    h = h + 0.8 * (h - c) / np.linalg.norm(h - c, axis=1, keepdims=True)
    return [[-hook_y, 50.0]] + [[round(float(y), 2), round(float(z), 2)] for y, z in h] + [[hook_y, 50.0]]


def enc(path):
    return base64.b64encode(open(path, "rb").read()).decode()


rep = json.load(open(B + "report.json"))
# 两个旋钮（松开位置）：按 y 拆开，各自以轴心为原点，动画里绕 z 转 ±90° 锁住
ko = trimesh.load(B + "QB12_knobs_open.stl")
knobs = []
for (kx, ky), part in zip(sorted(rep["knobs_xy"], key=lambda k: -k[1]), sorted(ko.split(only_watertight=False), key=lambda m: -m.centroid[1])):
    part = part.copy(); part.apply_translation((-kx, -ky, 0))
    knobs.append({"xy": [kx, ky], "stl": base64.b64encode(trimesh.exchange.stl.export_stl(part)).decode(), "ang": 90.0 if ky > 0 else -90.0})
data = {"hull": enc(d + "QB12_hull.stl"), "deck": enc(d + "QB12_deck.stl"), "canopy": enc(d + "QB12_canopy.stl"),
        "gasket": enc(B + "QB12_gasket_placed.stl"), "knobs": knobs, "slide": rep["slide"],
        "pcb": enc("viewer/pcb_preview.glb"), "shafts": shafts,
        "bands": [[60.0, band_profile(60.0, 47.0)], [182.0, band_profile(182.0, 33.0)]]}
html = r'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QB12 装配动画</title>
<style>html,body{margin:0;height:100%;background:#e8ecf0;color:#2a3440;font:14px -apple-system,sans-serif;overflow:hidden}#c{position:fixed;inset:0;width:100%;height:100%}
#ui{position:fixed;left:10px;top:10px;right:10px;z-index:2}button{margin:2px;padding:6px 11px;border:1px solid #b6c0ca;background:#fff;color:#2a3440;border-radius:6px;cursor:pointer;font-size:13px}button.on{background:#1f3a5f;color:#fff;border-color:#1f3a5f}
#cap{font-size:17px;font-weight:600;margin:6px 4px 0;text-shadow:none}#sub{font-size:13px;margin:2px 4px;opacity:.75;text-shadow:none}#hint{position:fixed;left:10px;bottom:8px;opacity:.6;font-size:12px}
#load{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#e8ecf0;z-index:5;font-size:16px}</style></head><body>
<div id="load">正在加载模型…</div>
<div id="ui"><div><button id="play">暂停</button><button id="prev">上一步</button><button id="next">下一步</button><button id="xray" class="on">船体透视</button><button id="v1">看右浮体</button><button id="v2">看全貌</button><button id="v3">看电子舱</button></div><div id="cap"></div><div id="sub"></div></div>
<div id="hint">左键转，右键平移，滚轮缩放；单位 mm。颜色：银=尾轴，淡蓝=联轴器，石墨灰=电机，蓝紫=电池，绿=PCB，青=桨，白=舱罩，深灰=甲板，橙=泡棉密封条，红=旋钮，黑环=橡皮筋</div><canvas id="c"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
const D=__DATA__;
const r=new THREE.WebGLRenderer({canvas:document.getElementById("c"),antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,2));
const s=new THREE.Scene();s.background=new THREE.Color(0xe8ecf0);
const cam=new THREE.PerspectiveCamera(40,1,1,3000);const ctl=new THREE.OrbitControls(cam,r.domElement);ctl.enableDamping=true;
s.add(new THREE.HemisphereLight(0xffffff,0x9aa6b2,.95));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(200,400,300);s.add(dl);
const W=new THREE.Group();W.rotation.x=-Math.PI/2;s.add(W);              // 模型坐标 z 向上 -> 场景 y 向上
const grid=new THREE.GridHelper(500,50,0xb8c2cc,0xd3dae1);grid.position.set(120,-6,0);s.add(grid);
function b64(x){const a=atob(x),u=new Uint8Array(a.length);for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i);return u.buffer}
const ld=new THREE.STLLoader();
const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.45,metalness:.3},o));
const hullMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,transparent:true,opacity:.5,depthWrite:false,side:THREE.FrontSide});
function paintHull(g){const p=g.attributes.position,n=p.count,col=new Float32Array(n*3),C=(h)=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
const deck=C(0x4a525c),red=C(0xa8383a),hull=C(0xd3d9df);
for(let i=0;i<n;i+=3){const ax=p.getX(i+1)-p.getX(i),ay=p.getY(i+1)-p.getY(i),az=p.getZ(i+1)-p.getZ(i),bx=p.getX(i+2)-p.getX(i),by=p.getY(i+2)-p.getY(i),bz=p.getZ(i+2)-p.getZ(i);
let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const l=Math.hypot(nx,ny,nz)||1;nz/=l;const z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
const c=(nz>.8&&z>=43)?deck:((z<19.3&&nz<.6)?red:hull);for(let k=0;k<3;k++)col.set(c,(i+k)*3);}
g.setAttribute("color",new THREE.BufferAttribute(col,3));}
const hullGeo=ld.parse(b64(D.hull));paintHull(hullGeo);const hull=new THREE.Mesh(hullGeo,hullMat);hull.renderOrder=1;W.add(hull);
const edgeMat=new THREE.LineBasicMaterial({color:0x5d6b78,transparent:true,opacity:.45});
const edges=new THREE.LineSegments(new THREE.EdgesGeometry(hullGeo,35),edgeMat);W.add(edges);
// 甲板（分缝 z=40 以上，含电机鼓包）：单独一件，用螺丝固定在船体上
const deckMat=new THREE.MeshStandardMaterial({color:0x4a525c,roughness:.6,transparent:true,opacity:.5,depthWrite:false});
const deckGeo=ld.parse(b64(D.deck));const deck=new THREE.Group();const deckM=new THREE.Mesh(deckGeo,deckMat);deckM.renderOrder=1;deck.add(deckM);
const deckEdges=new THREE.LineSegments(new THREE.EdgesGeometry(deckGeo,35),edgeMat);deck.add(deckEdges);W.add(deck);
const gasket=new THREE.Mesh(ld.parse(b64(D.gasket)),mat(0xf08a24,{metalness:0,roughness:.9}));W.add(gasket);
// 船尾 2 个旋钮扣：跟着甲板走（甲板组的子物体），第 9 步绕自己的轴转 90° 锁住
const knobG=[];
for(const k of D.knobs){const g=new THREE.Group();g.position.set(k.xy[0],k.xy[1],0);g.add(new THREE.Mesh(ld.parse(b64(k.stl)),mat(0xd9593f,{metalness:0,roughness:.5})));g.userData.ang=k.ang*Math.PI/180;deck.add(g);knobG.push(g)}
const canMat=new THREE.MeshStandardMaterial({color:0xf2f4f7,roughness:.45,metalness:0,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide});
const canopy=new THREE.Mesh(ld.parse(b64(D.canopy)),canMat);canopy.renderOrder=2;W.add(canopy);
function cyl(r,s0,s1,m,seg=40){const g=new THREE.CylinderGeometry(r,r,s1-s0,seg);g.rotateX(Math.PI/2);g.translate(0,0,(s0+s1)/2);return new THREE.Mesh(g,m)}
const sides=[];
for(const sg of [1,-1]){
  const SH=D.shafts[sg>0?0:1],a=new THREE.Vector3(...SH[0]),b=new THREE.Vector3(...SH[1]),Lab=a.distanceTo(b);
  const lz=a.clone().sub(b).normalize(),lx=new THREE.Vector3(0,1,0),ly=new THREE.Vector3().crossVectors(lz,lx);
  const fr=new THREE.Group();fr.matrixAutoUpdate=false;fr.matrix.makeBasis(lx,ly,lz).setPosition(a);W.add(fr);
  // 尾轴 Ø2 × 136：前端伸出尾管内端口 4 mm 插进联轴器
  const shaft=new THREE.Group();shaft.add(cyl(1,4-136,4,mat(0xd0d4da)));fr.add(shaft);
  const motorWrap=new THREE.Group();W.add(motorWrap);
  const mf=new THREE.Group();mf.matrixAutoUpdate=false;mf.matrix.copy(fr.matrix);motorWrap.add(mf);
  mf.add(cyl(8.55,12,34.8,mat(0x46505a,{metalness:.35,roughness:.5})));mf.add(cyl(.75,5.2,12,mat(0xd0d4da)));
  mf.add(cyl(1.9,1.5,9.5,mat(0x4aa3df,{transparent:true,opacity:.85,metalness:0})));
  const prop=new THREE.Group();prop.add(cyl(4,-Lab-3.1,-Lab-2.1,mat(0xaaaaaa)));prop.add(cyl(3,-Lab-6.6,-Lab-3.1,mat(0x2fa39a,{metalness:.1})));
  for(const u of [-1,1]){const bl=new THREE.Mesh(new THREE.BoxGeometry(12,3,1.6),mat(0x2fa39a,{metalness:.1}));bl.position.set(u*8,0,-Lab-4.6);bl.rotation.x=0.5;prop.add(bl)}fr.add(prop);
  // 电机线：从电机后端（船头方向）出来，经桥甲板夹层绕过电池仓，到 PCB 接线座（右电机接 J4，左电机接 J3）
  const yc=sg>0?-4.4:-13.4, Pm=a.clone().addScaledVector(lz,38.4);
  const pts=[Pm,Pm.clone().add(new THREE.Vector3(2,0,1.5)),new THREE.Vector3(138,sg*46,37.5),new THREE.Vector3(128,sg*39,34.2),new THREE.Vector3(120,sg*30,34.5),new THREE.Vector3(118,yc+sg*4,35.5),new THREE.Vector3(113.2,yc,38.6)];
  const wire=new THREE.Group();
  [[0xe03030,-1.1],[0xe8e8e8,1.1]].forEach(([col,dy])=>{const q=pts.map(p=>p.clone().add(new THREE.Vector3(0,dy,0)));
    wire.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q),60,.9,8),mat(col,{metalness:0,roughness:.6})))});
  W.add(wire);
  sides.push({shaft,motorWrap,prop,fr,wire});
}
// 电池 603450：50×34×6，x 122.5..172.5，居中，放在仓里；仓外侧 4 个挂钩上挂 2 根橡皮筋
const batt=new THREE.Group();W.add(batt);
const bm=new THREE.Mesh(new THREE.BoxGeometry(50,34,6),mat(0x2a3f8f,{metalness:.1,roughness:.5}));bm.position.set(147.5,0,34.8);batt.add(bm);
// 电池线：从电池后端中部（y≈13.7，对着后墙缺口）出线，穿过缺口，插到 J2（船体坐标约 (111, 13.65)）
const wireB=new THREE.Group();
[[0xe03030,-1.0],[0x222222,1.0]].forEach(([col,dy])=>{const q=[[122.5,13.7,34.8],[120,13.7,35.2],[117.5,13.7,37.5],[114.2,13.65,39.3]].map(v=>new THREE.Vector3(v[0],v[1]+dy,v[2]));
  wireB.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q),40,.9,8),mat(col,{metalness:0,roughness:.6})))});
W.add(wireB);
const bandMat=mat(0x111111,{metalness:0,roughness:.8});
function band1(cx){ // 橡皮筋：两股并排横跨电池顶，两端绕过挂钩（y=±20.7）
  const L=20.7,R=1.6,z=38.3,pts=[];
  pts.push(new THREE.Vector3(cx-R,-L,z),new THREE.Vector3(cx-R,0,z),new THREE.Vector3(cx-R,L,z),new THREE.Vector3(cx,L+R,z),new THREE.Vector3(cx+R,L,z),new THREE.Vector3(cx+R,0,z),new THREE.Vector3(cx+R,-L,z),new THREE.Vector3(cx,-L-R,z));
  const c=new THREE.CatmullRomCurve3(pts,true,'catmullrom',.2);return new THREE.Mesh(new THREE.TubeGeometry(c,80,.6,6,true),bandMat)}
const bands1=new THREE.Group();for(const fx of [1/3,2/3])bands1.add(band1(122+51*fx));W.add(bands1);
function band2(cx,prof){ // 舱罩橡皮筋：两股，从一侧挂钩越过舱罩顶到另一侧挂钩（轮廓取自舱罩截面）
  const R=1.6,P=(dx,y,z)=>new THREE.Vector3(cx+dx,y,z),pts=[],n=prof.length,hy=prof[n-1][0];
  prof.forEach(([y,z])=>pts.push(P(-R,y,z)));pts.push(P(0,hy+R,50));
  prof.slice().reverse().forEach(([y,z])=>pts.push(P(R,y,z)));pts.push(P(0,-hy-R,50));
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true,'catmullrom',.15),160,.6,6,true),bandMat)}
const bands2=new THREE.Group();for(const [cx,prof] of D.bands)bands2.add(band2(cx,prof));W.add(bands2);
// PCB：KiCad 导出的真实 3D（米制、y 向上、板中心在原点、顶面朝 +y）-> 船体坐标：x=88-X，y=Z，z=板底+Y（接线座朝船头）
const pcb=new THREE.Group();W.add(pcb);
const pcbHolder=new THREE.Group();pcbHolder.matrixAutoUpdate=false;pcbHolder.matrix.set(-1000,0,0,88, 0,0,1000,0, 0,1000,0,35.8, 0,0,0,1);pcb.add(pcbHolder);
const STEPS=[
 ["0  准备：4 种打印件 + 泡棉条","船体 1 件（浮体、尾管、电机卡环、PCB 托盘、电池仓）、甲板 1 件（带两个电机鼓包、船头两块插舌）、舱罩 1 件、旋钮 2 个；1×3 mm 背胶泡棉条约 1 m。旋钮先装到甲板上：臂对准钥匙孔从上面插下去，转到指向船头。尾管两端是 Ø2.4 轴承孔，用尾轴来回转几下，抹硅脂",90],
 ["1  尾轴从船尾穿进尾管座","尾轴 Ø2，每根至少 136 mm。前端先停在管口里，让出电机的位置。尾管内端口高出水线约 4 mm，水最多升到水线，不会进舱",170],
 ["2  电机从上面直接按进卡环","甲板还没装，浮体整段敞开。电机轴上先套好联轴器，电机线先焊好。两个 C 形卡环开口比电机窄 1.2 mm，按下去咔一声卡住；前后有挡块，不用螺丝",180],
 ["3  从船尾把尾轴往船头推 5 mm","插进联轴器，两轴之间留约 1 mm",100],
 ["4  船尾装桨","先套垫片，再装桨；左右桨转向相反",130],
 ["5  PCB 从上面垂直放进托盘","接线座朝船头；四个卡扣压住板子，放下去会咔一声",150],
 ["6  电机线插到 J3、J4","右电机接 J4，左电机接 J3（试转时对调两根线就能改转向）。线从舱口围壁下沿（z=36）下面穿进电子舱。先通电试转，再装甲板",130],
 ["7  船体顶面密封槽里贴泡棉条","沿船体顶面一圈 3 mm 宽的槽贴 1×3 mm 背胶泡棉条，首尾对接不留缝",120],
 ["8  甲板往船尾错开 6 mm 平放，再往船头推 6 mm","旋钮先转到指向船头（松开）。甲板放下时两侧裙边插进船体对位、鼓包罩住电机；按住甲板往船头推，船头两块插舌滑进船体槽里，被槽顶压住",200],
 ["9  船尾两个旋钮各转 90° 锁住","旋钮头上的拧手指向舷外就是锁住，咔一下到位。旋钮下面的臂转到船体平台底下，把甲板往下拉、压紧泡棉条；臂后面有挡块，甲板退不回去",150],
 ["10  电池放进电池仓","603450（50 × 34 × 6 mm），底下贴双面泡棉胶；电池线穿过后墙缺口，插到 J2（PH2.0，先核对极性）",150],
 ["11  橡皮筋挂在仓外 4 个挂钩上","两根橡皮筋横跨电池顶，压住电池",110],
 ["12  舱罩从上面盖下去","裙边插进围壁，缝里先贴一圈泡棉密封；开机时手动取下舱罩拨 SW1（不用动甲板）",160],
 ["13  橡皮筋压住舱罩","两根橡皮筋越过舱罩顶：船尾一根挂在 x=60 两侧，船头一根挂在 x=182 两侧。装配完成，可以拖动旋转看全貌",150]];
const E=t=>{t=Math.min(Math.max(t,0),1);return t*t*(3-2*t)};
function apply(si,t){const e=E(t);
 for(const o of sides){
  o.shaft.visible=si>=1;let off=0;if(si==1)off=-(140)+(140-5)*e;else if(si==2)off=-5;else if(si==3)off=-5*(1-e);o.shaft.position.z=off;
  o.motorWrap.visible=si>=2;o.motorWrap.position.z=si==2?30*(1-e):0;
  o.prop.visible=si>=4;o.prop.position.z=si==4?-14*(1-e):0;
  o.wire.visible=si>=6;
 }
 pcb.visible=si>=5;pcb.position.z=si==5?30*(1-e):0;
 gasket.visible=si>=7;gasket.position.z=si==7?12*(1-e):0;
 deck.visible=si>=8;const e1=E(t*1.6),e2=E((t-.62)/.38);
 deck.position.z=si==8?45*(1-e1):0;deck.position.x=si==8?-D.slide*(1-e2):0;
 knobG.forEach(g=>{g.rotation.z=si<9?0:si==9?g.userData.ang*e:g.userData.ang});
 wireB.visible=si>10||(si==10&&t>.85);batt.visible=si>=10;batt.position.z=si==10?28*(1-e):0;
 bands1.visible=si>=11;bands1.position.z=si==11?10*(1-e):0;
 canopy.visible=si>=12;canopy.position.z=si==12?40*(1-e):0;
 bands2.visible=si>=13;bands2.position.z=si==13?14*(1-e):0;
 if(si==13&&t>=1)ctl.autoRotate=true;else ctl.autoRotate=false;
 document.getElementById("cap").textContent=STEPS[si][0];document.getElementById("sub").textContent=STEPS[si][1];}
ctl.autoRotateSpeed=1.2;
let si=0,fcount=0,playing=true,ready=false;
function setStep(i){si=(i+STEPS.length)%STEPS.length;fcount=0;apply(si,0)}
function pause(){playing=false;document.getElementById("play").textContent="播放"}
document.getElementById("play").onclick=function(){playing=!playing;this.textContent=playing?"暂停":"播放"};
document.getElementById("prev").onclick=()=>{pause();setStep(si-1);apply(si,1);fcount=STEPS[si][2]};
document.getElementById("next").onclick=()=>{pause();setStep(si+1);apply(si,1);fcount=STEPS[si][2]};
document.getElementById("xray").onclick=function(){this.classList.toggle("on");const on=this.classList.contains("on");hullMat.opacity=on?.28:1;hullMat.transparent=on;hullMat.depthWrite=!on;edges.visible=on;hullMat.needsUpdate=true;deckMat.opacity=on?.35:1;deckMat.transparent=on;deckMat.depthWrite=!on;deckMat.needsUpdate=true;deckEdges.visible=on;canMat.opacity=on?.6:1;canMat.transparent=on;canMat.depthWrite=!on;canMat.needsUpdate=true};
function view(p,t){cam.position.set(...p);ctl.target.set(...t);ctl.update()}
document.getElementById("v1").onclick=()=>view([130,150,40],[50,12,-55]);   // 场景坐标 (x, z, -y)
document.getElementById("v2").onclick=()=>view([-60,170,230],[100,15,0]);
document.getElementById("v3").onclick=()=>view([40,170,120],[115,35,0]);
function rs(){r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener("resize",rs);rs();
view([-60,170,230],[100,15,0]);
new THREE.GLTFLoader().parse(b64(D.pcb),"",g=>{g.scene.traverse(o=>{if(o.isMesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.color){m.emissive=m.color.clone().multiplyScalar(.55);m.emissiveIntensity=1;m.metalness=Math.min(m.metalness||0,.2);m.roughness=Math.max(m.roughness||0,.55);m.needsUpdate=true}})}});pcbHolder.add(g.scene);ready=true;document.getElementById("load").style.display="none";setStep(0)},e=>{console.error(e);ready=true;document.getElementById("load").style.display="none";setStep(0)});
(function loop(){requestAnimationFrame(loop);
 if(ready&&playing){fcount++;if(fcount>STEPS[si][2]+30){setStep(si+1)}else apply(si,fcount/STEPS[si][2])}
 ctl.update();r.render(s,cam)})();
</script></body></html>'''.replace("__DATA__", json.dumps(data))
open("viewer/QB12_装配动画.html", "w", encoding="utf-8").write(html)
print("ok", len(html))
