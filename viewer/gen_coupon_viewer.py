# 旧一体船体版，11-11 起不再使用
"""试件预览页：浮体段、盖板、压盖三件，可旋转。从仓库根目录运行：python viewer/gen_coupon_viewer.py"""
import base64, json
d = "outputs/QB12/"
fs = ["QB12_coupon_float_segment.stl", "QB12_coupon_cover.stl"]
data = {f: base64.b64encode(open(d + f, "rb").read()).decode() for f in fs}
html = r'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QB12 试件预览</title>
<style>html,body{margin:0;height:100%;background:#e8ecf0;color:#2a3440;font:14px -apple-system,sans-serif}#c{position:fixed;inset:0;width:100%;height:100%}
#ui{position:fixed;left:12px;top:12px;right:12px;z-index:2}button{margin:2px;padding:6px 12px;border:1px solid #b6c0ca;background:#fff;color:#2a3440;border-radius:6px;cursor:pointer}button.on{background:#1f3a5f;color:#fff}
#info{margin:8px 4px 0;max-width:640px;line-height:1.55}#info b{font-size:16px}#t{position:fixed;left:12px;bottom:10px;opacity:.7}</style></head><body><div id="ui"></div><canvas id="c"></canvas><div id="t">左键转，右键平移，滚轮缩放；单位 mm</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
const D=__DATA__;
const parts=[
 ["浮体段","QB12_coupon_float_segment.stl",0xd3d9df,"<b>浮体段</b>：右侧浮体 x 96–160 mm 的一段（11-11 改版），64 × 37 × 52 mm，体积 15.1 cm³。<br>验证：电机能不能从上面按进两个 C 形卡环（开口比电机窄 1.2 mm）、卡得牢不牢、会不会裂；尾管内端口；舱口导轨和两端矮墙。<br>材料：和整船同一种树脂（嘉立创 9600），这样试出来才算数。"],
 ["盖板","QB12_coupon_cover.stl",0x4a525c,"<b>盖板</b>：54 × 27 × 2.7 mm，体积 2.9 cm³，这里是倒扣打印的姿势（凸点朝上）。<br>验证：能不能顺着导轨槽推进去、咔一下卡住、拉得出来。槽单边留 0.3 mm。<br>材料：同整船。正式打 2 块，左右通用。"]];
const r=new THREE.WebGLRenderer({canvas:document.getElementById("c"),antialias:true});const s=new THREE.Scene();s.background=new THREE.Color(0xe8ecf0);
const cam=new THREE.PerspectiveCamera(40,1,1,3000);const ctl=new THREE.OrbitControls(cam,r.domElement);
s.add(new THREE.HemisphereLight(0xffffff,0x9aa6b2,.9));const dl=new THREE.DirectionalLight(0xffffff,.7);dl.position.set(200,300,400);s.add(dl);
s.add(new THREE.GridHelper(400,40,0xb8c2cc,0xd3dae1));
const ui=document.getElementById("ui");const bar=document.createElement("div");ui.appendChild(bar);const info=document.createElement("div");info.id="info";ui.appendChild(info);
const g=new THREE.Group();s.add(g);const meshes={};
function b64(x){const a=atob(x),u=new Uint8Array(a.length);for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i);return u.buffer}
const ld=new THREE.STLLoader();
function paint(g){const p=g.attributes.position,n=p.count,col=new Float32Array(n*3),C=(h)=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
const deck=C(0x4a525c),red=C(0xa8383a),hull=C(0xd3d9df);
for(let i=0;i<n;i+=3){const ax=p.getX(i+1)-p.getX(i),ay=p.getY(i+1)-p.getY(i),az=p.getZ(i+1)-p.getZ(i),bx=p.getX(i+2)-p.getX(i),by=p.getY(i+2)-p.getY(i),bz=p.getZ(i+2)-p.getZ(i);
let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const l=Math.hypot(nx,ny,nz)||1;nz/=l;const z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
const c=(nz>.8&&z>=43)?deck:hull;for(let k=0;k<3;k++)col.set(c,(i+k)*3);}
g.setAttribute("color",new THREE.BufferAttribute(col,3));}
const infos={};
parts.forEach(([n,f,c,t],i)=>{const geo=ld.parse(b64(D[f]));if(i==0)paint(geo);
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:i==0,color:i==0?0xffffff:c,roughness:.7,metalness:0}));
 m.rotation.x=-Math.PI/2;meshes[n]=m;infos[n]=t;
 const bt=document.createElement("button");bt.textContent=n;bt.onclick=()=>show(n);bar.appendChild(bt);});
// 「全部」：三件摆在一起（模型坐标，盖板和压盖放在浮体段外侧）
meshes["浮体段"].geometry.computeBoundingBox();
function layout(){const seg=meshes["浮体段"].geometry.boundingBox;
 [["盖板",[63,95]],["压盖",[63,118]]].forEach(([n,[cx,cy]])=>{const m=meshes[n];m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;
  m.userData.home=new THREE.Vector3(cx-(b.min.x+b.max.x)/2,cy-(b.min.y+b.max.y)/2,seg.min.z-b.min.z);});}
layout();
function show(n){[...bar.children].forEach(b=>b.classList.toggle("on",b.textContent==n));
 while(g.children.length)g.remove(g.children[0]);g.position.set(0,0,0);
 Object.values(meshes).forEach(m=>m.position.set(0,0,0));
 const list=n=="全部"?Object.keys(meshes):[n];
 if(n=="全部"){["盖板","压盖"].forEach(k=>{const h=meshes[k].userData.home;meshes[k].position.set(h.x,h.z,-h.y);});}
 list.forEach(k=>g.add(meshes[k]));
 info.innerHTML=n=="全部"?"三件放在一起（盖板、压盖按比例摆在浮体段旁边）。点上面的按钮看单件和打印说明。":infos[n];
 const box=new THREE.Box3().setFromObject(g);const c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3()).length();
 g.position.set(-c.x,-box.min.y,-c.z);
 ctl.target.set(0,sz*.12,0);cam.position.set(sz*1.0,sz*.9,sz*1.15);ctl.update();}
const all=document.createElement("button");all.textContent="全部";all.onclick=()=>show("全部");bar.insertBefore(all,bar.firstChild);
function rs(){r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener("resize",rs);rs();
show("全部");(function a(){requestAnimationFrame(a);ctl.update();r.render(s,cam)})();
</script></body></html>'''.replace("__DATA__", json.dumps(data))
open("outputs/QB12/QB12_试件预览.html", "w", encoding="utf-8").write(html)
print("ok", len(html))
