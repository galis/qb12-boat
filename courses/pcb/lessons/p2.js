/* 第 2 课：封装：从符号到焊盘。
   QB12 的数字一律从 QB.board（真实设计文件抽出来的数据）现算。
   board.json 里没有、只在库文件里有的两样东西抄在下面，来源见 p2_notes.md：
   SILK —— 7 个封装的顶层丝印线条（pcb/lib/QB12.pretty/*.kicad_mod 的 F.SilkS 图元，封装自身坐标，mm）；
   LIB_PART —— 每个库封装自带的 "LCSC Part" 字段（同一批 .kicad_mod 里的 property）。 */
const D = QB.board, S = D.stats;
const $ = id => document.getElementById('p2-' + id);
const RMx = C.RM;
const r3 = v => Math.round(v * 1000) / 1000;
const n2 = v => String(Math.round(v * 100) / 100);
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const natural = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });
const netName = p => (p.net >= 0 ? D.nets[p.net].name : null);
const netCls = n => (QB.netCls(n) === 'p' ? 'p' : QB.netCls(n) === 's' ? 's' : '');
const netTag = n => (n ? `<span class="net ${netCls(n)}">${esc(n)}</span>` : '<span class="net p2-nc">不接</span>');
const wait = ms => new Promise(r => setTimeout(r, ms));
const FR = D.meta.frame, W0 = FR.w + 2.8, H0 = FR.h + 2.8, ASP = W0 / H0;   // 查看器的全板视野（和 boardviewer.js 的 _baseView 一样）
const T_ZH = { smd: '贴片', pth: '金属化孔', npth: '非金属化孔' };
const byFp = new Map();
D.footprints.forEach(f => { if (!byFp.has(f.fp)) byFp.set(f.fp, []); byFp.get(f.fp).push(f); });
const cpl = Object.fromEntries(D.fab.cpl.map(r => [r[0], r]));
const drcN = t => (D.drc.by_type.find(x => x.type === t) || { n: 0 }).n;

const SILK = {"R0603":[["l",0.43,0.66,1.39,0.66,0.15],["l",1.39,0.66,1.39,-0.66,0.15],["l",1.39,-0.66,0.43,-0.66,0.15],["l",-0.43,0.66,-1.39,0.66,0.15],["l",-1.39,0.66,-1.39,-0.66,0.15],["l",-1.39,-0.66,-0.43,-0.66,0.15],["c",-0.8,0.4,0.03,0.06]],"SOT-23-5_L3.0-W1.7-P0.95-LS2.8-BL":[["l",-1.53,0.85,-1.53,-0.85,0.15],["l",1.53,0.85,1.53,-0.85,0.15],["l",0.48,-0.85,-0.48,-0.85,0.15],["c",-1.65,1.14,0.15,0.3],["c",-1.42,1.37,0.03,0.06]],"SOT-23-6_L2.9-W1.6-P0.95-LS2.8-BL":[["l",1.54,0.89,1.54,-0.89,0.15],["l",-1.54,0.89,-1.54,-0.89,0.15],["c",-1.46,1.4,0.03,0.06],["c",-1.67,1.3,0.15,0.3]],"SMA_L4.3-W2.6-LS5.2-RD":[["l",-0.88,-1.43,-0.88,1.43,0.15],["l",-2.6,-1.43,2.6,-1.43,0.15],["l",2.59,1.18,2.6,1.41,0.15],["l",2.6,-1.43,2.6,-1.19,0.15],["l",-2.6,1.43,2.6,1.43,0.15],["c",-2.61,1.3,0.03,0.06],["p",[[-2.52,-1.502],[-2.521,-1.096],[-2.981,-1.1],[-2.977,-1.502],[-2.52,-1.502]]],["p",[[-2.512,1.096],[-2.513,1.503],[-2.973,1.498],[-2.969,1.096],[-2.512,1.096]]]],"SW-SMD_4P-L5.1-W5.1-P3.70-LS6.5-TL_H1.5":[["l",-1.0,-1.8,0.9,-1.8,0.25],["l",0.9,-1.8,1.8,-0.9,0.25],["l",1.8,-0.9,1.8,0.9,0.25],["l",1.8,0.9,0.8,1.9,0.25],["l",0.8,1.9,-0.9,1.9,0.25],["l",-0.9,1.9,-1.8,1.0,0.25],["l",-1.8,1.0,-1.8,-1.0,0.25],["l",-1.8,-1.0,-1.0,-1.8,0.25],["l",1.28,-2.55,2.17,-1.66,0.25],["l",2.55,-1.17,2.55,1.17,0.25],["l",2.17,1.66,1.28,2.55,0.25],["l",-2.55,-1.17,-2.55,1.17,0.25],["l",-2.17,1.66,-1.28,2.55,0.25],["l",-1.28,-2.55,-2.17,-1.66,0.25],["l",-1.28,2.55,1.28,2.55,0.25],["l",-1.28,-2.55,1.28,-2.55,0.25],["c",-3.25,-2.55,0.03,0.06],["c",0.0,0.0,1.28,0.25]],"TSSOP-16_L5.0-W4.4-P0.65-LS6.4-BL-EP":[["l",2.5,-2.1,2.5,2.1,0.15],["l",-2.54,2.14,-2.54,0.38,0.15],["l",-2.54,-2.14,-2.54,-0.38,0.15],["l",1.93,2.2,1.97,2.2,0.15],["l",1.28,2.2,1.32,2.2,0.15],["l",0.63,2.2,0.67,2.2,0.15],["l",-0.02,2.2,0.02,2.2,0.15],["l",-0.67,2.2,-0.63,2.2,0.15],["l",-1.32,2.2,-1.28,2.2,0.15],["l",-1.97,2.2,-1.93,2.2,0.15],["l",1.93,-2.2,1.97,-2.2,0.15],["l",1.28,-2.2,1.32,-2.2,0.15],["l",0.63,-2.2,0.67,-2.2,0.15],["l",-0.02,-2.2,0.02,-2.2,0.15],["l",-0.67,-2.2,-0.63,-2.2,0.15],["l",-1.32,-2.2,-1.28,-2.2,0.15],["l",-1.97,-2.2,-1.93,-2.2,0.15],["c",-2.5,3.19,0.03,0.06],["c",-2.03,1.65,0.15,0.3],["c",-2.9,2.86,0.15,0.3],["a",-2.54,-0.38,-2.54,0.38,0.38,0,1,0.15]],"LED0805-R-RD":[["l",0.2,-0.5,-0.2,-0.1,0.25],["l",-0.2,-0.1,-0.3,0.0,0.25],["l",-0.3,0.0,-0.2,0.1,0.25],["l",-0.2,0.1,0.2,0.5,0.25],["l",0.2,-0.5,0.2,0.5,0.25],["l",0.44,1.02,1.99,1.02,0.25],["l",1.99,1.02,1.99,-1.01,0.25],["l",1.99,-1.01,0.44,-1.01,0.25],["l",-0.34,1.04,-1.82,1.04,0.25],["l",-1.82,1.04,-2.22,0.64,0.25],["l",-2.22,0.64,-2.22,-0.63,0.25],["l",-2.22,-0.63,-1.84,-1.01,0.25],["l",-1.84,-1.01,-0.32,-1.01,0.25],["c",1.0,-0.63,0.03,0.06]]};
const LIB_PART = { 'C0603': 'C14663', 'C0805': 'C45783', 'CONN-SMD_2P-P2.00_XUNPU_WAFER-PH2.0-2PWB': 'C3029440', 'ESOP-8_L4.9-W3.9-P1.27-LS6.0-BL-EP': 'C16581',
  'LED-SMD_L1.6-W0.8-R-RD': 'C2286', 'LED0805-R-RD': 'C2297', 'R0603': 'C23186', 'R1206': 'C25335', 'SMA_L4.3-W2.6-LS5.2-RD': 'C8678',
  'SOT-23-5_L3.0-W1.7-P0.95-LS2.8-BL': 'C82942', 'SOT-23-6_L2.9-W1.6-P0.95-LS2.8-BL': 'C7519', 'SOT-23_L2.9-W1.3-P1.90-LS2.4-BR': 'C15127',
  'SW-SMD_4P-L5.1-W5.1-P3.70-LS6.5-TL_H1.5': 'C318884', 'SW-TH_MSK12C02': 'C431540', 'TSSOP-16_L5.0-W4.4-P0.65-LS6.4-BL-EP': 'C50506',
  'USB-C_SMD-TYPE-C-31-M-12_1': 'C165948', 'WIRELM-SMD_ESP32-S3-WROOM-1': 'C2913204' };

