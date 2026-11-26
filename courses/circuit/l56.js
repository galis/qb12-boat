
/* ================= 第 5 课：自动切换 ================= */
(function () {
  const svg = document.getElementById('apsvg');
  const E = (t, a, p, x) => C.el(t, a, p || svg, x);
  // 导线
  const W = {};
  const wire = (id, d) => (W[id] = E('path', { class: 'ln', d }));
  E('rect', { class: 'box', x: 20, y: 30, width: 100, height: 60, rx: 10 });
  E('text', { x: 70, y: 56, 'text-anchor': 'middle', 'font-weight': 700 }, null, 'USB-C');
  const usbT = E('text', { class: 'm mu', x: 70, y: 76, 'text-anchor': 'middle' }, null, 'VBUS');
  wire('vbus', 'M120 60 H300');
  E('path', { d: 'M300 48 L336 60 L300 72 Z', fill: 'var(--fg)' });
  E('path', { class: 'ln fg', d: 'M337 46 V74' });
  E('text', { class: 'm', x: 300, y: 38 }, null, 'D1 SS34');
  wire('vsysTop', 'M337 60 H620');
  E('text', { class: 'm pw', x: 470, y: 50 }, null, 'VSYS');
  // R13
  E('circle', { cx: 200, cy: 60, r: 4, fill: 'var(--fg)' });
  E('path', { class: 'ln fg', d: 'M200 60 V92 M200 132 V146 M188 146 H212 M193 152 H207 M198 158 H202' });
  E('rect', { x: 192, y: 92, width: 16, height: 40, rx: 2, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 });
  E('text', { class: 'm', x: 152, y: 112 }, null, 'R13');
  E('text', { class: 'm mu', x: 146, y: 128 }, null, '10kΩ');
  // 栅极线
  E('circle', { cx: 270, cy: 60, r: 4, fill: 'var(--fg)' });
  wire('gate', 'M270 60 V170 H440 V210');
  const gT = E('text', { class: 'm sg', x: 300, y: 162 }, null, 'G = 5.0V');
  // 充电
  wire('chg', 'M70 90 V140');
  E('rect', { class: 'box', x: 22, y: 140, width: 96, height: 38, rx: 8 });
  E('text', { class: 'm', x: 70, y: 164, 'text-anchor': 'middle' }, null, 'U4 充电');
  wire('chg2', 'M70 178 V210');
  E('rect', { class: 'box', x: 20, y: 210, width: 100, height: 60, rx: 10 });
  E('text', { x: 70, y: 236, 'text-anchor': 'middle', 'font-weight': 700 }, null, '电池');
  const batT = E('text', { class: 'm mu', x: 70, y: 256, 'text-anchor': 'middle' }, null, '3.80V');
  // 电池 → Q1 → VSYS
  wire('bat', 'M120 240 H380');
  E('text', { class: 'm pw', x: 210, y: 232 }, null, 'BAT_SW（经 Q2）');
  const q1 = E('rect', { class: 'box', x: 380, y: 210, width: 120, height: 60, rx: 8 });
  E('text', { x: 440, y: 238, 'text-anchor': 'middle', 'font-weight': 700 }, null, 'Q1');
  E('text', { class: 'm mu', x: 440, y: 256, 'text-anchor': 'middle' }, null, 'P-MOS');
  E('text', { class: 'm', x: 386, y: 230 }, null, 'D'); E('text', { class: 'm', x: 486, y: 230 }, null, 'S'); E('text', { class: 'm', x: 446, y: 222 }, null, 'G');
  wire('q1out', 'M500 240 H620');
  wire('bus', 'M620 60 V240');
  // 体二极管
  wire('bd', 'M390 270 V292 H425 M447 292 H490 V270');
  const bdTri = E('path', { d: 'M425 282 L446 292 L425 302 Z', fill: 'var(--muted)' });
  E('path', { class: 'ln mu', d: 'M447 281 V303' });
  E('text', { class: 'm mu', x: 504, y: 300, 'font-size': 11 }, null, '体二极管');
  // 负载
  E('path', { class: 'ln fg', d: 'M620 150 H650' });
  const load = E('rect', { class: 'box on', x: 650, y: 120, width: 90, height: 60, rx: 10 });
  E('text', { x: 695, y: 146, 'text-anchor': 'middle', 'font-weight': 700 }, null, '全板');
  const vsT = E('text', { class: 'm pw', x: 695, y: 166, 'text-anchor': 'middle' }, null, '4.60V');
  const dots = E('g', {});
  let fl = {};
  const setFlow = (key, on, d, cls, sp) => {
    if (on && !fl[key]) fl[key] = C.flow(dots, d, cls, sp, 30, 3.4);
    if (!on && fl[key]) { fl[key].remove(); delete fl[key]; }
  };

  // 时序图
  const ch = document.getElementById('apchart');
  const x0 = 50, x1 = 600, X = t => x0 + t / 20 * (x1 - x0), Y = v => 200 - v / 5.5 * 180;
  [0, 1, 2, 3, 4, 5].forEach(v => { C.el('line', { class: 'gridl', x1: x0, x2: x1, y1: Y(v), y2: Y(v) }, ch); C.el('text', { class: 'axis', x: x0 - 8, y: Y(v) + 4, 'text-anchor': 'end' }, ch, v); });
  [0, 5, 10, 15, 20].forEach(t => C.el('text', { class: 'axis', x: X(t), y: 218, 'text-anchor': 'middle' }, ch, t + ' ms'));
  C.el('text', { class: 'axis', x: x0 - 8, y: 12, 'text-anchor': 'end' }, ch, 'V');
  const pV = C.el('path', { class: 'curve', d: '', stroke: 'var(--c1)' }, ch);
  const pS = C.el('path', { class: 'curve', d: '', stroke: 'var(--c2)' }, ch);
  const pB = C.el('path', { class: 'curve', d: '', stroke: 'var(--c3)', 'stroke-dasharray': '6 5' }, ch);
  const lV = C.el('text', { class: 'axis', x: x1 + 6, y: 0, fill: 'var(--fg)' }, ch, 'VBUS');
  const lS = C.el('text', { class: 'axis', x: x1 + 6, y: 0, fill: 'var(--fg)' }, ch, 'VSYS');
  const lB = C.el('text', { class: 'axis', x: x1 + 6, y: 0, fill: 'var(--fg)' }, ch, '电池');
  const cur = C.el('line', { class: 'cursor', y1: 18, y2: 200 }, ch);
  const phaseT = C.el('text', { class: 'axis', x: x0 + 6, y: 30, fill: 'var(--fg)' }, ch, '');

  let usb = true, Vb = 3.8, scen = 'unplug', T = 0, anim = false;
  function model(t) {
    let vbus, vsys;
    if (scen === 'unplug') {
      vbus = t < 2 ? 5 : 5 * Math.exp(-(t - 2) / 1.2);
      const ton = 2 + 1.2 * Math.log(5 / Math.max(0.05, Vb - 1.5));
      vsys = t < ton ? Math.max(vbus - 0.4, Vb - 0.5) : (Vb - 0.03) - 0.47 * Math.exp(-(t - ton) / 0.25);
    } else {
      vbus = t < 2 ? 0 : 5 * (1 - Math.exp(-(t - 2) / 0.6));
      const toff = vbus > Vb - 0.93;
      vsys = toff ? Math.max(vbus - 0.4, Vb - 0.5) : Math.max(Vb - 0.03, vbus - 0.4);
    }
    const q1on = vbus - vsys < -0.9;
    const d1on = vbus - vsys > 0.3;
    const body = !q1on && Vb - vsys > 0.45;
    return { vbus, vsys, q1on, d1on, body };
  }
  function drawChart() {
    let a = '', b = '', c = '';
    for (let t = 0; t <= 20; t += 0.1) {
      const m = model(t), xx = X(t).toFixed(1);
      a += (t ? 'L' : 'M') + xx + ' ' + Y(m.vbus).toFixed(1);
      b += (t ? 'L' : 'M') + xx + ' ' + Y(m.vsys).toFixed(1);
      c += (t ? 'L' : 'M') + xx + ' ' + Y(Vb).toFixed(1);
    }
    pV.setAttribute('d', a); pS.setAttribute('d', b); pB.setAttribute('d', c);
    const e = model(20);
    const ys = [[lV, Y(e.vbus)], [lS, Y(e.vsys)], [lB, Y(Vb)]].sort((p, q) => p[1] - q[1]);
    let prev = -99; ys.forEach(([n, y]) => { y = Math.max(y, prev + 13); n.setAttribute('y', y + 4); prev = y; });
  }
  function phaseText(m, t) {
    if (scen === 'unplug') {
      if (t < 2) return ['USB 插着：VBUS 经 D1 供电，VSYS ≈ 4.6V。Q1 栅极是 5V，关断；电池只被充电。', 'good'];
      if (m.d1on) return ['① 刚拔掉：VBUS 往下掉，D1 还在供电，VSYS 跟着降。', 'warn'];
      if (m.body) return ['② 体二极管顶上：VSYS 掉到比电池低约 0.5V，Q1 的体二极管自动导通，电池开始供电。管子本身还没打开。', 'warn'];
      if (m.q1on) return ['③ Q1 完全导通：栅极已经降到远低于源极，VSYS 回到几乎等于电池电压。切换完成，全程没有断电。', 'good'];
    } else {
      if (t < 2) return ['用电池：Q1 导通，VSYS ≈ 电池电压。D1 反向截止，电池的电不会倒流到 USB。', 'good'];
      if (m.q1on) return ['① 刚插上：VBUS 开始升高，Q1 的栅极跟着升高，但还没关断，电池继续供电。', 'warn'];
      if (m.body) return ['② Q1 关断，体二极管短暂接手，VSYS 稍微低一点点。', 'warn'];
      if (m.d1on) return ['③ D1 接手：VBUS 经 D1 供电，VSYS 升到约 4.6V，高过电池，体二极管反偏截止，电池转为充电。', 'good'];
    }
    return ['', ''];
  }
  function show(t) {
    T = t;
    const m = model(t);
    cur.setAttribute('x1', X(t)); cur.setAttribute('x2', X(t));
    const [txt, cls] = phaseText(m, t);
    const st = document.getElementById('apText'); st.textContent = txt; st.className = 'status ' + cls;
    phaseT.textContent = t.toFixed(1) + ' ms';
    const set = (id, v, c) => { const e = document.getElementById(id); e.textContent = v; e.className = c || ''; };
    set('apVBUS', m.vbus.toFixed(2) + ' V'); set('apVSYS', m.vsys.toFixed(2) + ' V');
    const vgs = m.vbus - m.vsys; set('apVgs', (vgs >= 0 ? '+' : '') + vgs.toFixed(2) + ' V');
    set('apQ1', m.q1on ? '导通' : m.body ? '关断（体二极管导通）' : '关断', m.q1on ? 'good' : m.body ? 'warn' : '');
    set('apD1', m.d1on ? '导通' : '截止', m.d1on ? 'good' : '');
    const batState = m.q1on || m.body ? '在供电' : m.vbus > 4.3 ? '在充电' : '空闲';
    set('apBat', batState, batState === '在充电' ? 'good' : '');
    gT.textContent = 'G = ' + m.vbus.toFixed(1) + 'V';
    usbT.textContent = m.vbus > 0.5 ? 'VBUS ' + m.vbus.toFixed(1) + 'V' : '未插';
    vsT.textContent = m.vsys.toFixed(2) + 'V';
    batT.textContent = Vb.toFixed(2) + 'V';
    W.vbus.setAttribute('class', 'ln ' + (m.vbus > 0.5 ? 'pw' : 'off'));
    W.gate.setAttribute('class', 'ln ' + (m.vbus > 0.5 ? 'sg' : 'off'));
    W.vsysTop.setAttribute('class', 'ln ' + (m.d1on ? 'pw' : 'off'));
    W.chg.setAttribute('class', 'ln ' + (m.vbus > 4.3 ? 'pw' : 'off')); W.chg2.setAttribute('class', W.chg.getAttribute('class'));
    W.bat.setAttribute('class', 'ln ' + (m.q1on || m.body ? 'pw' : 'fg'));
    W.q1out.setAttribute('class', 'ln ' + (m.q1on || m.body ? 'pw' : 'fg'));
    W.bd.setAttribute('class', 'ln ' + (m.body ? 'pw' : 'mu'));
    bdTri.setAttribute('fill', m.body ? 'var(--pow)' : 'var(--muted)');
    W.bus.setAttribute('class', 'ln pw');
    q1.classList.toggle('on', m.q1on);
    setFlow('usb', m.d1on, 'M120 60 H620 V150 H650', '', 60);
    setFlow('chg', m.vbus > 4.3, 'M70 90 V210', '', 22);
    setFlow('bat', m.q1on, 'M120 240 H620 V150 H650', '', 60);
    setFlow('body', m.body, 'M120 240 H390 V292 H490 V240 H620 V150 H650', '', 50);
  }
  function play() {
    if (RM) { show(20); return; }
    anim = true; const t0 = performance.now();
    const step = now => { const t = Math.min(20, (now - t0) / 1000 * 6.5); show(t); if (t < 20 && anim) requestAnimationFrame(step); else anim = false; };
    requestAnimationFrame(step);
  }
  const btn = document.getElementById('apTog');
  btn.addEventListener('click', () => {
    usb = !usb; scen = usb ? 'plug' : 'unplug';
    btn.textContent = usb ? '拔掉 USB' : '插上 USB';
    drawChart(); play();
  });
  const sl = document.getElementById('apVb');
  sl.addEventListener('input', () => { Vb = +sl.value; document.getElementById('apVbV').textContent = Vb.toFixed(2) + ' V'; drawChart(); show(T); });
  ch.addEventListener('pointermove', e => { if (anim) return; const r = ch.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 640; show(Math.max(0, Math.min(20, (x - x0) / (x1 - x0) * 20))); });
  drawChart(); show(0);
})();

