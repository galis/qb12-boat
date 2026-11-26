/* 第 4 课：走线。关于 QB12 的数字都从 QB.board（真实设计文件抽出来的数据）现算；
   外部事实（IPC-2221、嘉立创能力、USB、KiCad 菜单）的出处见 lessons/p4_notes.md（facts.md 的 [Sxx]）。 */
const D = QB.board, S = D.stats;
const $ = id => document.getElementById('p4-' + id);
const RMx = C.RM;
const wait = ms => new Promise(r => setTimeout(r, ms));
const num = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
const f1 = v => num(v, 1), f2 = v => num(v, 2), f3 = v => num(v, 3);
const cls = name => D.classes.find(c => c.name === name);
const NI = n => QB.netIndex(n);
const NN = i => D.nets[i].name;
const tag = n => { const c = QB.netCls(n); return `<span class="net ${c === 's' ? 's' : c === 'p' ? 'p' : ''}">${n}</span>`; };
const segLen = t => Math.hypot(t[5] - t[3], t[6] - t[4]);
const same = (a, b) => Math.abs(a - b) < 1e-6;
const GNDI = NI('GND');
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const toView = el => el.scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });

/* ---------- 物理：铜的电阻（第一性原理）+ IPC-2221 外层公式 ---------- */
const RHO = 1.72e-8;                          // Ω·m，铜在 20 °C 的电阻率
const T_CU = 0.035;                           // mm，1 oz 铜的名义厚度（约 35 µm）
const RSQ = RHO / (T_CU * 1e-3) * 1e3;        // 方块电阻 mΩ/□（≈ 0.49）
const mOhm = (L, w) => RSQ * L / w;           // 长 L、宽 w（mm）的一段线，mΩ
const aMil2 = w => w / 0.0254 * 1.378;        // 1 oz 截面积，mil²
const ipcI = (w, dT) => 0.048 * Math.pow(dT, 0.44) * Math.pow(aMil2(w), 0.725);          // 允许电流 A
const ipcDT = (w, I) => Math.pow(I / (0.048 * Math.pow(aMil2(w), 0.725)), 1 / 0.44);   // 升温 °C

/* ---------- 焊盘命中、网络里两点之间的最短路 ---------- */
function inPad(p, x, y, tol) {
  const t = tol == null ? 0.05 : tol;
  if (p.s === 'circle') return Math.hypot(x - p.x, y - p.y) <= p.w / 2 + t;
  const a = (p.a || 0) * Math.PI / 180, dx = x - p.x, dy = y - p.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  let w = p.w, h = p.h;
  if (p.poly) { w = Math.max(...p.poly[0].map(q => Math.abs(q[0] - p.x))) * 2 + 0.2; h = Math.max(...p.poly[0].map(q => Math.abs(q[1] - p.y))) * 2 + 0.2; }
  return Math.abs(lx) <= w / 2 + t && Math.abs(ly) <= h / 2 + t;
}
const padsOn = (ref, net) => QB.fp(ref).pads.filter(p => p.net === NI(net) && p.t !== 'npth');
function netPath(name, refA, refB) {
  const ni = NI(name), T = [];
  D.tracks.forEach((t, i) => { if (t[0] === ni) T.push(i); });
  const key = (x, y) => Math.round(x * 100) + ',' + Math.round(y * 100);
  const adj = new Map();
  const link = (u, v, w, i) => {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u).push([v, w, i]); adj.get(v).push([u, w, i]);
  };
  T.forEach(i => { const t = D.tracks[i]; link(key(t[3], t[4]), key(t[5], t[6]), segLen(t), i); });
  const attach = (ref, node) => {
    const ps = padsOn(ref, name);
    T.forEach(i => {
      const t = D.tracks[i];
      [[t[3], t[4]], [t[5], t[6]]].forEach(([x, y]) => { if (ps.some(p => p.cu.includes(t[1] ? 'B' : 'F') && inPad(p, x, y))) link(node, key(x, y), 0, -1); });
    });
  };
  attach(refA, '#A'); attach(refB, '#B');
  const dist = new Map([['#A', 0]]), prev = new Map(), done = new Set();
  for (;;) {
    let u = null, du = Infinity;
    dist.forEach((d, k) => { if (!done.has(k) && d < du) { du = d; u = k; } });
    if (u === null || u === '#B') break;
    done.add(u);
    (adj.get(u) || []).forEach(([v, w, i]) => { if (du + w < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, du + w); prev.set(v, [u, i]); } });
  }
  const segs = [];
  for (let u = '#B'; prev.has(u); u = prev.get(u)[0]) { const i = prev.get(u)[1]; if (i >= 0) segs.push(i); }
  const byW = {};
  segs.forEach(i => { const t = D.tracks[i]; byW[t[2]] = (byW[t[2]] || 0) + segLen(t); });
  return { ok: dist.has('#B'), segs, byW, lenB: sum(segs.filter(i => D.tracks[i][1] === 1), i => segLen(D.tracks[i])), len: sum(segs, i => segLen(D.tracks[i])), r: sum(segs, i => mOhm(segLen(D.tracks[i]), D.tracks[i][2])), layers: new Set(segs.map(i => D.tracks[i][1])) };
}
const netR = name => sum(D.tracks.filter(t => t[0] === NI(name)), t => mOhm(segLen(t), t[2]));

/* 电池 → Q2 → Q1 → DRV8833 的 VM 脚：电机电流走的那条路（三个网络首尾相接） */
const LEGS = [['BAT+', 'J2', 'Q2'], ['BAT_SW', 'Q2', 'Q1'], ['VSYS', 'Q1', 'U2']].map(([n, a, b]) => Object.assign({ net: n, a, b }, netPath(n, a, b)));
const BP = { len: sum(LEGS, l => l.len), r: sum(LEGS, l => l.r), byW: {} };
LEGS.forEach(l => { for (const w in l.byW) BP.byW[w] = (BP.byW[w] || 0) + l.byW[w]; });
const bpWidths = Object.entries(BP.byW).sort((a, b) => b[0] - a[0]).map(([w, L]) => `${w} mm 宽 ${f1(L)} mm`).join(' + ');

/* 两路电机一起起步的电流：电路课第 8 课（每路限流 0.2 V ÷ 0.2 Ω = 1 A） */
const I_MOT = 1, I_START = 2;
const lhn = $('h-n'); if (lhn) lhn.textContent = S.tracks;

