/* 第 3 课：板框与布局。QB12 的数字全部从 QB.board（真实设计文件抽出来的数据）现算；
   外部事实（JLC、乐鑫、TI、ST、拓品手册）见 lessons/p3_notes.md 里的 [Sxx] 出处。 */
const D = QB.board, S = D.stats;
const $ = id => document.getElementById('p3-' + id);
const RMx = C.RM;
const W = D.board.w, H = D.board.h, CR = D.board.corner_r;
const KOX = 100, KOY = 100;          // build_board.py 的 OX, OY：板框左上角在 KiCad 坐标 (100, 100) mm（board.json meta.coords）
const wait = ms => new Promise(r => setTimeout(r, ms));
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const num = v => String(Math.round(v * 1000) / 1000);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const net = n => `<span class="net ${QB.netCls(n) === 's' ? 's' : QB.netCls(n) === 'p' ? 'p' : ''}">${n}</span>`;
const FP = r => QB.fp(r);
const NI = n => QB.netIndex(n);
const vfmt = v => String(v).replace(/^([\d.]+)\s*(?=[^\d.\s])/, '$1 ');
const rot360 = r => ((Math.round(r) % 360) + 360) % 360;
const GNDI = NI('GND');
const ALL = D.footprints.map(f => f.ref);
const bw = b => b[2] - b[0], bh = b => b[3] - b[1];
const union = refs => refs.map(r => FP(r).bbox).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
const keep = id => D.zones.find(z => z.rule && z.id === id);
function crtBox(ref) {
  const c = FP(ref).crt;
  return [Math.min(...c.map(p => p[0])), Math.min(...c.map(p => p[1])), Math.max(...c.map(p => p[0])), Math.max(...c.map(p => p[1]))];
}
function polyArea(c) { let a = 0; for (let i = 0; i < c.length; i++) { const p = c[i], q = c[(i + 1) % c.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }

/* ---------- 焊盘与距离 ---------- */
const padsNet = (ref, n) => FP(ref).pads.filter(p => p.t !== 'npth' && p.net === NI(n));
const padsNum = (ref, n) => FP(ref).pads.filter(p => p.t !== 'npth' && p.n === String(n));
function dmin(A, B, oa, ob) {
  let m = Infinity;
  const ax = oa ? oa[0] : 0, ay = oa ? oa[1] : 0, bx = ob ? ob[0] : 0, by = ob ? ob[1] : 0;
  for (const a of A) for (const b of B) m = Math.min(m, Math.hypot(a.x + ax - b.x - bx, a.y + ay - b.y - by));
  return m;
}
const cen = ps => [ps.reduce((s, p) => s + p.x, 0) / ps.length, ps.reduce((s, p) => s + p.y, 0) / ps.length];

/* ---------- 飞线：每个网络一棵最小生成树（示意，和 board.json 的 ratsnest 同一算法） ---------- */
const NETPADS = D.nets.map((n, ni) => {
  const pts = [];
  D.footprints.forEach(f => f.pads.forEach(p => { if (p.net === ni && p.t !== 'npth') pts.push({ ref: f.ref, x: p.x, y: p.y }); }));
  return pts;
});
function mst(off, o) {
  o = o || {};
  const lines = [], per = new Float64Array(D.nets.length);
  let len = 0;
  NETPADS.forEach((pts, ni) => {
    const n = pts.length;
    if (n < 2 || (o.noGnd && ni === GNDI)) return;
    const X = new Float64Array(n), Y = new Float64Array(n), inT = new Uint8Array(n), dist = new Float64Array(n).fill(Infinity), par = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) { const q = off && off[pts[i].ref]; X[i] = pts[i].x + (q ? q[0] : 0); Y[i] = pts[i].y + (q ? q[1] : 0); }
    dist[0] = 0;
    for (let it = 0; it < n; it++) {
      let b = -1, bd = Infinity;
      for (let k = 0; k < n; k++) if (!inT[k] && dist[k] < bd) { bd = dist[k]; b = k; }
      inT[b] = 1;
      if (par[b] >= 0) { lines.push([ni, X[par[b]], Y[par[b]], X[b], Y[b], pts[par[b]].ref, pts[b].ref]); len += bd; per[ni] += bd; }
      for (let k = 0; k < n; k++) if (!inT[k]) { const d = Math.hypot(X[k] - X[b], Y[k] - Y[b]); if (d < dist[k]) { dist[k] = d; par[k] = b; } }
    }
  });
  return { lines, len, per };
}
function crossings(lines) {
  const or = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    for (let j = i + 1; j < lines.length; j++) {
      const b = lines[j];
      if (a[0] === b[0]) continue;
      if (Math.max(a[1], a[3]) < Math.min(b[1], b[3]) || Math.max(b[1], b[3]) < Math.min(a[1], a[3]) || Math.max(a[2], a[4]) < Math.min(b[2], b[4]) || Math.max(b[2], b[4]) < Math.min(a[2], a[4])) continue;
      const d1 = or(b[1], b[2], b[3], b[4], a[1], a[2]), d2 = or(b[1], b[2], b[3], b[4], a[3], a[4]);
      const d3 = or(a[1], a[2], a[3], a[4], b[1], b[2]), d4 = or(a[1], a[2], a[3], a[4], b[3], b[4]);
      if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0) && Math.min(Math.abs(d1), Math.abs(d2), Math.abs(d3), Math.abs(d4)) > 1e-9) n++;
    }
  }
  return n;
}
/* 在某个查看器里画飞线：一池 <line>，按需更新 */
function ratLayer(V) {
  const g = V.annotate(() => {});
  g.setAttribute('class', 'p3-rat');
  const pool = [];
  return {
    g,
    draw(lines, active, hideGnd) {
      let k = 0;
      for (const l of lines) {
        if (hideGnd && l[0] === GNDI) continue;
        let e = pool[k];
        if (!e) { e = C.el('line', {}, g); pool[k] = e; }
        e.setAttribute('x1', l[1].toFixed(3)); e.setAttribute('y1', l[2].toFixed(3));
        e.setAttribute('x2', l[3].toFixed(3)); e.setAttribute('y2', l[4].toFixed(3));
        const h = active && (active.has(l[5]) || active.has(l[6]));
        e.setAttribute('class', h ? 'h' : l[0] === GNDI ? 'g' : '');
        e.style.display = '';
        k++;
      }
      for (; k < pool.length; k++) pool[k].style.display = 'none';
    },
    show(on) { g.style.display = on ? '' : 'none'; }
  };
}
/* 自己的标注组（不用 clearAnnotations，免得把飞线也清掉） */
function annGroup(V) { const g = V.annotate(() => {}); g.setAttribute('class', 'p3-ann'); return g; }
function tag(g, x, y, text, cls, anchor) { return C.el('text', { x: num(x), y: num(y), class: 'p3-tag' + (cls ? ' ' + cls : ''), 'text-anchor': anchor || 'start' }, g, text); }
function rect(g, b, cls) { return C.el('rect', { x: num(b[0]), y: num(b[1]), width: num(bw(b)), height: num(bh(b)), rx: 0.35, class: cls }, g); }
function arrow(g, a, b, cls) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), h = 0.9;
  const d = `M${num(a[0])} ${num(a[1])}L${num(b[0])} ${num(b[1])}M${num(b[0] - h * Math.cos(ang - .45))} ${num(b[1] - h * Math.sin(ang - .45))}L${num(b[0])} ${num(b[1])}L${num(b[0] - h * Math.cos(ang + .45))} ${num(b[1] - h * Math.sin(ang + .45))}`;
  return C.el('path', { d, class: 'p3-ar' + (cls ? ' ' + cls : '') }, g);
}
/* 元件分组的 DOM（查看器里每个元件有好几个 <g class="fp" data-ref>：焊盘、外框、位号、点击区） */
function fpGroups(V) {
  const m = {};
  V.svg.querySelectorAll('.fp[data-ref]').forEach(g => { (m[g.dataset.ref] = m[g.dataset.ref] || []).push(g); });
  return m;
}

/* ---------- 板边距离（圆角矩形，内部为正） ---------- */
function edgeDist(x, y) {
  const cx = Math.min(Math.max(x, CR), W - CR), cy = Math.min(Math.max(y, CR), H - CR);
  if ((x < CR || x > W - CR) && (y < CR || y > H - CR)) return CR - Math.hypot(x - cx, y - cy);
  return Math.min(x, y, W - x, H - y);
}
function padCorners(p) {
  if (p.poly) return p.poly[0];
  if (p.s === 'circle') return Array.from({ length: 24 }, (_, i) => [p.x + p.w / 2 * Math.cos(i * Math.PI / 12), p.y + p.w / 2 * Math.sin(i * Math.PI / 12)]);
  const a = -(p.a || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => { const lx = sx * p.w / 2, ly = sy * p.h / 2; return [p.x + lx * c - ly * s, p.y + lx * s + ly * c]; });
}
const EDGE = (function () {
  let pad = { d: Infinity }, trk = { d: Infinity }, via = { d: Infinity }, zone = { d: Infinity };
  D.footprints.forEach(f => f.pads.forEach(p => {
    if (p.t === 'npth') return;
    const d = Math.min(...padCorners(p).map(q => edgeDist(q[0], q[1])));
    if (d < pad.d) pad = { d, ref: f.ref };
  }));
  D.tracks.forEach(t => { const d = Math.min(edgeDist(t[3], t[4]), edgeDist(t[5], t[6])) - t[2] / 2; if (d < trk.d) trk = { d, net: D.nets[t[0]].name }; });
  D.vias.forEach(v => { const d = edgeDist(v.x, v.y) - v.d / 2; if (d < via.d) via = { d }; });
  D.zones.forEach(z => { if (z.rule) return; for (const l in z.fill) z.fill[l].polys.forEach(poly => poly.forEach(ring => ring.forEach(q => { const d = edgeDist(q[0], q[1]); if (d < zone.d) zone = { d, l }; }))); });
  return { pad, trk, via, zone };
})();

