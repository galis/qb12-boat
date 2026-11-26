/* 第 6 课：检查——DRC 与 3D。
   QB12 的数字都从 QB.board 现算。board.json 里没有的几样（用 pcbnew + shapely 在真板文件上量的距离、
   3D 模型里读出的高度、在交付工程包上重跑的 DRC、工程文件里的违规严重级别）放在 MEAS / SEV 里，
   每一个的出处和量法写在 lessons/p6_notes.md。 */
const D = QB.board, R = D.rules, DRC = D.drc;
const $ = id => document.getElementById('p6-' + id);
const RMx = C.RM;
const n2 = v => String(+(+v).toFixed(2));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cls = name => D.classes.find(c => c.name === name);
const DEF = cls('Default');
const byType = Object.fromEntries(DRC.by_type.map(t => [t.type, t]));
const nType = t => (byType[t] ? byType[t].n : 0);
const net = n => `<span class="net ${QB.netCls(n) === 's' ? 's' : QB.netCls(n) === 'p' ? 'p' : ''}">${esc(n)}</span>`;
const scrollTo = el => el.scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });

/* ---- 在真板文件上另外量的（见 p6_notes.md “MEAS”一节） ---- */
const MEAS = {
  cuMin: { d: 0.15, at: [28.58, 31.85], a: 'J1 的 VBUS 焊盘（B4A9）', b: '顶层 GND 铺铜' },   // 全板不同网络的铜之间最近的一处
  padPad: { d: 0.2, a: 'B4A9（VBUS）', b: 'B5（CC2）' },                                       // J1 里最近的两个焊盘
  edgeZone: 0.3,                                                                               // 铺铜离板边（铺铜按规则退让）
  edgePad: { d: 0.32, ref: 'J2', at: [2.25, 36.0] },                                           // 离板边最近的焊盘（J2 的固定焊盘）
  refText: { h: 0.8, w: 0.15 },                                                                // 51 个位号的字高 / 笔画粗
  dot: 0.06,                                                                                   // 封装里自带的小圆点的线宽
  // 3D 模型（工程包 QB12.3dshapes/*.wrl）读出的高度，mm，从板子上表面算
  H: { 5.61: 'J2 J3 J4', 3.25: 'J1', 3.11: 'U1', 2.1: 'D1', 1.7: 'U4', 1.65: 'U5', 1.55: 'SW2 SW3', 1.5: 'SW1', 1.3: 'C9 C10 C14 C15', 1.25: 'U3', 1.05: 'U2 Q1 Q2', 0.81: 'LED2 LED3', 0.71: 'LED1', 0.56: 'R15 R16' },
  Hc: 0.8, Hr: 0.45,                                                                           // 其余 0603 电容 / 电阻
  // 3D 模型在板上的外包框（板子坐标 mm）
  ext: { J1: [22.03, 30.75, 30.97, 38.65], SW1: [-0.95, 19.7, 4.25, 27.5], U1: [35, 0.4, 53, 25.9], J2: [0.73, 28.7, 9.23, 36.6],
    J3: [0.73, 1.65, 9.23, 9.55], J4: [0.73, 10.65, 9.23, 18.55], SW2: [35.45, 32.4, 41.95, 37.6], SW3: [42.65, 32.4, 49.15, 37.6], D1: [24.05, 15.7, 28.75, 18.3] },
  // “被板边截断的丝印”四条：报告里第一个坐标是板框线的起点，这里换成伸出板边的那段丝印的位置（QB12_drc.json 第二个坐标）
  edgeSilk: [[-1.13, 25.03, 'SW1'], [0.47, 23.75, 'SW1'], [22.03, 38.69, 'J1'], [30.97, 38.69, 'J1']],
  // 在交付的工程包（../../hardware/pcb/pkg/QB12_KiCad，带 fp-lib-table）上用同样的命令重跑的 DRC
  pkg: { date: '2026-10-20', errors: 0, unconnected: 0,
    by: [['silk_overlap', 86], ['silk_over_copper', 2], ['silk_edge_clearance', 4], ['lib_footprint_mismatch', 3]],
    mismatch: [['SW1', '两个定位柱孔在板上改成了非金属化孔（库里是金属化孔）'],
      ['J1', '两个定位柱孔同样改成非金属化孔；每个焊盘加了 0.1 mm 的局部间距'],
      ['U2', '散热焊盘里的 4 个孔编成了 17 号（接地），库里没编号；散热焊盘的锡膏开口缩小了']] }
};
/* QB12.kicad_pro 里的违规严重级别（rule_severities），本课用到的几类 */
const SEV = { clearance: 'error', shorting_items: 'error', track_width: 'error', annular_width: 'error', hole_near_hole: 'error',
  copper_edge_clearance: 'error', unconnected_items: 'error', track_dangling: 'warning', courtyards_overlap: 'error',
  silk_overlap: 'warning', silk_over_copper: 'warning', silk_edge_clearance: 'warning', lib_footprint_issues: 'warning', lib_footprint_mismatch: 'warning' };
const HT = ref => { for (const h in MEAS.H) if (MEAS.H[h].split(' ').includes(ref)) return +h; return ref[0] === 'C' ? MEAS.Hc : ref[0] === 'R' ? MEAS.Hr : 0; };
const IGNORED0 = 7;   // KiCad 10.0.6 报告里“忽略的测试”：missing_courtyard、track_not_centered_on_via、tuning_profile_track_geometries、footprint_filters_mismatch、pth/npth_inside_courtyard、footprint_type_mismatch
const ZH = { error: '错误', warning: '警告', ignore: '忽略' };
const KNAME = { silk_overlap: '丝印间距', silk_over_copper: '被阻焊层截断的丝印', lib_footprint_issues: '在库中找不到封装',
  silk_edge_clearance: '被板边截断的丝印', lib_footprint_mismatch: '封装与来源库中的封装存在不一致' };

/* ================= 几何：在 board.json 上现量 ================= */
function ptSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx, qy = ay + t * dy;
  return [Math.hypot(px - qx, py - qy), qx, qy];
}
function segSeg(a, b) {   // 两段不相交线段的最近距离 [d, 点 1, 点 2]
  let best = null;
  const tryP = (px, py, s) => { const r = ptSeg(px, py, s[0], s[1], s[2], s[3]); if (!best || r[0] < best[0]) best = [r[0], [px, py], [r[1], r[2]]]; };
  tryP(a[0], a[1], b); tryP(a[2], a[3], b); tryP(b[0], b[1], a); tryP(b[2], b[3], a);
  return best;
}
const TR = D.tracks;
const minW = Math.min(...TR.map(t => t[2]));
const nMinW = TR.filter(t => t[2] === minW).length;
const minViaD = Math.min(...D.vias.map(v => v.d));
const nMinViaD = D.vias.filter(v => v.d === minViaD).length;
const minRing = Math.min(...D.vias.map(v => (v.d - v.drill) / 2));
/* 走线 ↔ 走线 / 过孔：不同网络、同一层，最近的一处 */
const GAP = (function () {
  let best = { d: 1e9 };
  const bb = TR.map(t => [Math.min(t[3], t[5]), Math.min(t[4], t[6]), Math.max(t[3], t[5]), Math.max(t[4], t[6])]);
  for (let i = 0; i < TR.length; i++) for (let j = i + 1; j < TR.length; j++) {
    const a = TR[i], b = TR[j];
    if (a[1] !== b[1] || a[0] === b[0]) continue;
    const A = bb[i], B = bb[j];
    if (A[0] > B[2] + 1.5 || B[0] > A[2] + 1.5 || A[1] > B[3] + 1.5 || B[1] > A[3] + 1.5) continue;
    const [d, p, q] = segSeg(a.slice(3, 7), b.slice(3, 7));
    const g = d - a[2] / 2 - b[2] / 2;
    if (g < best.d - 1e-6) best = { d: g, a: D.nets[a[0]].name, b: D.nets[b[0]].name, layer: a[1] ? 'B.Cu' : 'F.Cu', at: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] };
  }
  D.vias.forEach(v => TR.forEach(t => {
    if (t[0] === v.net) return;
    const [d, qx, qy] = ptSeg(v.x, v.y, t[3], t[4], t[5], t[6]);
    const g = d - v.d / 2 - t[2] / 2;
    if (g < best.d - 1e-6) best = { d: g, a: D.nets[t[0]].name, b: D.nets[v.net].name + ' 的过孔', layer: t[1] ? 'B.Cu' : 'F.Cu', at: [(v.x + qx) / 2, (v.y + qy) / 2] };
  }));
  return best;
})();
/* 走线 / 过孔 ↔ 板框 */
const OL = D.board.outline;
const EDGES = OL.map((p, i) => [p[0], p[1], OL[(i + 1) % OL.length][0], OL[(i + 1) % OL.length][1]]);
const EDGE_T = (function () {
  let best = { d: 1e9 };
  TR.forEach(t => EDGES.forEach(e => {
    const [d, p, q] = segSeg(t.slice(3, 7), e); const g = d - t[2] / 2;
    if (g < best.d) best = { d: g, net: D.nets[t[0]].name, at: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] };
  }));
  D.vias.forEach(v => EDGES.forEach(e => {
    const [d] = ptSeg(v.x, v.y, e[0], e[1], e[2], e[3]); const g = d - v.d / 2;
    if (g < best.vd || best.vd == null) best.vd = g;
  }));
  return best;
})();
/* 钻孔：过孔 + 焊盘孔（长圆孔按线段 + 半径算） */
const HOLES = [];
D.vias.forEach(v => HOLES.push({ s: [v.x, v.y, v.x, v.y], r: v.drill / 2, what: `${D.nets[v.net].name} 过孔`, via: true }));
D.footprints.forEach(f => f.pads.forEach(p => {
  if (!p.drill) return;
  const [w, h] = p.drill;
  const what = p.t === 'npth' ? `${f.ref} 的定位孔` : `${f.ref} 的${p.n ? ' ' + p.n + ' 号' : ''}焊盘孔`;
  if (Math.abs(w - h) < 1e-6) { HOLES.push({ s: [p.x, p.y, p.x, p.y], r: w / 2, what, ref: f.ref, n: p.n, t: p.t }); return; }
  const ln = Math.abs(w - h), ang = -((w > h ? p.a : p.a + 90) || 0) * Math.PI / 180;
  const ca = Math.cos(ang) * ln / 2, sa = Math.sin(ang) * ln / 2;
  HOLES.push({ s: [p.x - ca, p.y - sa, p.x + ca, p.y + sa], r: Math.min(w, h) / 2, what, ref: f.ref, n: p.n, t: p.t });
}));
const minDrill = Math.min(...HOLES.map(h => h.r * 2));
const H2H = (function () {
  let best = { d: 1e9 }, shell = 1e9;
  for (let i = 0; i < HOLES.length; i++) for (let j = i + 1; j < HOLES.length; j++) {
    const A = HOLES[i], B = HOLES[j];
    if (Math.abs(A.s[0] - B.s[0]) > 3 && Math.abs(A.s[2] - B.s[2]) > 3) continue;
    const [d, p, q] = segSeg(A.s, B.s);
    const g = d - A.r - B.r;
    if (g < best.d) best = { d: g, a: A.what, b: B.what, at: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] };
    if (A.ref === 'J1' && B.ref === 'J1' && A.t === 'pth' && B.t === 'pth') shell = Math.min(shell, g);
  }
  best.shell = shell;
  return best;
})();
const ant = D.zones.find(z => z.rule && z.id === 'antenna');
const antDepth = ant ? n2(Math.min(ant.bbox[3], D.board.h)) : '—';
const backTexts = D.texts.filter(t => !/^JLC/.test(t.text));
const back1mm = backTexts.filter(t => t.h >= 1 - 1e-6).length;

