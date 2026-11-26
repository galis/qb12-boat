import base64, json
d="outputs/QB12/"  # 从仓库根目录运行
fs=["QB12_hull.stl","QB12_deck.stl","QB12_canopy.stl","QB12_knob.stl"]   # 11-11 起船体、甲板分件，甲板用船头插舌 + 船尾 2 个旋钮固定
data={f:base64.b64encode(open(d+f,"rb").read()).decode() for f in fs}
data["knobs_placed"]=base64.b64encode(open("hardware/hull/out/QB12_knobs_locked.stl","rb").read()).decode()   # 装在船上（锁住）
html=r'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QB12 3D 预览</title>
<style>html,body{margin:0;height:100%;background:#e8ecf0;color:#2a3440;font:14px -apple-system,sans-serif}#c{position:fixed;inset:0;width:100%;height:100%}
#ui{position:fixed;left:12px;top:12px;z-index:2}button{margin:2px;padding:6px 12px;border:1px solid #b6c0ca;background:#fff;color:#2a3440;border-radius:6px;cursor:pointer}button.on{background:#1f3a5f;color:#fff}
#t{position:fixed;left:12px;bottom:10px;opacity:.7}</style></head><body><div id="ui"></div><div id="t">左键转，右键平移，滚轮缩放；单位 mm。甲板：船头插舌插进船体槽里，船尾 2 个旋钮转 90° 锁住，分缝 z=40</div><canvas id="c"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
const D=__DATA__;
const parts=[["船体","QB12_hull.stl",0x6aa6dc],["甲板","QB12_deck.stl",0x4a525c],["舱罩","QB12_canopy.stl",0xeef1f5],["旋钮（打 2 个）","QB12_knob.stl",0xd9593f]];
const r=new THREE.WebGLRenderer({canvas:document.getElementById("c"),antialias:true});const s=new THREE.Scene();s.background=new THREE.Color(0xe8ecf0);
const cam=new THREE.PerspectiveCamera(40,1,1,3000);const ctl=new THREE.OrbitControls(cam,r.domElement);
s.add(new THREE.HemisphereLight(0xffffff,0x9aa6b2,.9));const dl=new THREE.DirectionalLight(0xffffff,.7);dl.position.set(200,300,400);s.add(dl);
s.add(new THREE.GridHelper(400,40,0xb8c2cc,0xd3dae1));
const ui=document.getElementById("ui");const g=new THREE.Group();s.add(g);const meshes={};
function b64(x){const a=atob(x),u=new Uint8Array(a.length);for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i);return u.buffer}
const ld=new THREE.STLLoader();
function paintHull(g){const p=g.attributes.position,n=p.count,col=new Float32Array(n*3),C=(h)=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
const deck=C(0x4a525c),red=C(0xa8383a),hull=C(0xd3d9df);
for(let i=0;i<n;i+=3){const ax=p.getX(i+1)-p.getX(i),ay=p.getY(i+1)-p.getY(i),az=p.getZ(i+1)-p.getZ(i),bx=p.getX(i+2)-p.getX(i),by=p.getY(i+2)-p.getY(i),bz=p.getZ(i+2)-p.getZ(i);
let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const l=Math.hypot(nx,ny,nz)||1;nz/=l;const z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
const c=(nz>.8&&z>=43)?deck:((z<19.3&&nz<.6)?red:hull);for(let k=0;k<3;k++)col.set(c,(i+k)*3);}
g.setAttribute("color",new THREE.BufferAttribute(col,3));}

parts.forEach(([n,f,c])=>{const geo=ld.parse(b64(D[f]));if(f==='QB12_hull.stl')paintHull(geo);const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:f==='QB12_hull.stl',color:f==='QB12_hull.stl'?0xffffff:c,roughness:.75,metalness:0,flatShading:false}));
 m.rotation.x=-Math.PI/2;meshes[n]=m;const bt=document.createElement("button");bt.textContent=n;bt.onclick=()=>show(n);ui.appendChild(bt);});
const knobsPlaced=new THREE.Mesh(ld.parse(b64(D.knobs_placed)),new THREE.MeshStandardMaterial({color:0xd9593f,roughness:.6}));knobsPlaced.rotation.x=-Math.PI/2;
function show(n){[...ui.children].forEach(b=>b.classList.toggle("on",b.textContent==n));
 while(g.children.length)g.remove(g.children[0]);g.position.set(0,0,0);
 const ks=(n=="全部"||n=="拆开看")?["船体","甲板","舱罩"]:[n];
 ks.forEach((k,i)=>{const m=meshes[k];m.position.y=n=="拆开看"?i*45:0;g.add(m)});
 if(n=="全部"||n=="拆开看"){knobsPlaced.position.y=n=="拆开看"?45:0;g.add(knobsPlaced)}
 const box=new THREE.Box3().setFromObject(g);const c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3()).length();
 g.position.set(-c.x,-box.min.y,-c.z);
 ctl.target.set(0,sz*.12,0);cam.position.set(sz*.8,sz*.7,sz*.9);ctl.update();}
const ex=document.createElement("button");ex.textContent="拆开看";ex.onclick=()=>show("拆开看");ui.insertBefore(ex,ui.firstChild);
const all=document.createElement("button");all.textContent="全部";all.onclick=()=>show("全部");ui.insertBefore(all,ui.firstChild);
function rs(){r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener("resize",rs);rs();
show("全部");(function a(){requestAnimationFrame(a);ctl.update();r.render(s,cam)})();
</script></body></html>'''.replace("__DATA__",json.dumps(data))
open("viewer/QB12_3D预览.html","w",encoding="utf-8").write(html)
