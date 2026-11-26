
/* ================= 第 9 课 ================= */
(function () {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DZ = 0.08;
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : ' ') + Math.abs(v).toFixed(2);

  /* ---------- 状态：摇杆 → 混控 ---------- */
  const st = { sx: 0, sy: 0, x: 0, y: 0, L: 0, R: 0, drag: false, latch: false };
  function mix() {
    st.x = Math.abs(st.sx) < DZ ? 0 : st.sx;
    st.y = Math.abs(st.sy) < DZ ? 0 : st.sy;
    st.L = clamp(st.y + st.x, -1, 1); st.R = clamp(st.y - st.x, -1, 1);
  }
  const pinTxt = s => Math.abs(s) < 0.02 ? '0 · 0' : s > 0 ? `1 · PWM ${Math.round((1 - Math.abs(s)) * 100)}%` : `PWM ${Math.round((1 - Math.abs(s)) * 100)}% · 1`;
  const reg = s => Math.abs(s) < 0.02 ? [0, 0] : s > 0 ? [1023, Math.floor((1 - s) * 1023)] : [Math.floor((1 + s) * 1023), 1023];  // 和固件的 int 截断一致
  const motWord = s => Math.abs(s) < 0.02 ? '停' : (s > 0 ? '正转 ' : '反转 ') + Math.round(Math.abs(s) * 100) + '%';
  function motion() {
    const { L, R } = st;
    if (Math.abs(L) < 0.02 && Math.abs(R) < 0.02) return ['', '摇杆在死区里，两个电机都停（滑行）。'];
    if (Math.abs(L - R) < 0.02) return ['good', L > 0 ? `L = R：两边一样快，直线前进（${Math.round(L * 100)}%）。` : `L = R < 0：两个电机一起反转，直线后退。`];
    if (Math.abs(L + R) < 0.04) return ['warn', `L = −R：一边正转一边反转，船在原地${L > R ? '向右' : '向左'}打转。`];
    const right = L > R;
    if ((L + R) < 0) return ['', `一边倒车一边${right ? '向右' : '向左'}偏：船尾往${right ? '左' : '右'}甩。`];
    return ['good', `${right ? '左' : '右'}边推得更猛（L ${sgn(L)}，R ${sgn(R)}），船头往${right ? '右' : '左'}偏。差得越多，弯转得越急。`];
  }

  /* ---------- 9.1 信号链 ---------- */
  const cs = $('chainsvg');
  const NODES = [
    ['手柄', '右摇杆', '9.2'], ['蓝牙 BLE', 'Bluepad32', '9.3'], ['换算', '÷512 + 死区', '9.2'], ['混控', 'L=y+x R=y−x', '9.2'],
    ['PWM', '20kHz 10 位', '8.4'], ['DRV8833', '两个 H 桥', '8.2–8.5'], ['电机 + 桨', 'J3 · J4', '8.7']
  ];
  const NX = i => 7 + i * 118, NW = 98;
  const vals = [];
  for (let i = 0; i < NODES.length - 1; i++) {
    const x1 = NX(i) + NW + 3, x2 = NX(i + 1) - 6;
    const la = { class: 'ln ' + (i === 5 ? 'pw' : 'sg'), d: `M${x1} 80 H${x2}` }; if (i === 0) la['stroke-dasharray'] = '4 4';
    C.el('path', la, cs);
    C.el('path', { d: `M${x2 + 5} 80 l-7 -4.5 v9 z`, fill: i === 5 ? 'var(--pow)' : 'var(--sig)' }, cs);
    C.flow(cs, `M${x1} 80 H${x2}`, i === 5 ? '' : 's', 26, 14, 2.6);
  }
  NODES.forEach(([t, s, ref], i) => {
    C.el('rect', { class: 'box on', x: NX(i), y: 30, width: NW, height: 100, rx: 10 }, cs);
    C.el('text', { x: NX(i) + NW / 2, y: 52, 'text-anchor': 'middle', 'font-weight': 700 }, cs, t);
    C.el('text', { class: 'm mu', x: NX(i) + NW / 2, y: 70, 'text-anchor': 'middle', 'font-size': 9.5 }, cs, s);
    vals.push([C.el('text', { class: 'm sg', x: NX(i) + NW / 2, y: 98, 'text-anchor': 'middle', 'font-size': 10.5 }, cs, ''), C.el('text', { class: 'm sg', x: NX(i) + NW / 2, y: 116, 'text-anchor': 'middle', 'font-size': 10.5 }, cs, '')]);
    C.el('text', { class: 'm mu', x: NX(i) + NW / 2, y: 150, 'text-anchor': 'middle', 'font-size': 10 }, cs, ref);
  });
  C.el('text', { class: 'm mu', x: 10, y: 178, 'font-size': 10.5 }, cs, '供电：电池 → Q2 → Q1 → VSYS → DRV8833（第 4、5 课）；VSYS → LDO → 3V3 → ESP32（第 6 课）');
  C.el('text', { class: 'm mu', x: 10, y: 194, 'font-size': 10.5 }, cs, '方框下面的编号是讲这一站的小节');
  function dirWord() {
    const { sx, sy } = st, m = Math.hypot(sx, sy);
    if (m < 0.05) return ['回中', ''];
    const a = (Math.atan2(sx, sy) * 180 / Math.PI + 360) % 360;
    const w = ['往前', '右前', '往右', '右后', '往后', '左后', '往左', '左前'][Math.round(a / 45) % 8];
    return [w + '推', '推了 ' + Math.round(m * 100) + '%'];
  }
  function updChain() {
    const d = dirWord(), rl = reg(st.L), rr = reg(st.R);
    const set = (i, a, b) => { vals[i][0].textContent = a; vals[i][1].textContent = b; };
    set(0, d[0], d[1]);
    set(1, 'X ' + Math.round(st.sx * 512), 'Y ' + Math.round(-st.sy * 512));
    set(2, 'x ' + sgn(st.x), 'y ' + sgn(st.y));
    set(3, 'L ' + sgn(st.L), 'R ' + sgn(st.R));
    set(4, `左 ${rl[0]}·${rl[1]}`, `右 ${rr[0]}·${rr[1]}`);
    set(5, '左 ' + motWord(st.L), '右 ' + motWord(st.R));
    const { L, R } = st;
    const m = Math.abs(L) < 0.02 && Math.abs(R) < 0.02 ? '' : Math.abs(L - R) < 0.02 ? '两边一样快' : Math.abs(L + R) < 0.04 ? '一正一反' : L > R ? '左快右慢' : '右快左慢';
    set(6, Math.abs(L) < 0.02 && Math.abs(R) < 0.02 ? '船停' : Math.abs(L - R) < 0.02 ? (L > 0 ? '直行' : '后退') : Math.abs(L + R) < 0.04 ? '原地转' : L > R ? '右转' : '左转', m);
  }

  /* ---------- 9.2 摇杆 ---------- */
  const js = $('joy'), J = (t, a, x, p) => C.el(t, a, p || js, x);
  const RJ = 84;
  J('circle', { cx: 120, cy: 120, r: 112, fill: 'var(--panel2)', stroke: 'var(--line)', 'stroke-width': 2 });
  J('rect', { x: 120 - DZ * RJ, y: 120 - RJ, width: 2 * DZ * RJ, height: 2 * RJ, fill: 'var(--hl)', opacity: 0.13 });
  J('rect', { x: 120 - RJ, y: 120 - DZ * RJ, width: 2 * RJ, height: 2 * DZ * RJ, fill: 'var(--hl)', opacity: 0.13 });
  J('circle', { cx: 120, cy: 120, r: RJ, fill: 'none', stroke: 'var(--line)', 'stroke-dasharray': '3 4' });
  J('text', { class: 'm mu', x: 120, y: 22, 'text-anchor': 'middle', 'font-size': 11 }, '前');
  J('text', { class: 'm mu', x: 120, y: 230, 'text-anchor': 'middle', 'font-size': 11 }, '后');
  J('text', { class: 'm mu', x: 16, y: 124, 'text-anchor': 'middle', 'font-size': 11 }, '左');
  J('text', { class: 'm mu', x: 224, y: 124, 'text-anchor': 'middle', 'font-size': 11 }, '右');
  J('text', { class: 'm mu', x: 120, y: 200, 'text-anchor': 'middle', 'font-size': 9.5 }, '黄色十字：死区');
  const stem = J('line', { x1: 120, y1: 120, x2: 120, y2: 120, stroke: 'var(--muted)', 'stroke-width': 6, 'stroke-linecap': 'round' });
  const knob = J('g', {});
  J('circle', { cx: 0, cy: 0, r: 28, fill: 'var(--sig)', opacity: 0.92 }, null, knob);
  J('circle', { cx: 0, cy: 0, r: 18, fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2, opacity: 0.5 }, null, knob);
  function paintJoy() {
    const kx = 120 + st.sx * RJ, ky = 120 - st.sy * RJ;
    knob.setAttribute('transform', `translate(${kx.toFixed(1)} ${ky.toFixed(1)})`);
    stem.setAttribute('x2', kx.toFixed(1)); stem.setAttribute('y2', ky.toFixed(1));
    js.setAttribute('aria-valuetext', `x ${st.x.toFixed(2)}, y ${st.y.toFixed(2)}`);
  }
  function setStick(x, y) {
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    st.sx = x; st.sy = y; mix(); paintJoy(); updUI();
  }
  function fromEvent(e) {
    const r = js.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width * 240 - 120) / RJ, y = -((e.clientY - r.top) / r.height * 240 - 120) / RJ;
    setStick(x, y);
  }
  js.addEventListener('pointerdown', e => { st.drag = true; st.latch = false; st.target = null; C.pressOne('[data-dp]', 'dp', ''); js.setPointerCapture(e.pointerId); fromEvent(e); });
  js.addEventListener('pointermove', e => { if (st.drag) fromEvent(e); });
  const release = () => { if (!st.drag) return; st.drag = false; if (RM) setStick(0, 0); };
  js.addEventListener('pointerup', release); js.addEventListener('pointercancel', release);
  const keys = new Set();
  const keyStick = () => { const x = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), y = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0); st.latch = keys.size > 0; setStick(x, y); };
  js.addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) { e.preventDefault(); st.target = null; keys.add(e.key); C.pressOne('[data-dp]', 'dp', ''); keyStick(); } });
  js.addEventListener('keyup', e => { if (keys.delete(e.key)) { keyStick(); if (!keys.size) { st.latch = false; if (RM) setStick(0, 0); } } });
  js.addEventListener('blur', () => { keys.clear(); st.latch = false; });
  const DP = { up: [0, 0.8], down: [0, -0.6], left: [-0.5, 0.5], right: [0.5, 0.5], stop: [0, 0] };
  document.querySelectorAll('[data-dp]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.dp; st.latch = k !== 'stop'; C.pressOne('[data-dp]', 'dp', k === 'stop' ? '' : k);
    if (RM || k === 'stop') setStick(...DP[k]); else st.target = DP[k];
  }));

  /* 电机条 */
  const mb = $('motbars'), M = (t, a, x) => C.el(t, a, mb, x);
  const BX0 = 190, BX1 = 620, BC = (BX0 + BX1) / 2, BW = (BX1 - BX0) / 2;
  const bars = [['左电机 L = y + x', 'var(--c1)', 30], ['右电机 R = y − x', 'var(--c2)', 74]].map(([lab, col, y]) => {
    M('text', { x: 10, y: y + 5, 'font-weight': 600 }, lab);
    M('rect', { x: BX0, y: y - 11, width: BX1 - BX0, height: 22, rx: 4, fill: 'var(--panel2)', stroke: 'var(--line)' });
    const r = M('rect', { y: y - 9, height: 18, rx: 3, fill: col, x: BC, width: 0 });
    const t = M('text', { class: 'm', y: y + 4, x: BC }, '');
    return { r, t };
  });
  M('line', { x1: BC, x2: BC, y1: 12, y2: 92, stroke: 'var(--muted)' });
  M('text', { class: 'axis', x: BX0, y: 110, 'text-anchor': 'start' }, '−100% 反转');
  M('text', { class: 'axis', x: BC, y: 110, 'text-anchor': 'middle' }, '0');
  M('text', { class: 'axis', x: BX1, y: 110, 'text-anchor': 'end' }, '正转 +100%');
  function updBars() {
    [st.L, st.R].forEach((s, i) => {
      const w = Math.abs(s) * BW, b = bars[i];
      b.r.setAttribute('x', s >= 0 ? BC : BC - w); b.r.setAttribute('width', w);
      const pct = Math.round(s * 100);
      b.t.textContent = (pct > 0 ? '+' : '') + pct + '%';
      const inside = w > 60;
      b.t.setAttribute('x', s >= 0 ? (inside ? BC + w - 6 : BC + w + 6) : (inside ? BC - w + 6 : BC - w - 6));
      b.t.setAttribute('text-anchor', (s >= 0) === inside ? 'end' : 'start');
      b.t.setAttribute('fill', inside ? 'var(--bg)' : 'var(--fg)');
    });
  }
  let lastUI = '';
  function updUI() {
    const key = [st.sx, st.sy].map(v => v.toFixed(3)).join();
    if (key === lastUI) return; lastUI = key;
    $('simXY').textContent = `${sgn(st.x)} / ${sgn(st.y)}`;
    $('simPL').textContent = pinTxt(st.L); $('simPR').textContent = pinTxt(st.R);
    const [c, t] = motion(); $('simText').className = 'status ' + c; $('simText').textContent = t;
    updBars(); updChain();
    if (RM) drawPond();
  }

  /* ---------- 水池 ---------- */
  const cv = $('pond'), ctx = cv.getContext('2d');
  const WW = 10, WH = 6.2;
  const boat = { x: 2.2, y: WH / 2, th: 0, v: 0, w: 0 };
  let trail = [], trailT = 0, visible = true, cssW = 600, cssH = 372, colors = {}, colorT = 0;
  const VMAX = 1.4, WMAX = 1.8;
  function readColors() {
    const cs2 = getComputedStyle(document.documentElement);
    ['--panel2', '--line', '--muted', '--c1', '--c2', '--fg', '--sig', '--bg', '--panel'].forEach(k => colors[k] = cs2.getPropertyValue(k).trim());
    colors.font = '11px ' + getComputedStyle(document.body).fontFamily;
  }
  function resize() {
    cssW = cv.clientWidth || 600; cssH = Math.round(cssW * WH / WW);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.height = cssH + 'px'; cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawPond();
  }
  function step(b, L, R, dt) {
    const vt = VMAX * (L + R) / 2, wt = WMAX * (L - R) / 2;
    b.v += (vt - b.v) * Math.min(1, dt / 0.8); b.w += (wt - b.w) * Math.min(1, dt / 0.35);
    b.th += b.w * dt; b.x += b.v * Math.cos(b.th) * dt; b.y += b.v * Math.sin(b.th) * dt;
    const m = 0.35; let hit = false;
    if (b.x < m) { b.x = m; hit = true; } if (b.x > WW - m) { b.x = WW - m; hit = true; }
    if (b.y < m) { b.y = m; hit = true; } if (b.y > WH - m) { b.y = WH - m; hit = true; }
    if (hit) b.v *= 0.6;
    return hit;
  }
  function drawPond() {
    if (!colors['--fg']) readColors();
    const s = cssW / WW, c = ctx;
    c.clearRect(0, 0, cssW, cssH);
    c.fillStyle = colors['--panel2']; c.fillRect(0, 0, cssW, cssH);
    c.strokeStyle = colors['--line']; c.lineWidth = 1; c.globalAlpha = 0.6;
    for (let i = 1; i < WW; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, cssH); c.stroke(); }
    for (let j = 1; j < WH; j++) { c.beginPath(); c.moveTo(0, j * s); c.lineTo(cssW, j * s); c.stroke(); }
    c.globalAlpha = 1;
    c.fillStyle = colors['--muted']; c.font = colors.font;
    c.fillRect(12, cssH - 14, s, 2); c.fillText('1 m', 12, cssH - 20);
    // 尾迹
    for (let k = 1; k < trail.length; k++) {
      c.globalAlpha = (k / trail.length) * 0.55; c.strokeStyle = colors['--sig']; c.lineWidth = 2;
      c.beginPath(); c.moveTo(trail[k - 1][0] * s, trail[k - 1][1] * s); c.lineTo(trail[k][0] * s, trail[k][1] * s); c.stroke();
    }
    c.globalAlpha = 1;
    // 预测
    const p = Object.assign({}, boat); c.setLineDash([5, 5]); c.strokeStyle = colors['--fg']; c.globalAlpha = 0.5; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(p.x * s, p.y * s);
    for (let k = 0; k < 60; k++) { step(p, st.L, st.R, 0.05); c.lineTo(p.x * s, p.y * s); }
    c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    // 船
    const len = clamp(s * 0.62, 34, 54), hw = len * 0.36;
    c.save(); c.translate(boat.x * s, boat.y * s); c.rotate(boat.th);
    const hull = (yy, col, th) => {
      c.fillStyle = colors['--panel']; c.strokeStyle = colors['--fg']; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-len / 2, yy - len * 0.08); c.lineTo(len * 0.32, yy - len * 0.08); c.quadraticCurveTo(len / 2, yy, len * 0.32, yy + len * 0.08); c.lineTo(-len / 2, yy + len * 0.08); c.closePath(); c.fill(); c.stroke();
      if (Math.abs(th) > 0.02) {
        c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
        const L2 = len * 0.55 * Math.abs(th);
        c.beginPath();
        if (th > 0) { c.moveTo(-len / 2 - 3, yy); c.lineTo(-len / 2 - 3 - L2, yy); }
        else { c.moveTo(len / 2 + 3, yy); c.lineTo(len / 2 + 3 + L2, yy); }
        c.stroke();
      }
    };
    hull(-hw, colors['--c1'], st.L); hull(hw, colors['--c2'], st.R);
    c.fillStyle = colors['--sig']; c.globalAlpha = 0.85;
    c.fillRect(-len * 0.3, -hw + len * 0.06, len * 0.56, 2 * hw - len * 0.12); c.globalAlpha = 1;
    c.fillStyle = colors['--bg']; c.beginPath(); c.moveTo(len * 0.22, 0); c.lineTo(len * 0.02, -len * 0.1); c.lineTo(len * 0.02, len * 0.1); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = colors['--muted']; c.textAlign = 'right';
    c.fillText(`速度 ${Math.abs(boat.v).toFixed(2)} m/s`, cssW - 10, 18); c.textAlign = 'left';
    c.fillStyle = colors['--c1']; c.fillText('左 ' + Math.round(st.L * 100) + '%', 12, 18);
    c.fillStyle = colors['--c2']; c.fillText('右 ' + Math.round(st.R * 100) + '%', 12, 34);
  }
  $('pondReset').addEventListener('click', () => { Object.assign(boat, { x: 2.2, y: WH / 2, th: 0, v: 0, w: 0 }); trail = []; drawPond(); });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(cv);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { readColors(); drawPond(); });

  C.tickers.add((t, dt) => {
    // 摇杆：松手回中；十字键：平滑移到目标
    if (st.target) {
      const [tx, ty] = st.target; const k = Math.min(1, dt / 0.08);
      const nx = st.sx + (tx - st.sx) * k, ny = st.sy + (ty - st.sy) * k;
      if (Math.hypot(tx - nx, ty - ny) < 0.004) { st.target = null; setStick(tx, ty); } else setStick(nx, ny);
    } else if (!st.drag && !st.latch && (st.sx || st.sy)) {
      const k = Math.min(1, dt / 0.06); const nx = st.sx * (1 - k), ny = st.sy * (1 - k);
      setStick(Math.hypot(nx, ny) < 0.004 ? 0 : nx, Math.hypot(nx, ny) < 0.004 ? 0 : ny);
    }
    if (!visible) return;
    step(boat, st.L, st.R, dt);
    trailT += dt; if (trailT > 0.08) { trailT = 0; trail.push([boat.x, boat.y]); if (trail.length > 140) trail.shift(); }
    if ((colorT += dt) > 1) { colorT = 0; readColors(); }
    drawPond();
  });
  mix(); paintJoy(); updUI(); resize();

  /* ---------- 9.3 程序 ---------- */
  const CODE = String.raw`// Boat QB12 遥控船 · Arduino + Bluepad32
// 开发板：esp32_bluepad32 → ESP32S3 Dev Module，USB CDC On Boot = Enabled
#include <Bluepad32.h>

// ---- 引脚：和原理图一一对应 ----
const int AIN1 = 4, AIN2 = 5;      // 左电机 J3
const int BIN1 = 6, BIN2 = 7;      // 右电机 J4
const int NSLEEP = 15, NFAULT = 16;
const int VBAT = 1, LED = 2;

const float LOW_VBAT   = 3.6;      // 低于这个电压（V）限速
const float CUT_VBAT   = 3.3;      // 低于这个电压停机，保护电池
const float CUT_RESUME = 3.5;      // 停机后回升到这个电压才放开
const int FULL = 1023;             // 10 位 PWM：0 ~ 1023
ControllerPtr pad = nullptr;       // 当前连上的手柄
float vbatF = 4.0;                 // 滤波后的电池电压
bool cut = false;                  // 电池过低，停机中

void onConnected(ControllerPtr c)    { pad = c; }
void onDisconnected(ControllerPtr c) { if (c == pad) pad = nullptr; }

// 一路电机。s：-1 全速后退 … 0 停 … +1 全速前进
// 慢衰减：一个脚常高，另一个脚 PWM；PWM 为低的那段在推电机
void drive(int ch1, int ch2, float s) {
  s = constrain(s, -1.0f, 1.0f);
  int d = (1 - fabs(s)) * FULL;
  if (fabs(s) < 0.02) { ledcWrite(ch1, 0);    ledcWrite(ch2, 0);    }  // 滑行
  else if (s > 0)     { ledcWrite(ch1, FULL); ledcWrite(ch2, d);    }  // 正转
  else                { ledcWrite(ch1, d);    ledcWrite(ch2, FULL); }  // 反转
}

void setup() {
  // 板包是 2.x 内核：通道 0~3 依次给 AIN1、AIN2、BIN1、BIN2，先设 20kHz、10 位，再挂引脚
  const int pins[4] = {AIN1, AIN2, BIN1, BIN2};
  for (int ch = 0; ch < 4; ch++) { ledcSetup(ch, 20000, 10); ledcAttachPin(pins[ch], ch); }
  pinMode(NFAULT, INPUT);          // 外面有 R10 上拉
  pinMode(LED, OUTPUT);
  pinMode(NSLEEP, OUTPUT);
  digitalWrite(NSLEEP, HIGH);      // 唤醒 DRV8833（平时被 R9 拉低）
  BP32.setup(&onConnected, &onDisconnected);
}

void loop() {
  BP32.update();

  float x = 0, y = 0;              // 没连上手柄：保持 0，船自己停
  if (pad && pad->isConnected()) {
    x =  pad->axisRX() / 512.0;    // 右摇杆左右 = 转向，约 -512 ~ 512
    y = -pad->axisRY() / 512.0;    // 右摇杆前后 = 油门，往前推是负数，取反
    if (fabs(x) < 0.08) x = 0;     // 死区：回中时有点偏也不动
    if (fabs(y) < 0.08) y = 0;
    uint8_t dp = pad->dpad();      // 十字键：简单模式
    if (dp & DPAD_UP)    { x = 0;    y = 0.8;  }
    if (dp & DPAD_DOWN)  { x = 0;    y = -0.6; }
    if (dp & DPAD_LEFT)  { x = -0.5; y = 0.5;  }
    if (dp & DPAD_RIGHT) { x = 0.5;  y = 0.5;  }
  }

  float L = constrain(y + x, -1.0f, 1.0f);   // 差速混控
  float R = constrain(y - x, -1.0f, 1.0f);

  vbatF += (analogReadMilliVolts(VBAT) * 2 / 1000.0 - vbatF) * 0.02;
  if (vbatF < CUT_VBAT) cut = true;          // 低于 3.3V：停机，保护电池
  else if (vbatF > CUT_RESUME) cut = false;  // 回升到 3.5V 才放开
  bool low = vbatF < LOW_VBAT;               // 低于 3.6V：限速三成，该回来了
  if (low) { L *= 0.3; R *= 0.3; }
  if (cut) { L = 0; R = 0; }

  drive(0, 1, L);                  // 通道 0、1 → AIN1、AIN2（左电机）
  drive(2, 3, R);                  // 通道 2、3 → BIN1、BIN2（右电机）

  // 状态灯：连上常亮 · 没连慢闪 · 电量低或驱动报警快闪
  bool fault = digitalRead(NFAULT) == LOW;
  bool on;
  if (fault || low) on = (millis() / 100) % 2;
  else if (!pad)    on = (millis() / 500) % 2;
  else              on = true;
  digitalWrite(LED, on);

  delay(10);
}`;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hl = line => {
    const k = line.indexOf('//');
    let code = k >= 0 ? line.slice(0, k) : line, cm = k >= 0 ? line.slice(k) : '';
    code = esc(code).replace(/\b(\d+(?:\.\d+)?f?)\b/g, '<span class="n">$1</span>')
      .replace(/\b(const|int|float|bool|void|if|else|uint8_t|true|nullptr|ControllerPtr)\b/g, '<span class="kw">$1</span>')
      .replace(/^(#include)/, '<span class="kw">$1</span>');
    return code + (cm ? `<span class="cm">${esc(cm)}</span>` : '');
  };
  $('fwCode').innerHTML = CODE.split('\n').map(hl).join('\n');
  $('codeCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(CODE); $('codeMsg').textContent = '已复制'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('fwCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $('codeMsg').textContent = '已选中，按 Ctrl/⌘ + C 复制'; }
  });

  /* ---------- 9.4 清单 ---------- */
  const KEY = 'qb12-bringup-v1';
  const boxes = [...document.querySelectorAll('#bcTbl input[type="checkbox"]')];
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { saved = []; }
  function updBC() {
    const n = boxes.filter(b => b.checked).length;
    $('bcProg').textContent = `已完成 ${n} / ${boxes.length}`;
    $('bcBar').style.width = (n / boxes.length * 100) + '%';
    boxes.forEach(b => b.closest('tr').classList.toggle('done', b.checked));
    try { localStorage.setItem(KEY, JSON.stringify(boxes.map(b => b.checked))); } catch (e) { }
  }
  boxes.forEach((b, i) => { b.checked = !!saved[i]; b.addEventListener('change', updBC); });
  $('bcReset').addEventListener('click', () => { boxes.forEach(b => b.checked = false); updBC(); });
  updBC();
})();
