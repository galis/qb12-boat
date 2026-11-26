
/* ================= 第 2–4 课 ================= */
(function () {
const NS2 = 'http://www.w3.org/2000/svg';
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = (tag, attrs, parent, text) => {
  const e = document.createElementNS(NS2, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};

/* ---- 通用：沿路径流动的小点 ---- */
const flows = new Set();
function flow(parent, d, cls, speed, gap, r) {
  const p = el('path', { d, fill: 'none', stroke: 'none' }, parent);
  const len = p.getTotalLength();
  const n = Math.max(1, Math.round(len / gap));
  const dots = Array.from({ length: n }, () => el('circle', { r: r || 3.5, class: 'dot ' + (cls || '') }, parent));
  const f = { p, len, n, dots, speed, remove() { p.remove(); dots.forEach(x => x.remove()); flows.delete(f); } };
  flows.add(f); placeFlow(f, performance.now());
  return f;
}
function placeFlow(f, t) {
  for (let i = 0; i < f.n; i++) {
    const d = ((t / 1000) * f.speed + (i * f.len) / f.n) % f.len;
    const pt = f.p.getPointAtLength(d);
    f.dots[i].setAttribute('cx', pt.x.toFixed(1)); f.dots[i].setAttribute('cy', pt.y.toFixed(1));
  }
}
const tickers = new Set();
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  flows.forEach(f => placeFlow(f, t));
  tickers.forEach(fn => fn(t, dt));
  requestAnimationFrame(frame);
}
if (!RM) requestAnimationFrame(frame);
const pressOne = (sel, attr, val) => document.querySelectorAll(sel).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))));

/* ================= 2.1 引脚图 ================= */
(function () {
  const svg = document.getElementById('pinmap');
  const A = [['A1','GND'],['A2',''],['A3',''],['A4','VBUS'],['A5','CC1'],['A6','D+'],['A7','D−'],['A8','SBU1'],['A9','VBUS'],['A10',''],['A11',''],['A12','GND']];
  const B = [['B12','GND'],['B11',''],['B10',''],['B9','VBUS'],['B8','SBU2'],['B7','D−'],['B6','D+'],['B5','CC2'],['B4','VBUS'],['B3',''],['B2',''],['B1','GND']];
  const col = f => f === 'VBUS' ? 'var(--pow)' : (f.startsWith('CC') || f.startsWith('D')) ? 'var(--sig)' : f === 'GND' ? 'var(--fg)' : 'var(--muted)';
  el('rect', { x: 52, y: 72, width: 656, height: 130, rx: 16, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.5 }, svg);
  el('text', { x: 64, y: 140, class: 'm mu', 'font-size': 11 }, svg, '舌片');
  const pins = {};
  const row = (arr, y, labelY) => arr.forEach(([id, fn], i) => {
    const x = 92 + i * 52;
    const g = el('g', { class: 'pin' + (fn ? '' : ' none') }, svg);
    el('rect', { x: x - 21, y, width: 42, height: 30, rx: 4 }, g);
    el('text', { x, y: y + 19, 'text-anchor': 'middle' }, g, id);
    if (fn) el('text', { x, y: labelY, 'text-anchor': 'middle', class: 'fn', fill: col(fn) }, svg, fn);
    else el('text', { x, y: labelY, 'text-anchor': 'middle', class: 'fn', fill: 'var(--line)' }, svg, '无');
    pins[id] = g;
  });
  el('text', { x: 20, y: 106, class: 'm mu' }, svg, 'A 排');
  el('text', { x: 20, y: 174, class: 'm mu' }, svg, 'B 排');
  row(A, 88, 62);
  row(B, 156, 222);
  const plug = el('g', { class: 'plug' }, svg);
  el('rect', { x: 300, y: 236, width: 160, height: 28, rx: 14, fill: 'var(--panel2)', stroke: 'var(--fg)', 'stroke-width': 1.5 }, plug);
  el('circle', { cx: 318, cy: 250, r: 5, fill: 'var(--hl)' }, plug);
  el('text', { x: 392, y: 255, 'text-anchor': 'middle', class: 'm' }, plug, '插头 · 黄点 = A 面');
  const TXT = [
    '正插：插头的 CC 触点碰到 A5（CC1），数据线碰到 A6、A7。B5、B6、B7 空着。VBUS 和 GND 上下对称，8 个都碰得到。',
    '反插：插头翻了个面，CC 触点碰到 B5（CC2），数据线碰到 B6、B7。A5、A6、A7 空着。VBUS 和 GND 照样 8 个都碰得到。'
  ];
  function set(o) {
    pressOne('[data-orient]', 'orient', o);
    plug.classList.toggle('flip', o === 1);
    const hot = ['A1','A12','B1','B12','A4','A9','B4','B9'].concat(o === 0 ? ['A5','A6','A7'] : ['B5','B6','B7']);
    Object.entries(pins).forEach(([id, g]) => g.classList.toggle('hot', hot.includes(id)));
    document.getElementById('pinText').textContent = TXT[o];
  }
  document.querySelectorAll('[data-orient]').forEach(b => b.addEventListener('click', () => set(+b.dataset.orient)));
  set(0);
})();