/* ================= 几何小工具 ================= */
const LOC = new Map();
/* 把一个元件的焊盘 / 占位框换回封装自己的坐标（库里 0° 的样子）：先平移到元件中心，再反着转 rot。 */
function loc(f) {
  if (LOC.has(f.ref)) return LOC.get(f.ref);
  const th = f.rot * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
  const T = (x, y) => { const dx = x - f.x, dy = y - f.y; return [r3(dx * c - dy * s), r3(dx * s + dy * c)]; };
  const pads = f.pads.map((p, i) => {
    const [x, y] = T(p.x, p.y);
    return Object.assign({}, p, { i, x, y, a: ((((p.a || 0) - f.rot) % 360) + 360) % 360, poly: p.poly ? p.poly.map(r => r.map(q => T(q[0], q[1]))) : null });
  });
  const o = { pads, crt: (f.crt || []).map(q => T(q[0], q[1])) };
  LOC.set(f.ref, o);
  return o;
}
function padBox(p) {
  if (p.poly) { const xs = p.poly[0].map(q => q[0]), ys = p.poly[0].map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  if (p.s === 'circle') return [p.x - p.w / 2, p.y - p.w / 2, p.x + p.w / 2, p.y + p.w / 2];
  const a = (p.a || 0) * Math.PI / 180, ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
  const hx = ca * p.w / 2 + sa * p.h / 2, hy = sa * p.w / 2 + ca * p.h / 2;
  return [p.x - hx, p.y - hy, p.x + hx, p.y + hy];
}
function unionBox(list) {
  let b = null;
  list.forEach(q => { b = b ? [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])] : q.slice(); });
  return b || [0, 0, 0, 0];
}
const ptsBox = pts => unionBox(pts.map(q => [q[0], q[1], q[0], q[1]]));
function padSVG(p, attrs) {
  const a = attrs || '';
  if (p.s === 'circle') return `<circle cx="${p.x}" cy="${p.y}" r="${r3(p.w / 2)}"${a}/>`;
  if (p.poly) return `<path d="${p.poly.map(r => 'M' + r.map(q => q[0] + ' ' + q[1]).join('L') + 'Z').join('')}"${a}/>`;
  const rx = p.s === 'oval' ? Math.min(p.w, p.h) / 2 : p.s === 'roundrect' ? (p.rr || 0) : 0;
  const t = p.a ? ` transform="rotate(${r3(-p.a)} ${p.x} ${p.y})"` : '';
  return `<rect x="${r3(p.x - p.w / 2)}" y="${r3(p.y - p.h / 2)}" width="${p.w}" height="${p.h}"${rx ? ` rx="${r3(rx)}"` : ''}${t}${a}/>`;
}
function drillSVG(p, attrs) {
  if (!p.drill) return '';
  const [w, h] = p.drill, a = attrs || '';
  if (Math.abs(w - h) < 1e-6) return `<circle cx="${p.x}" cy="${p.y}" r="${r3(w / 2)}"${a}/>`;
  const ln = Math.abs(w - h), th = Math.min(w, h), ang = -((w > h ? p.a : p.a + 90) || 0) * Math.PI / 180;
  const ca = Math.cos(ang) * ln / 2, sa = Math.sin(ang) * ln / 2;
  return `<line x1="${r3(p.x - ca)}" y1="${r3(p.y - sa)}" x2="${r3(p.x + ca)}" y2="${r3(p.y + sa)}" stroke-width="${th}" stroke-linecap="round"${a}/>`;
}
function silkSVG(name) {
  return (SILK[name] || []).map(it => {
    if (it[0] === 'l') return `<line x1="${it[1]}" y1="${it[2]}" x2="${it[3]}" y2="${it[4]}" stroke-width="${it[5]}"/>`;
    if (it[0] === 'c') return `<circle cx="${it[1]}" cy="${it[2]}" r="${it[3]}" stroke-width="${it[4]}"/>`;
    if (it[0] === 'a') return `<path d="M${it[1]} ${it[2]}A${it[5]} ${it[5]} 0 ${it[6]} ${it[7]} ${it[3]} ${it[4]}" stroke-width="${it[8]}"/>`;
    return `<polygon points="${it[1].map(q => q.join(',')).join(' ')}" class="fill"/>`;
  }).join('');
}
/* 脚距：同样大小的贴片焊盘之间最常见的最近距离；同时算出这个方向上相邻两块焊盘之间的缝 */
function pitchInfo(f) {
  const P = f.pads.filter(p => p.t === 'smd' && !p.poly);
  const cnt = new Map();
  P.forEach((p, i) => {
    let best = null;
    P.forEach((q, j) => {
      if (i === j || p.n === q.n || p.s !== q.s || Math.abs(p.w - q.w) > 1e-6 || Math.abs(p.h - q.h) > 1e-6) return;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (!best || d < best.d) best = { d, q };
    });
    if (best) { const k = n2(best.d); const e = cnt.get(k) || { n: 0, d: +k, pair: [p, best.q] }; e.n++; cnt.set(k, e); }
  });
  const list = [...cnt.values()].sort((a, b) => b.n - a.n || a.d - b.d);
  if (!list.length) return null;
  const e = list[0], [p, q] = e.pair, d = Math.hypot(q.x - p.x, q.y - p.y);
  const ux = (q.x - p.x) / d, uy = (q.y - p.y) / d, a = (p.a || 0) * Math.PI / 180;
  const ext = p.s === 'circle' ? p.w : Math.abs(ux * Math.cos(a) - uy * Math.sin(a)) * p.w + Math.abs(ux * Math.sin(a) + uy * Math.cos(a)) * p.h;
  return { pitch: e.d, gap: r3(d - ext), pair: [p, q], ux, uy, many: P.length > 2 };
}
/* 名字里的数：L×W 本体、P 脚距、LS 跨度、1 脚位置、EP 散热焊盘 */
function nameNums(fp) {
  const m1 = fp.match(/[_-]L(\d+(?:\.\d+)?)-W(\d+(?:\.\d+)?)/), mp = fp.match(/-P(\d+\.\d+)/), ml = fp.match(/-LS(\d+(?:\.\d+)?)/), m4 = fp.match(/-(BL|BR|TL|TR)(?=$|[-_])/);
  return { L: m1 ? +m1[1] : null, W: m1 ? +m1[2] : null, Ls: m1 ? m1[1] : '', Ws: m1 ? m1[2] : '', P: mp ? +mp[1] : null, Ps: mp ? mp[1] : '',
    LS: ml ? +ml[1] : null, LSs: ml ? ml[1] : '', pin1: m4 ? m4[1] : null, ep: /-EP$/.test(fp) };
}
const PIN1_ZH = { BL: '左下', BR: '右下', TL: '左上', TR: '右上' };
function sizeList(f) {
  const m = new Map();
  f.pads.forEach(p => {
    const k = p.poly ? '异形' : p.s === 'circle' ? `Ø${n2(p.w)}` : `${n2(p.w)} × ${n2(p.h)}`;
    const key = k + '|' + p.t;
    const e = m.get(key) || { k, t: p.t, n: 0 }; e.n++; m.set(key, e);
  });
  return [...m.values()];
}
function pinName(f, p) {
  if (f.kind === 'd' || f.kind === 'led') { const an = f.pins[0] && f.pins[0][2]; return netName(p) === an ? '阳极 A' : '阴极 K'; }
  const parts = (p.n || '').match(/[AB]\d+/g) || [p.n];
  for (const [nums, name] of f.pins) { if (parts.some(x => nums.split(',').includes(x))) return name; }
  const nn = netName(p);
  /* 散热焊盘：网表里叫 EP，封装里编号接在最后一个脚后面（U4 的 9 号）。别拿同网络的第一个脚名（比如接 GND 的 TEMP）冒充 */
  const ep = f.pins.find(q => q[0] === 'EP');
  const maxN = Math.max(0, ...f.pins.map(q => +q[0]).filter(Number.isFinite));
  if (ep && nn === ep[2] && +p.n > maxN) return 'EP（散热焊盘）';
  if (nn) { const m = f.pins.find(q => q[2] === nn && q[1]); if (m) return m[1]; }
  return '';
}
const KIND_ZH = f => ({ r: '电阻', c: '电容', d: '二极管', led: 'LED', sw: '按键' }[f.kind] ||
  (f.ref.startsWith('U') ? (f.pads.length > 30 ? '模组' : '芯片') : f.ref.startsWith('Q') ? '晶体管' : f.ref.startsWith('J') ? '接口' : f.ref.startsWith('SW') ? '开关' : '元件'));
/* 预测查看器 focus() 之后的视野宽度（mm），给标注挑字号用 */
function viewW(b, pad) { return Math.max(W0 / 14, Math.max(b[2] - b[0] + 2 * pad, (b[3] - b[1] + 2 * pad) * ASP)); }
/* 一个元件在板上的外包（焊盘 + 占位框，板子坐标）。f.bbox 只是占位框，立创封装的焊盘常常伸在框外。 */
const fpBox = f => unionBox(f.pads.map(padBox).concat(f.crt && f.crt.length ? [ptsBox(f.crt)] : []));
/* 在查看器里画尺寸线（板子坐标）。查看器自带的 box / arrow 线宽是按全板定的，放大十几倍会太粗，所以这里按视野宽度 vw 自己定线宽和字号。
   gap = false：p、q 两个焊盘中心之间（脚距）；gap = true：两块焊盘相对的两条边之间（缝）。
   尺寸线画在远离元件中心 c 的一侧；返回 {svg, box}（box = 整条尺寸线连字的外包，用来调视野）。 */
function dimGeo(p, q, text, vw, gap, c) {
  const d = Math.hypot(q.x - p.x, q.y - p.y); if (!d) return null;
  const ux = (q.x - p.x) / d, uy = (q.y - p.y) / d;
  let nx = -uy, ny = ux;
  const dot = c ? nx * ((p.x + q.x) / 2 - c[0]) + ny * ((p.y + q.y) / 2 - c[1]) : 0;
  if (dot < -1e-6 || (Math.abs(dot) <= 1e-6 && (ny > 1e-6 || (Math.abs(ny) <= 1e-6 && nx > 0)))) { nx = -nx; ny = -ny; }
  const half = r => { const b = padBox(r); return [Math.abs(nx) * (b[2] - b[0]) / 2 + Math.abs(ny) * (b[3] - b[1]) / 2, Math.abs(ux) * (b[2] - b[0]) / 2 + Math.abs(uy) * (b[3] - b[1]) / 2]; };
  const [hbP, huP] = half(p), [hbQ, huQ] = half(q), hb = Math.max(hbP, hbQ);
  const P0 = gap ? [p.x + ux * huP, p.y + uy * huP] : [p.x, p.y], Q0 = gap ? [q.x - ux * huQ, q.y - uy * huQ] : [q.x, q.y];
  const off = hb + vw * 0.05, sw = r3(vw / 320), fs = r3(vw / 30), ah = Math.min(vw / 70, Math.hypot(Q0[0] - P0[0], Q0[1] - P0[1]) * 0.4);
  const A = [P0[0] + nx * off, P0[1] + ny * off], B = [Q0[0] + nx * off, Q0[1] + ny * off];
  const arrow = (P, s) => `M${r3(P[0] + s * ux * ah + nx * ah * 0.45)} ${r3(P[1] + s * uy * ah + ny * ah * 0.45)}L${r3(P[0])} ${r3(P[1])}L${r3(P[0] + s * ux * ah - nx * ah * 0.45)} ${r3(P[1] + s * uy * ah - ny * ah * 0.45)}`;
  const tx = (A[0] + B[0]) / 2 + nx * fs * 0.95, ty = (A[1] + B[1]) / 2 + ny * fs * 0.95;
  const e0 = gap ? 0 : hb * 0.5;
  const tw = [...text].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 1 : 0.62), 0) * fs;
  // 字横着写：法线是横的（尺寸线竖着）时，字往外挪半个字宽，免得压在线上
  const tcx = tx + nx * Math.abs(nx) * tw * 0.5, tcy = ty;
  const svg = `<g class="p2-dim" style="stroke-width:${sw}px">` +
    `<path d="M${r3(P0[0] + nx * e0)} ${r3(P0[1] + ny * e0)}L${r3(A[0] + nx * ah * 0.6)} ${r3(A[1] + ny * ah * 0.6)}M${r3(Q0[0] + nx * e0)} ${r3(Q0[1] + ny * e0)}L${r3(B[0] + nx * ah * 0.6)} ${r3(B[1] + ny * ah * 0.6)}" class="ext"/>` +
    `<path d="M${r3(A[0])} ${r3(A[1])}L${r3(B[0])} ${r3(B[1])}${arrow(A, 1)}${arrow(B, -1)}"/>` +
    `<text x="${r3(tcx)}" y="${r3(tcy)}" style="font-size:${fs}px;stroke-width:${r3(fs * 0.22)}px">${esc(text)}</text></g>`;
  const box = unionBox([[A[0], A[1], A[0], A[1]], [B[0], B[1], B[0], B[1]], [tcx - tw / 2, tcy - fs * 0.6, tcx + tw / 2, tcy + fs * 0.6]]);
  return { svg, box };
}
/* 放大到一个元件（焊盘 + 占位框都在视野里），需要的话再画一条尺寸线，并保证尺寸线和字也在视野里。返回最终视野宽度。 */
function focusPart(V, f, pad, dim, opt) {
  const b0 = fpBox(f), c = [(b0[0] + b0[2]) / 2, (b0[1] + b0[3]) / 2];
  let b = b0, vw = viewW(b0, pad), g = null;
  if (dim) {
    for (let k = 0; k < 3; k++) { g = dimGeo(dim.p, dim.q, dim.text, vw, dim.gap, c); if (!g) break; b = unionBox([b0, g.box]); vw = viewW(b, pad); }
    if (g) g = dimGeo(dim.p, dim.q, dim.text, vw, dim.gap, c);
  }
  V.focus(b, Object.assign({ pad }, opt || {}));
  if (g) V.annotate(g.svg);
  return vw;
}
/* 细线框（同样按视野定线宽） */
function boxLine(V, b, vw) {
  const sw = r3(vw / 260), da = r3(vw / 90);
  V.annotate(`<rect class="p2-box" x="${r3(b[0])}" y="${r3(b[1])}" width="${r3(b[2] - b[0])}" height="${r3(b[3] - b[1])}" rx="${r3(vw / 120)}" style="stroke-width:${sw}px;stroke-dasharray:${da} ${r3(da * 0.6)}"/>`);
}