/* 只在第一次进入视野后才真正画查查看器 */
function lazyRunner(el) {
  let seen = false, pend = null;
  C.onVisible(el, () => { seen = true; if (pend) { const f = pend; pend = null; f(); } }, '400px');
  return fn => { if (seen) fn(); else pend = fn; };
}

/* ================= 6.1 规则 vs 工厂 ================= */
const MB = BoardViewer.create($('mg-bv'), { toolbar: false, panel: false, hover: true, layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts'], label: '板上规则最紧的地方' });
const mgRun = lazyRunner($('mg-bv'));
const ring = (B, x, y, r) => B.annotate((g, mk) => { mk.el('circle', { cx: x, cy: y, r: r || 0.7, class: 'p6-ring' }); mk.el('circle', { cx: x, cy: y, r: 0.08, class: 'p6-dot' }); });
function mgView(o) {
  mgRun(() => {
    MB.clear().clearAnnotations();
    MB.show({ mode: 'layers', side: 'top', layers: o.layers || ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts'], tracks: o.tracks !== false });
    if (o.hl) o.hl(MB);
    if (o.at) ring(MB, o.at[0], o.at[1], o.r);
    if (o.box) MB.focus(o.box, { pad: 0.4 }); else MB.reset();
    MB.badge(o.badge || '');
  });
}
const AX = 3.2;   // 横轴最大：工厂极限的 3.2 倍
const ROWS = [
  { k: 'track', name: '最小线宽', rule: R.min_track_width, cname: '最小走线宽度', fac: 0.10, facT: 'JLC / 嘉立创：1 oz 双层板 0.10 mm', kd: 0.2, kdT: '默认网络类线宽 0.2 mm',
    act: minW, actT: `${n2(minW)} mm，共 ${nMinW} 段（普通信号线）`,
    text: `QB12 最细的线就是 Default 网络类的 ${n2(DEF.track)} mm，是工厂极限的 ${n2(minW / 0.1)} 倍。0.10 mm 的线工厂做得出，但 ±20% 的公差落到这么细的线上，只剩 0.08 mm。`,
    btns: [['标出所有最细的线', () => mgView({ hl: B => B.highlightWidth(minW), badge: `${n2(minW)} mm 的线 ${nMinW} 段` })]] },
  { k: 'clr', name: '最小间距', rule: R.min_clearance, cname: '最小间距', fac: 0.10, facT: 'JLC / 嘉立创：1 oz 双层板 0.10 mm', kd: 0.2, kdT: '默认网络类间距 0.2 mm',
    act: MEAS.cuMin.d, actT: `${n2(MEAS.cuMin.d)} mm：${MEAS.cuMin.a} ↔ ${MEAS.cuMin.b}`,
    text: `约束页写的是底线 ${n2(R.min_clearance)} mm；走线实际按网络类间距 ${n2(DEF.clearance)} mm 走（自动布线器就按它），最近的两根线隔 ${n2(GAP.d)} mm（${GAP.a} 和 ${GAP.b}，${GAP.layer}）。全板最近的一处在 USB-C 里：J1 的焊盘脚距只有 0.5 mm，铺铜挨着焊盘只留了 ${n2(MEAS.cuMin.d)} mm，正好踩在底线上。`,
    btns: [['看 J1 那一处', () => mgView({ layers: ['F.Cu', 'Zones', 'Edge.Cuts'], tracks: true, at: MEAS.cuMin.at, r: 0.45, box: [MEAS.cuMin.at[0] - 2.6, MEAS.cuMin.at[1] - 1.8, MEAS.cuMin.at[0] + 2.6, MEAS.cuMin.at[1] + 1.8], badge: `J1 焊盘 ↔ 铺铜 ${n2(MEAS.cuMin.d)} mm` })],
      ['看最近的两根线', () => mgView({ layers: [GAP.layer, 'Vias', 'Edge.Cuts'], hl: B => B.highlightNet([GAP.a, GAP.b.replace(' 的过孔', '')]), at: GAP.at, r: 0.45, box: [GAP.at[0] - 2.4, GAP.at[1] - 1.6, GAP.at[0] + 2.4, GAP.at[1] + 1.6], badge: `${GAP.a} ↔ ${GAP.b}：${n2(GAP.d)} mm` })]] },
  { k: 'via', name: '过孔外径', rule: R.min_via_diameter, cname: '最小过孔外径', fac: 0.25, facT: 'JLC / 嘉立创：双层板过孔外径 0.25 mm（孔 0.15 mm）', kd: 0.6, kdT: '默认网络类过孔 0.6 / 0.3 mm',
    act: minViaD, actT: `${n2(minViaD)} mm，${nMinViaD} 个（其余更大）`,
    text: `QB12 的过孔全是 ${D.stats.via_sizes.map(([d, h, n]) => `${n2(d)} / ${n2(h)} mm ${n} 个`).join('、')}。JLC 对孔太小、外径太小的过孔要加价，这两种都不在加价范围里。`,
    btns: [['标出这些过孔', () => mgView({ layers: ['F.Cu', 'Vias', 'Edge.Cuts'], tracks: false, hl: B => B.highlightVias(v => v.d === minViaD), badge: `${n2(minViaD)} mm 过孔 ${nMinViaD} 个` })]] },
  { k: 'hole', name: '最小钻孔', rule: R.min_through_hole_diameter, cname: '最小钻孔孔径', fac: 0.15, facT: '双层板钻孔 0.15 mm 起（嘉立创标“非常规”，推荐 ≥0.2 mm）', kd: 0.3, kdT: '默认最小钻孔孔径 0.3 mm',
    act: minDrill, actT: `${n2(minDrill)} mm（过孔的孔）`,
    text: `钻头越细越容易断，也越贵。QB12 最小的孔 ${n2(minDrill)} mm，是工厂极限的 ${n2(minDrill / 0.15)} 倍，也比工厂推荐的 0.2 mm 大。`,
    btns: [['看钻孔层', () => mgView({ layers: ['Drill', 'Edge.Cuts'], tracks: false, badge: `${D.stats.holes} 个孔` })]] },
  { k: 'ring', name: '过孔孔环', rule: R.min_via_annular_width, cname: '最小孔环宽度', fac: 0.05, facT: '外径要比孔大 ≥0.1 mm，即孔环 ≥0.05 mm（推荐大 0.15 mm）', kd: null, kdT: '',
    act: minRing, actT: (v => `${n2(minRing)} mm：外径 ${n2(v.d)} − 孔 ${n2(v.drill)}，再除以 2`)(D.vias.find(v => (v.d - v.drill) / 2 === minRing)),
    text: `孔环是孔外面那一圈铜。钻孔位置有 ±0.075 mm 的误差，孔环太窄，钻偏一点就破了。QB12 的几条规则是配套的：最小钻孔孔径 ${n2(R.min_through_hole_diameter)} mm + 两边孔环各 ${n2(R.min_via_annular_width)} mm = ${n2(R.min_via_diameter)} mm，正好是最小过孔外径。`,
    btns: [['放大看一个过孔', () => { const v = D.vias.find(q => q.role === 'stitch') || D.vias[0]; mgView({ layers: ['F.Cu', 'Zones', 'Vias', 'Drill'], tracks: true, at: [v.x, v.y], r: 0.55, box: [v.x - 1, v.y - 0.7, v.x + 1, v.y + 0.7], badge: `外径 ${n2(v.d)} · 孔 ${n2(v.drill)} · 孔环 ${n2((v.d - v.drill) / 2)} mm` }); }]] },
  { k: 'h2h', name: '孔到孔', rule: R.min_hole_to_hole, cname: '孔到孔的间距', fac: 0.2, facT: 'JLC / 嘉立创：过孔之间 0.2 mm；插件孔之间 0.45 mm', kd: 0.25, kdT: '默认孔到孔 0.25 mm',
    act: H2H.d, actT: `${n2(H2H.d)} mm：${H2H.a} ↔ ${H2H.b}`,
    text: `两个孔靠得太近，中间那一点板材钻的时候容易破。QB12 最近的两个孔在 U2 的散热焊盘里（脚本补的散热过孔和封装自带的孔交错排列），隔 ${n2(H2H.d)} mm。封装自带的那 4 个孔严格说算焊盘孔（JLC 要 0.45 mm），不过它们和过孔同一网络、在同一块焊盘里，实际就是一组散热孔。真正的插件孔只有 J1 外壳的 4 个固定脚，彼此最近 ${n2(H2H.shell)} mm，远大于 0.45 mm。`,
    btns: [['看 U2 的散热孔', () => mgView({ layers: ['F.Cu', 'Vias', 'Drill'], tracks: false, at: H2H.at, r: 0.3, box: [H2H.at[0] - 2.6, H2H.at[1] - 1.8, H2H.at[0] + 2.6, H2H.at[1] + 1.8], badge: `孔边到孔边 ${n2(H2H.d)} mm` })]] },
  { k: 'edge', name: '铜到板边', rule: R.min_copper_edge_clearance, cname: '铜箔到板边间距', fac: 0.2, facT: 'JLC / 嘉立创：锣边 0.2 mm（经济型贴片建议 >0.3 mm）', kd: 0.5, kdT: '默认铜到板边 0.5 mm',
    act: MEAS.edgeZone, actT: `铺铜 ${n2(MEAS.edgeZone)} mm；焊盘 ${n2(MEAS.edgePad.d)} mm（${MEAS.edgePad.ref}）；走线 ${n2(EDGE_T.d)} mm（${EDGE_T.net}）`,
    text: `板子外形是铣刀铣出来的，误差 ±0.2 mm；经济型贴片分板还有约 0.2 mm 的误差，所以 JLC 建议铜离板边 >0.3 mm。QB12 的规则正好 ${n2(R.min_copper_edge_clearance)} mm；两面铺铜沿板边一圈都退了这么多。`,
    btns: [['看铺铜沿板边退让', () => mgView({ layers: ['F.Cu', 'B.Cu', 'Zones', 'Edge.Cuts'], tracks: true, box: [-0.4, 31.5, 6.5, 38.4], badge: `铺铜离板边 ${n2(MEAS.edgeZone)} mm` })],
      ['看离板边最近的走线', () => mgView({ layers: ['F.Cu', 'Edge.Cuts'], tracks: true, hl: B => B.highlightNet(EDGE_T.net), at: EDGE_T.at, r: 0.4, box: [EDGE_T.at[0] - 2, EDGE_T.at[1] - 1.4, EDGE_T.at[0] + 2, EDGE_T.at[1] + 1.4], badge: `${EDGE_T.net} 离板边 ${n2(EDGE_T.d)} mm` })]] },
  { k: 'text', name: '丝印字高', rule: R.min_text_height, cname: '最小文本高度', fac: 1.0, facT: 'JLC：字高 ≥1.0 mm、线宽 ≥0.15 mm（嘉立创“高精字符”可到 0.8 mm / 0.1 mm）', kd: 1.0, kdT: '默认字高 1.0 mm',
    act: MEAS.refText.h, actT: `位号 ${n2(MEAS.refText.h)} mm 高、笔画 ${n2(MEAS.refText.w)} mm`, warn: true,
    text: `字高是 QB12 唯一一项明显比工厂建议松的规则（孔到孔 ${n2(R.min_hole_to_hole)} mm 只够过孔、铜到板边刚好 ${n2(R.min_copper_edge_clearance)} mm，见上面两行）：约束里最小字高设成 ${n2(R.min_text_height)} mm，所以 ${n2(MEAS.refText.h)} mm 的位号 DRC 不报。位号是脚本摆的：build_board.py 先设成 0.8 mm 高、0.12 mm 粗，finalize.py 收尾时把笔画加粗到 ${n2(MEAS.refText.w)} mm，字高没改。小字照样印，只是可能糊；位号只给人看，不影响电路。背面的说明文字 ${backTexts.length} 处里 ${back1mm} 处在 1 mm 以上。`,
    btns: [['看顶层丝印', () => mgView({ layers: ['F.SilkS', 'Edge.Cuts'], tracks: false, box: QB.region('power').bbox, badge: `位号 ${n2(MEAS.refText.h)} mm 高` })]] }
];
const pos = v => Math.min(v, AX) / AX * 100;
(function () {
  $('mg-scale').innerHTML = [0, 1, 2, 3].map(x => `<b style="left:${pos(x)}%">${x}×</b>`).join('');
  $('mg-rows').innerHTML = ROWS.map(r => {
    const rr = r.rule / r.fac, ra = r.act / r.fac;
    const lo = Math.min(1, rr), hi = Math.max(1, rr);
    return `<button class="p6-mg-row${r.warn ? ' warn' : ''}" data-k="${r.k}" aria-pressed="false">` +
      `<span class="p6-mg-lab"><b>${r.name}</b><small>规则 ${n2(r.rule)} · 工厂 ${n2(r.fac)} mm</small></span>` +
      `<span class="p6-mg-bar"><i class="p6-mg-band${rr < 1 ? ' neg' : ''}" style="left:${pos(lo)}%;width:${pos(hi) - pos(lo)}%"></i><i class="p6-mg-one" style="left:${pos(1)}%"></i>` +
      (r.kd ? `<i class="p6-mg-m kd" style="left:${pos(r.kd / r.fac)}%" title="KiCad 默认 ${n2(r.kd)} mm"></i>` : '') +
      `<i class="p6-mg-m rule" style="left:${pos(rr)}%" title="规则 ${n2(r.rule)} mm"></i><i class="p6-mg-m act" style="left:${pos(ra)}%" title="实际最紧 ${n2(r.act)} mm"></i></span>` +
      `<span class="p6-mg-x">${n2(rr)}×</span></button>`;
  }).join('');
  function sel(k) {
    const r = ROWS.find(x => x.k === k) || ROWS[0];
    C.pressOne('#p6-mg-rows [data-k]', 'k', r.k);
    $('mg-title').textContent = r.name;
    $('mg-facts').innerHTML = [['工厂', r.facT], [`QB12 规则（${r.cname}）`, `${n2(r.rule)} mm`], ['板上实际最紧', r.actT]].concat(r.kd ? [['KiCad 默认', r.kdT]] : [])
      .map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
    $('mg-text').innerHTML = r.text;
    $('mg-btns').innerHTML = r.btns.map((b, i) => `<button class="btn${i ? '' : ' primary'}" data-b="${i}">${b[0]}</button>`).join('');
    $('mg-btns').onclick = e => { const b = e.target.closest('[data-b]'); if (b) r.btns[+b.dataset.b][1](); };
    r.btns[0][1]();
  }
  $('mg-rows').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) sel(b.dataset.k); });
  $('mg-kd').addEventListener('click', e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    document.querySelector('#p6 .p6-mg').classList.toggle('kd-on', on);
  });
  sel('track');
  ROWS.sel = sel;
})();

