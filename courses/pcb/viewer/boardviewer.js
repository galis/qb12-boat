/* =====================================================================
   BoardViewer —— QB12 PCB 课的交互板子查看器（所有课共用）
   ---------------------------------------------------------------------
   数据：window.QB.board（data/board.json）和 window.QB.layers（各层 SVG 片段），build.py 内联。
   坐标：板子本地 mm，原点 = 板框左上角，x 向右、y 向下。板子 56 × 38 mm。

   创建
     const B = BoardViewer.create(el, {
       layers:  ['F.Cu','B.Cu','Vias','Zones','F.SilkS','Edge.Cuts','Drill'],  // 默认可见层
       mode:    'layers' | 'made' | 'film',   // 层叠视图 / 成品样子 / 胶片（Gerber 的样子）
       side:    'top' | 'bottom',             // 从哪面看（底面 = 左右镜像，像把板子翻过来）
       finish:  'hasl' | 'enig',              // 成品：喷锡（银）/ 沉金（金）
       mask:    'green' | 'black' | 'blue',   // 成品：阻焊颜色
       toolbar: true | 'mini' | false,        // 完整工具条 / 只有模式和缩放 / 不要
       chips:   [...层 id],                    // 工具条上给哪些层开关（默认全部）
       nets:    false,                        // 工具条加“选网络”下拉框和线宽按钮
       collapsed: null,                       // 图层 / 网络两行先收起（默认：查看器窄于 560px 时收起）
       panel:   true,                         // 右侧（窄屏在下方）信息卡：点元件 / 点线
       hover:   true,                         // 图下方一行：鼠标指着的焊盘 / 线 / 过孔
       view:    'board' | 'U2' | 'motor' | [x0,y0,x1,y1],   // 初始视野
       tracks:  true, pads: true,             // 铜层里是否画走线 / 焊盘（逐步讲解时可先关掉走线）
       label:   '屏幕阅读器用的说明'
     });
     也可以在 HTML 里写 <div class="bv" id="p3-bv" data-bv='{"layers":["F.Cu"],"toolbar":"mini"}'></div>，
     页面加载时自动创建；用 BoardViewer.get('p3-bv') 拿到实例。

   层 id：F.Cu B.Cu Vias Zones F.SilkS B.SilkS F.Mask B.Mask F.Paste B.Paste Edge.Cuts Drill
          Courtyard Keepouts Ratsnest Labels DRC   （F.Silkscreen / B.Silkscreen 也认）

   方法（都返回实例本身，animate* / reveal 返回 Promise）
     B.show({layers, mode, side, finish, mask, tracks, pads})   合并进当前状态
     B.toggle('Zones', true|false)                               开 / 关一层
     B.focus('U2' | ['U2','R15'] | 'motor' | 'VSYS' | [x0,y0,x1,y1] | 'board', {pad:2, animate:true})
     B.reset()                                                   回到全板
     B.highlightNet('VSYS' | ['BAT+','VSYS'], {keep:false, focus:false})   网络发光，其余变暗
     B.highlightWidth(0.8 | [0.8,0.5])                           某种线宽的线发光
     B.highlightParts(['U2','R15'])                              元件焊盘 + 外框发光
     B.highlightVias('stitch' | ['thermal','module'] | v => bool)  过孔加圈（role: signal stitch fanout thermal module）
     B.highlightTracks('locked' | (t, i) => bool | [段号…])       某些走线段发光（t = board.json tracks[i]）
     B.filterDRC('silk_overlap' | [...类型] | null)               DRC 层只显示这些类型的标记（null = 全部）
     B.clear()                                                   清除所有高亮、动画、选中
     B.select('U2')        打开元件信息卡；  B.selectNet('VSYS')  打开网络信息卡
     B.animateRoute('VSYS' | ['ML+','ML-'] | '*', {duration:2.6, from:'J2', style:'hl'|'layer'})
                           按连接顺序一段段画出走线（从 from 元件的焊盘开始扩散）。
                           style 'hl' 结束后保持高亮；'layer' 用铜层颜色画，画完变成真的走线（tracks:true）。
     B.reveal('Vias' | 'Zones' | 层 id, {sweep:'x', duration:1.2})   逐个弹出 / 淡入
     B.offsetParts({U2:[dx,dy], …} | 'pile' | null, {duration})   把元件挪开（焊盘、外框、位号一起动）；null = 放回
     B.annotate(svgString | (g, mk) => {}) → <g>                 在板子坐标里画自己的标注；mk = {el, label, box, arrow}
     B.label(x, y, '文字') / B.box([x0,y0,x1,y1], '文字') / B.arrow([x1,y1],[x2,y2]) 小工具
     B.clearAnnotations()
     B.badge('第 3 步')                                          舞台左上角的小标签（'' 隐藏）
     B.on('select'|'net'|'view'|'hover'|'mode', fn)             事件
     B.state()                                                   当前状态（可存起来再 show 回去）
   字段：B.el  B.svg  B.world（板子坐标的 <g>）  B.data（= QB.board）

   规则：每个实例的 DOM id 都带唯一前缀；不往全局写别的东西；prefers-reduced-motion 时所有动画直接跳到结果。
   ===================================================================== */
(function () {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const QB = window.QB;
const D = QB.board;
const FR = D.meta.frame;                       // 板框外包（含 0.05 线宽）
const CX = FR.x + FR.w / 2;                    // 镜像中线
const POWER = new Set(['VBUS', 'BAT+', 'BAT_SW', 'VSYS', '3V3']);
const NETI = Object.fromEntries(D.nets.map((n, i) => [n.name, i]));
const FPI = Object.fromEntries(D.footprints.map((f, i) => [f.ref, i]));
const REG = Object.fromEntries(D.regions.map(r => [r.id, r]));
const r3 = v => Math.round(v * 1000) / 1000;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const netCls = n => n === 'GND' ? 'g' : POWER.has(n) ? 'p' : 's';
const natural = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });

const LAYERS = [
  ['F.Cu', '顶层铜', 'var(--bv-fcu)'], ['B.Cu', '底层铜', 'var(--bv-bcu)'], ['Vias', '过孔', 'var(--bv-via)'],
  ['Zones', '铺铜', 'var(--bv-fzone)'], ['F.SilkS', '顶丝印', 'var(--bv-fsilk)'], ['B.SilkS', '底丝印', 'var(--bv-bsilk)'],
  ['F.Mask', '顶阻焊开窗', 'var(--bv-fmask)'], ['B.Mask', '底阻焊开窗', 'var(--bv-bmask)'],
  ['F.Paste', '顶钢网', 'var(--bv-fpaste)'], ['B.Paste', '底钢网', 'var(--bv-bpaste)'],
  ['Edge.Cuts', '板框', 'var(--bv-edge)'], ['Drill', '钻孔', 'var(--bv-crt)'],
  ['Courtyard', '占位框', 'var(--bv-crt)'], ['Keepouts', '禁布区', 'var(--bv-keep)'], ['Ratsnest', '飞线', 'var(--bv-rats)'],
  ['Labels', '位号', 'var(--bv-label)'], ['DRC', 'DRC 标记', 'var(--bv-drc)']
];
const LZH = Object.fromEntries(LAYERS.map(l => [l[0], l[1]]));
const ALIAS = { 'F.Silkscreen': 'F.SilkS', 'B.Silkscreen': 'B.SilkS', 'F.CrtYd': 'Courtyard', 'F.Courtyard': 'Courtyard' };
const normLayer = l => ALIAS[l] || l;
const PHYS = ['F.Cu', 'B.Cu', 'F.SilkS', 'B.SilkS', 'F.Mask', 'B.Mask', 'F.Paste', 'B.Paste', 'Edge.Cuts', 'Drill'];
const OVER = ['Courtyard', 'Keepouts', 'Ratsnest', 'Labels', 'DRC'];
const DEFAULT_LAYERS = ['F.Cu', 'B.Cu', 'Vias', 'Zones', 'F.SilkS', 'Edge.Cuts', 'Drill'];
const ROLE_ZH = { signal: '信号过孔', stitch: '缝合过孔', fanout: '扇出过孔', thermal: '散热过孔', module: '模组接地过孔' };