/* ================= 4.1 线宽计算器 ================= */
(function () {
  const svg = $('wsvg'), K = 30, X0 = 22, X1 = X0 + 10 * K, YC = 78;
  C.el('text', { x: X0 - 8, y: 20, class: 'p4-t' }, svg, '俯视：10 mm 长的一段线（长、宽同一比例）');
  C.el('rect', { x: X0 - 8, y: 32, width: 10 * K + 16, height: 92, rx: 6, class: 'p4-sub' }, svg);
  const heat = C.el('rect', { x: X0 - 4, width: 10 * K + 8, rx: 6, class: 'p4-heat', opacity: 0 }, svg);
  const cu = C.el('rect', { x: X0, width: 10 * K, class: 'p4-cu' }, svg);
  const dotsG = C.el('g', {}, svg);
  const dim = C.el('path', { class: 'p4-dim' }, svg);
  const dimT = C.el('text', { x: X1 + 14, y: YC + 5, class: 'p4-t big' }, svg, '');
  C.el('text', { x: X0 - 8, y: 152, class: 'p4-t' }, svg, '截面（示意：厚度放大 10 倍画）');
  C.el('rect', { x: X0 - 8, y: 196, width: 10 * K + 16, height: 34, class: 'p4-fr4' }, svg);
  C.el('text', { x: X0, y: 218, class: 'p4-t' }, svg, 'FR-4 基材');
  const TH = T_CU * K * 10;
  const xs = C.el('rect', { y: 196 - TH, height: TH, class: 'p4-cu' }, svg);
  const xsT = C.el('text', { x: X0 + 5 * K, y: 196 - TH - 8, class: 'p4-t mono', 'text-anchor': 'middle' }, svg, '');
  const TX = 410, TW = 18, TY0 = 40, TY1 = 196, TMAX = 120;
  const ty = v => TY1 - Math.min(v, TMAX) / TMAX * (TY1 - TY0);
  C.el('text', { x: TX + TW / 2, y: 22, 'text-anchor': 'middle', class: 'p4-t' }, svg, '升温');
  C.el('rect', { x: TX, y: TY0 - 8, width: TW, height: TY1 - TY0 + 14, rx: TW / 2, class: 'p4-tube' }, svg);
  C.el('circle', { cx: TX + TW / 2, cy: TY1 + 16, r: 14, class: 'p4-tube' }, svg);
  const merc = C.el('rect', { x: TX + 4, width: TW - 8, rx: 3, class: 'p4-merc' }, svg);
  const bulb = C.el('circle', { cx: TX + TW / 2, cy: TY1 + 16, r: 10, class: 'p4-merc' }, svg);
  [0, 10, 50, 100].forEach(v => {
    C.el('line', { x1: TX + TW + 2, x2: TX + TW + 8, y1: ty(v), y2: ty(v), class: 'p4-tick' + (v === 10 ? ' t10' : '') }, svg);
    if (v) C.el('text', { x: TX + TW + 11, y: ty(v) + 4, class: 'p4-t mono' }, svg, v + '°');
  });

  const AMPS = [[0.1, 'ESP32 平均'], [0.3, 'ESP32 发射峰值'], [0.55, '充电'], [I_MOT, '一路电机（限流）'], [I_START, '两路电机起步']];
  const marks = D.classes.slice().sort((a, b) => a.track - b.track);
  $('wmarks').innerHTML = '<span class="lab">QB12 的线宽</span>' + marks.map(c => `<button class="btn" data-w="${c.track}" aria-pressed="false">${c.track}<small>${c.name}</small></button>`).join('');
  $('amps').innerHTML = '<span class="lab">电流</span>' + AMPS.map(([a, t]) => `<button class="btn" data-a="${a}" aria-pressed="false">${a} A<small>${t}</small></button>`).join('');
  const slider = $('w');
  let w = 0.8, I = I_START, fl = null, flKey = '';
  function dTtext(dT) { return dT < 1 ? '< 1 °C' : dT > 200 ? '> 200 °C' : (dT < 20 ? f1(dT) : Math.round(dT)) + ' °C'; }
  function upd() {
    const wpx = w * K, dT = ipcDT(w, I), q = Math.max(0, Math.min(1, dT / 100));
    const fill = `color-mix(in srgb, var(--pow) ${Math.round(q * 85)}%, #C27A3E)`;
    cu.setAttribute('y', YC - wpx / 2); cu.setAttribute('height', wpx); cu.style.fill = fill;
    heat.setAttribute('y', YC - wpx / 2 - 6); heat.setAttribute('height', wpx + 12); heat.setAttribute('opacity', (q * 0.5).toFixed(2));
    dim.setAttribute('d', `M${X1 + 3} ${YC - wpx / 2}H${X1 + 11}M${X1 + 7} ${YC - wpx / 2}V${YC + wpx / 2}M${X1 + 3} ${YC + wpx / 2}H${X1 + 11}`);
    dimT.textContent = f2(w) + ' mm';
    xs.setAttribute('x', X0 + 5 * K - wpx / 2); xs.setAttribute('width', wpx); xs.style.fill = fill;
    xsT.textContent = `宽 ${f2(w)} × 厚 ${T_CU} mm`;
    const lvl = dT <= 10 ? '' : dT <= 30 ? ' warn' : ' bad';
    merc.setAttribute('class', 'p4-merc' + lvl); bulb.setAttribute('class', 'p4-merc' + lvl);
    merc.setAttribute('y', ty(dT)); merc.setAttribute('height', Math.max(0, TY1 + 8 - ty(dT)));
    const k = w + '|' + I;
    if (k !== flKey) {
      flKey = k; if (fl) fl.remove();
      fl = C.flow(dotsG, `M${X0 + 4} ${YC}H${X1 - 4}`, 'p4-dot', 14 + 70 * I, 24, Math.max(1.1, Math.min(3, wpx / 3)));
    }
    slider.value = w; $('wv').textContent = f2(w) + ' mm';
    document.querySelectorAll('#p4-wmarks [data-w]').forEach(b => b.setAttribute('aria-pressed', String(same(+b.dataset.w, w))));
    document.querySelectorAll('#p4-amps [data-a]').forEach(b => b.setAttribute('aria-pressed', String(same(+b.dataset.a, I))));
    const tiles = [
      ['截面积', `${num(w * T_CU, 4)} mm²`, `${f2(w)} × ${T_CU} mm`, ''],
      ['每 10 mm 的电阻', `${f2(mOhm(10, w))} mΩ`, `1 oz 铜的方块电阻 ≈ ${f2(RSQ)} mΩ/□`, ''],
      ['升温 10 °C 时能过', `${f2(ipcI(w, 10))} A`, `线做窄 20%：${f2(ipcI(w * 0.8, 10))} A`, ''],
      [`${I} A 时升温`, dTtext(dT), 'IPC-2221 外层公式估算', dT <= 10 ? 'good' : dT <= 30 ? 'warn' : 'bad'],
      ['电池 → 电机驱动', `${Math.round(I * mOhm(BP.len, w))} mV`, `这条 ${f1(BP.len)} mm 的路全用这个宽度时的压降，发热 ${Math.round(I * I * mOhm(BP.len, w))} mW`, ''],
      ['QB12 实际这条路', `${Math.round(I * BP.r)} mV`, bpWidths, '']
    ];
    $('ro').innerHTML = tiles.map(([a, b, c, k2]) => `<div class="ro"><small>${a}</small><b class="${k2}">${b}</b><small>${c}</small></div>`).join('');
    const hit = D.classes.filter(c => same(c.track, w));
    const clsTxt = hit.length ? `这正是 QB12 ${hit.map(c => c.name).join(' / ')} 类的线宽（${hit.map(c => c.nets.length > 6 ? c.nets.length + ' 个信号网络' : c.nets.join('、')).join('；')}）。` : '';
    const st = $('st');
    if (dT > 100) { st.className = 'status bad'; st.innerHTML = `升温约 ${dTtext(dT)}，超出了 IPC 曲线画到的 100 °C：这根线会烫手，铜箔可能起泡、烧断。${clsTxt}`; }
    else if (dT > 30) { st.className = 'status bad'; st.innerHTML = `升温约 ${dTtext(dT)}：明显发烫，压降也大。这个电流要更宽的线。${clsTxt}`; }
    else if (dT > 10) { st.className = 'status warn'; st.innerHTML = `升温约 ${dTtext(dT)}：超过了常用的“升温 10 °C”目标。要么加宽，要么确认这么大的电流只持续很短时间。${clsTxt}`; }
    else { st.className = 'status good'; st.innerHTML = `升温不到 10 °C：这个宽度够用。${clsTxt}`; }
  }
  slider.addEventListener('input', () => { w = +slider.value; upd(); });
  $('wmarks').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) { w = +b.dataset.w; upd(); } });
  $('amps').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) { I = +b.dataset.a; upd(); } });
  upd();
})();

/* ================= 4.2 网络类表 ================= */
(function () {
  const NEED = {
    Batt: `两路电机一起起步约 ${I_START} A（电路课第 8 课）`,
    Power: 'VBUS：充电约 0.55 A（电路课第 3 课），插着 USB 时还经 D1 给 VSYS 供电（电路课第 5 课）。最坏情况是插着 USB 又开电机，VBUS 上约 1.9 A（Rev A 评审 #3、#16），而这条线只有 0.5 mm、换层过孔每处只有 1 个，扛不住。现在靠固件兜底：插着 USB 就禁用电机；Rev B 计划把线宽加到 1.0 mm（最少 0.8 mm），换层处并 2–3 个过孔。GND 主要靠铺铜',
    Motor: `每路限流约 ${I_MOT} A（电路课第 8 课）；DRV8833 每路额定 1.5 A RMS、峰值 2 A`,
    Rail: 'ESP32 平均约 0.1 A，发射峰值约 0.3 A（电路课第 6 课）',
    Default: '信号线，毫安级'
  };
  const rows = D.classes.slice().sort((a, b) => b.track - a.track).map(c => {
    const nets = c.nets.length > 6 ? `${c.nets.length} 个信号网络，如 ${c.nets.filter(n => /^(AIN1|EN|USB_DP|nSLEEP)$/.test(n)).map(tag).join('')}…` : c.nets.map(tag).join('');
    return `<tr><td data-l="网络类">${c.name}</td><td data-l="线宽">${c.track} mm</td><td data-l="间距">${c.clearance} mm</td><td data-l="过孔">${c.via[0]} / ${c.via[1]} mm</td><td data-l="网络">${nets}</td><td data-l="10 °C 能过">${f2(ipcI(c.track, 10))} A</td><td data-l="要扛的电流">${NEED[c.name] || ''}</td></tr>`;
  }).join('');
  $('cls').innerHTML = `<thead><tr><th>网络类</th><th>线宽</th><th>间距</th><th>过孔 外径 / 孔</th><th>网络</th><th>升温 10 °C 能过</th><th>要扛的电流</th></tr></thead><tbody>${rows}</tbody>`;
})();