/* ================= 6.2 DRC 在找什么（示意） ================= */
const toySvg = $('toy-svg');
const T = (x, y, s, c, a) => `<text x="${x}" y="${y}" class="${c || 'p6-t'}"${a ? ` text-anchor="${a}"` : ''}>${esc(s)}</text>`;
const arrowH = (x1, x2, y) => `<path class="p6-dim" d="M${x1} ${y}H${x2}M${x1 + 7} ${y - 5}L${x1} ${y}L${x1 + 7} ${y + 5}M${x2 - 7} ${y - 5}L${x2} ${y}L${x2 - 7} ${y + 5}"/>`;
const arrowV = (x, y1, y2) => `<path class="p6-dim" d="M${x} ${y1}V${y2}M${x - 5} ${y1 + 7}L${x} ${y1}L${x + 5} ${y1 + 7}M${x - 5} ${y2 - 7}L${x} ${y2}L${x + 5} ${y2 - 7}"/>`;
const mark = (x, y) => `<g class="p6-mark" transform="translate(${x} ${y})"><path d="M0 0L-11 -24H11Z"/><text y="-9" text-anchor="middle">!</text></g>`;
const E = (k, name, detail) => [SEV[k] || 'error', name, detail];
const TOY = [
  { k: 'clr', tab: '间距', title: '两根不同网络的线靠得太近', p: '两根线之间的空隙', min: 0, max: 0.45, step: 0.01, v: 0.3,
    rule: `规则：Default 网络类间距 ${n2(DEF.clearance)} mm（约束页底线 ${n2(R.min_clearance)} mm）`,
    why: '两根线之间要留空隙，不然蚀刻时铜可能连在一起，变成短路。布线时 KiCad 会给每根线画一圈“禁区”（虚线），别的网络的铜不许进来；DRC 事后再量一遍。往上拖下面那根线试试。',
    qb: () => `QB12：这一类 0 条。板上最近的两根不同网络的线隔了 ${n2(GAP.d)} mm（${GAP.a} 和 ${GAP.b}），正好卡在网络类的 ${n2(DEF.clearance)} mm 上：自动布线器就是按这个数走的。`,
    draw(v) {
      const s = 260, w = DEF.track * s, c = DEF.clearance * s, yA = 56, yB = yA + w + v * s;
      let g = `<rect class="p6-clrz" x="${30 - c}" y="${yA - c}" width="${460 + 2 * c}" height="${w + 2 * c}" rx="${c}"/>`;
      g += `<rect class="p6-cu" x="30" y="${yA}" width="460" height="${w}" rx="${w / 2}"/>` + T(48, yA + w / 2 + 6, 'AIN1', 'p6-tin');
      g += `<rect class="p6-cu p6-mv" x="30" y="${yB}" width="460" height="${w}" rx="${w / 2}"/>` + T(48, yB + w / 2 + 6, 'AIN2 · 拖我', 'p6-tin');
      const errs = [];
      if (v < DEF.clearance - 1e-9) {
        const top = yB, bot = Math.min(yB + w, yA + w + c);
        g += `<rect class="p6-bad" x="30" y="${top}" width="460" height="${Math.max(0, bot - top)}" rx="${w / 2}"/>`;
        if (v <= 1e-9) errs.push(E('shorting_items', '短路两个网络的项目', 'AIN1 和 AIN2 的铜碰在一起了'));
        errs.push(E('clearance', '间距违规', `网络类 Default 要求 ${n2(DEF.clearance)} mm；实际 ${n2(Math.max(0, v))} mm`));
        g += mark(300, yA + w + v * s / 2);
      }
      if (v > 0.015) g += arrowV(430, yA + w, yB);
      g += T(442, yA + w + Math.max(v * s / 2, 6) + 6, `${n2(v)} mm`, 'p6-t b');
      g += T(30, 24, `虚线：AIN1 周围 ${n2(DEF.clearance)} mm 的禁区`, 'p6-t mu');
      return { g, errs };
    },
    drag: (x, y) => (y - DEF.track * 130 - 56 - DEF.track * 260) / 260 },
  { k: 'width', tab: '线宽', title: '线画得太细', p: '线宽', min: 0.05, max: 0.4, step: 0.01, v: 0.2,
    rule: `规则：最小走线宽度 ${n2(R.min_track_width)} mm`,
    why: '线太细，电阻大、容易被蚀刻断。上下拖动改变线宽。注意：网络类里写的线宽只是“默认值”，比它细不算违规；只有比约束页的最小线宽还细，DRC 才报。',
    qb: () => `QB12：这一类 0 条。最细的线 ${n2(minW)} mm，共 ${nMinW} 段。`,
    draw(v) {
      const s = 300, yc = 150, w = v * s, wr = R.min_track_width * s, wd = DEF.track * s;
      let g = `<path class="p6-ref mu" d="M40 ${yc - wd / 2}H480M40 ${yc + wd / 2}H480"/><path class="p6-ref" d="M40 ${yc - wr / 2}H480M40 ${yc + wr / 2}H480"/>`;
      g += `<rect class="p6-cu p6-mv" x="40" y="${yc - w / 2}" width="440" height="${w}" rx="${Math.min(w / 2, 20)}"/>`;
      g += T(40, yc - wd / 2 - 14, `网络类默认 ${n2(DEF.track)} mm（只是默认值）`, 'p6-t mu');
      g += T(480, yc + wd / 2 + 26, `最小 ${n2(R.min_track_width)} mm（规则）`, 'p6-t', 'end');
      const errs = [];
      if (v < R.min_track_width - 1e-9) { errs.push(E('track_width', '走线宽度', `最小 ${n2(R.min_track_width)} mm；实际 ${n2(v)} mm`)); g += mark(260, yc - w / 2); }
      else if (v < DEF.track - 1e-9) errs.push(['info', '不算违规', `比网络类默认的 ${n2(DEF.track)} mm 细，但没低于最小线宽`]);
      g += arrowV(500, yc - Math.max(w, 16) / 2, yc + Math.max(w, 16) / 2);
      g += T(510, yc - Math.max(w, 16) / 2 - 12, `${n2(v)} mm`, 'p6-t b', 'end');
      return { g, errs };
    },
    drag: (x, y) => Math.abs(y - 150) * 2 / 300 },
  { k: 'ring', tab: '孔环', title: '过孔外面那圈铜太窄', p: '过孔外径（孔 0.3 mm 不变）', min: 0.3, max: 0.9, step: 0.01, v: 0.6,
    rule: `规则：最小孔环宽度 ${n2(R.min_via_annular_width)} mm（最小过孔外径 ${n2(R.min_via_diameter)} mm）`,
    why: '孔环是孔外面那一圈铜，线就焊在它上面。钻孔会有一点偏，孔环太窄，一偏就把铜钻破了。从中心往外拖改变外径。',
    qb: () => `QB12：这一类 0 条。所有过孔的孔环都是 ${n2(minRing)} mm。`,
    draw(v) {
      const s = 230, cx = 190, cy = 150, rd = 0.15 * s, ro = v / 2 * s, ring = (v - 0.3) / 2;
      let g = `<circle class="p6-cu p6-mv" cx="${cx}" cy="${cy}" r="${Math.max(ro, rd)}"/><circle class="p6-hole" cx="${cx}" cy="${cy}" r="${rd}"/>`;
      g += `<circle class="p6-ref" cx="${cx}" cy="${cy}" r="${rd + R.min_via_annular_width * s}"/><circle class="p6-ref mu" cx="${cx}" cy="${cy}" r="${rd + 0.05 * s}"/>`;
      if (ro - rd > 10) g += arrowH(cx + rd, cx + ro, cy);
      g += T(cx, Math.min(290, cy + Math.max(ro, rd + R.min_via_annular_width * s) + 26), `孔环 ${n2(ring)} mm`, 'p6-t b', 'middle');
      g += T(340, 52, '虚线：规则', 'p6-t') + T(340, 76, `孔环 ≥ ${n2(R.min_via_annular_width)} mm`, 'p6-t') + T(340, 120, '细虚线：工厂', 'p6-t mu') + T(340, 144, '外径比孔大 ≥ 0.1 mm', 'p6-t mu') + T(340, 214, `外径 ${n2(v)} mm`, 'p6-t b') + T(340, 238, '孔 0.3 mm', 'p6-t mu');
      const errs = [];
      if (ring < R.min_via_annular_width - 1e-9) { errs.push(E('annular_width', '孔环宽度', `最小 ${n2(R.min_via_annular_width)} mm；实际 ${n2(ring)} mm`)); g += mark(cx, cy - Math.max(ro, rd)); }
      return { g, errs };
    },
    drag: (x, y) => 2 * Math.hypot(x - 190, y - 150) / 230 },
  { k: 'h2h', tab: '孔到孔', title: '两个孔挨得太近', p: '两个过孔的中心距', min: 0.35, max: 1.6, step: 0.01, v: 0.9,
    rule: `规则：孔到孔的间距 ${n2(R.min_hole_to_hole)} mm（量孔边到孔边）`,
    why: '两个孔中间那一点板材太薄，钻的时候容易破。两个都是 GND 过孔，铜碰在一起没关系，量的是孔边到孔边。左右拖右边那个过孔。',
    qb: () => `QB12：这一类 0 条。最近的两个孔隔 ${n2(H2H.d)} mm，在 U2 的散热焊盘里。`,
    draw(v) {
      const s = 170, cy = 160, r = 0.3 * s, rd = 0.15 * s, x1 = 260 - v / 2 * s, x2 = 260 + v / 2 * s, gap = v - 0.3;
      let g = `<circle class="p6-cu" cx="${x1}" cy="${cy}" r="${r}"/><circle class="p6-cu p6-mv" cx="${x2}" cy="${cy}" r="${r}"/>`;
      g += `<circle class="p6-hole" cx="${x1}" cy="${cy}" r="${rd}"/><circle class="p6-hole" cx="${x2}" cy="${cy}" r="${rd}"/>`;
      g += `<path class="p6-ref" d="M${x1 + rd} ${cy}V78M${x2 - rd} ${cy}V78"/>`;
      if (x2 - x1 - 2 * rd > 16) g += arrowH(x1 + rd, x2 - rd, 84);
      g += T(260, 64, `孔边到孔边 ${n2(gap)} mm`, 'p6-t b', 'middle') + T(260, 266, 'GND 过孔 0.6 / 0.3 mm', 'p6-t mu', 'middle');
      const errs = [];
      if (gap < R.min_hole_to_hole - 1e-9) { errs.push(E('hole_near_hole', '钻孔太靠近其他孔', `最小 ${n2(R.min_hole_to_hole)} mm；实际 ${n2(gap)} mm`)); g += mark(260, cy - r - 4); }
      return { g, errs };
    },
    drag: x => 2 * Math.abs(x - 260) / 170 },
  { k: 'edge', tab: '板边', title: '铜离板边太近', p: '线离板边的距离', min: 0, max: 0.9, step: 0.01, v: 0.6,
    rule: `规则：铜箔到板边间距 ${n2(R.min_copper_edge_clearance)} mm`,
    why: '板子外形是铣刀沿板框铣出来的，位置有 ±0.2 mm 的误差（图里的浅色带子）。铜离板边太近，铣刀可能削到铜，边上露铜、甚至把线切断。左右拖那根线。',
    qb: () => `QB12：这一类 0 条。铺铜沿板边退了 ${n2(MEAS.edgeZone)} mm，离板边最近的线 ${n2(EDGE_T.d)} mm。`,
    draw(v) {
      const s = 250, X = 400, w = 0.2 * s, xc = X - (v + 0.1) * s;
      let g = `<rect class="p6-out" x="${X}" y="0" width="${520 - X}" height="300"/><rect class="p6-tol" x="${X - 0.2 * s}" y="0" width="${0.4 * s}" height="300"/>`;
      g += `<path class="p6-edge" d="M${X} 0V300"/><path class="p6-ref" d="M${X - R.min_copper_edge_clearance * s} 36V300"/>`;
      g += T(X + 56, 24, '板外', 'p6-t mu') + T(X, 76, '铣刀误差 ±0.2', 'p6-t mu', 'middle') + T(X - R.min_copper_edge_clearance * s - 6, 24, `规则 ${n2(R.min_copper_edge_clearance)} mm`, 'p6-t', 'end');
      g += `<rect class="p6-cu p6-mv" x="${xc - w / 2}" y="100" width="${w}" height="185" rx="${w / 2}"/>`;
      if (X - (xc + w / 2) > 14) g += arrowH(xc + w / 2, X, 250);
      g += T(xc - w / 2 - 8, 250, `${n2(v)} mm`, 'p6-t b', 'end');
      const errs = [];
      if (v < R.min_copper_edge_clearance - 1e-9) { errs.push(E('copper_edge_clearance', '电路板边缘间距违规', `最小 ${n2(R.min_copper_edge_clearance)} mm；实际 ${n2(v)} mm`)); g += mark(xc + w / 2, 150); }
      return { g, errs };
    },
    drag: x => (400 - x) / 250 - 0.1 },
  { k: 'unc', tab: '没连上', title: '同一个网络的两个焊盘没连通', p: '走线终点离焊盘 B 还差', min: -0.5, max: 2.5, step: 0.05, v: -0.3,
    rule: '规则：同一个网络的焊盘必须用铜连通',
    why: '这是最要命的一类：线差一点没接到焊盘上，看着像连了，其实是断的。DRC 会把它单独列在“未连接项目”页里，板上还会画出飞线。往左拖走线的终点试试。',
    qb: () => `QB12：未连接项目 ${DRC.unconnected} 处。`,
    draw(v) {
      const s = 90, xe = 380 - v * s, w = 0.3 * s;
      let g = `<rect class="p6-cu" x="50" y="115" width="70" height="70" rx="6"/><rect class="p6-cu" x="380" y="115" width="70" height="70" rx="6"/>`;
      g += `<path class="p6-trk p6-mv" d="M85 150H${xe}" stroke-width="${w}"/>`;
      g += T(85, 104, '焊盘 A · 3V3', 'p6-t', 'middle') + T(415, 104, '焊盘 B · 3V3', 'p6-t', 'middle') + T(250, 226, '3V3 走线 0.3 mm', 'p6-t mu', 'middle');
      const errs = [];
      if (v > 1e-9) {
        g += `<path class="p6-rats" d="M${xe} 150L415 150"/>` + mark(xe + (380 - xe) / 2, 146);
        errs.push(E('unconnected_items', '项目之间的连接缺失', '3V3：走线 ↔ 焊盘 B（在“未连接项目”页）'));
        errs.push(E('track_dangling', '走线末端悬空', '走线的一头什么也没接'));
        g += T(250, 270, `还差 ${n2(v)} mm`, 'p6-t b', 'middle');
      } else g += T(250, 270, '终点落在焊盘 B 里：连上了', 'p6-t b', 'middle');
      return { g, errs };
    },
    drag: x => (380 - x) / 90 },
  { k: 'crt', tab: '外框重叠', title: '两个元件的占位框叠在一起', p: 'R1 和 R2 的中心距', min: 2.0, max: 5.0, step: 0.05, v: 4.0,
    rule: `规则：元件外框（courtyard）不许重叠；焊盘之间还要满足间距 ${n2(DEF.clearance)} mm`,
    why: '每个封装外面有一圈“占位框”（第 3 课），代表元件本体加上贴片机需要的余量。框叠在一起，说明两个元件可能撞上、或者贴片时互相挡着。往左拖 R2，先叠框，再近就碰到焊盘间距。',
    qb: () => `QB12：这一类 0 条。摆放脚本 check_place.py 摆完也会检查元件框有没有叠在一起。`,
    draw(v) {
      const s = 60, cy = 150, x1 = 130, x2 = 130 + v * s, pw = 0.9 * s, ph = 0.95 * s, po = 0.8 * s, cw = 2.9 * s, ch = 1.5 * s;
      const fp = (x, name, mv) => `<g class="${mv ? 'p6-mv' : ''}"><rect class="p6-crt" x="${x - cw / 2}" y="${cy - ch / 2}" width="${cw}" height="${ch}" rx="3"/>` +
        `<rect class="p6-cu" x="${x - po - pw / 2}" y="${cy - ph / 2}" width="${pw}" height="${ph}" rx="4"/><rect class="p6-cu" x="${x + po - pw / 2}" y="${cy - ph / 2}" width="${pw}" height="${ph}" rx="4"/></g>` +
        T(x, cy - ch / 2 - 12, name, 'p6-t', 'middle');
      let g = fp(x1, 'R1', false) + fp(x2, 'R2 · 拖我', true);
      const errs = [], ov = 2.9 - v, padGap = v - 2 * 0.8 - 0.9;
      if (ov > 1e-9) { g += `<rect class="p6-bad" x="${x2 - cw / 2}" y="${cy - ch / 2}" width="${ov * s}" height="${ch}"/>` + mark(x2 - cw / 2 + ov * s / 2, cy - ch / 2); errs.push(E('courtyards_overlap', '元件外框重叠', `R1 和 R2 的占位框叠了 ${n2(ov)} mm`)); }
      if (padGap < DEF.clearance - 1e-9) errs.push(E('clearance', '间距违规', `R1 和 R2 的焊盘只隔 ${n2(Math.max(0, padGap))} mm`));
      g += T(260, 262, ov > 1e-9 ? `占位框叠了 ${n2(ov)} mm` : `占位框之间还有 ${n2(-ov)} mm`, 'p6-t b', 'middle');
      return { g, errs };
    },
    drag: x => (x - 130) / 60 },
  { k: 'silk', tab: '丝印', title: '位号压到线框或焊盘上', p: '位号 R5 的高度位置', min: 0, max: 1.8, step: 0.02, v: 1.6,
    rule: '规则：丝印不压丝印、不压焊盘开窗（QB12 的丝印间距设成 0）',
    why: '丝印是印在阻焊上的白字。焊盘那块阻焊是开窗的（露出铜），工厂会把落在开窗里的丝印去掉；字和线框叠在一起会看不清。上下拖位号 R5：虚线是会被去掉的部分。',
    qb: () => `QB12：丝印间距 ${nType('silk_overlap')} 条、被阻焊层截断的丝印 ${nType('silk_over_copper')} 条，都是警告，6.3 节逐条能看。`,
    draw(v) {
      const s = 80, cx = 260, cy = 190, po = 0.8 * s, pw = 0.9 * s, ph = 0.95 * s, sw = 0.15 * s, ly = cy - 0.75 * s;
      const tx = cx - po, ty = cy - v * s, th = 0.8 * s, tw = 1.3 * s;
      const pads = [[cx - po - pw / 2, cy - ph / 2], [cx + po - pw / 2, cy - ph / 2]];
      let g = `<defs><mask id="p6-silkm" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="300"><rect width="520" height="300" fill="#fff"/>${pads.map(([x, y]) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="#000"/>`).join('')}</mask></defs>`;
      g += pads.map(([x, y]) => `<rect class="p6-pad" x="${x}" y="${y}" width="${pw}" height="${ph}" rx="3"/>`).join('');
      g += `<path class="p6-silk" stroke-width="${sw}" d="M${cx - 1.45 * s} ${ly}H${cx + 1.45 * s}M${cx - 1.45 * s} ${cy + 0.75 * s}H${cx + 1.45 * s}"/>`;
      g += `<text class="p6-ghost p6-mv" x="${tx}" y="${ty + th * 0.36}" text-anchor="middle" font-size="${th * 1.05}">R5</text>`;
      g += `<text class="p6-silkt p6-mv" mask="url(#p6-silkm)" x="${tx}" y="${ty + th * 0.36}" text-anchor="middle" font-size="${th * 1.05}">R5</text>`;
      g += T(cx + 1.45 * s + 8, ly + 6, '丝印线框', 'p6-t mu') + T(cx + po + pw / 2 + 8, cy + 40, '焊盘开窗', 'p6-t mu');
      const top = ty - th / 2, bot = ty + th / 2, x0 = tx - tw / 2, x1 = tx + tw / 2;
      const errs = [];
      const hitLine = [ly, cy + 0.75 * s].some(y => top < y + sw / 2 && bot > y - sw / 2);
      const hitPad = pads.some(([x, y]) => top < y + ph && bot > y && x0 < x + pw && x1 > x);
      if (hitLine) errs.push(E('silk_overlap', '丝印间距', '位号 R5 ↔ 丝印线段'));
      if (hitPad) errs.push(E('silk_over_copper', '被阻焊层截断的丝印', '位号 R5：落在焊盘开窗里的部分印不出来'));
      if (errs.length) g += mark(tx + tw / 2 + 14, top + 4);
      return { g, errs };
    },
    drag: (x, y) => (190 - y) / 80 }
];
(function () {
  const tabs = $('toy-tabs'), range = $('toy-range');
  tabs.innerHTML = TOY.map((t, i) => `<button class="btn" data-t="${i}" aria-pressed="false">${t.tab}</button>`).join('');
  let cur = 0;
  const vals = TOY.map(t => t.v);
  function render() {
    const t = TOY[cur], v = vals[cur];
    const r = t.draw(v);
    toySvg.innerHTML = `<rect class="p6-toybg" x="0" y="0" width="520" height="300" rx="10"/>${r.g}`;
    $('toy-pval').textContent = `${n2(v)} mm`;
    const real = r.errs.filter(e => e[0] !== 'info');
    $('toy-list').innerHTML = (real.length ? '' : '<div class="p6-v ok"><b>✓</b><span>没有违规</span></div>') +
      r.errs.map(([sv, name, d]) => `<div class="p6-v ${sv}"><b>${sv === 'info' ? '提示' : ZH[sv]}</b><span>${esc(name)}</span><small>${esc(d)}</small></div>`).join('');
  }
  function go(i) {
    cur = i; const t = TOY[i];
    C.pressOne('#p6-toy-tabs [data-t]', 't', i);
    $('toy-title').textContent = t.title; $('toy-why').textContent = t.why; $('toy-rule').textContent = t.rule; $('toy-qb').textContent = t.qb();
    $('toy-plab').textContent = t.p;
    range.min = t.min; range.max = t.max; range.step = t.step; range.value = vals[i];
    range.setAttribute('aria-valuetext', `${n2(vals[i])} mm`);
    render();
  }
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) go(+b.dataset.t); });
  range.addEventListener('input', () => { vals[cur] = +range.value; range.setAttribute('aria-valuetext', `${n2(vals[cur])} mm`); render(); });
  // 拖动：只认图里能动的东西（.p6-mv），也可以在空白处直接拖
  let drag = false;
  const toUser = e => { const pt = toySvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = toySvg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; };
  const setFrom = e => {
    const t = TOY[cur], p = toUser(e);
    let v = t.drag(p.x, p.y);
    v = Math.max(t.min, Math.min(t.max, Math.round(v / t.step) * t.step));
    vals[cur] = +v.toFixed(3); range.value = vals[cur]; render();
  };
  toySvg.addEventListener('pointerdown', e => { if (!e.target.closest('.p6-mv')) return; drag = true; toySvg.setPointerCapture(e.pointerId); toySvg.classList.add('drag'); e.preventDefault(); setFrom(e); });
  toySvg.addEventListener('pointermove', e => { if (drag) setFrom(e); });
  const up = () => { drag = false; toySvg.classList.remove('drag'); };
  toySvg.addEventListener('pointerup', up); toySvg.addEventListener('pointercancel', up);
  go(0);
  TOY.go = go;
})();

/* ================= 6.3 真实报告 ================= */
(function () {
  const date = DRC.date.slice(0, 10);
  $('rep-intro').innerHTML = `QB12 的检查不是在窗口里点的，而是 <span class="net">drc.sh</span> 用命令行跑的（KiCad ${esc(DRC.kicad)}，${date}），查的是 finalize.py 收尾以后、交付出去的那块板。结果：<strong>${DRC.errors}</strong> 个错误、<strong>${DRC.unconnected}</strong> 处未连接、<strong>${DRC.warnings}</strong> 条警告，警告分 ${DRC.by_type.length} 类。注意：你自己在 KiCad 里打开交付的工程包再跑一次，会看到 ${MEAS.pkg.by.reduce((a, b) => a + b[1], 0)} 条，不是 ${DRC.warnings} 条（下面的截图拍的就是这一次检查）。板子是同一块，差别在封装库有没有登记，6.4 细讲。`;
  $('cli').innerHTML = `<span class="cm"># ../../hardware/pcb/drc.sh 里的那一行：--severity-all 错误、警告都报；--all-track-errors 每根线的问题都列出来</span>\n<span class="kw">kicad-cli</span> pcb drc --severity-all --format json --all-track-errors \\\n    -o <span class="n">QB12_drc.json</span> QB12.kicad_pcb`;
})();
const REP_ITEMS = (function () {
  const k = {};
  return DRC.items.map((it, i) => {
    const type = it[0]; k[type] = (k[type] || 0) + 1;
    let x = it[1], y = it[2], near = null;
    if (type === 'silk_edge_clearance') { const o = MEAS.edgeSilk[k[type] - 1]; if (o) { x = o[0]; y = o[1]; near = o[2]; } }
    const m = it[3].match(/(?:Reference|Footprint|封装) '?([A-Z]+\d+)'?/) || it[3].match(/(?:^|[^A-Za-z0-9])([A-Z]+\d+) ?的/);
    if (!near && m) near = m[1];
    if (!near) {
      let best = null, ba = 1e9;
      D.footprints.forEach(f => { const b = f.bbox; if (x >= b[0] - 0.6 && x <= b[2] + 0.6 && y >= b[1] - 0.6 && y <= b[3] + 0.6) { const a = (b[2] - b[0]) * (b[3] - b[1]); if (a < ba) { ba = a; best = f.ref; } } });
      if (!best) { let bd = 2; D.footprints.forEach(f => { const b = f.bbox, d = Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3])); if (d < bd) { bd = d; best = f.ref; } }); }
      near = best;
    }
    return { i, type, x, y, desc: it[3], near, idx: k[type], back: /B\.Silkscreen/.test(it[3]) };
  });
})();
function zhDesc(s) {   // KiCad 10.0.6 的报告条目本来就是中文（“SW1 的 线段, 位于 F.Silkscreen”“C3 的参考字段”），只把 ' / ' 换成 ↔；英文那几条替换留着兼容旧报告
  return s.replace(/PCB Text '([^']+)' on (\S+)/g, "$2 上的 PCB 文本 '$1'")
    .replace(/(Segment|Arc|Circle) on (\S+)/g, (m, kk, ly) => `${ly} 上的 ${{ Segment: '线段', Arc: '弧线', Circle: '圆形' }[kk]}`)
    .replace(/Reference '([^']+)'/g, "位号 '$1'").replace(/Footprint (\S+)/g, '封装 $1').replace(/ \/ /g, ' ↔ ');
}
const isPolarity = it => it.type === 'silk_overlap' && /PCB (?:Text|文本) '\+'/.test(it.desc) && /BATTERY/.test(it.desc);
const SUB = (function () {
  const so = REP_ITEMS.filter(i => i.type === 'silk_overlap');
  const ref = so.filter(i => /Reference|参考字段/.test(i.desc)).length, txt = so.filter(i => /PCB (?:Text|文本).*PCB (?:Text|文本)/.test(i.desc)).length;
  const sc = REP_ITEMS.filter(i => i.type === 'silk_over_copper');
  return { ref, txt, gfx: so.length - ref - txt, dots: sc.filter(i => /Circle|圆形/.test(i.desc)).length, ctext: sc.filter(i => /PCB (?:Text|文本)/.test(i.desc)) };
})();
const TYPEINFO = {
  silk_overlap: { what: '两段丝印叠在了一起：位号压着元件的线框，或者两个元件的线框互相碰到。',
    why: () => `位号压线框 ${SUB.ref} 条；线框碰线框 ${SUB.gfx} 条（立创封装自带的线框，元件排得密，比如 C5、C6、R7 那一列）；背面文字压文字 ${SUB.txt} 条。`,
    verdict: '外观。字和线叠着，印出来可能看不清，但不影响电路。只有背面“+”压着“BATTERY 1S”那一条值得看一眼：它是电池插座的正极标记。', good: true },
  silk_over_copper: { what: '丝印画到了焊盘的阻焊开窗上。开窗处露的是铜，工厂会把这里的丝印去掉。',
    why: () => `${SUB.dots} 条是封装里自带的小圆点，线宽只有 ${n2(MEAS.dot)} mm，落在焊盘上；${SUB.ctext.length} 条是背面的“USB-C 5V”碰到了 J1 外壳脚的开窗。`,
    verdict: `外观。${n2(MEAS.dot)} mm 的小圆点本来就印不出来（JLC 丝印线宽要 ≥0.15 mm）；“USB-C 5V”最多缺一点笔画。`, good: true },
  lib_footprint_issues: { what: '每一条的说明都是“当前配置中不包含封装库 \'QB12\'”（英文原文 The current configuration does not include the footprint library \'QB12\'）：跑检查的那台电脑上，封装库表里没有登记叫 QB12 的库，KiCad 没法拿板上的封装和库里的比。',
    why: () => `${nType('lib_footprint_issues')} 个封装全来自工程自己的 QB12 库（从立创 EasyEDA 转来的），每个都报一条。`,
    verdict: '工程设置问题，跟板子本身无关。交付的工程包里带了项目库表 fp-lib-table，重跑一次这类就没了（见 6.4）。', good: true },
  silk_edge_clearance: { what: '丝印画出了板框：板外那一段印不上，板子在那里被切掉了。',
    why: () => 'SW1（拨动开关）和 J1（USB-C）本来就故意伸出板边（第 3 课），它们封装上的线框跟着出去了。',
    verdict: '外观，而且是预料之中的。', good: true }
};
const RB = BoardViewer.create($('rep-bv'), { toolbar: 'mini', panel: false, hover: true, layers: ['F.Cu', 'F.SilkS', 'Edge.Cuts', 'DRC'], tracks: false, label: 'QB12 板子，带 DRC 标记，点左边的条目跳到对应位置' });
const repRun = lazyRunner($('rep-bv'));
const REP = { type: DRC.by_type[0].type, item: null, sev: Object.fromEntries(DRC.by_type.map(t => [t.type, t.severity])), ex: new Set() };
function repLayers(type, back) {
  const s = back ? 'B' : 'F';
  if (type === 'silk_over_copper') return [s + '.Cu', s + '.Mask', s + '.SilkS', 'Edge.Cuts'];
  if (type === 'lib_footprint_issues') return ['F.Cu', 'Courtyard', 'Labels', 'Edge.Cuts'];
  if (type === 'silk_edge_clearance') return ['F.Cu', 'F.SilkS', 'Courtyard', 'Edge.Cuts'];
  return [s + '.Cu', s + '.SilkS', 'Edge.Cuts'];
}
function repMarks() {
  RB.clearAnnotations();
  const t = REP.type;
  if (REP.sev[t] === 'ignore') return;
  RB.annotate((g, mk) => {
    REP_ITEMS.forEach(it => { if (it.type === t && !REP.ex.has(it.i)) mk.el('circle', { cx: it.x, cy: it.y, r: 0.32, class: 'p6-rr' }); });
    const it = REP.item != null ? REP_ITEMS[REP.item] : null;
    if (it) {
      mk.el('circle', { cx: it.x, cy: it.y, r: 1.1, class: 'p6-ring' });
      mk.el('path', { d: `M${it.x - 2.2} ${it.y}H${it.x - 1.3}M${it.x + 1.3} ${it.y}H${it.x + 2.2}M${it.x} ${it.y - 2.2}V${it.y - 1.3}M${it.x} ${it.y + 1.3}V${it.y + 2.2}`, class: 'p6-cross' });
    }
  });
}
function repSummary() {
  let err = 0, warn = 0, ign = IGNORED0;
  DRC.by_type.forEach(t => {
    const n = REP_ITEMS.filter(i => i.type === t.type && !REP.ex.has(i.i)).length;
    if (REP.sev[t.type] === 'error') err += n; else if (REP.sev[t.type] === 'warning') warn += n; else ign++;
  });
  const ex = REP.ex.size;
  $('rep-sum').innerHTML = [['错误', err, err ? 'bad' : 'good'], ['警告', warn, 'warn'], ['未连接', DRC.unconnected, DRC.unconnected ? 'bad' : 'good'], ['原理图一致性', '没查', ''], ['排除', ex, '']]
    .map(([a, b, c]) => `<div class="ro"><small>${a}</small><b class="${c}">${b}</b></div>`).join('');
  $('rep-tabs').innerHTML = `<span>违规 (${err + warn})</span><span>未连接项目 (${DRC.unconnected})</span><span>原理图一致性 (不运行)</span><span>忽略的测试 (${ign})</span>`;
}
function repTypes() {
  $('types').innerHTML = DRC.by_type.map(t => `<div class="p6-ty${REP.type === t.type ? ' on' : ''}${REP.sev[t.type] === 'ignore' ? ' ign' : ''}">` +
    `<button class="p6-ty-b" data-ty="${t.type}" aria-pressed="${REP.type === t.type}"><b>${esc(KNAME[t.type] || t.type)}</b><small>${esc(t.zh)} · ${t.type}</small><i>${t.n}</i></button>` +
    `<select data-sev="${t.type}" aria-label="${esc(KNAME[t.type] || t.type)} 的严重级别">${['error', 'warning', 'ignore'].map(s => `<option value="${s}"${REP.sev[t.type] === s ? ' selected' : ''}>${ZH[s]}</option>`).join('')}</select></div>`).join('');
}
function repList() {
  const t = REP.type;
  if (REP.sev[t] === 'ignore') { $('items').innerHTML = '<p class="p6-empty">这一类设成了“忽略”：KiCad 不再检查，列表里也就没有了。改回“警告”就能看到。</p>'; return; }
  $('items').innerHTML = REP_ITEMS.filter(i => i.type === t).map(it =>
    `<button class="p6-it${REP.ex.has(it.i) ? ' ex' : ''}${isPolarity(it) ? ' pol' : ''}" data-i="${it.i}" aria-pressed="${REP.item === it.i}" role="listitem">` +
    `<span class="p6-it-n">${it.idx}</span><span class="p6-it-d">${esc(zhDesc(it.desc))}</span><small>${it.near ? esc(it.near) + ' · ' : ''}(${n2(it.x)}, ${n2(it.y)})${it.back ? ' · 背面' : ''}</small></button>`).join('');
}
function repCard() {
  const t = REP.type, info = TYPEINFO[t], bt = byType[t];
  const it = REP.item != null ? REP_ITEMS[REP.item] : null;
  let h = `<h4>${esc(KNAME[t] || t)}<span>${bt.n} 条 · ${ZH[REP.sev[t]]}</span></h4><p>${info.what}</p>` +
    `<div class="states"><div><span>QB12 为什么有</span><span>${info.why()}</span></div><div><span>要紧吗</span><span>${info.verdict}</span></div></div>`;
  if (it) h += `<div class="p6-cur${isPolarity(it) ? ' pol' : ''}"><b>第 ${it.idx} 条</b><span>${esc(zhDesc(it.desc))}${it.near && !it.desc.includes(it.near) ? `，在 ${esc(it.near)} 附近` : ''}${it.back ? '（背面）' : ''}</span>` +
    (isPolarity(it) ? '<span>这是电池插座 J2 的正极标记，被说明文字压住了一部分。装电池前对着实物看清楚“+”在哪个脚。</span>' : '') +
    `<button class="btn" id="p6-ex">${REP.ex.has(it.i) ? '不再排除' : '排除此违规'}</button></div>`;
  else h += '<p class="p6-empty">点列表里的任意一条，板上会跳过去并圈出来。</p>';
  $('rep-card').innerHTML = h;
  const ex = $('ex');
  if (ex) ex.addEventListener('click', () => { if (REP.ex.has(it.i)) REP.ex.delete(it.i); else REP.ex.add(it.i); repAll(false); });
}
function repView(move) {
  repRun(() => {
    const t = REP.type, it = REP.item != null ? REP_ITEMS[REP.item] : null;
    const back = it ? it.back : false;
    RB.clear();
    RB.show({ mode: 'layers', side: back ? 'bottom' : 'top', layers: repLayers(t, back), tracks: false });
    if (t === 'lib_footprint_issues' && it && it.near) RB.highlightParts([it.near]);
    repMarks();
    if (move) { if (it) RB.focus([it.x - 7.5, it.y - 5.2, it.x + 7.5, it.y + 5.2], { pad: 0.2 }); else RB.reset(); }
    RB.badge(it ? `${KNAME[t]} · 第 ${it.idx} 条` : `${KNAME[t]} · ${byType[t].n} 条`);
  });
}
function repAll(move) { repSummary(); repTypes(); repList(); repCard(); repView(move); }
$('types').addEventListener('click', e => { const b = e.target.closest('[data-ty]'); if (!b) return; REP.type = b.dataset.ty; REP.item = null; repAll(true); });
$('types').addEventListener('change', e => { const s = e.target.closest('[data-sev]'); if (!s) return; REP.sev[s.dataset.sev] = s.value; if (s.dataset.sev === REP.type && s.value === 'ignore') REP.item = null; repAll(false); });
$('items').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; REP.item = +b.dataset.i; repAll(true); });
repAll(true);
function repSelect(type, pick) {
  REP.type = type; REP.item = null;
  if (pick) { const it = REP_ITEMS.find(pick); if (it) REP.item = it.i; }
  repAll(true);
  const el = REP.item != null ? document.querySelector(`#p6-items [data-i="${REP.item}"]`) : null;
  if (el) el.scrollIntoView({ block: 'nearest' });
}