/* ---------- 全课共用的数字 ---------- */
const U1c = crtBox('U1');
const RM_PILE = BoardViewer.pileLayout();
const M0 = mst(RM_PILE), M1 = mst({});
const X0 = crossings(M0.lines), X1 = crossings(M1.lines);
const offGrid = D.footprints.filter(f => [f.x, f.y].some(v => Math.abs(v * 10 - Math.round(v * 10)) > 1e-6));
const rots = [...new Set(D.footprints.map(f => rot360(f.rot)))].sort((a, b) => a - b);
const crtArea = D.footprints.reduce((s, f) => s + (f.crt ? polyArea(f.crt) : 0), 0);
const N = {
  size: `${W} × ${H}`, W: String(W), H: String(H), r: num(CR), ew: num(D.board.edge_width),
  edgeClr: num(D.rules.min_copper_edge_clearance), nfp: String(S.footprints),
  j1over: f1(FP('J1').bbox[3] - H), sw1over: f1(-FP('SW1').bbox[0]),
  nhid: String(S.refs_hidden.length), hid: S.refs_hidden.join('、'),
  offgrid: offGrid.map(f => { const ax = Math.abs(f.x * 10 - Math.round(f.x * 10)) > 1e-6 ? 'x' : 'y'; return `${f.ref} 的 ${ax} 是 ${num(f[ax])}`; }).join('、') || '没有例外',
  rots: rots.map(r => r + '°').join('、'),
  u1k: `${num(FP('U1').x + KOX)}, ${num(FP('U1').y + KOY)}`,
  c6v: vfmt(FP('C6').value), q2pads: String(FP('Q2').pads.filter(p => p.t !== 'npth').length)
};
document.querySelectorAll('#p3 [data-n]').forEach(e => { if (N[e.dataset.n] != null) e.textContent = N[e.dataset.n]; });

/* ======================= 3.1 板子多大 ======================= */
const SHORT = { connectors: '插座', mcu: '主控模组', switch: '开关', power: '电源', motor: '电机驱动', charge: '充电', usb: 'USB', buttons: '按键与检测' };
const LEFT = ['J3', 'J4', 'SW1', 'J2'];
const ZB = BoardViewer.create($('sizebv'), { toolbar: false, panel: false, hover: true, layers: ['F.Cu', 'Courtyard', 'Edge.Cuts', 'Labels'], tracks: false, label: 'QB12 板子：元件外框、区域和尺寸标注' });
let sizeMode = 'reg', zAnn = null;
function sizeView(m) {
  sizeMode = m;
  C.pressOne('#p3 [data-p3size]', 'p3size', m);
  if (zAnn) zAnn.remove();
  zAnn = annGroup(ZB);
  const g = zAnn, st = $('size-st'), ro = $('size-ro');
  ZB.clear();
  if (m === 'reg') {
    D.regions.filter(r => r.id !== 'antenna').forEach((r, i) => {
      const b = [Math.max(r.bbox[0], -0.3), r.bbox[1], r.bbox[2], Math.min(r.bbox[3], H + 0.3)];
      rect(g, b, 'p3-rg p3-c' + i);
      // 标签默认放左上角；电源、充电两块的左上角压着别的元件，改放到下边
      const at = { power: [b[2] - 0.35, b[3] - 0.45, 'end'], charge: [b[0] + 0.35, b[3] - 0.45, 'start'] }[r.id] || [b[0] + 0.35, b[1] + 1.35, 'start'];
      tag(g, at[0], at[1], SHORT[r.id] || r.label, 'p3-c' + i, at[2]);
    });
    st.innerHTML = `大致三列：<b>左边</b>贴着板边的插座和开关，<b>中间</b>电机驱动、电源、充电三组，<b>右边</b> ESP32 模组；下边缘再排一行 USB-C 和两个按键。框是每个区域里元件外框的外包（区域划分见第 0 课的导览）。`;
    ro.innerHTML = tiles([['板子', `${N.size} mm`, `面积 ${Math.round(S.area)} mm²`], ['元件外框合计', `${Math.round(crtArea)} mm²`, `占板面 ${Math.round(crtArea / S.area * 100)}%`], ['最大的一块', `${f1(bw(U1c))} × ${f1(bh(U1c))}`, 'mm，ESP32 模组'], ['元件', `${S.footprints} 个`, `全在顶面`]]);
  } else if (m === 'h') {
    const L = LEFT.map(r => FP(r).bbox);
    const sumH = L.reduce((s, b) => s + bh(b), 0);
    LEFT.forEach((r, i) => {
      const b = L[i];
      rect(g, b, 'p3-dimbox');
      tag(g, Math.max(b[0], 0) + 0.4, b[1] + 1.5, r, 'p3-strong');
      tag(g, Math.max(b[0], 0) + 0.4, b[1] + 3.0, f1(bh(b)), '');
    });
    // 右边一列：模组、分压电阻那一行、按键
    const rowRefs = ['R18', 'R11', 'R12', 'C8', 'R8'];
    const R1b = U1c, R2b = union(rowRefs), R3b = union(['SW2', 'SW3']);
    [[R1b, '模组', bh(R1b)], [R2b, '分压', bh(R2b)], [R3b, '按键', bh(R3b)]].forEach(([b, t, h]) => {
      rect(g, b, 'p3-dimbox r');
      tag(g, b[0] + 0.4, b[1] + (bh(b) > 3 ? 1.5 : -0.4), `${t} ${f1(h)}`, 'p3-strong');
    });
    // 竖向尺寸线
    C.el('path', { d: `M-0.75 0L-0.75 ${H}M-1.2 0L-0.3 0M-1.2 ${H}L-0.3 ${H}`, class: 'p3-dim' }, g);
    const sumR = bh(R1b) + bh(R2b) + bh(R3b);
    st.innerHTML = `<b>左边缘</b>从上到下排着 J3、J4 两个电机插座、拨动开关 SW1、电池插座 J2，四个外框高 ${L.map(b => f1(bh(b))).join(' + ')} = <b>${f1(sumH)} mm</b>；它们之间和上下还要留 1–2 mm 给走线、位号，合起来正好 ${H} mm。<b>右边一列</b>也是满的：模组 ${f1(bh(R1b))} mm，下面一行分压电阻，再下面是 ${f1(bh(R3b))} mm 的按键。`;
    ro.innerHTML = tiles([['左列外框合计', `${f1(sumH)} mm`, `4 个元件`], ['左列留空合计', `${f1(H - sumH)} mm`, '缝隙 + 上下边'], ['右列外框合计', `${f1(sumR)} mm`, '模组 + 电阻 + 按键'], ['板高', `${H} mm`, '']]);
  } else {
    const cols = [
      ['插座', union(['J2', 'J3', 'J4'])],
      ['电机 / 电源 / 充电', union([...QB.region('motor').refs, ...QB.region('power').refs, ...QB.region('charge').refs])],
      ['小电容', union(QB.region('mcu').refs.filter(r => r !== 'U1'))],
      ['模组', U1c]
    ];
    const yb = [28.2, 23.7, 7.0, 13.2];    // 每列标注放在那一列里比较空的高度
    cols.forEach(([t, b], i) => {
      const band = [b[0], -0.2, b[2], H + 0.2];
      rect(g, band, 'p3-band p3-c' + i);
      const y = yb[i];
      C.el('path', { d: `M${num(b[0])} ${y}L${num(b[2])} ${y}M${num(b[0])} ${y - 0.5}L${num(b[0])} ${y + 0.5}M${num(b[2])} ${y - 0.5}L${num(b[2])} ${y + 0.5}`, class: 'p3-dim' }, g);
      tag(g, (b[0] + b[2]) / 2, y - 0.6, `${t} ${f1(bw(b))}`, 'p3-strong', 'middle');
    });
    const used = cols.reduce((s, c) => s + bw(c[1]), 0);
    const right = W - U1c[2];
    C.el('path', { d: `M${num(U1c[2])} 13.2L${W} 13.2`, class: 'p3-dim' }, g);
    tag(g, W - 0.2, 12.4, `余 ${f1(right)}`, 'p3-strong', 'end');
    st.innerHTML = `横着数：左边插座一列 ${f1(bw(cols[0][1]))} mm，中间电机驱动、电源、充电三组 ${f1(bw(cols[1][1]))} mm，模组左边一列小电容 ${f1(bw(cols[2][1]))} mm，模组本体 ${f1(bw(cols[3][1]))} mm，一共 <b>${f1(used)} mm</b>。剩下的 ${f1(W - used)} mm 是列与列之间的缝（走线从这里穿过去）和模组右边留的 ${f1(right)} mm。`;
    ro.innerHTML = tiles([['四列元件合计', `${f1(used)} mm`, ''], ['缝隙 + 边', `${f1(W - used)} mm`, '走线要从这里过'], ['模组右边', `${f1(right)} mm`, ''], ['板宽', `${W} mm`, '']]);
  }
}
function tiles(list) { return list.map(([k, v, s]) => `<div class="ro"><small>${k}</small><b>${v}</b><small>${s || '&nbsp;'}</small></div>`).join(''); }
document.querySelectorAll('#p3 [data-p3size]').forEach(b => b.addEventListener('click', () => sizeView(b.dataset.p3size)));
C.onVisible($('sizebv'), () => sizeView(sizeMode), '300px');
$('size-st').textContent = ' ';

