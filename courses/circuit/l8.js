
/* ================= 第 8 课 ================= */
(function () {
  const VM = 3.7;
  const $ = id => document.getElementById(id);
  const goNets = list => { showNets(list); sv.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' }); };

  /* ---------- H 桥：画图 + 物理，两处复用 ---------- */
  function makeHB(svg, opt) {
    const E = (t, a, x, p) => C.el(t, a, p || svg, x);
    if (opt.drv) {
      E('rect', { x: 128, y: 8, width: 404, height: 324, rx: 14, fill: 'none', stroke: 'var(--sig)', 'stroke-dasharray': '6 5', opacity: 0.7 });
      E('text', { class: 'm sg', x: 140, y: 324, 'font-size': 11 }, 'DRV8833 内部 · A 路');
      E('rect', { class: 'box on', x: 8, y: 128, width: 104, height: 84, rx: 10 });
      E('text', { x: 60, y: 150, 'text-anchor': 'middle', 'font-weight': 700 }, '逻辑电路');
      opt.inT1 = E('text', { class: 'm sg', x: 60, y: 172, 'text-anchor': 'middle' }, 'AIN1 = 0');
      opt.inT2 = E('text', { class: 'm sg', x: 60, y: 192, 'text-anchor': 'middle' }, 'AIN2 = 0');
      E('path', { class: 'ln sg', d: 'M112 170 H150', 'stroke-dasharray': '4 4' });
      E('path', { d: 'M150 170 l-8 -5 v10 z', fill: 'var(--sig)' });
    }
    E('path', { class: 'ln pw', d: 'M160 30 H480', 'stroke-width': 3 });
    E('text', { class: 'm pw', x: 488, y: 34 }, 'VM');
    E('text', { class: 'm mu', x: 488, y: 50, 'font-size': 10.5 }, '≈3.7V');
    E('path', { class: 'ln fg', d: 'M160 310 H480', 'stroke-width': 3 });
    E('text', { class: 'm', x: 488, y: 314 }, 'GND');
    const shortL = E('path', { d: 'M200 30 V310', stroke: 'var(--pow)', 'stroke-width': 9, opacity: 0, 'stroke-linecap': 'round' });
    const shortR = E('path', { d: 'M440 30 V310', stroke: 'var(--pow)', 'stroke-width': 9, opacity: 0, 'stroke-linecap': 'round' });
    E('path', { class: 'ln fg', d: 'M200 30 V70 M200 130 V210 M200 270 V310 M440 30 V70 M440 130 V210 M440 270 V310' });
    E('path', { class: 'ln fg', d: 'M200 170 H288 M352 170 H440' });
    E('circle', { cx: 200, cy: 170, r: 4.5, fill: 'var(--fg)' }); E('circle', { cx: 440, cy: 170, r: 4.5, fill: 'var(--fg)' });
    E('text', { class: 'm mu', x: 210, y: 190 }, opt.drv ? 'AOUT1' : 'OUT1');
    E('text', { class: 'm mu', x: 430, y: 190, 'text-anchor': 'end' }, opt.drv ? 'AOUT2' : 'OUT2');
    E('circle', { cx: 320, cy: 170, r: 32, fill: 'var(--panel2)', stroke: 'var(--fg)', 'stroke-width': 2 });
    E('text', { x: 320, y: 176, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 18 }, 'M');
    const polL = E('text', { class: 'm', x: 276, y: 160, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 }, '');
    const polR = E('text', { class: 'm', x: 364, y: 160, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 }, '');
    E('path', { class: 'ln fg', d: 'M320 138 V112' });
    const prop = E('g', {});
    E('ellipse', { cx: 320, cy: 100, rx: 34, ry: 7, fill: 'var(--sig)', opacity: 0.85 }, null, prop);
    E('circle', { cx: 320, cy: 100, r: 5, fill: 'var(--fg)' }, null, prop);
    const warn = E('text', { x: 320, y: 238, 'text-anchor': 'middle', 'font-weight': 700, fill: 'var(--pow)', opacity: 0 }, '直通！VM 直接短路到地');
    const SW = { S1: [200, 70, 130, 1], S2: [440, 70, 130, -1], S3: [200, 210, 270, 1], S4: [440, 210, 270, -1] };
    const sw = {};
    for (const k in SW) {
      const [x, y1, y2, dir] = SW[k];
      const g = E('g', opt.drv ? {} : { class: 'clickable', tabindex: 0, role: 'button', 'aria-label': '开关 ' + k });
      E('rect', { x: x - 36, y: y1 - 8, width: 72, height: y2 - y1 + 16, fill: 'transparent' }, null, g);
      E('circle', { cx: x, cy: y1, r: 4.5, fill: 'var(--fg)' }, null, g);
      E('circle', { cx: x, cy: y2, r: 4.5, fill: 'var(--fg)' }, null, g);
      const lev = E('line', { x1: x, y1: y1, x2: x + 22 * dir, y2: y2 - 8, stroke: 'var(--fg)', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, null, g);
      E('text', { x: x - 16 * dir, y: (y1 + y2) / 2 + 2, 'text-anchor': dir > 0 ? 'end' : 'start', 'font-weight': 700 }, k, g);
      E('text', { class: 'm mu', x: x - 16 * dir, y: (y1 + y2) / 2 + 18, 'text-anchor': dir > 0 ? 'end' : 'start', 'font-size': 10.5 }, y1 < 150 ? '上管' : '下管', g);
      sw[k] = { lev, x, y2, dir, g };
    }
    const flowG = E('g', {});
    let closed = new Set(), state = 'coast', w = 0, ang = 0, flows = [], flowKind = '';
    function classify() {
      const h = k => closed.has(k);
      if ((h('S1') && h('S3')) || (h('S2') && h('S4'))) return 'short';
      if (h('S1') && h('S4')) return 'fwd';
      if (h('S2') && h('S3')) return 'rev';
      if (h('S3') && h('S4')) return 'brake';
      if (h('S1') && h('S2')) return 'brakeH';
      return closed.size ? 'single' : 'coast';
    }
    function setFlows(kind) {
      if (kind === flowKind) return;
      flows.forEach(f => f.remove()); flows = []; flowKind = kind;
      const add = (d, sp, r) => flows.push(C.flow(flowG, d, '', sp, 26, r));
      if (kind === 'fwd') { add('M200 34 V170 H288', 90); add('M352 170 H440 V306', 90); }
      if (kind === 'rev') { add('M440 34 V170 H352', 90); add('M288 170 H200 V306', 90); }
      if (kind === 'genF') add('M288 170 H200 V306 H440 V170 H352', 70);
      if (kind === 'genR') add('M352 170 H440 V306 H200 V170 H288', 70);
      if (kind === 'genHF') add('M288 170 H200 V34 H440 V170 H352', 70);
      if (kind === 'genHR') add('M352 170 H440 V34 H200 V170 H288', 70);
      if (kind === 'short') {
        if (closed.has('S1') && closed.has('S3')) add('M200 34 V306', 300, 4.5);
        if (closed.has('S2') && closed.has('S4')) add('M440 34 V306', 300, 4.5);
      }
    }
    function updFlows() {
      if (state === 'fwd' || state === 'rev' || state === 'short') setFlows(state);
      else if ((state === 'brake' || state === 'brakeH') && Math.abs(w) > 0.06) setFlows((state === 'brake' ? 'gen' : 'genH') + (w > 0 ? 'F' : 'R'));
      else setFlows('');
    }
    function paintStatic() {
      for (const k in sw) {
        const s = sw[k], on = closed.has(k);
        s.lev.setAttribute('x2', on ? s.x : s.x + 22 * s.dir); s.lev.setAttribute('y2', on ? s.y2 : s.y2 - 8);
        s.lev.setAttribute('stroke', on ? 'var(--ok)' : 'var(--fg)');
      }
      shortL.setAttribute('opacity', closed.has('S1') && closed.has('S3') ? 0.45 : 0);
      shortR.setAttribute('opacity', closed.has('S2') && closed.has('S4') ? 0.45 : 0);
      warn.setAttribute('opacity', state === 'short' ? 1 : 0);
    }
    function paintDyn() {
      prop.setAttribute('transform', `rotate(${ang.toFixed(1)} 320 100)`);
      let v = 0, txt;
      if (state === 'fwd') v = VM; else if (state === 'rev') v = -VM;
      else if (state === 'coast' || state === 'single') v = w * 3.0;
      polL.textContent = Math.abs(v) < 0.05 || state === 'short' ? '' : v > 0 ? '+' : '−';
      polR.textContent = Math.abs(v) < 0.05 || state === 'short' ? '' : v > 0 ? '−' : '+';
      polL.setAttribute('fill', v > 0 ? 'var(--pow)' : 'var(--fg)'); polR.setAttribute('fill', v < 0 ? 'var(--pow)' : 'var(--fg)');
      if (state === 'short') txt = '电源被短路';
      else if (state === 'fwd' || state === 'rev') txt = (v > 0 ? '+' : '−') + VM.toFixed(1) + ' V';
      else if (state === 'brake' || state === 'brakeH') txt = '0 V（被短接）';
      else txt = Math.abs(v) < 0.05 ? '0 V' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2) + ' V（电机在发电）';
      if (opt.vEl) opt.vEl.textContent = txt;
      if (opt.wEl) { opt.wEl.textContent = Math.round(w * 100) + ' %'; opt.wEl.className = state === 'short' ? 'bad' : ''; }
    }
    C.tickers.add((t, dt) => {
      if (!svg.isConnected) return;
      const tgt = state === 'fwd' ? 1 : state === 'rev' ? -1 : 0;
      const tau = (state === 'fwd' || state === 'rev') ? 0.5 : (state === 'brake' || state === 'brakeH') ? 0.15 : 1.4;
      w += (tgt - w) * Math.min(1, dt / tau);
      if (Math.abs(w) < 0.002 && tgt === 0) w = 0;
      ang = (ang + w * 1100 * dt) % 360;
      updFlows(); paintDyn();
    });
    return {
      set(list) {
        closed = new Set(list); state = classify();
        if (RM) w = state === 'fwd' ? 1 : state === 'rev' ? -1 : (state === 'brake' || state === 'brakeH') ? 0 : w;
        paintStatic(); updFlows(); paintDyn();
        return state;
      },
      toggle(k) { const s = new Set(closed); s.has(k) ? s.delete(k) : s.add(k); return this.set([...s]); },
      get closed() { return [...closed]; },
      sw
    };
  }

  /* 8.2 手动 H 桥 */
  const T1 = {
    coast: ['', '四个开关全断开：电机没有回路，靠惯性慢慢停下，这叫滑行。'],
    single: ['', '只闭合了一个开关，电流没有回去的路，电机不转。H 桥至少要两个开关配合。'],
    fwd: ['good', 'S1 和 S4 闭合：电流从 VM 经 S1 流进电机左端，从右端经 S4 流到地。电机左正右负，正转。'],
    rev: ['good', 'S2 和 S3 闭合：电流从右往左穿过电机，方向反过来，电机反转。H 桥的意义就在这里：不用拔线就能换方向。'],
    brake: ['', 'S3 和 S4 闭合：电机两端都接地，被短接。还在转的电机像发电机一样发电，电流在 S3、S4 组成的回路里打转，把动能变成热量，电机很快停下。这叫刹车。'],
    brakeH: ['', 'S1 和 S2 闭合：电机两端都接到 VM，电压差为 0，同样被短接，也是刹车。实际芯片一般用两个下管来刹车。'],
    short: ['bad', '同一侧的上下管同时闭合：VM 经过两个开关直接接到地，中间没有任何负载，这就是直通。真实电路里电流瞬间几十安培，MOS 管会烧掉，电池也可能受损。']
  };
  const hb1 = makeHB($('hbsvg'), { vEl: $('hbV'), wEl: $('hbW') });
  function show1(st) {
    $('hbSw').textContent = hb1.closed.length ? hb1.closed.sort().join(' + ') : '无';
    $('hbText').className = 'status ' + T1[st][0]; $('hbText').textContent = T1[st][1];
    const preset = { fwd: 'S1,S4', rev: 'S2,S3', brake: 'S3,S4', coast: '' }[st];
    document.querySelectorAll('[data-hb]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hb === st && hb1.closed.sort().join(',') === preset)));
  }
  for (const k in hb1.sw) {
    const g = hb1.sw[k].g;
    g.addEventListener('click', () => show1(hb1.toggle(k)));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show1(hb1.toggle(k)); } });
  }
  const PRE = { fwd: ['S1', 'S4'], rev: ['S2', 'S3'], brake: ['S3', 'S4'], coast: [] };
  document.querySelectorAll('[data-hb]').forEach(b => b.addEventListener('click', () => show1(hb1.set(PRE[b.dataset.hb]))));
  hb1.set([]); $('hbText').textContent = '点一个开关，或者点“正转”。';

  /* 8.3 交给 DRV8833 */
  const opt2 = { };
  const hb2 = makeHB($('hb2svg'), Object.assign(opt2, { drv: true }));
  let in1 = 0, in2 = 0;
  const MAP = { '00': [], '10': ['S1', 'S4'], '01': ['S2', 'S3'], '11': ['S3', 'S4'] };
  const T2 = {
    '00': '00 → 四个管全关，AOUT1、AOUT2 悬空，电机滑行。ESP32 刚上电、引脚还没配置时就是这个状态（芯片内部有下拉电阻）。',
    '10': '10 → 芯片闭合 S1、S4：AOUT1 高、AOUT2 低，正转。',
    '01': '01 → 芯片闭合 S2、S3：AOUT1 低、AOUT2 高，反转。',
    '11': '11 → 芯片闭合两个下管 S3、S4：电机被短接，刹车。'
  };
  function upd2() {
    const key = '' + in1 + in2;
    hb2.set(MAP[key]);
    $('hb2In1').textContent = 'AIN1 = ' + in1; $('hb2In1').setAttribute('aria-pressed', String(!!in1));
    $('hb2In2').textContent = 'AIN2 = ' + in2; $('hb2In2').setAttribute('aria-pressed', String(!!in2));
    opt2.inT1.textContent = 'AIN1 = ' + in1; opt2.inT2.textContent = 'AIN2 = ' + in2;
    document.querySelectorAll('#hbTT tbody tr').forEach(r => r.style.background = r.dataset.r === key ? 'color-mix(in srgb,var(--hl) 22%,transparent)' : '');
    $('hb2Text').className = 'status ' + (key === '10' || key === '01' ? 'good' : '');
    $('hb2Text').textContent = T2[key] + ' 无论怎么点，都不会出现直通。';
  }
  $('hb2In1').addEventListener('click', () => { in1 ^= 1; upd2(); });
  $('hb2In2').addEventListener('click', () => { in2 ^= 1; upd2(); });
  upd2();

  /* ---------- 8.4 PWM 与衰减 ---------- */
  const P = { R: 1.6, L: 150e-6, T: 50e-6, dt: 0.25e-6, Vd: 0.8, I0: 0.08, c: 0.0397 };
  const Iload = e => P.I0 + P.c * e * e;
  const EMAX = (-1 / P.R + Math.sqrt(1 / (P.R * P.R) - 4 * P.c * (P.I0 - VM / P.R))) / (2 * P.c);
  function simPWM(D, mode, Eb, periods, rec) {
    let i = 0, acc = 0, vacc = 0; const n = Math.round(P.T / P.dt), out = [];
    for (let p = 0; p < periods; p++) {
      acc = 0; vacc = 0;
      for (let k = 0; k < n; k++) {
        const t = k * P.dt, on = t < D * P.T;
        let v = on ? VM : mode === 'slow' ? 0 : (i > 1e-6 ? -(VM + 2 * P.Vd) : null), vm;
        if (v === null) { i = 0; vm = Eb; }
        else { i += (v - Eb - P.R * i) / P.L * P.dt; vm = v; if (mode === 'fast' && !on && i < 0) i = 0; }
        acc += i; vacc += vm;
        if (rec && p === periods - 1) out.push([t, vm, i, on]);
      }
    }
    return { ia: acc / n, va: vacc / n, out };
  }
  function solve(D, mode) {
    if (D <= 0) return 0;
    if (D >= 1) return EMAX;
    if (simPWM(D, mode, 0, 14).ia <= Iload(0)) return 0;
    let lo = 0, hi = VM;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (simPWM(D, mode, m, 14).ia > Iload(m)) lo = m; else hi = m; }
    return lo;
  }
  // 转速曲线
  const CURVE = { slow: [], fast: [] };
  for (const md of ['slow', 'fast']) for (let k = 0; k <= 20; k++) CURVE[md].push(solve(k / 20, md) / EMAX);
  const spAt = (md, D) => { const x = D * 20, a = Math.floor(x), b = Math.min(20, a + 1); return CURVE[md][a] + (CURVE[md][b] - CURVE[md][a]) * (x - a); };

  const ps = $('pwmsvg');
  const X0 = 56, X1 = 624, TT = 150e-6, Xt = t => X0 + t / TT * (X1 - X0);
  const Yv = v => 228 - (v + 6) / 10 * 110, Yi = a => 366 - (a + 0.1) / 0.6 * 110;
  const G = (t, a, x) => C.el(t, a, ps, x);
  G('text', { class: 'axis', x: X0, y: 12 }, '输入脚（逻辑电平）');
  G('text', { class: 'axis', x: X0, y: 112 }, '电机两端电压（V）');
  G('text', { class: 'axis', x: X0, y: 250 }, '电机电流（A）');
  const bandG = G('g', {});
  [-4, -2, 0, 2, 4].forEach(v => { G('line', { class: 'gridl', x1: X0, x2: X1, y1: Yv(v), y2: Yv(v) }); G('text', { class: 'axis', x: X0 - 8, y: Yv(v) + 4, 'text-anchor': 'end' }, (v > 0 ? '+' : '') + v); });
  [0, 0.2, 0.4].forEach(a => { G('line', { class: 'gridl', x1: X0, x2: X1, y1: Yi(a), y2: Yi(a) }); G('text', { class: 'axis', x: X0 - 8, y: Yi(a) + 4, 'text-anchor': 'end' }, a.toFixed(1)); });
  G('line', { class: 'gridl', x1: X0, x2: X1, y1: 18, y2: 18 }); G('line', { class: 'gridl', x1: X0, x2: X1, y1: 92, y2: 92 });
  for (let t = 0; t <= 150; t += 25) G('text', { class: 'axis', x: Xt(t * 1e-6), y: 384, 'text-anchor': 'middle' }, t);
  G('text', { class: 'axis', x: X1, y: 402, 'text-anchor': 'end' }, '时间（µs）· 20kHz，一个周期 50µs');
  G('text', { class: 'm', x: X0 - 8, y: 40, 'text-anchor': 'end' }, 'IN1'); G('text', { class: 'm', x: X0 - 8, y: 76, 'text-anchor': 'end' }, 'IN2');
  const pIn1 = G('path', { class: 'curve', stroke: 'var(--sig)' }), pIn2 = G('path', { class: 'curve', stroke: 'var(--sig)' });
  const pV = G('path', { class: 'curve', stroke: 'var(--c1)' }), pI = G('path', { class: 'curve', stroke: 'var(--c2)' });
  const vAvgL = G('line', { stroke: 'var(--c1)', 'stroke-dasharray': '5 4', 'stroke-width': 1.2, x1: X0, x2: X1 });
  const vAvgT = G('text', { class: 'axis', x: X1 - 4, 'text-anchor': 'end' }, '');
  const cur = G('line', { class: 'cursor', y1: 18, y2: 366, opacity: 0 });
  const cdV = G('circle', { r: 4, fill: 'var(--c1)', class: 'cdot', opacity: 0 }), cdI = G('circle', { r: 4, fill: 'var(--c2)', class: 'cdot', opacity: 0 });
  let D = 0.5, mode = 'slow', rec = [];
  function digital(fn, yH, yL) {
    let d = '', prev = null;
    for (let t = 0; t <= TT + 1e-9; t += P.dt) { const v = fn(t % P.T) ? yH : yL, x = Xt(Math.min(t, TT)).toFixed(1); if (prev === null) d = `M${x} ${v}`; else if (v !== prev) d += `H${x}V${v}`; prev = v; }
    return d + `H${X1}`;
  }
  function updPWM() {
    const Eb = solve(D, mode), r = simPWM(D, mode, Eb, 14, true); rec = r.out;
    const onF = t => t < D * P.T;
    pIn1.setAttribute('d', mode === 'slow' ? digital(() => 1, 26, 46) : digital(onF, 26, 46));
    pIn2.setAttribute('d', mode === 'slow' ? digital(t => !onF(t), 62, 82) : digital(() => 0, 62, 82));
    bandG.innerHTML = '';
    for (let k = 0; k < 3 && D > 0; k++) {
      C.el('rect', { x: Xt(k * P.T), y: 118, width: Xt(D * P.T) - X0, height: 110, class: 'band' }, bandG);
      C.el('rect', { x: Xt(k * P.T), y: 256, width: Xt(D * P.T) - X0, height: 110, class: 'band' }, bandG);
    }
    let dv = '', di = '';
    for (let k = 0; k < 3; k++) rec.forEach(([t, v, i], j) => { const x = Xt(t + k * P.T).toFixed(1); dv += (dv ? 'L' : 'M') + x + ' ' + Yv(v).toFixed(1); di += (di ? 'L' : 'M') + x + ' ' + Yi(Math.max(-0.1, Math.min(0.5, i))).toFixed(1); });
    pV.setAttribute('d', dv); pI.setAttribute('d', di);
    vAvgL.setAttribute('y1', Yv(r.va)); vAvgL.setAttribute('y2', Yv(r.va)); vAvgT.setAttribute('y', Yv(r.va) - 5); vAvgT.textContent = '平均 ' + r.va.toFixed(2) + ' V';
    const sp = Eb / EMAX;
    $('pwmDV').textContent = Math.round(D * 100) + ' %';
    $('pwmReg').textContent = mode === 'slow' ? `IN2 = ${Math.round((1 - D) * 100)}%` : `IN1 = ${Math.round(D * 100)}%`;
    $('pwmVa').textContent = r.va.toFixed(2) + ' V';
    $('pwmIa').textContent = r.ia.toFixed(2) + ' A';
    $('pwmSp').textContent = Math.round(sp * 100) + ' %'; $('pwmSp').className = sp < 0.01 && D > 0 ? 'bad' : '';
    const st = $('pwmText');
    if (D === 0) { st.className = 'status'; st.textContent = '占空比 0：一直不推，电机不转。'; }
    else if (D === 1) { st.className = 'status good'; st.textContent = '占空比 100%：一直接通，电机拿到全部电压，满速。两种方式这时没有区别。'; }
    else if (mode === 'slow') { st.className = 'status good'; st.textContent = `慢衰减：断开的那段电机被短接，电流（橙线）只是缓缓下降，一直没断。平均电压 ≈ ${Math.round(D * 100)}% × 3.7V，转速约 ${Math.round(sp * 100)}%，和占空比几乎成正比。注意 IN2 的占空比是 ${Math.round((1 - D) * 100)}%，正好反过来。`; }
    else { st.className = sp < 0.01 ? 'status bad' : 'status warn'; st.textContent = sp < 0.01 ? `快衰减：每次断开，电机两端被反向加上约 −5V，电流一下就掉到 0。占空比 ${Math.round(D * 100)}% 时电机拿到的力气还不够克服摩擦，根本转不起来。` : `快衰减：断开时电流被反向电压迅速打到 0，之后一段时间电机两端只剩它自己的反电动势。同样的占空比，转速只有约 ${Math.round(sp * 100)}%，比慢衰减（${Math.round(spAt('slow', D) * 100)}%）低。`; }
    updSpd();
  }
  ps.addEventListener('pointermove', e => {
    const r = ps.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 640;
    if (x < X0 || x > X1 || !rec.length) return;
    const t = (x - X0) / (X1 - X0) * TT, tp = t % P.T, j = Math.min(rec.length - 1, Math.round(tp / P.dt)), [, v, i, on] = rec[j];
    cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.setAttribute('opacity', 1);
    cdV.setAttribute('cx', x); cdV.setAttribute('cy', Yv(v)); cdV.setAttribute('opacity', 1);
    cdI.setAttribute('cx', x); cdI.setAttribute('cy', Yi(Math.max(-0.1, Math.min(0.5, i)))); cdI.setAttribute('opacity', 1);
    const i1 = mode === 'slow' ? 1 : on ? 1 : 0, i2 = mode === 'slow' ? (on ? 0 : 1) : 0;
    $('pwmHov').textContent = `t = ${(t * 1e6).toFixed(1)} µs · IN1 = ${i1}, IN2 = ${i2} · 电压 ${v >= 0 ? '+' : ''}${v.toFixed(2)} V · 电流 ${i.toFixed(2)} A · ${on ? '正在推电机' : mode === 'slow' ? '两个下管短接续流' : i > 0.001 ? '体二极管续流，电流快速下降' : '电流已断，电机两端只剩反电动势'}`;
  });
  ps.addEventListener('pointerleave', () => [cur, cdV, cdI].forEach(n => n.setAttribute('opacity', 0)));
  $('pwmD').addEventListener('input', e => { D = +e.target.value / 100; updPWM(); });
  document.querySelectorAll('[data-dm]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.dm; C.pressOne('[data-dm]', 'dm', mode); updPWM(); }));

  // 转速 vs 占空比
  const ss = $('spdsvg');
  const sx0 = 56, sx1 = 600, SX = d => sx0 + d * (sx1 - sx0), SY = s => 210 - s * 180;
  const S = (t, a, x) => C.el(t, a, ss, x);
  [0, 0.25, 0.5, 0.75, 1].forEach(s => { S('line', { class: 'gridl', x1: sx0, x2: sx1, y1: SY(s), y2: SY(s) }); S('text', { class: 'axis', x: sx0 - 8, y: SY(s) + 4, 'text-anchor': 'end' }, Math.round(s * 100) + '%'); });
  [0, 0.25, 0.5, 0.75, 1].forEach(d => S('text', { class: 'axis', x: SX(d), y: 228, 'text-anchor': 'middle' }, Math.round(d * 100) + '%'));
  S('text', { class: 'axis', x: sx1, y: 246, 'text-anchor': 'end' }, '横轴：推动电机的时间占比　纵轴：转速（相对满速）');
  const path = md => CURVE[md].map((s, k) => (k ? 'L' : 'M') + SX(k / 20).toFixed(1) + ' ' + SY(s).toFixed(1)).join('');
  S('path', { class: 'curve', stroke: 'var(--c1)', d: path('slow') });
  S('path', { class: 'curve', stroke: 'var(--c2)', d: path('fast') });
  S('text', { x: SX(0.42) - 6, y: SY(spAt('slow', 0.42)) - 10, 'text-anchor': 'end', fill: 'var(--c1)', 'font-weight': 700 }, '慢衰减');
  S('text', { x: SX(0.62) + 8, y: SY(spAt('fast', 0.62)) + 18, fill: 'var(--c2)', 'font-weight': 700 }, '快衰减');
  const mS = S('circle', { r: 5.5, fill: 'var(--c1)', class: 'cdot' }), mF = S('circle', { r: 5.5, fill: 'var(--c2)', class: 'cdot' });
  const mL = S('line', { class: 'cursor', y1: SY(1), y2: SY(0) });
  const mT = S('text', { class: 'axis', y: SY(1) + 2 }, '');
  function updSpd() {
    const x = SX(D);
    mS.setAttribute('cx', x); mS.setAttribute('cy', SY(spAt('slow', D)));
    mF.setAttribute('cx', x); mF.setAttribute('cy', SY(spAt('fast', D)));
    mL.setAttribute('x1', x); mL.setAttribute('x2', x);
    mT.setAttribute('x', D > 0.7 ? x - 8 : x + 8); mT.setAttribute('text-anchor', D > 0.7 ? 'end' : 'start');
    mT.textContent = `${Math.round(D * 100)}%：慢 ${Math.round(spAt('slow', D) * 100)}% · 快 ${Math.round(spAt('fast', D) * 100)}%`;
  }
  updPWM();

  /* ---------- 8.5 限流 ---------- */
  const os = $('ocpsvg');
  const ox0 = 56, ox1 = 616, TM = 0.4, OX = t => ox0 + t / TM * (ox1 - ox0);
  const OYi = a => 178 - a / 2.5 * 160, OYs = s => 330 - s * 120;
  const O = (t, a, x) => C.el(t, a, os, x);
  O('text', { class: 'axis', x: ox0, y: 12 }, '电机电流（A）');
  O('text', { class: 'axis', x: ox0, y: 204 }, '转速（%）');
  [0, 0.5, 1, 1.5, 2, 2.5].forEach(a => { O('line', { class: 'gridl', x1: ox0, x2: ox1, y1: OYi(a), y2: OYi(a) }); O('text', { class: 'axis', x: ox0 - 8, y: OYi(a) + 4, 'text-anchor': 'end' }, a.toFixed(1)); });
  [0, 0.5, 1].forEach(s => { O('line', { class: 'gridl', x1: ox0, x2: ox1, y1: OYs(s), y2: OYs(s) }); O('text', { class: 'axis', x: ox0 - 8, y: OYs(s) + 4, 'text-anchor': 'end' }, Math.round(s * 100)); });
  for (let t = 0; t <= 400; t += 50) O('text', { class: 'axis', x: OX(t / 1000), y: 348, 'text-anchor': 'middle' }, t);
  O('text', { class: 'axis', x: ox1, y: 368, 'text-anchor': 'end' }, '时间（ms），0 时刻摇杆一推到底');
  O('line', { class: 'limit', x1: ox0, x2: ox1, y1: OYi(2), y2: OYi(2) });
  O('text', { class: 'axis', x: ox1 - 4, y: OYi(2) - 6, 'text-anchor': 'end', fill: 'var(--pow)' }, '过流保护 2A（最低）');
  const chL = O('line', { stroke: 'var(--c2)', 'stroke-dasharray': '5 4', 'stroke-width': 1.2, x1: ox0, x2: ox1 });
  const chT = O('text', { class: 'axis', x: OX(0.2), 'text-anchor': 'middle', fill: 'var(--c2)' }, '');
  const nI = O('path', { class: 'curve', stroke: 'var(--c1)' }), lI = O('path', { class: 'curve', stroke: 'var(--c2)' });
  const nS = O('path', { class: 'curve', stroke: 'var(--c1)' }), lS = O('path', { class: 'curve', stroke: 'var(--c2)' });
  const n90 = O('circle', { r: 4.5, fill: 'var(--c1)', class: 'cdot' }), l90 = O('circle', { r: 4.5, fill: 'var(--c2)', class: 'cdot' });
  const n90t = O('text', { class: 'axis', fill: 'var(--c1)', 'text-anchor': 'end' }, ''), l90t = O('text', { class: 'axis', fill: 'var(--c2)' }, '');
  const oc = O('line', { class: 'cursor', y1: 18, y2: 330, opacity: 0 });
  let Rs = 0.2, sims = null, raf = 0;
  function startup(ich) {
    const out = []; let e = 0, pk = 0, t90 = null;
    for (let k = 0; k <= 4000; k++) {
      const t = k * 1e-4, i = Math.min((VM - e) / P.R, ich);
      pk = Math.max(pk, i); out.push([t, i, e / EMAX]);
      if (t90 === null && e >= 0.9 * EMAX) t90 = t;
      e += 45 * (i - Iload(e)) * 1e-4;
    }
    return { out, pk, t90 };
  }
  const NAT = startup(1e9);
  function drawOcp(upto) {
    const mk = (s, f, Y) => { let d = ''; for (let k = 0; k < s.out.length && s.out[k][0] <= upto; k += 4) d += (d ? 'L' : 'M') + OX(s.out[k][0]).toFixed(1) + ' ' + Y(s.out[k][f]).toFixed(1); return d; };
    nI.setAttribute('d', mk(NAT, 1, OYi)); nS.setAttribute('d', mk(NAT, 2, OYs));
    lI.setAttribute('d', mk(sims, 1, OYi)); lS.setAttribute('d', mk(sims, 2, OYs));
    const showT = (c, tx, s, left) => {
      if (s.t90 !== null && s.t90 <= upto) { c.setAttribute('cx', OX(s.t90)); c.setAttribute('cy', OYs(0.9)); c.setAttribute('opacity', 1); tx.setAttribute('x', OX(s.t90) + (left ? -8 : 8)); tx.setAttribute('y', OYs(0.9) + (left ? -8 : 16)); tx.textContent = Math.round(s.t90 * 1000) + 'ms'; }
      else { c.setAttribute('opacity', 0); tx.textContent = ''; }
    };
    showT(n90, n90t, NAT, true); showT(l90, l90t, sims, false);
  }
  function runOcp() {
    const ich = 0.2 / Rs; sims = startup(ich);
    chL.setAttribute('y1', OYi(ich)); chL.setAttribute('y2', OYi(ich)); chT.setAttribute('y', OYi(ich) + (ich < 0.5 ? 16 : -6)); chT.textContent = `限流 0.2V ÷ ${Rs}Ω = ${ich.toFixed(2)}A`;
    $('ocpI').textContent = ich.toFixed(2) + ' A';
    $('ocpPk').textContent = `${sims.pk.toFixed(2)} / ${NAT.pk.toFixed(2)} A`;
    $('ocpT').textContent = (sims.t90 === null ? '到不了' : Math.round(sims.t90 * 1000)) + ` / ${Math.round(NAT.t90 * 1000)} ms`;
    $('ocpT').className = sims.t90 === null || sims.t90 > 0.2 ? 'warn' : '';
    const tot = 2 * sims.pk;
    $('ocpTot').textContent = `${tot.toFixed(1)} A · −${(tot * 0.2).toFixed(2)} V`;
    $('ocpTot').className = tot * 0.2 > 0.6 ? 'bad' : '';
    const st = $('ocpText'), slow = sims.t90 === null ? Infinity : sims.t90 * 1000, natT = NAT.t90 * 1000;
    const topS = Math.round((ich < Iload(EMAX) ? Math.sqrt((ich - P.I0) / P.c) / EMAX : 1) * 100);
    if (Rs === 0.1) { st.className = 'status warn'; st.textContent = `限流 2A，正好压在过流保护的最低门槛上：有的芯片会触发保护，关断 1.35ms 再重试，电机一顿一顿。两个电机一起起步，电池要出约 ${tot.toFixed(1)}A，VSYS 掉约 ${(tot * 0.2).toFixed(1)}V，ESP32 有重启风险。`; }
    else if (Rs === 0.2) { st.className = 'status good'; st.textContent = `限流 1A：峰值从 ${NAT.pk.toFixed(1)}A 降到 1A，起步只慢了约 ${Math.round(slow - natT)}ms。两个电机一起起步，电池出 2A，VSYS 只掉约 0.4V，3.3V 稳得住。`; }
    else if (Rs === 0.33) { st.className = 'status'; st.textContent = `限流 ${ich.toFixed(2)}A：更温和，但到 90% 转速要 ${Math.round(slow)}ms，是不限流时的 ${(slow / natT).toFixed(1)} 倍，摇杆推下去船要愣一下才走。`; }
    else { st.className = 'status warn'; st.textContent = `限流 ${ich.toFixed(2)}A：已经接近电机正常运转要的电流，电机一直在被限流，加速非常慢${sims.t90 === null ? '，而且永远到不了 90% 转速' : `（${Math.round(slow)}ms 才到 90%）`}，最终也只能到约 ${topS}% 转速。`; }
    cancelAnimationFrame(raf);
    if (RM) { drawOcp(TM); return; }
    const t0 = performance.now();
    const step = now => { const u = Math.min(TM, (now - t0) / 1600 * TM); drawOcp(u); if (u < TM) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  document.querySelectorAll('[data-rs]').forEach(b => b.addEventListener('click', () => { Rs = +b.dataset.rs; C.pressOne('[data-rs]', 'rs', b.dataset.rs); runOcp(); }));
  $('ocpGo').addEventListener('click', runOcp);
  os.addEventListener('pointermove', e => {
    const r = os.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 640;
    if (x < ox0 || x > ox1 || !sims) return;
    const t = (x - ox0) / (ox1 - ox0) * TM, k = Math.min(4000, Math.round(t / 1e-4)), a = NAT.out[k], b = sims.out[k];
    oc.setAttribute('x1', x); oc.setAttribute('x2', x); oc.setAttribute('opacity', 1);
    $('ocpHov').textContent = `${Math.round(t * 1000)} ms · 不限流：${a[1].toFixed(2)} A、转速 ${Math.round(a[2] * 100)}% · 限流（${Rs}Ω）：${b[1].toFixed(2)} A、转速 ${Math.round(b[2] * 100)}%`;
  });
  os.addEventListener('pointerleave', () => oc.setAttribute('opacity', 0));
  runOcp();

  /* ---------- 8.6 引脚图 ---------- */
  const PINS = {
    1: ['nSLEEP', 'IO15 · R9 下拉', 's', ['nSLEEP'], '低电平：芯片睡眠，H 桥全关，几乎不耗电；高电平：工作。ESP32 刚上电、复位、烧程序时引脚是悬空的，R9（10kΩ）保证这段时间驱动在睡觉，电机不会乱抽。芯片内部也有 500kΩ 下拉，但太弱，外面再加一颗更稳。拉高后要等约 1ms 才能用。'],
    2: ['AOUT1', 'J3 + · 左电机', 'f', ['ML+'], 'A 路 H 桥左腿的中点（S1、S3 之间），接左电机的 + 端。'],
    3: ['AISEN', 'R15 0.2Ω → 地', 'h', ['ISENA'], 'A 路两个下管的源极从这里出来，经 R15 接地。电机电流全部流过 R15，芯片测它上面的电压来限流（8.5）。不需要限流时这个脚直接接地。'],
    4: ['AOUT2', 'J3 − · 左电机', 'f', ['ML-'], 'A 路右腿的中点，接左电机的 − 端。'],
    5: ['BOUT2', 'J4 − · 右电机', 'f', ['MR-'], 'B 路右腿的中点，接右电机的 − 端。'],
    6: ['BISEN', 'R16 0.2Ω → 地', 'h', ['ISENB'], 'B 路的电流检测，和 AISEN 一样，限流 1A。'],
    7: ['BOUT1', 'J4 + · 右电机', 'f', ['MR+'], 'B 路左腿的中点，接右电机的 + 端。'],
    8: ['nFAULT', 'IO16 · R10 上拉', 's', ['nFAULT'], '故障报警。开漏输出：平时芯片不管它，R10 把它拉到 3.3V；过流、过热、欠压时芯片把它拉到地。程序读到低电平就知道出事了，可以让状态灯快闪。和第 3 课 TP4056 的 CHRG 脚是同一种开漏用法。'],
    9: ['BIN1', 'IO6', 's', ['BIN1'], '右电机控制输入 1。芯片内部有下拉，悬空等于 0。'],
    10: ['BIN2', 'IO7', 's', ['BIN2'], '右电机控制输入 2。'],
    11: ['VCP', 'C12 10nF → VM', 'c', ['VCP', 'VSYS'], 'H 桥的上管也是 N 沟道 MOS，要让它完全导通，栅极电压得比源极（接近 VM）还高几伏。芯片内部有个电荷泵，把电压“泵”到 VM 以上，C12 是泵用的储能电容。电容接在 VCP 和 VM 之间。'],
    12: ['VM', 'VSYS · 4×22µF + 100nF', 'p', ['VSYS'], '电机电源，2.7–10.8V，我们直接接 VSYS（3.0–4.6V）。电机电流随 PWM 一开一关，C9、C10、C14、C15（共 88µF）就近供应脉冲电流，C11（100nF）滤高频。VM 低于约 2.6V 芯片会欠压关断。'],
    13: ['GND', '地', 'g', ['GND'], '芯片的地。'],
    14: ['VINT', 'C13 2.2µF → 地', 'c', ['VINT'], '芯片内部稳压器的输出，只给自己内部电路用。外面只需要一颗 2.2µF 电容稳住它，不能拿来给别的电路供电。'],
    15: ['AIN2', 'IO5', 's', ['AIN2'], '左电机控制输入 2。'],
    16: ['AIN1', 'IO4', 's', ['AIN1'], '左电机控制输入 1。'],
    EP: ['散热焊盘', '底部 → 地', 'g', ['GND'], '芯片肚子底下的大焊盘，接地。电机电流在 MOS 管里产生的热量从这里经过孔传到 PCB 背面的大片铜皮散掉。贴片时这里要上满锡。']
  };
  const COL = { s: 'var(--sig)', p: 'var(--pow)', f: 'var(--fg)', h: 'var(--hl)', g: 'var(--muted)', c: 'var(--c3)' };
  const ds = $('drvsvg');
  const Dd = (t, a, x, p) => C.el(t, a, p || ds, x);
  Dd('rect', { x: 196, y: 16, width: 128, height: 298, rx: 8, fill: 'var(--panel2)', stroke: 'var(--fg)', 'stroke-width': 1.6 });
  Dd('circle', { cx: 212, cy: 32, r: 4, fill: 'var(--muted)' });
  Dd('text', { x: 260, y: 307, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 12 }, 'DRV8833');
  const pinG = {};
  const mkPin = (key, y, left) => {
    const [nm, conn, cat] = PINS[key];
    const g = Dd('g', { class: 'clickable', tabindex: 0, role: 'button', 'aria-label': '引脚 ' + key + ' ' + nm });
    const px = left ? 178 : 324;
    Dd('rect', { x: left ? 150 : 324, y: y - 12, width: 46, height: 24, fill: 'transparent' }, null, g);
    const r = Dd('rect', { x: px, y: y - 5, width: 18, height: 10, rx: 2, fill: COL[cat], opacity: 0.9 }, null, g);
    Dd('text', { class: 'm', x: left ? 204 : 316, y: y + 4, 'text-anchor': left ? 'start' : 'end', 'font-size': 11 }, nm, g);
    Dd('text', { class: 'm mu', x: left ? 186 : 334, y: y - 8, 'text-anchor': 'middle', 'font-size': 9 }, key, g);
    Dd('text', { class: 'm mu', x: left ? 170 : 350, y: y + 4, 'text-anchor': left ? 'end' : 'start', 'font-size': 10.5 }, conn, g);
    pinG[key] = { g, r };
    const pick = () => pickPin(key);
    g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  };
  for (let k = 0; k < 8; k++) { mkPin(String(k + 1), 44 + k * 34, true); mkPin(String(16 - k), 44 + k * 34, false); }
  const epG = Dd('g', { class: 'clickable', tabindex: 0, role: 'button', 'aria-label': '散热焊盘' });
  const epR = Dd('rect', { x: 244, y: 110, width: 32, height: 110, rx: 4, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, null, epG);
  Dd('text', { class: 'm mu', x: 260, y: 170, 'text-anchor': 'middle', 'font-size': 10 }, 'EP', epG);
  pinG.EP = { g: epG, r: epR };
  epG.addEventListener('click', () => pickPin('EP'));
  epG.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickPin('EP'); } });
  function pickPin(key) {
    const [nm, conn, , nets, desc] = PINS[key];
    for (const k in pinG) pinG[k].r.setAttribute('stroke', k === key ? 'var(--hl)' : (k === 'EP' ? 'var(--muted)' : 'none'));
    for (const k in pinG) pinG[k].r.setAttribute('stroke-width', k === key ? 3 : 1);
    const info = $('drvInfo');
    info.innerHTML = `<h4 style="margin:0;font-family:var(--f-mono);font-size:17px">${key === 'EP' ? '' : key + ' · '}${nm}</h4><p style="color:var(--muted);font-size:13.5px;font-family:var(--f-mono)">接到：${conn}</p><p style="color:var(--body);font-size:15px">${desc}</p>`;
    if (!(nets.length === 1 && nets[0] === 'GND')) {
      const b = document.createElement('button'); b.className = 'show'; b.style.alignSelf = 'flex-start';
      b.textContent = '在原理图上标出 ' + nets.join('、'); b.addEventListener('click', () => goNets(nets)); info.appendChild(b);
    }
  }
  pickPin('1');
})();
