
/* ================= 第 7 课 ================= */
(function () {
  /* 7.1 模组示意 */
  const m = document.getElementById('modsvg');
  const E = (t, a, x) => C.el(t, a, m, x);
  E('rect', { x: 50, y: 14, width: 260, height: 266, rx: 8, fill: 'var(--panel2)', stroke: 'var(--fg)', 'stroke-width': 1.6 });
  for (let i = 0; i < 12; i++) { E('rect', { x: 44, y: 104 + i * 14.5, width: 12, height: 8, rx: 1.5, fill: 'var(--hl)', opacity: 0.75 }); E('rect', { x: 304, y: 104 + i * 14.5, width: 12, height: 8, rx: 1.5, fill: 'var(--hl)', opacity: 0.75 }); }
  E('rect', { x: 62, y: 22, width: 236, height: 62, rx: 6, fill: 'none', stroke: 'var(--line)', 'stroke-dasharray': '4 4' });
  E('path', { d: 'M76 70 V36 H116 V62 H146 V36 H186 V62 H216 V36 H256 V70', fill: 'none', stroke: 'var(--hl)', 'stroke-width': 3 });
  E('text', { x: 180, y: 80, 'text-anchor': 'middle', class: 'm mu', 'font-size': 11 }, '板载天线（下面不能有铜）');
  E('rect', { x: 66, y: 96, width: 228, height: 176, rx: 6, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '6 4' });
  E('text', { x: 286, y: 112, 'text-anchor': 'end', class: 'm mu', 'font-size': 11 }, '金属屏蔽壳');
  E('rect', { x: 110, y: 130, width: 110, height: 100, rx: 6, fill: 'var(--panel)', stroke: 'var(--sig)', 'stroke-width': 2 });
  E('text', { x: 165, y: 172, 'text-anchor': 'middle', 'font-weight': 700 }, 'ESP32-S3');
  E('text', { x: 165, y: 192, 'text-anchor': 'middle', class: 'm mu', 'font-size': 11 }, '双核 240MHz');
  E('text', { x: 165, y: 210, 'text-anchor': 'middle', class: 'm mu', 'font-size': 11 }, '内封 2MB PSRAM');
  E('rect', { x: 236, y: 140, width: 48, height: 40, rx: 4, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 1.4 });
  E('text', { x: 260, y: 158, 'text-anchor': 'middle', class: 'm', 'font-size': 11 }, 'Flash');
  E('text', { x: 260, y: 172, 'text-anchor': 'middle', class: 'm mu', 'font-size': 11 }, '8MB');
  E('rect', { x: 236, y: 196, width: 48, height: 26, rx: 4, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 1.4 });
  E('text', { x: 260, y: 213, 'text-anchor': 'middle', class: 'm', 'font-size': 10.5 }, '40MHz');
  E('text', { x: 84, y: 254, class: 'm mu', 'font-size': 11 }, '还有：射频匹配、去耦电容');
  E('text', { x: 180, y: 296, 'text-anchor': 'middle', class: 'm mu', 'font-size': 11 }, '两侧的金色小方块是焊盘');

  /* 7.2 EN 曲线 */
  const s = document.getElementById('ensvg');
  const x0 = 50, x1 = 610, X = t => x0 + t / 60 * (x1 - x0), Y = v => 200 - v / 3.6 * 180;
  [0, 1, 2, 3].forEach(v => { C.el('line', { class: 'gridl', x1: x0, x2: x1, y1: Y(v), y2: Y(v) }, s); C.el('text', { class: 'axis', x: x0 - 8, y: Y(v) + 4, 'text-anchor': 'end' }, s, v + 'V'); });
  [0, 10, 20, 30, 40, 50, 60].forEach(t => C.el('text', { class: 'axis', x: X(t), y: 218, 'text-anchor': 'middle' }, s, t + 'ms'));
  C.el('line', { class: 'gridl', x1: x0, x2: x1, y1: Y(2.5), y2: Y(2.5), 'stroke-dasharray': '5 4', stroke: 'var(--muted)' }, s);
  C.el('text', { class: 'axis', x: x1, y: Y(2.5) - 5, 'text-anchor': 'end' }, s, '2.5V 门槛');
  const shade = C.el('rect', { y: 20, height: 180, fill: 'var(--pow)', opacity: 0, x: 0, width: 0 }, s);
  const p3 = C.el('path', { class: 'curve', stroke: 'var(--c2)', d: '' }, s);
  const pE = C.el('path', { class: 'curve', stroke: 'var(--c3)', d: '' }, s);
  const mk = C.el('line', { stroke: 'var(--ok)', 'stroke-width': 2, y1: 20, y2: 200, opacity: 0 }, s);
  const mkT = C.el('text', { class: 'axis', y: 150, fill: 'var(--ok)' }, s, '');
  const l3 = C.el('text', { class: 'axis', x: x1 + 4, fill: 'var(--fg)' }, s, '3V3');
  const lE = C.el('text', { class: 'axis', x: x1 + 4, fill: 'var(--fg)' }, s, 'EN');
  let scen = 'pow';
  const V3 = t => scen === 'pow' ? 3.3 * Math.min(1, t / 1) : 3.3;
  const VE = t => {
    if (scen === 'pow') return Math.min(V3(t), 3.3 * (1 - Math.exp(-t / 10)));
    if (t < 10) return 3.3; if (t < 25) return 3.3 * Math.exp(-(t - 10) / 0.05); return 3.3 * (1 - Math.exp(-(t - 25) / 10));
  };
  const tStart = () => (scen === 'pow' ? 0 : 25) + 10 * Math.log(1 / (1 - 2.5 / 3.3));
  function draw(upto) {
    let a = '', b = '';
    for (let t = 0; t <= upto; t += 0.1) { const xx = X(t).toFixed(1); a += (t ? 'L' : 'M') + xx + ' ' + Y(V3(t)).toFixed(1); b += (t ? 'L' : 'M') + xx + ' ' + Y(VE(t)).toFixed(1); }
    p3.setAttribute('d', a); pE.setAttribute('d', b);
    const ts = tStart();
    if (upto >= ts) { mk.setAttribute('x1', X(ts)); mk.setAttribute('x2', X(ts)); mk.setAttribute('opacity', 1); mkT.setAttribute('x', X(ts) + 5); mkT.textContent = scen === 'pow' ? `上电后 ${ts.toFixed(0)}ms 芯片启动` : `松开后 ${(ts - 25).toFixed(0)}ms 重新启动`; }
    else { mk.setAttribute('opacity', 0); mkT.textContent = ''; }
    if (scen === 'rst' && upto > 10) { shade.setAttribute('x', X(10)); shade.setAttribute('width', X(Math.min(upto, 25)) - X(10)); shade.setAttribute('opacity', 0.1); } else shade.setAttribute('opacity', 0);
    const y3 = Y(V3(upto)), yE = Y(VE(upto));
    l3.setAttribute('y', Math.min(y3, yE - 12) + 4); lE.setAttribute('y', Math.max(yE, y3 + 12) + 4);
  }
  function run(sc) {
    scen = sc;
    const st = document.getElementById('enText');
    st.className = 'status';
    st.textContent = sc === 'pow' ? '上电：3V3 在 1ms 内升到 3.3V。EN 被 C7 拖住，沿着充电曲线慢慢往上爬，越过 2.5V 时芯片才开始启动，这时电源早已稳定。'
      : '按下 RESET：SW3 把 EN 直接短到地，C7 瞬间放空，芯片复位（橙色区域）。松开后 C7 重新充电，EN 再次越过 2.5V，芯片重新启动。3V3 全程不受影响。';
    if (RM) { draw(60); return; }
    const t0 = performance.now();
    const step = now => { const u = Math.min(60, (now - t0) / 2200 * 60); draw(u); if (u < 60) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  document.getElementById('enPow').addEventListener('click', () => run('pow'));
  document.getElementById('enRst').addEventListener('click', () => run('rst'));
  draw(0);

  /* 7.3 BOOT */
  const b = document.getElementById('btsvg');
  const B = (t, a, x) => C.el(t, a, b, x);
  B('path', { class: 'ln pw', d: 'M40 24 H200' }); B('text', { class: 'm pw', x: 40, y: 16 }, '3V3');
  B('path', { class: 'ln fg', d: 'M120 24 V40 M120 80 V94' }); B('rect', { x: 112, y: 40, width: 16, height: 40, rx: 2, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 }); B('text', { class: 'm', x: 76, y: 64 }, 'R8');
  const io0 = B('path', { class: 'ln sg', d: 'M120 94 H480' }); B('text', { class: 'm sg', x: 290, y: 86 }, 'IO0 / BOOT');
  const io0T = B('text', { class: 'm', x: 386, y: 86 }, '');
  B('path', { class: 'ln fg', d: 'M240 94 V106 M240 134 V146 M228 146 H252 M233 152 H247 M238 158 H242' });
  const sw2 = B('line', { x1: 240, y1: 106, x2: 254, y2: 132, stroke: 'var(--fg)', 'stroke-width': 3, 'stroke-linecap': 'round' });
  B('circle', { cx: 240, cy: 106, r: 3, fill: 'var(--fg)' }); B('circle', { cx: 240, cy: 134, r: 3, fill: 'var(--fg)' });
  B('text', { class: 'm', x: 262, y: 126 }, 'SW2 BOOT');
  B('path', { class: 'ln pw', d: 'M418 116 H442' }); B('text', { class: 'm pw', x: 446, y: 120 }, '3V3');
  B('path', { class: 'ln fg', d: 'M430 116 V124 M430 156 V170' }); B('rect', { x: 422, y: 124, width: 16, height: 32, rx: 2, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 }); B('text', { class: 'm', x: 396, y: 146 }, 'R7');
  B('circle', { cx: 430, cy: 170, r: 3.5, fill: 'var(--fg)' });
  const en = B('path', { class: 'ln sg', d: 'M370 170 H480' }); B('text', { class: 'm sg', x: 448, y: 162 }, 'EN');
  B('path', { class: 'ln fg', d: 'M370 170 V178 M370 196 V198 M358 198 H382' });
  const sw3 = B('line', { x1: 370, y1: 178, x2: 384, y2: 196, stroke: 'var(--fg)', 'stroke-width': 3, 'stroke-linecap': 'round' });
  B('text', { class: 'm', x: 392, y: 192 }, 'SW3 RESET');
  const chip = B('rect', { class: 'box', x: 480, y: 50, width: 200, height: 140, rx: 12 });
  B('text', { x: 580, y: 80, 'text-anchor': 'middle', 'font-weight': 700 }, 'ESP32-S3');
  B('text', { class: 'm mu', x: 580, y: 104, 'text-anchor': 'middle' }, '这次的启动方式');
  const modeT = B('text', { x: 580, y: 136, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 16 }, '运行程序');
  const sampleT = B('text', { class: 'm mu', x: 580, y: 160, 'text-anchor': 'middle', 'font-size': 11 }, '');
  let hold = false, busy = false, mode = 'run';
  function paint(enLow) {
    sw2.setAttribute('x2', hold ? 240 : 254); sw2.setAttribute('y2', hold ? 134 : 132);
    io0.setAttribute('class', 'ln ' + (hold ? 'off' : 'sg'));
    io0T.textContent = hold ? '= 0V（低）' : '= 3.3V（高）';
    sw3.setAttribute('x2', enLow ? 370 : 384); sw3.setAttribute('y2', 196);
    en.setAttribute('class', 'ln ' + (enLow ? 'off' : 'sg'));
    modeT.textContent = enLow ? '复位中…' : mode === 'run' ? '运行 Flash 里的程序' : '下载模式';
    modeT.setAttribute('fill', enLow ? 'var(--muted)' : mode === 'run' ? 'var(--ok)' : 'var(--hl)');
    chip.setAttribute('style', enLow ? '' : mode === 'run' ? 'stroke:var(--ok)' : 'stroke:var(--hl)');
    document.getElementById('btBoot').setAttribute('aria-pressed', String(hold));
    document.getElementById('btBoot').textContent = hold ? '松开 BOOT' : '按住 BOOT（SW2）';
    const t = document.getElementById('btText');
    if (enLow) { t.className = 'status'; t.textContent = 'RESET 按下：EN 被拉到地，芯片停住。'; }
    else if (mode === 'run') { t.className = 'status good'; t.textContent = hold ? '注意：BOOT 是在开机那一刻才看的。现在按住 BOOT 不会有变化，要再按一下 RESET 才生效。' : 'EN 变高的瞬间，IO0 是高电平（R8 拉着），芯片正常运行 Flash 里的程序。'; }
    else { t.className = 'status warn'; t.textContent = hold ? 'EN 变高的瞬间，IO0 被 SW2 拉到了低电平，芯片进入下载模式，等电脑发程序过来。现在可以松开 BOOT 了。' : '芯片仍在下载模式（开机时已经决定了，松开 BOOT 不影响）。烧录完会自动重启，或者再按一次 RESET 回到正常运行。'; }
  }
  document.getElementById('btBoot').addEventListener('click', () => { hold = !hold; paint(false); });
  document.getElementById('btRst').addEventListener('click', () => {
    if (busy) return; busy = true; paint(true); sampleT.textContent = '';
    setTimeout(() => { mode = hold ? 'dl' : 'run'; sampleT.textContent = 'EN 变高时采样到 IO0 = ' + (hold ? '0' : '1'); paint(false); busy = false; }, RM ? 0 : 700);
  });
  paint(false);

  /* 7.5 ADC */
  const a = document.getElementById('adcsvg');
  const A = (t, at, x) => C.el(t, at, a, x);
  A('rect', { class: 'box', x: 20, y: 20, width: 90, height: 50, rx: 8 }); A('text', { x: 65, y: 42, 'text-anchor': 'middle', 'font-weight': 700 }, 'BAT_SW');
  const bT = A('text', { class: 'm pw', x: 65, y: 60, 'text-anchor': 'middle' }, '');
  A('path', { class: 'ln pw', d: 'M110 45 H170 V60' });
  A('rect', { x: 162, y: 60, width: 16, height: 40, rx: 2, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 }); A('text', { class: 'm', x: 186, y: 84 }, 'R11 100kΩ');
  A('path', { class: 'ln sg', d: 'M170 100 V120 H400' }); A('circle', { cx: 170, cy: 120, r: 4, fill: 'var(--fg)' });
  A('path', { class: 'ln fg', d: 'M170 120 V136' }); A('rect', { x: 162, y: 136, width: 16, height: 40, rx: 2, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2 }); A('text', { class: 'm', x: 156, y: 160, 'text-anchor': 'end' }, 'R12 100kΩ');
  A('path', { class: 'ln fg', d: 'M170 176 V196 M158 196 H182 M163 202 H177 M168 208 H172' });
  A('circle', { cx: 290, cy: 120, r: 4, fill: 'var(--fg)' });
  A('path', { class: 'ln fg', d: 'M290 120 V150 M276 150 H304 M276 158 H304 M290 158 V196 M278 196 H302 M283 202 H297 M288 208 H292' }); A('text', { class: 'm', x: 310, y: 160 }, 'C8 100nF');
  A('text', { class: 'm sg', x: 196, y: 112 }, 'VBAT_ADC');
  const nT = A('text', { class: 'm', x: 300, y: 112 }, '');
  A('rect', { class: 'box on', x: 400, y: 80, width: 110, height: 80, rx: 10 }); A('text', { x: 455, y: 112, 'text-anchor': 'middle', 'font-weight': 700 }, 'ESP32');
  A('text', { class: 'm mu', x: 455, y: 132, 'text-anchor': 'middle' }, 'IO1 · ADC1');
  A('text', { class: 'm mu', x: 340, y: 212 }, '漏电 ≈ 21µA');
  const OCV = [[3.0, 0], [3.3, 5], [3.5, 10], [3.6, 20], [3.7, 35], [3.75, 45], [3.8, 55], [3.85, 62], [3.9, 70], [4.0, 82], [4.1, 92], [4.2, 100]];
  const pct = v => { for (let i = 1; i < OCV.length; i++) if (v <= OCV[i][0]) { const [va, pa] = OCV[i - 1], [vb, pb] = OCV[i]; return pa + (pb - pa) * (v - va) / (vb - va); } return 100; };
  const sl = document.getElementById('adcV');
  function upd() {
    const v = +sl.value, pin = v / 2, mv = Math.round(pin * 1000), p = pct(v);
    document.getElementById('adcVV').textContent = v.toFixed(2) + ' V';
    bT.textContent = v.toFixed(2) + 'V'; nT.textContent = pin.toFixed(2) + 'V';
    document.getElementById('adcPin').textContent = pin.toFixed(2) + ' V';
    document.getElementById('adcMv').textContent = mv + ' mV';
    document.getElementById('adcBat').textContent = (mv * 2 / 1000).toFixed(2) + ' V';
    const pe = document.getElementById('adcPct'); pe.textContent = '约 ' + Math.round(p) + ' %'; pe.className = v >= 3.7 ? 'good' : v >= 3.5 ? '' : v >= 3.4 ? 'warn' : 'bad';
    document.getElementById('adcCode').innerHTML =
      'int mv = analogReadMilliVolts(1);   <span class="cm">// 读 IO1，返回校准过的毫伏值</span>\n' +
      'float vbat = mv * 2 / 1000.0;       <span class="cm">// 乘 2，还原分压前的电池电压</span>\n' +
      `<span class="cm">// 现在：mv = ${mv}  →  vbat = ${(mv * 2 / 1000).toFixed(2)} V</span>`;
    const t = document.getElementById('adcText');
    if (v >= 3.7) { t.className = 'status good'; t.textContent = '电量充足，放心开。'; }
    else if (v >= 3.5) { t.className = 'status'; t.textContent = '电量剩得不多了，还能正常开，留意早点返航。'; }
    else if (v >= 3.4) { t.className = 'status warn'; t.textContent = '该往回开了：第 9 课的程序在低于 3.6V 时让 LED3 快闪，并把最高速度限制在三成。'; }
    else { t.className = 'status bad'; t.textContent = '停船充电。程序在低于 3.3V 时会直接停机；再放下去，3.3V 稳压也撑不住了（第 6 课），而且过放伤电池。'; }
  }
  sl.addEventListener('input', upd); upd();
})();