/* ---------- 几何字符串 ---------- */
function polyD(rings) { return rings.map(r => 'M' + r.map(p => p[0] + ' ' + p[1]).join('L') + 'Z').join(''); }
function padShape(p, attrs, grow) {
  const a = attrs || '', g = grow || 0;
  if (p.s === 'circle') return `<circle cx="${p.x}" cy="${p.y}" r="${r3(p.w / 2 + g)}"${a}/>`;
  if (p.poly) return `<path d="${polyD(p.poly)}"${g ? ` stroke-width="${g * 2}" stroke-linejoin="round"` : ''}${a}/>`;
  const w = p.w + 2 * g, h = p.h + 2 * g;
  let rx = p.s === 'oval' ? Math.min(w, h) / 2 : p.s === 'roundrect' ? (p.rr || 0) + g : g;
  const t = p.a ? ` transform="rotate(${-p.a} ${p.x} ${p.y})"` : '';
  return `<rect x="${r3(p.x - w / 2)}" y="${r3(p.y - h / 2)}" width="${r3(w)}" height="${r3(h)}"${rx ? ` rx="${r3(rx)}"` : ''}${t}${a}/>`;
}
function inPad(p, x, y, tol) {
  const t = tol || 0.05;
  if (p.s === 'circle') return Math.hypot(x - p.x, y - p.y) <= p.w / 2 + t;
  const a = (p.a || 0) * Math.PI / 180, dx = x - p.x, dy = y - p.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);   // 转回焊盘自身坐标
  const w = p.poly ? Math.max(...p.poly[0].map(q => Math.abs(q[0] - p.x))) * 2 + 0.2 : p.w;
  const h = p.poly ? Math.max(...p.poly[0].map(q => Math.abs(q[1] - p.y))) * 2 + 0.2 : p.h;
  return Math.abs(lx) <= w / 2 + t && Math.abs(ly) <= h / 2 + t;
}
const trackLen = t => Math.hypot(t[5] - t[3], t[6] - t[4]);

/* 预先拼好的大块字符串（所有实例共用） */
const PRE = (function () {
  const trk = ['', ''];
  D.tracks.forEach((t, i) => { trk[t[1]] += `<line x1="${t[3]}" y1="${t[4]}" x2="${t[5]}" y2="${t[6]}" stroke-width="${t[2]}" data-k="t${i}"/>`; });
  const pads = { F: '', B: '' }, crt = [], lab = [], hit = [], mk = { F: '', B: '' };
  D.footprints.forEach((f, fi) => {
    const sF = [], sB = [], mF = [], mB = [];
    f.pads.forEach((p, pi) => {
      if (p.t === 'npth') return;
      const k = ` class="pd" data-k="p${fi}.${pi}"`;
      if (p.cu.includes('F')) sF.push(padShape(p, k));
      if (p.cu.includes('B')) sB.push(padShape(p, k));
      if (p.mask && p.mask.includes('F') && p.cu.includes('F')) mF.push(padShape(p, ' class="pd"'));
      if (p.mask && p.mask.includes('B') && p.cu.includes('B')) mB.push(padShape(p, ' class="pd"'));
    });
    const g = s => s.length ? `<g class="fp" data-ref="${f.ref}">${s.join('')}</g>` : '';
    pads.F += g(sF); pads.B += g(sB); mk.F += g(mF); mk.B += g(mB);
    if (f.crt) crt.push(`<g class="fp" data-ref="${f.ref}"><polygon points="${f.crt.map(p => p.join(',')).join(' ')}"/></g>`);
    const cx = (f.bbox[0] + f.bbox[2]) / 2, cy = (f.bbox[1] + f.bbox[3]) / 2;
    lab.push(`<g class="fp" data-ref="${f.ref}"><text x="${r3(cx)}" y="${r3(cy)}">${f.ref}</text></g>`);
    hit.push(`<g class="fp" data-ref="${f.ref}"><rect x="${f.bbox[0]}" y="${f.bbox[1]}" width="${r3(f.bbox[2] - f.bbox[0])}" height="${r3(f.bbox[3] - f.bbox[1])}" data-k="f${fi}"/></g>`);
  });
  const vias = D.vias.map((v, i) => `<circle cx="${v.x}" cy="${v.y}" r="${r3(v.d / 2)}" data-k="v${i}"/>`).join('');
  const zone = { 'F.Cu': '', 'B.Cu': '' };
  D.zones.forEach(z => { if (!z.rule) for (const l in z.fill) zone[l] += `<path fill-rule="evenodd" d="${z.fill[l].polys.map(polyD).join('')}"/>`; });
  let drill = D.vias.map(v => `<circle cx="${v.x}" cy="${v.y}" r="${r3(v.drill / 2)}"/>`).join('');
  D.footprints.forEach(f => f.pads.forEach(p => {
    if (!p.drill) return;
    const cls = p.t === 'npth' ? ' class="np"' : '';
    const [w, h] = p.drill;
    if (Math.abs(w - h) < 1e-6) { drill += `<circle cx="${p.x}" cy="${p.y}" r="${r3(w / 2)}"${cls}/>`; return; }
    const ln = Math.abs(w - h), th = Math.min(w, h), ang = -((w > h ? p.a : p.a + 90) || 0) * Math.PI / 180;
    const ca = Math.cos(ang) * ln / 2, sa = Math.sin(ang) * ln / 2;
    drill += `<line x1="${r3(p.x - ca)}" y1="${r3(p.y - sa)}" x2="${r3(p.x + ca)}" y2="${r3(p.y + sa)}" stroke-width="${th}" stroke-linecap="round"${cls}/>`;
  }));
  const outline = 'M' + D.board.outline.map(p => p.join(' ')).join('L') + 'Z';
  const keep = D.zones.filter(z => z.rule).map(z => {
    const [x0, y0, x1, y1] = [Math.max(z.bbox[0], 0), Math.max(z.bbox[1], 0), Math.min(z.bbox[2], D.board.w), Math.min(z.bbox[3], D.board.h)];
    return `<g data-keep="${z.id}"><rect x="${x0}" y="${y0}" width="${r3(x1 - x0)}" height="${r3(y1 - y0)}" fill="url(#HATCH)"/>` +
      `<text x="${r3(x0)}" y="${r3(y0)}" dx=".4em" dy="1.3em">${esc(z.label)}${z.layers.length > 1 ? '（两层）' : '（顶层）'}</text></g>`;
  }).join('');
  const rats = D.ratsnest.map(r => `<line x1="${r[1]}" y1="${r[2]}" x2="${r[3]}" y2="${r[4]}" data-n="${r[0]}"/>`).join('');
  const drc = D.drc.items.map(it => `<circle cx="${it[1]}" cy="${it[2]}" r=".55" data-t="${esc(it[0])}" class="${it[0] === 'silk_overlap' ? '' : 'e'}"><title>${esc(it[0] + '：' + it[3])}</title></circle>`).join('');
  return { trk, pads, crt: crt.join(''), lab: lab.join(''), hit: hit.join(''), mk, vias, zone, drill, outline, keep, rats, drc };
})();

/* ---------- 网络连通图（给 animateRoute 用） ---------- */
const graphCache = new Map();
function netGraph(ni) {
  if (graphCache.has(ni)) return graphCache.get(ni);
  const segs = [];
  D.tracks.forEach((t, i) => { if (t[0] === ni) segs.push(i); });
  const par = new Map();
  const find = a => { while (par.get(a) !== a) { par.set(a, par.get(par.get(a))); a = par.get(a); } return a; };
  const add = a => { if (!par.has(a)) par.set(a, a); return a; };
  const uni = (a, b) => { a = find(add(a)); b = find(add(b)); if (a !== b) par.set(a, b); };
  const pads = [];
  D.footprints.forEach((f, fi) => f.pads.forEach((p, pi) => { if (p.net === ni && p.t !== 'npth') pads.push({ p, fi, pi, key: `P${fi}.${pi}` }); }));
  const vias = [];
  D.vias.forEach((v, i) => { if (v.net === ni) vias.push({ v, i, key: `V${i}` }); });
  pads.forEach(q => add(q.key)); vias.forEach(q => add(q.key));
  const pk = (x, y) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const ends = [];
  segs.forEach(i => {
    const t = D.tracks[i];
    for (const [x, y] of [[t[3], t[4]], [t[5], t[6]]]) {
      const k = add(pk(x, y)); ends.push([k, x, y, t[1]]);
    }
  });
  for (const [k, x, y, layer] of ends) {
    for (const q of pads) if (q.p.cu.includes(layer ? 'B' : 'F') && inPad(q.p, x, y)) uni(k, q.key);
    for (const q of vias) if (Math.hypot(x - q.v.x, y - q.v.y) <= q.v.d / 2 + 0.02) uni(k, q.key);
  }
  for (const q of vias) for (const r of pads) if (inPad(r.p, q.v.x, q.v.y, 0)) uni(q.key, r.key);
  // 同一个焊盘号的几块（比如 U1 的 41 号 3×3 接地焊盘）算一个节点
  const byNum = new Map();
  pads.forEach(q => { const id = q.fi + ':' + q.p.n; if (byNum.has(id)) uni(q.key, byNum.get(id)); else byNum.set(id, q.key); });
  const edges = segs.map(i => { const t = D.tracks[i]; return { i, a: find(pk(t[3], t[4])), b: find(pk(t[5], t[6])), len: trackLen(t) }; });
  const adj = new Map();
  const link = (a, b, e) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([b, e]); };
  edges.forEach(e => { link(e.a, e.b, e); link(e.b, e.a, e); });
  const g = { segs, edges, adj, pads: pads.map(q => Object.assign(q, { node: find(q.key) })), vias: vias.map(q => Object.assign(q, { node: find(q.key) })), find };
  graphCache.set(ni, g);
  return g;
}
function routePlan(ni, fromRef) {
  const g = netGraph(ni);
  const dist = new Map();
  const pq = [];
  const run = (src, base) => {
    if (dist.has(src)) return;
    dist.set(src, base); pq.push([base, src]);
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [d, n] = pq.shift();
      if (d > dist.get(n)) continue;
      for (const [m, e] of (g.adj.get(n) || [])) {
        const nd = d + e.len;
        if (!dist.has(m) || nd < dist.get(m)) { dist.set(m, nd); pq.push([nd, m]); }
      }
    }
  };
  let src = null;
  if (fromRef) { const q = g.pads.find(q => D.footprints[q.fi].ref === fromRef); if (q) src = q.node; }
  if (!src && g.pads.length) {
    const q = g.pads.slice().sort((a, b) => D.footprints[b.fi].pads.length - D.footprints[a.fi].pads.length)[0];
    src = q.node;
  }
  if (src) run(src, 0);
  // 没连上的部分（比如只靠铺铜连起来的接地短线）各自从自己那里同时开始
  for (const e of g.edges) { if (!dist.has(e.a) && !dist.has(e.b)) run(e.a, 0); }
  const segs = g.edges.map(e => {
    const da = dist.get(e.a) ?? 0, db = dist.get(e.b) ?? 0;
    const t = D.tracks[e.i];
    const rev = db < da;
    return { i: e.i, d0: Math.min(da, db), len: e.len, x1: rev ? t[5] : t[3], y1: rev ? t[6] : t[4], x2: rev ? t[3] : t[5], y2: rev ? t[4] : t[6] };
  });
  const pads = g.pads.map(q => ({ q, d: dist.get(q.node) ?? 0 }));
  const vias = g.vias.map(q => ({ q, d: dist.get(q.node) ?? 0 }));
  return { segs, pads, vias };
}