/* ================= 2.1 符号 ↔ 封装 ================= */
const MAP_PARTS = ['R17', 'U3', 'D1', 'SW2'];
const MAP_TXT = {
  R17: f => `<b>${f.ref} · ${esc(f.value)} 电阻（${esc(f.desc)}）</b><p>电阻不分正反。符号 1 脚接 ${netTag(f.pins[0][2])}、2 脚接 ${netTag(f.pins[1][2])}，封装的 1 号、2 号焊盘就各接一个。同一个 ${esc(f.fp)} 封装被 ${byFp.get(f.fp).length} 个电阻共用：封装只管形状，不管阻值。</p>`,
  U3: f => `<b>${f.ref} · ${esc(f.value)}（${esc(f.desc)}）</b><p>5 个脚，号码一对一。符号上的排法是为了好读：输入在左、输出在右；封装上是芯片真实的引脚位置：1、2、3 在下排，4、5 在上排。4 号脚是 NC（不接），封装上照样有焊盘：5 个脚都焊上，芯片才放得平、焊得牢。</p>`,
  D1: f => `<b>${f.ref} · ${esc(f.value)}（${esc(f.desc)}）</b><p>网表写的是 1 脚 = 阳极（接 ${netTag('VBUS')}），2 脚 = 阴极（接 ${netTag('VSYS')}）。可这个立创封装的 1 号焊盘是<strong>阴极</strong>：丝印上那条竖杠就画在 1 号焊盘这边。号码对不上，<span class="net">build_board.py</span> 专门写了一行把 1、2 对调，图里两根连线交叉，就是这一行的作用。漏了它，二极管就接反了（2.8 第 1 题）。</p>`,
  SW2: f => `<b>${f.ref} · ${esc(f.value)}（${esc(f.desc)}）</b><p>符号只有 2 个脚，实物却有 4 条腿，两两在里面连通，所以封装照实物画了 4 个焊盘。脚本只用对角的 1 号和 4 号：不管里面连通的是横着的两条腿还是竖着的两条，对角的两条一定分在两边，按下去才接通。2 号、3 号焊盘不接网络，只负责把按键焊牢。</p>`
};
let mapRef = MAP_PARTS[0], mapAct = -1, mapModel = null;
$('map-parts').innerHTML = MAP_PARTS.map(r => `<button class="btn" data-ref="${r}" aria-pressed="false">${r} <small class="p2-mu">${esc(QB.fp(r).pkg)}</small></button>`).join('');
function mapPins(f) {
  const L = loc(f);
  return f.pins.map(([nums, name, net]) => {
    const ns = nums.split(',');
    let pads = L.pads.filter(p => p.t !== 'npth' && ns.includes(p.n));
    const same = pads.length > 0 && pads.every(p => (net === 'NC' ? p.net < 0 : netName(p) === net));
    if (!same && net !== 'NC') pads = L.pads.filter(p => p.t !== 'npth' && netName(p) === net);
    return { nums, name, net, pads, swapped: !same };
  });
}
function drawMap() {
  const f = QB.fp(mapRef), svg = $('map');
  const VW = 420, VH = 440, cx = 210, cy = 100;
  svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  const pins = mapPins(f);
  const used = new Set(); pins.forEach(p => p.pads.forEach(q => used.add(q.i)));
  let sym = '', ends = [];
  const lab = (x, y, t, anchor, cls) => `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" class="${cls || ''}">${esc(t)}</text>`;
  const netLab = (x, y, n, anchor) => n === 'NC' ? lab(x, y, '不接', anchor, 'p2-sm mu') : `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" class="p2-netl ${netCls(n)}">${esc(n)}</text>`;
  if (f.kind === 'ic') {
    const nl = Math.ceil(pins.length / 2), left = pins.slice(0, nl), right = pins.slice(nl);
    const rows = Math.max(left.length, right.length), bh = rows * 36 + 16, top = cy - bh / 2;
    sym += `<rect x="${cx - 58}" y="${top}" width="116" height="${bh}" rx="4" class="p2-body"/>`;
    sym += lab(cx, top - 8, f.ref + ' ' + f.value, 'middle', 'p2-sm mu');
    [[left, -1], [right, 1]].forEach(([list, s]) => list.forEach((pn, k) => {
      const i = pins.indexOf(pn), y = top + 26 + k * 36, x0 = cx + s * 58, x1 = cx + s * 128;
      ends[i] = [x1, y];
      sym += `<g class="p2-pin" data-i="${i}" tabindex="0" role="button" aria-label="符号 ${pn.nums} 脚 ${esc(pn.name)}，接 ${esc(pn.net)}">` +
        `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="p2-lead"/><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="p2-hit"/>` +
        lab(x0 + s * 12, y - 6, pn.nums, s < 0 ? 'end' : 'start', 'p2-pnum') + lab(x0 - s * 7, y + 5, pn.name, s < 0 ? 'start' : 'end', 'p2-pname') +
        netLab(x1 - s * 4, y - 7, pn.net, s < 0 ? 'start' : 'end') + `<circle cx="${x1}" cy="${y}" r="3.6" class="p2-end"/></g>`;
    }));
  } else {
    const xs = [cx - 130, cx + 130];
    sym += lab(cx, cy - 46, f.ref + ' ' + f.value, 'middle', 'p2-sm mu');
    if (f.kind === 'r') sym += `<rect x="${cx - 40}" y="${cy - 12}" width="80" height="24" rx="2" class="p2-body"/>`;
    else if (f.kind === 'd') sym += `<path d="M${cx - 18} ${cy - 18}L${cx + 16} ${cy}L${cx - 18} ${cy + 18}Z" class="p2-body"/><line x1="${cx + 17}" y1="${cy - 19}" x2="${cx + 17}" y2="${cy + 19}" class="p2-body"/>` +
      lab(cx - 30, cy + 34, '阳极 A', 'middle', 'p2-sm mu') + lab(cx + 30, cy + 34, '阴极 K', 'middle', 'p2-sm mu');
    else if (f.kind === 'sw') sym += `<circle cx="${cx - 26}" cy="${cy}" r="4" class="p2-body"/><circle cx="${cx + 26}" cy="${cy}" r="4" class="p2-body"/>` +
      `<line x1="${cx - 30}" y1="${cy - 16}" x2="${cx + 30}" y2="${cy - 16}" class="p2-body"/><line x1="${cx}" y1="${cy - 16}" x2="${cx}" y2="${cy - 32}" class="p2-body"/><line x1="${cx - 10}" y1="${cy - 32}" x2="${cx + 10}" y2="${cy - 32}" class="p2-body"/>`;
    const inner = f.kind === 'r' ? 40 : f.kind === 'd' ? 18 : f.kind === 'sw' ? 30 : 40;
    pins.forEach((pn, i) => {
      const s = i === 0 ? -1 : 1, x1 = xs[i], x0 = cx + s * inner;
      ends[i] = [x1, cy];
      sym += `<g class="p2-pin" data-i="${i}" tabindex="0" role="button" aria-label="符号 ${pn.nums} 脚，接 ${esc(pn.net)}">` +
        `<line x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}" class="p2-lead"/><line x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}" class="p2-hit"/>` +
        lab((x0 + x1) / 2, cy - 7, pn.nums, 'middle', 'p2-pnum') + netLab(x1, cy + 22, pn.net, 'middle') + `<circle cx="${x1}" cy="${cy}" r="3.6" class="p2-end"/></g>`;
    });
  }
  // 封装：按比例放大画在下半边
  const L = loc(f);
  const bb = unionBox(L.pads.map(padBox).concat(L.crt.length ? [ptsBox(L.crt)] : []));
  const box = [24, 236, 396, 420], k = Math.min((box[2] - box[0] - 30) / (bb[2] - bb[0]), (box[3] - box[1] - 30) / (bb[3] - bb[1]), 70);
  const ox = (box[0] + box[2]) / 2 - k * (bb[0] + bb[2]) / 2, oy = (box[1] + box[3]) / 2 - k * (bb[1] + bb[3]) / 2;
  const X = x => r3(ox + k * x), Y = y => r3(oy + k * y);
  const fpbg = `<rect x="${box[0]}" y="${box[1]}" width="${box[2] - box[0]}" height="${box[3] - box[1]}" rx="10" class="p2-fpbg"/>`;
  let fp = `<g transform="translate(${r3(ox)} ${r3(oy)}) scale(${r3(k)})">` +
    (L.crt.length ? `<polygon points="${L.crt.map(q => q.join(',')).join(' ')}" class="p2-crt" style="stroke-width:${r3(1.2 / k)}"/>` : '') +
    `<g class="p2-silk">${silkSVG(f.fp)}</g>` +
    L.pads.filter(p => p.t !== 'npth').map(p => `<g class="p2-pad${used.has(p.i) ? '' : ' nc'}" data-p="${p.i}">${padSVG(p)}</g>`).join('') + '</g>';
  // 焊盘号写在焊盘中间（不放大，保持字号）
  fp += L.pads.filter(p => p.t !== 'npth').map(p => { const fs = Math.max(10, Math.min(15, k * Math.min(p.w, p.h) * 0.62)); return `<text x="${X(p.x)}" y="${Y(p.y)}" class="p2-padn" style="font-size:${r3(fs)}px">${esc(p.n)}</text>`; }).join('');
  // 连线：符号的脚 → 焊盘中心
  let links = '';
  pins.forEach((pn, i) => pn.pads.forEach(p => {
    const [x1, y1] = ends[i], x2 = X(p.x), y2 = Y(p.y);
    links += `<path d="M${x1} ${y1}C${x1} ${r3(y1 + 90)} ${x2} ${r3(y2 - 90)} ${x2} ${y2}" class="p2-link ${netCls(pn.net)}" data-i="${i}"/>`;
  }));
  svg.innerHTML = `<text x="10" y="18" class="p2-sm mu">原理图符号</text><text x="10" y="228" class="p2-sm mu">封装（俯视，按比例放大；数字是焊盘号）</text>` +
    `${fpbg}<g class="p2-links">${links}</g>${fp}${sym}`;
  mapModel = { f, pins, used };
  mapSet(mapAct);
}
function mapSet(i) {
  mapAct = i;
  const svg = $('map'), m = mapModel; if (!m) return;
  svg.classList.toggle('act', i >= 0);
  svg.querySelectorAll('.p2-pin').forEach(g => g.classList.toggle('on', +g.dataset.i === i));
  svg.querySelectorAll('.p2-link').forEach(g => g.classList.toggle('on', +g.dataset.i === i));
  const on = new Set(i >= 0 ? m.pins[i].pads.map(p => p.i) : []);
  svg.querySelectorAll('.p2-pad').forEach(g => g.classList.toggle('on', on.has(+g.dataset.p)));
  const st = $('map-status');
  if (i < 0) { st.innerHTML = '指着（手机上点）符号的一个脚，或者封装的一个焊盘，看它们怎么对上。'; st.className = 'status'; return; }
  const pn = m.pins[i], p = pn.pads[0];
  const nums = pn.pads.map(q => q.n).join('、');
  st.className = 'status ' + (pn.swapped ? 'warn' : 'good');
  st.innerHTML = `符号 <b>${esc(pn.nums)}</b> 脚${pn.name ? '（' + esc(pn.name) + '）' : ''} → 封装 <b>${esc(nums)}</b> 号焊盘 · ${pn.net === 'NC' ? '不接网络' : '网络 ' + netTag(pn.net)}` +
    (p ? ` · 焊盘 ${n2(p.w)} × ${n2(p.h)} mm` : '') + (pn.swapped ? ' · <b>号码不一样</b>，靠 pad_map 对上' : '');
}
function mapPad(pi) {
  const m = mapModel; if (!m) return;
  const i = m.pins.findIndex(pn => pn.pads.some(p => p.i === pi));
  if (i >= 0) { mapSet(i); return; }
  const p = loc(m.f).pads[pi];
  mapSet(-1);
  const st = $('map-status'); st.className = 'status';
  st.innerHTML = `封装 <b>${esc(p.n)}</b> 号焊盘不接任何网络：符号上没有对应的脚，它只负责把元件焊牢。`;
}
function mapCard() {
  const f = QB.fp(mapRef);
  const holes = f.pads.filter(p => p.t === 'npth').length;
  $('map-card').innerHTML = MAP_TXT[mapRef](f) +
    `<div class="states"><div><span>封装名</span><span>${esc(f.fp)}</span></div><div><span>焊盘</span><span>${f.pads.length - holes} 个</span></div>` +
    `<div><span>立创编号</span><span>${esc(f.lcsc)}</span></div><div><span>同一个封装</span><span>${byFp.get(f.fp).length} 个元件在用</span></div></div>`;
}
function mapGo(ref) {
  mapRef = ref; mapAct = -1;
  C.pressOne('#p2-map-parts [data-ref]', 'ref', ref);
  drawMap(); mapCard();
}
$('map-parts').addEventListener('click', e => { const b = e.target.closest('[data-ref]'); if (b) mapGo(b.dataset.ref); });
(function () {
  const svg = $('map');
  const hit = e => {
    const g = e.target.closest('.p2-pin'); if (g) { mapSet(+g.dataset.i); return true; }
    const p = e.target.closest('.p2-pad'); if (p) { mapPad(+p.dataset.p); return true; }
    return false;
  };
  svg.addEventListener('pointerover', hit);
  svg.addEventListener('click', e => { if (!hit(e)) mapSet(-1); });
  svg.addEventListener('focusin', hit);
  svg.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.p2-pin')) { e.preventDefault(); hit(e); } });
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mapSet(-1); });
})();
mapGo(mapRef);