/* ================= 6.4 逐类判断 ================= */
(function () {
  const polN = REP_ITEMS.filter(isPolarity).length;
  const runs = {
    out: { label: `交付前的板：${DRC.warnings} 条`, cats: [
      ['look', '外观，不影响电路', nType('silk_overlap') - polN + nType('silk_over_copper') + nType('silk_edge_clearance'), 'var(--c1)'],
      ['setup', '工程设置：库没登记', nType('lib_footprint_issues'), 'var(--c3)'],
      ['pol', '值得看一眼', polN, 'var(--hl)']] },
    pkg: { label: `交付的工程包：${MEAS.pkg.by.reduce((a, b) => a + b[1], 0)} 条`, cats: [
      ['look', '外观，不影响电路', MEAS.pkg.by.filter(b => b[0].startsWith('silk')).reduce((a, b) => a + b[1], 0) - polN, 'var(--c1)'],
      ['mod', '故意改过的封装', MEAS.pkg.by.find(b => b[0] === 'lib_footprint_mismatch')[1], 'var(--c2)'],
      ['pol', '值得看一眼', polN, 'var(--hl)']] }
  };
  const cards = {
    look: () => `<h4>外观：${nType('silk_overlap') - polN + nType('silk_over_copper') + nType('silk_edge_clearance')} 条</h4><ul>` +
      `<li><b>丝印间距</b> ${nType('silk_overlap') - polN} 条：位号压线框、线框碰线框。</li><li><b>被阻焊层截断的丝印</b> ${nType('silk_over_copper')} 条：${SUB.dots} 个 ${n2(MEAS.dot)} mm 的小圆点（本来就印不出）+ 背面“USB-C 5V”。</li>` +
      `<li><b>被板边截断的丝印</b> ${nType('silk_edge_clearance')} 条：SW1、J1 故意伸出板边。</li></ul><p>想清掉也可以：把位号挪开、删掉小圆点。不清也能照常生产。</p>`,
    setup: () => `<h4>工程设置：${nType('lib_footprint_issues')} 条</h4><p>跑检查的电脑上没登记 QB12 封装库。交付的工程包里带了项目库表 <span class="net">fp-lib-table</span>，点上面“交付的工程包”看重跑的结果：这 ${nType('lib_footprint_issues')} 条全没了。</p>`,
    mod: () => `<h4>故意改过的封装：${MEAS.pkg.mismatch.length} 条</h4><p>库登记上以后，KiCad 能比对了，发现板上有 ${MEAS.pkg.mismatch.length} 个封装和库里不一样。都是 <span class="net">build_board.py</span> 放元件时故意改的：</p><ul>${MEAS.pkg.mismatch.map(([r, w]) => `<li><b>${r}</b>：${w}</li>`).join('')}</ul><p>确认是故意的，就排除这几条；千万别“从库中更新封装”，那会把改动换回去。</p>`,
    pol: () => `<h4>值得看一眼：${polN} 条</h4><p>背面电池插座 J2 旁边的“+”被“BATTERY 1S”压住了一部分。这是正极标记，插电池的时候要靠它。DRC 只说“丝印间距”，不知道这个“+”有多重要。</p><button class="btn" id="p6-polgo">在报告里看这一条</button>`
  };
  function show(k) {
    C.pressOne('#p6 [data-p6run]', 'p6run', k);
    const r = runs[k], tot = r.cats.reduce((a, c) => a + c[2], 0);
    $('vbar').innerHTML = r.cats.map(([id, lab, n, col]) => `<div style="flex:${n};background:color-mix(in srgb,${col} 62%,var(--panel2))" title="${lab} ${n}"><span>${n}</span></div>`).join('');
    $('vbar').setAttribute('role', 'img'); $('vbar').setAttribute('aria-label', r.cats.map(c => `${c[1]} ${c[2]}`).join('，') + `，共 ${tot}`);
    $('vleg').innerHTML = `<span><b>${r.label}</b></span>` + r.cats.map(([id, lab, n, col]) => `<span><i style="background:color-mix(in srgb,${col} 62%,var(--panel2))"></i>${lab} ${n}</span>`).join('');
    $('vcards').innerHTML = r.cats.map(c => `<div class="card p6-vc p6-vc-${c[0]}">${cards[c[0]]()}</div>`).join('');
    const pg = $('polgo');
    if (pg) pg.addEventListener('click', () => { repSelect('silk_overlap', isPolarity); scrollTo($('rep-bv')); });
  }
  document.querySelectorAll('#p6 [data-p6run]').forEach(b => b.addEventListener('click', () => show(b.dataset.p6run)));
  show('out');
  $('parity').innerHTML = `KiCad 可以拿 PCB 和原理图逐个对：元件是不是一一对上、每个焊盘的网络是不是和原理图一样。QB12 报告里这一项是空的，但这不是“通过了”，而是<strong>没查</strong>：<span class="net">drc.sh</span> 没开这一项，QB12 也根本没有 KiCad 原理图。它的网络全部写在 <span class="net">netlist.py</span> 里，<span class="net">build_board.py</span> 直接从这里给每个焊盘分配网络，PDF 原理图也是从同一份网表画出来的（第 0 课说过）。只有一份来源，两边才不会对不上。你自己用原理图画板，就一定要勾上“检查 PCB 和原理图是否一致”。`;
})();