/* ================= 4.2 线宽 + 电流的路（查看器） ================= */
const B = BoardViewer.create($('bv'), {
  toolbar: 'mini', nets: true, panel: true, hover: true,
  layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts', 'F.SilkS'],
  label: 'QB12 的走线：按线宽或按网络高亮，可缩放、点线看网络'
});
function glowNets(V, names) {
  const ids = new Set(names.map(NI));
  return V.annotate(g => {
    g.setAttribute('class', 'p4-annhl');
    g.innerHTML = D.tracks.filter(t => ids.has(t[0])).map(t => {
      const a = `x1="${t[3]}" y1="${t[4]}" x2="${t[5]}" y2="${t[6]}"`;
      return `<line class="gl" ${a} stroke-width="${f3(t[2] + 0.45)}"/><line ${a} stroke-width="${t[2]}"/>`;
    }).join('');
  });
}
let rTok = 0;
const wcT = $('wc-t'), wcX = $('wc-x');
const card = (t, x) => { wcT.textContent = t; wcX.innerHTML = x; };
const byNetOf = ts => { const m = new Map(); ts.forEach(t => { const n = NN(t[0]), g = m.get(n) || { n: 0, len: 0, locked: 0 }; g.n++; g.len += segLen(t); g.locked += t[7] ? 1 : 0; m.set(n, g); }); return m; };
const gN = (m, n) => (m.get(n) || { n: 0, len: 0 }).n;
const oddW = S.widths.map(x => x[0]).filter(w => !D.classes.some(c => same(c.track, w))).sort((a, b) => a - b);
function widthText(w, ts) {
  const m = byNetOf(ts), gnd = m.get('GND');
  const gndTxt = gnd ? `另外 ${gnd.n} 段是 ${tag('GND')}：` : '';
  const motor = cls('Motor').nets;
  if (same(w, cls('Default').track)) return `全是 Default 类的信号线，一共 ${m.size} 个网络。电流只有毫安级，用最细的标准宽度，芯片周围才排得开。`;
  if (same(w, cls('Rail').track)) return `${gN(m, '3V3')} 段是 ${tag('3V3')}（Rail 类）。${gndTxt ? gndTxt + '芯片的接地脚连到自己肚子下的散热焊盘的短线，脚本预画并锁定（第 5 课）。' : ''}`;
  if (same(w, cls('Motor').track)) return `${sum(motor, n => gN(m, n))} 段是 Motor 类：电机线 ${['ML+', 'ML-', 'MR+', 'MR-'].map(tag).join('')} 和电流检测 ${tag('ISENA')}${tag('ISENB')}。${gndTxt ? gndTxt + '接地焊盘到旁边扇出过孔的短线，脚本预画并锁定（第 5 课）。' : ''}`;
  if (same(w, cls('Power').track)) {
    const gl = gnd ? `底层一段 ${f1(gnd.len)} mm 的接地线，脚本预画，把一个接地孔接到左边的大片地上。` : '';
    return `${gN(m, 'VBUS')} 段是 ${tag('VBUS')}（Power 类，USB 进来的 5 V）。${gndTxt}${gl}Power 类里也写了 ${tag('GND')}，但 GND 基本不走线，靠过孔和两面铺铜连（第 5 课）。`;
  }
  if (same(w, cls('Batt').track)) return `${tag('BAT+')} ${gN(m, 'BAT+')} 段、${tag('VSYS')} ${gN(m, 'VSYS')} 段、${tag('BAT_SW')} ${gN(m, 'BAT_SW')} 段：电池 → Q2 → Q1 → 电机驱动这条大电流的路。BAT_SW 属于 Default 类，这 1 段是脚本预画的 Q2 → Q1 直连；它的其余分支只是分压采样，走细线。`;
  if (m.has('BAT_SW') && m.size === 1) {
    const t = ts[0];
    return `${tag('BAT_SW')} 从 Q2 漏极往下引出的 ${f1(segLen(t))} mm 短线，末端一个过孔，再由自动布线接到 R11，给 ESP32 测电池电压用（脚本预画）。这条支路几乎没有电流，所以不用 0.8 mm。`;
  }
  if (m.has('VSYS') && m.has('MR-')) {
    const vm = ts.find(t => NN(t[0]) === 'VSYS'), pw = QB.fp('U2').pads.find(p => String(p.n) === '12').w;
    return `${tag('VSYS')} 的 ${gN(m, 'VSYS')} 段在 U2 的 VM 脚（12 号）：焊盘只有 ${pw} mm 宽，脚本先用 ${w} mm 细线引出 ${f1(segLen(vm))} mm，再接 0.8 mm 粗线。${tag('MR-')} 的 ${gN(m, 'MR-')} 段是自动布线器接进 U2 的 5 号脚时，把线收窄成焊盘的宽度。`;
  }
  if (m.has('VSYS') && m.size === 1) {
    const u3 = QB.fp('U3').pads.filter(p => p.net === NI('VSYS')).map(p => p.n);
    return `都在 U3（SOT-23-5）旁边：${tag('VSYS')} 接进 U3 的 ${u3.join('、')} 号脚时，自动布线器把 0.8 mm 收窄成焊盘的宽度 ${QB.fp('U3').pads[0].w} mm（这叫 neck-down，进窄焊盘前收窄）。一共才 ${f1(m.get('VSYS').len)} mm，对电流没影响。`;
  }
  return [...m].map(([n, g]) => `${tag(n)} ${g.n} 段`).join('、');
}
(function () {
  const ws = S.widths.slice().sort((a, b) => a[0] - b[0]);
  $('wchips').innerHTML = '<span class="lab">按线宽</span>' + ws.map(([w, n]) => `<button class="btn" data-w="${w}" aria-pressed="false">${w}<small>×${n}</small></button>`).join('');
  $('wchips').addEventListener('click', e => {
    const b = e.target.closest('[data-w]'); if (!b) return;
    rTok++; C.pressOne('#p4-routes [data-r]', 'r', '');
    const w = +b.dataset.w, ts = D.tracks.filter(t => same(t[2], w));
    C.pressOne('#p4-wchips [data-w]', 'w', b.dataset.w);
    B.clearAnnotations().highlightWidth(w);
    if (ts.length <= 6) {
      const bb = [Math.min(...ts.map(t => Math.min(t[3], t[5]))), Math.min(...ts.map(t => Math.min(t[4], t[6]))), Math.max(...ts.map(t => Math.max(t[3], t[5]))), Math.max(...ts.map(t => Math.max(t[4], t[6])))];
      B.focus(bb, { pad: 3 });
    } else B.reset();
    const isCls = D.classes.filter(c => same(c.track, w)).map(c => c.name);
    card(`${w} mm · ${ts.length} 段 · ${f1(sum(ts, segLen))} mm${isCls.length ? ' · ' + isCls.join(' / ') + ' 类' : ' · 网络类里没有这个宽度'}`, widthText(w, ts));
  });
})();
const alive = t => t === rTok;
const ROUTES = [
  { k: 'batt', t: '电池 → 电机驱动', go: async my => {
    const [a, b, c] = LEGS;
    card(`电池 → Q2 → Q1 → DRV8833 · ${f1(BP.len)} mm`,
      `电流从电池插座 J2 出来：${tag('BAT+')} 到 Q2 走了 ${f1(a.len)} mm，${tag('BAT_SW')} 从 Q2 到 Q1 ${f1(b.len)} mm，${tag('VSYS')} 从 Q1 到 U2 的 VM 脚 ${f1(c.len)} mm，合计 ${f1(BP.len)} mm（${bpWidths}）。按实际线宽算电阻约 ${f1(BP.r)} mΩ，${I_START} A 时掉 ${Math.round(I_START * BP.r)} mV。四颗 22 µF 电容（C9、C10、C14、C15）也挂在这条 VSYS 上，电机一起步先从它们取电（第 0 课导览）。`);
    B.clear().clearAnnotations(); B.focus(['J2', 'Q2', 'Q1', 'U2', 'C9', 'C14'], { pad: 2 });
    for (const L of LEGS) {
      await B.animateRoute(L.net, { from: L.a, duration: Math.max(0.6, Math.min(1.6, L.len / 18)) });
      if (!alive(my)) return;
      glowNets(B, [L.net]);
    }
    B.clearAnnotations(); B.highlightNet(LEGS.map(l => l.net));
  } },
  { k: 'motor', t: '电机线', go: async my => {
    const ms = ['ML+', 'ML-', 'MR+', 'MR-'], longest = ms.map(QB.net).sort((x, y) => y.len - x.len)[0];
    card(`电机线 · ${cls('Motor').track} mm`,
      `U2 的四个输出脚接到左边的两个电机插座 J3、J4：${ms.map(n => `${tag(n)} ${f1(QB.net(n).len)} mm`).join('、')}。最长的 ${tag(longest.name)} 电阻约 ${f1(netR(longest.name))} mΩ，${I_MOT} A 时只掉 ${Math.round(I_MOT * netR(longest.name))} mV。这一路要宽，主要是为了不发热。`);
    B.clear().clearAnnotations(); B.focus('motor', { pad: 2 });
    await B.animateRoute(ms, { from: 'U2', duration: 1.4 });
  } },
  { k: '3v3', t: '3V3', go: async my => {
    const p = netPath('3V3', 'U3', 'U1');
    card(`3V3 · ${cls('Rail').track} mm`,
      `稳压芯片 U3 的输出一路接到 ${QB.net('3V3').pads.length} 个焊盘。到 ESP32 模组 3V3 脚的这一程走了 ${f1(p.len)} mm${p.layers.has(1) ? '，中间钻到底层过了一段' : ''}，电阻约 ${f1(p.r)} mΩ，发射峰值 0.3 A 时掉 ${Math.round(0.3 * p.r)} mV，对 3.3 V 几乎没影响。右边的信息卡是这个网络的统计。`);
    B.clear().clearAnnotations(); B.focus('3V3', { pad: 2 });
    const ok = await B.animateRoute('3V3', { from: 'U3', duration: 1.8 });
    if (ok && alive(my)) B.selectNet('3V3');
  } },
  { k: 'vbus', t: 'USB 5V（VBUS）', go: async my => {
    const p = netPath('VBUS', 'J1', 'D1');
    card(`VBUS · ${cls('Power').track} mm`,
      `USB-C 插座 J1 进来的 5 V 要去充电芯片 U4 和二极管 D1 等 ${QB.net('VBUS').pads.length} 个焊盘。J1 → D1 这一程 ${f1(p.len)} mm，其中 ${f1(p.lenB)} mm 在底层：J1 的两个 VBUS 焊盘先各打一个过孔，在底层连通（脚本预画），自动布线再从这里接出去。`);
    B.clear().clearAnnotations(); B.focus('VBUS', { pad: 2 });
    const ok = await B.animateRoute('VBUS', { from: 'J1', duration: 1.8 });
    if (ok && alive(my)) B.selectNet('VBUS');
  } },
  { k: 'sig', t: '一根信号线 nSLEEP', go: async my => {
    const n = QB.net('nSLEEP');
    card(`nSLEEP · ${cls('Default').track} mm`,
      `ESP32 用 ${tag('nSLEEP')} 叫醒 DRV8833：${f1(n.len)} mm、${n.segs} 段、${n.pads.length} 个焊盘。电阻约 ${Math.round(netR('nSLEEP'))} mΩ，比电池那一路大得多，可它上面只有毫安级甚至更小的电流，压降可以忽略。`);
    B.clear().clearAnnotations(); B.focus('nSLEEP', { pad: 2 });
    const ok = await B.animateRoute('nSLEEP', { from: 'U1', duration: 1.6 });
    if (ok && alive(my)) B.selectNet('nSLEEP');
  } }
];
B.on('net', () => { if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#p4-bv .bv-tools')) { rTok++; C.pressOne('#p4-routes [data-r]', 'r', ''); C.pressOne('#p4-wchips [data-w]', 'w', ''); } });
$('routes').innerHTML = '<span class="lab">电流的路</span>' + ROUTES.map(r => `<button class="btn" data-r="${r.k}" aria-pressed="false">${r.t}</button>`).join('');
$('routes').addEventListener('click', e => {
  const b = e.target.closest('[data-r]'); if (!b) return;
  const my = ++rTok;
  C.pressOne('#p4-routes [data-r]', 'r', b.dataset.r); C.pressOne('#p4-wchips [data-w]', 'w', '');
  ROUTES.find(r => r.k === b.dataset.r).go(my).catch(err => console.error(err));
});
card('点一个线宽，或者一条电流的路', `QB12 一共 ${S.tracks} 段线，用了 ${S.widths.length} 种线宽。网络类只规定了 ${D.classes.length} 种；多出来的 ${oddW.join('、')} mm 是脚本预画的特殊线，和自动布线器在窄焊盘前收窄的结果，点开看是哪几段。`);

/* ================= 4.3 间距 ================= */
const dflt = cls('Default'), batt = cls('Batt');
$('c-min').textContent = D.rules.min_clearance + ' mm';
$('c-cls').textContent = `${dflt.clearance} mm（电池类 ${batt.clearance} mm）`;
const JLC_GAP = 0.10;            // 嘉立创 / JLCPCB 1 oz 双层板最小线距
(function () {
  const svg = $('gsvg'), Sx = 250, YM = 112, XL = 36, XR = 380, W0 = dflt.track;
  const GAPS = [[JLC_GAP, '工厂极限'], [D.rules.min_clearance, '约束下限'], [dflt.clearance, '网络类'], [batt.clearance, '电池类']];
  const ETCH = [[-0.2, '偏窄 20%'], [0, '按设计'], [0.2, '偏宽 20%']];
  $('gaps').insertAdjacentHTML('beforeend', GAPS.map(([g, t]) => `<button class="btn" data-g="${g}" aria-pressed="false">${f2(g)}<small>${t}</small></button>`).join(''));
  $('etch').insertAdjacentHTML('beforeend', ETCH.map(([e, t]) => `<button class="btn" data-e="${e}" aria-pressed="false">${t}</button>`).join(''));
  const band = C.el('rect', { x: XL, width: XR - XL, class: 'p4-band' }, svg);
  const tA = C.el('rect', { x: XL, width: XR - XL, class: 'p4-tr' }, svg), tB = C.el('rect', { x: XL, width: XR - XL, class: 'p4-tr b' }, svg);
  const oA = C.el('rect', { x: XL, width: XR - XL, class: 'p4-tro' }, svg), oB = C.el('rect', { x: XL, width: XR - XL, class: 'p4-tro' }, svg);
  const ov = C.el('g', {}, svg);
  const bandT = C.el('text', { x: XL + 6, class: 'p4-t fg' }, svg, '');
  const dl = C.el('path', { class: 'p4-dl' }, svg);
  const dT = C.el('text', { x: XR + 22, y: YM + 5, class: 'p4-gt' }, svg, '');
  const lA = C.el('text', { x: XL + 6, class: 'p4-t fg' }, svg, '网络 A（0.2 mm 线）'), lB = C.el('text', { x: XL + 6, class: 'p4-t fg' }, svg, '网络 B（0.2 mm 线）');
  C.el('text', { x: XL, y: 228, class: 'p4-t' }, svg, '示意：两根 0.2 mm 的线放大 250 倍；虚线框是图纸上的样子');
  let g = dflt.clearance, e = 0.2;
  function upd() {
    const wm = W0 * (1 + e), got = g - W0 * e;
    const yA1 = YM - g / 2 * Sx, yA0 = yA1 - W0 * Sx, yB0 = YM + g / 2 * Sx, yB1 = yB0 + W0 * Sx;
    const grow = W0 * e / 2 * Sx;
    tA.setAttribute('y', yA0 - grow); tA.setAttribute('height', wm * Sx);
    tB.setAttribute('y', yB0 - grow); tB.setAttribute('height', wm * Sx);
    oA.setAttribute('y', yA0); oA.setAttribute('height', W0 * Sx);
    oB.setAttribute('y', yB0); oB.setAttribute('height', W0 * Sx);
    lA.setAttribute('y', yA0 - grow - 7); lB.setAttribute('y', yB1 + grow + 17);
    const bh = JLC_GAP * Sx;
    band.setAttribute('y', YM - bh / 2); band.setAttribute('height', bh);
    bandT.setAttribute('y', YM + 4); bandT.textContent = '嘉立创能保证的最窄缝 0.10 mm';
    ov.innerHTML = '';
    const eA = yA1 + grow, eB = yB0 - grow;    // 做出来的内侧边
    if (eA > YM - bh / 2) C.el('rect', { x: XL, y: YM - bh / 2, width: XR - XL, height: Math.min(bh, eA - (YM - bh / 2)), class: 'p4-over' }, ov);
    if (eB < YM + bh / 2) C.el('rect', { x: XL, y: Math.max(YM - bh / 2, eB), width: XR - XL, height: YM + bh / 2 - Math.max(YM - bh / 2, eB), class: 'p4-over' }, ov);
    dl.setAttribute('d', `M${XR + 6} ${eA}H${XR + 18}M${XR + 12} ${eA}V${eB}M${XR + 6} ${eB}H${XR + 18}`);
    dT.textContent = f3(got) + ' mm';
    C.pressOne('#p4-gaps [data-g]', 'g', g); C.pressOne('#p4-etch [data-e]', 'e', e);
    const mar = got - JLC_GAP;
    $('gro').innerHTML = [
      ['图纸上的间距', `${f2(g)} mm`, ''], ['做出来的线宽', `${f2(wm)} mm`, ''],
      ['做出来的间距', `${f3(got)} mm`, got < JLC_GAP - 1e-9 ? 'bad' : got < JLC_GAP + 0.02 ? 'warn' : 'good'],
      ['比 0.10 mm 宽出', `${mar >= 0 ? '+' : '−'}${f3(Math.abs(mar))} mm`, mar < -1e-9 ? 'bad' : mar < 0.02 ? 'warn' : 'good']
    ].map(([a, b, c]) => `<div class="ro"><small>${a}</small><b class="${c}">${b}</b></div>`).join('');
    const st = $('gst');
    if (got < JLC_GAP - 1e-9) { st.className = 'status bad'; st.textContent = `做出来只剩 ${f3(got)} mm，比工厂能保证的 0.10 mm 还窄：缝里的铜可能蚀不干净，两根线短路。按极限画的图，一点偏差都容不下。`; }
    else if (got < JLC_GAP + 0.02) { st.className = 'status warn'; st.textContent = `做出来 ${f3(got)} mm，刚刚卡在工厂极限上，没有余量。`; }
    else { st.className = 'status good'; st.textContent = `做出来还有 ${f3(got)} mm，比 0.10 mm 宽出 ${f3(mar)} mm：线宽偏 20% 也不怕。`; }
  }
  $('gaps').addEventListener('click', ev => { const b = ev.target.closest('[data-g]'); if (b) { g = +b.dataset.g; upd(); } });
  $('etch').addEventListener('click', ev => { const b = ev.target.closest('[data-e]'); if (b) { e = +b.dataset.e; upd(); } });
  upd();
})();

/* 在 QB12 上找最窄的缝：同一层、不同网络的两段线，中心线距离减去两个半宽 */
function segClose(a, b) {
  const P = [[a[3], a[4]], [a[5], a[6]]], Q = [[b[3], b[4]], [b[5], b[6]]];
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  if (o(P[0], P[1], Q[0]) * o(P[0], P[1], Q[1]) < 0 && o(Q[0], Q[1], P[0]) * o(Q[0], Q[1], P[1]) < 0) return [0, P[0], P[0]];
  const foot = (p, s0, s1) => {
    const dx = s1[0] - s0[0], dy = s1[1] - s0[1], L = dx * dx + dy * dy;
    const k = L ? Math.max(0, Math.min(1, ((p[0] - s0[0]) * dx + (p[1] - s0[1]) * dy) / L)) : 0;
    return [s0[0] + k * dx, s0[1] + k * dy];
  };
  let best = [Infinity];
  P.forEach(p => { const f = foot(p, Q[0], Q[1]), d = Math.hypot(p[0] - f[0], p[1] - f[1]); if (d < best[0]) best = [d, p, f]; });
  Q.forEach(q => { const f = foot(q, P[0], P[1]), d = Math.hypot(q[0] - f[0], q[1] - f[1]); if (d < best[0]) best = [d, f, q]; });
  return best;
}
const PAIRS = (function () {
  const T = D.tracks, best = new Map();
  for (let i = 0; i < T.length; i++) {
    const a = T[i];
    for (let j = i + 1; j < T.length; j++) {
      const b = T[j];
      if (a[0] === b[0] || a[1] !== b[1]) continue;
      if (Math.min(a[3], a[5]) - Math.max(b[3], b[5]) > 1 || Math.min(b[3], b[5]) - Math.max(a[3], a[5]) > 1 ||
          Math.min(a[4], a[6]) - Math.max(b[4], b[6]) > 1 || Math.min(b[4], b[6]) - Math.max(a[4], a[6]) > 1) continue;
      const [d, p, q] = segClose(a, b), gap = d - a[2] / 2 - b[2] / 2;
      const k = [NN(a[0]), NN(b[0])].sort().join('|') + '|' + a[1];
      if (!best.has(k) || gap < best.get(k).gap) best.set(k, { gap, a: NN(a[0]), b: NN(b[0]), layer: a[1], p, q, wa: a[2], wb: b[2] });
    }
  }
  return [...best.values()].sort((x, y) => x.gap - y.gap);
})();
const GMIN = PAIRS[0];
$('g-min').textContent = `${f3(GMIN.gap)} mm（${GMIN.a} 和 ${GMIN.b}，${GMIN.layer ? '底层' : '顶层'}）`;
$('g-mar').textContent = `${Math.round((GMIN.gap / JLC_GAP - 1) * 100)}%`;
$('g-cls').textContent = `${dflt.clearance} mm`;
const GB = BoardViewer.create($('gapbv'), { toolbar: 'mini', panel: false, hover: true, layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts'], label: 'QB12 上最窄的几处缝，放大看' });
const TOPG = PAIRS.slice(0, 3);
const battPair = PAIRS.find(p => [p.a, p.b].some(n => batt.nets.includes(n)));
if (battPair && !TOPG.includes(battPair)) TOPG.push(battPair);
$('gpairs').innerHTML = '<span class="lab">最窄的缝</span>' + TOPG.map((pr, i) => `<button class="btn" data-gp="${i}" aria-pressed="false">${pr.a} / ${pr.b}<small>${f3(pr.gap)} mm · ${pr === battPair ? '电池类最窄' : pr.layer ? '底层' : '顶层'}</small></button>`).join('');
function pickGap(i) {
  const pr = TOPG[i];
  C.pressOne('#p4-gpairs [data-gp]', 'gp', i);
  const ux = pr.q[0] - pr.p[0], uy = pr.q[1] - pr.p[1], L = Math.hypot(ux, uy) || 1;
  const e1 = [pr.p[0] + ux / L * pr.wa / 2, pr.p[1] + uy / L * pr.wa / 2], e2 = [pr.q[0] - ux / L * pr.wb / 2, pr.q[1] - uy / L * pr.wb / 2];
  const cx = (e1[0] + e2[0]) / 2, cy = (e1[1] + e2[1]) / 2;
  GB.clear().clearAnnotations();
  GB.show({ layers: [pr.layer ? 'B.Cu' : 'F.Cu', 'Vias', 'Edge.Cuts'] });
  GB.highlightNet([pr.a, pr.b]);
  GB.focus([cx - 2.6, cy - 1.6, cx + 2.6, cy + 1.6], { pad: 0 });
  const tx = cx + (Math.abs(ux) > Math.abs(uy) ? 0 : 0.16), ty = cy + (Math.abs(ux) > Math.abs(uy) ? -0.16 : 0.07);
  GB.annotate(g => {
    g.setAttribute('class', 'p4-ann');
    g.innerHTML = `<line class="gapl" x1="${f3(e1[0])}" y1="${f3(e1[1])}" x2="${f3(e2[0])}" y2="${f3(e2[1])}"/>` +
      `<text class="gapt" x="${f3(tx)}" y="${f3(ty)}" style="font-size:.2px;stroke-width:.05">${f3(pr.gap)} mm</text>`;
  });
  GB.badge(`${pr.a} / ${pr.b} · ${pr.layer ? '底层 B.Cu' : '顶层 F.Cu'} · 缝 ${f3(pr.gap)} mm`);
}
$('gpairs').addEventListener('click', e => { const b = e.target.closest('[data-gp]'); if (b) pickGap(+b.dataset.gp); });
C.onVisible($('gapbv'), () => pickGap(0), '200px');

/* ================= 4.4 两层 ================= */
(function () {
  const nF = S.tracks_F, nB = S.tracks_B, lF = S.track_len_F, lB = S.track_len_B;
  const bar = (el, a, b, fa, fb) => {
    el.innerHTML = `<div class="F" style="flex:${a}">${fa}</div><div class="B" style="flex:${b}">${fb}</div>`;
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', `顶层 ${fa}，底层 ${fb}`);
  };
  bar($('bar-n'), nF, nB, `${nF} 段`, `${nB} 段`);
  bar($('bar-l'), lF, lB, `${Math.round(lF)} mm`, `${Math.round(lB)} mm`);
  const pads = D.footprints.flatMap(f => f.pads);
  const smdF = pads.filter(p => p.t === 'smd' && p.cu.includes('F')).length, smdAll = pads.filter(p => p.t === 'smd').length, pth = pads.filter(p => p.t === 'pth').length;
  const R = S.via_roles;
  $('l-ro').innerHTML = [['顶层平均每段', `${f1(lF / nF)} mm`], ['底层平均每段', `${f1(lB / nB)} mm`], ['换层用的信号过孔', `${R.signal} 个`], ['贴片焊盘', `${smdAll} 个，顶层 ${smdF}`]]
    .map(([a, b]) => `<div class="ro"><small>${a}</small><b>${b}</b></div>`).join('');
  $('l-smd').innerHTML = `${S.footprints} 个元件全在顶面，${smdF} 个贴片焊盘全在顶层（两面都有铜的只有 ${pth} 个插件焊盘）`;
  const bl = new Map();
  D.tracks.forEach(t => { if (t[1] === 1) bl.set(NN(t[0]), (bl.get(NN(t[0])) || 0) + segLen(t)); });
  const top = [...bl].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, L]) => `${tag(n)} ${f1(L)} mm`).join('、');
  $('l-b').innerHTML = `底层的线平均每段 ${f1(lB / nB)} mm，顶层只有 ${f1(lF / nF)} mm：底层的线多是“长跨度的桥”，从一个过孔下去，在顶层最挤的地方下面穿过，再从另一个过孔上来。底层上最长的几条是 ${top}（${tag('BAT_SW')} 那条是给 R11 分压采样的细线）。`;
  const LB = BoardViewer.create($('lbv'), { toolbar: 'mini', panel: false, hover: true, layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts'], label: 'QB12 的顶层和底层走线' });
  const BTN = [['both', '两层都看'], ['F', '只看顶层'], ['B', '只看底层'], ['via', `换层的 ${R.signal} 个过孔`]];
  $('lbtns').innerHTML = BTN.map(([k, t]) => `<button class="btn" data-l="${k}" aria-pressed="false">${t}</button>`).join('');
  function go(k) {
    C.pressOne('#p4-lbtns [data-l]', 'l', k);
    LB.clear();
    if (k === 'F') LB.show({ layers: ['F.Cu', 'Vias', 'Edge.Cuts'] }).badge(`顶层 F.Cu：${nF} 段，${Math.round(lF)} mm`);
    else if (k === 'B') LB.show({ layers: ['B.Cu', 'Vias', 'Edge.Cuts'] }).badge(`底层 B.Cu：${nB} 段，${Math.round(lB)} mm`);
    else { LB.show({ layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts'] }).badge(k === 'via' ? `信号线换层的过孔 ${R.signal} 个（其余过孔都接地，第 5 课）` : '红 = 顶层，蓝 = 底层'); if (k === 'via') LB.highlightVias('signal'); }
  }
  $('lbtns').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) go(b.dataset.l); });
  C.pressOne('#p4-lbtns [data-l]', 'l', 'both');
  LB.badge('红 = 顶层，蓝 = 底层');
})();

/* ================= 4.5 自动布线：一步步 ================= */
const fr = D.process.tools.freerouting;
const LT = D.tracks.filter(t => t[7]), LTg = LT.filter(t => t[0] === GNDI), LTs = LT.filter(t => t[0] !== GNDI);
const LV = D.vias.filter(v => v.locked), LVg = LV.filter(v => v.net === GNDI), LVs = LV.filter(v => v.net !== GNDI);
const FRT = S.tracks - S.locked_tracks;
const FRV = D.vias.filter(v => v.role === 'signal' && !v.locked);
const NONGND = D.nets.map(n => n.name).filter(n => n !== 'GND');
/* T 形接头：一段锁定的线在中间被拆成两段（共线、同宽、同网络），拆开的点上接着自动布线的线 */
const TJ = (function () {
  const T = D.tracks, ends = new Map(), out = [];
  const k = (t, x, y) => `${t[0]}|${t[1]}|${Math.round(x * 100)}|${Math.round(y * 100)}`;
  T.forEach((t, i) => [[t[3], t[4]], [t[5], t[6]]].forEach(([x, y]) => { const kk = k(t, x, y); if (!ends.has(kk)) ends.set(kk, { x, y, ids: [] }); ends.get(kk).ids.push(i); }));
  ends.forEach(e => {
    const L = e.ids.filter(i => T[i][7]), F = e.ids.filter(i => !T[i][7]);
    if (L.length !== 2 || !F.length) return;
    const a = T[L[0]], b = T[L[1]];
    if (!same(a[2], b[2])) return;
    const va = [a[5] - a[3], a[6] - a[4]], vb = [b[5] - b[3], b[6] - b[4]];
    if (Math.abs(va[0] * vb[1] - va[1] * vb[0]) < 1e-6 * Math.hypot(...va) * Math.hypot(...vb) + 1e-9) out.push({ x: e.x, y: e.y, net: NN(a[0]), layer: a[1] });
  });
  return out;
})();
const preDrawn = S.locked_tracks - TJ.length;
const AB = BoardViewer.create($('arbv'), { toolbar: 'mini', panel: false, hover: true, layers: ['F.Cu', 'B.Cu', 'Edge.Cuts'], tracks: false, label: 'QB12 自动布线的几个步骤' });
const lineSvg = (t, c, extra) => `<line class="${c}" x1="${t[3]}" y1="${t[4]}" x2="${t[5]}" y2="${t[6]}" stroke-width="${f3(t[2] + (extra || 0))}"/>`;
const annCu = (V, ts, vs) => V.annotate(g => { g.setAttribute('class', 'p4-ann'); g.innerHTML = ts.map(t => lineSvg(t, 'glw', 0.7)).join('') + ts.map(t => lineSvg(t, t[1] ? 'cuB' : 'cuF')).join('') + (vs || []).map(v => `<circle class="via" cx="${v.x}" cy="${v.y}" r="${f3(v.d / 2)}"/>`).join(''); });
const annVias = (V, vs) => V.annotate(g => { g.setAttribute('class', 'p4-ann'); g.innerHTML = vs.map(v => `<circle class="via" cx="${v.x}" cy="${v.y}" r="${f3(v.d / 2)}"/>`).join(''); });
const annKeep = (V) => V.annotate(g => { g.setAttribute('class', 'p4-ann'); g.innerHTML = LTg.map(t => lineSvg(t, 'ko', 0.4)).join('') + LVg.map(v => `<circle class="ko" cx="${v.x}" cy="${v.y}" r="${f3(v.d / 2 + 0.2)}"/>`).join(''); });
const annRats = (V) => V.annotate(g => { g.setAttribute('class', 'p4-ann'); g.innerHTML = D.ratsnest.filter(r => r[0] !== GNDI).map(r => `<line class="rat" x1="${r[1]}" y1="${r[2]}" x2="${r[3]}" y2="${r[4]}"/>`).join(''); });
const lockBy = n => LT.filter(t => NN(t[0]) === n).length;
const optTxt = fr.optimize.replace(' minute(s) ', ' 分 ').replace(' seconds', ' 秒');
const AR = [
  { s: '预画', t: '① 布线前：脚本先画好几段，并且锁定',
    x: `<span class="net">build_board.py</span> 和 <span class="net">route_b.py</span> 先画好自动布线器不擅长、或者必须这样走的线，再把它们<strong>锁定</strong>（Locked），自动布线器不许动。现在板上锁定的线一共 ${S.locked_tracks} 段：脚本画了 ${preDrawn} 段，导回时又拆出 ${TJ.length} 段（第 ④ 步）。`,
    f: () => [['接地扇出', `${tag('GND')} 短线 ${LTg.length} 段 + 接地孔 ${LVg.length} 个：大多数接地焊盘就近打孔下到底层；U2、U4 的接地脚直接连到自己的散热焊盘，另有 1 段底层地线“脊”（route_b.py）`],
      ['USB 5V', `${tag('VBUS')} ${lockBy('VBUS')} 段：J1 两个 VBUS 焊盘各打一孔、底层连通（两边同时接进去，自动布线很难）`],
      ['电机电源', `${tag('VSYS')} ${lockBy('VSYS')} 段：VM 脚的 0.35 mm 引出线，和 C9 → C14 的 0.8 mm 短接`],
      ['电池开关', `${tag('BAT_SW')} ${lockBy('BAT_SW')} 段：Q2 → Q1 的 0.8 mm 直连，和采样引出线`]],
    run: async () => {
      AB.show({ layers: ['F.Cu', 'B.Cu', 'Edge.Cuts', 'Courtyard'], tracks: false }).reset({ animate: false });
      annCu(AB, LT, LV); AB.badge(`预画并锁定：${S.locked_tracks} 段线、${LV.length} 个孔`);
    } },
  { s: 'DSN', t: '② 导出 DSN：GND 不给它，禁布区写进去',
    x: `<span class="net">route_a.py</span> 先删掉铺铜，再导出 DSN，然后改了三处：把 ${tag('GND')} 从网络表和 Power 类里删掉，不让 Freerouting 碰地线；接地扇出的短线和孔从板上拿掉，换成同样大小再外扩 0.2 mm 的禁布形状（橙色），让它绕开；写进天线、模组接地焊盘、USB-C 外壳三块禁布区。虚线是剩下要连的飞线（示意）。`,
    f: () => [['交给它的网络', `${NONGND.length} 个（GND 除外）`], ['禁布形状', `${LTg.length + LVg.length} 个接地扇出 + 3 块禁布区`], ['线宽 / 间距', '只按 DSN 里写的网络类：' + D.classes.slice().sort((a, b) => b.track - a.track).map(c => `${c.name} ${c.track}`).join('、') + ' mm'], ['GND', '靠过孔和两面铺铜连（第 5 课）']],
    run: async () => {
      AB.show({ layers: ['F.Cu', 'B.Cu', 'Edge.Cuts', 'Keepouts'], tracks: false }).reset({ animate: false });
      annKeep(AB); annCu(AB, LTs, LVs); annRats(AB);
      AB.badge(`交给 Freerouting：${NONGND.length} 个网络`);
    } },
  { s: 'Freerouting', t: `③ Freerouting ${fr.version} 布线`,
    x: `命令行跑 Freerouting ${fr.version}，最多 ${fr.passes} 轮（<span class="net">-mp ${fr.passes}</span>）。日志写着：${fr.route_s} 秒就全部布通，接着花 ${optTxt}做优化，这一步让设计改善了约 ${Math.round(fr.improved_pct)}%（按它自己的评分）。布完存成 SES 会话文件。`,
    f: () => [['版本', `Freerouting ${fr.version}`], ['布通', `${fr.route_s} 秒`], ['优化', `${optTxt}，约 ${Math.round(fr.improved_pct)}%`], ['它画的', `${FRT} 段线、${FRV.length} 个换层过孔`]],
    run: async my => {
      AB.show({ layers: ['F.Cu', 'B.Cu', 'Edge.Cuts', 'Keepouts'], tracks: false }).reset({ animate: false });
      annKeep(AB);
      AB.badge(`Freerouting ${fr.version} 布线中…`);
      const ok = await AB.animateRoute(NONGND, { style: 'layer', duration: 3.2 });
      if (!ok || !arAlive(my)) return;
      AB.clearAnnotations(); annVias(AB, LV.concat(FRV));
      AB.badge(`${fr.route_s} 秒布通 + ${optTxt}优化`);
    } },
  { s: '导回', t: `④ 导回 KiCad：拆开 ${TJ.length} 处 T 形接头`,
    x: `<span class="net">route_b.py</span> 把 SES 导回 KiCad。Freerouting 有时把一根线的线头接在另一段线的<strong>中间</strong>，成了 T 形。电气上是连通的，但 KiCad 会把这种线头当成“悬空的线头”报出来，所以脚本在交点处把那段线拆成两段。QB12 上一共 ${TJ.length} 处，全在预画的锁定线上（方框）。`,
    f: () => [['T 形接头', `${TJ.length} 处：${[...new Set(TJ.map(t => t.net))].map(tag).join('')}`], ['锁定的线', `${preDrawn} → ${S.locked_tracks} 段（拆开的两段都保持锁定）`], ['总段数', `${S.tracks} 段 = 预画 ${preDrawn} + Freerouting ${FRT} + 拆出 ${TJ.length}`]],
    run: async () => {
      AB.show({ layers: ['F.Cu', 'B.Cu', 'Edge.Cuts'], tracks: true });
      annVias(AB, LV.concat(FRV));
      const xs = TJ.map(t => t.x), ys = TJ.map(t => t.y);
      AB.focus([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { pad: 4 });
      TJ.forEach(t => AB.box([t.x - 0.8, t.y - 0.8, t.x + 0.8, t.y + 0.8], 'T'));
      AB.badge(`拆开 ${TJ.length} 处 T 形接头`);
    } },
  { s: '铺地 + DRC', t: '⑤ 补地孔、两面铺地，再跑 DRC',
    x: `接着 <span class="net">route_b.py</span> 在模组接地焊盘之间打孔、全板打缝合孔、两层整面铺 GND、补孤岛（第 5 课），<span class="net">finalize.py</span> 摆好丝印，最后用 KiCad 自己的 DRC 把整块板核一遍（第 6 课）。到这一步，没交给自动布线的 GND 才算连上。`,
    f: () => [['过孔', `${S.vias} 个，其中接地 ${S.gnd_vias} 个`], ['DRC', `${D.drc.errors} 个错误，${D.drc.unconnected} 处没连上`]],
    run: async my => {
      AB.clearAnnotations(); AB.reset();
      AB.show({ layers: ['F.Cu', 'B.Cu', 'Edge.Cuts'], tracks: true });
      AB.badge('补地孔');
      await AB.reveal('Vias', { duration: 1.0 });
      if (!arAlive(my)) return;
      AB.badge('两面铺地');
      await AB.reveal('Zones', { duration: 0.8 });
      if (!arAlive(my)) return;
      AB.badge(`DRC：${D.drc.errors} 错误 · ${D.drc.unconnected} 未连接`);
    } }
];
let arTok = 0, arCur = 0, arPlay = false;
const arAlive = t => t === arTok;
$('ar-steps').innerHTML = AR.map((s, i) => `<button class="btn" data-ar="${i}" aria-pressed="false">${i + 1} ${s.s}</button>`).join('');
function arFill(i) {
  const s = AR[i];
  $('ar-t').textContent = s.t; $('ar-x').innerHTML = s.x;
  $('ar-f').innerHTML = s.f().map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
  C.pressOne('#p4-ar-steps [data-ar]', 'ar', i);
}
async function arGo(i) {
  arCur = i; const my = ++arTok;
  arFill(i);
  AB.clear().clearAnnotations();
  try { await AR[i].run(my); } catch (e) { console.error(e); }
  if (arPlay && arAlive(my)) {
    await wait(RMx ? 600 : 2200);
    if (!arPlay || !arAlive(my)) return;
    if (i < AR.length - 1) arGo(i + 1); else arStop();
  }
}
const arBtn = $('ar-play');
function arStop() { arPlay = false; arBtn.textContent = '▶ 从头播放'; }
arBtn.addEventListener('click', () => { if (arPlay) { arStop(); return; } arPlay = true; arBtn.textContent = '■ 停止'; arGo(0); });
$('ar-steps').addEventListener('click', e => { const b = e.target.closest('[data-ar]'); if (b) { arStop(); arGo(+b.dataset.ar); } });
arFill(0);
C.onVisible($('arbv'), () => { if (!arTok) arGo(0); }, '200px');
$('fr-n') && ($('fr-n').textContent = NONGND.length);
$('fr-t') && ($('fr-t').textContent = FRT);

/* 人工复查：两个焊盘的网络里，实际线长 ÷ 两焊盘直线距离，最大的几个；加上 neck-down */
(function () {
  const padXY = name => { const i = name.indexOf('.'), p = QB.fp(name.slice(0, i)).pads.find(q => String(q.n) === name.slice(i + 1)); return [p.x, p.y]; };
  const det = D.nets.filter(n => n.pads.length === 2 && n.len > 0).map(n => {
    const [a, b] = n.pads.map(padXY), d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    return { n: n.name, len: n.len, d, k: n.len / d };
  }).sort((x, y) => y.k - x.k).slice(0, 3);
  const WHY = {
    'MR-': '是右电机的线，最大要过约 1 A：线越长电阻越大、越热。手画能走得更短更直。',
    PROG: '接 R3（设定充电电流的电阻）。TP4056 数据手册要求 R3 尽量靠近芯片、PROG 脚上的寄生电容尽量小，这一根值得手动改短。',
    CC1: '是 USB-C 的 CC 下拉，只是一个电平，绕一点没关系：这是“要看一眼，但不一定要改”的例子。'
  };
  const nk = D.tracks.filter(t => same(t[2], 0.49));
  const items = det.map(o => ({ k: o.n, t: `${o.n} 绕远 ×${f1(o.k)}`, x: `${tag(o.n)} 实际走了 ${f1(o.len)} mm，两个焊盘之间直线只有 ${f1(o.d)} mm。${WHY[o.n] || ''}`, a: () => { AB.highlightNet(o.n); AB.focus(o.n, { pad: 2.5 }); } }));
  if (nk.length) items.push({ k: 'neck', t: `U3 旁收窄到 ${nk[0][2]} mm`, x: `自动布线器为了接进 U3 的窄焊盘，把 0.8 mm 的 ${tag('VSYS')} 收窄成 ${nk[0][2]} mm，一共 ${nk.length} 小段、${f1(sum(nk, segLen))} mm。这么短不碍事；要是收窄的那截很长，就得手动改。`, a: () => { AB.highlightWidth(nk[0][2]); AB.focus('U3', { pad: 4 }); } });
  $('chk').innerHTML = items.map(o => `<button class="btn" data-ck="${o.k}" aria-pressed="false">${o.t}</button>`).join('');
  $('chk-x').textContent = '点一个例子，上面的板子会标出来。';
  $('chk').addEventListener('click', e => {
    const b = e.target.closest('[data-ck]'); if (!b) return;
    arStop(); arTok++;
    C.pressOne('#p4-chk [data-ck]', 'ck', b.dataset.ck); C.pressOne('#p4-ar-steps [data-ar]', 'ar', '');
    const o = items.find(q => q.k === b.dataset.ck);
    AB.clear().clearAnnotations(); AB.show({ layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts', 'F.SilkS'], tracks: true });
    o.a(); AB.badge('人工复查：' + o.t);
    $('ar-t').textContent = '人工复查：' + o.t; $('ar-x').innerHTML = o.x; $('ar-f').innerHTML = '';
    $('chk-x').innerHTML = o.x;
  });
})();

/* ================= 4.6 USB D+ / D− ================= */
const DP = QB.net('USB_DP'), DN = QB.net('USB_DN');
const EEFF = 3.4;                                  // 板内有效介电常数的粗估值（facts §8.8 的估算用值）
const PS_MM = Math.sqrt(EEFF) / 299.792458 * 1000; // 每 mm 的传播时间 ps（光速 299.79 mm/ns）
const dLen = Math.abs(DP.len - DN.len), uMax = Math.max(DP.len, DN.len);
let usbGo = null;
(function () {
  const wdp = Object.keys(DP.widths).join('/'), wdn = Object.keys(DN.widths).join('/');
  $('u-real').innerHTML = `QB12 上这两根就是普通的 ${wdp} mm 单线（Default 类），没有按差分对的线宽、间距来画，也没专门做等长：${tag('USB_DP')} 长 ${f1(DP.len)} mm（${DP.segs} 段），${tag('USB_DN')} 长 ${f1(DN.len)} mm（${DN.segs} 段），差 ${f1(dLen)} mm；${DP.vias + DN.vias ? '' : '都没有换层，'}每根都要连 J1 正反两面的两个焊盘、U5（ESD 保护）的两个脚和模组 U1，一共 ${DP.pads.length} 个焊盘。`;
  $('u-ro').innerHTML = [['D+ / D− 长度', `${f1(DP.len)} / ${f1(DN.len)} mm`], ['长度差', `${f1(dLen)} mm`], ['线宽', `${wdp === wdn ? wdp : wdp + ' / ' + wdn} mm`], ['过孔', `${DP.vias + DN.vias} 个`], ['走完 D− 约', `${Math.round(DN.len * PS_MM)} ps（估算）`], ['长度差对应', `约 ${Math.round(dLen * PS_MM)} ps`]]
    .map(([a, b]) => `<div class="ro"><small>${a}</small><b>${b}</b></div>`).join('');
  const UB = BoardViewer.create($('usbbv'), { toolbar: 'mini', panel: true, hover: true, layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts', 'F.SilkS'], view: ['USB_DP', 'USB_DN', 'J1'], label: 'QB12 的 USB D+ / D− 走线' });
  const BT = [['anim', '画出 D+ / D−'], ['dp', 'D+ 网络卡'], ['dn', 'D− 网络卡']];
  $('ubtns').innerHTML = BT.map(([k, t]) => `<button class="btn" data-u="${k}" aria-pressed="false">${t}</button>`).join('');
  let uTok = 0;
  async function ugo(k) {
    const my = ++uTok;
    C.pressOne('#p4-ubtns [data-u]', 'u', k);
    UB.clear(); UB.focus(['USB_DP', 'USB_DN', 'J1'], { pad: 1.5 });
    if (k === 'anim') { const ok = await UB.animateRoute(['USB_DP', 'USB_DN'], { from: 'J1', duration: 1.8 }); if (ok && my === uTok) UB.badge(`D+ ${f1(DP.len)} mm · D− ${f1(DN.len)} mm`); }
    else UB.selectNet(k === 'dp' ? 'USB_DP' : 'USB_DN');
  }
  $('ubtns').addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (b) ugo(b.dataset.u); });
  C.onVisible($('usbbv'), () => { if (!uTok) ugo('anim'); }, '100px');
  usbGo = ugo;
})();
/* 时间尺：边沿时间 vs 走线传播时间；走线长度 vs 临界长度（Altium 的估算：全速 4 ns 边沿 → 约 61 mm，10% 判据） */
(function () {
  const svg = $('tsvg'), X0 = 44, X1 = 456, T1 = 5, tx = t => X0 + t / T1 * (X1 - X0), L1 = 70, lx = L => X0 + L / L1 * (X1 - X0);
  const SPD = { fs: { tr: 4, crit: 61, name: '全速 12 Mbit/s', edge: '边沿 4–20 ns（画的是最快的 4 ns）' }, hs: { tr: 0.5, crit: 61 * 0.5 / 4, name: '高速 480 Mbit/s', edge: '边沿 500 ps' } };
  $('tbtns').innerHTML = Object.entries(SPD).map(([k, s]) => `<button class="btn" data-t="${k}" aria-pressed="false">${s.name}</button>`).join('');
  C.el('text', { x: X0, y: 16, class: 'p4-t' }, svg, '一个上升沿（0–5 ns）');
  C.el('line', { x1: X0, x2: X1, y1: 114, y2: 114, class: 'p4-axis' }, svg);
  for (let t = 0; t <= T1; t++) { C.el('line', { x1: tx(t), x2: tx(t), y1: 114, y2: 119, class: 'p4-axis' }, svg); C.el('text', { x: tx(t), y: 133, 'text-anchor': 'middle', class: 'p4-t mono' }, svg, t + ' ns'); }
  const fly = C.el('rect', { x: X0, y: 40, height: 74, class: 'p4-fly' }, svg);
  const edge = C.el('path', { class: 'p4-edge' }, svg);
  const edgeT = C.el('text', { x: X1, y: 34, 'text-anchor': 'end', class: 'p4-t fg' }, svg, '');
  const flyT = C.el('text', { x: X0, y: 154, class: 'p4-t' }, svg, '');
  C.el('text', { x: X0, y: 180, class: 'p4-t' }, svg, '走线长度（0–70 mm）');
  C.el('line', { x1: X0, x2: X1, y1: 226, y2: 226, class: 'p4-axis' }, svg);
  for (let L = 0; L <= L1; L += 10) { C.el('line', { x1: lx(L), x2: lx(L), y1: 226, y2: 231, class: 'p4-axis' }, svg); if (L % 20 === 0) C.el('text', { x: lx(L), y: 245, 'text-anchor': 'middle', class: 'p4-t mono' }, svg, L + ''); }
  C.el('rect', { x: X0, y: 189, width: lx(DP.len) - X0, height: 10, rx: 2, class: 'p4-len' }, svg);
  C.el('rect', { x: X0, y: 205, width: lx(DN.len) - X0, height: 10, rx: 2, class: 'p4-len' }, svg);
  C.el('text', { x: lx(uMax) + 6, y: 207, class: 'p4-t mono' }, svg, `D+ ${f1(DP.len)} · D− ${f1(DN.len)} mm`);
  const crit = C.el('line', { y1: 184, y2: 230, class: 'p4-crit' }, svg);
  const critT = C.el('text', { y: 264, class: 'p4-t p4-ct' }, svg, '');
  const tf = DN.len * PS_MM / 1000;   // ns
  function show(k) {
    const s = SPD[k];
    C.pressOne('#p4-tbtns [data-t]', 't', k);
    edge.setAttribute('d', `M${X0} 112L${tx(s.tr)} 44L${X1} 44`);
    edgeT.textContent = s.edge;
    fly.setAttribute('width', Math.max(1.5, tx(tf) - X0));
    flyT.textContent = `黄色竖条：D− 从头走到尾 ≈ ${f2(tf)} ns，占边沿的 ${Math.round(tf / s.tr * 100)}%`;
    const bad = s.crit < uMax;
    crit.setAttribute('x1', lx(s.crit)); crit.setAttribute('x2', lx(s.crit)); crit.setAttribute('class', 'p4-crit ' + (bad ? 'bad' : 'ok'));
    const anchorEnd = lx(s.crit) > X1 - 120;
    critT.setAttribute('x', lx(s.crit) + (anchorEnd ? -6 : 6)); critT.setAttribute('text-anchor', anchorEnd ? 'end' : 'start');
    critT.setAttribute('class', 'p4-t p4-ct ' + (bad ? 'bad' : 'ok'));
    critT.textContent = `临界长度 ≈ ${f1(s.crit)} mm${k === 'hs' ? '（按同一判据推算）' : '（10% 判据）'}`;
    const st = $('tst');
    if (!bad) { st.className = 'status good'; st.textContent = `全速：D− 只有临界长度的 ${Math.round(uMax / s.crit * 100)}%，信号走完全程只占最快边沿的 ${Math.round(tf / s.tr * 100)}%。阻抗不对引起的反射藏在边沿里，看不出来。`; }
    else { st.className = 'status bad'; st.textContent = `高速：边沿快了 8 倍，同一判据下临界长度只剩约 ${f1(s.crit)} mm，QB12 的 ${f1(uMax)} mm 已经超了。这时就必须按 90 Ω 差分对走：并行、等长、下面有完整的地，换层时加地过孔。`; }
  }
  $('tbtns').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); });
  show('fs');
})();

/* ================= 4.7 布线器三种模式（示意动画） ================= */
(function () {
  const svg = $('msvg'), W = 10, CLR = 14;
  const A = [44, 100], Bp = [436, 100];
  const U = y => `M200 24V${y}H300V24`;           // 别的网络：从上面两个焊盘下来的一段 U 形线
  const haloP = C.el('path', { class: 'p4-halo', 'stroke-width': W + 2 * CLR }, svg);
  const oth = C.el('path', { class: 'p4-oth', 'stroke-width': W }, svg);
  C.el('circle', { cx: 200, cy: 24, r: 11, class: 'p4-othp' }, svg); C.el('circle', { cx: 300, cy: 24, r: 11, class: 'p4-othp' }, svg);
  C.el('text', { x: 320, y: 30, class: 'p4-t' }, svg, '别的网络（已画好）');
  const nw = C.el('path', { class: 'p4-new', 'stroke-width': W }, svg);
  C.el('circle', { cx: A[0], cy: A[1], r: 11, class: 'p4-newp' }, svg); C.el('circle', { cx: Bp[0], cy: Bp[1], r: 11, class: 'p4-newp' }, svg);
  C.el('text', { x: A[0] - 10, y: A[1] + 30, class: 'p4-t' }, svg, '起点');
  C.el('text', { x: Bp[0] - 14, y: Bp[1] + 30, class: 'p4-t' }, svg, '终点');
  const hits = C.el('g', {}, svg);
  C.el('text', { x: 18, y: 192, class: 'p4-t' }, svg, '示意：灰色带 = 别的线周围要留的间距');
  const MODES = {
    hl: { n: '高亮碰撞', path: `M${A[0]} ${A[1]}H${Bp[0]}`, uy: 118, x: '高亮碰撞：线照你画的走，撞到的地方标出来（红圈），怎么改由你决定。' },
    shove: { n: '推挤', path: `M${A[0]} ${A[1]}H${Bp[0]}`, uy: 70, x: '推挤：把挡路的线推开，给新线让出间距；推不动（碰到焊盘、板边或锁定的线）就停下。' },
    walk: { n: '绕走', path: `M${A[0]} ${A[1]}H136L186 150H314L364 100H${Bp[0]}`, uy: 118, x: '绕走：别的线一根不动，新线自己绕过去。线长了一点，但不会改到已经画好的东西。' }
  };
  $('modes').innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="btn" data-m="${k}" aria-pressed="false">${m.n}</button>`).join('');
  let raf = 0;
  function show(k) {
    const m = MODES[k];
    cancelAnimationFrame(raf);
    C.pressOne('#p4-modes [data-m]', 'm', k);
    $('mst').className = 'status'; $('mst').textContent = m.x;
    nw.setAttribute('d', m.path);
    const L = nw.getTotalLength();
    nw.setAttribute('stroke-dasharray', `${L} ${L}`);
    hits.innerHTML = '';
    const U0 = 118;
    const frame = q => {
      nw.setAttribute('stroke-dashoffset', ((1 - q) * L).toFixed(1));
      const head = nw.getPointAtLength(q * L);
      let uy = U0;
      if (k === 'shove') uy = head.x < 160 ? U0 : head.x > 200 ? m.uy : U0 + (m.uy - U0) * (head.x - 160) / 40;
      oth.setAttribute('d', U(uy)); haloP.setAttribute('d', U(uy));
      if (k === 'hl') {
        [200, 300].forEach(x => { if (head.x >= x && !hits.querySelector(`[data-x="${x}"]`)) { C.el('circle', { cx: x, cy: A[1], r: 16, class: 'p4-hitf', 'data-x': x }, hits); C.el('circle', { cx: x, cy: A[1], r: 16, class: 'p4-hit' }, hits); } });
      }
    };
    if (RMx) { frame(1); return; }
    const t0 = performance.now(), dur = 1800;
    const step = now => { const q = Math.min(1, (now - t0) / dur); frame(q); if (q < 1) raf = requestAnimationFrame(step); };
    frame(0); raf = requestAnimationFrame(step);
  }
  $('modes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) show(b.dataset.m); });
  show('shove');
})();

/* ================= 4.8 自测 ================= */
(function () {
  const w0 = cls('Default').track, w1 = cls('Batt').track;
  $('q1').innerHTML = `${w0} mm 约 ${f2(ipcI(w0, 10))} A，${w1} mm 约 ${f2(ipcI(w1, 10))} A（线宽按公差偏窄 20% 算：${f2(ipcI(w0 * 0.8, 10))} A 和 ${f2(ipcI(w1 * 0.8, 10))} A）。${I_START} A 走 ${w0} mm 的线，按同一个公式升温约 ${Math.round(ipcDT(w0, I_START))} °C，已经顶到曲线的 100 °C 上限，线会很烫；电阻是 ${w1} mm 线的 ${Math.round(w1 / w0)} 倍，电池到电机驱动这 ${f1(BP.len)} mm 要掉 ${Math.round(I_START * mOhm(BP.len, w0))} mV。QB12 这一路用 ${w1} mm，${I_START} A 时升温约 ${f1(ipcDT(w1, I_START))} °C。`;
  $('q2').innerHTML = `做出来的线宽有 ±20% 公差：线做宽了，缝就变窄。两根 ${w0} mm 的线各宽 20%，缝少 ${f2(w0 * 0.2)} mm：按 0.10 mm 画的缝只剩 ${f2(0.1 - w0 * 0.2)} mm，比工厂能保证的还窄；按 QB12 的 ${dflt.clearance} mm 画，最坏也还有 ${f2(dflt.clearance - w0 * 0.2)} mm。而且规则就是自动布线器排线的标准：Freerouting 把 QB12 的线贴着 ${dflt.clearance} mm 排，最窄的地方 ${f3(GMIN.gap)} mm（${GMIN.a} / ${GMIN.b}）。留了余量，工厂审核不会卡，以后手动改线也有地方。`;
  $('q3').innerHTML = `ESP32-S3 的 USB 是全速（12 Mbit/s），边沿 4–20 ns；QB12 的 D+ / D− 只有 ${f1(DP.len)} / ${f1(DN.len)} mm，远短于约 61 mm 的临界长度，信号走完全程约 ${f2(tf())} ns，阻抗失配引起的反射藏在边沿里。高速 USB（480 Mbit/s，边沿 500 ps）或者线很长时，就必须按 90 Ω 差分对走：并行、等长、下面有完整的地；要保证阻抗还得做 4 层板，嘉立创只给 4 层及以上做阻抗控制。`;
  function tf() { return DN.len * PS_MM / 1000; }
  document.querySelectorAll('#p4 [data-p4q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p4q;
    if (q === '1') { toView($('bv')); $('wchips').querySelector(`[data-w="${w1}"]`).click(); }
    else if (q === '2') { toView($('gapbv')); pickGap(0); }
    else { toView($('usbbv')); if (usbGo) usbGo('anim'); }
  }));
})();