/* ================= 2.2 CC 检测 ================= */
(function () {
  const S = { plugged: false, rd: true, rp: 56 };
  const dots = document.getElementById('ccDots');
  let fl = [];
  function render() {
    pressOne('[data-rd]', 'rd', S.rd ? 1 : 0);
    pressOne('[data-rp]', 'rp', S.rp);
    document.getElementById('ccPlug').textContent = S.plugged ? '拔掉线' : '插上线';
    document.getElementById('ccRd').classList.toggle('ghostpart', !S.rd);
    document.getElementById('ccRpTxt').textContent = 'Rp ' + S.rp + 'kΩ';
    const cc = S.plugged && S.rd ? 5 * 5.1 / (S.rp + 5.1) : 5;
    const on = S.plugged && S.rd;
    document.getElementById('ccMeter').textContent = S.plugged ? cc.toFixed(2) + ' V' : '— V';
    document.getElementById('ccSwTxt').textContent = on ? 'VBUS 开' : 'VBUS 关';
    document.getElementById('ccSw').classList.toggle('on', on);
    document.getElementById('ccVbusLine').setAttribute('class', 'ln ' + (on ? 'pw' : 'off'));
    document.getElementById('ccLine').setAttribute('class', 'ln ' + (S.plugged ? 'sg' : 'off'));
    document.getElementById('ccBoardLed').setAttribute('fill', on ? 'var(--ok)' : 'var(--line)');
    fl.forEach(f => f.remove()); fl = [];
    if (on) {
      fl.push(flow(dots, 'M236 73 H700', '', 60, 34));
      fl.push(flow(dots, 'M80 84 V176 H620 V222', 's', 14, 46, 2.6));
    }
    const lvl = { 56: '普通 USB（500–900mA）', 22: '1.5A', 10: '3A' }[S.rp];
    const ua = (5 / (S.rp + 5.1) * 1000).toFixed(0);
    const t = document.getElementById('ccText');
    if (!S.plugged) { t.className = 'status'; t.textContent = '线还没插。充电器的 CC 被 Rp 拉在 5V，VBUS 关着。点“插上线”。'; }
    else if (!S.rd) { t.className = 'status bad'; t.textContent = '插上了，但板子上没有 Rd。CC 还是 5V，充电器认为对面没有设备，VBUS 不出电，板子没有任何反应。'; }
    else { t.className = 'status good'; t.textContent = `CC 被分压到 ${cc.toFixed(2)}V，落在“有设备”的范围里，充电器打开 5V。CC 线上只流过约 ${ua}µA，这个档位告诉板子：最多可以拿 ${lvl}。`; }
  }
  document.getElementById('ccPlug').addEventListener('click', () => { S.plugged = !S.plugged; render(); });
  document.querySelectorAll('[data-rd]').forEach(b => b.addEventListener('click', () => { S.rd = b.dataset.rd === '1'; render(); }));
  document.querySelectorAll('[data-rp]').forEach(b => b.addEventListener('click', () => { S.rp = +b.dataset.rp; render(); }));
  render();
})();