/* ================= 2.2 一个封装里的几层 ================= */
const AN_PARTS = ['U2', 'U4', 'R17', 'J1', 'SW1'];
const AN = BoardViewer.create($('an-bv'), { toolbar: false, panel: false, hover: true, tracks: false, layers: ['F.Cu'], label: '放大到一个元件的查看器：一层层打开封装的各层' });
let anRef = 'U2', anStep = 0;
function facts(f) {
  if (facts.c && facts.c[f.ref]) return facts.c[f.ref];
  const pads = f.pads, cnt = t => pads.filter(p => p.t === t).length;
  const pi = pitchInfo(f), nn = nameNums(f.fp), L = loc(f);
  const ep = pads.find(p => p.pasteRatio);
  const cb = L.crt.length ? ptsBox(L.crt) : null;
  const pb = unionBox(L.pads.filter(p => p.t !== 'npth').map(padBox));
  const thermal = ep ? D.vias.filter(v => v.role === 'thermal' && Math.abs(v.x - ep.x) <= ep.w / 2 && Math.abs(v.y - ep.y) <= ep.h / 2).length : 0;
  const o = { smd: cnt('smd'), pth: cnt('pth'), npth: cnt('npth'), pi, nn, ep, cb, pb, thermal, sizes: sizeList(f) };
  (facts.c = facts.c || {})[f.ref] = o;
  return o;
}
const padsLine = x => `${x.smd + x.pth + x.npth} 个：贴片 ${x.smd}${x.pth ? `，金属化孔 ${x.pth}` : ''}${x.npth ? `，非金属化孔 ${x.npth}` : ''}`;
const MASK_DAM = [0.10, 0.13];   // JLC 1 oz 阻焊桥：绿 / 红 / 黄 / 蓝 / 紫 ≥ 0.10 mm，黑 / 白 ≥ 0.13 mm [S01]
const AN_STEPS = [
  { name: '① 铜焊盘', layers: ['F.Cu'],
    t: () => '铜焊盘（F.Cu）',
    p: f => '焊盘是板子表面露出来的铜，元件的脚就焊在这上面。KiCad 里顶层铜叫 F.Cu，画成红色。',
    s: (f, x) => [['焊盘', padsLine(x)], ['尺寸 mm', x.sizes.filter(z => z.t !== 'npth').map(z => `${z.k}${z.n > 1 ? ' ×' + z.n : ''}`).join('，')],
      [x.pi && x.pi.many ? '脚距' : '中心距', x.pi ? `${n2(x.pi.pitch)} mm` : '—']] },
  { name: '② 阻焊开窗', layers: ['F.Cu', 'F.Mask'],
    t: () => '阻焊开窗（F.Mask）',
    p: f => `整块板刷一层阻焊油（绿油），只在焊盘上开窗，紫色就是开窗。QB12 的阻焊扩展设成 ${n2(D.rules.solder_mask_expansion)}，开窗和焊盘一样大；JLC 也是按 1:1 开窗 [S01]。相邻两块焊盘之间留下的那一条油叫<strong>阻焊桥</strong>，它挡着焊锡，不让相邻的脚连在一起。`,
    s: (f, x) => [['开窗', `和焊盘一样大（扩展 ${n2(D.rules.solder_mask_expansion)} mm）`], ['相邻焊盘的缝', x.pi ? `${f2(x.pi.gap)} mm` : '—'],
      ['JLC 阻焊桥', `绿油 ≥ ${f2(MASK_DAM[0])}，黑 / 白油 ≥ ${f2(MASK_DAM[1])} mm`], ['够不够', x.pi ? (x.pi.gap >= MASK_DAM[1] ? '<b class="p2-ok">够</b>' : x.pi.gap >= MASK_DAM[0] ? '<b class="p2-warn">只够绿油</b>' : '<b class="p2-bad">不够</b>') : '—']],
    dim: true },
  { name: '③ 钢网', layers: ['F.Cu', 'F.Paste'],
    t: () => '钢网开口（F.Paste）',
    p: (f, x) => '钢网是一张薄钢片，开了孔的地方漏锡膏。贴片时先用它往焊盘上刷锡膏（灰色），再放元件、过回流焊。' +
      (x.ep ? `中间的散热焊盘只开了 ${Math.round((1 + 2 * x.ep.pasteRatio) * 100)}% × ${Math.round((1 + 2 * x.ep.pasteRatio) * 100)}%，面积约 ${Math.round((1 + 2 * x.ep.pasteRatio) ** 2 * 100)}%：脚本注释写着“避免芯片浮起”。大焊盘上锡膏太多，芯片会被垫高，两边的细脚反而焊不上。乐鑫对模组底下的焊盘也是这么提醒的 [S47]。`
        : f.ref === 'J1' ? '外壳的 4 条插脚是插进孔里的，脚本给这 4 个孔也开了钢网（通孔回流），让外壳和贴片焊盘一起焊上。' : '普通焊盘的开口和焊盘一样大。'),
    s: (f, x) => x.ep ? [['散热焊盘', `${n2(x.ep.w)} × ${n2(x.ep.h)} mm`], ['钢网开口', `${f2(x.ep.w * (1 + 2 * x.ep.pasteRatio))} × ${f2(x.ep.h * (1 + 2 * x.ep.pasteRatio))} mm`], ['锡膏相对间距', `${Math.round(x.ep.pasteRatio * 100)}%（每边缩这么多）`]]
      : [['开口', '和焊盘一样大'], ['焊盘', padsLine(x)]] },
  { name: '④ 丝印', layers: ['F.Cu', 'F.SilkS'],
    t: () => '丝印（F.SilkS）',
    p: f => `印在阻焊油上面的白字白线（这里画成黄色）：外形、1 脚或极性标记、位号。它不导电，只给人看。丝印碰到焊盘开窗的地方会被裁掉，整块板有 ${drcN('silk_over_copper')} 条这样的 DRC 警告（第 6 课）。`,
    s: (f, x) => [['找一找', x.nn.pin1 ? `1 脚标记：0° 时在${PIN1_ZH[x.nn.pin1]}（名字里的 ${x.nn.pin1}）` : f.kind === 'd' || f.kind === 'led' ? '极性标记' : '外形线、1 脚附近的小圆点'], ['位号', f.refShown ? '印着' : '这一个没印（第 3 课）']] },
  { name: '⑤ 占位框', layers: ['F.Cu', 'Courtyard'],
    t: () => '占位框（Courtyard）',
    p: (f, x) => '占位框圈出这个元件占掉的地（KiCad 中文界面叫“元件外框”）。两个元件的占位框不该重叠，DRC 会查“元件外框重叠”。' +
      (x.cb && (x.pb[2] - x.pb[0] > x.cb[2] - x.cb[0] + 0.05 || x.pb[3] - x.pb[1] > x.cb[3] - x.cb[1] + 0.05) ? '立创转换来的封装，占位框画的基本就是元件本体，焊盘反而伸出框外。元件挤得很近时，要自己给焊盘多留点空。' : ''),
    s: (f, x) => [['占位框', x.cb ? `${f1(x.cb[2] - x.cb[0])} × ${f1(x.cb[3] - x.cb[1])} mm` : '—'], ['焊盘外沿', `${f1(x.pb[2] - x.pb[0])} × ${f1(x.pb[3] - x.pb[1])} mm`],
      ['名字里的本体', x.nn.L ? `L${x.nn.Ls}-W${x.nn.Ws} → ${f1(x.nn.L)} × ${f1(x.nn.W)} mm` : '名字里没写']] },
  { name: '⑥ 孔', layers: ['F.Cu', 'B.Cu', 'Drill', 'Vias'], nonum: true, rings: true,
    t: () => '孔（Drill）',
    p: (f, x) => {
      if (f.ref === 'U2') return `散热焊盘里有 ${x.pth} 个镀了铜的小孔（黄色虚线圈），是封装自带的，把热导到底层（蓝色是底层铜）。灰色的 ${x.thermal} 个是脚本另外补的散热过孔，第 5 课细讲。`;
      if (f.ref === 'U4') return `U4 的封装本身没有孔。散热焊盘上那 ${x.thermal} 个孔是脚本另外打的散热过孔（第 5 课）。`;
      if (f.ref === 'J1') return `外壳的 4 条腿插进 4 个镀铜的长圆孔（金属化孔，PTH，黄色虚线圈）；另外 ${x.npth} 个光孔（非金属化孔，NPTH，细灰圈）给插座底下的定位柱。`;
      if (f.ref === 'SW1') return `开关底下有两根塑料定位柱，封装给它们留了 ${x.npth} 个 ${n2(f.pads.find(p => p.t === 'npth').drill[0])} mm 的光孔（非金属化孔），不镀铜，也不接任何网络。`;
      return '贴片元件不打孔，只焊在板子表面。旁边能看到的孔是走线换层用的过孔，不属于这个封装。';
    },
    s: (f, x) => [['金属化孔（PTH）', `${x.pth} 个${x.pth ? '：' + [...new Set(f.pads.filter(p => p.t === 'pth').map(p => p.drill[0] === p.drill[1] ? 'Ø' + n2(p.drill[0]) : n2(p.drill[0]) + ' × ' + n2(p.drill[1])))].join('，') + ' mm' : ''}`],
      ['非金属化孔（NPTH）', `${x.npth} 个`]] },
  { name: '全部叠起来', layers: ['F.Cu', 'F.Mask', 'F.Paste', 'F.SilkS', 'Courtyard', 'Drill'],
    t: () => '叠在一起：KiCad 里看到的样子',
    p: () => 'KiCad 的封装里还有一层 F.Fab（装配图层），画元件本体给装配图用。它不进 Gerber，嘉立创用不到，这里没画。',
    s: (f, x) => [['封装名', esc(f.fp)], ['焊盘', padsLine(x)]] },
  { name: '做出来的样子', mode: 'made', layers: [], nonum: true,
    t: () => '做出来的样子',
    p: () => '绿油盖住一切，只在开窗的地方露出焊盘（这里画成喷锡的银色），丝印印在油上面。真板的颜色是下单时选的（第 8 课）。',
    s: (f, x) => [['看得见的铜', '只有开窗里的焊盘'], ['白字', '丝印']] }
];
$('an-parts').innerHTML = AN_PARTS.map(r => `<button class="btn" data-ref="${r}" aria-pressed="false">${r} <small class="p2-mu">${esc(QB.fp(r).pkg)}</small></button>`).join('');
$('an-steps').innerHTML = AN_STEPS.map((s, i) => `<button class="btn" data-step="${i}" aria-pressed="false">${s.name}</button>`).join('');
function anPad(f) { return f.pads.length > 20 ? 0.8 : 0.6; }
function anText(note) {
  const f = QB.fp(anRef), s = AN_STEPS[anStep], x = facts(f);
  C.pressOne('#p2-an-parts [data-ref]', 'ref', anRef);
  C.pressOne('#p2-an-steps [data-step]', 'step', anStep);
  $('an-t').textContent = s.t(f, x);
  $('an-p').innerHTML = (note ? `<span class="p2-note">${note}</span>` : '') + s.p(f, x);
  $('an-s').innerHTML = s.s(f, x).map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
}
function anView() {
  const f = QB.fp(anRef), s = AN_STEPS[anStep], x = facts(f);
  AN.clear().clearAnnotations();
  AN.show({ mode: s.mode || 'layers', side: 'top', layers: s.layers, tracks: s.mode === 'made', finish: 'hasl', mask: 'green' });
  // 看孔和成品时把查看器的焊盘号藏起来（号码会盖住小孔）
  $('an-bv').classList.toggle('p2-nonum', !!s.nonum);
  const vw = focusPart(AN, f, anPad(f), s.dim && x.pi ? { p: x.pi.pair[0], q: x.pi.pair[1], text: `缝 ${f2(x.pi.gap)}`, gap: true } : null);
  if (s.rings) {
    const sw = r3(vw / 260);
    AN.annotate(f.pads.filter(p => p.t === 'pth').map(p => `<circle class="p2-ring" cx="${p.x}" cy="${p.y}" r="${r3(Math.max(p.w, p.h) / 2 + vw / 70)}" style="stroke-width:${sw}px;stroke-dasharray:${r3(vw / 120)} ${r3(vw / 200)}"/>`).join(''));
  }
  AN.badge(`${f.ref} · ${s.name}`);
}
function anShow(note) { anText(note); anView(); }
$('an-parts').addEventListener('click', e => { const b = e.target.closest('[data-ref]'); if (b) { anRef = b.dataset.ref; anShow(); } });
$('an-steps').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) { anStep = +b.dataset.step; anShow(); } });
anText();
C.onVisible($('an-bv'), () => anView(), '600px');