/* ---- 尺寸门槛（同一比例，1 mm = 1.4 px） ---- */
(function () {
  const svg = $('tier'), k = 1.4, ox = 14, oy = 168;
  // 船的电子舱开口：../../hardware/hull/build_model.py 第 149 行 bay_poly（船身坐标 mm）
  const BAY = [[40, -38], [164, -38], [184, 0], [164, 38], [40, 38]];
  const bayL = Math.max(...BAY.map(p => p[0])) - Math.min(...BAY.map(p => p[0])), bayW = Math.max(...BAY.map(p => p[1])) - Math.min(...BAY.map(p => p[1]));
  const R = (x, y, w, h, cls, rx) => C.el('rect', { x: ox + x * k, y: oy - (y + h) * k, width: w * k, height: h * k, rx: (rx || 0) * k, class: cls }, svg);
  const T = (x, y, t, cls, a) => C.el('text', { x: ox + x * k, y: oy - y * k, class: 'p3-tt ' + (cls || ''), 'text-anchor': a || 'start' }, svg, t);
  const MODES = {
    eco: { t: '经济型贴片：单板 10 × 10 mm 起', x: `JLC 的经济型贴片要求单板至少 10 × 10 mm、板厚 0.8–1.6 mm、只贴一面，不需要工艺边和 Mark 点。QB12 ${N.size} mm、1.6 mm 厚、元件全在顶面，可以直接按单板贴。但 QB12 实际没走经济型：经济型不贴 ESP32 模组 U1，下单选的是标准型（第 8 课 8.3）。`,
      draw() { R(0, 0, 10, 10, 'p3-tq ok'); T(W + 3, 3, '左下角小方块：10 × 10 最小', 'ok'); } },
    std: { t: '标准型贴片：单板至少 70 × 70 mm', x: `标准型贴片的单板最小 70 × 70 mm。QB12 比它小，要走标准型就得拼板（多块连在一起）或加工艺边，凑够 70 × 70；JLC 贴片用的工艺边是 5 mm 宽。QB12 实际走的就是标准型：它没画工艺边，下单后嘉立创自动加，拼成约 7.0 × 6.6 cm 的一块（第 8 课 8.3）。图里虚线是拼成 2 × 2、间距 2 mm 的样子（示意，不是 QB12 的实际拼法）。`,
      draw() {
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) R(i * (W + 2), j * (H + 2), W, H, 'p3-tq ghost', CR);
        R(0, 0, 70, 70, 'p3-tq warn'); T(2 * W + 4, 66, '70 × 70 最小', 'warn');
        T(0, 2 * H + 2 + 3, `2 × 2 拼板 ${2 * W + 2} × ${2 * H + 2}（示意）`, 'mu');
      } },
    proto: { t: '打样常见一档：100 × 100 mm 以内', x: `JLC 的打样报价和加急交期表里，最常见的一档是 100 × 100 mm 以内的双层板（价格经常有促销，以下单页为准）。QB12 的面积只有这一档的 ${Math.round(S.area / 10000 * 100)}%。`,
      draw() { R(0, 0, 100, 100, 'p3-tq hl'); T(101, 96, '100 × 100', 'hl'); } },
    boat: { t: '船的电子舱：比板子大得多', x: `船身模型（boat3d/build_model.py）里的电子舱开口长 ${bayL} mm（含船头方向的尖角）、宽 ${bayW} mm。板子放进去绰绰有余，所以卡住板子大小的不是船身，而是要贴边的接口、模组和元件数量。板子在舱里的位置是示意。`,
      draw() {
        const x0 = Math.min(...BAY.map(p => p[0]));
        C.el('path', { d: 'M' + BAY.map(p => `${ox + (p[0] - x0) * k} ${oy - (p[1] + 38 + 20) * k}`).join('L') + 'Z', class: 'p3-tq bay' }, svg);
        T(2, 20 + bayW + 3, `电子舱开口 ${bayL} × ${bayW} mm`, 'mu');
      } }
  };
  function show(m) {
    C.pressOne('#p3 [data-p3tier]', 'p3tier', m);
    svg.innerHTML = '';
    const M = MODES[m];
    M.draw();
    // QB12 本身（圆角矩形）
    const bx = m === 'boat' ? (124 / 2 - W / 2) : 0, by = m === 'boat' ? 20 + (76 - H) / 2 : 0;
    R(bx, by, W, H, 'p3-tq qb', CR);
    T(bx + 3, by + H - 9, 'QB12', 'qb');
    T(bx + 3, by + H - 19, `${N.size}`, 'qb mu2');
    $('tier-t').textContent = M.t;
    $('tier-x').textContent = M.x;
  }
  document.querySelectorAll('#p3 [data-p3tier]').forEach(b => b.addEventListener('click', () => show(b.dataset.p3tier)));
  show('eco');
})();