/* ================= 第 6 课：LDO ================= */
(function () {
  const svg = document.getElementById('ldosvg');
  const Y = v => 220 - v / 5 * 190;
  [0, 1, 2, 3, 4, 5].forEach(v => { C.el('line', { class: 'gridl', x1: 40, x2: 340, y1: Y(v), y2: Y(v) }, svg); C.el('text', { class: 'axis', x: 34, y: Y(v) + 4, 'text-anchor': 'end' }, svg, v + 'V'); });
  C.el('line', { class: 'limit', x1: 40, x2: 340, y1: Y(3.0), y2: Y(3.0) }, svg);
  const inOut = C.el('rect', { x: 70, width: 70, rx: 3, fill: 'var(--c1)' }, svg);
  const inHeat = C.el('rect', { x: 70, width: 70, rx: 3, fill: 'var(--c2)', opacity: 0.9 }, svg);
  const outBar = C.el('rect', { x: 240, width: 70, rx: 3, fill: 'var(--c1)' }, svg);
  C.el('text', { class: 'axis', x: 192, y: Y(3.0) - 5, 'text-anchor': 'middle', fill: 'var(--pow)' }, svg, 'ESP32 下限 3.0V');
  C.el('text', { x: 105, y: 240, 'text-anchor': 'middle', 'font-size': 12 }, svg, '输入 VSYS');
  C.el('text', { x: 275, y: 240, 'text-anchor': 'middle', 'font-size': 12 }, svg, '输出 3V3');
  const heatT = C.el('text', { x: 148, y: 0, class: 'm', fill: 'var(--c2)' }, svg, '');
  const outT = C.el('text', { x: 148, y: 178, class: 'm', fill: 'var(--c1)' }, svg, '');
  const valve = C.el('rect', { x: 166, y: 120, width: 48, height: 36, rx: 6, fill: 'var(--panel2)', stroke: 'var(--fg)', 'stroke-width': 1.5 }, svg);
  C.el('text', { x: 190, y: 143, 'text-anchor': 'middle', class: 'm' }, svg, 'U3');
  C.el('path', { class: 'ln fg', d: 'M150 138 H166 M214 138 H234' }, svg);
  const vin = document.getElementById('ldoVin'), ia = document.getElementById('ldoI');
  function upd() {
    const Vi = +vin.value, I = +ia.value / 1000;
    const Vo = Math.min(3.3, Vi - (0.125 / 0.3) * I), drop = Vi - Vo, P = drop * I, eff = Vo / Vi * 100;
    document.getElementById('ldoVinV').textContent = Vi.toFixed(2) + ' V';
    document.getElementById('ldoIV').textContent = Math.round(I * 1000) + ' mA';
    inOut.setAttribute('y', Y(Vo)); inOut.setAttribute('height', Y(0) - Y(Vo));
    inHeat.setAttribute('y', Y(Vi)); inHeat.setAttribute('height', Math.max(0, Y(Vo) - Y(Vi)));
    outBar.setAttribute('y', Y(Vo)); outBar.setAttribute('height', Y(0) - Y(Vo));
    heatT.setAttribute('y', Math.min((Y(Vi) + Y(Vo)) / 2 + 4, 88)); heatT.textContent = drop > 0.05 ? '变成热 ' + drop.toFixed(2) + 'V' : '';
    outT.textContent = '给 ESP32';
    valve.setAttribute('fill', P > 0.4 ? 'color-mix(in srgb,var(--pow) 45%,var(--panel2))' : P > 0.15 ? 'color-mix(in srgb,var(--pow) 22%,var(--panel2))' : 'var(--panel2)');
    const o = document.getElementById('ldoOut'); o.textContent = Vo.toFixed(2) + ' V'; o.className = Vo >= 3.25 ? 'good' : Vo >= 3.0 ? 'warn' : 'bad';
    document.getElementById('ldoDrop').textContent = drop.toFixed(2) + ' V';
    const p = document.getElementById('ldoP'); p.textContent = P.toFixed(2) + ' W'; p.className = P > 0.5 ? 'bad' : P > 0.25 ? 'warn' : '';
    document.getElementById('ldoEff').textContent = eff.toFixed(0) + ' %';
    const t = document.getElementById('ldoText');
    if (Vo >= 3.29) { t.className = 'status good'; t.textContent = `稳压中：输入 ${Vi.toFixed(2)}V，U3 把多出来的 ${drop.toFixed(2)}V 吃掉，输出稳稳的 3.30V。${P > 0.25 ? `不过这时它要发 ${P.toFixed(2)}W 的热，摸着会温热。` : ''}`; }
    else if (Vo >= 3.0) { t.className = 'status warn'; t.textContent = `压差不够了：输入只比 3.3V 高一点，龙头已经开到最大，输出跟着输入往下掉，现在是 ${Vo.toFixed(2)}V。ESP32 还能撑，但没有余量了。`; }
    else { t.className = 'status bad'; t.textContent = `输出只有 ${Vo.toFixed(2)}V，低于 ESP32 的 3.0V 下限，芯片会欠压重启，手柄会断开。该充电了。`; }
    document.querySelectorAll('[data-vin]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.vin - Vi) < 0.01)));
    document.querySelectorAll('[data-ia]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.ia === Math.round(I * 1000))));
  }
  vin.addEventListener('input', upd); ia.addEventListener('input', upd);
  document.querySelectorAll('[data-vin]').forEach(b => b.addEventListener('click', () => { vin.value = b.dataset.vin; upd(); }));
  document.querySelectorAll('[data-ia]').forEach(b => b.addEventListener('click', () => { ia.value = b.dataset.ia; upd(); }));
  upd();
})();

/* ================= 第 6 课：去耦示波器 ================= */
(function () {
  const svg = document.getElementById('dcsvg');
  const x0 = 56, x1 = 620, X = t => x0 + t / 50 * (x1 - x0), Y = v => 190 - (v - 2.6) / 0.8 * 170;
  C.el('rect', { class: 'scope', x: x0, y: 20, width: x1 - x0, height: 170, rx: 4 }, svg);
  [2.6, 2.8, 3.0, 3.2, 3.4].forEach(v => { C.el('line', { class: 'gridl', x1: x0, x2: x1, y1: Y(v), y2: Y(v) }, svg); C.el('text', { class: 'axis', x: x0 - 8, y: Y(v) + 4, 'text-anchor': 'end' }, svg, v.toFixed(1)); });
  [0, 10, 20, 30, 40, 50].forEach(t => C.el('text', { class: 'axis', x: X(t), y: 206, 'text-anchor': 'middle' }, svg, t));
  C.el('text', { class: 'axis', x: x1, y: 222, 'text-anchor': 'end' }, svg, '时间 µs');
  C.el('text', { class: 'axis', x: x0, y: 12 }, svg, 'ESP32 电源脚电压（V）');
  C.el('line', { class: 'limit', x1: x0, x2: x1, y1: Y(3.0), y2: Y(3.0) }, svg);
  C.el('text', { class: 'axis', x: x1 - 6, y: Y(3.0) - 6, 'text-anchor': 'end', fill: 'var(--pow)' }, svg, '低于 3.0V ESP32 复位');
  const pulse = C.el('rect', { x: X(5), y: 226, width: X(50) - X(5), height: 8, rx: 2, fill: 'var(--c1)', opacity: 0 }, svg);
  const pulseT = C.el('text', { class: 'axis', x: X(5) + 4, y: 222, opacity: 0 }, svg, 'ESP32 电流 40mA → 300mA');
  const tr = C.el('path', { class: 'trace', d: '' }, svg);
  const hov = C.el('text', { class: 'axis', x: x1 - 6, y: 36, 'text-anchor': 'end' }, svg, '');
  const vl = C.el('line', { class: 'cursor', y1: 20, y2: 190, opacity: 0 }, svg);
  let c5 = true, c6 = true, done = false;
  const P = () => c5 && c6 ? [0.035, 10, 0.02, 0] : c5 ? [0.035, 10, 0.15, 0.01] : c6 ? [0.22, 14, 0.03, 0.04] : [0.42, 18, 0.2, 0.08];
  const V = t => {
    if (t < 5) return 3.3;
    const [As, ts, Af, R] = P(), d = t - 5;
    return 3.3 - As * (1 - Math.exp(-d / 0.6)) * Math.exp(-d / ts) / 0.8 - Af * Math.exp(-d / 0.15) * (1 - Math.exp(-d / 0.03)) - R * Math.exp(-d / 6) * Math.sin(2 * Math.PI * d / 4);
  };
  const path = upto => { let d = ''; for (let t = 0; t <= upto; t += 0.05) d += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(Math.max(2.6, V(t))).toFixed(1); return d; };
  function verdict() {
    let mn = 9; for (let t = 5; t < 50; t += 0.02) mn = Math.min(mn, V(t));
    const st = document.getElementById('dcText');
    const what = c5 && c6 ? '两颗电容都在' : c5 ? '只有 10µF' : c6 ? '只有 100nF' : '一颗电容都没有';
    if (mn >= 3.2) { st.className = 'status good'; st.textContent = `${what}：电压只往下沉了 ${((3.3 - mn) * 1000).toFixed(0)}mV，很快恢复，ESP32 毫无感觉。`; }
    else if (mn >= 3.0) { st.className = 'status warn'; st.textContent = `${what}：最低掉到 ${mn.toFixed(2)}V。${c5 ? '开头那一下尖刺是 100nF 不在、10µF 反应慢造成的。' : '小电容挡住了尖刺，但存的电太少，后面撑不住，电压沉下去好一会儿。'}还没到复位线，但射频性能会变差。`; }
    else { st.className = 'status bad'; st.textContent = `${what}：电压最低掉到 ${mn.toFixed(2)}V，低于 3.0V，ESP32 欠压复位，手柄断开。这就是去耦电容省不得的原因。`; }
  }
  function go() {
    done = false; pulse.setAttribute('opacity', 0.9); pulseT.setAttribute('opacity', 1);
    if (RM) { tr.setAttribute('d', path(50)); done = true; verdict(); return; }
    const t0 = performance.now();
    const step = now => { const u = Math.min(50, (now - t0) / 1200 * 50); tr.setAttribute('d', path(u)); if (u < 50) requestAnimationFrame(step); else { done = true; verdict(); } };
    requestAnimationFrame(step);
  }
  const setC = () => {
    document.querySelectorAll('[data-c5]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.c5 === '1') === c5)));
    document.querySelectorAll('[data-c6]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.c6 === '1') === c6)));
    if (done) { tr.setAttribute('d', path(50)); verdict(); }
  };
  document.getElementById('dcGo').addEventListener('click', go);
  document.querySelectorAll('[data-c5]').forEach(b => b.addEventListener('click', () => { c5 = b.dataset.c5 === '1'; setC(); }));
  document.querySelectorAll('[data-c6]').forEach(b => b.addEventListener('click', () => { c6 = b.dataset.c6 === '1'; setC(); }));
  svg.addEventListener('pointermove', e => {
    if (!done) return; const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 640;
    const t = Math.max(0, Math.min(50, (x - x0) / (x1 - x0) * 50));
    vl.setAttribute('x1', X(t)); vl.setAttribute('x2', X(t)); vl.setAttribute('opacity', 1);
    hov.textContent = `${t.toFixed(1)}µs · ${V(t).toFixed(3)}V`;
  });
  svg.addEventListener('pointerleave', () => { vl.setAttribute('opacity', 0); hov.textContent = ''; });
  tr.setAttribute('d', path(50 * 0)); setC();
})();
