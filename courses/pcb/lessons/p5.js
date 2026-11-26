/* 第 5 课：过孔与铺铜。关于 QB12 的数字都从 QB.board（真实设计文件抽出来的数据）现算，不手写。
   JLC / KiCad / 数据手册的数字来自 facts.md（出处见 p5_notes.md）。 */
const D = QB.board, S = D.stats, R = S.via_roles, GP = D.process.gnd, RU = D.rules;
const $ = id => document.getElementById('p5-' + id);
const RMx = C.RM;
const n2 = v => (Math.round(v * 100) / 100).toFixed(2);
const tr = v => String(Math.round(v * 1000) / 1000);
const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('zh-CN');
const pct = (a, b) => Math.round(a / b * 100);
const net = n => `<span class="net ${QB.netCls(n) === 's' ? 's' : QB.netCls(n) === 'p' ? 'p' : ''}">${n}</span>`;
const cls = name => D.classes.find(c => c.name === name);
const GND = QB.netIndex('GND');
const NETN = i => D.nets[i].name;
const ZF = D.zones.find(z => !z.rule && z.layers.includes('F.Cu'));
const ZB = D.zones.find(z => !z.rule && z.layers.includes('B.Cu'));
const KORDER = ['antenna', 'module', 'usb'];
const KEEP = D.zones.filter(z => z.rule).sort((a, b) => (KORDER.indexOf(a.id) + 1 || 9) - (KORDER.indexOf(b.id) + 1 || 9));
const keep = id => KEEP.find(z => z.id === id);
const trackLen = t => Math.hypot(t[5] - t[3], t[6] - t[4]);
const SIZES = S.via_sizes.slice().sort((a, b) => b[2] - a[2]);      // [[0.6,0.3,170],[0.8,0.4,7]]
const SM = SIZES[0], BG = SIZES[SIZES.length - 1];
const area = S.area, aF = S.gnd_area['F.Cu'], aB = S.gnd_area['B.Cu'];
const scrollTo = el => el.scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });
/* facts.md §1.1（JLCPCB [S01] / 嘉立创 [S02][S03]）、§3.2（1 oz ≈ 35 µm [S19]） */
const JLC = { minHole: 0.15, minDia: 0.25, minDiff: 0.1, recHole: 0.2, recDiff: 0.15, posTol: 0.075, platUm: 18, cuUm: 35 };

/* ---------- 一些从板子算出来的量 ---------- */
const fpOf = ref => QB.fp(ref);
const inRect = (p, x, y) => Math.abs(x - p.x) <= p.w / 2 + 1e-6 && Math.abs(y - p.y) <= p.h / 2 + 1e-6;
const epU2 = fpOf('U2').pads.find(p => p.n === '17' && p.t === 'smd');
const epU4 = fpOf('U4').pads.find(p => p.n === '9' && p.t === 'smd');
const thU2 = D.vias.filter(v => v.role === 'thermal' && inRect(epU2, v.x, v.y));
const thU4 = D.vias.filter(v => v.role === 'thermal' && inRect(epU4, v.x, v.y));
const fpHolesU2 = fpOf('U2').pads.filter(p => p.n === '17' && p.t === 'pth');
const sigV = D.vias.filter(v => v.role === 'signal');
const sigNets = [...new Set(sigV.map(v => NETN(v.net)))];
const bigNets = [...new Set(D.vias.filter(v => v.d === BG[0] && v.drill === BG[1]).map(v => NETN(v.net)))];
const lockedSig = sigV.filter(v => v.locked).length;
const bTr = D.tracks.filter(t => t[1] === 1 && t[0] !== GND);
const bLen = {};
bTr.forEach(t => { const n = NETN(t[0]); bLen[n] = (bLen[n] || 0) + trackLen(t); });
const bNets = Object.keys(bLen).sort((a, b) => bLen[b] - bLen[a]);
const bTotal = bTr.reduce((a, t) => a + trackLen(t), 0);
const gndPadsSMD = [];
D.footprints.forEach(f => f.pads.forEach(p => { if (p.net === GND && p.t === 'smd') gndPadsSMD.push([f.ref, p]); }));
const nearPad = v => { let best = null, bd = 1e9; gndPadsSMD.forEach(([r, p]) => { const d = Math.hypot(p.x - v.x, p.y - v.y); if (d < bd) { bd = d; best = r; } }); return [best, bd]; };
const fanD = R.fanout ? D.vias.filter(v => v.role === 'fanout').map(v => nearPad(v)[1]) : [0];
const fanC6 = D.vias.filter(v => v.role === 'fanout').find(v => nearPad(v)[0] === 'C6');
const ant = keep('antenna'), modk = keep('module'), usbk = keep('usb');
const clipB = b => [Math.max(b[0], 0), Math.max(b[1], 0), Math.min(b[2], D.board.w), Math.min(b[3], D.board.h)];
const antB = clipB(ant.bbox);
const stitchAnt = D.vias.filter(v => v.role === 'stitch' && v.x > antB[0] && v.y > antB[3] && v.y < antB[3] + GP.stitch_step);
const stitchAntDy = stitchAnt.length ? Math.min(...stitchAnt.map(v => v.y)) - antB[3] : 0;
/* route_b.py 的缝合网格：从 (1.5, 1.5) 起，每 stitch_step 一个点，奇数行错开半格 */
const gridN = (() => { let n = 0; for (let y = 1.5; y < D.board.h; y += GP.stitch_step) { for (let x = 1.5 + (Math.floor(y / GP.stitch_step) % 2 ? GP.stitch_step / 2 : 0); x < D.board.w; x += GP.stitch_step) n++; } return n; })();

/* board.json 里没有这个数：用 python3.12 + pcbnew 打开 out/QB12.kicad_pcb，把两个 GND 铺铜 UnFill() 后 GetUnconnectedCount() = 154（填充时为 0），见 p5_notes.md */
const UNROUTED_UNFILLED = 154;
$('unr1').textContent = UNROUTED_UNFILLED;
$('nv0').textContent = S.vias; $('nv1').textContent = S.vias;
$('qd').textContent = SM[0]; $('qh').textContent = SM[1];

/* =====================================================================
   5.1 过孔剖面 + 俯视 + 滑块
   ===================================================================== */