/* ======================= 3.2 板框 ======================= */
(function () {
  const svg = $('ol'), r = CR;
  // 和 build_board.py 第 219–223 行同样的 8 段：4 段直线、4 段 90° 圆弧（顺序也一样）
  const P = [
    ['seg', `M${r} 0L${W - r} 0`, [W / 2, -1.6]], ['seg', `M${W} ${r}L${W} ${H - r}`, [W + 2.2, H / 2]],
    ['seg', `M${W - r} ${H}L${r} ${H}`, [W / 2, H + 3]], ['seg', `M0 ${H - r}L0 ${r}`, [-2.2, H / 2]],
    ['arc', `M${W - r} 0A${r} ${r} 0 0 1 ${W} ${r}`, [W + 1.4, -1.2]], ['arc', `M${W} ${H - r}A${r} ${r} 0 0 1 ${W - r} ${H}`, [W + 1.4, H + 2.4]],
    ['arc', `M${r} ${H}A${r} ${r} 0 0 1 0 ${H - r}`, [-1.4, H + 2.4]], ['arc', `M0 ${r}A${r} ${r} 0 0 1 ${r} 0`, [-1.4, -1.2]]
  ];
  const GAP = 5;   // “去掉一段”去掉第 6 段（右下角圆弧）
  const sub = C.el('path', { d: `M${r} 0L${W - r} 0A${r} ${r} 0 0 1 ${W} ${r}L${W} ${H - r}A${r} ${r} 0 0 1 ${W - r} ${H}L${r} ${H}A${r} ${r} 0 0 1 0 ${H - r}L0 ${r}A${r} ${r} 0 0 1 ${r} 0Z`, class: 'p3-ol-sub' }, svg);
  const els = P.map(([k, d, lp], i) => {
    const g = C.el('g', { class: 'p3-ol-pc' }, svg);
    const p = C.el('path', { d, pathLength: 1, class: 'p3-ol-p ' + k }, g);
    C.el('text', { x: lp[0], y: lp[1], class: 'p3-ol-n', 'text-anchor': 'middle' }, g, '①②③④⑤⑥⑦⑧'[i]);
    return { g, p };
  });
  // R2 标注（右上角）
  const ra = C.el('g', { class: 'p3-ol-r' }, svg);
  C.el('circle', { cx: W - r, cy: r, r: 0.35 }, ra);
  C.el('path', { d: `M${W - r} ${r}L${num(W - r + r * Math.SQRT1_2)} ${num(r - r * Math.SQRT1_2)}` }, ra);
  C.el('text', { x: W - r - 1.0, y: r + 3.4, 'text-anchor': 'end' }, ra, `R${num(r)}`);
  C.el('text', { x: W / 2, y: H / 2 + 1, class: 'p3-ol-c', 'text-anchor': 'middle' }, svg, `${N.size} mm`);
  const mk = [C.el('circle', { r: 1.1, class: 'p3-ol-x' }, svg), C.el('circle', { r: 1.1, class: 'p3-ol-x' }, svg)];
  mk[0].setAttribute('cx', W); mk[0].setAttribute('cy', H - r); mk[1].setAttribute('cx', W - r); mk[1].setAttribute('cy', H);
  let gap = false, tok = 0;
  const st = $('ol-st');
  function status() {
    if (gap) { st.className = 'status bad'; st.innerHTML = `少了第 ⑥ 段，外形没有闭合：两个红圈处的线头没接上。KiCad 的 DRC 会报“电路板的外框形状有问题”，3D 和铺铜也算不出板子在哪；交给工厂，CAM 工程师也分不清哪边是板子。JLC 建议上传前用 Gerber 查看器确认外形是闭合的。`; }
    else { st.className = 'status good'; st.innerHTML = `8 段首尾相接：每一段的终点都是另一段的起点，KiCad 把它们串成一圈，圈里面就是板子。画的顺序无所谓，脚本就是先画 4 条直线、再补 4 个角。`; }
  }
  function paint(n, q) {    // 前 n 段画完，第 n 段画到 q
    els.forEach((e, i) => {
      const hide = gap && i === GAP;
      const v = hide ? 1 : i < n ? 0 : i === n ? 1 - q : 1;
      e.p.style.strokeDashoffset = String(v);
      e.g.style.opacity = hide ? '0' : (i <= n ? '1' : '.0');
    });
    sub.style.opacity = !gap && n >= 8 ? '1' : '0';
    mk.forEach(m => { m.style.display = gap && n >= 8 ? '' : 'none'; });
  }
  async function draw() {
    const my = ++tok;
    if (RMx) { paint(8, 1); status(); return; }
    st.className = 'status'; st.textContent = '画线中…';
    for (let i = 0; i < 8; i++) {
      if (gap && i === GAP) continue;
      const t0 = performance.now(), dur = P[i][0] === 'seg' ? 420 : 260;
      await new Promise(res => {
        const step = now => {
          if (my !== tok) return res();
          const q = Math.min(1, (now - t0) / dur);
          paint(i, q);
          if (q < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      if (my !== tok) return;
    }
    paint(8, 1); status();
  }
  $('ol-draw').addEventListener('click', draw);
  $('ol-gap').addEventListener('click', () => {
    gap = !gap; $('ol-gap').setAttribute('aria-pressed', String(gap));
    $('ol-gap').textContent = gap ? '把第 ⑥ 段补回来' : '去掉一段会怎样';
    tok++; paint(8, 1); status();
  });
  paint(8, 1); status();
  C.onVisible(svg, () => { if (!RMx) draw(); }, '-80px');
  // 真实代码节选
  $('ol-code').innerHTML = [
    '<span class="cm"># build_board.py（节选，一行一句）</span>',
    `BW, BH = <span class="n">${W.toFixed(1)}</span>, <span class="n">${H.toFixed(1)}</span>`,
    '<span class="cm"># 板框（圆角矩形）</span>',
    `r = <span class="n">${CR.toFixed(1)}</span>`,
    '<span class="kw">seg</span>(P(r, 0), P(BW - r, 0))',
    '<span class="kw">seg</span>(P(BW, r), P(BW, BH - r))',
    '<span class="kw">seg</span>(P(BW - r, BH), P(r, BH))',
    '<span class="kw">seg</span>(P(0, BH - r), P(0, r))',
    '<span class="kw">arc</span>(P(BW - r, r), P(BW - r, 0), <span class="n">90</span>)',
    '<span class="kw">arc</span>(P(BW - r, BH - r), P(BW, BH - r), <span class="n">90</span>)',
    '<span class="kw">arc</span>(P(r, BH - r), P(r, BH), <span class="n">90</span>)',
    '<span class="kw">arc</span>(P(r, r), P(0, r), <span class="n">90</span>)'
  ].join('\n');
})();

/* ---- 铜离板边（示意，放大到板边附近） ---- */
(function () {
  const svg = $('ecsvg'), inp = $('ec'), u0 = -0.35, u1 = 0.85, k = 320 / (u1 - u0);
  const X = u => 20 + (u - u0) * k;
  const yT = 22, yB = 104, c0 = 34, c1 = 66;        // 板边附近一条 + 铜的上下边
  const defs = C.el('defs', {}, svg);
  const pat = C.el('pattern', { id: 'p3-ec-hatch', patternUnits: 'userSpaceOnUse', width: 7, height: 7, patternTransform: 'rotate(45)' }, defs);
  C.el('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'p3-ec-hl' }, pat);
  C.el('rect', { x: 0, y: yT, width: 360, height: yB - yT, class: 'p3-ec-out' }, svg);
  const brd = C.el('rect', { y: yT, height: yB - yT, class: 'p3-ec-brd' }, svg);
  C.el('rect', { x: X(-0.2), y: yT, width: 0.4 * k, height: yB - yT, fill: 'url(#p3-ec-hatch)', class: 'p3-ec-band' }, svg);
  const cu = C.el('rect', { y: c0, height: c1 - c0, class: 'p3-ec-cu' }, svg);
  const hit = C.el('rect', { y: c0, height: c1 - c0, class: 'p3-ec-hit' }, svg);
  const cut = C.el('line', { y1: yT - 2, y2: yB + 2, class: 'p3-ec-cut' }, svg);
  C.el('line', { x1: X(0), y1: yT - 4, x2: X(0), y2: yB + 4, class: 'p3-ec-nom' }, svg);
  C.el('text', { x: X(-0.32), y: 14, class: 'p3-ec-t mu' }, svg, '板外');
  C.el('text', { x: X(0), y: 14, class: 'p3-ec-t', 'text-anchor': 'middle' }, svg, '板框线');
  C.el('text', { x: X(u1) - 2, y: 14, class: 'p3-ec-t mu', 'text-anchor': 'end' }, svg, '板内');
  const cutT = C.el('text', { y: yB + 15, class: 'p3-ec-t sm', 'text-anchor': 'middle' }, svg, '实际切边');
  C.el('text', { x: X(0), y: yB + 30, class: 'p3-ec-t pw', 'text-anchor': 'middle' }, svg, '±0.2 外形公差');
  const dimL = C.el('path', { class: 'p3-ec-dim' }, svg);
  const dimT = C.el('text', { y: yB - 7, class: 'p3-ec-t', 'text-anchor': 'middle' }, svg, '');
  // 刻度轴：红 = 太近，黄 = 够最低要求，绿 = 放心
  const ty = 160;
  [[0, 0.2, 'bad'], [0.2, 0.3, 'warn'], [0.3, u1 - 0.02, 'good']].forEach(([a, b, c]) => C.el('line', { x1: X(a), y1: ty, x2: X(b), y2: ty, class: 'p3-ec-zone ' + c }, svg));
  [0, 0.2, 0.3, 0.4, 0.5].forEach(u => {
    C.el('line', { x1: X(u), y1: ty - 6, x2: X(u), y2: ty + 6, class: 'p3-ec-ax' }, svg);
    C.el('text', { x: X(u), y: ty - 10, class: 'p3-ec-t sm', 'text-anchor': 'middle' }, svg, u ? u.toFixed(1) : '0');
  });
  C.el('text', { x: X(0.65), y: ty - 10, class: 'p3-ec-t sm mu', 'text-anchor': 'middle' }, svg, 'mm');
  const mark = C.el('path', { class: 'p3-ec-mk' }, svg);
  // 切边位置：在 ±0.2 mm 之间慢慢来回（示意）；减少动画时固定画最坏的 +0.2 mm
  let d = 0.3, t = 0;
  const cutU = () => RMx ? 0.2 : 0.2 * Math.sin(t * 0.9);
  function draw() {
    const cu_ = cutU(), xc = X(cu_), xd = X(d);
    cut.setAttribute('x1', xc.toFixed(1)); cut.setAttribute('x2', xc.toFixed(1));
    cutT.setAttribute('x', xc.toFixed(1)); cutT.textContent = RMx ? '最坏的切边' : '实际切边';
    brd.setAttribute('x', xc.toFixed(1)); brd.setAttribute('width', (360 - xc).toFixed(1));
    cu.setAttribute('x', xd.toFixed(1)); cu.setAttribute('width', Math.max(0, 360 - xd).toFixed(1));
    hit.setAttribute('x', xd.toFixed(1)); hit.setAttribute('width', Math.max(0, xc - xd).toFixed(1));
    dimL.setAttribute('d', `M${X(0)} ${yB - 20}L${xd} ${yB - 20}M${X(0)} ${yB - 25}L${X(0)} ${yB - 15}M${xd} ${yB - 25}L${xd} ${yB - 15}`);
    dimT.setAttribute('x', Math.max((X(0) + xd) / 2, X(0) + 34)); dimT.textContent = `${d.toFixed(2)} mm`;
    mark.setAttribute('d', `M${xd} ${ty + 8}l-6 9h12z`);
  }
  const st = $('ec-st');
  function status() {
    $('ec-v').textContent = d.toFixed(2) + ' mm';
    const q = d + 1e-9;
    if (q < 0.2) { st.className = 'status bad'; st.textContent = '比 JLC 锣边要求的 0.2 mm 还近：外形本身就有 ±0.2 mm 的公差，切边偏进来时铣刀会铣到铜（黄色那块），露铜、起毛刺，甚至把线切断。'; }
    else if (q < 0.3) { st.className = 'status warn'; st.textContent = '够了 JLC 锣边的最低要求（0.2 mm）。但做经济型贴片时，分板还有约 0.2 mm 公差，JLC 建议走线和元件离板边大于 0.3 mm。'; }
    else if (q < 0.305) { st.className = 'status warn'; st.textContent = `QB12 的规则就是 ${N.edgeClr} mm（约束页里设的“铜箔到板边间距”），刚好压在 JLC 经济型贴片建议的线上：JLC 要的是走线和元件边缘都离板边“大于” 0.3 mm。QB12 的 J1、SW1 还故意伸出板边（3.4），下单时留意工程师会不会提出来。`; }
    else if (q < 0.4) { st.className = 'status good'; st.textContent = '比 0.3 mm 多一点，满足 JLC 经济型贴片“走线和元件离板边大于 0.3 mm”的建议。'; }
    else if (q < 0.5) { st.className = 'status good'; st.textContent = '如果要做 V 割拼板，铜离 V 割线要 ≥ 0.4 mm；这个距离也够。'; }
    else { st.className = 'status good'; st.textContent = 'KiCad 新建工程默认就是 0.5 mm，最保守。小板上每 0.1 mm 都是走线的地方，按厂家能力改小一点很常见。'; }
  }
  inp.addEventListener('input', () => { d = +inp.value; draw(); status(); });
  draw(); status();
  if (!RMx) {
    let vis = false;
    C.onVisible(svg, () => { vis = true; }, '0px');
    C.tickers.add((tt, dt) => { if (!vis) return; t += dt; draw(); });
  }
  // 对照表 + QB12 实际
  const rows = [['JLC 锣边最少', '0.2 mm'], ['JLC 经济型贴片建议', '走线和元件 > 0.3 mm'], ['V 割拼板', '≥ 0.4 mm'], ['KiCad 新建默认', '0.5 mm'], ['QB12 的规则', `${N.edgeClr} mm`]];
  $('ec-tbl').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
  const ecDrc = D.drc.by_type.find(x => x.type === 'copper_edge_clearance');
  const silk = D.drc.by_type.find(x => x.type === 'silk_edge_clearance');
  $('ec-real').innerHTML = `QB12 上离板边最近的铜：铺铜 ${f2(EDGE.zone.d)} mm（铺铜按规则自己退让），焊盘 ${f2(EDGE.pad.d)} mm（${EDGE.pad.ref}），走线 ${f2(EDGE.trk.d)} mm，过孔 ${f2(EDGE.via.d)} mm。DRC 报的“铜离板边”问题 ${ecDrc ? ecDrc.n : 0} 条${silk ? `（只有 ${silk.n} 条“${silk.zh}”的警告，第 6 课讲）` : ''}。`;
})();

/* ======================= 3.3 摆放顺序 ======================= */
const RG = id => QB.region(id).refs;
const V1 = {   // build_board_v1.py 第 84–88 行：旧版坐标表里开关和两颗 MOS 管的位置（x, y, 旋转角）
  SW1: [25.5, 3.7, 180], Q2: [25.0, 8.6, 0], R14: [28.4, 8.6, 90], Q1: [25.0, 12.8, 0], R13: [28.4, 12.8, 90]
};
const v1off = ref => [V1[ref][0] - FP(ref).x, V1[ref][1] - FP(ref).y];
const mot = ['ML+', 'ML-', 'MR+', 'MR-'];
const motLen = mot.reduce((s, n) => s + M1.per[NI(n)], 0);
const bulk = ['C9', 'C10', 'C14', 'C15'];
const bulkNear = bulk.map(r => [r, dmin(padsNet(r, 'VSYS'), padsNum('U2', 12))]).sort((a, b) => a[1] - b[1])[0];
const ant = keep('antenna');
const STEPS = [
  { name: '一堆', refs: [],
    t: '刚导进来：一堆',
    why: () => `从原理图导进 PCB 以后，${S.footprints} 个封装和 ${S.nets} 个网络都进来了，但元件还没位置，挤成一堆（这里按大小排成几排，示意）。每个网络的焊盘用飞线两两连着：现在又长又乱，到处交叉。`,
    facts: () => [['元件', `${S.footprints} 个`], ['网络', `${S.nets} 个`], ['飞线', `${M0.lines.length} 条，共 ${Math.round(M0.len)} mm`], ['交叉', `${X0} 处`]],
    src: '先画好板框（3.2），再开始摆。' },
  { name: '贴边', refs: [...RG('connectors'), 'J1', 'SW1'],
    t: '① 接口和开关：先贴边',
    why: () => '先摆位置被外面定死的东西：电机线、电池线要从船舱里接过来，USB 插头要插得进去，开关要拨得到。所以它们必须贴着板边、开口朝外。QB12 把两个电机插座和电池插座排在左边一条边上，拨动开关夹在中间，USB-C 放在下边缘。',
    facts: () => [['J3、J4、J2', `外框离左边缘 ${f1(Math.min(...['J2', 'J3', 'J4'].map(r => FP(r).bbox[0])))} mm，开口朝左`], ['USB-C（J1）', `外框伸出下边缘 ${N.j1over} mm，插口露在外面`], ['拨动开关 SW1', `拨杆伸出左边缘 ${N.sw1over} mm`]],
    src: '道理：从结构出发推导（脚本里没写理由）。',
    ann(g) {
      const c = union(['J2', 'J3', 'J4']);
      rect(g, [c[0] - 0.2, c[1] - 0.2, c[2] + 0.2, c[3] + 0.2], 'p3-hbox');
      const j1 = FP('J1').bbox, sw = FP('SW1').bbox;
      arrow(g, [(j1[0] + j1[2]) / 2, H - 2.2], [(j1[0] + j1[2]) / 2, j1[3] + 0.1]);
      tag(g, j1[2] + 0.6, H - 1.0, `伸出 ${N.j1over}`, 'p3-strong');
      arrow(g, [sw[2] + 1.6, (sw[1] + sw[3]) / 2], [sw[0] - 0.1, (sw[1] + sw[3]) / 2]);
      tag(g, sw[2] + 1.9, (sw[1] + sw[3]) / 2 + 0.45, `伸出 ${N.sw1over}`, 'p3-strong');
    } },
  { name: '模组', refs: ['U1'],
    t: '② ESP32 模组：天线贴着板边',
    why: () => `模组是板上最大的一块，还自带 2.4 GHz 天线。乐鑫的硬件设计指南建议：天线最好伸出底板，至少馈点要靠近板边；天线下面和周围不能有铜，USB 口、串口线这些要离天线远一点。指南的首选是让天线伸出底板；伸不出去时，馈点要靠近板边，并把天线两侧和下方的底板切掉。QB12 是折中：模组放在右上角，天线那头离上边缘只有 ${f1(U1c[1])} mm，下面的板子没有切掉，而是两层都挖空了铜（橙色斜线，第 5 课细讲）。`,
    facts: () => [['模组外框', `${f1(bw(U1c))} × ${f1(bh(U1c))} mm`], ['天线端离上边缘', `${f1(U1c[1])} mm`], ['禁布区', `${f1(bw(ant.bbox))} × ${f1(bh(ant.bbox))} mm，两层都不许有铜`], ['模组手册的天线区', '约 6 mm 深'], ['离 USB-C', `${f1(FP('J1').bbox[1] - ant.bbox[3])} mm`]],
    src: '依据：乐鑫 ESP32-S3 硬件设计指南、ESP32-S3-WROOM-1 数据手册。',
    ann(g) { rect(g, U1c, 'p3-hbox'); } },
  { name: '电源路径', refs: [...RG('switch').filter(r => r !== 'SW1'), ...RG('power')],
    t: '③ 电源路径：大电流走最短的路',
    why: () => `电池电流的路是 J2（电池）→ Q2（开关管）→ Q1（USB / 电池自动切换）→ ${net('VSYS')} → 四颗 ${vfmt(FP('C9').value)} 储能电容 → 电机驱动。电流大的路要短、要直，所以 Q2、Q1 就排在 J2 和开关旁边。build_board.py 里的注释写着：“电池开关 Q2 漏极 -> Q1 漏极：大电流短直连，0.8 mm”；“C9（靠 Q1 一侧）直接连到 C14（靠 U2/D1 一侧），让大电容就近给电机驱动供电”。`,
    facts: () => [['J2 → Q2', `${f1(dmin(padsNet('J2', 'BAT+'), padsNet('Q2', 'BAT+')))} mm`], ['Q2 → Q1（漏极到漏极）', `${f1(dmin(padsNet('Q2', 'BAT_SW'), padsNet('Q1', 'BAT_SW')))} mm`], ['Q1 → C9', `${f1(dmin(padsNet('Q1', 'VSYS'), padsNet('C9', 'VSYS')))} mm`], ['旧版坐标表里 J2 → Q2', `${f1(dmin(padsNet('J2', 'BAT+'), padsNet('Q2', 'BAT+'), null, v1off('Q2')))} mm`]],
    extra: '<button class="btn" id="p3-v1" aria-pressed="false">对比旧版坐标表（build_board_v1.py）</button>',
    src: '依据：build_board.py 的注释；旧版位置来自 build_board_v1.py。',
    ann(g) {
      const pts = [cen(padsNet('J2', 'BAT+')), cen(padsNet('Q2', 'BAT+')), cen(padsNet('Q1', 'VSYS')), cen(padsNet('C9', 'VSYS')), cen(padsNet('C14', 'VSYS'))];
      for (let i = 0; i < pts.length - 1; i++) arrow(g, pts[i], pts[i + 1], 'pw');
      tag(g, pts[0][0] + 3.6, pts[0][1] + 0.5, '电池电流', 'p3-strong pw');
    } },
  { name: '电机驱动', refs: RG('motor'),
    t: '④ 电机驱动 DRV8833：贴着电机插座',
    why: () => `U2 的四个输出脚接左右两个电机，所以它放在 J3、J4 的右边，电机线最短。TI 的数据手册要求它的三颗小电容都“尽量靠近引脚”：VM 的旁路电容、VM 和 VCP 之间的 0.01 µF、VINT 的 2.2 µF。QB12 把它们竖排在 U2 右边（C13、C11、C12），两颗 ${vfmt(FP('R15').value.split(' ')[0])} 采样电阻 R15、R16 放在 U2 上下两头。`,
    facts: () => [['四根电机线的飞线', `共 ${f1(motLen)} mm`], ['C13（VINT）→ 14 号脚', `${f1(dmin(padsNet('C13', 'VINT'), padsNum('U2', 14)))} mm`], ['C11（VM）→ 12 号脚', `${f1(dmin(padsNet('C11', 'VSYS'), padsNum('U2', 12)))} mm`], ['C12（VCP）→ 11 号脚', `${f1(dmin(padsNet('C12', 'VCP'), padsNum('U2', 11)))} mm`]],
    extra: () => `<p class="p3-note">和手册对一下：TI 建议 VM 脚旁边放 10 µF。QB12 紧挨着 VM 的是 ${vfmt(FP('C11').value)} 的 C11；10 µF 级别的储能由四颗 ${vfmt(FP('C9').value)} 负责，最近的 ${bulkNear[0]} 离 VM 脚 ${f1(bulkNear[1])} mm。</p>`,
    src: '依据：TI DRV8833 数据手册第 10 节（布局）。',
    ann(g) {
      const u = cen(padsNum('U2', 2)), v = cen(padsNum('U2', 7));
      arrow(g, u, cen(padsNet('J3', 'ML+')), 'sg'); arrow(g, v, cen(padsNet('J4', 'MR+')), 'sg');
      [['C13', 'VINT'], ['C11', 'VM'], ['C12', 'VCP']].forEach(([r, t]) => { const b = FP(r).bbox; tag(g, b[2] + 1.4, (b[1] + b[3]) / 2 + 0.4, t, 'p3-strong'); });
    } },
  { name: '充电', refs: RG('charge'),
    t: '⑤ 充电 TP4056：挨着电池插座',
    why: () => `TP4056 一头接 USB 的 5 V，一头接电池，所以放在左下角，紧挨着电池插座 J2。手册要求：设定充电电流的 R3（RPROG）尽量靠近芯片，VCC、BAT 两脚的电容也尽量靠近。线性充电时多出来的电压全变成热，手册说板上的铜就是它的散热器，所以周围留了大片地铜（散热过孔第 5 课讲）。红绿两个充电灯 LED1、LED2 就在旁边。`,
    facts: () => [['U4 的 BAT 脚 → J2', `${f1(dmin(padsNum('U4', 5), padsNet('J2', 'BAT+')))} mm`], ['R3 → PROG（2 号脚）', `${f1(dmin(padsNet('R3', 'PROG'), padsNum('U4', 2)))} mm`], ['C1 → VCC（4 号脚）', `${f1(dmin(padsNet('C1', 'VBUS'), padsNum('U4', 4)))} mm`], ['C2 → BAT（5 号脚）', `${f1(dmin(padsNet('C2', 'BAT+'), padsNum('U4', 5)))} mm`]],
    src: '依据：TP4056 数据手册（拓品 REV 2.4）的布局与散热建议。',
    ann(g) { arrow(g, cen(padsNum('U4', 5)), cen(padsNet('J2', 'BAT+')), 'pw'); const b = FP('R3').bbox; tag(g, b[2] + 0.4, b[1] + 0.9, 'RPROG', 'p3-strong'); } },
  { name: 'USB', refs: RG('usb').filter(r => r !== 'J1'),
    t: '⑥ USB 保护：紧挨着插座',
    why: () => `ESD 保护 U5 要尽量靠近插座。ST 的手册说：保护器件要尽量靠近干扰源，一般就是连接器；它还算了一笔账：10 mm 长、0.5 mm 宽的走线约 6 nH，8 kV 静电打进来时，这一小段线上就多出 144 V。所以 U5 就在 J1 正上方。CC 脚的 ${vfmt(FP('R1').value)} 下拉电阻 R1、R2 放在插座两侧，R17 是 USB 检测分压的上半截。`,
    facts: () => [['U5 → J1 的 D+', `${f1(dmin(padsNet('U5', 'USB_DP'), padsNet('J1', 'USB_DP')))} mm`], ['U5 → J1 的 D−', `${f1(dmin(padsNet('U5', 'USB_DN'), padsNet('J1', 'USB_DN')))} mm`], ['R1 → CC1', `${f1(dmin(padsNet('R1', 'CC1'), padsNet('J1', 'CC1')))} mm`], ['R2 → CC2', `${f1(dmin(padsNet('R2', 'CC2'), padsNet('J1', 'CC2')))} mm`]],
    src: '依据：ST USBLC6-2 数据手册。',
    ann(g) { arrow(g, cen(padsNet('J1', 'USB_DP')), cen(padsNet('U5', 'USB_DP')), 'sg'); } },
  { name: '模组周边', refs: RG('mcu').filter(r => r !== 'U1'),
    t: '⑦ 模组周边：去耦电容贴着电源脚',
    why: () => `模组的 3V3 是 2 号脚，在左边一列的上面。去耦电容要贴着电源脚放，电容的地端就近接地：乐鑫的指南就是这么写的。所以 C6（${vfmt(FP('C6').value)}）、C5（${vfmt(FP('C5').value)}）放在模组左边那一列的最上面，正对 2 号脚；往下是 EN 脚的上电延时 R7 + C7（乐鑫建议 10 kΩ + 1 µF，QB12 用的是 ${vfmt(FP('R7').value)} + ${vfmt(FP('C7').value)}）和 nFAULT 上拉 R10。`,
    facts: () => [['C6 → 2 号脚（3V3）', `${f1(dmin(padsNet('C6', '3V3'), padsNum('U1', 2)))} mm`], ['C5 → 2 号脚', `${f1(dmin(padsNet('C5', '3V3'), padsNum('U1', 2)))} mm`], ['R7 → 3 号脚（EN）', `${f1(dmin(padsNet('R7', 'EN'), padsNum('U1', 3)))} mm`]],
    src: '依据：乐鑫 ESP32-S3 硬件设计指南、WROOM-1 数据手册（EN 的 RC 延时）。',
    ann(g) { arrow(g, cen(padsNet('C6', '3V3')), cen(padsNum('U1', 2)), 'sg'); tag(g, cen(padsNum('U1', 2))[0] + 1.2, cen(padsNum('U1', 2))[1] + 0.4, '3V3', 'p3-strong'); } },
  { name: '按键和灯', refs: RG('buttons'),
    t: '⑧ 按键、状态灯和电压检测',
    why: () => `BOOT、RESET 两个按键要用手指按，所以放在下边缘；状态灯 LED3 放在右下角。剩下的是电压检测：R11、R12 把电池电压分一半送进模组的 IO1，C8 滤波；R18 和 R17 检测 USB 有没有插着。它们都是小信号，放在模组下面那一行空地上。到这里 ${S.footprints} 个元件全部摆完。`,
    facts: () => [['按键离下边缘', `${f1(H - FP('SW2').bbox[3])} mm`], ['飞线总长', `${Math.round(M0.len)} → ${Math.round(M1.len)} mm（少了 ${Math.round((1 - M1.len / M0.len) * 100)}%）`], ['飞线交叉', `${X0} → ${X1} 处`], ['全部在顶面', `${S.footprints_top} / ${S.footprints}`]],
    src: '道理：按键要够得着、灯要看得见，属于推导；摆放见 build_board.py 坐标表。' }
];
// 没被分进任何一组的元件（正常情况下没有）放到最后一组
(function () { const seen = new Set(STEPS.flatMap(s => s.refs)); const rest = ALL.filter(r => !seen.has(r)); if (rest.length) STEPS[STEPS.length - 1].refs.push(...rest); })();

const SB = BoardViewer.create($('storybv'), { toolbar: 'mini', panel: false, hover: true, layers: ['F.Cu', 'Courtyard', 'Labels', 'Edge.Cuts'], tracks: false, label: 'QB12 元件一组组摆到最终位置，飞线随之变短' });
let story = null;      // 第一次进入视野时建
let cur = 0, playing = false, stok = 0, hideGnd = false;
let curOff = {};
const ease = q => q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
function targetOff(k) {
  const placed = new Set(STEPS.slice(1, k + 1).flatMap(s => s.refs));
  const m = {};
  ALL.forEach(r => { m[r] = placed.has(r) ? [0, 0] : RM_PILE[r].slice(); });
  return { m, placed };
}
function initStory() {
  if (story) return;
  curOff = targetOff(0).m;
  SB.offsetParts(curOff, { duration: 0 });
  story = { rat: ratLayer(SB), ann: null, groups: fpGroups(SB) };
  setDim(targetOff(0).placed, new Set());
  drawRats(new Set());
  fillCard(0); readout(M0.len, X0, 0);
}
function setDim(placed, moving) {
  for (const r in story.groups) story.groups[r].forEach(g => { g.style.opacity = placed.has(r) || moving.has(r) ? '' : '.3'; });
}
let lastLines = M0.lines;
function drawRats(active) {
  const M = mst(curOff, { noGnd: hideGnd });
  lastLines = M.lines;
  story.rat.draw(M.lines, active, false);
  return M;
}
function readout(len, x, n) {
  $('ro').innerHTML = tiles([
    ['飞线总长' + (hideGnd ? '（不算 GND）' : ''), `${Math.round(len)} mm`, `一堆时 ${Math.round(hideGnd ? mst(RM_PILE, { noGnd: true }).len : M0.len)} mm`],
    ['飞线交叉', x == null ? '…' : `${x} 处`, `一堆时 ${hideGnd ? crossings(mst(RM_PILE, { noGnd: true }).lines) : X0} 处`],
    ['已摆好', `${n} / ${S.footprints}`, '个元件']
  ]);
}
function fillCard(k) {
  const s = STEPS[k];
  $('st-t').textContent = s.t;
  $('st-why').innerHTML = s.why();
  $('st-f').innerHTML = s.facts().map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
  $('st-x').innerHTML = typeof s.extra === 'function' ? s.extra() : (s.extra || '');
  $('st-src').textContent = s.src || '';
  C.pressOne('#p3-steps [data-st]', 'st', k);
  const v1b = $('v1');
  if (v1b) v1b.addEventListener('click', () => toggleV1(v1b));
}
function toggleV1(b) {
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on));
  if (story.v1) { story.v1.remove(); story.v1 = null; }
  if (!on) return;
  const g = story.v1 = annGroup(SB);
  Object.keys(V1).forEach(r => {
    const f = FP(r), [x, y, a] = V1[r];
    let w = bw(f.bbox), h = bh(f.bbox);
    if (Math.abs(rot360(a) - rot360(f.rot)) % 180 === 90) [w, h] = [h, w];
    rect(g, [x - w / 2, y - h / 2, x + w / 2, y + h / 2], 'p3-v1box');
    tag(g, x, y + 0.4, r, 'p3-v1t', 'middle');
  });
  const a = cen(padsNet('J2', 'BAT+')), o = v1off('Q2'), q = cen(padsNet('Q2', 'BAT+'));
  C.el('path', { d: `M${num(a[0])} ${num(a[1])}L${num(q[0] + o[0])} ${num(q[1] + o[1])}`, class: 'p3-v1line' }, g);
  tag(g, V1.SW1[0] + 3.2, V1.SW1[1] + 0.4, '旧版：开关在上边中间', 'p3-v1t');
}
async function go(k) {
  initStory();
  cur = Math.max(0, Math.min(STEPS.length - 1, k));
  const my = ++stok;
  fillCard(cur);
  SB.clear();
  if (story.ann) { story.ann.remove(); story.ann = null; }
  if (story.v1) { story.v1.remove(); story.v1 = null; }
  const { m: target, placed } = targetOff(cur);
  const active = new Set(STEPS[cur].refs);
  const movers = ALL.filter(r => curOff[r][0] !== target[r][0] || curOff[r][1] !== target[r][1]);
  const ord = r => { const i = STEPS[cur].refs.indexOf(r); return i < 0 ? 999 + ALL.indexOf(r) : i; };
  movers.sort((a, b) => ord(a) - ord(b));
  setDim(placed, new Set(movers.filter(r => placed.has(r))));
  SB.toggle('Keepouts', cur >= 2);
  readout(mst(curOff, { noGnd: hideGnd }).len, null, placed.size);
  if (movers.length && !RMx) {
    const from = {}; movers.forEach(r => { from[r] = curOff[r].slice(); });
    const dur = 900, stg = Math.min(70, 700 / movers.length);
    const t0 = performance.now();
    await new Promise(res => {
      const step = now => {
        if (my !== stok) return res();
        let done = true;
        movers.forEach((r, i) => {
          const q = Math.max(0, Math.min(1, (now - t0 - i * stg) / dur));
          if (q < 1) done = false;
          const e = ease(q);
          curOff[r] = [from[r][0] + (target[r][0] - from[r][0]) * e, from[r][1] + (target[r][1] - from[r][1]) * e];
        });
        SB.offsetParts(curOff, { duration: 0 });
        const M = drawRats(active);
        $('ro').querySelector('b').textContent = `${Math.round(M.len)} mm`;
        if (!done) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    if (my !== stok) return;
  }
  curOff = target;
  SB.offsetParts(curOff, { duration: 0 });
  setDim(placed, new Set());
  const M = drawRats(active);
  readout(M.len, crossings(M.lines), placed.size);
  if (cur > 0) {
    SB.highlightParts(STEPS[cur].refs);
    if (STEPS[cur].ann) { story.ann = annGroup(SB); STEPS[cur].ann(story.ann); }
  }
  SB.badge(cur === 0 ? '导入后：一堆（示意）' : `${STEPS[cur].name}：${STEPS[cur].refs.length} 个元件`);
  if (playing && my === stok) {
    await wait(cur === 0 ? 1200 : 2600);
    if (!playing || my !== stok) return;
    if (cur < STEPS.length - 1) go(cur + 1); else stopPlay();
  }
}
const playBtn = $('play');
function stopPlay() { playing = false; playBtn.textContent = '▶ 一组组摆上去'; }
playBtn.addEventListener('click', () => {
  if (playing) { stopPlay(); return; }
  playing = true; playBtn.textContent = '■ 停止';
  if (cur === STEPS.length - 1) go(0); else go(cur + 1);
});
$('prev').addEventListener('click', () => { stopPlay(); go(cur - 1); });
$('next').addEventListener('click', () => { stopPlay(); go(cur + 1); });
$('gnd').addEventListener('click', () => {
  hideGnd = !hideGnd; $('gnd').setAttribute('aria-pressed', String(!hideGnd));
  if (!story) return;
  const M = drawRats(new Set(STEPS[cur].refs));
  readout(M.len, crossings(M.lines), targetOff(cur).placed.size);
});
$('steps').innerHTML = STEPS.map((s, i) => `<button class="btn" data-st="${i}" aria-pressed="${i === 0}">${i} ${s.name}</button>`).join('');
$('steps').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b) { stopPlay(); go(+b.dataset.st); } });
fillCard(0);
readout(M0.len, X0, 0);
C.onVisible($('storybv'), initStory, '400px');

// 坐标表节选（数字从 board.json 取，顺序和 build_board.py 一样）
(function () {
  const show = ['U1', 'J3', 'J4', 'J2', 'U2', 'SW1', 'C6', 'J1'];
  const fx = v => Number.isInteger(v) ? v.toFixed(1) : num(v);
  const line = r => { const f = FP(r); return `    <span class="n">"${r}"</span>: (${fx(f.x)}, ${fx(f.y)}, ${rot360(f.rot)}),`; };
  $('place-code').innerHTML = ['<span class="cm"># build_board.py 坐标表（节选）</span>', '<span class="cm"># 中心 x, y（mm），旋转角</span>', 'PLACE = {',
    ...show.slice(0, 5).map(line), '    <span class="cm"># …</span>', ...show.slice(5).map(line), `    <span class="cm"># …共 ${S.footprints} 行</span>`, '}'].join('\n');
})();

/* ======================= 3.4 自己挪一颗 ======================= */
const TB = BoardViewer.create($('trybv'), { toolbar: 'mini', panel: false, hover: true, layers: ['F.Cu', 'Courtyard', 'Labels', 'Edge.Cuts'], tracks: false, label: '可以挪动的 QB12：选一颗元件，用方向键或拖动挪开' });
const PICK = {
  C6: { near: 'U1', tgt: () => padsNum('U1', 2), tname: 'U1 的 3V3（2 号脚）', mine: () => padsNet('C6', '3V3'),
    why: '去耦电容是电源脚旁边的“小水桶”：芯片电流突然变大时，先从它这里取电。电容 → 电源脚 → 地 → 电容这一圈越短，线上的电感越小，它越管用。乐鑫的指南写：电源脚放合适的去耦电容，电容地焊盘旁边打地过孔，让回路尽量短。' },
  U5: { near: 'J1', tgt: () => padsNet('J1', 'USB_DP').concat(padsNet('J1', 'USB_DN')), tname: 'J1 的 D+ / D− 焊盘', mine: () => padsNet('U5', 'USB_DP').concat(padsNet('U5', 'USB_DN')),
    why: 'ST 的手册写：保护器件要尽量靠近干扰源，一般就是插座。静电从插头进来，先经过的那段线越长，线上的电感越大：10 mm 长、0.5 mm 宽的线约 6 nH，8 kV 静电时这段线上就多出 144 V，叠加在保护管的钳位电压上：ST 手册的算例里，芯片那头看到的不是 31 V 左右，而是 300 多 V。' },
  R3: { near: 'U4', tgt: () => padsNum('U4', 2), tname: 'U4 的 PROG（2 号脚）', mine: () => padsNet('R3', 'PROG'),
    why: 'R3 决定 TP4056 的充电电流。手册写：PROG 脚上的 RPROG 要尽量靠近芯片，PROG 脚的寄生电容要尽量小。线拉长了，寄生电容变大，也更容易拾取别处的干扰。' }
};
let pick = 'C6', tryOff = {}, tryBuilt = false, tRat = null, tAnn = null;
const homeLen = M1.len;
const homeDist = r => dmin(PICK[r].mine(), PICK[r].tgt());
function tryInit() {
  if (tryBuilt) return;
  tryBuilt = true;
  TB.offsetParts({}, { duration: 0 });
  tRat = ratLayer(TB);
  tryPick('C6');
  bindDrag();
  // 手机上点元件：点到另外两颗候选就切过去；挪开的元件不让查看器把高亮画回原位
  TB.on('select', d => { if (PICK[d.ref] && d.ref !== pick) tryPick(d.ref); else TB.clear(); });
}
function overlaps(ref) {
  const o = tryOff[ref] || [0, 0], a = FP(ref).bbox, A = [a[0] + o[0], a[1] + o[1], a[2] + o[0], a[3] + o[1]];
  const hit = [];
  D.footprints.forEach(f => {
    if (f.ref === ref) return;
    const q = tryOff[f.ref] || [0, 0], b = [f.bbox[0] + q[0], f.bbox[1] + q[1], f.bbox[2] + q[0], f.bbox[3] + q[1]];
    if (A[0] < b[2] - 0.01 && b[0] < A[2] - 0.01 && A[1] < b[3] - 0.01 && b[1] < A[3] - 0.01) hit.push({ ref: f.ref, b });
  });
  const out = A[0] < -0.01 || A[1] < -0.01 || A[2] > W + 0.01 || A[3] > H + 0.01;
  return { A, hit, out };
}
function tryUpdate() {
  if (!tryBuilt) return;
  TB.offsetParts(tryOff, { duration: 0 });
  const M = mst(tryOff);
  tRat.draw(M.lines, new Set([pick]), false);
  if (tAnn) tAnn.remove();
  tAnn = annGroup(TB);
  const P = PICK[pick], o = tryOff[pick] || [0, 0];
  const d = dmin(P.mine(), P.tgt(), o), d0 = homeDist(pick);
  const ov = overlaps(pick);
  ov.hit.forEach(h => rect(tAnn, h.b, 'p3-bad'));
  rect(tAnn, ov.A, ov.hit.length || ov.out ? 'p3-bad me' : 'p3-me');
  // 到目标脚的线
  let best = null;
  P.mine().forEach(a => P.tgt().forEach(b => { const dd = Math.hypot(a.x + o[0] - b.x, a.y + o[1] - b.y); if (!best || dd < best[0]) best = [dd, [a.x + o[0], a.y + o[1]], [b.x, b.y]]; }));
  if (best) { C.el('path', { d: `M${num(best[1][0])} ${num(best[1][1])}L${num(best[2][0])} ${num(best[2][1])}`, class: 'p3-tline' }, tAnn); }
  const dcls = d <= d0 + 0.6 ? 'good' : d <= d0 + 4 ? 'warn' : 'bad';
  const dl = M.len - homeLen;
  $('try-ro').innerHTML = `<div class="ro"><small>离 ${P.tname}</small><b class="${dcls}">${f1(d)} mm</b><small>原位 ${f1(d0)} mm</small></div>` +
    `<div class="ro"><small>全板飞线</small><b class="${dl > 0.5 ? 'warn' : 'good'}">${Math.round(M.len)} mm</b><small>${Math.abs(dl) < 0.5 ? '和原位一样' : (dl > 0 ? '比原位长 ' : '比原位短 ') + f1(Math.abs(dl)) + ' mm'}</small></div>` +
    `<div class="ro"><small>元件外框</small><b class="${ov.hit.length || ov.out ? 'bad' : 'good'}">${ov.hit.length ? '撞上 ' + ov.hit.map(h => h.ref).slice(0, 3).join('、') : ov.out ? '出板了' : '没重叠'}</b><small>${ov.hit.length ? 'DRC 会报“元件外框重叠”' : ov.out ? '超出板框' : '和别人都不挨着'}</small></div>`;
  const st = $('try-st');
  const moved = Math.hypot(o[0], o[1]) > 0.01;
  if (!moved) { st.className = 'status good'; st.textContent = `这是 QB12 实际的位置：离 ${P.tname} ${f1(d0)} mm（焊盘中心距）。`; }
  else if (ov.hit.length || ov.out) { st.className = 'status bad'; st.textContent = ov.hit.length ? `外框和 ${ov.hit.map(h => h.ref).join('、')} 重叠了：两颗元件要抢同一块地方，贴片机放不下。` : '外框跑到板框外面了：这颗元件不需要伸出板边，铣板时会被切到。'; }
  else if (dcls !== 'good') { st.className = 'status warn'; st.textContent = `离目标脚远了 ${f1(d - d0)} mm。位置是空的，但它该贴着的那只脚够不着了，线要拉长。`; }
  else { st.className = 'status good'; st.textContent = '还贴着目标脚，外框也没撞上别人：这样挪也可以。'; }
}
function tryPick(r) {
  pick = r;
  C.pressOne('#p3 [data-p3pick]', 'p3pick', r);
  const f = FP(r);
  $('try-t').textContent = `${r} · ${vfmt(f.value)} · ${f.desc}`;
  $('try-why').textContent = PICK[r].why;
  if (tryBuilt) { TB.clear(); TB.focus([r, PICK[r].near], { pad: 4 }); }
  tryUpdate();
}
document.querySelectorAll('#p3 [data-p3pick]').forEach(b => b.addEventListener('click', () => { tryInit(); tryPick(b.dataset.p3pick); }));
document.querySelectorAll('#p3 [data-p3mv]').forEach(b => b.addEventListener('click', () => {
  tryInit();
  const [dx, dy] = b.dataset.p3mv.split(',').map(Number);
  const o = tryOff[pick] || [0, 0];
  tryOff[pick] = clampOff(pick, [Math.round((o[0] + dx * 0.5) * 10) / 10, Math.round((o[1] + dy * 0.5) * 10) / 10]);
  tryUpdate();
}));
$('try-home').addEventListener('click', () => { tryInit(); delete tryOff[pick]; tryUpdate(); });
function clampOff(ref, o) {
  const b = FP(ref).bbox;
  return [Math.min(Math.max(o[0], -1.2 - b[0]), W + 1.2 - b[2]), Math.min(Math.max(o[1], -1.2 - b[1]), H + 1.2 - b[3])];
}
function bindDrag() {
  const st = TB.stage;
  let drag = null;
  const toMM = (cx, cy) => { const r = st.getBoundingClientRect(), v = TB.state().view; return [v[0] + (cx - r.left) / r.width * v[2], v[1] + (cy - r.top) / r.height * v[3]]; };
  const near = (ref, p) => { const o = tryOff[ref] || [0, 0], b = FP(ref).bbox; return p[0] > b[0] + o[0] - 1 && p[0] < b[2] + o[0] + 1 && p[1] > b[1] + o[1] - 1 && p[1] < b[3] + o[1] + 1; };
  st.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const p = toMM(e.clientX, e.clientY);
    const r = near(pick, p) ? pick : Object.keys(PICK).find(k => near(k, p));
    if (!r) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (r !== pick) tryPick(r);
    drag = { id: e.pointerId, p0: p, o0: (tryOff[r] || [0, 0]).slice() };
    try { st.setPointerCapture(e.pointerId); } catch (_) { /* 没关系 */ }
    st.classList.add('p3-dragging');
  }, true);
  st.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    e.stopPropagation();
    const p = toMM(e.clientX, e.clientY);
    tryOff[pick] = clampOff(pick, [Math.round((drag.o0[0] + p[0] - drag.p0[0]) * 10) / 10, Math.round((drag.o0[1] + p[1] - drag.p0[1]) * 10) / 10]);
    tryUpdate();
  }, true);
  const end = e => { if (!drag || e.pointerId !== drag.id) return; e.stopPropagation(); drag = null; st.classList.remove('p3-dragging'); };
  st.addEventListener('pointerup', end, true); st.addEventListener('pointercancel', end, true);
}
$('try-hint').textContent = (window.matchMedia && matchMedia('(pointer: fine)').matches) ? '电脑上可以直接按住元件拖（吸附到 0.1 mm）；方向键每次挪 0.5 mm。' : '用上面的方向键挪，每次 0.5 mm；双击板子可以放大。';
C.onVisible($('trybv'), tryInit, '300px');
{ const f = FP('C6'); $('try-t').textContent = `C6 · ${vfmt(f.value)} · ${f.desc}`; $('try-why').textContent = PICK.C6.why; }