/* ================= 6.5 3D：DRC 不知道的事 ================= */
(function () {
  const IMG = { top: { w: 1200, h: 862, cap: '顶视，3D 渲染（黑色阻焊）' }, low: { w: 1000, h: 462, cap: '从左下方低角度看，3D 渲染' } };
  const X0 = 134.5, Y0 = 114.5, K = 16.63;          // 顶视图：板子坐标 mm → 图片像素（按板框四边标定）
  const px = b => [X0 + b[0] * K, Y0 + b[1] * K, (b[2] - b[0]) * K, (b[3] - b[1]) * K];
  const bb = ref => (MEAS.ext[ref] || QB.fp(ref).bbox);
  const J2 = QB.fp('J2'), j2p = J2.pins.map(p => `${p[0]} 号脚 ${p[1]}（${p[2]}）`).join('，');
  const D1 = QB.fp('D1');
  const ext = MEAS.ext;
  const CHECKS = [
    { id: 'usb', t: 'USB-C 插得进去吗', top: [bb('J1')], arrows: [[[26.5, 42], [26.5, 37.2]]], low: [[535, 168, 185, 112]],
      x: `插头要从板子外面插进来，插口就得伸到板边外面。J1 的 3D 模型下沿到 y = ${n2(ext.J1[3])} mm，板边在 ${D.board.h} mm：插口伸出板边 ${n2(ext.J1[3] - D.board.h)} mm。装进船壳后，壳上要在这里开口。`,
      f: [['DRC 能查吗', '不能：它只查铜离板边够不够远'], ['QB12', `伸出板边 ${n2(ext.J1[3] - D.board.h)} mm`]] },
    { id: 'sw', t: '电源开关拨得到吗', top: [bb('SW1')], arrows: [[[-3.5, 23.6], [0.6, 23.6]]], low: [[193, 262, 78, 70]],
      x: `SW1 是侧拨开关，拨杆朝左。模型最左边到 x = ${n2(ext.SW1[0])} mm，拨杆伸出板边 ${n2(-ext.SW1[0])} mm，手指才拨得到。它两侧的丝印线框也跟着出了板边，这就是报告里那几条“被板边截断的丝印”。`,
      f: [['DRC 能查吗', '只会报丝印出了板边'], ['QB12', `拨杆伸出 ${n2(-ext.SW1[0])} mm`]] },
    { id: 'ant', t: '天线在板边、下面没有铜', top: [ant ? [Math.max(ant.bbox[0], 0), Math.max(ant.bbox[1], 0), Math.min(ant.bbox[2], D.board.w), Math.min(ant.bbox[3], D.board.h)] : bb('U1')], low: [[410, 36, 350, 122]],
      x: `ESP32 模组的天线在模组最上面一段。QB12 把模组顶到上边缘：模组上沿离板边只有 ${n2(ext.U1[1])} mm，天线下面画了禁布区，深 ${antDepth} mm，两层都不许走线、打孔、铺铜。乐鑫建议天线最好伸出底板外面，馈点靠近板边；装进外壳以后，天线四周至少留 15 mm 净空。DRC 只管板子本身，壳里别的东西放在哪，它不知道。`,
      f: [['DRC 能查吗', '只能查禁布区里有没有铜'], ['QB12', `模组离上边缘 ${n2(ext.U1[1])} mm，禁布区 ${antDepth} mm 深`]] },
    { id: 'bat', t: '电池插头的正负', top: [bb('J2')], arrows: [[[-3.2, 32.65], [0.6, 32.65]]], low: [[254, 234, 192, 182]],
      x: `J2 是电池插座：${j2p}。正面丝印在 1 号脚旁边画了一个圈，背面印着“+”“−”和 BATTERY 1S。DRC 只知道板上 1 号脚是 BAT+，不知道电池那头哪根线是正极。电池是另外买的，插之前对着板上的“+”看一眼，红线要对着它。`,
      f: [['DRC 能查吗', '不能'], ['QB12', '背面“+”被 BATTERY 1S 压住一点（6.4）']] },
    { id: 'pol', t: 'LED 和二极管的方向', top: [bb('LED1'), bb('LED2'), bb('LED3'), bb('D1')], low: null,
      x: `LED 和二极管反着贴就不亮、不导通。工厂贴片时看丝印上的方向标记：JLC 说丝印和坐标文件对不上时，默认按丝印贴。QB12 三颗 LED 的丝印框都在阴极一侧切了角，LED2、LED3 还画了指向阴极的三角；D1（${esc(D1.value)}）的丝印在阴极那头画了一道竖线，3D 模型上的白色色带也在同一头。下单时在贴片预览里再逐个核对（第 8 课）。`,
      f: [['DRC 能查吗', '不能：方向标记对不对它不管'], ['QB12', 'LED1–3、D1 的标记都在阴极一侧']] },
    { id: 'btn', t: '按键按得到吗', top: [bb('SW2'), bb('SW3')], low: [[722, 136, 146, 84]],
      x: `SW2（BOOT）和 SW3（RESET）是贴片轻触开关，按钮顶面离板子 ${n2(HT('SW2'))} mm（模型名里写着 H1.5）。装进船壳以后还要不要按得到？要的话，壳上开孔或者加一根按键柱。`,
      f: [['DRC 能查吗', '不能'], ['QB12', `按钮高 ${n2(HT('SW2'))} mm，在下边缘`]] },
    { id: 'tall', t: '最高的元件', top: [bb('J2'), bb('J3'), bb('J4')], low: [[36, 108, 412, 316]],
      x: `最高的是三个 PH2.0 插座：${n2(HT('J2'))} mm，加上板厚 ${D.board.thickness} mm，从板子底面到最高点大约 ${n2(HT('J2') + D.board.thickness)} mm。其次是 USB-C ${n2(HT('J1'))} mm、ESP32 模组 ${n2(HT('U1'))} mm。插头插上以后还要再多出一截线。下面的侧视图可以拖一拖，和船舱高度比。`,
      f: [['DRC 能查吗', '不能'], ['QB12', `最高 ${n2(HT('J2'))} mm（不含板厚）`]] }
  ];
  const ov = $('3d-ov'), imgTop = $('3d-top'), imgLow = $('3d-low');
  let view = 'top', cur = 0;
  $('3d-checks').innerHTML = CHECKS.map((c, i) => `<button class="btn" data-c="${i}" aria-pressed="false">${i + 1} ${c.t}</button>`).join('');
  function draw() {
    const c = CHECKS[cur], I = IMG[view];
    ov.setAttribute('viewBox', `0 0 ${I.w} ${I.h}`);
    let s = '';
    const boxes = view === 'top' ? c.top.map(px) : (c.low || []);
    boxes.forEach((b, i) => {
      const p = view === 'top' ? 10 : 8;
      s += `<rect class="p6-ovb" x="${b[0] - p}" y="${b[1] - p}" width="${b[2] + 2 * p}" height="${b[3] + 2 * p}" rx="10"/>`;
      if (i === 0) s += `<g class="p6-ovn" transform="translate(${Math.max(26, b[0] - p)} ${Math.max(26, b[1] - p)})"><circle r="22"/><text y="8" text-anchor="middle">${cur + 1}</text></g>`;
    });
    if (view === 'top' && c.arrows) c.arrows.forEach(([a, b]) => {
      const A = [X0 + a[0] * K, Y0 + a[1] * K], B = [X0 + b[0] * K, Y0 + b[1] * K], ang = Math.atan2(B[1] - A[1], B[0] - A[0]), h = 22;
      s += `<path class="p6-ova" d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}M${B[0] - h * Math.cos(ang - .5)} ${B[1] - h * Math.sin(ang - .5)}L${B[0]} ${B[1]}L${B[0] - h * Math.cos(ang + .5)} ${B[1] - h * Math.sin(ang + .5)}"/>`;
    });
    ov.innerHTML = s;
    imgTop.hidden = view !== 'top'; imgLow.hidden = view !== 'low';
    $('3d-cap').textContent = IMG[view].cap + (view === 'low' && !c.low ? '：这一项要在顶视图里看' : '');
    C.pressOne('#p6 [data-p6view]', 'p6view', view);
  }
  function go(i) {
    cur = i; const c = CHECKS[i];
    C.pressOne('#p6-3d-checks [data-c]', 'c', i);
    $('3d-title').textContent = `${i + 1} · ${c.t}`; $('3d-text').innerHTML = c.x;
    $('3d-facts').innerHTML = c.f.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
    if (view === 'low' && !c.low) view = 'top';
    draw();
  }
  $('3d-checks').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) go(+b.dataset.c); });
  document.querySelectorAll('#p6 [data-p6view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.p6view; draw(); }));
  go(0);
})();