/* 脚本动过的地方（build_board.py） */
const MODS = [
  { t: 'J1、SW1：定位柱的孔改成不镀铜', ref: 'SW1', step: 5,
    x: '库里这几个定位孔画成了“金属化孔、焊盘和孔一样大”。脚本把没编号的金属化孔改成非金属化孔（NPTH）：就是一个光孔，不镀铜，定位柱插进去就行。' },
  { t: 'U2：散热焊盘里的 4 个小孔编成 17 号', ref: 'U2', step: 5,
    x: () => { const u = QB.fp('U2'), ep = u.pads.find(p => p.pasteRatio != null), h = u.pads.find(p => p.n === ep.n && p.t === 'pth');
      return `库里这 4 个小孔没有编号。脚本把它们编成 17 号（和散热焊盘同号），于是一起接到 GND；还把这 4 个孔焊盘自己的钢网层去掉了（脚本注释写的是“底面不出锡膏”）。不过散热焊盘自己的钢网开口有 ${f2(ep.w * (1 + 2 * ep.pasteRatio))} mm 见方，这 4 个孔离中心只有 ${n2(Math.abs(h.x - ep.x))} mm，照样落在锡膏下面：回流时会有一些锡流进孔里。JLC 说焊盘上的孔可能造成虚焊，默认照常生产 [S07]。`; } },
  { t: 'U2、U4：散热焊盘的钢网缩到 70% × 70%', ref: 'U4', step: 2,
    x: '给散热焊盘设了 −15% 的锡膏相对间距，开口每边缩 15%。脚本注释：“锡膏缩到约 50%，避免芯片浮起”。' },
  { t: 'J1：外壳插脚加钢网开口', ref: 'J1', step: 2,
    x: '外壳的 4 条腿是插进孔里的。脚本给这 4 个孔加了钢网开口，锡膏刷在孔口，过回流焊时一起焊上。脚本注释：“保证外壳焊牢”。' },
  { t: 'J1：每个焊盘单独设 0.1 mm 间距', ref: 'J1', step: 1,
    x: () => `J1 中间的焊盘只隔 0.5 mm，缝只有 ${f2(facts(QB.fp('J1')).pi.gap)} mm。脚本给 J1 的每个焊盘设了 ${n2(QB.fp('J1').pads.find(p => p.clr).clr)} mm 的局部间距（网络类默认是 ${n2(D.classes.find(c => c.name === 'Default').clearance)} mm）。脚本没写为什么这样设。约束里的最小间距 ${n2(D.rules.min_clearance)} mm 是硬下限，局部设得再小也不起作用，所以实际按 ${n2(D.rules.min_clearance)} mm 检查和铺铜。间距规则第 4 课细讲。` }
];
$('mods').innerHTML = MODS.map((m, i) => `<button class="card p2-mod" data-mod="${i}" aria-pressed="false"><b>${esc(m.t)}</b><span>${typeof m.x === 'function' ? m.x() : m.x}</span></button>`).join('') +
  '<p class="cap p2-modcap">板上的每个封装都是从库里拷过来的一份副本，脚本改的是板上这份，库里的原件没动。所以用交付的 KiCad 工程跑 DRC（或者 <span class="menu">检查 → 将封装与库比较</span>），会有 3 条“封装与来源库中的封装存在不一致”，正好是 SW1、J1、U2（第 6 课）。</p>';