/* check_place.py 在交付的 out/QB12.kicad_pcb 上运行的原样输出（2026-10-19 用 python3.12 + pcbnew 8.0.9 跑的；2026-10-20 用 .venv-kicad + pcbnew 10.0.6 重跑，输出逐字相同） */
$('chk-code').innerHTML = ['<span class="cm">$ "$KPY" check_place.py out/QB12.kicad_pcb</span>',
  '出板 SW1   (-1.3,19.4)-(4.9,27.8)', '出板 J1    (21.6,30.5)-(31.4,38.8)', 'overlaps: <span class="n">0</span>'].join('\n');

/* ---- 翻到底面 ---- */
const SV = BoardViewer.create($('sidebv'), { toolbar: false, panel: false, hover: false, mode: 'made', side: 'top', layers: [], mask: 'green', label: 'QB12 成品样子：顶面和底面' });
function sideView(s) {
  C.pressOne('#p3 [data-p3side]', 'p3side', s);
  SV.show({ side: s });
  const bt = D.texts.filter(t => t.layer.startsWith('B.')).map(t => t.text).filter(t => /[A-Z]{2,}/.test(t) && !/JLC/.test(t));
  $('side-st').innerHTML = s === 'top'
    ? `顶面：${S.footprints_top} 个元件全在这一面，一次刷锡膏、一次回流焊就贴完。`
    : `底面：一个元件都没有，只有整面的地、过孔、几块通孔焊盘和丝印字（${bt.slice(0, 4).join('、')}…）。贴片厂只需要一张顶面钢网。`;
}
document.querySelectorAll('#p3 [data-p3side]').forEach(b => b.addEventListener('click', () => sideView(b.dataset.p3side)));
sideView('top');