const VIA = (function () {
  const xs = $('xs'), tv = $('tv'), sd = $('sd'), sh = $('sh');
  let tented = true, flowObj = null;
  $('tol').textContent = JLC.posTol;
  const PRE = [
    [SM[0], SM[1], `${SM[0]} / ${SM[1]}<span class="p5-n">QB12 · ${SM[2]} 个</span>`],
    [BG[0], BG[1], `${BG[0]} / ${BG[1]}<span class="p5-n">QB12 · ${BG[2]} 个</span>`],
    [JLC.minDia, JLC.minHole, `${JLC.minDia} / ${JLC.minHole}<span class="p5-n">JLC 最小</span>`],
    [0.4, 0.3, `0.4 / 0.3<span class="p5-n">焊环太窄</span>`]
  ];
  $('vpre').innerHTML = PRE.map(([d, h, t], i) => `<button class="btn" data-pi="${i}" aria-pressed="false">${t}</button>`).join('');
  $('vpre').addEventListener('click', e => { const b = e.target.closest('[data-pi]'); if (b) set(PRE[+b.dataset.pi][0], PRE[+b.dataset.pi][1]); });
  const T = (p, x, y, s, c, a) => C.el('text', Object.assign({ x, y, class: 'p5-t ' + (c || '') }, a || {}), p, s);
  const dim = (p, x1, x2, y, c) => {
    C.el('path', { d: `M${x1} ${y}H${x2}M${x1} ${y - 5}V${y + 5}M${x2} ${y - 5}V${y + 5}`, class: 'p5-x-dim ' + (c || '') }, p);
  };
  function drawXS(d, h) {
    xs.innerHTML = '';
    if (flowObj) { flowObj.remove(); flowObj = null; }
    const k = 150, cx = 280, L = 16, Rr = 544;
    const yM = 64, yC = 70, yCore = 80, yCoreB = 206, yCB = 216, yMB = 222;
    const Rp = Math.max(d, h) / 2 * k, rh = h / 2 * k, pt = 5;
    const g = C.el('g', {}, xs);
    C.el('rect', { x: L, y: yCore, width: Rr - L, height: yCoreB - yCore, class: 'p5-x-fr4' }, g);
    for (let i = 1; i < 6; i++) C.el('path', { d: `M${L} ${yCore + i * 21}H${Rr}`, class: 'p5-x-glass' }, g);
    // 走线与焊盘
    C.el('rect', { x: L, y: yC, width: cx - L, height: yCore - yC, class: 'p5-x-cu' }, g);
    C.el('rect', { x: cx, y: yCoreB, width: Rr - cx, height: yCB - yCoreB, class: 'p5-x-cu' }, g);
    C.el('rect', { x: cx - Rp, y: yC, width: 2 * Rp, height: yCore - yC, class: 'p5-x-cu' }, g);
    C.el('rect', { x: cx - Rp, y: yCoreB, width: 2 * Rp, height: yCB - yCoreB, class: 'p5-x-cu' }, g);
    // 孔与孔壁
    C.el('rect', { x: cx - rh - pt, y: yC, width: 2 * (rh + pt), height: yCB - yC, class: 'p5-x-plate' }, g);
    C.el('rect', { x: cx - rh, y: yM - 1, width: 2 * rh, height: yMB - yM + 2, class: 'p5-x-hole' }, g);
    // 阻焊
    if (tented) {
      C.el('rect', { x: L, y: yM, width: Rr - L, height: yC - yM, class: 'p5-x-mask' }, g);
      C.el('rect', { x: L, y: yCB, width: Rr - L, height: yMB - yCB, class: 'p5-x-mask' }, g);
    } else {
      for (const y of [yM, yCB]) {
        C.el('rect', { x: L, y, width: cx - Rp - L, height: 6, class: 'p5-x-mask' }, g);
        C.el('rect', { x: cx + Rp, y, width: Rr - cx - Rp, height: 6, class: 'p5-x-mask' }, g);
      }
    }
    // 电流
    const fd = `M${L} ${(yC + yCore) / 2}H${cx - rh - pt / 2}V${(yCoreB + yCB) / 2}H${Rr}`;
    const fg = C.el('g', {}, xs);
    flowObj = C.flow(fg, fd, 'p5-dot', 46, 26, 2.6);
    // 标注
    const ring = (d - h) / 2;
    const okR = ring >= JLC.posTol - 1e-9;
    if (ring > 0.001) {
      dim(xs, cx + rh, cx + Rp, 44, 'r');
      T(xs, (cx + rh + cx + Rp) / 2, 32, `焊环 ${n2(ring)}`, ring < RU.min_via_annular_width - 1e-9 || !okR ? 'bad m' : 'hl m', { 'text-anchor': 'middle' });
    } else {
      T(xs, cx, 34, '没有焊环：孔把焊盘吃掉了', 'bad', { 'text-anchor': 'middle' });
    }
    T(xs, L + 2, 54, '顶层走线 F.Cu', 'mu');
    T(xs, Rr, 54, tented ? '阻焊盖住过孔（盖油）' : '阻焊开窗', 'mu', { 'text-anchor': 'end' });
    C.el('path', { d: `M${Rr - 30} 57L${Rr - 40} ${yM + 3}`, class: 'p5-x-lead' }, xs);
    T(xs, L + 10, 140, 'FR-4 基材', 'mu');
    T(xs, L + 10, 168, '约 1.5 mm', 'mu m');
    const px = cx + Math.max(Rp, rh + pt) + 16;
    T(xs, px, 130, '孔壁镀铜', '');
    T(xs, px, 158, `平均约 ${JLC.platUm} µm`, 'mu m');
    C.el('path', { d: `M${px - 4} 125L${cx + rh + pt / 2} 125`, class: 'p5-x-lead' }, xs);
    T(xs, Rr, 240, '底层走线 B.Cu', 'mu', { 'text-anchor': 'end' });
    dim(xs, cx - Rp, cx + Rp, 242);
    T(xs, cx, 266, `外径 ${n2(d)}`, 'm', { 'text-anchor': 'middle' });
    dim(xs, cx - rh, cx + rh, 280);
    T(xs, cx, 305, `孔径 ${n2(h)}`, 'm', { 'text-anchor': 'middle' });
    T(xs, L + 2, 305, '单位 mm · 示意', 'mu m');
  }
  function drawTV(d, h) {
    tv.innerHTML = '';
    const k = 150, cx = 120, cy = 110;
    const Rp = Math.max(d, h) / 2 * k, rh = h / 2 * k, off = JLC.posTol * k;
    C.el('rect', { x: 0, y: cy - 0.1 * k, width: cx, height: 0.2 * k, class: 'p5-tv-pad' }, tv);
    C.el('circle', { cx, cy, r: Rp, class: 'p5-tv-pad' }, tv);
    if (tented) C.el('rect', { x: 0, y: 0, width: 240, height: 240, class: 'p5-tv-mask' }, tv);
    else C.el('path', { d: `M0 0H240V240H0Z M${cx - Rp} ${cy}a${Rp} ${Rp} 0 1 0 ${2 * Rp} 0a${Rp} ${Rp} 0 1 0 ${-2 * Rp} 0Z`, 'fill-rule': 'evenodd', class: 'p5-tv-mask' }, tv);
    C.el('circle', { cx, cy, r: rh, class: 'p5-tv-hole' }, tv);
    const ring = (d - h) / 2, bad = ring < JLC.posTol - 1e-9;
    C.el('circle', { cx: cx + off, cy, r: rh, class: 'p5-tv-ghost' + (bad ? ' bad' : '') }, tv);
    C.el('text', { x: 120, y: 226, 'text-anchor': 'middle', class: 'p5-t ' + (bad ? 'bad' : 'mu') }, tv, bad ? '偏到极限：钻破焊盘边' : '偏到极限也还剩一圈铜');
    C.el('text', { x: 8, y: 20, class: 'p5-t mu' }, tv, tented ? '上面盖着阻焊' : '焊盘露在外面');
  }
  function checks(d, h) {
    const ring = (d - h) / 2, diff = d - h, E = 1e-9, out = [];
    const q = [];
    if (d < RU.min_via_diameter - E) q.push(`外径 < ${RU.min_via_diameter}`);
    if (h < RU.min_through_hole_diameter - E) q.push(`孔径 < ${RU.min_through_hole_diameter}`);
    if (ring < RU.min_via_annular_width - E) q.push(`焊环 < ${RU.min_via_annular_width}`);
    out.push([q.length ? 'no' : 'ok', 'QB12 自己定的规则', q.length ? 'DRC 会报错：' + q.join('、') : `外径 ≥ ${RU.min_via_diameter}、孔 ≥ ${RU.min_through_hole_diameter}、焊环 ≥ ${RU.min_via_annular_width} mm，都满足`]);
    const j = [];
    if (h < JLC.minHole - E) j.push(`孔径 < ${JLC.minHole}`);
    if (d < JLC.minDia - E) j.push(`外径 < ${JLC.minDia}`);
    if (diff < JLC.minDiff - E) j.push(`外径只比孔大 ${n2(diff)}（至少 ${JLC.minDiff}）`);
    out.push([j.length ? 'no' : 'ok', '嘉立创做得出来吗', j.length ? '做不了：' + j.join('、') : `孔 ≥ ${JLC.minHole}、外径 ≥ ${JLC.minDia}、外径比孔大 ≥ ${JLC.minDiff} mm`]);
    const r = [];
    if (h < JLC.recHole - E) r.push(`孔径 < ${JLC.recHole}`);
    if (diff < JLC.recDiff - E) r.push(`外径只比孔大 ${n2(diff)}（推荐 ≥ ${JLC.recDiff}）`);
    out.push([r.length ? 'mid' : 'ok', '嘉立创的推荐值', r.length ? '低于推荐：' + r.join('、') : `孔 ≥ ${JLC.recHole}、外径比孔大 ≥ ${JLC.recDiff} mm`]);
    const cost = h <= 0.15 + E ? '孔径 0.1 / 0.15 mm 的过孔要加钱' : (h >= 0.2 - E && h <= 0.25 + E && d < 0.45 - E) ? '孔 0.2 / 0.25 mm 且外径 < 0.45 mm，要加钱' : '';
    out.push([cost ? 'mid' : 'ok', '要不要加钱（JLCPCB 国际站）', (cost || '不加钱') + '，以下单页为准']);
    out.push([ring <= 0.001 ? 'no' : ring < JLC.posTol - E ? 'mid' : 'ok', `钻偏 ±${JLC.posTol} mm 会不会破盘`,
      ring <= 0.001 ? '没有焊环，焊盘直接被钻没了' : ring < JLC.posTol - E ? `焊环 ${n2(ring)} 比孔位公差窄：偏到极限会钻破焊盘边（推导）` : `焊环 ${n2(ring)} 比孔位公差宽：偏到极限也不破（推导）`]);
    return out;
  }
  function render() {
    const d = +sd.value, h = +sh.value;
    $('sdv').textContent = n2(d) + ' mm'; $('shv').textContent = n2(h) + ' mm';
    drawXS(d, h); drawTV(d, h);
    const ring = (d - h) / 2;
    const eq = Math.PI * h * JLC.platUm / JLC.cuUm;
    const rc = ring < RU.min_via_annular_width - 1e-9 ? (ring < JLC.minDiff / 2 - 1e-9 ? 'bad' : 'warn') : 'good';
    $('vro').innerHTML =
      `<div class="ro"><small>焊环 =（外径 − 孔径）÷ 2</small><b class="${rc}">${n2(Math.max(0, ring))} mm</b></div>` +
      `<div class="ro"><small>外径 − 孔径</small><b>${n2(Math.max(0, d - h))} mm</b></div>` +
      `<div class="ro"><small>孔壁一圈铜的截面，相当于</small><b>${n2(eq)} mm 宽的走线</b><small>按孔铜 ${JLC.platUm} µm、走线 1 oz ≈ ${JLC.cuUm} µm 估算</small></div>`;
    $('vchk').innerHTML = checks(d, h).map(([c, t, s]) => `<div class="p5-chk ${c}"><b>${c === 'ok' ? '✓' : c === 'no' ? '✗' : '!'}</b><div><strong>${t}</strong><small>${s}</small></div></div>`).join('');
    document.querySelectorAll('#p5-vpre [data-pi]').forEach(b => { const p = PRE[+b.dataset.pi]; b.setAttribute('aria-pressed', String(Math.abs(p[0] - d) < 1e-6 && Math.abs(p[1] - h) < 1e-6)); });
  }
  function set(d, h) { sd.value = d; sh.value = h; render(); }
  sd.addEventListener('input', render); sh.addEventListener('input', render);
  const tb = $('tent'), ob = $('open');
  tb.addEventListener('click', () => { tented = true; tb.setAttribute('aria-pressed', 'true'); ob.setAttribute('aria-pressed', 'false'); render(); });
  ob.addEventListener('click', () => { tented = false; tb.setAttribute('aria-pressed', 'false'); ob.setAttribute('aria-pressed', 'true'); render(); });
  set(SM[0], SM[1]);
  // 文字里的数字
  const ringS = (SM[0] - SM[1]) / 2, ringB = (BG[0] - BG[1]) / 2;
  $('vtxt1').innerHTML = `QB12 只用了两种过孔：<strong>${SM[2]} 个 ${SM[0]} / ${SM[1]} mm</strong> 和 <strong>${BG[2]} 个 ${BG[0]} / ${BG[1]} mm</strong>，焊环分别是 ${n2(ringS)} 和 ${n2(ringB)} mm，比 QB12 自己定的最小焊环 ${RU.min_via_annular_width} mm 宽，离嘉立创的底线更远。${SM[0]} / ${SM[1]} 也正是 KiCad 10 默认网络类的过孔，在 JLC 属于不加钱的尺寸。`;
  $('vtxt2').innerHTML = `大孔只出现在 ${bigNets.map(net).join('、')} 上：它们属于 Batt 和 Power 网络类，类里写的过孔是 ${cls('Batt').via.join(' / ')}，Freerouting 换层时就照着用。GND 也在 Power 类里，可 ${S.gnd_vias} 个接地孔全是 ${GP.via.join(' / ')}：脚本打地孔时直接写死了这个尺寸（route_b.py）。网络类的过孔只是“默认值”，不是上下限，用别的尺寸 DRC 也不报。最后，过孔一个都不单独开窗（<strong>盖油</strong>）：QB12 在 电路板配置 → 电路板叠层 → 阻焊/锡膏 里两面都勾了过孔盖油，Gerber 的顶层阻焊上 ${S.pads} 个开窗正好是 ${S.pads} 个焊盘。只有 U2、U4 散热焊盘里的 ${thU2.length + thU4.length} 个散热过孔落在焊盘自己的开窗里，顶面跟着露出来（<a href="#p1">第 1 课</a>）；其余 ${S.vias - thU2.length - thU4.length} 个两面都盖着油。盖了油的过孔表面有阻焊挡着，贴片时锡不会粘上去、和旁边的焊盘连在一起。`;
  $('vtip').innerHTML = `孔壁上的铜很薄：JLC 写的平均孔铜厚只有 ${JLC.platUm} µm，大约是走线铜厚的一半。但它绕着孔一整圈，${SM[1]} mm 的孔，截面积相当于一根 ${n2(Math.PI * SM[1] * JLC.platUm / JLC.cuUm)} mm 宽的走线，长度又只有板厚 ${S.thickness} mm。所以信号线换层打一个孔完全够；电流很大的线，可以并排打两三个孔一起分担（推导）。另外，嘉立创说过孔的孔径“不管控公差”，反正过孔里不插东西。`;
  return { set, el: $('sd').closest('.widget') };
})();