/* 侧视：元件高度 */
(function () {
  const svg = $('ht-svg'), range = $('ht-range'), out = $('ht-out');
  const L = 30, Wd = 580, k = Wd / D.board.w, kz = 2 * k, base = 190, th = D.board.thickness;
  const parts = D.footprints.map(f => { const b = MEAS.ext[f.ref] || f.bbox; return { ref: f.ref, x0: Math.max(b[0], -1.2), x1: b[2], h: HT(f.ref) }; }).sort((a, b) => b.h - a.h);
  const X = x => L + x * k, Z = z => base - z * kz;
  let s = `<rect class="p6-slab" x="${X(0)}" y="${base}" width="${Wd}" height="${th * kz}" rx="2"/>`;
  s += parts.map(p => `<rect class="p6-part" data-ref="${p.ref}" x="${X(p.x0)}" y="${Z(p.h)}" width="${Math.max(2, (p.x1 - p.x0) * k)}" height="${p.h * kz}"><title>${p.ref} ${n2(p.h)} mm</title></rect>`).join('');
  const lab = [['J2–J4', 'J2', 'start'], ['USB-C', 'J1', 'middle'], ['ESP32 模组', 'U1', 'middle']].map(([t, r, an]) => [t, MEAS.ext[r][0], MEAS.ext[r][2], HT(r), an]);
  s += lab.map(([t, a, b, h, an]) => T(an === 'start' ? X(a) : (X(a) + X(b)) / 2, Z(h) - 8, `${t} ${n2(h)}`, 'p6-t hl', an)).join('');
  s += T(X(D.board.w) - 6, base + th * kz - 9, `板厚 ${th}`, 'p6-t hl mu', 'end');
  s += `<g id="p6-ht-line"><path class="p6-hline" d="M${L - 10} 0H${L + Wd + 10}"/><text class="p6-t hl b" x="${X(10.5)}" y="-8"></text></g>`;
  svg.innerHTML = s;
  const line = svg.querySelector('#p6-ht-line'), ltxt = line.querySelector('text');
  function upd() {
    const v = +range.value, y = Z(v);
    line.setAttribute('transform', `translate(0 ${y})`);
    ltxt.textContent = `外壳内 ${n2(v)} mm`;
    $('ht-val').textContent = `${n2(v)} mm`;
    const over = parts.filter(p => p.h > v + 1e-9);
    svg.querySelectorAll('.p6-part').forEach(r => r.classList.toggle('over', over.some(p => p.ref === r.dataset.ref)));
    if (!touched) { out.className = 'status'; out.textContent = `先拖到你在船舱里实际量出来的高度。现在的 ${n2(v)} mm 只是个起点${over.length ? `：这么矮的话有 ${over.length} 个元件放不下` : ''}。`; return; }
    if (!over.length) { out.className = 'status good'; out.textContent = `都放得下：最高的 J2、J3、J4 是 ${n2(parts[0].h)} mm，离壳顶还有 ${n2(v - parts[0].h)} mm。插头插上以后线还要往外走，再留一点。`; }
    else { out.className = 'status bad'; out.textContent = `放不下：${over.slice(0, 8).map(p => `${p.ref} ${n2(p.h)} mm`).join('、')}${over.length > 8 ? ` 等 ${over.length} 个` : ''}，比 ${n2(v)} mm 高。`; }
  }
  let touched = false;
  range.addEventListener('input', () => { touched = true; upd(); });
  upd();
})();