/* ================= 2.3 ESD ================= */
(function () {
  let on = true, busy = false;
  const u5 = document.getElementById('esdU5'), chip = document.getElementById('esdChip');
  const p1 = document.getElementById('esdPulse'), p2 = document.getElementById('esdPulse2');
  const ok = document.getElementById('esdOk'), bad = document.getElementById('esdBad');
  const scope = document.getElementById('scope');
  const X = t => 40 + t / 100 * 265, Y = v => 185 - Math.min(v, 21) / 20 * 170;
  el('rect', { class: 'scope', x: 40, y: 15, width: 265, height: 170, rx: 4 }, scope);
  [0, 5, 10, 15, 20].forEach(v => { el('line', { class: 'gridl', x1: 40, x2: 305, y1: Y(v), y2: Y(v) }, scope); el('text', { class: 'axis', x: 34, y: Y(v) + 4, 'text-anchor': 'end' }, scope, v); });
  [0, 25, 50, 75, 100].forEach(t => el('text', { class: 'axis', x: X(t), y: 202, 'text-anchor': 'middle' }, scope, t));
  el('text', { class: 'axis', x: 305, y: 216, 'text-anchor': 'end' }, scope, '时间 ns');
  el('text', { class: 'axis', x: 8, y: 12 }, scope, '电压 V');
  el('line', { class: 'limit', x1: 40, x2: 305, y1: Y(3.6), y2: Y(3.6) }, scope);
  el('text', { class: 'axis', x: 300, y: Y(3.6) - 5, 'text-anchor': 'end', fill: 'var(--pow)' }, scope, '3.6V');
  const trace = el('path', { class: 'trace', d: '' }, scope);
  const note = el('text', { class: 'axis', x: X(14), y: 30, fill: 'var(--pow)' }, scope, '');
  const hov = el('text', { class: 'axis', x: 300, y: 32, 'text-anchor': 'end' }, scope, '');
  const vline = el('line', { class: 'cursor', x1: 0, x2: 0, y1: 15, y2: 185, opacity: 0 }, scope);
  const V = (t, prot) => {
    if (t < 10) return 0;
    if (prot) return t < 12 ? (t - 10) / 2 * 14 : 14 * Math.exp(-(t - 12) / 7);
    return t < 60 ? 8000 * Math.exp(-(t - 10) / 30) : 0;
  };
  let shown = null;
  function drawTrace(upto, prot) {
    let d = '';
    for (let t = 0; t <= upto; t += 0.5) d += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(V(t, prot)).toFixed(1);
    trace.setAttribute('d', d);
    note.textContent = !prot && upto > 12 ? '≈8000V，冲出量程' : '';
  }
  scope.addEventListener('pointermove', e => {
    if (shown === null) return;
    const r = scope.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 320;
    const t = Math.max(0, Math.min(100, (x - 40) / 265 * 100));
    const v = V(t, shown);
    vline.setAttribute('x1', X(t)); vline.setAttribute('x2', X(t)); vline.setAttribute('opacity', 1);
    hov.textContent = `${t.toFixed(0)}ns · ${v > 100 ? Math.round(v) : v.toFixed(1)}V`;
  });
  scope.addEventListener('pointerleave', () => { vline.setAttribute('opacity', 0); hov.textContent = ''; });
  function setOn(v) {
    on = v; pressOne('[data-esd]', 'esd', v ? 1 : 0);
    u5.classList.toggle('ghostpart', !v);
    reset();
  }
  function reset() {
    p1.setAttribute('r', 0); p2.setAttribute('r', 0);
    ok.classList.remove('show'); bad.classList.remove('show');
    chip.setAttribute('style', '');
    trace.setAttribute('d', ''); note.textContent = ''; shown = null;
    document.getElementById('esdText').className = 'status';
    document.getElementById('esdText').textContent = '点“手指碰一下接口”，看静电走到哪里。';
  }
  function finish() {
    shown = on; drawTrace(100, on);
    const t = document.getElementById('esdText');
    if (on) { ok.classList.add('show'); chip.setAttribute('style', 'stroke:var(--ok)'); t.className = 'status good'; t.textContent = '静电冲进来的瞬间，U5 里的二极管导通，大部分电流被引到地。ESP32 脚上只冒出一个十几伏的尖，几十纳秒就过去了，芯片自带的保护还扛得住。'; }
    else { bad.classList.add('show'); chip.setAttribute('style', 'stroke:var(--pow);fill:color-mix(in srgb,var(--pow) 18%,var(--panel2))'); t.className = 'status bad'; t.textContent = '没有 U5，几千伏的尖峰直接打在 ESP32 的引脚上，比它能承受的 3.6V 高出几千倍，引脚会被击穿，USB 从此用不了。'; }
    busy = false;
  }
  function go() {
    if (busy) return; reset(); busy = true;
    if (RM) { finish(); return; }
    const t0 = performance.now();
    const run = t => {
      const s = (t - t0) / 1000;
      if (s < 0.45) { const k = s / 0.45; p1.setAttribute('cx', 112 + (270 - 112) * k); p1.setAttribute('cy', 105); p1.setAttribute('r', 11); drawTrace(0, on); }
      else if (s < 1.0) {
        const k = (s - 0.45) / 0.55;
        if (on) {
          p2.setAttribute('cx', 270); p2.setAttribute('cy', 105 + 95 * k); p2.setAttribute('r', 11 * (1 - k * 0.6));
          p1.setAttribute('cx', 270 + 160 * k); p1.setAttribute('r', 4);
        } else { p1.setAttribute('cx', 270 + 160 * k); p1.setAttribute('r', 11); }
        drawTrace(100 * k, on);
      } else { p1.setAttribute('r', 0); p2.setAttribute('r', 0); finish(); return; }
      requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }
  document.getElementById('esdGo').addEventListener('click', go);
  document.querySelectorAll('[data-esd]').forEach(b => b.addEventListener('click', () => setOn(b.dataset.esd === '1')));
  setOn(true);
})();

/* ================= 3.2 充电曲线 + 3.5 开漏点灯 ================= */
(function () {
  const svg = document.getElementById('chgsvg');
  const T_CC = 95, T_END = 145, T_MAX = 150, ISET = 0.55;
  const Vf = t => t <= T_CC ? (p => 3.35 + 0.35 * (1 - Math.exp(-6 * p)) + 0.5 * p * p * p)(t / T_CC) : 4.2;
  const If = t => t <= T_CC ? ISET : t <= T_END ? ISET * Math.exp(-(t - T_CC) / 21.7) : 0;
  const Q = [0]; for (let m = 1; m <= T_MAX; m++) Q[m] = Q[m - 1] + (If(m - 0.5) * 1000) / 60;
  const x0 = 54, x1 = 505, X = t => x0 + t / T_MAX * (x1 - x0);
  const YV = v => 150 - (v - 3.0) / 1.4 * 125, YI = i => 300 - i / 0.6 * 105;
  // 阶段底色
  [[0, T_CC, '恒流'], [T_CC, T_END, '恒压'], [T_END, T_MAX, '满']].forEach(([a, b, s], k) => {
    if (k % 2 === 1) el('rect', { class: 'band', x: X(a), y: 18, width: X(b) - X(a), height: 284 }, svg);
    el('text', { class: 'axis', x: (X(a) + X(b)) / 2, y: 14, 'text-anchor': 'middle' }, svg, s);
  });
  [3.0, 3.5, 4.0].forEach(v => { el('line', { class: 'gridl', x1: x0, x2: x1, y1: YV(v), y2: YV(v) }, svg); el('text', { class: 'axis', x: x0 - 6, y: YV(v) + 4, 'text-anchor': 'end' }, svg, v.toFixed(1)); });
  el('line', { class: 'limit', x1: x0, x2: x1, y1: YV(4.2), y2: YV(4.2) }, svg);
  el('text', { class: 'axis', x: x0 - 6, y: YV(4.2) + 4, 'text-anchor': 'end', fill: 'var(--pow)' }, svg, '4.2');
  [0, 0.2, 0.4, 0.6].forEach(i => { el('line', { class: 'gridl', x1: x0, x2: x1, y1: YI(i), y2: YI(i) }, svg); el('text', { class: 'axis', x: x0 - 6, y: YI(i) + 4, 'text-anchor': 'end' }, svg, i.toFixed(1)); });
  [0, 30, 60, 90, 120, 150].forEach(t => el('text', { class: 'axis', x: X(t), y: 318, 'text-anchor': 'middle' }, svg, t));
  el('text', { class: 'axis', x: x1, y: 330, 'text-anchor': 'end' }, svg, '时间（分钟）');
  el('text', { x: x0 + 6, y: 36, 'font-size': 12.5, 'font-weight': 700 }, svg, '电池电压 V');
  el('text', { x: x0 + 6, y: 212, 'font-size': 12.5, 'font-weight': 700 }, svg, '充电电流 A');
  let dv = '', di = '';
  for (let t = 0; t <= T_MAX; t += 1) { dv += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + YV(Vf(t)).toFixed(1); di += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + YI(If(t)).toFixed(1); }
  el('path', { class: 'curve v', d: dv }, svg);
  el('path', { class: 'curve i', d: di }, svg);
  const cur = el('line', { class: 'cursor', y1: 18, y2: 302 }, svg);
  const dV = el('circle', { class: 'cdot', r: 5, fill: 'var(--pow)' }, svg);
  const dI = el('circle', { class: 'cdot', r: 5, fill: 'var(--sig)' }, svg);

  // 开漏小图
  const od = document.getElementById('odsvg');
  el('path', { class: 'ln pw', d: 'M30 24 H270' }, od);
  el('text', { class: 'm pw', x: 30, y: 16 }, od, 'VBUS 5V');
  el('rect', { x: 30, y: 150, width: 240, height: 92, rx: 10, fill: 'none', stroke: 'var(--line)', 'stroke-dasharray': '5 4' }, od);
  el('text', { class: 'm mu', x: 262, y: 236, 'text-anchor': 'end' }, od, 'U4 芯片内部');
  const branch = (x, name, rname, color, label) => {
    el('path', { class: 'ln fg', d: `M${x} 24 V42 M${x} 82 V96 M${x} 116 V165` }, od);
    el('rect', { x: x - 8, y: 42, width: 16, height: 40, rx: 2, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 }, od);
    el('text', { class: 'm', x: x + 14, y: 66 }, od, rname);
    const led = el('path', { class: 'led', d: `M${x - 11} 96 H${x + 11} L${x} 115 Z`, fill: 'var(--line)', stroke: 'var(--fg)', 'stroke-width': 1.2 }, od);
    el('path', { class: 'ln fg', d: `M${x - 11} 116 H${x + 11}` }, od);
    el('text', { x: x + 16, y: 112, 'font-size': 12 }, od, label);
    el('text', { class: 'm sg', x: x + 6, y: 146 }, od, name);
    el('circle', { cx: x, cy: 168, r: 3, fill: 'var(--fg)' }, od);
    el('circle', { cx: x, cy: 206, r: 3, fill: 'var(--fg)' }, od);
    const blade = el('line', { x1: x, y1: 206, x2: x + 16, y2: 172, stroke: 'var(--fg)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, od);
    el('path', { class: 'ln fg', d: `M${x} 206 V216 M${x - 10} 216 H${x + 10} M${x - 6} 221 H${x + 6} M${x - 2} 226 H${x + 2}` }, od);
    return { led, blade, x, color, f: null };
  };
  const L1 = branch(90, 'CHRG', 'R4 1kΩ', '#FF5A4E', '红 LED1');
  const L2 = branch(210, 'STDBY', 'R5 1kΩ', '#4ADE80', '绿 LED2');
  const dotG = el('g', {}, od);
  function setLed(L, on) {
    L.led.setAttribute('fill', on ? L.color : 'var(--line)');
    L.led.style.filter = on ? `drop-shadow(0 0 6px ${L.color})` : '';
    L.blade.setAttribute('x2', on ? L.x : L.x + 16);
    L.blade.setAttribute('y2', on ? 168 : 172);
    if (on && !L.f) L.f = flow(dotG, `M${L.x} 24 V206`, '', 26, 30, 2.8);
    if (!on && L.f) { L.f.remove(); L.f = null; }
  }

  const TEXT = {
    cc: '恒流：芯片按 R3 设定的 0.55A 往电池里灌电，电压一路往上爬。CHRG 内部开关合上，红灯亮。',
    cv: '恒压：电压到了 4.2V 就不再升高，芯片死守 4.2V，电流自己越来越小。红灯还亮着。',
    done: '充满：电流降到约 0.055A（设定值的十分之一），芯片停止充电。CHRG 断开、STDBY 合上，红灯灭、绿灯亮。'
  };
  let T = 0;
  function show(t) {
    T = Math.max(0, Math.min(T_MAX, t));
    const v = Vf(T), i = If(T), ph = T <= T_CC ? 'cc' : T <= T_END ? 'cv' : 'done';
    cur.setAttribute('x1', X(T)); cur.setAttribute('x2', X(T));
    dV.setAttribute('cx', X(T)); dV.setAttribute('cy', YV(v));
    dI.setAttribute('cx', X(T)); dI.setAttribute('cy', YI(i));
    document.getElementById('cT').textContent = Math.round(T) + ' 分钟';
    document.getElementById('cPh').textContent = { cc: '恒流', cv: '恒压', done: '充满' }[ph];
    document.getElementById('cV').textContent = v.toFixed(2) + ' V';
    document.getElementById('cI').textContent = i.toFixed(3) + ' A';
    document.getElementById('cQ').textContent = Math.round(Q[Math.floor(T)]) + ' mAh';
    document.getElementById('chgText').textContent = TEXT[ph];
    setLed(L1, ph !== 'done'); setLed(L2, ph === 'done');
  }
  const pick = e => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 520; show((x - x0) / (x1 - x0) * T_MAX); };
  let playing = false, dragging = false;
  svg.addEventListener('pointerdown', e => { dragging = true; playing = false; btn.textContent = '播放'; svg.setPointerCapture(e.pointerId); pick(e); });
  svg.addEventListener('pointermove', e => { if (dragging || (!playing && e.pointerType === 'mouse')) pick(e); });
  svg.addEventListener('pointerup', () => { dragging = false; });
  const btn = document.getElementById('chgPlay');
  btn.addEventListener('click', () => {
    if (RM) { show(T >= T_MAX ? 0 : T_MAX); return; }
    playing = !playing; btn.textContent = playing ? '暂停' : '播放';
    if (playing && T >= T_MAX) show(0);
  });
  tickers.add((t, dt) => { if (!playing) return; show(T + dt * 17); if (T >= T_MAX) { playing = false; btn.textContent = '重播'; } });
  show(40);
})();

/* ================= 3.4 PROG 计算器 ================= */
(function () {
  const s = document.getElementById('rprog');
  function upd() {
    const R = +s.value, I = 1.1 / R, h = 1.2 * 1.2 / I, P36 = (5 - 3.6) * I, P30 = (5 - 3.0) * I;
    document.getElementById('rprogV').textContent = R.toFixed(1) + ' kΩ';
    document.getElementById('rI').textContent = I.toFixed(2) + ' A';
    document.getElementById('rT').textContent = h.toFixed(1) + ' 小时';
    const p1 = document.getElementById('rP'), p2 = document.getElementById('rP2');
    p1.textContent = P36.toFixed(2) + ' W'; p2.textContent = P30.toFixed(2) + ' W';
    const cls = P30 > 1.5 ? 'bad' : P30 > 0.9 ? 'warn' : 'good';
    p2.className = cls; p1.className = P36 > 1.5 ? 'bad' : P36 > 0.9 ? 'warn' : 'good';
    const t = document.getElementById('rText');
    if (P30 > 1.5) { t.className = 'status bad'; t.textContent = `电流 ${I.toFixed(2)}A，电池低时芯片要发 ${P30.toFixed(1)}W 的热，会非常烫，芯片会自己把电流往下降。真要快充得换开关型充电芯片。`; }
    else if (P30 > 0.9) { t.className = 'status warn'; t.textContent = `电流 ${I.toFixed(2)}A，电池低时芯片约 ${P30.toFixed(1)}W，摸着烫手但能工作，需要散热焊盘和过孔帮忙。本板 2kΩ 就在这一档。`; }
    else { t.className = 'status good'; t.textContent = `电流 ${I.toFixed(2)}A，芯片最多 ${P30.toFixed(2)}W，凉快。代价是充满要 ${h.toFixed(1)} 小时。`; }
    document.querySelectorAll('[data-r]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.r - R) < 0.05)));
  }
  s.addEventListener('input', upd);
  document.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { s.value = b.dataset.r; upd(); }));
  upd();
})();

/* ================= 4.2 MOS 管 ================= */
(function () {
  const svg = document.getElementById('mossvg');
  const VS = 4.0, RLOAD = 2.0;
  el('text', { class: 'm pw', x: 440, y: 22 }, svg, '接电池 +4.0V');
  el('path', { class: 'ln fg', d: 'M430 28 V115 H334' }, svg);
  el('text', { x: 444, y: 80 }, svg, 'S 源极');
  el('path', { class: 'ln fg', d: 'M334 160 H430 V115' }, svg);
  el('path', { d: 'M414 153 L428 160 L414 167 Z', fill: 'var(--fg)' }, svg);
  el('path', { class: 'ln fg', d: 'M334 205 H430 V262' }, svg);
  el('text', { x: 444, y: 228 }, svg, 'D 漏极');
  [[100, 130], [145, 175], [190, 220]].forEach(([a, b]) => el('line', { x1: 330, x2: 330, y1: a, y2: b, stroke: 'var(--fg)', 'stroke-width': 4 }, svg));
  const chan = el('rect', { x: 325, y: 100, width: 10, height: 120, rx: 3, fill: 'var(--pow)', opacity: 0 }, svg);
  const gplate = el('line', { x1: 312, x2: 312, y1: 100, y2: 220, stroke: 'var(--sig)', 'stroke-width': 4 }, svg);
  el('path', { class: 'ln sg', d: 'M150 160 H312' }, svg);
  el('text', { x: 196, y: 150 }, svg, 'G 栅极');
  el('rect', { class: 'box', x: 40, y: 130, width: 110, height: 60, rx: 10 }, svg);
  el('text', { class: 'm mu', x: 95, y: 154, 'text-anchor': 'middle' }, svg, '栅极电压');
  const vgT = el('text', { class: 'm sg', x: 95, y: 176, 'text-anchor': 'middle', 'font-size': 15 }, svg, '4.00 V');
  el('text', { class: 'm mu', x: 150, y: 214, 'font-size': 11 }, svg, '绝缘层：栅极几乎不吃电流');
  // 体二极管
  el('path', { class: 'ln mu', d: 'M430 205 H476 V178 M476 154 V95 H430' }, svg);
  el('path', { d: 'M464 178 H488 L476 156 Z', fill: 'var(--muted)' }, svg);
  el('path', { class: 'ln mu', d: 'M464 155 H488' }, svg);
  el('text', { class: 'm mu', x: 470, y: 248, 'text-anchor': 'middle', 'font-size': 11 }, svg, '体二极管 D→S');
  // 电机
  el('circle', { cx: 430, cy: 290, r: 26, fill: 'var(--panel2)', stroke: 'var(--fg)', 'stroke-width': 2 }, svg);
  const prop = el('g', {}, svg);
  el('path', { d: 'M430 270 L436 290 L430 310 L424 290 Z', fill: 'var(--pow)' }, prop);
  el('path', { d: 'M410 290 L430 284 L450 290 L430 296 Z', fill: 'var(--muted)' }, prop);
  el('text', { class: 'm', x: 370, y: 295, 'text-anchor': 'end' }, svg, '电机 → 地');
  const dg = el('g', {}, svg);
  let f = null, ang = 0, cur = 0;
  const Rds = a => {
    if (a < 0.5) return Infinity;
    if (a < 1.3) return Math.pow(10, 3 - 3 * (a - 0.5) / 0.8);
    if (a < 2.5) return Math.pow(10, Math.log10(1) + (Math.log10(0.085) - 0) * (a - 1.3) / 1.2);
    return 0.085 - (0.085 - 0.062) * Math.min(1, (a - 2.5) / 1.5);
  };
  const s = document.getElementById('vg');
  function upd() {
    const vg = +s.value, vgs = vg - VS, a = -vgs, r = Rds(a);
    const I = isFinite(r) ? VS / (RLOAD + r) : 0, P = isFinite(r) ? I * I * r : 0;
    cur = I;
    document.getElementById('vgV').textContent = vg.toFixed(2) + ' V';
    vgT.textContent = vg.toFixed(2) + ' V';
    document.getElementById('mVgs').textContent = vgs.toFixed(2) + ' V';
    const mR = document.getElementById('mR'), mI = document.getElementById('mI'), mP = document.getElementById('mP');
    mR.textContent = !isFinite(r) ? '断开' : r >= 1 ? r.toFixed(r > 10 ? 0 : 1) + ' Ω' : (r * 1000).toFixed(0) + ' mΩ';
    mI.textContent = I.toFixed(2) + ' A';
    mP.textContent = P.toFixed(2) + ' W';
    mP.className = P > 0.6 ? 'bad' : P > 0.3 ? 'warn' : 'good';
    document.getElementById('vgsMark').style.left = `calc(${((vgs + 4) / 4 * 100).toFixed(1)}% - 1px)`;
    chan.setAttribute('opacity', Math.min(1, I / 1.9).toFixed(2));
    gplate.setAttribute('stroke-width', 3 + 3 * Math.min(1, a / 4));
    const t = document.getElementById('mText');
    if (a < 0.5) { t.className = 'status'; t.textContent = '关断：栅极和源极电压差不到 0.5V，通道关着，电机一点电流都没有。'; }
    else if (a < 1.3) { t.className = 'status warn'; t.textContent = '刚开门：过了阈值（约 −0.9V），通道开始形成，但电阻还有几欧到几百欧，只能漏过一点电流。'; }
    else if (a < 2.5) { t.className = 'status bad'; t.textContent = `半开：电流已经不小，导通电阻却还有零点几到一欧，MOS 管自己要发 ${P.toFixed(1)}W 的热，小封装撑不住。开关电路要避开这一段。`; }
    else { t.className = 'status good'; t.textContent = `完全导通：导通电阻只有 ${(r * 1000).toFixed(0)}mΩ，几乎就是一根导线，${I.toFixed(1)}A 电流过去，管子只发 ${P.toFixed(2)}W 的热。`; }
    if (f) { f.remove(); f = null; }
    if (I > 0.01) f = flow(dg, 'M430 28 V115 H334 V205 H430 V262', '', 20 + 70 * I / 2, 26, 2.2 + 1.8 * Math.min(1, I / 1.9));
  }
  tickers.add((t, dt) => { ang = (ang + dt * cur * 900) % 360; prop.setAttribute('transform', `rotate(${ang.toFixed(1)} 430 290)`); });
  s.addEventListener('input', upd);
  document.querySelectorAll('[data-vg]').forEach(b => b.addEventListener('click', () => { s.value = b.dataset.vg; upd(); }));
  upd();
})();

/* ================= 4.3 电源开关 ================= */
(function () {
  const svg = document.getElementById('swsvg');
  const VB = 4.0;
  el('rect', { class: 'box', x: 20, y: 30, width: 100, height: 60, rx: 10 }, svg);
  el('text', { x: 70, y: 56, 'text-anchor': 'middle', 'font-weight': 700 }, svg, '电池 J2');
  el('text', { class: 'm pw', x: 70, y: 76, 'text-anchor': 'middle' }, svg, '+4.0V');
  el('path', { class: 'ln pw', d: 'M120 60 H300' }, svg);
  el('text', { class: 'm pw', x: 140, y: 52 }, svg, 'BAT+');
  el('circle', { cx: 200, cy: 60, r: 4, fill: 'var(--fg)' }, svg);
  const q2 = el('rect', { class: 'box', x: 300, y: 30, width: 120, height: 70, rx: 8 }, svg);
  el('text', { x: 360, y: 62, 'text-anchor': 'middle', 'font-weight': 700 }, svg, 'Q2');
  el('text', { class: 'm mu', x: 360, y: 80, 'text-anchor': 'middle' }, svg, 'P-MOS');
  el('text', { class: 'm', x: 306, y: 50 }, svg, 'S'); el('text', { class: 'm', x: 404, y: 50 }, svg, 'D'); el('text', { class: 'm', x: 366, y: 96 }, svg, 'G');
  const dl = el('path', { class: 'ln', d: 'M420 60 H560' }, svg);
  el('text', { class: 'm pw', x: 440, y: 52 }, svg, 'BAT_SW');
  const load = el('rect', { class: 'box', x: 560, y: 25, width: 180, height: 70, rx: 10 }, svg);
  el('text', { x: 650, y: 54, 'text-anchor': 'middle', 'font-weight': 700 }, svg, '全板');
  el('text', { class: 'm mu', x: 650, y: 74, 'text-anchor': 'middle' }, svg, 'Q1 → VSYS → 电机/ESP32');
  const lamp = el('circle', { cx: 722, cy: 40, r: 7, fill: 'var(--line)' }, svg);
  el('path', { class: 'ln fg', d: 'M200 60 V110 M200 160 V200 H360 V100' }, svg);
  el('rect', { x: 190, y: 110, width: 20, height: 50, rx: 2, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 }, svg);
  el('text', { class: 'm', x: 218, y: 132 }, svg, 'R14');
  el('text', { class: 'm mu', x: 218, y: 150 }, svg, '100kΩ');
  el('text', { class: 'm sg', x: 212, y: 192 }, svg, 'PWR_EN_N');
  const enT = el('text', { class: 'm', x: 300, y: 192 }, svg, '');
  el('circle', { cx: 280, cy: 200, r: 4, fill: 'var(--fg)' }, svg);
  el('path', { class: 'ln fg', d: 'M280 200 V222' }, svg);
  const swg = el('g', { class: 'clickable', tabindex: 0, role: 'button', 'aria-label': '拨动 SW1' }, svg);
  el('rect', { x: 230, y: 205, width: 110, height: 80, fill: 'transparent' }, swg);
  el('circle', { cx: 280, cy: 222, r: 4, fill: 'var(--fg)' }, swg);
  el('circle', { cx: 250, cy: 262, r: 4, fill: 'var(--fg)' }, swg);
  el('circle', { cx: 310, cy: 262, r: 4, fill: 'var(--fg)' }, swg);
  const blade = el('line', { class: 'blade', x1: 280, y1: 222, x2: 280, y2: 272, stroke: 'var(--fg)', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, swg);
  blade.style.transformOrigin = '280px 222px';
  el('text', { class: 'm', x: 344, y: 236 }, swg, 'SW1');
  el('text', { class: 'm mu', x: 344, y: 254, 'font-size': 11 }, swg, '额定 50mA');
  el('path', { class: 'ln fg', d: 'M250 262 V270 M238 270 H262 M243 276 H257 M248 282 H252' }, svg);
  el('text', { class: 'm mu', x: 222, y: 266, 'text-anchor': 'end' }, svg, 'ON 接地');
  el('path', { class: 'ln mu', d: 'M304 268 L316 280 M316 268 L304 280' }, svg);
  el('text', { class: 'm mu', x: 322, y: 280 }, svg, 'OFF 悬空');
  const dg = el('g', {}, svg);
  let on = false, fl = [];
  function upd() {
    blade.style.transform = `rotate(${on ? 36.87 : -36.87}deg)`;
    document.getElementById('swTog').textContent = on ? '拨到 OFF' : '拨到 ON';
    const en = on ? 0 : VB, vgs = en - VB;
    enT.textContent = '= ' + en.toFixed(1) + 'V';
    q2.classList.toggle('on', on); load.classList.toggle('on', on);
    dl.setAttribute('class', 'ln ' + (on ? 'pw' : 'off'));
    lamp.setAttribute('fill', on ? 'var(--ok)' : 'var(--line)');
    document.getElementById('sEn').textContent = en.toFixed(2) + ' V';
    document.getElementById('sVgs').textContent = vgs.toFixed(2) + ' V';
    const q = document.getElementById('sQ'); q.textContent = on ? '完全导通' : '关断'; q.className = on ? 'good' : '';
    document.getElementById('sSw').textContent = on ? (VB / 100e3 * 1e6).toFixed(0) + ' µA' : '0 µA';
    document.getElementById('sLoad').textContent = on ? '最多约 2 A' : '0 A';
    const t = document.getElementById('sText');
    t.className = 'status ' + (on ? 'good' : '');
    t.textContent = on
      ? 'ON：SW1 把 PWR_EN_N 接到地，Q2 的栅极比源极低 4V，完全导通，电池的大电流穿过 Q2 去全板。SW1 自己只过 R14 上那 40µA。'
      : 'OFF：SW1 悬空，R14 把栅极拉到和源极一样的 4V，Vgs = 0，Q2 关断，全板没电。R14 两端电压相同，也没有电流。';
    fl.forEach(x => x.remove()); fl = [];
    if (on) {
      fl.push(flow(dg, 'M120 60 H700', '', 70, 28, 4));
      fl.push(flow(dg, 'M200 64 V200 H280 V222 L250 262', 's', 10, 46, 2.4));
    }
  }
  const toggle = () => { on = !on; upd(); };
  document.getElementById('swTog').addEventListener('click', toggle);
  swg.addEventListener('click', toggle);
  swg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  upd();
})();
})();