/* ======================= 3.5 KiCad 四步 + 快捷键练习 ======================= */
document.querySelectorAll('#p3 [data-p3k]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.p3k;
  document.querySelectorAll('#p3 [data-p3k]').forEach(x => { const on = x.dataset.p3k === k; x.setAttribute('aria-selected', String(on)); x.setAttribute('aria-pressed', String(on)); });
  document.querySelectorAll('#p3 .p3-kp').forEach(p => { p.hidden = p.id !== 'p3-kp' + k; });
}));

(function () {
  const svg = $('keysvg'), K = 22, OX = 24, OY = 26;     // 22 px = 1 mm；栅格原点在 (24, 26)
  const GRIDS = [1, 0.5, 0.25];                          // 示意的三档栅格
  const q2 = FP('Q2');
  const defs = C.el('defs', {}, svg);
  const pat = C.el('pattern', { id: 'p3-kgrid', patternUnits: 'userSpaceOnUse', x: OX, y: OY }, defs);
  const dots = [0, 1, 2, 3].map(() => C.el('circle', { r: 1.1, class: 'p3-kdot' }, pat));
  C.el('rect', { x: 0, y: 0, width: 360, height: 200, fill: 'url(#p3-kgrid)' }, svg);
  C.el('path', { d: `M${OX - 9} ${OY}L${OX + 9} ${OY}M${OX} ${OY - 9}L${OX} ${OY + 9}`, class: 'p3-korg' }, svg);
  C.el('text', { x: OX + 6, y: OY - 8, class: 'p3-kt' }, svg, '栅格原点');
  const part = C.el('g', { class: 'p3-kpart' }, svg);
  const inner = C.el('g', {}, part);
  C.el('polygon', { points: q2.crt.map(p => `${num((p[0] - q2.x) * K)},${num((p[1] - q2.y) * K)}`).join(' '), class: 'p3-kcrt' }, inner);
  const padEls = q2.pads.filter(p => p.t !== 'npth').map(p => {
    const e = C.el('rect', { x: num((p.x - q2.x - p.w / 2) * K), y: num((p.y - q2.y - p.h / 2) * K), width: num(p.w * K), height: num(p.h * K), rx: 2, class: 'p3-kpad' }, inner);
    C.el('text', { x: num((p.x - q2.x) * K), y: num((p.y - q2.y) * K + 4), class: 'p3-kpn', 'text-anchor': 'middle' }, inner, p.n);
    return e;
  });
  C.el('path', { d: 'M-6 0L6 0M0 -6L0 6', class: 'p3-kanc' }, inner);
  C.el('text', { x: 0, y: num(-(bh(q2.bbox) / 2) * K - 5), class: 'p3-kref', 'text-anchor': 'middle' }, inner, 'Q2');
  const S0 = { x: 6, y: 3.5, rot: 0, side: 'F', gi: 0 };
  let s = Object.assign({}, S0);
  const ro = $('key-ro'), st = $('key-st');
  const snap = (v, g) => Math.round(v / g) * g;
  function render(msg) {
    const g = GRIDS[s.gi];
    pat.setAttribute('width', g * K); pat.setAttribute('height', g * K);
    dots.forEach((e, i) => { e.setAttribute('cx', (i % 2) * g * K); e.setAttribute('cy', (i >> 1) * g * K); });
    part.style.transform = `translate(${OX + s.x * K}px,${OY + s.y * K}px) rotate(${-s.rot}deg) scale(${s.side === 'B' ? -1 : 1},1)`;
    padEls.forEach(e => e.classList.toggle('b', s.side === 'B'));
    ro.innerHTML = tiles([['位置 X, Y', `${num(s.x)}, ${num(s.y)}`, 'mm，从栅格原点量'], ['角度', `${rot360(s.rot)}°`, s.side === 'F' ? '顶面' : '底面（镜像）'], ['栅格', `${g} mm`, 'N / Shift+N 切换']]);
    if (msg) st.textContent = msg;
  }
  function key(k) {
    const g = GRIDS[s.gi];
    const mv = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[k];
    if (mv) {
      s.x = Math.round((snap(s.x, g) + mv[0] * g) * 1000) / 1000; s.y = Math.round((snap(s.y, g) + mv[1] * g) * 1000) / 1000;
      s.x = Math.min(Math.max(s.x, 1), 14); s.y = Math.min(Math.max(s.y, 1), 7.5);
      render(`M 移动：锚点（十字）落在 ${g} mm 栅格点上。`);
    } else if (k === 'r') { s.rot += 90; render('R：逆时针转 90°。'); }
    else if (k === 'R') { s.rot -= 90; render('Shift+R：顺时针转 90°。'); }
    else if (k === 'f') { s.side = s.side === 'F' ? 'B' : 'F'; render(s.side === 'B' ? 'F：翻到底面。焊盘变成底层铜（蓝色），封装左右镜像。QB12 用不到：所有元件都在顶面。' : 'F：翻回顶面。'); }
    else if (k === 'n') { s.gi = (s.gi + 1) % GRIDS.length; render(`N：栅格换成 ${GRIDS[s.gi]} mm。再挪的时候锚点会吸到新的栅格点上。`); }
    else if (k === 'N') { s.gi = (s.gi + GRIDS.length - 1) % GRIDS.length; render(`Shift+N：栅格换成 ${GRIDS[s.gi]} mm。`); }
    else if (k === 'M') { $('exact').hidden = false; $('ex-x').focus(); render('Shift+M：精确移动。填要挪多少 mm，不受栅格限制。'); }
    else if (k === 'reset') { s = Object.assign({}, S0); $('exact').hidden = true; render('复位。'); }
  }
  document.querySelectorAll('#p3 [data-p3key]').forEach(b => b.addEventListener('click', () => key(b.dataset.p3key)));
  $('keyfig').addEventListener('keydown', e => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    let k = map[e.key];
    if (!k && (e.key === 'r' || e.key === 'R')) k = e.shiftKey ? 'R' : 'r';
    if (!k && (e.key === 'f' || e.key === 'F')) k = 'f';
    if (!k && (e.key === 'n' || e.key === 'N')) k = e.shiftKey ? 'N' : 'n';
    if (!k && (e.key === 'm' || e.key === 'M') && e.shiftKey) k = 'M';
    if (!k && (e.key === 'm' || e.key === 'M')) { st.textContent = 'M：元件跟着鼠标走。这里用方向键代替鼠标，每按一次挪一格。'; e.preventDefault(); return; }
    if (!k) return;
    e.preventDefault(); key(k);
  });
  $('keyfig').addEventListener('click', () => $('keyfig').focus());
  $('exact').addEventListener('submit', e => {
    e.preventDefault();
    const dx = +$('ex-x').value || 0, dy = +$('ex-y').value || 0;
    s.x = Math.min(Math.max(Math.round((s.x + dx) * 1000) / 1000, 0.5), 14.5); s.y = Math.min(Math.max(Math.round((s.y + dy) * 1000) / 1000, 0.5), 8);
    $('exact').hidden = true; $('keyfig').focus();
    render(`精确移动：挪了 (${num(dx)}, ${num(dy)}) mm，现在不一定在栅格点上了。`);
  });
  $('ex-cancel').addEventListener('click', () => { $('exact').hidden = true; render('取消精确移动。'); });
  render('先点一下左边的图，再按键盘：方向键 = 按 M 挪一格，R、Shift+R、F、N、Shift+M 同 KiCad。');
})();