$('mods').addEventListener('click', e => {
  const b = e.target.closest('[data-mod]'); if (!b) return;
  const m = MODS[+b.dataset.mod];
  C.pressOne('#p2-mods [data-mod]', 'mod', b.dataset.mod);
  anRef = m.ref; anStep = m.step;
  anShow('脚本改的：' + esc(m.t) + '。');
  $('an-bv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });
});

/* ================= 2.3 17 种封装 ================= */
const GB = BoardViewer.create($('gal-bv'), { toolbar: 'mini', panel: false, hover: true, tracks: false,
  layers: ['F.Cu', 'B.Cu', 'Drill', 'F.SilkS', 'Courtyard', 'Edge.Cuts'], label: 'QB12 板子，放大到选中的封装' });
const FAM = [['阻容', f => f.kind === 'r' || f.kind === 'c'], ['二极管和灯', f => f.kind === 'd' || f.kind === 'led'],
  ['晶体管、芯片、模组', f => /^[UQ]/.test(f.ref)], ['接口和开关', f => /^(J|SW)/.test(f.ref)]];
const KINDS = [...byFp.keys()];
function thumb(f) {
  const L = loc(f), bb = unionBox(L.pads.map(padBox));
  const m = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.08 + 0.1;
  return `<svg viewBox="${r3(bb[0] - m)} ${r3(bb[1] - m)} ${r3(bb[2] - bb[0] + 2 * m)} ${r3(bb[3] - bb[1] + 2 * m)}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">` +
    L.pads.filter(p => p.t !== 'npth').map(p => padSVG(p, ' class="cu"')).join('') +
    L.pads.filter(p => p.drill).map(p => drillSVG(p, p.t === 'npth' ? ' class="np"' : ' class="hole"')).join('') + '</svg>';
}
(function () {
  let h = '';
  FAM.forEach(([name, test]) => {
    const list = KINDS.map(k => byFp.get(k)[0]).filter(test).sort((a, b) => a.pads.length - b.pads.length || natural(a.ref, b.ref));
    if (!list.length) return;
    h += `<span class="p2-gfam">${name}</span>`;
    list.forEach(f => {
      const n = byFp.get(f.fp).length;
      h += `<button class="p2-gcard" data-fp="${esc(f.fp)}" aria-pressed="false" title="${esc(f.fp)}">${thumb(f)}<b>${esc(f.pkg)}</b><small>${KIND_ZH(f)}${n > 1 ? ' ×' + n : ''} · ${esc(f.ref)}${n > 1 ? '…' : ''}</small></button>`;
    });
  });
  $('gal-grid').innerHTML = h;
})();
let galFp = null, galRef = null;
function galPinsTable(f) {
  const rows = new Map();
  f.pads.forEach(p => {
    if (p.t === 'npth') return;
    // 同号同网络、但类型或尺寸不同（U2 的 17 号 = 1 块贴片散热焊盘 + 4 个金属化孔）分开列
    const key = (p.n || '—') + '|' + p.net + '|' + p.t + '|' + p.w + '×' + p.h;
    const r = rows.get(key); if (r) r.n++; else rows.set(key, { p, n: 1 });
  });
  const list = [...rows.values()].sort((a, b) => natural(a.p.n, b.p.n) || (a.p.t === 'smd' ? 0 : 1) - (b.p.t === 'smd' ? 0 : 1));
  const holes = f.pads.filter(p => p.t === 'npth');
  return `<table><thead><tr><th>焊盘号</th><th>脚名</th><th>网络</th><th>类型</th><th>尺寸 mm</th></tr></thead><tbody>` +
    list.map(({ p, n }) => `<tr><td>${esc(p.n || '—')}${n > 1 ? ` <small>×${n}</small>` : ''}</td><td>${esc(pinName(f, p))}</td><td>${netTag(netName(p))}</td><td>${T_ZH[p.t]}</td><td>${p.poly ? '异形' : p.s === 'circle' ? 'Ø' + n2(p.w) : n2(p.w) + ' × ' + n2(p.h)}</td></tr>`).join('') +
    (holes.length ? `<tr><td>—</td><td>定位孔</td><td>${netTag(null)}</td><td>${T_ZH.npth}</td><td>Ø${n2(holes[0].drill[0])} ×${holes.length}</td></tr>` : '') + '</tbody></table>';
}
const galDim = (x, vw) => (x.pi ? { p: x.pi.pair[0], q: x.pi.pair[1], text: `${n2(x.pi.pitch)} mm`, gap: false } : null);
function galView(opt) {
  const f = QB.fp(galRef), x = facts(f), pad = 0.8;
  GB.clear().clearAnnotations();
  const vw = focusPart(GB, f, pad, galDim(x), { animate: !(opt && opt.instant) });
  const b = fpBox(f);
  boxLine(GB, [b[0] - 0.15, b[1] - 0.15, b[2] + 0.15, b[3] + 0.15], vw);
  GB.badge(`${f.ref} · ${f.pkg}`);
  return vw;
}
function galGo(fp, ref, opt) {
  const list = byFp.get(fp); if (!list) return;
  const f = ref ? QB.fp(ref) : list[0];
  galFp = fp; galRef = f.ref;
  document.querySelectorAll('#p2-gal-grid [data-fp]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fp === fp)));
  const x = facts(f), vw = viewW(fpBox(f), 0.8);
  if (!(opt && opt.noView)) galView(opt);
  $('gal-zoom').hidden = W0 / vw >= 4;
  const nn = x.nn;
  const chk = (name, v, meas) => v == null ? '' : `<small>名字里 ${name}，${Math.abs(v - meas) < 0.03 ? '<b class="p2-ok">对得上</b>' : `量出来 ${n2(meas)}`}</small>`;
  const sizes = x.sizes.map(z => `${z.k}${z.n > 1 ? ' ×' + z.n : ''}${z.t !== 'smd' ? '（' + T_ZH[z.t] + '）' : ''}`).join('<br>');
  const L = loc(f), crt = x.cb;
  // 两排焊盘外沿：垂直于脚距方向的总宽（局部坐标）
  let span = null;
  if (x.pi && x.pi.many && nn.LS) {
    const lp = L.pads.filter(p => p.t === 'smd' && !p.poly && p.s === x.pi.pair[0].s && Math.abs(p.w - x.pi.pair[0].w) < 1e-6);
    const b = unionBox(lp.map(padBox)), th = f.rot * Math.PI / 180;
    const lux = Math.abs(x.pi.ux * Math.cos(th) - x.pi.uy * Math.sin(th));
    span = lux > 0.7 ? b[3] - b[1] : b[2] - b[0];
  }
  const refs = list.map(g => `<button class="p2-ref" data-ref="${g.ref}" aria-pressed="${g.ref === f.ref}">${g.ref}</button>`).join('');
  const tiles = [
    ['封装名', `<span class="p2-fpname">${esc(f.fp)}</span>`],
    ['用在', `${list.length} 个：${refs}`],
    ['焊盘', padsLine(x)],
    ['焊盘尺寸 mm', sizes],
    [x.pi && x.pi.many ? '脚距' : '两焊盘中心距', x.pi ? `${n2(x.pi.pitch)} mm${chk('P' + nn.Ps, nn.P, x.pi.pitch)}` : '—'],
    ['相邻焊盘的缝', x.pi ? `${f2(x.pi.gap)} mm<small>阻焊桥要 ≥ ${f2(MASK_DAM[0])}（黑白油 ${f2(MASK_DAM[1])}）</small>` : '—'],
    ['本体 / 占位框', `${nn.L ? `名字 ${f1(nn.L)} × ${f1(nn.W)}` : '名字里没写'}${crt ? ` · 框 ${f1(crt[2] - crt[0])} × ${f1(crt[3] - crt[1])}` : ''} mm`],
    ...(span != null ? [['两排焊盘外沿', `${f1(span)} mm<small>名字里 LS${nn.LSs}：焊盘比引脚尖再往外伸一点</small>`]] : []),
    ...(nn.pin1 ? [['1 脚在哪', `0° 时在${PIN1_ZH[nn.pin1]}<small>名字里的 ${nn.pin1}；板上转了 ${((f.rot % 360) + 360) % 360}°</small>`]] : []),
    ['立创编号', `${esc(f.lcsc)} · <span class="p2-lib ${f.lib === '扩展' ? 'ext' : ''}">${esc(f.lib)}库</span>`]
  ];
  $('gal-ro').innerHTML = tiles.map(([a, b]) => `<div class="ro"><small>${a}</small><b>${b}</b></div>`).join('');
  $('gal-pins').innerHTML = `<h4>${esc(f.ref)} 每个焊盘接到哪 <small>${esc(f.value)} · ${esc(f.desc)}</small></h4><div class="tbl p2-ptbl">${galPinsTable(f)}</div>`;
}
$('gal-grid').addEventListener('click', e => { const b = e.target.closest('[data-fp]'); if (b) galGo(b.dataset.fp); });
$('gal-ro').addEventListener('click', e => { const b = e.target.closest('[data-ref]'); if (b) galGo(galFp, b.dataset.ref); });
$('gal-zoom').addEventListener('click', () => {
  const f = QB.fp(galRef); if (!f) return;
  const p1 = f.pads.find(p => p.n === '1') || f.pads[0], w = W0 / 6, h = w / ASP, x = facts(f);
  GB.clearAnnotations();
  GB.focus([p1.x - w / 2, p1.y - h / 2, p1.x + w / 2, p1.y + h / 2], { pad: 0 });
  const g = x.pi && dimGeo(x.pi.pair[0], x.pi.pair[1], `${n2(x.pi.pitch)} mm`, w, false, (() => { const b = fpBox(f); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; })());
  if (g) GB.annotate(g.svg);
});
$('gal-trk').addEventListener('click', e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  GB.show({ tracks: on, layers: on ? ['F.Cu', 'B.Cu', 'Vias', 'Drill', 'F.SilkS', 'Courtyard', 'Edge.Cuts'] : ['F.Cu', 'B.Cu', 'Drill', 'F.SilkS', 'Courtyard', 'Edge.Cuts'] });
});
GB.on('view', vb => {
  const k = W0 / vb[2];
  $('gal-zl').textContent = `放大 ${f1(k)} 倍${k >= 4 ? ' · 显示焊盘号' : ' · 放大到 4 倍以上显示焊盘号'}`;
});
galGo(QB.fp('U2').fp, 'U2', { noView: true });
C.onVisible($('gal-bv'), () => galView({ instant: true }), '600px');

/* ================= 2.4 脚距画错会怎样（示意） ================= */
(function () {
  const U2 = QB.fp('U2'), Lu = loc(U2);
  const row = Lu.pads.filter(p => p.t === 'smd' && !p.pasteRatio);
  const PW = row[0].w, PH = row[0].h, PY = Math.abs(row[0].y);                 // 0.35 × 1.3，中心离芯片中线 2.85
  const REAL = facts(U2).pi.pitch;                                              // 0.65（量出来的）
  const ep = Lu.pads.find(p => p.pasteRatio), vias = Lu.pads.filter(p => p.t === 'pth');
  const nn = nameNums(U2.fp), BL = nn.L, BW = nn.W, TIP = nn.LS / 2;            // 示意：本体 5.0 × 4.4，引脚尖到尖 6.4
  const LW = 0.25;                                                              // 示意：引脚宽
  const svg = $('p'), range = $('p-range');
  let pitch = REAL, epOn = true;
  const presets = [0.5, 0.6, 0.635, REAL, 0.8];
  $('p-presets').innerHTML = presets.map(v => `<button class="btn" data-v="${v}" aria-pressed="false">${v === REAL ? n2(v) + '（对）' : v === 0.635 ? '0.635（25 mil）' : n2(v)}</button>`).join('');
  range.value = REAL;
  function draw() {
    const P = pitch, half = 3.5;                                               // 一排 8 个脚，编号 0…7，中间是 3.5
    let pads = '', leads = '';
    const st = { ok: 0, part: 0, wrong: 0, open: 0 };
    let maxOff = 0;
    for (const sy of [1, -1]) {
      for (let i = 0; i < 8; i++) {
        const cp = (i - half) * P, cl = (i - half) * REAL;
        pads += `<rect x="${r3(cp - PW / 2)}" y="${r3(sy * PY - PH / 2)}" width="${PW}" height="${PH}" rx="${r3(PW / 2)}" class="cu"/>`;
        const off = Math.abs(cl - cp); maxOff = Math.max(maxOff, off);
        let s;
        const touchNb = [i - 1, i + 1].some(j => j >= 0 && j < 8 && Math.abs(cl - (j - half) * P) < PW / 2 + LW / 2);
        if (off <= (PW - LW) / 2 + 1e-9) s = 'ok';
        else if (touchNb) s = 'wrong';
        else if (off >= PW / 2 + LW / 2) s = 'open';
        else s = 'part';
        st[s]++;
        const y0 = sy > 0 ? BW / 2 : -TIP, y1 = sy > 0 ? TIP : -BW / 2;
        leads += `<rect x="${r3(cl - LW / 2)}" y="${r3(y0)}" width="${LW}" height="${r3(y1 - y0)}" class="lead ${s}"/>`;
      }
    }
    const epS = epOn ? padSVG(Object.assign({}, ep, { a: 0 }), ' class="cu"') + vias.map(v => `<circle cx="${v.x}" cy="${v.y}" r="${r3(v.drill[0] / 2)}" class="hole"/>`).join('') : `<rect x="${-ep.w / 2}" y="${-ep.h / 2}" width="${ep.w}" height="${ep.h}" class="miss"/>`;
    svg.innerHTML = `<rect x="-4.3" y="-4.25" width="8.6" height="8.5" class="bg"/>${pads}${epS}` +
      `<rect x="${-BL / 2}" y="${-BW / 2}" width="${BL}" height="${BW}" rx=".12" class="body"/>${leads}` +
      `<circle cx="${r3(-BL / 2 + 0.5)}" cy="${r3(BW / 2 - 0.5)}" r=".18" class="dot"/>` +
      `<text x="0" y="-3.85" class="t">引脚（实物）脚距 ${n2(REAL)} mm</text><text x="0" y="4.05" class="t">焊盘（封装）脚距 ${r3(P)} mm</text>` +
      `<text x="0" y="0.1" class="t mu">芯片本体（示意）</text>` + (epOn ? '' : `<text x="0" y="0.6" class="t bad">散热焊盘没画</text>`);
    $('p-val').textContent = `${String(Math.round(P * 1000) / 1000)} mm`;
    C.pressOne('#p2-p-presets [data-v]', 'v', presets.find(v => Math.abs(v - P) < 1e-6) ?? -1);
    $('p-ro').innerHTML = [['实物脚距', `${n2(REAL)} mm`], ['封装脚距', `${String(Math.round(P * 1000) / 1000)} mm`], ['最外侧的脚偏了', `${f2(maxOff)} mm`, maxOff <= (PW - LW) / 2 ? 'good' : maxOff < PW / 2 ? 'warn' : 'bad'],
      ['对正 / 偏 / 压错 / 落空', `${st.ok} / ${st.part} / ${st.wrong} / ${st.open}`, st.wrong + st.open ? 'bad' : st.part ? 'warn' : 'good']]
      .map(([a, b, c]) => `<div class="ro"><small>${a}</small><b class="${c || ''}">${b}</b></div>`).join('');
    const S2 = $('p-status');
    let msg, cls;
    if (Math.abs(P - REAL) < 1e-6) { msg = `完全对上：16 个脚都落在自己焊盘的正中间。`; cls = 'good'; }
    else if (st.wrong + st.open === 0 && st.part === 0) { msg = `只差 ${r3(Math.abs(P - REAL))} mm，看着还行。但每个脚都偏一点，越往两边偏得越多，最外侧已经偏了 ${f2(maxOff)} mm。`; cls = 'warn'; }
    else if (st.wrong + st.open === 0) { msg = `每个脚距只差 ${r3(Math.abs(P - REAL))} mm，可一排 8 个脚累积下来，最外侧的脚偏了 ${f2(maxOff)} mm，已经有 ${st.part} 个脚搭到了焊盘边外：焊锡少、容易虚焊。`; cls = 'warn'; }
    else { msg = `最外侧的脚偏了 ${f2(maxOff)} mm，比焊盘宽度（${n2(PW)} mm）还多：${st.wrong ? `${st.wrong} 个脚压到了隔壁的焊盘，回流时会连锡（短路）` : ''}${st.wrong && st.open ? '；' : ''}${st.open ? `${st.open} 个脚完全落空，焊不上（开路）` : ''}。`; cls = 'bad'; }
    if (!epOn) { msg += ` 另外，肚子底下的 PowerPAD 没地方焊：TI 要求 GND 脚和 PowerPAD 都必须接地，芯片的热也要靠它传到铜上 [S48]。`; cls = 'bad'; }
    S2.className = 'status ' + cls; S2.innerHTML = msg;
    $('p-ep').textContent = epOn ? '散热焊盘：画了' : '散热焊盘：漏画了';
    $('p-ep').setAttribute('aria-pressed', String(epOn));
  }
  range.addEventListener('input', () => { pitch = +range.value; draw(); });
  $('p-presets').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; pitch = +b.dataset.v; range.value = pitch; draw(); });
  $('p-ep').addEventListener('click', () => { epOn = !epOn; draw(); });
  draw();
})();

/* 三种常见的焊接问题（示意图） */
(function () {
  const U2g = facts(QB.fp('U2')).pi.gap, J1g = facts(QB.fp('J1')).pi.gap;
  const cards = [
    ['连锡（短路）', `<rect x="8" y="34" width="22" height="30" class="cu"/><rect x="38" y="34" width="22" height="30" class="cu"/><rect x="13" y="20" width="12" height="40" class="lead"/><rect x="43" y="20" width="12" height="40" class="lead"/><path d="M10 58Q34 40 58 58L58 66L10 66Z" class="sol"/>`,
      `相邻两个脚被一团锡连在一起，等于短路。焊盘之间的缝越小越容易出：U2 的缝是 ${f2(U2g)} mm，USB-C 的 J1 只有 ${f2(J1g)} mm。缝里的阻焊桥、钢网开口不过量，都是为了防它。`],
    ['虚焊（开路）', `<rect x="8" y="40" width="26" height="26" class="cu"/><rect x="44" y="40" width="26" height="26" class="cu"/><rect x="2" y="18" width="12" height="38" class="lead"/><rect x="50" y="18" width="12" height="38" class="lead"/><path d="M48 56Q56 48 64 56L64 60L48 60Z" class="sol"/>`,
      '脚没落在焊盘上，或者焊盘太短、锡爬不上去：看着焊上了，其实没连通，一碰就时好时坏。脚距、焊盘长度照手册画，就是为了防它。'],
    ['立碑', `<rect x="6" y="56" width="22" height="12" class="cu"/><rect x="48" y="56" width="22" height="12" class="cu wide"/><rect x="74" y="56" width="14" height="12" class="cu wide"/><g transform="rotate(-62 26 56)"><rect x="20" y="44" width="40" height="14" rx="2" class="chip"/></g><path d="M8 56Q17 48 26 56Z" class="sol"/>`,
      `小阻容两头受热不一样（比如一头的焊盘接着大片铜，热被铜吸走），一头的锡先化，把元件拽得竖起来。嘉立创建议铺铜上的焊盘用十字（花）焊盘，理由就是铜导热太快 [S24]；QB12 的接地焊盘是${D.process.gnd.pad_connection === 'solid' ? '实心' : ''}连到铺铜上的，第 5 课细讲。`]
  ];
  $('fails').innerHTML = cards.map(([t, g, x]) => `<figure class="card p2-fail"><svg viewBox="0 0 96 74" aria-hidden="true">${g}</svg><figcaption><b>${t}</b><span>${x}</span></figcaption></figure>`).join('') +
    '<p class="cap p2-failcap">三张都是示意图。到货以后用眼睛和放大镜找的，主要就是这几种（第 8 课）。</p>';
})();