/* ================= 6.6 清单 ================= */
(function () {
  const KEY = 'qb12-pcb-p6-checklist';
  const CK = [
    ['drc', 'DRC：0 个错误', `QB12：${DRC.errors} 个（${DRC.date.slice(0, 10)}）`],
    ['unc', '未连接项目：0', `QB12：${DRC.unconnected} 处`],
    ['refill', '最后一次改动之后，重新铺铜，再跑一次 DRC', 'QB12：finalize.py 重新铺铜之后才跑的检查'],
    ['warn', '每一类警告都看过，说得出为什么可以不管', `QB12：${DRC.by_type.length} 类 ${DRC.warnings} 条（6.4）`],
    ['rules', '约束页的规则和工厂能力对过', `QB12：字高 ${n2(R.min_text_height)} mm 明显比工厂建议松；孔到孔、铜到板边刚好压线（6.1）`],
    ['parity', '原理图和 PCB 一致', 'QB12：没有 KiCad 原理图，网络只来自 netlist.py'],
    ['conn', '3D：接口朝外，插头插得进去', `QB12：USB-C 伸出 ${n2(MEAS.ext.J1[3] - D.board.h)} mm，开关伸出 ${n2(-MEAS.ext.SW1[0])} mm（按 3D 模型量；按元件外框是 ${(QB.fp('J1').bbox[3] - D.board.h).toFixed(1)} / ${(-QB.fp('SW1').bbox[0]).toFixed(1)} mm，第 3 课）`],
    ['pol', '极性标记清楚：LED、二极管、电池插座', 'QB12：背面“+”被压住一点，看过了'],
    ['ant', '天线下面两层都没铜，装进外壳后四周留出净空', `QB12：禁布区 ${antDepth} mm 深，两层`],
    ['tall', '最高的元件放得进外壳', `QB12：PH2.0 插座 ${n2(HT('J2'))} mm`],
    ['silk', '丝印看得清：字高 ≥ 1 mm、线宽 ≥ 0.15 mm', `QB12：位号 ${n2(MEAS.refText.h)} mm，背面说明 ${back1mm} / ${backTexts.length} 处 ≥ 1 mm`],
    ['gerb', '导出 Gerber 以后，用查看器再看一遍', '第 7 课']
  ];
  let st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { st = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 存不了也没关系 */ } };
  const list = $('ck-list');
  list.innerHTML = CK.map(([k, t, q]) => `<li><label><input type="checkbox" data-ck="${k}"${st[k] ? ' checked' : ''}><span><b>${t}</b><small>${q}</small></span></label></li>`).join('');
  function upd() {
    const n = CK.filter(c => st[c[0]]).length;
    $('ck-n').textContent = `已勾 ${n} / ${CK.length}`;
    $('ck-fill').style.width = (n / CK.length * 100) + '%';
    list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('done', !!st[CK[i][0]]));
  }
  list.addEventListener('change', e => { const c = e.target.closest('[data-ck]'); if (!c) return; st[c.dataset.ck] = c.checked; save(); upd(); });
  $('ck-reset').addEventListener('click', () => { st = {}; save(); list.querySelectorAll('input').forEach(i => { i.checked = false; }); upd(); });
  upd();
})();