/* ======================= 3.6 自测 ======================= */
(function () {
  const L = LEFT.map(r => FP(r).bbox), sumH = L.reduce((s, b) => s + bh(b), 0);
  const cols = union(['J2', 'J3', 'J4']), mid = union([...RG('motor'), ...RG('power'), ...RG('charge')]);
  $('q1').innerHTML = `高度先卡住：左边缘要竖着排 J3、J4、SW1、J2，四个外框加起来就有 ${f1(sumH)} mm，30 mm 连它们都放不下；右边的模组自己就有 ${f1(bh(U1c))} mm 高，下面还要放按键。宽度也紧：插座一列 ${f1(bw(cols))}、中间三组 ${f1(bw(mid))}、模组 ${f1(bw(U1c))}，已经 ${f1(bw(cols) + bw(mid) + bw(U1c))} mm，再加走线要穿过的缝，50 mm 很难。真要缩，只能换更小的插座、把开关挪到别处，或者像乐鑫建议的那样让天线伸出板外。`;
  $('q2').innerHTML = `它是模组 3V3 电源脚（2 号脚）的去耦电容，现在离 2 号脚 ${f1(homeDist('C6'))} mm。模组里的芯片发射时电流一下子变大，要先从身边的电容取电；电容 → 电源脚 → 地这一圈越大，线上的电感越大，这一下电流就供不上，等于白放。乐鑫的指南要求去耦电容靠近电源脚、地端就近打孔。在 3.4 里把它往左挪几下，看距离和飞线怎么变。`;
  $('q3').innerHTML = `JLC 的经济型贴片只能贴一面，两面都放元件就只能选标准型：工程费、钢网费都按双面算，要两张钢网、过两次回流焊；而标准型的单板最小 70 × 70 mm，${N.size} mm 的 QB12 还得先拼板。QB12 把 ${S.footprints} 个元件全放在顶面，只贴一面。（实际下单 QB12 走的是标准型，因为经济型不贴 ESP32 模组 U1；板子小，工艺边由嘉立创自动加，见第 8 课。）`;
  document.querySelectorAll('#p3 [data-p3q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p3q;
    const go2 = (el, fn) => { el.scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' }); fn(); };
    if (q === '1') go2($('sizebv'), () => sizeView('h'));
    else if (q === '2') go2($('trybv'), () => { tryInit(); tryPick('C6'); tryOff.C6 = clampOff('C6', [-6, 0]); tryUpdate(); });
    else go2($('sidebv'), () => sideView('bottom'));
  }));
})();