/* ================= 2.5 旋转与 1 脚 ================= */
(function () {
  const PARTS = ['D1', 'LED3', 'U5', 'U2'];
  const TXT = {
    D1: '二极管看极性：阴极那一头，丝印画了一条竖杠（在 1 号焊盘这边）。QB12 上它没转，阴极朝左。要是转了 180°，就接反了。',
    LED3: 'LED 也分极性。这个 LED 封装的 1 号焊盘是阳极，丝印上的三角箭头指向 2 号焊盘（阴极），和上面的 SS34 刚好相反。所以不能凭“1 号 = 阴极”这种习惯，要看丝印。',
    U5: 'U5（USB 的 ESD 保护芯片）是 6 个脚的 SOT-23-6。库里 0° 时 1 脚在左下（名字里的 BL）。板上转了 180°，1 脚就跑到右上。',
    U2: 'U2 在库里 0° 时是上下两排脚、1 脚在左下（BL）。板上它转了 270°（KiCad 里显示 −90°），两排脚变成左右两排，1 脚到了左上。'
  };
  const svg = $('r');
  let ref = 'U2', cur = 0, target = 0, raf = 0;
  $('r-parts').innerHTML = PARTS.map(r => `<button class="btn" data-ref="${r}" aria-pressed="false">${r} <small class="p2-mu">${esc(QB.fp(r).pkg)}</small></button>`).join('');
  const angs = [0, 90, 180, 270];
  const norm = a => ((a % 360) + 360) % 360;
  function geom() {
    const f = QB.fp(ref), L = loc(f);
    const pads = L.pads.filter(p => p.t !== 'npth');
    const R = Math.max(...pads.map(p => { const b = padBox(p); return Math.max(Math.hypot(b[0], b[1]), Math.hypot(b[2], b[1]), Math.hypot(b[0], b[3]), Math.hypot(b[2], b[3])); }), ...(SILK[f.fp] || []).filter(i => i[0] === 'l').map(i => Math.max(Math.hypot(i[1], i[2]), Math.hypot(i[3], i[4]))));
    return { f, L, pads, k: 3.7 / R };
  }
  let G = geom();
  function render(a) {
    const { f, L, pads, k } = G, th = a * Math.PI / 180;
    const P = (x, y) => [r3(k * (x * Math.cos(th) + y * Math.sin(th))), r3(k * (-x * Math.sin(th) + y * Math.cos(th)))];   // 逆时针转 a 度（屏幕上，y 向下）
    const body = `<g transform="rotate(${r3(-a)}) scale(${r3(k)})">` +
      (L.crt.length ? `<polygon points="${L.crt.map(q => q.join(',')).join(' ')}" class="crt" style="stroke-width:${r3(0.04 / k)}"/>` : '') +
      `<g class="silk">${silkSVG(f.fp)}</g>` + pads.map(p => padSVG(p, p.n === '1' ? ' class="cu one"' : ' class="cu"')).join('') + '</g>';
    // 每个焊盘号只写一次，写在同号里最大的那块上（U2 的 17 号有 1 块散热焊盘 + 4 个小孔）
    const big = new Map();
    pads.forEach(p => { const b = big.get(p.n); if (!b || p.w * p.h > b.w * b.h) big.set(p.n, p); });
    const nums = [...big.values()].map(p => {
      const [x, y] = P(p.x, p.y), fs = r3(Math.min(0.42, Math.max(0.26, k * Math.min(p.w, p.h) * 0.85)));
      return `<text x="${x}" y="${y}" class="pn${p.n === '1' ? ' one' : ''}" style="font-size:${fs}px;stroke-width:${r3(fs * 0.2)}px">${esc(p.n)}</text>`;
    }).join('');
    // 方向箭头：逆时针转过的角度
    const arc = a > 0.5 ? (() => { const rr = 4.15, e = a * Math.PI / 180; return `<path d="M${rr} 0A${rr} ${rr} 0 ${a > 180 ? 1 : 0} 0 ${r3(rr * Math.cos(e))} ${r3(-rr * Math.sin(e))}" class="arc"/>`; })() : '';
    svg.innerHTML = `<rect x="-4.6" y="-4.6" width="9.2" height="9.2" class="bg"/><line x1="-4.4" y1="0" x2="4.4" y2="0" class="ax"/><line x1="0" y1="-4.4" x2="0" y2="4.4" class="ax"/>${arc}${body}${nums}` +
      `<text x="-4.4" y="-4.05" class="lab">${Math.round(a)}°</text><text x="4.4" y="4.35" class="lab sm">逆时针为正</text>`;
  }
  function anim() {
    cancelAnimationFrame(raf);
    if (RMx) { cur = target; render(cur); return; }
    const a0 = cur, d = target - a0, t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(d) * 3);
    const step = now => {
      const q = Math.min(1, (now - t0) / dur), e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      cur = a0 + d * e; render(cur);
      if (q < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function card() {
    const f = G.f, real = norm(f.rot), nn = nameNums(f.fp), now = norm(Math.round(target));
    $('r-t').textContent = `${f.ref} · ${f.value}`;
    $('r-p').textContent = TXT[ref];
    const p1 = loc(f).pads.find(p => p.n === '1');
    const where = (x, y) => Math.abs(x) < 0.05 ? (y > 0 ? '正下方' : '正上方') : Math.abs(y) < 0.05 ? (x < 0 ? '左边' : '右边') : (x < 0 ? '左' : '右') + (y > 0 ? '下' : '上');
    const th = now * Math.PI / 180, rx = p1.x * Math.cos(th) + p1.y * Math.sin(th), ry = -p1.x * Math.sin(th) + p1.y * Math.cos(th);
    $('r-s').innerHTML = [
      ['现在转了', `${now}°${now === real ? ' <b class="p2-ok">= QB12 实际</b>' : ''}`],
      ['1 号焊盘在', where(rx, ry)],
      ['库里的 0°', nn.pin1 ? `1 脚在${PIN1_ZH[nn.pin1]}（名字里的 ${nn.pin1}）` : `1 号焊盘在${where(p1.x, p1.y)}`],
      ['QB12 板上', `${real}°${f.rot < 0 ? `（KiCad 里显示 ${f.rot}°）` : ''}`],
      ['坐标文件 Rotation', cpl[f.ref] ? cpl[f.ref][4] : '—']
    ].map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
    C.pressOne('#p2-r-angs [data-a]', 'a', now);
  }
  $('r-angs').innerHTML = angs.map(a => `<button class="btn" data-a="${a}" aria-pressed="false">${a}°</button>`).join('') + '<button class="btn primary" data-real="1">QB12 实际</button>';
  function go(r, keep) {
    ref = r; G = geom();
    C.pressOne('#p2-r-parts [data-ref]', 'ref', r);
    if (!keep) { cur = 0; target = 0; render(0); }
    card();
  }
  $('r-parts').addEventListener('click', e => { const b = e.target.closest('[data-ref]'); if (b) go(b.dataset.ref); });
  $('r-angs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    let a = b.dataset.real ? norm(G.f.rot) : +b.dataset.a;
    // 按最短方向转（只在 0…360 里走，读数好懂）
    target = a; anim(); card();
  });
  go(ref);
})();

/* ================= 2.6 立创编号 ================= */
const groups = (function () {
  const m = new Map();
  D.footprints.forEach(f => { const g = m.get(f.lcsc) || { lcsc: f.lcsc, lib: f.lib, value: f.value, fp: f.fp, pkg: f.pkg, refs: [] }; g.refs.push(f.ref); m.set(f.lcsc, g); });
  return [...m.values()];
})();
const LB = BoardViewer.create($('lc-bv'), { toolbar: 'mini', panel: true, hover: true, layers: ['F.Cu', 'B.Cu', 'F.SilkS', 'Edge.Cuts', 'Labels'], tracks: false, label: 'QB12 板子：标出选中的元件' });
(function () {
  const ext = groups.filter(g => g.lib === '扩展'), bas = groups.filter(g => g.lib !== '扩展');
  const sum = l => l.reduce((a, g) => a + g.refs.length, 0);
  const r06 = byFp.get('R0603') || [];
  const vals = new Set(r06.map(f => f.value));
  $('lc-ro').innerHTML = [['元件', `${S.footprints} 个`], ['立创编号', `${groups.length} 种`, `BOM ${D.fab.bom.length} 行`],
    ['基础库', `${bas.length} 种 · ${sum(bas)} 个`], ['扩展库', `${ext.length} 种 · ${sum(ext)} 个`, '每种另收换料费'],
    ['R0603 一个封装', `${r06.length} 个电阻`, `${vals.size} 种阻值`]]
    .map(([a, b, c]) => `<div class="ro"><small>${a}</small><b>${b}</b>${c ? `<small>${c}</small>` : ''}</div>`).join('');
  const bom = D.fab.bom;   // [Comment, Designator, Footprint, Quantity, LCSC]
  const libOf = l => (groups.find(g => g.lcsc === l) || {}).lib;
  $('lc-tbl').querySelector('tbody').innerHTML = bom.map((r, i) => `<tr data-row="${i}" data-lib="${esc(libOf(r[4]))}" tabindex="0"><td class="mono">${esc(r[4])}</td><td>${esc(r[0])}</td><td>${esc(r[2])}</td><td>${esc(r[1]).replace(/,/g, ', ')}</td><td><span class="p2-lib ${libOf(r[4]) === '扩展' ? 'ext' : ''}">${esc(libOf(r[4]))}</span></td></tr>`).join('');
  const F = [['all', '全部'], ['基础', '只看基础库'], ['扩展', '只看扩展库']];
  $('lc-filt').innerHTML = F.map(([k, t]) => `<button class="btn" data-f="${k}" aria-pressed="${k === 'all'}">${t}</button>`).join('');
  const tb = $('lc-tbl').querySelector('tbody');
  $('lc-filt').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const k = b.dataset.f;
    C.pressOne('#p2-lc-filt [data-f]', 'f', k);
    tb.querySelectorAll('tr').forEach(tr => { tr.hidden = k !== 'all' && tr.dataset.lib !== k; tr.classList.remove('on'); });
    LB.clear();
    if (k !== 'all') LB.highlightParts(D.footprints.filter(f => f.lib === k).map(f => f.ref));
  });
  const pick = tr => {
    tb.querySelectorAll('tr').forEach(x => x.classList.toggle('on', x === tr));
    const refs = bom[+tr.dataset.row][1].split(',');
    if (refs.length === 1) LB.select(refs[0]); else LB.highlightParts(refs);
  };
  tb.addEventListener('click', e => { const tr = e.target.closest('tr[data-row]'); if (tr) pick(tr); });
  tb.addEventListener('keydown', e => { const tr = e.target.closest('tr[data-row]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(tr); } });
})();

/* 两个编号字段：交付时（库里带来的 LCSC Part） vs 修复后（和 LCSC 一样，board.json 的 lcsc_part_field） */
// 10-13 交付时 U3 还是 ME6211（C82942），10-23 才换成 AP2112K（C51118）；这里按交付时的料号算，保持「22 个不一致」这个历史数字
const SNAP13 = { U3: 'C82942' };
const fld13 = f => SNAP13[f.ref] || f.lcsc_field;
const STALE = D.footprints.filter(f => LIB_PART[f.fp] && LIB_PART[f.fp] !== fld13(f)).map(f => f.ref);
(function () {
  let when = 'old';
  const all = D.footprints.slice().sort((a, b) => natural(a.ref, b.ref));
  $('st-when').innerHTML = '<button class="btn" data-w="old" aria-pressed="true">2026-10-13 交付时</button><button class="btn" data-w="new" aria-pressed="false">2026-10-19 修复后</button>';
  function draw() {
    C.pressOne('#p2-st-when [data-w]', 'w', when);
    const part = f => (when === 'old' ? LIB_PART[f.fp] : f.lcsc_part_field);
    const fld = f => (when === 'old' ? fld13(f) : f.lcsc_field);
    const bad = all.filter(f => part(f) !== fld(f));
    $('st-chips').innerHTML = all.map(f => {
      const p = part(f), ok = p === fld(f);
      return `<span class="p2-chip ${ok ? 'ok' : 'bad'}" title="${esc(f.ref)} ${esc(f.value)}：LCSC ${esc(fld(f))}，LCSC Part ${esc(p)}"><b>${esc(f.ref)}</b>${ok ? '' : `<small>${esc(p)}</small>`}</span>`;
    }).join('');
    const S3 = $('st-status');
    if (!bad.length) { S3.className = 'status good'; S3.innerHTML = `${all.length} 个元件，两个字段全部一致（修复后的板文件里 LCSC Part = LCSC）。`; }
    else {
      const byF = fp => bad.filter(f => f.fp === fp);
      const luck = all.filter(f => LIB_PART[f.fp] && (f.fp === 'C0603' || f.fp === 'R0603') && LIB_PART[f.fp] === fld(f)).map(f => f.ref);
      const vOf = l => (groups.find(g => g.lcsc === l) || {}).value;
      S3.className = 'status bad';
      S3.innerHTML = `<b>${bad.length} / ${all.length}</b> 个不一致：${byF('C0603').length} 个 0603 电容的 LCSC Part 都是 ${LIB_PART.C0603}（${esc(vOf(LIB_PART.C0603))}），${byF('R0603').length} 个 0603 电阻都是 ${LIB_PART.R0603}（${esc(vOf(LIB_PART.R0603))}）。碰巧对的只有本来就是这两个值的 ${luck.join('、')}。其余封装是照各自那颗料转换的，库里带来的编号正好就是对的。`;
    }
    $('st-show').hidden = !bad.length;
  }
  $('st-when').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) { when = b.dataset.w; draw(); } });
  $('st-show').addEventListener('click', () => { LB.clear().highlightParts(STALE); $('lc-bv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' }); });
  draw();
})();