/* ---------- 实例 ---------- */
let UID = 0;
const registry = new Map();
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { const v = registry.get(e.target); if (v) v._ensure(); io.unobserve(e.target); }
}), { rootMargin: '600px 0px' }) : null;

class Viewer {
  constructor(el, opts) {
    this.el = el; this.data = D;
    this.o = Object.assign({ toolbar: true, panel: true, hover: true, nets: false, view: 'board', lazy: true, chips: null }, opts || {});
    this.uid = 'bv' + (++UID);
    this.st = {
      mode: this.o.mode || 'layers', side: this.o.side || 'top', finish: this.o.finish || 'hasl', mask: this.o.mask || 'green',
      layers: (this.o.layers || DEFAULT_LAYERS).map(normLayer), tracks: this.o.tracks !== false, pads: this.o.pads !== false
    };
    this.ev = {}; this.hl = null; this.anim = null; this.offsets = {};
    this.built = false;
    el.classList.add('bv'); if (this.o.bare) el.classList.add('bare');
    registry.set(el, this);
    if (el.id) registry.set(el.id, this);
    this._skeleton();
    if (!this.o.lazy || !io) this._ensure(); else io.observe(el);
  }
  /* ---- 外壳：工具条 + 舞台 + 信息卡（轻量，立刻建） ---- */
  _skeleton() {
    const o = this.o, el = this.el;
    el.innerHTML = '';
    if (o.toolbar) {
      const tools = document.createElement('div'); tools.className = 'bv-tools'; el.appendChild(tools);
      const r1 = document.createElement('div'); r1.className = 'bv-row'; tools.appendChild(r1);
      r1.innerHTML =
        `<span class="bv-seg" role="group" aria-label="显示方式"><button data-mode="layers">层叠视图</button><button data-mode="made">成品样子</button>${o.toolbar === true ? '<button data-mode="film">胶片</button>' : ''}</span>` +
        (o.toolbar === true ? `<span class="bv-seg" role="group" aria-label="看哪一面"><button data-side="top">顶面</button><button data-side="bottom">底面</button></span>` +
          `<span class="bv-seg bv-mk" role="group" aria-label="焊盘表面处理"><button data-finish="hasl">喷锡</button><button data-finish="enig">沉金</button></span>` +
          `<span class="bv-seg bv-mk" role="group" aria-label="阻焊颜色"><button data-mask="green">绿油</button><button data-mask="black">黑油</button></span>` : '') +
        `<span class="bv-sp"></span>${o.toolbar === true || o.nets ? '<button class="bv-btn bv-moreb" aria-expanded="true">图层 ▴</button>' : ''}<button class="bv-btn" data-z="out" aria-label="缩小">−</button><button class="bv-btn" data-z="in" aria-label="放大">+</button><button class="bv-btn" data-z="fit">全板</button>`;
      r1.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('bv-moreb')) { this._collapse(!tools.classList.contains('collapsed')); return; }
        if (b.dataset.mode) this.show({ mode: b.dataset.mode });
        else if (b.dataset.side) this.show({ side: b.dataset.side });
        else if (b.dataset.finish) this.show({ finish: b.dataset.finish });
        else if (b.dataset.mask) this.show({ mask: b.dataset.mask });
        else if (b.dataset.z === 'fit') this.reset();
        else if (b.dataset.z) { this._ensure(); this.zoomAt(this._center(), b.dataset.z === 'in' ? 1.6 : 1 / 1.6, true); }
      });
      if (o.toolbar === true) {
        const r2 = document.createElement('div'); r2.className = 'bv-row bv-chips bv-extra'; tools.appendChild(r2);
        const chips = (o.chips || LAYERS.map(l => l[0]).filter(l => l !== 'B.Paste')).map(normLayer);
        r2.innerHTML = chips.map(id => { const L = LAYERS.find(l => l[0] === id); return L ? `<button class="bv-chip" data-l="${id}" aria-pressed="false"><i style="background:${L[2]}"></i>${id}<small>${L[1]}</small></button>` : ''; }).join('');
        r2.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) this.toggle(b.dataset.l); });
      }
      if (o.nets) {
        const r3_ = document.createElement('div'); r3_.className = 'bv-row bv-extra'; tools.appendChild(r3_);
        const order = D.nets.map(n => n.name).sort((a, b) => (POWER.has(b) - POWER.has(a)) || (b === 'GND') - (a === 'GND') || natural(a, b));
        r3_.innerHTML = `<span class="bv-lab">网络</span><select aria-label="选一个网络高亮"><option value="">— 选一个网络 —</option>${order.map(n => `<option>${esc(n)}</option>`).join('')}</select>` +
          `<span class="bv-lab" style="margin-left:6px">线宽</span>` + D.stats.widths.slice().sort((a, b) => a[0] - b[0]).map(([w, c]) => `<button class="bv-chip w" data-w="${w}" aria-pressed="false">${w}<small>×${c}</small></button>`).join('');
        r3_.querySelector('select').addEventListener('change', e => { if (e.target.value) this.selectNet(e.target.value); else this.clear(); });
        r3_.addEventListener('click', e => {
          const b = e.target.closest('[data-w]'); if (!b) return;
          const w = +b.dataset.w;
          if (b.getAttribute('aria-pressed') === 'true') this.clear(); else this.highlightWidth(w);
        });
      }
      this.tools = tools;
      if (o.collapsed != null ? o.collapsed : (el.clientWidth > 0 && el.clientWidth < 560)) this._collapse(true);
    }
    const body = document.createElement('div'); body.className = 'bv-body' + (o.panel ? ' has-panel' : ''); el.appendChild(body);
    const sw = document.createElement('div'); sw.className = 'bv-stagewrap'; body.appendChild(sw);
    const stage = document.createElement('div'); stage.className = 'bv-stage'; stage.tabIndex = 0;
    stage.setAttribute('role', 'img'); stage.setAttribute('aria-label', o.label || 'QB12 电路板（56 × 38 mm），可缩放、点元件看信息');
    sw.appendChild(stage); this.stage = stage;
    const B0 = this._baseView();
    stage.style.aspectRatio = `${B0[2]} / ${B0[3]}`;
    this.badgeEl = document.createElement('div'); this.badgeEl.className = 'bv-badge'; sw.appendChild(this.badgeEl);
    this.hintEl = document.createElement('div'); this.hintEl.className = 'bv-hint'; sw.appendChild(this.hintEl);
    if (o.hover) { this.hov = document.createElement('div'); this.hov.className = 'bv-hov'; this.hov.textContent = ' '; sw.appendChild(this.hov); }
    if (o.panel) {
      this.panel = document.createElement('div'); this.panel.className = 'bv-panel card'; this.panel.setAttribute('aria-live', 'polite');
      body.appendChild(this.panel); this._panelEmpty();
      this.panel.addEventListener('click', e => {
        const n = e.target.closest('[data-net]'); if (n && n.dataset.net) { this.selectNet(n.dataset.net); return; }
        const r = e.target.closest('[data-ref]'); if (r) { this.select(r.dataset.ref); return; }
        if (e.target.closest('.bv-clear')) this.clear();
      });
    }
    this._syncTools();
  }
  _collapse(on) {
    if (!this.tools) return;
    this.tools.classList.toggle('collapsed', on);
    const b = this.tools.querySelector('.bv-moreb');
    if (b) { b.setAttribute('aria-expanded', String(!on)); b.textContent = on ? '图层 ▾' : '图层 ▴'; }
  }
  _baseView() {
    const m = 1.4;
    return [r3(FR.x - m), r3(FR.y - m), r3(FR.w + 2 * m), r3(FR.h + 2 * m)];
  }
  /* ---- 真正画板子（第一次进入视野或第一次调用 API 时） ---- */
  _ensure() {
    if (this.built) return this;
    this.built = true;
    const u = this.uid, B0 = this._baseView();
    this.base = B0.slice(); this.vb = B0.slice();
    const L = QB.layers;
    const svgStr =
      `<svg class="bv-svg" xmlns="${NS}" viewBox="${B0.join(' ')}" aria-hidden="true">` +
      `<defs><pattern id="${u}-hatch" patternUnits="userSpaceOnUse" width=".9" height=".9" patternTransform="rotate(45)"><rect width=".9" height=".9" fill="color-mix(in srgb,var(--bv-keep) 7%,transparent)"/><line x1="0" y1="0" x2="0" y2=".9" stroke="var(--bv-keep)" stroke-width=".14" opacity=".55"/></pattern>` +
      `<clipPath id="${u}-clip"><path d="${PRE.outline}"/></clipPath>` +
      `<mask id="${u}-mF" maskUnits="userSpaceOnUse" x="${B0[0]}" y="${B0[1]}" width="${B0[2]}" height="${B0[3]}"><rect x="${B0[0]}" y="${B0[1]}" width="${B0[2]}" height="${B0[3]}" fill="#fff"/><g style="color:#000">${L['F.Mask']}</g></mask>` +
      `<mask id="${u}-mB" maskUnits="userSpaceOnUse" x="${B0[0]}" y="${B0[1]}" width="${B0[2]}" height="${B0[3]}"><rect x="${B0[0]}" y="${B0[1]}" width="${B0[2]}" height="${B0[3]}" fill="#fff"/><g style="color:#000">${L['B.Mask']}</g></mask>` +
      `</defs><g class="bv-world">` +
      `<g class="g-sub" data-g="sub"><path d="${PRE.outline}"/></g>` +
      `<g class="g-zoneB" data-g="zoneB">${PRE.zone['B.Cu']}</g>` +
      `<g class="g-cuB" data-g="cuB"><g class="trk">${PRE.trk[1]}</g><g class="pds">${PRE.pads.B}</g></g>` +
      `<g class="g-zoneF" data-g="zoneF">${PRE.zone['F.Cu']}</g>` +
      `<g class="g-hit" data-g="hit">${PRE.hit}</g>` +
      `<g class="g-cuF" data-g="cuF"><g class="trk">${PRE.trk[0]}</g><g class="pds">${PRE.pads.F}</g></g>` +
      `<g class="g-via" data-g="via">${PRE.vias}</g>` +
      `<g class="g-pasteB" data-g="pasteB">${L['B.Paste']}</g><g class="g-maskB" data-g="maskB">${L['B.Mask']}</g>` +
      `<g class="g-pasteF" data-g="pasteF">${L['F.Paste']}</g><g class="g-maskF" data-g="maskF">${L['F.Mask']}</g>` +
      `<g class="g-mk g-mkB" data-g="mkB">${PRE.mk.B}</g><g class="g-mk g-mkF" data-g="mkF">${PRE.mk.F}</g>` +
      `<g class="g-silkB" data-g="silkB">${L['B.SilkS']}</g><g class="g-silkF" data-g="silkF">${L['F.SilkS']}</g>` +
      `<g class="g-drill" data-g="drill">${PRE.drill}</g>` +
      `<g class="g-edge" data-g="edge"><path d="${PRE.outline}"/></g>` +
      `<g class="g-film" data-g="film"></g>` +
      `<g class="g-crt" data-g="crt">${PRE.crt}</g>` +
      `<g class="g-keep" data-g="keep">${PRE.keep.replace(/url\(#HATCH\)/g, `url(#${u}-hatch)`)}</g>` +
      `<g class="g-rats" data-g="rats">${PRE.rats}</g>` +
      `<g class="g-drc" data-g="drc">${PRE.drc}</g>` +
      `<g class="g-lab" data-g="lab">${PRE.lab}</g>` +
      `<g class="g-pnum" data-g="pnum"></g>` +
      `<g class="g-hl" data-g="hl"></g>` +
      `<g class="g-anim" data-g="anim"></g>` +
      `<g class="g-ann" data-g="ann"></g>` +
      `</g></svg>`;
    this.stage.innerHTML = svgStr;
    this.svg = this.stage.querySelector('svg');
    this.world = this.svg.querySelector('.bv-world');
    this.G = {};
    this.world.querySelectorAll(':scope > [data-g]').forEach(g => { this.G[g.dataset.g] = g; });
    this.fpEls = {};
    this.world.querySelectorAll('.fp[data-ref]').forEach(g => { (this.fpEls[g.dataset.ref] = this.fpEls[g.dataset.ref] || []).push(g); });
    this._bind();
    this._apply();
    if (this.o.view && this.o.view !== 'board') this.focus(this.o.view, { animate: false });
    return this;
  }
  /* ---- 状态 -> 画面 ---- */
  _apply() {
    this._syncTools();
    if (!this.built) return;
    const s = this.st, G = this.G, vis = new Set(s.layers), svg = this.svg;
    const show = (k, on) => { G[k].style.display = on ? '' : 'none'; };
    svg.classList.toggle('made', s.mode === 'made');
    svg.classList.toggle('film', s.mode === 'film');
    this.stage.classList.toggle('film', s.mode === 'film');
    svg.classList.remove('m-green', 'm-black', 'm-blue', 'f-hasl', 'f-enig');
    svg.classList.add('m-' + s.mask, 'f-' + s.finish);
    const top = s.side !== 'bottom';
    this.world.setAttribute('transform', top ? '' : `translate(${2 * CX} 0) scale(-1 1)`);
    svg.classList.toggle('flipped', !top);
    // 叠放顺序：看哪面，哪面的层在上
    const order = top
      ? ['sub', 'zoneB', 'cuB', 'zoneF', 'hit', 'cuF', 'via', 'pasteB', 'maskB', 'pasteF', 'maskF', 'mkB', 'mkF', 'silkB', 'silkF']
      : ['sub', 'zoneF', 'cuF', 'zoneB', 'hit', 'cuB', 'via', 'pasteF', 'maskF', 'pasteB', 'maskB', 'mkF', 'mkB', 'silkF', 'silkB'];
    const after = ['drill', 'edge', 'film', 'crt', 'keep', 'rats', 'drc', 'lab', 'hl', 'anim', 'pnum', 'ann'];
    order.concat(after).forEach(k => this.world.appendChild(G[k]));
    for (const k of ['cuF', 'cuB']) {
      G[k].querySelector('.trk').style.display = s.tracks ? '' : 'none';
      G[k].querySelector('.pds').style.display = s.pads ? '' : 'none';
    }
    G.silkF.removeAttribute('mask'); G.silkB.removeAttribute('mask'); G.silkF.removeAttribute('clip-path'); G.silkB.removeAttribute('clip-path');
    if (s.mode === 'layers') {
      show('sub', vis.has('Edge.Cuts'));
      show('zoneF', vis.has('Zones') && vis.has('F.Cu')); show('zoneB', vis.has('Zones') && vis.has('B.Cu'));
      show('cuF', vis.has('F.Cu')); show('cuB', vis.has('B.Cu')); show('via', vis.has('Vias'));
      show('silkF', vis.has('F.SilkS')); show('silkB', vis.has('B.SilkS'));
      show('maskF', vis.has('F.Mask')); show('maskB', vis.has('B.Mask'));
      show('pasteF', vis.has('F.Paste')); show('pasteB', vis.has('B.Paste'));
      show('mkF', false); show('mkB', false); show('drill', vis.has('Drill')); show('edge', vis.has('Edge.Cuts')); show('film', false);
      show('hit', true);
    } else if (s.mode === 'made') {
      const F = top;
      show('sub', true); show('edge', true); show('drill', true); show('film', false); show('hit', true);
      show('zoneF', F); show('cuF', F); show('mkF', F); show('silkF', F);
      show('zoneB', !F); show('cuB', !F); show('mkB', !F); show('silkB', !F);
      show('via', true);
      show('maskF', false); show('maskB', false);
      show('pasteF', F && vis.has('F.Paste')); show('pasteB', !F && vis.has('B.Paste'));
      const sk = F ? G.silkF : G.silkB;
      sk.setAttribute('mask', `url(#${this.uid}-m${F ? 'F' : 'B'})`); sk.setAttribute('clip-path', `url(#${this.uid}-clip)`);
    } else { // film
      ['zoneF', 'zoneB', 'cuF', 'cuB', 'via', 'silkF', 'silkB', 'maskF', 'maskB', 'pasteF', 'pasteB', 'mkF', 'mkB', 'drill', 'edge', 'hit'].forEach(k => show(k, false));
      show('sub', true); show('film', true);
      this._film(s.layers.filter(l => PHYS.includes(l)));
    }
    show('crt', vis.has('Courtyard')); show('keep', vis.has('Keepouts')); show('rats', vis.has('Ratsnest'));
    show('drc', vis.has('DRC')); show('lab', vis.has('Labels'));
    this._pnum();
  }
  _film(list) {
    const key = list.join(',');
    if (this._filmKey === key) return;
    this._filmKey = key;
    const L = QB.layers;
    this.G.film.innerHTML = list.map(l => {
      if (l === 'Drill') return `<g>${PRE.drill}</g>`;
      if (l === 'Edge.Cuts') return `<g class="g-edge"><path d="${PRE.outline}" style="stroke:var(--bv-film-ink);fill:none;stroke-width:.12"/></g>`;
      return `<g>${L[l] || ''}</g>`;
    }).join('');
  }
  _syncTools() {
    if (!this.tools) return;
    const s = this.st, t = this.tools;
    t.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode)));
    t.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === s.side)));
    t.querySelectorAll('[data-finish]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.finish === s.finish)));
    t.querySelectorAll('[data-mask]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mask === s.mask)));
    t.querySelectorAll('.bv-mk').forEach(g => { g.style.display = s.mode === 'made' ? '' : 'none'; });
    const vis = new Set(s.layers);
    t.querySelectorAll('[data-l]').forEach(b => {
      const id = b.dataset.l;
      b.setAttribute('aria-pressed', String(vis.has(id)));
      const relevant = s.mode === 'layers' || OVER.includes(id) || (s.mode === 'film' && PHYS.includes(id)) || (s.mode === 'made' && id.endsWith('Paste'));
      b.style.display = relevant ? '' : 'none';
    });
    const hw = this.hl && this.hl.widths;
    t.querySelectorAll('[data-w]').forEach(b => b.setAttribute('aria-pressed', String(!!hw && hw.has(+b.dataset.w))));
    const sel = t.querySelector('select');
    if (sel) sel.value = this.hl && this.hl.nets && this.hl.nets.size === 1 ? [...this.hl.nets][0] : '';
  }
  /* ---- 交互：平移、缩放、点选、悬停 ---- */
  _bind() {
    const st = this.stage, svg = this.svg;
    const ptrs = new Map();
    let drag = null, lastTap = 0;
    st.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) { this._hint('按住 Ctrl（Mac 按 ⌘）再滚轮缩放，或用右上角 + −'); return; }
      e.preventDefault();
      const f = Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0025));
      this.zoomAt(this._toUser(e.clientX, e.clientY), f, false);
    }, { passive: false });
    st.addEventListener('pointerdown', e => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, vb: this.vb.slice(), moved: false, id: e.pointerId, target: e.target, type: e.pointerType };
      else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        drag = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y), vb: this.vb.slice(), mid: this._toUser((a.x + b.x) / 2, (a.y + b.y) / 2), moved: true };
      }
    });
    st.addEventListener('pointermove', e => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (drag && drag.pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.vb = drag.vb.slice(); this.zoomAt(drag.mid, d / drag.d, false);
        return;
      }
      if (drag && ptrs.size === 1 && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        const zoomed = this.base[2] / this.vb[2] > 1.02;
        if (!drag.moved && Math.hypot(dx, dy) > 4 && (zoomed || drag.type === 'mouse')) {
          drag.moved = true; st.classList.add('dragging');
          try { st.setPointerCapture(e.pointerId); } catch (_) { /* 没关系 */ }
        }
        if (drag.moved) {
          const r = st.getBoundingClientRect(), k = drag.vb[2] / r.width;
          this._setVB([drag.vb[0] - dx * k, drag.vb[1] - dy * k, drag.vb[2], drag.vb[3]]);
        }
        return;
      }
      if (this.o.hover && e.pointerType === 'mouse') this._hover(e.target);
    });
    const up = e => {
      const had = ptrs.has(e.pointerId);
      ptrs.delete(e.pointerId);
      st.classList.remove('dragging');
      if (!had || !drag) return;
      if (drag.pinch) { if (ptrs.size === 0) drag = null; return; }
      if (!drag.moved && e.type === 'pointerup') {
        const now = performance.now();
        if (e.pointerType !== 'mouse' && now - lastTap < 320) { this.zoomAt(this._toUser(e.clientX, e.clientY), 2, true); lastTap = 0; }
        else { lastTap = now; this._click(drag.target); if (e.pointerType !== 'mouse') this._hover(drag.target); }
      }
      drag = null;
    };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    st.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && this.hov) this.hov.textContent = ' '; });
    st.addEventListener('dblclick', e => { e.preventDefault(); this.zoomAt(this._toUser(e.clientX, e.clientY), 2, true); });
    st.addEventListener('keydown', e => {
      const k = e.key, s = this.vb[2] * 0.12;
      if (k === '+' || k === '=') this.zoomAt(this._center(), 1.5, true);
      else if (k === '-' || k === '_') this.zoomAt(this._center(), 1 / 1.5, true);
      else if (k === '0') this.reset();
      else if (k === 'Escape') this.clear();
      else if (k.startsWith('Arrow')) {
        const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[k];
        this._setVB([this.vb[0] + d[0], this.vb[1] + d[1], this.vb[2], this.vb[3]]);
      } else return;
      e.preventDefault();
    });
    let rz = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => this._setVB(this.vb)); });
  }
  _hint(t) {
    const h = this.hintEl; h.textContent = t; h.classList.add('show');
    clearTimeout(this._ht); this._ht = setTimeout(() => h.classList.remove('show'), 1600);
  }
  _toUser(cx, cy) {
    const r = this.stage.getBoundingClientRect();
    return [this.vb[0] + (cx - r.left) / r.width * this.vb[2], this.vb[1] + (cy - r.top) / r.height * this.vb[3]];
  }
  _center() { return [this.vb[0] + this.vb[2] / 2, this.vb[1] + this.vb[3] / 2]; }
  _ux(x) { return this.st.side === 'bottom' ? 2 * CX - x : x; }
  _setVB(v) {
    const B0 = this.base;
    let [x, y, w, h] = v;
    const kmax = 14;
    if (w > B0[2]) { w = B0[2]; h = B0[3]; }
    if (w < B0[2] / kmax) { w = B0[2] / kmax; h = B0[3] / kmax; }
    h = w * B0[3] / B0[2];
    x = Math.min(Math.max(x, B0[0]), B0[0] + B0[2] - w);
    y = Math.min(Math.max(y, B0[1]), B0[1] + B0[3] - h);
    this.vb = [x, y, w, h];
    this.svg.setAttribute('viewBox', this.vb.map(r3).join(' '));
    this.stage.classList.toggle('zoomed', B0[2] / w > 1.02);
    this._textZoom();
    this._pnum();
    this._emit('view', this.vb.slice());
  }
  /* 标注文字（label / box / 禁布区名字）按屏幕像素定大小：放大时先跟着变大，到约 16 px 后就不再变大。
     CSS 里用 calc(字号 / var(--bv-tz))；--bv-tz 只写在 g-ann / g-keep 上，免得整张图重算样式。 */
  _textZoom() {
    const cw = this.stage.clientWidth, k = this.base[2] / this.vb[2];
    const base = cw ? 1.2 * cw / this.base[2] : 0;          // 不放大时 1.2 mm 的字有多少 px
    const tz = base ? r3(Math.max(1, k / Math.max(1, 16 / base))) : 1;
    // 焊盘号（0.32 mm 字）最大约 20 px，免得放到最大时盖住整个焊盘和舞台上的标签
    const pz = cw ? r3(Math.max(1, 0.32 * cw / this.base[2] * k / 20)) : 1;
    if (pz !== this._pz) { this._pz = pz; this.G.pnum.style.setProperty('--bv-pz', pz); }
    if (tz === this._tz) return;
    this._tz = tz;
    this.G.ann.style.setProperty('--bv-tz', tz); this.G.keep.style.setProperty('--bv-tz', tz);
  }
  zoomAt(p, f, animate) {
    this._ensure();
    const [x, y, w, h] = this.vb;
    const nw = w / f, nh = h / f;
    const t = [p[0] - (p[0] - x) / f, p[1] - (p[1] - y) / f, nw, nh];
    if (animate) this._animVB(t); else this._setVB(t);
    return this;
  }
  _animVB(t, ms) {
    cancelAnimationFrame(this._vbRaf);
    if (RM || ms === 0) { this._setVB(t); return; }
    const a = this.vb.slice(), t0 = performance.now(), dur = ms || 480;
    const ease = q => q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
    const step = now => {
      const q = Math.min(1, (now - t0) / dur), e = ease(q);
      this._setVB(a.map((v, i) => v + (t[i] - v) * e));
      if (q < 1) this._vbRaf = requestAnimationFrame(step);
    };
    this._vbRaf = requestAnimationFrame(step);
  }
  _pnum() {
    if (!this.built) return;
    const k = this.base[2] / this.vb[2];
    const want = k >= 4 && this.st.mode !== 'film' && this.st.pads;
    if (want && !this._pnumBuilt) {
      this._pnumBuilt = true;
      let s = '';
      D.footprints.forEach(f => {
        let t = '';
        f.pads.forEach(p => { if (p.t !== 'npth' && p.n && Math.min(p.w, p.h) >= 0.3) t += `<text x="${p.x}" y="${p.y}">${esc(p.n)}</text>`; });
        if (t) s += `<g class="fp" data-ref="${f.ref}">${t}</g>`;
      });
      this.G.pnum.innerHTML = s;
      this.G.pnum.querySelectorAll('.fp[data-ref]').forEach(g => {
        (this.fpEls[g.dataset.ref] = this.fpEls[g.dataset.ref] || []).push(g);
        const o = this.offsets[g.dataset.ref]; if (o) g.style.transform = `translate(${o[0]}px,${o[1]}px)`;
      });
    }
    if (this.G.pnum) this.G.pnum.style.display = want ? '' : 'none';
  }
  /* ---- 悬停 / 点选 ---- */
  _item(target) {
    const n = target && target.closest && target.closest('[data-k]');
    if (!n) return null;
    const k = n.dataset.k, c = k[0];
    if (c === 't') { const t = D.tracks[+k.slice(1)]; return { kind: 'track', t, net: D.nets[t[0]] }; }
    if (c === 'v') { const v = D.vias[+k.slice(1)]; return { kind: 'via', v, net: D.nets[v.net] }; }
    if (c === 'p') { const [fi, pi] = k.slice(1).split('.').map(Number); const f = D.footprints[fi], p = f.pads[pi]; return { kind: 'pad', f, p, net: D.nets[p.net] }; }
    if (c === 'f') { return { kind: 'fp', f: D.footprints[+k.slice(1)] }; }
    return null;
  }
  _hover(target) {
    if (!this.hov) return;
    const it = this._item(target);
    let s = ' ';
    if (it) {
      if (it.kind === 'track') s = `走线 · ${it.net.name} · 线宽 ${it.t[2]} mm · ${it.t[1] ? 'B.Cu 底层' : 'F.Cu 顶层'} · 长 ${trackLen(it.t).toFixed(2)} mm`;
      else if (it.kind === 'via') s = `过孔 · ${it.net.name} · 外径 ${it.v.d} / 孔 ${it.v.drill} mm · ${ROLE_ZH[it.v.role] || ''}`;
      else if (it.kind === 'pad') s = `${it.f.ref} · ${it.p.n || '—'} 号焊盘 · ${it.net ? it.net.name : '不接'} · ${it.p.w}×${it.p.h} mm · ${it.p.t === 'smd' ? '贴片' : '通孔'}`;
      else if (it.kind === 'fp') s = `${it.f.ref} · ${it.f.value} · ${it.f.pkg || it.f.fp}`;
    }
    this.hov.textContent = s;
    this._emit('hover', it);
  }
  _click(target) {
    const it = this._item(target);
    if (!it) { if (this.hl || this._sel) this.clear(); return; }
    if (it.kind === 'pad' || it.kind === 'fp') this.select(it.f.ref);
    else if (it.net) this.selectNet(it.net.name);
  }
  /* ---- 信息卡 ---- */
  _panelEmpty() { if (this.panel) this.panel.innerHTML = '<p class="empty">点板上的元件看它是什么、每个脚接到哪个网络；点一根线或一个过孔看它属于哪个网络。</p>'; }
  _pinName(f, p) {
    if (f.kind === 'd' || f.kind === 'led') { const an = f.pins[0] && f.pins[0][2]; return p.net >= 0 && D.nets[p.net].name === an ? '阳极 A' : '阴极 K'; }
    const parts = (p.n || '').match(/[AB]\d+/g) || [p.n];
    for (const [nums, name] of f.pins) {
      const ns = nums.split(',');
      if (parts.some(x => ns.includes(x))) return name;
    }
    if (p.net >= 0) { const m = f.pins.find(q => q[2] === D.nets[p.net].name && q[1]); if (m) return m[1]; }
    return '';
  }
  select(ref) {
    this._ensure();
    const fi = FPI[ref]; if (fi == null) return this;
    const f = D.footprints[fi];
    this._setHL({ parts: new Set([ref]) }, false, true);
    this._sel = ref;
    if (this.panel) {
      const rows = new Map();
      f.pads.forEach(p => {
        if (p.t === 'npth') return;
        const key = (p.n || '—') + '|' + p.net;
        const r = rows.get(key); if (r) r.n++; else rows.set(key, { p, n: 1 });
      });
      const list = [...rows.values()].sort((a, b) => natural(a.p.n, b.p.n));
      const pr = list.map(({ p, n }) => {
        const net = p.net >= 0 ? D.nets[p.net].name : null;
        return `<div><span>${esc(p.n || '—')}${n > 1 ? ' ×' + n : ''}</span><span>${esc(this._pinName(f, p))}</span>${net ? `<button class="bv-net ${netCls(net)}" data-net="${esc(net)}">${esc(net)}</button>` : '<span class="bv-net nc">不接</span>'}</div>`;
      }).join('');
      const holes = f.pads.filter(p => p.t === 'npth').length;
      this.panel.innerHTML =
        `<h4>${esc(f.ref)}<span>${esc(f.value)}</span></h4>` + (f.desc ? `<p class="d">${esc(f.desc)}</p>` : '') +
        `<div class="bv-kv"><span>封装</span><b>${esc(f.pkg || '')}</b><span>封装名</span><b>${esc(f.fp)}</b>` +
        `<span>立创编号</span><b>${esc(f.lcsc || '—')}</b><span>位置</span><b>(${f.x}, ${f.y}) mm · ${((f.rot % 360) + 360) % 360}°</b>` +
        `<span>焊盘</span><b>${f.pads.length - holes} 个${holes ? ` + ${holes} 个定位孔` : ''}</b></div>` +
        `<div class="bv-pins">${pr}</div><button class="bv-clear">清除</button>`;
    }
    this._emit('select', { ref, fp: f });
    return this;
  }
  selectNet(name) {
    this._ensure();
    const ni = NETI[name]; if (ni == null) return this;
    const n = D.nets[ni];
    this._setHL({ nets: new Set([name]) }, false, true);
    if (this.panel) {
      const cls = D.classes.find(c => c.name === n.cls);
      const refs = [...new Set(n.pads.map(p => p.split('.')[0]))].sort(natural);
      const ws = Object.entries(n.widths).map(([w, c]) => `${w} mm ×${c}`).join('，') || '没有走线（只靠铺铜连）';
      this.panel.innerHTML =
        `<h4><span class="bv-net ${netCls(name)}" style="cursor:default">${esc(name)}</span><span>网络类 ${esc(n.cls)}</span></h4>` +
        `<div class="bv-kv"><span>规定线宽</span><b>${cls ? cls.track : '—'} mm</b><span>实际线宽</span><b>${esc(ws)}</b>` +
        `<span>走线</span><b>${n.segs} 段，共 ${n.len.toFixed(1)} mm</b><span>过孔</span><b>${n.vias} 个</b><span>焊盘</span><b>${n.pads.length} 个</b></div>` +
        `<p class="empty">连到这些元件（点一下看元件）：</p><div class="bv-reflist">${refs.map(r => `<button data-ref="${esc(r)}">${esc(r)}</button>`).join('')}</div>` +
        `<button class="bv-clear">清除</button>`;
    }
    this._emit('net', { name, net: n });
    return this;
  }
  /* ---- 高亮 ---- */
  _setHL(h, keep, fromSel) {
    this._ensure();
    this._stopAnim();
    if (!fromSel && !keep) { this._sel = null; this._panelEmpty(); }
    const prev = keep && this.hl ? this.hl : {};
    this.hl = Object.assign({ nets: new Set(), widths: new Set(), parts: new Set(), vias: null, tracks: null }, prev, h);
    this._renderHL();
    this._syncTools();
    return this;
  }
  _renderHL() {
    const h = this.hl, G = this.G.hl;
    if (!h) { G.innerHTML = ''; this.svg.classList.remove('dim'); return; }
    let glow = '', core = '', extra = '';
    const trk = t => {
      const a = `x1="${t[3]}" y1="${t[4]}" x2="${t[5]}" y2="${t[6]}"`;
      glow += `<line ${a} stroke-width="${r3(t[2] + 0.45)}"/>`;
      core += `<line ${a} stroke-width="${t[2]}"${t[1] ? ' opacity=".75"' : ''}/>`;
    };
    if (h.nets.size) {
      const ids = new Set([...h.nets].map(n => NETI[n]).filter(i => i != null));
      D.tracks.forEach(t => { if (ids.has(t[0])) trk(t); });
      // 焊盘按元件分组（.fp[data-ref]），这样 offsetParts 挪开的元件，高亮也跟着它
      D.footprints.forEach(f => {
        let gl = '', co = '';
        f.pads.forEach(p => { if (ids.has(p.net) && p.t !== 'npth') { gl += padShape(p, '', 0.2); co += padShape(p, ''); } });
        if (gl) { glow += `<g class="fp" data-ref="${f.ref}">${gl}</g>`; core += `<g class="fp" data-ref="${f.ref}">${co}</g>`; }
      });
      D.vias.forEach(v => { if (ids.has(v.net)) { glow += `<circle cx="${v.x}" cy="${v.y}" r="${r3(v.d / 2 + 0.22)}"/>`; core += `<circle cx="${v.x}" cy="${v.y}" r="${r3(v.d / 2)}"/>`; } });
    }
    if (h.widths.size) D.tracks.forEach(t => { if ([...h.widths].some(w => Math.abs(w - t[2]) < 1e-6)) trk(t); });
    if (h.tracks) {
      const tf = h.tracks === 'locked' ? t => !!t[7] : typeof h.tracks === 'function' ? h.tracks : (() => { const s = new Set([].concat(h.tracks)); return (t, i) => s.has(i); })();
      D.tracks.forEach((t, i) => { if (tf(t, i)) trk(t); });
    }
    if (h.parts.size) {
      h.parts.forEach(ref => {
        const f = D.footprints[FPI[ref]]; if (!f) return;
        const b = f.bbox;
        extra += `<g class="fp" data-ref="${ref}">${f.pads.filter(p => p.t !== 'npth').map(p => padShape(p, ' class="po"')).join('')}` +
          `<rect class="box" x="${b[0]}" y="${b[1]}" width="${r3(b[2] - b[0])}" height="${r3(b[3] - b[1])}" rx=".3"/></g>`;
      });
    }
    if (h.vias) {
      const f = typeof h.vias === 'function' ? h.vias : (Array.isArray(h.vias) ? v => h.vias.includes(v.role) : v => v.role === h.vias);
      D.vias.forEach(v => { if (f(v)) { extra += `<circle class="ring" cx="${v.x}" cy="${v.y}" r="${r3(v.d / 2 + 0.3)}"/>`; core += `<circle cx="${v.x}" cy="${v.y}" r="${r3(v.d / 2)}"/>`; } });
    }
    G.innerHTML = `<g class="glow">${glow}</g><g class="core">${core}</g>${extra}`;
    G.classList.toggle('pulse', !RM);
    // 跟着元件一起挪
    G.querySelectorAll('.fp[data-ref]').forEach(g => { const o = this.offsets[g.dataset.ref]; if (o) { g.style.transitionDuration = '0s'; g.style.transform = `translate(${o[0]}px,${o[1]}px)`; } });
    this.svg.classList.toggle('dim', !!(glow || core || extra));
  }
  highlightNet(names, o) {
    const list = [].concat(names);
    this._setHL({ nets: new Set(list) }, o && o.keep);
    if (o && o.focus) this.focus(list[0]);
    return this;
  }
  highlightWidth(w, o) { return this._setHL({ widths: new Set([].concat(w).map(Number)) }, o && o.keep); }
  highlightParts(refs, o) { return this._setHL({ parts: new Set([].concat(refs)) }, o && o.keep); }
  highlightVias(filter, o) { return this._setHL({ vias: filter }, o && o.keep); }
  highlightTracks(filter, o) { return this._setHL({ tracks: filter }, o && o.keep); }
  filterDRC(types) {
    this._ensure();
    const s = types == null ? null : new Set([].concat(types));
    this.G.drc.querySelectorAll('circle').forEach(c => { c.style.display = !s || s.has(c.dataset.t) ? '' : 'none'; });
    return this;
  }
  clear() {
    this._stopAnim();
    this.hl = null; this._sel = null;
    if (this.built) { this._renderHL(); this.G.anim.innerHTML = ''; }
    this._panelEmpty(); this._syncTools();
    return this;
  }
  /* ---- 视野 ---- */
  _bboxOf(t) {
    if (t == null || t === 'board') return [FR.x, FR.y, FR.x + FR.w, FR.y + FR.h];
    if (Array.isArray(t) && t.length === 4 && t.every(v => typeof v === 'number')) return t.slice();
    if (typeof t === 'object' && !Array.isArray(t) && 'w' in t) return [t.x, t.y, t.x + t.w, t.y + t.h];
    const list = [].concat(t);
    let b = null;
    const grow = bb => { b = b ? [Math.min(b[0], bb[0]), Math.min(b[1], bb[1]), Math.max(b[2], bb[2]), Math.max(b[3], bb[3])] : bb.slice(); };
    for (const k of list) {
      if (FPI[k] != null) { const f = D.footprints[FPI[k]], o = this.offsets[k] || [0, 0]; grow([f.bbox[0] + o[0], f.bbox[1] + o[1], f.bbox[2] + o[0], f.bbox[3] + o[1]]); }
      else if (REG[k]) grow(REG[k].bbox);
      else if (NETI[k] != null) {
        const i = NETI[k];
        D.tracks.forEach(q => { if (q[0] === i) grow([Math.min(q[3], q[5]), Math.min(q[4], q[6]), Math.max(q[3], q[5]), Math.max(q[4], q[6])]); });
        D.footprints.forEach(f => f.pads.forEach(p => { if (p.net === i) grow([p.x - .5, p.y - .5, p.x + .5, p.y + .5]); }));
      } else { const z = D.zones.find(z => z.id === k); if (z) grow(z.bbox); }
    }
    return b || [FR.x, FR.y, FR.x + FR.w, FR.y + FR.h];
  }
  focus(target, o) {
    this._ensure();
    o = Object.assign({ pad: 2, animate: true }, o || {});
    let [x0, y0, x1, y1] = this._bboxOf(target);
    if (this.st.side === 'bottom') { const a = 2 * CX - x1, b = 2 * CX - x0; x0 = a; x1 = b; }
    x0 -= o.pad; y0 -= o.pad; x1 += o.pad; y1 += o.pad;
    const B0 = this.base, asp = B0[2] / B0[3];
    let w = x1 - x0, h = y1 - y0;
    if (w / h > asp) h = w / asp; else w = h * asp;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const t = [cx - w / 2, cy - h / 2, w, h];
    if (o.animate) this._animVB(t, o.ms); else this._setVB(t);
    return this;
  }
  reset(o) { return this.focus('board', Object.assign({ pad: 1.4 }, o || {})); }
  /* ---- 状态 ---- */
  show(s) {
    s = Object.assign({}, s || {});
    if (s.layers) s.layers = s.layers.map(normLayer);
    const flip = s.side && s.side !== this.st.side;
    Object.assign(this.st, s);
    if (flip && this.built) this.vb[0] = 2 * CX - (this.vb[0] + this.vb[2]);
    if (s.side && this.built) { this._apply(); this._setVB(this.vb); if (this.hl) this._renderHL(); this._emit('mode', this.state()); return this; }
    this._apply(); this._emit('mode', this.state());
    return this;
  }
  toggle(layer, on) {
    layer = normLayer(layer);
    const v = new Set(this.st.layers);
    const want = on == null ? !v.has(layer) : !!on;
    if (want) v.add(layer); else v.delete(layer);
    return this.show({ layers: [...v] });
  }
  state() { return JSON.parse(JSON.stringify(Object.assign({}, this.st, { view: this.vb }))); }
  badge(t) { this.badgeEl.textContent = t || ''; return this; }
  on(n, fn) { (this.ev[n] = this.ev[n] || []).push(fn); return this; }
  _emit(n, d) { (this.ev[n] || []).forEach(fn => { try { fn(d, this); } catch (e) { console.error(e); } }); }
  /* ---- 动画：沿连接顺序画出走线 ---- */
  _stopAnim() {
    if (this.anim) { cancelAnimationFrame(this.anim.raf); const r = this.anim.resolve; this.anim = null; r && r(false); }
  }
  animateRoute(nets, o) {
    this._ensure();
    o = Object.assign({ duration: 2.6, style: 'hl', from: null }, o || {});
    this._stopAnim();
    const list = nets === '*' ? D.nets.map(n => n.name) : [].concat(nets);
    const plans = list.map(n => NETI[n]).filter(i => i != null).map(i => routePlan(i, o.from));
    let maxEnd = 0;
    plans.forEach(p => p.segs.forEach(s => { maxEnd = Math.max(maxEnd, s.d0 + s.len); }));
    const speed = o.speed || Math.max(4, maxEnd / o.duration);
    const layerStyle = o.style === 'layer';
    let s1 = '', s2 = '', s3 = '';
    const segs = [];
    plans.forEach(p => {
      p.segs.forEach(s => {
        const t = D.tracks[s.i];
        const col = layerStyle ? (t[1] ? 'var(--bv-bcu)' : 'var(--bv-fcu)') : 'var(--hl)';
        const L = r3(s.len) || 0.001;
        if (!layerStyle) s1 += `<line class="a" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke-width="${r3(t[2] + 0.45)}" stroke="var(--hl)" opacity="0" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}" stroke-linecap="round"/>`;
        s2 += `<line class="a" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke-width="${t[2]}" stroke="${col}" opacity="0" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}" stroke-linecap="round"/>`;
        segs.push(s);
      });
      if (!layerStyle) {
        p.pads.forEach(({ q, d }) => { s3 += padShape(q.p, ` class="pa" data-d="${r3(d)}" opacity="0" fill="var(--hl)"`); });
        p.vias.forEach(({ q, d }) => { s3 += `<circle class="pa" data-d="${r3(d)}" opacity="0" fill="var(--hl)" cx="${q.v.x}" cy="${q.v.y}" r="${r3(q.v.d / 2)}"/>`; });
      }
    });
    const A = this.G.anim;
    A.innerHTML = `<g style="opacity:.35">${s1}</g><g>${s2}</g><g>${s3}</g>`;
    if (!layerStyle) { this.hl = { nets: new Set(list), widths: new Set(), parts: new Set(), vias: null }; this.G.hl.innerHTML = ''; this.svg.classList.add('dim'); }
    const lines1 = A.children[0].children, lines2 = A.children[1].children, padsEl = [...A.children[2].children];
    const finish = () => {
      if (layerStyle) { A.innerHTML = ''; if (!this.st.tracks) this.show({ tracks: true }); }
      else { A.innerHTML = ''; this._renderHL(); }
    };
    return new Promise(resolve => {
      if (RM || !segs.length) { finish(); resolve(true); return; }
      const t0 = performance.now();
      this.anim = { resolve };
      const step = now => {
        const dist = (now - t0) / 1000 * speed;
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          const q = Math.max(0, Math.min(1, (dist - s.d0) / (s.len || 0.001)));
          const off = (1 - q) * s.len;
          const op = q > 0 ? '1' : '0';
          lines2[i].setAttribute('stroke-dashoffset', off.toFixed(3)); lines2[i].setAttribute('opacity', op);
          if (lines1[i]) { lines1[i].setAttribute('stroke-dashoffset', off.toFixed(3)); lines1[i].setAttribute('opacity', op); }
        }
        for (const p of padsEl) if (p.getAttribute('opacity') === '0' && +p.dataset.d <= dist) p.setAttribute('opacity', '1');
        if (dist < maxEnd + 0.5) { this.anim.raf = requestAnimationFrame(step); }
        else { this.anim = null; finish(); resolve(true); }
      };
      this.anim.raf = requestAnimationFrame(step);
    });
  }
  reveal(layer, o) {
    this._ensure();
    o = Object.assign({ duration: 1.2, sweep: 'x' }, o || {});
    layer = normLayer(layer);
    if (!this.st.layers.includes(layer)) this.toggle(layer, true);
    const map = { Vias: 'via', Zones: ['zoneF', 'zoneB'], 'F.Cu': 'cuF', 'B.Cu': 'cuB', 'F.SilkS': 'silkF', 'B.SilkS': 'silkB', 'F.Mask': 'maskF', 'B.Mask': 'maskB', 'F.Paste': 'pasteF', 'Edge.Cuts': 'edge', Drill: 'drill', Keepouts: 'keep', Ratsnest: 'rats', DRC: 'drc', Labels: 'lab', Courtyard: 'crt' };
    const gs = [].concat(map[layer] || []).map(k => this.G[k]);
    if (RM) return Promise.resolve(true);
    const pops = layer === 'Vias' || layer === 'DRC';
    gs.forEach(g => {
      if (pops) {
        [...g.children].forEach(c => {
          const x = +(c.getAttribute('cx') || 0);
          c.classList.remove('pop'); c.style.animationDelay = (o.sweep === 'x' ? x / D.board.w * o.duration : Math.random() * o.duration).toFixed(3) + 's';
        });
        requestAnimationFrame(() => [...g.children].forEach(c => c.classList.add('pop')));
      } else {
        g.classList.remove('fadein'); void g.offsetWidth; g.style.animationDuration = o.duration + 's'; g.classList.add('fadein');
      }
    });
    return new Promise(r => setTimeout(() => r(true), (o.duration + 0.5) * 1000));
  }
  offsetParts(map, o) {
    this._ensure();
    o = o || {};
    if (map === 'pile') map = BoardViewer.pileLayout();
    this.offsets = map ? Object.assign({}, map) : {};
    const move = (g, ref) => {
      const off = this.offsets[ref];
      g.style.transitionDuration = RM ? '0s' : (o.duration != null ? o.duration + 's' : '');
      if (o.stagger && !RM) g.style.transitionDelay = (FPI[ref] * o.stagger).toFixed(3) + 's'; else g.style.transitionDelay = '';
      g.style.transform = off ? `translate(${off[0]}px,${off[1]}px)` : '';
    };
    for (const ref in this.fpEls) this.fpEls[ref].forEach(g => move(g, ref));
    // 高亮（highlightParts / select / highlightNet 的焊盘）也跟着元件走
    this.G.hl.querySelectorAll('.fp[data-ref]').forEach(g => move(g, g.dataset.ref));
    const ms = RM ? 0 : ((o.duration != null ? o.duration : 0.9) + (o.stagger ? D.footprints.length * o.stagger : 0)) * 1000;
    return new Promise(r => setTimeout(() => r(true), ms + 30));
  }
  /* ---- 标注 ---- */
  annotate(x) {
    this._ensure();
    const g = document.createElementNS(NS, 'g');
    this.G.ann.appendChild(g);
    if (typeof x === 'string') g.innerHTML = x;
    else if (typeof x === 'function') x(g, { el: (t, a, p, txt) => mk(t, a, p || g, txt), label: (...a) => this.label(...a, g), box: (...a) => this.box(...a, g), arrow: (...a) => this.arrow(...a, g) });
    return g;
  }
  label(x, y, text, parent) {
    this._ensure();
    return mk('text', { x, y }, parent || this.G.ann, text);
  }
  box(b, text, parent) {
    this._ensure();
    const p = parent || this.G.ann;
    const g = mk('g', {}, p);
    mk('rect', { class: 'bx', x: b[0], y: b[1], width: r3(b[2] - b[0]), height: r3(b[3] - b[1]), rx: .4 }, g);
    if (text) mk('text', { x: b[0], y: b[1], dx: '.25em', dy: '-.38em' }, g, text);
    return g;
  }
  arrow(a, b, parent) {
    this._ensure();
    const p = parent || this.G.ann;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), h = 0.9;
    const d = `M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${r3(b[0] - h * Math.cos(ang - .45))} ${r3(b[1] - h * Math.sin(ang - .45))}L${b[0]} ${b[1]}L${r3(b[0] - h * Math.cos(ang + .45))} ${r3(b[1] - h * Math.sin(ang + .45))}`;
    return mk('path', { class: 'ar', d }, p);
  }
  clearAnnotations() { if (this.built) this.G.ann.innerHTML = ''; return this; }
  destroy() { this._stopAnim(); registry.delete(this.el); if (this.el.id) registry.delete(this.el.id); this.el.innerHTML = ''; }
}
function mk(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

/* 把所有元件像“刚从原理图导进来”那样排成一堆（示意，不是真实数据）：按高度从大到小一排排摆进板框 */
function pileLayout(o) {
  o = Object.assign({ x: 0.6, y: 0.6, w: D.board.w - 1.2, gap: 0.9 }, o || {});
  const fps = D.footprints.slice().sort((a, b) => (b.bbox[3] - b.bbox[1]) - (a.bbox[3] - a.bbox[1]) || natural(a.ref, b.ref));
  const out = {};
  let x = o.x, y = o.y, rowH = 0;
  for (const f of fps) {
    const w = f.bbox[2] - f.bbox[0], h = f.bbox[3] - f.bbox[1];
    if (x + w > o.x + o.w) { x = o.x; y += rowH + o.gap; rowH = 0; }
    out[f.ref] = [r3(x - f.bbox[0]), r3(y - f.bbox[1])];
    x += w + o.gap; rowH = Math.max(rowH, h);
  }
  return out;
}

const BoardViewer = {
  create(el, opts) { if (typeof el === 'string') el = document.getElementById(el); return registry.get(el) || new Viewer(el, opts); },
  get(k) { return registry.get(k) || (typeof k === 'string' ? registry.get(document.getElementById(k)) : null) || null; },
  get all() { return [...new Set(registry.values())]; },
  pileLayout,
  netClass: netCls,
  layers: LAYERS.map(l => ({ id: l[0], zh: l[1], color: l[2] })),
  roles: ROLE_ZH,
  autoInit(root) {
    (root || document).querySelectorAll('.bv[data-bv]').forEach(el => {
      if (registry.has(el)) return;
      let o = {};
      try { o = JSON.parse(el.dataset.bv || '{}'); } catch (e) { console.error('data-bv 不是合法 JSON', el, e); }
      new Viewer(el, o);
    });
  }
};
window.BoardViewer = BoardViewer;
/* 数据小工具 */
QB.fp = ref => D.footprints[FPI[ref]];
QB.net = name => D.nets[NETI[name]];
QB.netIndex = name => NETI[name];
QB.region = id => REG[id];
QB.netCls = netCls;
})();