/* ================= 6.7 自测 ================= */
(function () {
  $('q1').innerHTML = `不是。DRC 只保证“画出来的东西没有违反你给的规则”。规则本身对不对（6.1）、警告是不是真的无害（6.4）、插座开口朝哪、元件多高、电池线哪根是正极（6.5），它都不知道。QB12 还有一项根本没查：原理图一致性，因为它没有 KiCad 原理图。DRC 干净只是下单前清单的第一项。`;
  $('q2').innerHTML = `板子本身没问题。每一条的说明都是“当前配置中不包含封装库 'QB12'”：跑检查的那台电脑上，库表里没登记 QB12 这个封装库，KiCad 没法拿板上的封装和库里的比。交付的工程包带了项目库表，重跑一次这 ${nType('lib_footprint_issues')} 条就没了，换成 ${MEAS.pkg.mismatch.length} 条“封装与来源库中的封装存在不一致”：${MEAS.pkg.mismatch.map(m => m[0]).join('、')}，都是 build_board.py 故意改的。处理：把库登记上；那 ${MEAS.pkg.mismatch.length} 条确认是故意的就排除，而且别用“从库中更新封装”。`;
  const j1c = QB.fp('J1').pads.find(p => p.clr);
  $('q3').innerHTML = `先确认两件事：这个间距是元件本身决定的（对着数据手册的推荐焊盘图看），而且工厂做得出来（JLC 最小间距 0.10 mm）。然后<strong>只放过这一处</strong>，别把整类间距检查调成“忽略”，不然别处真的靠太近也查不出来了。办法一：在设计规则检查窗口里右键那一条 → 排除此违规。办法二是 QB12 的做法：给 J1 的焊盘单独设 ${j1c ? n2(j1c.clr) : '0.1'} mm 的局部间距；约束页的 ${n2(R.min_clearance)} mm 仍是底线，所以实际按 ${n2(R.min_clearance)} mm 算。J1 里最近的两个焊盘隔 ${n2(MEAS.padPad.d)} mm，铺铜离它的 VBUS 焊盘 ${n2(MEAS.cuMin.d)} mm，都过了。`;
  document.querySelectorAll('#p6 [data-p6q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p6q;
    if (q === '1') scrollTo($('3d-stage'));
    else if (q === '2') { repSelect('lib_footprint_issues', it => it.near === 'J1'); scrollTo($('rep-bv')); }
    else { ROWS.sel('clr'); scrollTo($('mg-bv')); }
  }));
})();