/* =====================================================================
   5.2 五种过孔
   ===================================================================== */
const B1 = BoardViewer.create($('bv1'), {
  toolbar: 'mini', panel: false, hover: true,
  layers: ['F.Cu', 'B.Cu', 'Vias', 'Drill', 'Edge.Cuts'],
  label: 'QB12 的 177 个过孔，按用途标出来；可缩放，鼠标指着过孔看它是哪一种'
});
/* 散热焊盘的外框 + 小字；U2 封装自带的 4 个孔另用青色圈出来（查看器 box() 的字号按板子毫米算，放大后太大，这里自己画） */
const epBox = (p, t) => B1.annotate((g, mk) => {
  const sw = (p.a || 0) % 180 ? [p.h, p.w] : [p.w, p.h];
  mk.el('rect', { class: 'bx', x: p.x - sw[0] / 2, y: p.y - sw[1] / 2, width: sw[0], height: sw[1], rx: 0.1, style: 'stroke-width:.06;stroke-dasharray:.25 .15' });
  mk.el('text', { x: p.x - sw[0] / 2, y: p.y - sw[1] / 2 - 0.12, style: 'font-size:.24px;stroke-width:.05' }, null, t);
  if (p === epU2) fpHolesU2.forEach(h => mk.el('circle', { cx: h.x, cy: h.y, r: h.w / 2 + 0.1, style: 'fill:none;stroke:var(--sig);stroke-width:.08' }));
});
const ROLES = (function () {
  const L0 = ['F.Cu', 'B.Cu', 'Vias', 'Drill', 'Edge.Cuts'];
  const LZ = ['F.Cu', 'B.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts'];
  const cnt = role => D.vias.filter(v => v.role === role);
  const sizeTxt = list => { const m = {}; list.forEach(v => { const k = `${v.d} / ${v.drill}`; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).map(([k, n]) => `${n} 个 ${k}`).join('，'); };
  const dmin = Math.min(...fanD), dmax = Math.max(...fanD);
  return [
    { id: 'signal', name: '信号换层', n: R.signal, layers: L0, view: 'board',
      what: `一根线要从别的线下面穿过去，就钻到底层走一段，再钻回顶层。所以信号孔多半成对出现：${sigNets.length} 个网络在底层走过，一共 ${R.signal} 个孔。每换一次层就多一次钻孔、多一点电阻，所以布线时能少换就少换。`,
      facts: [['尺寸', sizeTxt(cnt('signal'))], ['网络', sigNets.map(net).join(' ')], ['谁打的', `Freerouting ${R.signal - lockedSig} 个，脚本预先打好 ${lockedSig} 个`]],
      sub: [['只看 7 个大孔', () => { B1.highlightVias(v => v.d === BG[0] && v.drill === BG[1]); }], ['看底层的 VBUS', () => { B1.highlightNet('VBUS'); B1.highlightVias(v => v.role === 'signal' && v.net === QB.netIndex('VBUS'), { keep: true }); B1.focus('usb', { pad: 3 }); }]] },
    { id: 'fanout', name: '接地扇出', n: R.fanout, layers: LZ, view: 'board',
      what: `每个接地的贴片焊盘旁边就近打一个孔，用一小段线连过去，直接下到底层那整片地。电容的地脚离地平面越近，5.3 讲的那个回路就越小；Espressif 的设计指南也要求在电容的地焊盘旁边打地过孔，让回流路径短。有散热焊盘的芯片（U2、U4）例外：接地脚直接连到肚子下面的散热焊盘。`,
      facts: [['尺寸', sizeTxt(cnt('fanout'))], ['离焊盘中心', `${n2(dmin)}–${n2(dmax)} mm`], ['谁打的', '脚本，布线之前打好并锁定，自动布线只能绕开']],
      sub: fanC6 ? [['看 C6 的地', () => { B1.highlightParts(['C6']); B1.highlightVias(v => v === fanC6, { keep: true }); B1.focus('C6', { pad: 1.6 }); }]] : [] },
    { id: 'stitch', name: '缝合', n: R.stitch, layers: LZ, view: 'board',
      what: `把顶层和底层的两片地“缝”成一整块。哪一层的地被走线切开了，回流电流就从最近的缝合孔换到另一层绕过去（5.3）。另一个作用：一块接地不牢的铜皮会变成天线。嘉立创的说法是地过孔的间距要小于波长的 1/20，按 2.4 GHz 估算大约 3.4–6.2 mm；QB12 的网格是 ${GP.stitch_step} mm。`,
      facts: [['尺寸', sizeTxt(cnt('stitch'))], ['怎么排', `${GP.stitch_step} mm 网格，隔行错开半格，候选点 ${gridN} 个`], ['留下的条件', `离别的网络的铜 ≥ ${GP.stitch_clearance} mm，避开焊盘、板边和禁布区；铺完铜后两层都落在地里`], ['谁打的', '脚本，布线之后补的']],
      sub: [['天线下面那一排', () => { B1.toggle('Keepouts', true); B1.highlightVias(v => stitchAnt.includes(v)); B1.focus(antB.map((x, i) => i === 3 ? x + 3 : x), { pad: 1.5 }); }]] },
    { id: 'thermal', name: '散热', n: R.thermal, layers: LZ, view: 'U2',
      what: `U2（DRV8833）和 U4（TP4056）肚子底下各有一块裸露的散热焊盘。芯片的热先到这块焊盘，再顺着这些孔传到底层的整片地，底层这片铜就是散热片。TI 的手册说：没有内层的板，铜在器件另一面时，就用散热过孔把热从顶层传到底层；TP4056 的手册也说打孔到背面的铜“有用”，并且要求散热焊盘焊在地上。`,
      facts: [['U2', `脚本补 ${thU2.length} 个（十字排开，黄圈）+ 封装自带 ${fpHolesU2.length} 个（青圈）= ${thU2.length + fpHolesU2.length} 个孔，焊盘 ${tr(epU2.w)} × ${tr(epU2.h)} mm`], ['U4', `${thU4.length} 个（3 × 2），焊盘 ${tr(Math.max(epU4.w, epU4.h))} × ${tr(Math.min(epU4.w, epU4.h))} mm`], ['谁打的', '脚本，布线之前打好并锁定'], ['注意', '焊盘里的孔回流时会吸走一点锡（JLC 照常生产，发现了会邮件提醒）']],
      sub: [['U2', () => { B1.highlightVias('thermal'); epBox(epU2, 'U2 散热焊盘'); B1.focus('U2', { pad: 0.6 }); }], ['U4', () => { B1.highlightVias('thermal'); epBox(epU4, 'U4 散热焊盘'); B1.focus('U4', { pad: 0.6 }); }]] },
    { id: 'module', name: '模组接地', n: R.module, layers: LZ, view: [modk.bbox[0] - 1, modk.bbox[1] - 1, modk.bbox[2] + 1, modk.bbox[3] + 1],
      what: `ESP32 模组 U1 肚子下面有 3 × 3 块接地焊盘。脚本在相邻四块之间的 ${R.module} 个空位上各打一个孔，把它们直接接到底层的地。Espressif 说这块接地焊盘焊到底板地上“不是必须的”，但能改善散热；芯片的地焊盘要和地铜充分接触，不要只靠细线连。这一圈还画了禁布区，不许走线，就是为了把这几个空位留给它们（5.6）。`,
      facts: [['尺寸', sizeTxt(cnt('module'))], ['位置', 'U1 的 41 号接地焊盘之间'], ['谁打的', '脚本，布线之后补的']],
      sub: [] },
    { id: 'all', name: '全部', n: S.vias, layers: LZ, view: 'board',
      what: `${S.vias} 个过孔里，接地的有 ${S.gnd_vias} 个，换层的信号孔只有 ${R.signal} 个。接地孔这么多，是因为 QB12 的地不靠走线连，而是两层整片铺铜，再靠这些孔把所有接地的焊盘、两层的铜连成一体。鼠标指着一个孔，图下方会写出它是哪一种。`,
      facts: [['接地', `${S.gnd_vias} 个：扇出 ${R.fanout}、缝合 ${R.stitch}、散热 ${R.thermal}、模组 ${R.module}`], ['信号', `${R.signal} 个`], ['尺寸', SIZES.map(([d, h, n]) => `${n} 个 ${d} / ${h}`).join('，')]],
      sub: [] }
  ];
})();
let roleCur = null;
$('roles').innerHTML = ROLES.map(r => `<button class="btn" data-role="${r.id}" aria-pressed="false">${r.name}<span class="p5-n">${r.n}</span></button>`).join('');
function goRole(id) {
  const r = ROLES.find(x => x.id === id); if (!r) return;
  roleCur = id;
  C.pressOne('#p5-roles [data-role]', 'role', id);
  $('r-title').textContent = id === 'all' ? `全部 ${r.n} 个过孔` : `${r.name}过孔 · ${r.n} 个`;
  $('r-what').innerHTML = r.what;
  $('r-facts').innerHTML = r.facts.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
  $('r-sub').innerHTML = r.sub.map(([t], i) => `<button class="btn" data-sub="${i}">${t}</button>`).join('');
  B1.clear().clearAnnotations();
  B1.show({ layers: r.layers });
  if (id === 'all') B1.highlightVias(['signal', 'stitch', 'fanout', 'thermal', 'module']);
  else B1.highlightVias(id);
  B1.badge(`${r.name} · ${r.n}`);
  if (r.view === 'board') B1.reset(); else B1.focus(r.view, { pad: id === 'thermal' ? 0.6 : 1 });
  if (id === 'thermal') epBox(epU2, 'U2 散热焊盘');
}
$('roles').addEventListener('click', e => { const b = e.target.closest('[data-role]'); if (b) goRole(b.dataset.role); });
$('r-sub').addEventListener('click', e => {
  const b = e.target.closest('[data-sub]'); if (!b) return;
  const r = ROLES.find(x => x.id === roleCur);
  B1.clear().clearAnnotations(); if (roleCur !== 'stitch') B1.toggle('Keepouts', false);
  r.sub[+b.dataset.sub][1]();
});
(function whoBar() {
  const fr = R.signal - lockedSig, pre = S.locked_vias, post = R.stitch + R.module;
  const col = { signal: 'var(--c1)', fanout: 'var(--c2)', stitch: 'var(--sig)', thermal: 'var(--pow)', module: 'var(--c3)' };
  const order = ['signal', 'fanout', 'stitch', 'thermal', 'module'];
  const mix = c => `color-mix(in srgb,${c} 62%,var(--panel2))`;
  $('who').innerHTML = `<b>${S.vias} 个过孔，按用途</b><div class="p5-bar" role="group" aria-label="过孔按用途的数量，点一段查看">${order.map(k => `<div role="button" tabindex="0" data-role="${k}" style="flex:${R[k]};background:${mix(col[k])}" aria-label="${ROLES.find(r => r.id === k).name} ${R[k]} 个">${R[k]}</div>`).join('')}</div>` +
    `<div class="legendrow">${order.map(k => `<span><i style="background:${mix(col[k])}"></i>${ROLES.find(r => r.id === k).name}</span>`).join('')}</div>` +
    `<p class="cap">谁打的：布线前脚本打好并锁定 ${pre} 个（扇出 ${R.fanout}、散热 ${R.thermal}、VBUS 等 ${pre - R.fanout - R.thermal}），Freerouting 换层 ${fr} 个，布线后脚本补 ${post} 个（缝合 ${R.stitch}、模组 ${R.module}）。</p>`;
  const bar = $('who').querySelector('.p5-bar');
  bar.addEventListener('click', e => { const b = e.target.closest('[data-role]'); if (b) goRole(b.dataset.role); });
  bar.addEventListener('keydown', e => { const b = e.target.closest('[data-role]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goRole(b.dataset.role); } });
})();
goRole('signal');

/* =====================================================================
   5.3 回路面积（示意模型）
   ===================================================================== */
const LOOP = (function () {
  const svg = $('loop'), sl = $('slot'), bb = $('bridge');
  const k = 10;                                   // 10 px = 1 mm
  const PX0 = 20, PX1 = 620, PY0 = 40, PY1 = 260; // 地平面 60 × 22 mm
  const XA = 80, XB = 560, YT = 150, YR = 157, SX = 320, SW = 12;
  const lenMM = (XB - XA) / k, thick = 1.5;       // facts §3.4：1.6 mm 板的芯板约 1.5 mm
  const base = lenMM * thick;
  let bridge = false, flows = [];
  const bez = (p0, p1, p2, p3, n) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; };
  const polyLen = pts => pts.reduce((a, p, i) => i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
  const shoe = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const VY = YR + 13, VXL = SX - SW / 2 - 13, VXR = SX + SW / 2 + 13;   // 缝合孔的位置
  function detour(yE) {
    const depth = Math.min(PY1 - 4, yE + 6), dd = depth - YR;
    const a = Math.max(24, dd * 1.25);
    const right = bez([SX + SW / 2 + a, YR], [SX + SW / 2 + 8, YR + dd * 0.15], [SX + SW / 2 + 5, depth], [SX, depth], 18);
    const left = bez([SX, depth], [SX - SW / 2 - 5, depth], [SX - SW / 2 - 8, YR + dd * 0.15], [SX - SW / 2 - a, YR], 18);
    return [[XB, YR]].concat(right, left.slice(1), [[XA, YR]]);
  }
  function path(L) {
    const yE = PY0 + L * k;                        // 缝的下端
    if (yE <= YR - 4) return { pts: [[XB, YR], [XA, YR]], cut: false };
    const det = detour(yE);
    if (!bridge) return { pts: det, cut: true, via: false };
    // 有缝合孔时，回流挑两条路里围得更小的那条
    const br = [[XB, YR], [VXR + 9, YR], [VXR, VY], [VXL, VY], [VXL - 9, YR], [XA, YR]];
    return shoe(br) < shoe(det) ? { pts: br, cut: true, via: true } : { pts: det, cut: true, via: false };
  }
  function draw() {
    const L = +sl.value;
    $('slotv').textContent = `${fmt1(L)} mm`;
    flows.forEach(f => f.remove()); flows = [];
    svg.innerHTML = '';
    const yE = PY0 + L * k;
    C.el('rect', { x: PX0, y: PY0, width: PX1 - PX0, height: PY1 - PY0, rx: 6, class: 'p5-l-plane' }, svg);
    C.el('text', { x: PX0 + 8, y: PY1 - 10, class: 'p5-t mu' }, svg, '底层整片地');
    const P = path(L);
    // 多围出来的面积
    if (P.cut) { C.el('path', { d: 'M' + P.pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L') + 'Z', class: 'p5-l-area' }, svg); }
    if (L > 0) {
      C.el('rect', { x: SX - SW / 2, y: PY0 - 1, width: SW, height: yE - PY0 + 1, class: 'p5-l-slot' }, svg);
      C.el('path', { d: `M${SX} ${PY0 - 16}V${Math.max(PY0, yE - 4)}`, class: 'p5-l-btrk' }, svg);
      C.el('text', { x: SX + 12, y: PY0 - 14, class: 'p5-t mu' }, svg, '底层走线');
    }
    if (bridge) {
      const bx0 = VXL - 14, bx1 = VXR + 14;
      C.el('rect', { x: bx0, y: YR + 4, width: bx1 - bx0, height: 20, rx: 3, class: 'p5-l-bridge' }, svg);
      C.el('text', { x: SX, y: YR + 44, 'text-anchor': 'middle', class: 'p5-t mu' }, svg, '顶层地');
      for (const x of [VXL, VXR]) C.el('circle', { cx: x, cy: VY, r: 5, class: 'p5-l-via' }, svg);
    }
    // 两端的芯片
    for (const [x, t] of [[XA - 30, '发送端'], [XB + 30, '接收端']]) {
      C.el('rect', { x: x - 22, y: YT - 24, width: 44, height: 48, rx: 4, class: 'p5-l-chip' }, svg);
      C.el('text', { x, y: YT - 32, 'text-anchor': 'middle', class: 'p5-t' }, svg, t);
      C.el('circle', { cx: x, cy: YT + 34, r: 5, class: 'p5-l-via' }, svg);
    }
    C.el('text', { x: XA - 30, y: YT + 54, 'text-anchor': 'middle', class: 'p5-t mu' }, svg, '地过孔');
    // 信号线与回流
    C.el('path', { d: `M${XA - 8} ${YT}H${XB + 8}`, class: 'p5-l-trk' }, svg);
    const rd = `M${XB + 30} ${YT + 34}L${XB} ${YR}` + P.pts.map(p => 'L' + p.map(v => v.toFixed(1)).join(' ')).join('') + `L${XA - 30} ${YT + 34}`;
    C.el('path', { d: rd, class: 'p5-l-ret' }, svg);
    C.el('text', { x: (XA + SX) / 2 - 20, y: YT - 10, 'text-anchor': 'middle', class: 'p5-t' }, svg, '信号线');
    C.el('text', { x: (XA + SX) / 2 - 20, y: YR + 22, 'text-anchor': 'middle', class: 'p5-t mu' }, svg, '回流');
    const fg = C.el('g', {}, svg);
    flows.push(C.flow(fg, `M${XA - 8} ${YT}H${XB + 8}`, 'p5-l-dot2', 60, 34, 3));
    flows.push(C.flow(fg, rd, 'p5-l-dot', 60, 30, 2.8));
    // 数字
    const extraLen = P.cut ? (polyLen(P.pts) - (XB - XA)) / k : 0;
    const extraA = P.cut ? shoe(P.pts) / (k * k) : 0;
    const tot = base + extraA;
    $('lro').innerHTML =
      `<div class="ro"><small>回流多绕的路</small><b class="${extraLen > 5 ? 'bad' : extraLen > 0.5 ? 'warn' : 'good'}">${fmt1(extraLen)} mm</b></div>` +
      `<div class="ro"><small>回路面积（示意）</small><b class="${tot > base * 3 ? 'bad' : tot > base * 1.3 ? 'warn' : 'good'}">${Math.round(tot)} mm²</b></div>` +
      `<div class="ro"><small>是完整地的</small><b>${(tot / base).toFixed(1)} 倍</b><small>完整地 = ${lenMM} mm × ${thick} mm = ${Math.round(base)} mm²</small></div>`;
    const st = $('lst'), ratio = tot / base;
    if (!P.cut) { st.className = 'status good'; st.textContent = L > 0 ? '缝还没碰到信号线下面那条路，回流照样直着回来。缝只要不横穿信号线，就没关系。' : '地是完整的：回流电流就在信号线正下方，去和回只隔着 1.5 mm 的板子，圈最小。'; }
    else if (P.via) { st.className = 'status good'; st.textContent = '回流走到缝边，从缝合孔上到顶层的地，跨过缝再下来：只多绕了一小段，缝再长也一样。QB12 顶层铺地、打缝合孔，就是为了这个。'; }
    else if (ratio < 1.3) { st.className = 'status warn'; st.textContent = bridge ? '缝只比信号线多伸出一点，回流自己从缝头绕过去就够短了，缝合孔暂时用不上。把缝拉长试试。' : '缝刚好越过信号线一点，回流从缝头绕过去，多走了一小段。缝越长，绕得越远。'; }
    else { st.className = 'status ' + (ratio > 3 ? 'bad' : 'warn'); st.textContent = `回流过不去，只能绕到缝的尽头再回来：圈变成了完整地时的 ${ratio.toFixed(1)} 倍。这根信号线现在就像一个大线圈，往外辐射干扰，也更容易被干扰。`; }
  }
  sl.addEventListener('input', draw);
  bb.addEventListener('click', () => { bridge = !bridge; bb.setAttribute('aria-pressed', String(bridge)); draw(); });
  $('slotmax').addEventListener('click', () => { sl.value = sl.max; draw(); });
  $('slot0').addEventListener('click', () => { sl.value = 0; draw(); });
  draw();
  // QB12 的底层
  const top4 = bNets.slice(0, 4);
  $('ltxt').innerHTML = `QB12 的底层也不是完整的：${bTr.length} 段信号和电源线走在底层，属于 ${bNets.length} 个网络，加起来 ${fmt1(bTotal)} mm。最长的是 ${top4.map(n => `${net(n)} ${fmt1(bLen[n])} mm`).join('、')}。每一根都在底层的地上切出一条缝。5.4 会在真板上把这些缝标出来，再看顶层的地和缝合孔怎么把它们补上。`;
  return { el: svg.closest('.widget') };
})();

/* =====================================================================
   5.4 铺铜：外框 → 底层 → 缝 → 顶层 → 两层 → 间隙
   ===================================================================== */
const B2 = BoardViewer.create($('bv2'), {
  toolbar: 'mini', panel: false, hover: true,
  layers: ['B.Cu', 'Vias', 'Drill', 'Edge.Cuts'],
  label: 'QB12 的两层铺地，一步步填出来'
});
const POUR = (function () {
  const fF = ZF.fill['F.Cu'], fB = ZB.fill['B.Cu'];
  const holesB = fB.polys.reduce((a, p) => a + p.length - 1, 0);
  const inset = ZB.outline[0][0];
  const lw = ['F.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts'], lb = ['B.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts'];
  let tok = 0;
  const outline = (z, label) => B2.annotate((g, mk) => {
    const d = 'M' + z.outline.map(p => p.join(' ')).join('L') + 'Z';
    mk.el('path', { d, fill: 'none', stroke: 'var(--hl)', 'stroke-width': 0.18, 'stroke-dasharray': '0.8 0.4' });
    for (let x = z.outline[0][0] + 1; x < z.outline[1][0]; x += 1.6) mk.el('path', { d: `M${x} ${z.outline[0][1]}l0.6 0.6`, stroke: 'var(--hl)', 'stroke-width': 0.1, fill: 'none' });
    mk.label(D.board.w * 0.36, z.outline[0][1] + 2.4, label);
  });
  const slots = () => B2.annotate((g, mk) => {
    bTr.forEach(t => mk.el('line', { x1: t[3], y1: t[4], x2: t[5], y2: t[6], stroke: 'var(--hl)', 'stroke-width': t[2] + 0.5, 'stroke-linecap': 'round', opacity: 0.85 }));
  });
  // 放大看间隙：找一段底层走线的中点
  const gapT = bTr.slice().sort((a, b) => trackLen(b) - trackLen(a))[0];
  const gx = (gapT[3] + gapT[5]) / 2, gy = (gapT[4] + gapT[6]) / 2;
  const STEPS = [
    { t: '① 画外框', h: '先画一个框，还没有铜', layers: ['B.Cu', 'Vias', 'Drill', 'Edge.Cuts'],
      p: `在 KiCad 里，铺铜一开始只是一个框：层 B.Cu、网络 GND。QB12 的框离板边 ${inset} mm（和“铜到板边”的最小距离 ${RU.min_copper_edge_clearance} mm 一样），框里现在还是空的，只有走线、焊盘和过孔。`,
      f: [['网络', 'GND'], ['外框', `${tr(ZB.outline[1][0] - ZB.outline[0][0])} × ${tr(ZB.outline[2][1] - ZB.outline[1][1])} mm`], ['状态', '未填充（KiCad 里按 Ctrl+B 就是这个样子）'], ['未布线', `${UNROUTED_UNFILLED} 处：只靠铺铜连着的接地连接，现在全断着`]],
      run: async () => { outline(ZB, 'GND 覆铜区外框（未填充）'); } },
    { t: '② 填充底层', h: '按 B：底层铺满', layers: lb,
      p: `按 <kbd>B</kbd>，KiCad 把框里能放铜的地方全填上：别的网络的线、焊盘、过孔周围让出 ${ZB.clearance} mm；天线禁布区不填；比 ${ZB.min_width} mm 还窄的细条不要；没接到 GND 的孤岛删掉。剩下的就是这一大片。`,
      f: [['面积', `${Math.round(aB)} mm²，占板子 ${pct(aB, area)}%`], ['块数', `${fB.polys.length} 整块（里面 ${holesB} 个让出来的洞）`], ['间隙 · 最小宽度', `${ZB.clearance} · ${ZB.min_width} mm`]],
      run: async (t) => { await B2.reveal('Zones', { duration: 1.1 }); } },
    { t: '③ 底层的缝', h: '底层走线切出的缝', layers: lb,
      p: `黄色是走在底层的 ${bTr.length} 段信号和电源线（${bNets.length} 个网络，共 ${fmt1(bTotal)} mm）。铺铜给它们每根都让出一条缝，5.3 说的“绕路”就发生在这些缝上。最长的几根：${bNets.slice(0, 3).map(net).join('、')}。`,
      f: [['底层走线', `${bTr.length} 段，${fmt1(bTotal)} mm`], ['顶层走线', `${S.tracks_F} 段，${fmt1(S.track_len_F)} mm`]],
      run: async () => { slots(); } },
    { t: '④ 填充顶层', h: '顶层也铺满', layers: lw,
      p: `顶层元件多、线多，铺铜被切成了 ${fF.polys.length} 块。每一块都要靠过孔接到底层的地，否则就是孤岛，会被删掉（死铜移除：总是启用）。脚本最后还检查了一遍：每块铜都连在主地上。`,
      f: [['面积', `${Math.round(aF)} mm²，占板子 ${pct(aF, area)}%`], ['块数', `${fF.polys.length} 块`], ['焊盘连接', ZF.pad_connection === 'solid' ? '实心（5.5）' : ZF.pad_connection]],
      run: async () => { await B2.reveal('Zones', { duration: 1.1 }); } },
    { t: '⑤ 两层缝在一起', h: '两层 + 接地过孔', layers: ['F.Cu', 'B.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts'],
      p: `两层叠在一起看：底层的缝上面大多盖着顶层的地，${S.gnd_vias} 个接地孔（黄圈）把两层、把每个接地焊盘连成同一块地。回流电流在哪一层走不通，就从最近的孔换到另一层。`,
      f: [['接地孔', `${S.gnd_vias} 个`], ['顶层 / 底层', `${pct(aF, area)}% / ${pct(aB, area)}%`]],
      run: async () => { B2.highlightVias(['stitch', 'fanout', 'thermal', 'module']); } },
    { t: '⑥ 放大看间隙', h: '铜和别的网络之间的缝', layers: lb,
      p: `放大到一段底层走线（${net(NETN(gapT[0]))}）：铺铜沿着它让出 ${ZB.clearance} mm 的缝，过孔、焊盘周围也一样。这个间隙比网络类的 ${cls('Default').clearance} mm 大一点，留点余量；再大，铜就钻不进元件之间的窄缝了。`,
      f: [['电气间隙', `${ZB.clearance} mm`], ['最小宽度', `${ZB.min_width} mm（比这还窄的铜条不留）`], ['死铜移除', ZB.island_removal === 'always' ? '总是启用' : ZB.island_removal]],
      run: async () => {
        B2.focus([gx - 3, gy - 2, gx + 3, gy + 2], { pad: 0.2 });
        // 在走线一侧画出间隙的尺寸线（字号自己定，查看器 label() 的字放大后太大）
        const L = trackLen(gapT), ux = (gapT[5] - gapT[3]) / L, uy = (gapT[6] - gapT[4]) / L, nx = -uy, ny = ux, w = gapT[2] / 2, c = ZB.clearance;
        const P = [gx + nx * w, gy + ny * w], Q = [gx + nx * (w + c), gy + ny * (w + c)];
        B2.annotate((g, mk) => {
          mk.el('path', { d: `M${P[0]} ${P[1]}L${Q[0]} ${Q[1]}M${P[0] - ux * .25} ${P[1] - uy * .25}l${ux * .5} ${uy * .5}M${Q[0] - ux * .25} ${Q[1] - uy * .25}l${ux * .5} ${uy * .5}`, style: 'stroke:var(--hl);stroke-width:.05;fill:none' });
          const anc = nx < -0.3 ? 'end' : 'start';
          mk.el('text', { x: Q[0] + nx * 0.15, y: Q[1] + ny * 0.15 + 0.06, 'text-anchor': anc, style: 'font-size:.17px;stroke-width:.035' }, null, `${c} mm`);
          mk.el('text', { x: Q[0] + nx * 0.15, y: Q[1] + ny * 0.15 + 0.3, 'text-anchor': anc, style: 'font-size:.13px;stroke-width:.03' }, null, `${NETN(gapT[0])} 线宽 ${gapT[2]} mm`);
        });
      } }
  ];
  $('psteps').innerHTML = STEPS.map((s, i) => `<button class="btn" data-ps="${i}" aria-pressed="false">${s.t}</button>`).join('');
  async function go(i) {
    const s = STEPS[i], my = ++tok;
    C.pressOne('#p5-psteps [data-ps]', 'ps', i);
    $('p-title').textContent = s.h;
    $('p-what').innerHTML = s.p;
    $('p-facts').innerHTML = s.f.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
    B2.clear().clearAnnotations();
    B2.show({ layers: s.layers, mode: 'layers', side: 'top' });
    if (i !== 5) B2.reset();
    B2.badge(s.t);
    try { await s.run(my); } catch (e) { console.error(e); }
  }
  $('psteps').addEventListener('click', e => { const b = e.target.closest('[data-ps]'); if (b) go(+b.dataset.ps); });
  $('pro').innerHTML =
    `<div class="ro"><small>顶层铺地</small><b>${Math.round(aF)} mm²</b><small>占板子 ${pct(aF, area)}%</small></div>` +
    `<div class="ro"><small>底层铺地</small><b>${Math.round(aB)} mm²</b><small>占板子 ${pct(aB, area)}%</small></div>` +
    `<div class="ro"><small>电气间隙 · 最小宽度</small><b>${ZB.clearance} · ${ZB.min_width} mm</b></div>` +
    `<div class="ro"><small>焊盘连接 · 死铜</small><b>${ZB.pad_connection === 'solid' ? '实心' : ZB.pad_connection} · ${ZB.island_removal === 'always' ? '总是删' : ZB.island_removal}</b></div>`;
  $('zclr').textContent = ZB.clearance;
  go(0);
  return { go };
})();

/* =====================================================================
   5.5 实心 vs 花焊盘：热扩散示意
   ===================================================================== */
(function () {
  const NX = 60, NY = 40, CELL = 6;
  const PAD = [26, 34, 15, 25];                     // 0.8 × 1.0 mm（每格 0.1 mm）
  const GAP = 5, SPOKE = 4;                         // 间隙 0.5 mm（KiCad 默认），辐条 0.4 mm
  const MELT = 0.6, STEPS = 900, RATE = 280;          // 一次跑 900 步，约 3.2 秒
  const inPad = (x, y) => x >= PAD[0] && x < PAD[1] && y >= PAD[2] && y < PAD[3];
  function grid(relief) {
    const k = new Float32Array(NX * NY), cx = (PAD[0] + PAD[1]) / 2, cy = (PAD[2] + PAD[3]) / 2;
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
      let c = 1;
      if (relief && !inPad(x, y) && x >= PAD[0] - GAP && x < PAD[1] + GAP && y >= PAD[2] - GAP && y < PAD[3] + GAP)
        c = (Math.abs(y + 0.5 - cy) < SPOKE / 2 || Math.abs(x + 0.5 - cx) < SPOKE / 2) ? 1 : 0.03;
      k[y * NX + x] = c;
    }
    return k;
  }
  const KS = grid(false), KR = grid(true);
  function sim(k) { return { k, T: new Float32Array(NX * NY), N: new Float32Array(NX * NY), hist: [] }; }
  function step(m, mode, s) {
    const { k } = m; let T = m.T, N = m.N;
    const r = 0.24, edge = 0.06, P = 0.02;
    const tov = mode === 'oven' ? Math.min(1, s / STEPS * 1.4) : 0, bT = tov;
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
      const i = y * NX + x, ki = k[i]; let d = 0;
      const nb = j => { const kj = k[j]; d += r * (2 * ki * kj / (ki + kj)) * (T[j] - T[i]); };
      if (x > 0) nb(i - 1); else d += edge * (bT - T[i]);
      if (x < NX - 1) nb(i + 1); else d += edge * (bT - T[i]);
      if (y > 0) nb(i - NX); else d += edge * (bT - T[i]);
      if (y < NY - 1) nb(i + NX); else d += edge * (bT - T[i]);
      if (mode === 'iron') { if (inPad(x, y)) d += P * (1 - T[i]); d -= 0.0005 * T[i]; }
      else d += 0.004 * (tov - T[i]);
      N[i] = T[i] + d;
    }
    m.T = N; m.N = T;
    let a = 0, n = 0;
    for (let y = PAD[2]; y < PAD[3]; y++) for (let x = PAD[0]; x < PAD[1]; x++) { a += m.T[y * NX + x]; n++; }
    m.hist.push(a / n);
  }
  const hexRGB = s => { s = (s || '').trim(); if (s[0] !== '#') return [128, 128, 128]; if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]; return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); };
  const root = $('hs').closest('#p5');
  let COL = null;
  const readCol = () => { const cs = getComputedStyle(root); COL = { cu: hexRGB(cs.getPropertyValue('--p5-cucold')), fr: hexRGB(cs.getPropertyValue('--p5-gap')), h1: hexRGB(cs.getPropertyValue('--p5-hot1')), h2: hexRGB(cs.getPropertyValue('--p5-hot2')), fg: cs.getPropertyValue('--fg').trim() || '#fff', hl: cs.getPropertyValue('--hl').trim() || '#fc0' }; };
  const SCV = document.createElement('canvas'); SCV.width = NX; SCV.height = NY;
  const SCTX = SCV.getContext('2d'), SMALL = SCTX.createImageData(NX, NY);
  function paint(cv, m, mode, showIron) {
    const ctx = cv.getContext('2d'), px = SMALL.data;
    for (let i = 0; i < NX * NY; i++) {
      const cu = m.k[i] > 0.5, base = cu ? COL.cu : COL.fr;
      const a = Math.max(0, Math.min(1, m.T[i] / 0.85)) * (cu ? 1 : 0.7);
      for (let j = 0; j < 3; j++) px[i * 4 + j] = a < 0.5 ? base[j] + (COL.h1[j] - base[j]) * a * 2 : COL.h1[j] + (COL.h2[j] - COL.h1[j]) * (a - 0.5) * 2;
      px[i * 4 + 3] = 255;
    }
    SCTX.putImageData(SMALL, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(SCV, 0, 0, NX * CELL, NY * CELL);
    const pv = m.hist.length ? m.hist[m.hist.length - 1] : 0;
    ctx.lineWidth = 2; ctx.strokeStyle = pv >= MELT ? COL.hl : COL.fg;
    ctx.strokeRect(PAD[0] * CELL + 1, PAD[2] * CELL + 1, (PAD[1] - PAD[0]) * CELL - 2, (PAD[3] - PAD[2]) * CELL - 2);
    const sc = cv.width / Math.max(120, cv.clientWidth || cv.width);       // 画布被 CSS 缩小时，字也要跟着放大
    ctx.font = `600 ${Math.round(13 * Math.max(1, sc))}px ` + (getComputedStyle(root).getPropertyValue('--f-body') || 'sans-serif');
    ctx.fillStyle = COL.fg; ctx.textAlign = 'center';
    ctx.fillText(pv >= MELT ? '化锡了' : mode ? '加热中…' : '接地焊盘', (PAD[0] + PAD[1]) / 2 * CELL, PAD[3] * CELL + 46);
    if (showIron) { ctx.beginPath(); ctx.arc((PAD[0] + PAD[1]) / 2 * CELL, (PAD[2] + PAD[3]) / 2 * CELL, 9, 0, Math.PI * 2); ctx.fillStyle = COL.fg; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1; }
  }
  const chart = $('hc');
  const CX0 = 34, CX1 = 290, CY0 = 14, CY1 = 170;
  const yOf = v => CY1 - Math.min(1, v) * (CY1 - CY0), xOf = i => CX0 + i / STEPS * (CX1 - CX0);
  function drawChart(A, B, mode) {
    chart.innerHTML = '';
    C.el('path', { d: `M${CX0} ${CY0}V${CY1}H${CX1}`, class: 'p5-h-ax', fill: 'none' }, chart);
    C.el('path', { d: `M${CX0} ${yOf(MELT)}H${CX1}`, class: 'p5-h-melt' }, chart);
    C.el('text', { x: CX1, y: yOf(MELT) - 5, 'text-anchor': 'end', class: 'p5-t hl' }, chart, '锡熔化');
    C.el('text', { x: CX0, y: 192, class: 'p5-t mu' }, chart, '时间 →');
    C.el('text', { x: 8, y: CY0 + 8, class: 'p5-t mu' }, chart, '热');
    C.el('text', { x: 8, y: CY1, class: 'p5-t mu' }, chart, '冷');
    const line = (h, c) => h.length > 1 && C.el('path', { d: 'M' + h.map((v, i) => `${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).filter((_, i) => i % 3 === 0 || i === h.length - 1).join('L'), class: c }, chart);
    line(A.hist, 'p5-h-s'); line(B.hist, 'p5-h-r');
    const tA = A.hist.findIndex(v => v >= MELT), tB = B.hist.findIndex(v => v >= MELT);
    if (tA >= 0) C.el('path', { d: `M${xOf(tA)} ${yOf(MELT)}V${CY1}`, class: 'p5-h-mk', stroke: 'var(--pow)' }, chart);
    if (tB >= 0) C.el('path', { d: `M${xOf(tB)} ${yOf(MELT)}V${CY1}`, class: 'p5-h-mk', stroke: 'var(--sig)' }, chart);
    C.el('text', { x: CX0 + 8, y: CY0 + 12, class: 'p5-t m', fill: 'var(--pow)', style: 'fill:var(--pow)' }, chart, '— 实心');
    C.el('text', { x: CX0 + 70, y: CY0 + 12, class: 'p5-t m', style: 'fill:var(--sig)' }, chart, '— 花焊盘');
    return [tA, tB];
  }
  let A = sim(KS), B = sim(KR), mode = null, s = 0, tick = null;
  function status(tA, tB, done) {
    const st = $('hst');
    if (!mode) { st.className = 'status'; st.textContent = '点上面的按钮：左边实心连接、右边花焊盘，同时加热。'; return; }
    if (mode === 'iron') {
      if (tB >= 0 && tA < 0) { st.className = 'status bad'; st.textContent = done ? '花焊盘很快化锡；实心焊盘的热被整片铺铜带走，一直到不了熔锡温度。手工焊这种焊盘，要换功率更大的烙铁或者先预热。' : '花焊盘已经化锡，实心的还差得远……'; }
      else if (tA >= 0 && tB >= 0) { st.className = 'status warn'; st.textContent = `两个都化锡了，但实心的慢了 ${(tA / Math.max(1, tB)).toFixed(1)} 倍。`; }
      else { st.className = 'status'; st.textContent = '烙铁只加热焊盘，热量往四周的铜里漏……'; }
    } else {
      if (tA >= 0 && tB >= 0) { st.className = 'status good'; st.textContent = '回流炉里整块板一起升温，铺铜自己也是热的：两种接法化锡的先后差得比用烙铁小得多（这个简化模型里几乎看不出）。但真板上差别没有完全消失，小阻容两头一快一慢，就是第 2 课讲的立碑。'; }
      else { st.className = 'status'; st.textContent = '热风把整块板一起慢慢加热……'; }
    }
  }
  function render(done) {
    if (!COL) readCol();
    paint($('hs'), A, mode, mode === 'iron' && !done);
    paint($('hr'), B, mode, mode === 'iron' && !done);
    const [tA, tB] = drawChart(A, B, mode);
    status(tA, tB, done);
    $('hlab').textContent = mode ? (done ? '结束' : mode === 'iron' ? '烙铁加热中' : '回流炉加热中') : '';
  }
  function run(m) {
    if (tick) { C.tickers.delete(tick); tick = null; }
    readCol();
    A = sim(KS); B = sim(KR); mode = m; s = 0;
    C.pressOne('#p5 .p5-hbtn', 'm', m);
    if (RMx) { for (; s < STEPS; s++) { step(A, m, s); step(B, m, s); } render(true); return; }
    const t0 = performance.now();
    tick = () => {
      const target = Math.min(STEPS, Math.floor((performance.now() - t0) / 1000 * RATE));   // 按时间推进，帧慢了就多算几步
      for (; s < target; s++) { step(A, m, s); step(B, m, s); }
      const done = s >= STEPS;
      render(done);
      if (done) { C.tickers.delete(tick); tick = null; }
    };
    C.tickers.add(tick);
  }
  $('iron').classList.add('p5-hbtn'); $('iron').dataset.m = 'iron';
  $('oven').classList.add('p5-hbtn'); $('oven').dataset.m = 'oven';
  $('iron').addEventListener('click', () => run('iron'));
  $('oven').addEventListener('click', () => run('oven'));
  readCol(); render(false);
  C.onVisible($('hs'), () => { if (!mode) run('iron'); }, '-80px');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', () => { readCol(); render(s >= STEPS); });
  // 文字
  $('htxt1').innerHTML = `QB12 两层铺地都设成了<strong>实心</strong>（route_b.py 里写的就是 ZONE_CONNECTION_FULL）。脚本只写了实心，没写理由；可以这样理解：一，坐标文件里 ${D.fab.cpl.length} 个元件全部由嘉立创贴片、过回流炉，整板一起加热，实心焊盘也焊得上；二，U2、U4 的散热焊盘要把热尽量多地导进铺铜，花焊盘只剩几根辐条，热路一下子窄了；三，Espressif 要求芯片和周围器件的地焊盘和地铜“充分接触”，不要靠走线连。嘉立创的铺铜指南则建议铺铜面上的焊盘用十字焊盘，理由正是铜导热快、影响焊接。两种做法都有道理，关键看这块板怎么焊。`;
})();

/* =====================================================================
   5.6 禁布区
   ===================================================================== */
const B3 = BoardViewer.create($('bv3'), {
  toolbar: 'mini', panel: false, hover: true,
  layers: ['F.Cu', 'B.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts', 'F.SilkS', 'Keepouts'],
  label: 'QB12 的三块禁布区'
});
const KEEPS = (function () {
  const flagsZh = [['tracks', '走线'], ['vias', '过孔'], ['pour', '铺铜'], ['pads', '焊盘'], ['footprints', '封装']];
  const sz = b => `${tr(b[2] - b[0])} × ${tr(b[3] - b[1])} mm`;
  const TXT = {
    antenna: { layers: ['F.Cu', 'B.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts', 'F.SilkS', 'Keepouts'], hl: () => B3.highlightVias(v => stitchAnt.includes(v)),
      why: `ESP32-S3 模组最上面一段是印在模组板上的 2.4 GHz 天线（Wi‑Fi 和蓝牙共用）。天线附近有铜会让天线失谐、把电磁波挡回去，天线下面有铜，蓝牙距离就会变短。所以这一块两层都不许走线、不许打孔、不许铺铜。模组手册的焊盘图上天线区约 6 mm 深，QB12 的禁布区从板边往下 ${tr(antB[3] - antB[1])} mm，把它整个盖住。`,
      more: `Espressif 的设计指南要求更高：最好让天线伸出板外，伸不出去就把天线两侧和下面的板子切掉，装进外壳后天线四周最好留 15 mm；天线附近要有足够的地铜和密集的地过孔。11-11 下水实测，手柄蓝牙不到 10 m 就断了。Rev B 计划换成带外接天线的模组 ESP32-S3-WROOM-1U，船上竖一根 5–10 cm 的天线杆。QB12 Rev A 没有切板，只是两层都不放铜；禁布区下边往下 ${n2(stitchAntDy)} mm 有一排 ${stitchAnt.length} 个缝合孔（黄圈）。` },
    module: { layers: ['F.Cu', 'B.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts', 'Keepouts'], hl: () => B3.highlightVias('module'),
      why: `U1 肚子下面 3 × 3 块接地焊盘的那一圈，${sz(modk.bbox)}。只禁走线，两层都禁；过孔和铺铜都可以。目的是不让 Freerouting 把线穿过这里，把焊盘之间的空位留给 ${R.module} 个模组接地孔（黄圈）。`,
      more: '这块禁布区的用处和天线那块正好相反：天线那块是“这里一点铜都不要”，这块是“这里只留给地”。' },
    usb: { layers: ['F.Cu', 'Zones', 'Vias', 'Drill', 'Edge.Cuts', 'F.SilkS', 'Keepouts'], hl: () => B3.highlightNet(['USB_DP', 'USB_DN', 'CC1', 'CC2', 'VBUS']),
      why: `USB-C 插座 J1 的金属外壳底下，${sz(clipB(usbk.bbox))}，只禁<strong>顶层</strong>走线。外壳是金属的、接地，直接压在板面上；顶层的线和它之间只隔着一层阻焊（JLC 写的厚度是 ≥10 µm，很薄），挤压、划伤就可能和外壳短路（推导）。`,
      more: '铺铜和过孔照样可以：铺的是 GND，外壳本来就接地。底层不受影响，线可以从外壳下面的底层穿过。亮着的是 USB 的几根线：J1 的信号脚排在外壳上方，线都从上面出去。' }
  };
  $('kn').textContent = KEEP.length;
  $('keeps').innerHTML = KEEP.map(z => `<button class="btn" data-k="${z.id}" aria-pressed="false">${z.label}<span class="p5-n">${z.layers.length > 1 ? '两层' : '顶层'}</span></button>`).join('');
  function go(id) {
    const z = keep(id), t = TXT[id];
    C.pressOne('#p5-keeps [data-k]', 'k', id);
    $('k-title').textContent = `${z.label}（${z.layers.join(' + ')}）`;
    $('k-flags').innerHTML = flagsZh.map(([k, zh]) => `<div class="p5-flag ${z.keepout[k] ? 'no' : 'yes'}"><small>${zh}</small><b>${z.keepout[k] ? '✗ 禁止' : '✓ 可以'}</b></div>`).join('');
    $('k-why').innerHTML = t.why;
    $('k-facts').innerHTML = [['大小', sz(clipB(z.bbox))], ['位置', `x ${tr(clipB(z.bbox)[0])}–${tr(clipB(z.bbox)[2])}，y ${tr(clipB(z.bbox)[1])}–${tr(clipB(z.bbox)[3])} mm`], ['', t.more]].map(([a, b]) => a ? `<div><span>${a}</span><span>${b}</span></div>` : `<p class="cap" style="padding:0">${b}</p>`).join('');
    B3.clear().clearAnnotations();
    B3.show({ layers: t.layers });
    t.hl();
    B3.badge(z.label);
    const b = clipB(z.bbox);
    B3.focus(id === 'antenna' ? [b[0], b[1], b[2], b[3] + 3] : id === 'usb' ? [b[0] - 2, b[1] - 6, b[2] + 2, b[3]] : b, { pad: id === 'module' ? 2.5 : 1.5 });
  }
  $('keeps').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) go(b.dataset.k); });
  go('antenna');
  return { go };
})();

/* =====================================================================
   5.7 自测
   ===================================================================== */
(function () {
  const ringS = (SM[0] - SM[1]) / 2;
  $('q1').innerHTML = `（${SM[0]} − ${SM[1]}）÷ 2 = <strong>${n2(ringS)} mm</strong>，比 QB12 自己定的最小焊环 ${RU.min_via_annular_width} mm 宽，也远高于嘉立创“外径至少比孔大 ${JLC.minDiff} mm、推荐大 ${JLC.recDiff} mm”的要求。改成 0.4 / 0.3：焊环只剩 ${n2((0.4 - 0.3) / 2)} mm，外径只比孔大 ${n2(0.4 - 0.3)} mm，刚压在嘉立创能做的底线上、低于推荐值；QB12 的 DRC 会报两条错（外径小于 ${RU.min_via_diameter} mm、焊环小于 ${RU.min_via_annular_width} mm）；而且焊环比孔位公差 ${JLC.posTol} mm 还窄，钻偏到极限会把焊盘边钻破。`;
  $('q2').innerHTML = `因为底层并不完整：${bTr.length} 段底层走线（${bNets.length} 个网络，共 ${fmt1(bTotal)} mm）在地上切出了一道道缝，回流电流碰到缝只能绕路，回路变大（5.3）。顶层的地铺在这些缝的上方，${R.stitch} 个缝合孔把两层的地缝成一整块，回流就能就近换层跨过去。缝合孔还让每一块铜都牢牢接地，不会自己变成天线（嘉立创：地过孔间距小于波长的 1/20）。`;
  $('q3').innerHTML = `<strong>${thU2.length + fpHolesU2.length} 个</strong>：封装自带 ${fpHolesU2.length} 个（2 × 2），脚本又补了 ${thU2.length} 个十字排开的 ${GP.via.join(' / ')} mm 散热过孔，把芯片的热从顶层焊盘导到底层整片地。用实心连接（脚本没写理由，按常理推）：这块焊盘要把热尽量多地送进铺铜，花焊盘只剩几根辐条，热路窄了；而 QB12 由嘉立创贴片、过回流炉，整块板一起加热，实心焊盘一般也焊得上。代价是以后用烙铁返修 U2 很难加热。`;
  document.querySelectorAll('#p5 [data-p5q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p5q;
    if (q === '1') { VIA.set(0.4, 0.3); scrollTo(VIA.el); }
    else if (q === '2') { scrollTo($('bv1')); goRole('stitch'); }
    else { scrollTo($('bv1')); goRole('thermal'); }
  }));
})();