/* SW1：封装类型 = 通孔，可焊盘全是贴片；导出坐标文件的两个筛选选项会把谁筛掉
   （规则和 kicad-cli 10.0.6 在 out/QB12.kicad_pcb 上实测一致：--smd-only 少 SW1；--exclude-fp-th 少 J1、SW1、U2） */
(function () {
  const sw = QB.fp('SW1'), x = facts(sw);
  $('sw-txt').innerHTML = `<p>SW1 是电源拨动开关 ${esc(sw.value)}。它在库里的名字是 <span class="net">${esc(sw.fp)}</span>，TH 是 through hole（通孔）的意思；封装属性里的“封装类型”也是<strong>通孔</strong>。可它的 ${x.smd} 个焊盘全是贴片焊盘，另外只有 ${x.npth} 个 ${n2(sw.pads.find(p => p.t === 'npth').drill[0])} mm 的非金属化孔，给开关底下的定位柱。BOM 里写的倒是 <span class="net">${esc(sw.pkg)}</span>。</p>` +
    `<p>这种属性写错，平时看不出来，导出坐标文件时会出事：导出对话框里有两个筛选选项，按的就是“封装类型”和“有没有通孔焊盘”。QB12 的导出脚本两个都没勾，${D.fab.cpl.length} 个元件都在坐标文件里（第 7 课）。右边是在真板文件上试出来的结果。</p>`;
  const OPTS = [['none', '都不勾（QB12）', () => false], ['smd', '仅包含贴片封装', f => !!f.tht], ['th', '排除具有通孔焊盘的所有封装', f => f.pads.some(p => p.t !== 'smd')]];
  $('sw-opts').innerHTML = OPTS.map(([k, t]) => `<button class="btn" data-o="${k}" aria-pressed="${k === 'none'}">${t}</button>`).join('');
  const all = D.footprints.slice().sort((a, b) => natural(a.ref, b.ref));
  const WHY = { SW1: '封装类型是通孔，还有 2 个非金属化孔', J1: '外壳插脚是金属化孔', U2: '散热焊盘里有 4 个金属化小孔' };
  function draw(k) {
    const o = OPTS.find(q => q[0] === k);
    C.pressOne('#p2-sw-opts [data-o]', 'o', k);
    const out = all.filter(o[2]);
    $('sw-chips').innerHTML = all.map(f => `<span class="p2-chip ${out.includes(f) ? 'bad gone' : 'ok'}"><b>${esc(f.ref)}</b></span>`).join('');
    const st = $('sw-status');
    if (!out.length) { st.className = 'status good'; st.innerHTML = `坐标文件 ${all.length} 行，一个不少。`; }
    else { st.className = 'status bad'; st.innerHTML = `坐标文件只剩 ${all.length - out.length} 行，少了 ${out.map(f => `<b>${f.ref}</b>（${WHY[f.ref] || ''}）`).join('、')}。坐标文件里没有它，贴片机就不知道它贴在哪、转多少度。`; }
  }
  $('sw-opts').addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (b) draw(b.dataset.o); });
  draw('none');
})();

/* ================= 2.7 KiCad 里的四个窗口 ================= */
(function () {
  const lt = drcN('lib_footprint_issues');
  const TABS = [
    ['封装编辑器', `打开：在 PCB 里选中元件，按 <kbd>Ctrl</kbd>+<kbd>E</kbd>（在封装编辑器中打开）；或者 <span class="menu">工具 → 封装编辑器</span>，再从左边的库列表里挑。<br>画一个新封装：<span class="menu">文件 → 新建封装</span>，用 <span class="menu">放置 → 添加焊盘</span> 一个个放焊盘，照数据手册的推荐焊盘图填尺寸和坐标；再画丝印外形、1 脚标记和 F.Courtyard 占位框。画完用 <span class="menu">检查 → 封装检查器</span> 查一遍。<br>QB12 没有自己画：17 种都是 easyeda2kicad 按立创编号转换的，放在工程文件夹的 QB12.pretty 里。`],
    ['封装属性', `在 PCB 里选中元件按 <kbd>E</kbd>（属性...）。能改：位号、数值；字段表里可以加一个立创编号字段（QB12 用的名字是 LCSC）；“制造特性”一栏里的“封装类型”选 贴片 / 通孔 / 未指定（想想 SW1）；“从坐标文件中移除”“从物料清单中移除”决定它进不进坐标文件和 BOM。<br>立创编号最好只在一处填：原理图符号的字段（更新 PCB 时会带到封装上），或者用 kicad-jlcpcb-tools 这类插件统一分配 [S35]。别在 PCB 里再手改一份。`],
    ['焊盘属性', `在封装编辑器里双击一个焊盘（或选中按 <kbd>E</kbd>）。“焊盘类型”有 通孔 / 贴片 / 板边连接器 / 非电镀孔 (NPTH), 机械等；下面是焊盘编号、网络、位置、形状、尺寸；右边“技术层”决定开不开钢网（F.Paste）、阻焊窗（F.Mask），脚本去掉 U2 那 4 个孔焊盘自己的钢网层，改的就是这里。<br>“间距重写”一页：“阻焊扩展”QB12 全板是 ${n2(D.rules.solder_mask_expansion)}，开窗就和焊盘一样大；U2、U4 散热焊盘的“锡膏相对间距”是 ${Math.round(QB.fp('U2').pads.find(p => p.pasteRatio).pasteRatio * 100)}%，钢网开口就缩到 70% × 70%。`],
    ['管理封装库', `<span class="menu">设置 → 管理封装库...</span>，打开的对话框叫“封装库”。“全局库”是 KiCad 自带、所有工程都能用的；“工程专用库”跟着工程走。QB12 只有一个工程库：名称 QB12，路径 \${KIPRJMOD}/QB12.pretty（\${KIPRJMOD} 就是工程所在的文件夹），所以整个文件夹拷给别人也能打开。<br>第 6 课的 DRC 报告里有 ${lt} 条“封装库没在库表里登记”的警告，每个封装一条：跑那次 DRC 的文件夹里没放库表文件（fp-lib-table）。交付的 KiCad 工程里它是齐的，再跑 DRC 这 ${lt} 条就没了，只剩 2.2 说的 3 条“封装与来源库中的封装存在不一致”。<br>板上每个元件都带着一份自己的封装副本，库里还有一份原件。想看两份是不是一样：<span class="menu">检查 → 将封装与库比较</span>；想用库里的覆盖板上的：<span class="menu">工具 → 从库中更新封装...</span>（QB12 的 SW1、J1、U2 是脚本有意改过的，别覆盖）。`]
  ];
  $('k-tabs').innerHTML = TABS.map(([t], i) => `<button class="btn" role="tab" data-k="${i}" aria-selected="${i === 0}" aria-pressed="${i === 0}">${t}</button>`).join('');
  function go(i) {
    C.pressOne('#p2-k-tabs [data-k]', 'k', i);
    document.querySelectorAll('#p2-k-tabs [data-k]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.k === i)));
    document.querySelectorAll('#p2 .p2-kfigs [data-k]').forEach(f => { f.hidden = +f.dataset.k !== i; });
    $('k-how').innerHTML = TABS[i][1];
  }
  $('k-tabs').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) go(+b.dataset.k); });
  go(0);
})();

/* ================= 2.8 自测 ================= */
(function () {
  const d1 = QB.fp('D1'), u2 = QB.fp('U2'), ep = u2.pads.find(p => p.pasteRatio), side = 1 + 2 * ep.pasteRatio;
  const k1 = d1.pads.find(p => p.n === '1');
  $('q1').innerHTML = `网络是按编号写到焊盘上的。不对调的话，1 号焊盘（阴极，丝印竖杠那头）会接到 ${netTag('VBUS')}，2 号焊盘（阳极）接到 ${netTag('VSYS')}：二极管反过来了，USB 的 5V 被它挡住进不了 ${netTag('VSYS')}，USB 供电这条路就断了。现在板上 1 号焊盘接的是 ${netTag(netName(k1))}，是对的。符号和封装的号码，要照数据手册逐个对。`;
  $('q2').innerHTML = `怕芯片浮起来：大焊盘上锡膏太多，熔化后把芯片垫高，两边 ${n2(u2.pads[0].w)} mm 宽的细脚反而够不着焊盘。脚本给 U2、U4 的散热焊盘设了 ${Math.round(ep.pasteRatio * 100)}% 的锡膏相对间距：每边缩 ${Math.round(-ep.pasteRatio * 100)}%，开口变成 ${Math.round(side * 100)}% × ${Math.round(side * 100)}%，面积约 ${Math.round(side * side * 100)}%（U2：${n2(ep.w)} → ${f2(ep.w * side)} mm 见方）。散热焊盘里那 4 个小孔没有单独的钢网开口，但都在缩小后的开口范围里，挡不住锡流进孔。`;
  $('q3').innerHTML = `交给嘉立创的 BOM 是 <span class="net">make_bom.py</span> 直接从 <span class="net">netlist.py</span> 生成的，从来没读封装上的字段。错的是库里带来的 LCSC Part：0603 电容都背着 ${LIB_PART.C0603}，0603 电阻都背着 ${LIB_PART.R0603}，${STALE.length} 个对不上。2026-10-19 已经改成和 LCSC 一样。避免的办法：编号只在一个地方写（QB12 是 netlist.py，你自己做就是原理图符号的字段），BOM 和板上的字段都从它生成；下单前再拿 BOM 和板子对一遍。`;
  document.querySelectorAll('#p2 [data-p2q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p2q;
    if (q === '1') { galGo(d1.fp, 'D1'); $('gal-bv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' }); }
    else if (q === '2') { anRef = 'U2'; anStep = 2; anShow(); $('an-bv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' }); }
    else { LB.clear().highlightParts(STALE); $('lc-bv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' }); }
  }));
})();
