/* 第 8 课：下单与到货。
   QB12 的数字全部从 QB.board（真实设计文件抽出来的数据）现算，不手写；
   嘉立创 / JLC 的事实来自 facts.md（出处编号见 p8_notes.md）。价格一律不写金额。 */
const D = QB.board, S = D.stats, FAB = D.fab, FPS = D.footprints;
const $ = id => document.getElementById('p8-' + id);
const RM = C.RM;
const r1 = v => (Math.round(v * 10) / 10).toLocaleString('zh-CN');
const r2 = v => String(Math.round(v * 100) / 100);
const net = n => `<span class="net ${QB.netCls(n) === 's' ? 's' : QB.netCls(n) === 'p' ? 'p' : ''}">${n}</span>`;
const netOf = i => (i >= 0 ? D.nets[i].name : '');
const natural = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });
const uniq = a => [...new Set(a)];
const states = rows => rows.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
const scrollTo = el => el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ================= 共用的数字 ================= */
const N = S.footprints, W = S.size[0], H = S.size[1], TOPN = S.footprints_top;
const kindsMap = new Map();
FPS.forEach(f => {
  if (!kindsMap.has(f.lcsc)) kindsMap.set(f.lcsc, { lcsc: f.lcsc, lib: f.lib, refs: [] });
  kindsMap.get(f.lcsc).refs.push(f.ref);
});
const KINDS = [...kindsMap.values()];
const libK = l => KINDS.filter(k => k.lib === l);
const libN = l => libK(l).reduce((a, k) => a + k.refs.length, 0);
const bomQty = FAB.bom.reduce((a, r) => a + (+r[3] || 0), 0);
const POLAR = FPS.filter(f => ['led', 'd', 'ic'].includes(f.kind)).map(f => f.ref).sort(natural);
const smdOnlyDrop = FPS.filter(f => f.tht).map(f => f.ref);                                  // 封装属性 = 通孔
const thDrop = FPS.filter(f => f.pads.some(p => p.t !== 'smd')).sort((a, b) => natural(a.ref, b.ref));   // 有孔的焊盘
const gerbN = FAB.gerbers.filter(g => !g.file.endsWith('.drl')).length, drlN = FAB.gerbers.length - gerbN;
const zipKB = Math.round(FAB.zip_bytes / 1024);
const widths = S.widths.map(w => w[0]);
const minW = Math.min(...widths), maxW = Math.max(...widths);

/* 脚距 / 焊盘间隙：同一行（x 或 y 相同）里相邻焊盘中心距、边到边距离 */
const ext = p => { const a = (((p.a || 0) % 180) + 180) % 180; return Math.abs(a - 90) < 1 ? [p.h, p.w] : [p.w, p.h]; };
function pitchGap(f) {
  const ps = f.pads.filter(p => p.t === 'smd' && p.s !== 'custom');
  let pitch = Infinity, gap = Infinity;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const p = ps[i], q = ps[j];
    if (p.n === q.n) continue;
    const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y);
    if (dy < 0.02 && dx > 0.05) { pitch = Math.min(pitch, dx); gap = Math.min(gap, dx - (ext(p)[0] + ext(q)[0]) / 2); }
    else if (dx < 0.02 && dy > 0.05) { pitch = Math.min(pitch, dy); gap = Math.min(gap, dy - (ext(p)[1] + ext(q)[1]) / 2); }
  }
  return { pitch: Math.round(pitch * 100) / 100, gap: Math.round(gap * 100) / 100 };
}
const PG = Object.fromEntries(FPS.map(f => [f.ref, pitchGap(f)]));
const FINE = FPS.filter(f => f.pads.length > 2).map(f => [f.ref, PG[f.ref].pitch]).sort((a, b) => a[1] - b[1]);
const pJ1 = r2(PG.J1.pitch), pU2 = r2(PG.U2.pitch), pU3 = r2(PG.U3.pitch);
const finest = FINE[0][1];
const gapRef = FPS.slice().sort((a, b) => PG[a.ref].gap - PG[b.ref].gap)[0].ref, minGap = PG[gapRef].gap;
const SIZES = ['01005', '0201', '0402', '0603', '0805', '1206'];
const pkgs = FPS.filter(f => ['r', 'c', 'led'].includes(f.kind)).map(f => (f.pkg.match(/01005|0201|0402|0603|0805|1206/) || [])[0]).filter(Boolean);
const smallest = SIZES.find(s => pkgs.includes(s));

/* 网表推算：某网络对 GND 之间有哪些电阻、开关、电容 */
const pinNets = f => f.pins.map(p => p[2]);
const has = (f, a, b) => { const s = pinNets(f); return s.includes(a) && s.includes(b); };
const parseR = v => { const m = /([\d.]+)\s*([kM]?)Ω/.exec(v); return m ? +m[1] * ({ k: 1e3, M: 1e6 }[m[2]] || 1) : null; };
const parseC = v => { const m = /([\d.]+)\s*([pnuµμ]?)F/.exec(v); return m ? +m[1] * ({ p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6 }[m[2]] || 1) : 0; };
const fmtR = r => r >= 1e6 ? r1(r / 1e6) + ' MΩ' : r >= 1e3 ? r1(r / 1e3) + ' kΩ' : r1(r) + ' Ω';
const fmtC = c => c >= 1e-6 ? r1(c * 1e6) + ' µF' : r1(c * 1e9) + ' nF';
const RES = FPS.filter(f => f.kind === 'r'), CAPS = FPS.filter(f => f.kind === 'c'), SWS = FPS.filter(f => /^SW/.test(f.ref));
function netPaths(n) {
  const direct = RES.filter(f => has(f, n, 'GND'));
  const series = [], sw = [];
  RES.forEach(a => {
    const s = pinNets(a); if (!s.includes(n) || s.includes('GND')) return;
    const x = s.find(v => v !== n);
    RES.forEach(b => { if (b !== a && has(b, x, 'GND')) series.push([a, b, x]); });
    SWS.forEach(k => { if (has(k, x, 'GND')) sw.push([a, k, x]); });
  });
  const caps = CAPS.filter(f => has(f, n, 'GND'));
  const g = direct.map(f => parseR(f.value)).concat(series.map(([a, b]) => parseR(a.value) + parseR(b.value)));
  const req = g.length ? 1 / g.reduce((s, r) => s + 1 / r, 0) : null;
  return { direct, series, sw, caps, req, ctot: caps.reduce((s, f) => s + parseC(f.value), 0) };
}
const padArea = f => Math.max(...f.pads.map(p => p.w * p.h));
const dsc = f => (f.desc || '').replace(/（[^）]*）/g, '');
function probeCap(n) {
  return CAPS.filter(f => has(f, n, 'GND')).sort((a, b) => padArea(b) - padArea(a) || natural(a.ref, b.ref))[0];
}

/* ================= 预览小图（8.1 第 6 步和 8.5 的小游戏共用） ================= */
const rot = (v, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
const PIN_KEY = /^(GND|VCC|VBUS|BAT|VIN|VOUT|VM)$/;
function partGeo(ref) {
  const f = QB.fp(ref), r = f.rot || 0;
  const pads = f.pads.filter(p => p.t === 'smd');
  let ep = null;
  if (pads.length > 4) {
    const big = pads.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
    if (Math.hypot(big.x - f.x, big.y - f.y) < 0.3) ep = big;
  }
  const legs = pads.filter(p => p !== ep).map(p => {
    const v = [p.x - f.x, p.y - f.y];
    const pin = f.pins.find(q => String(q[0]).split(',').includes(p.n));
    return { p, v, u: rot(v, r), n: p.n, net: netOf(p.net), name: pin ? pin[1] : '' };
  });
  const m = /_L([\d.]+)-W([\d.]+)/.exec(f.fp);
  const L = m ? +m[1] : 2.0, Wd = m ? +m[2] : 1.25;
  let sx = 0, sy = 0;
  for (let i = 0; i < legs.length; i++) for (let j = i + 1; j < legs.length; j++) {
    if (Math.abs(legs[i].u[1] - legs[j].u[1]) < 0.02) sy++;
    if (Math.abs(legs[i].u[0] - legs[j].u[0]) < 0.02) sx++;
  }
  const alongX = sy >= sx;
  const two = legs.length === 2;
  const mark = two ? legs.find(l => l.net === f.pins[1][2]) : legs.find(l => l.n === '1');   // 两脚件：阴极（网表 2 号）；芯片：1 脚
  const land = deg => legs.map(l => {
    const fin = rot(l.u, -(r + deg));
    const q = legs.find(k => Math.hypot(k.v[0] - fin[0], k.v[1] - fin[1]) < 0.15);
    return { l, q };
  });
  const sym = land(180).every(x => x.q);
  // 视野：焊盘外包 + 余量，取正方形
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pads.forEach(p => { const [ew, eh] = ext(p); x0 = Math.min(x0, p.x - f.x - ew / 2); x1 = Math.max(x1, p.x - f.x + ew / 2); y0 = Math.min(y0, p.y - f.y - eh / 2); y1 = Math.max(y1, p.y - f.y + eh / 2); });
  const bwL = alongX ? L : Wd, bhL = alongX ? Wd : L;
  const half = Math.max(x1 - x0, y1 - y0, bwL, bhL) / 2 + 1.3;
  return { f, r, pads, legs, ep, bw: bwL, bh: bhL, alongX, two, mark, land, sym, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, half };
}
const GEO = {};
const geo = ref => GEO[ref] || (GEO[ref] = partGeo(ref));
function padRect(p, x, y, k, cls) {
  const t = p.a ? ` transform="rotate(${-p.a} ${r2(x)} ${r2(y)})"` : '';
  if (p.s === 'circle') return `<circle class="${cls}" cx="${r2(x)}" cy="${r2(y)}" r="${r2(p.w / 2 * k)}"/>`;
  const w = p.w * k, h = p.h * k, rx = p.s === 'oval' ? Math.min(w, h) / 2 : 0;
  return `<rect class="${cls}" x="${r2(x - w / 2)}" y="${r2(y - h / 2)}" width="${r2(w)}" height="${r2(h)}"${rx ? ` rx="${r2(rx)}"` : ''}${t}/>`;
}
function tileSVG(ref, err) {
  const g = geo(ref), s = g.half * 2, st = s / 60;
  const vb = [g.cx - g.half, g.cy - g.half, s, s].map(r2).join(' ');
  let o = `<svg viewBox="${vb}" aria-hidden="true"><rect class="p8-tb" x="${r2(g.cx - g.half)}" y="${r2(g.cy - g.half)}" width="${r2(s)}" height="${r2(s)}"/>`;
  // 板上的焊盘（板子方向）
  g.pads.forEach(p => { o += padRect(p, p.x - g.f.x, p.y - g.f.y, 1, 'p8-tpad'); });
  // 板上的丝印标记（局部坐标，转回板子方向）
  const u = g.mark.u, sgnX = Math.sign(u[0]) || -1, sgnY = Math.sign(u[1]) || 1;
  let silk = '';
  if (g.two) {
    const be = ext(g.mark.p), q = (((g.r % 180) + 180) % 180);
    const le = Math.abs(q - 90) < 1 ? [be[1], be[0]] : be;          // 焊盘在元件自身坐标里的长宽
    const sw = r2(Math.max(st * 2.6, 0.12));
    if (g.alongX) { const x = u[0] + sgnX * (le[0] / 2 + st * 3.5); silk = `<line class="p8-tsilk" x1="${r2(x)}" y1="${r2(-g.bh / 2 - st * 3)}" x2="${r2(x)}" y2="${r2(g.bh / 2 + st * 3)}" stroke-width="${sw}"/>`; }
    else { const y = u[1] + sgnY * (le[1] / 2 + st * 3.5); silk = `<line class="p8-tsilk" x1="${r2(-g.bw / 2 - st * 3)}" y1="${r2(y)}" x2="${r2(g.bw / 2 + st * 3)}" y2="${r2(y)}" stroke-width="${sw}"/>`; }
  } else {
    const pitch = PG[ref].pitch || 1;
    const d = Math.max(pitch * 0.8, st * 7);
    const c = g.alongX ? [u[0] + sgnX * d, u[1]] : [u[0], u[1] + sgnY * d];
    silk = `<circle class="p8-tsilkd" cx="${r2(c[0])}" cy="${r2(c[1])}" r="${r2(Math.max(st * 2.1, 0.12))}"/>`;
  }
  o += `<g transform="rotate(${-g.r})">${silk}</g>`;
  // 元件模型（局部坐标，按“坐标文件的角度 + 错误角度”转）
  let body = '';
  if (g.two) {
    const capW = (g.alongX ? g.bw : g.bh) * 0.17;
    const bx = -g.bw / 2, by = -g.bh / 2;
    body += `<rect class="p8-tbody" x="${r2(bx)}" y="${r2(by)}" width="${r2(g.bw)}" height="${r2(g.bh)}" rx="${r2(st)}"/>`;
    if (g.alongX) {
      body += `<rect class="p8-tleg" x="${r2(bx)}" y="${r2(by)}" width="${r2(capW)}" height="${r2(g.bh)}"/><rect class="p8-tleg" x="${r2(-bx - capW)}" y="${r2(by)}" width="${r2(capW)}" height="${r2(g.bh)}"/>`;
      const bxk = sgnX < 0 ? bx + capW + st * 2 : -bx - capW - st * 2 - g.bw * 0.2;
      body += `<rect class="p8-tband" x="${r2(bxk)}" y="${r2(by)}" width="${r2(g.bw * 0.2)}" height="${r2(g.bh)}"/>`;
    } else {
      body += `<rect class="p8-tleg" x="${r2(bx)}" y="${r2(by)}" width="${r2(g.bw)}" height="${r2(capW)}"/><rect class="p8-tleg" x="${r2(bx)}" y="${r2(-by - capW)}" width="${r2(g.bw)}" height="${r2(capW)}"/>`;
      const byk = sgnY < 0 ? by + capW + st * 2 : -by - capW - st * 2 - g.bh * 0.2;
      body += `<rect class="p8-tband" x="${r2(bx)}" y="${r2(byk)}" width="${r2(g.bw)}" height="${r2(g.bh * 0.2)}"/>`;
    }
  } else {
    // 鸥翼脚：从元件边伸到焊盘中间偏外一点（局部坐标）
    const q = (((g.r % 180) + 180) % 180), swap = Math.abs(q - 90) < 1;
    g.legs.forEach(l => {
      const be = ext(l.p), le = swap ? [be[1], be[0]] : be;
      if (g.alongX) {
        const s = Math.sign(l.u[1]) || 1, w = le[0] * 0.55, a = s * (g.bh / 2 - 0.1), b = l.u[1] + s * le[1] * 0.3;
        body += `<rect class="p8-tleg" x="${r2(l.u[0] - w / 2)}" y="${r2(Math.min(a, b))}" width="${r2(w)}" height="${r2(Math.abs(b - a))}"/>`;
      } else {
        const s = Math.sign(l.u[0]) || 1, h = le[1] * 0.55, a = s * (g.bw / 2 - 0.1), b = l.u[0] + s * le[0] * 0.3;
        body += `<rect class="p8-tleg" x="${r2(Math.min(a, b))}" y="${r2(l.u[1] - h / 2)}" width="${r2(Math.abs(b - a))}" height="${r2(h)}"/>`;
      }
    });
    body += `<rect class="p8-tbody" x="${r2(-g.bw / 2)}" y="${r2(-g.bh / 2)}" width="${r2(g.bw)}" height="${r2(g.bh)}" rx="${r2(st * 1.5)}"/>`;
    const mgn = Math.min(g.bw, g.bh) * 0.26;
    const cl = (v, h) => Math.max(-h + mgn, Math.min(h - mgn, v));
    body += `<circle class="p8-tdot" cx="${r2(cl(u[0] * 0.75, g.bw / 2))}" cy="${r2(cl(u[1] * 0.75, g.bh / 2))}" r="${r2(Math.min(g.bw, g.bh) * 0.1)}"/>`;
  }
  o += `<g class="p8-tmodel" transform="rotate(${-(g.r + err)})">${body}</g></svg>`;
  return o;
}
function verdict(ref, err) {
  const g = geo(ref);
  if (!err) return g.sym ? '方向对。这个封装是对称的，只能靠标记判断。' : '方向对，脚和焊盘一一对上。';
  const L = g.land(err);
  const off = L.filter(x => !x.q).length;
  if (off) return `转了 ${err}°：${off} 个脚落在空地上，一眼能看出来。`;
  if (g.two) {
    if (g.f.kind === 'led') return `转了 ${err}°：脚都在焊盘上，但 LED 反接了，通电不亮。`;
    return `转了 ${err}°：电流本该从 ${g.f.pins[0][2]} 流向 ${g.f.pins[1][2]}，反过来这条路就断了。`;
  }
  const score = l => (PIN_KEY.test(l.name) ? 2 : 0) + (QB.netCls(l.net) !== 's' ? 1 : 0);
  const mism = L.filter(x => x.q.net !== x.l.net).sort((a, b) => score(b.l) - score(a.l)).slice(0, 2);
  return `转了 ${err}°：脚都还在焊盘上，可是 ` + mism.map(x => `${x.l.name || x.l.n} 脚落在了 ${x.q.net || '空脚'} 上`).join('，') + '。';
}

/* ================= 8.2 的选择（8.1 第 2 步也会读它） ================= */
const PAR = { mask: 'green', finish: 'hasl', side: 'top' };
const parHooks = [];                                   // 8.2 改了选择时通知 8.1 的示意图
const MASK_ZH = { green: '绿油', black: '黑油', blue: '蓝油' }, FIN_ZH = { hasl: '喷锡', enig: '沉金' };
/* 经济型贴片对 1.6 mm 板的颜色 / 表面处理 / 块数（facts §4.1，S04 表格） */
const ECO = { green: { hasl: '2–50', enig: '2–50' }, black: { hasl: '2–50' }, blue: { hasl: '5–30' } };
const DAM = { green: 0.10, blue: 0.10, black: 0.13 };   // 1 oz 阻焊桥（S01）

/* ================= 8.1 下单 8 步 ================= */
(function () {
  const outline = 'M' + D.board.outline.map(p => p.map(r2).join(' ')).join('L') + 'Z';
  const chip = (t, on, extra) => `<span class="p8-m-chip${on ? ' on' : ''}${extra ? ' ' + extra : ''}">${t}</span>`;
  const row = (k, v) => `<div class="p8-m-row"><span class="p8-m-k">${k}</span><span class="p8-m-v">${v}</span></div>`;
  const auto = '<i class="p8-auto">系统识别</i>';
  const lock = '<svg class="p8-lock" viewBox="0 0 16 18" aria-hidden="true"><rect x="2" y="8" width="12" height="9" rx="2"/><path d="M5 8V5.5a3 3 0 0 1 6 0V8" fill="none"/></svg>';
  const STEPS = [
    { name: '上传 Gerber', sec: 7, secT: '第 7 课：出生产文件', href: '#p7',
      mock: () => `<div class="p8-m-h">① 上传 Gerber 压缩包</div>
        <div class="p8-m-drop"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V5M7 10l5-5 5 5M5 19h14"/></svg><div><b>QB12_Gerber.zip</b><small>${zipKB} KB · ${gerbN} 个 Gerber + ${drlN} 个钻孔文件</small></div></div>
        <div class="p8-m-files">${FAB.gerbers.map(g => `<span>${g.file.replace('QB12-', '')}</span>`).join('')}</div>
        ${row('识别结果', `${auto} ${S.copper_layers} 层 · ${W} × ${H} mm`)}
        <svg class="p8-m-board" viewBox="-3 -7 74 48" aria-hidden="true"><path d="${outline}"/><text x="${W / 2}" y="-2" text-anchor="middle">${W} mm</text><text x="${W + 2.5}" y="${H / 2 + 1.3}">${H} mm</text><text class="p8-m-bl" x="${W / 2}" y="${H / 2 + 1.5}" text-anchor="middle">${S.copper_layers} 层</text></svg>`,
      why: '上传压缩包以后，系统会自己分析 Gerber，认出板子的尺寸和层数。这两项不用自己填，但要看一眼：尺寸不对，多半是板框没闭合或者多画了线。然后点 Gerber 查看器，把每一层翻一遍。',
      facts: () => [['压缩包', `QB12_Gerber.zip，${zipKB} KB`], ['里面', `${gerbN} 个 Gerber、${drlN} 个钻孔文件`], ['应该认出', `${S.copper_layers} 层，${W} × ${H} mm`]],
      warn: () => `<b>格式要对：</b>嘉立创国内站只收 RS-274-X，不收 Gerber X2。JLC 的 KiCad 8 教程没勾 X2，9 的教程勾了；国内站不收 X2，所以还是不勾。QB12 的第一版压缩包（10-13）是 kicad-cli 默认导的 X2（文件开头有 <span class="net">%TF.</span> 属性行），10-19 已关掉 X2 重新导出，图形完全不变，现在是 ${FAB.gerber_format ? FAB.gerber_format.split('（')[0] : 'RS-274X'}。你自己导出时记得取消“使用 Gerber X2 格式”（第 7 课；kicad-cli 加 <span class="net">--no-x2</span>）。` },
    { name: '板子参数', sec: 2, secT: '8.2 板子参数', href: '#p8-s2',
      mock: () => `<div class="p8-m-h">② 板子参数</div>
        ${row('层数', `${chip('1')}${chip('2', true, 'auto')}${chip('4')}${chip('6')}`)}
        ${row('尺寸', `${auto} ${W} × ${H} mm`)}
        ${row('数量', `${chip('5', true)}${chip('10')}${chip('20')}${chip('…')}`)}
        ${row('板厚', `${chip('0.8')}${chip('1.0')}${chip('1.2')}${chip('1.6', true)}${chip('2.0')}`)}
        ${row('外层铜厚', `${chip('1 oz', true)}${chip('2 oz')}`)}
        ${row('阻焊颜色', ['green', 'black', 'blue'].map(m => chip(MASK_ZH[m].replace('油', ''), PAR.mask === m)).join('') + chip('红') + chip('白') + chip('…'))}
        ${row('表面处理', `${chip('喷锡（有铅 / 无铅）', PAR.finish === 'hasl')}${chip('沉金', PAR.finish === 'enig')}${chip('OSP')}`)}
        ${row('客编', `${chip('默认位置')}${chip('指定位置', true)}`)}
        ${row('拼板款数', chip('1', true))}`,
      why: '层数和尺寸是系统认出来的，其余的选项决定板子怎么做：多厚、铜多厚、什么颜色、焊盘表面怎么处理。板厚、铜厚要和设计时的假设一致：QB12 的线宽是按 1 oz 铜算的（第 4 课）。',
      facts: () => [['数量', 'PCB 打样最少 5 块一档'], ['板厚', `${D.board.thickness} mm`], ['外层铜厚', '1 oz'], ['阻焊 / 表面处理', `${MASK_ZH[PAR.mask]} / ${FIN_ZH[PAR.finish]}（8.2 里选的）`], ['拼板款数', '1 款，如实填']] },
    { name: '打开 SMT', sec: 3, secT: '8.3 选标准型', href: '#p8-s3',
      mock: () => `<div class="p8-m-h">③ SMT 贴片</div>
        ${row('贴片', '<span class="p8-m-sw on"><i></i></span> 要贴片')}
        ${row('类型', `${chip('经济型')}${chip('标准型', true)}`)}
        ${row('贴片面', `${chip('顶面', true)}${chip('底面')}${chip('两面', false, 'off')}`)}
        ${row('贴片数量', `${chip('2', true)}${chip('5')}${chip('…')}`)}
        ${row('工艺边 / Mark 点', '<span class="p8-m-note">不用自己画，嘉立创自动加</span>')}
        ${row('确认贴片位置', `${chip('不要', true)}${chip('要')}`)}`,
      why: `打开 SMT 贴片，QB12 选<b>标准型</b>：经济型不贴 ESP32 模组 U1。贴片面只选顶面（QB12 的 ${TOPN} 个元件全在顶面），贴 2 片。标准型要工艺边，QB12 没画，下单后嘉立创自动加，拼成约 7.0 × 6.6 cm 的一块。`,
      facts: () => [['类型', '标准型（经济型不贴 U1 模组）'], ['贴片面', `顶面（${TOPN} / ${N} 个元件在顶面）`], ['贴片数量', '2 片'], ['工艺边', '嘉立创自动加，拼成约 70 × 66 mm']] },
    { name: 'BOM + 坐标', sec: 4, secT: '8.4 BOM、坐标和料号', href: '#p8-s4',
      mock: () => `<div class="p8-m-h">④ 上传 BOM 和坐标文件</div>
        <div class="p8-m-file"><b>QB12_BOM_嘉立创SMT.csv</b><small>${FAB.bom.length} 行</small></div>
        <div class="p8-m-file"><b>QB12_CPL_坐标文件.csv</b><small>${FAB.cpl.length} 行</small></div>
        <span class="p8-m-btn">处理 BOM 和坐标</span>
        <pre class="p8-m-pre">${FAB.bom_header.join(',')}\n${FAB.bom[0].join(',')}\n…\n${FAB.cpl_header.join(',')}\n${FAB.cpl[0].join(',')}\n…</pre>`,
      why: 'BOM 告诉工厂买哪些料，坐标文件告诉贴片机每个元件放在哪、转多少度。两份都传上去，点“处理 BOM 和坐标”，页面把它们合成一张表。',
      facts: () => [['BOM', `${FAB.bom.length} 行，同型号合并成一行`], ['坐标文件', `${FAB.cpl.length} 行，原点在板子左下角`], ['三个数对上', `BOM 数量合计 ${bomQty} = 坐标 ${FAB.cpl.length} 行 = 元件 ${N} 个`]] },
    { name: '核对料号', sec: 4, secT: '8.4 BOM、坐标和料号', href: '#p8-s4',
      mock: () => `<div class="p8-m-h">⑤ 元件确认</div>
        <div class="p8-m-sum">${chip(`${N} 个元件`, true)}${chip(`${KINDS.length} 种`)}${chip(`基础 ${libK('基础').length}`)}${chip(`扩展 ${libK('扩展').length}`, false, 'ext')}</div>
        ${FAB.bom.slice(0, 5).map(b => { const lib = QB.fp(b[1].split(',')[0]).lib; return `<div class="p8-m-part"><span class="p8-m-ok">✓</span><b>${b[1]}</b><span>${b[0]}</span><code>${b[4]}</code><i class="${lib === '扩展' ? 'ext' : ''}">${lib}</i></div>`; }).join('')}
        <div class="p8-m-note">…还有 ${FAB.bom.length - 5} 行。没打勾确认的不贴。</div>`,
      why: '页面给每一行配上一个立创编号，标着基础库还是扩展库、有没有货。逐行看配上的型号对不对，再打勾确认。',
      facts: () => [['料', `${KINDS.length} 种`], ['基础库', `${libK('基础').length} 种，${libN('基础')} 个元件`], ['扩展库', `${libK('扩展').length} 种，${libN('扩展')} 个元件`], ['换料费', `按种算，最多 ${libK('扩展').length} 笔`], ['没确认的', '不贴']] },
    { name: '贴片预览', sec: 5, secT: '8.5 找出转错的元件', href: '#p8-s5',
      mock: () => `<div class="p8-m-h">⑥ 贴片预览</div>
        <div class="p8-m-prev"><div>${tileSVG('U5', 0)}<small>U5：红点挨着丝印的点 ✓</small></div><div>${tileSVG('D1', 0)}<small>D1：色带对着丝印的杠 ✓</small></div></div>
        <div class="p8-m-note">放大，旋转，逐个看有方向的元件。</div>`,
      why: '预览把元件模型叠在你的板子上。逐个看有方向的元件：芯片的红点和丝印上的点在同一头、二极管的色带和丝印的杠在同一头，才算对。',
      facts: () => [['要逐个看', `${POLAR.length} 个有方向的元件`], ['转错了', '改角度，或请工程师按丝印改'], ['丝印和坐标冲突', '默认按丝印贴']] },
    { name: '自己再查一遍', sec: 6, secT: '第 6 课：DRC 与 3D', href: '#p6',
      mock: () => `<div class="p8-m-h">⑦ 付款前最后一遍</div>
        <div class="p8-m-todo"><span>✓</span>Gerber 查看器：外形、钻孔、丝印都对</div>
        <div class="p8-m-todo"><span>✓</span>DFM 在线检查（JLCDFM，免费）</div>
        <div class="p8-m-todo"><span>✓</span>元件确认表、预览截图</div>
        <div class="p8-m-todo"><span>○</span>确认生产稿 / 确认贴片位置（可选）</div>
        <div class="p8-m-stop">Claude 帮你准备订单时，做到这里停下，把截图和要你确认的地方发给你。</div>`,
      why: '付款前最后看一遍。JLC 有免费的在线 DFM 工具：上传 Gerber 压缩包，按走线、阻焊、钻孔、丝印、元件装配几块检查，问题标在图上，还能下载报告。下单时也可以选“确认生产稿”，工厂做好生产稿后让你再看一眼。',
      facts: () => [['DFM 工具', '免费，压缩包 ≤ 50 MB'], ['确认生产稿', '可选'], ['确认贴片位置', '可选，单独收一小笔费'], ['Claude 帮你时', '停在这一步']] },
    { name: '付款 · 你来点', sec: 6, secT: '8.6 钱和时间', href: '#p8-s6',
      mock: () => `<div class="p8-m-h">⑧ 提交订单</div>
        ${row('合计', '<span class="p8-m-note">金额以下单页为准</span>')}
        <div class="p8-m-pay"><span class="p8-m-btn big">${lock}提交订单并付款</span><b class="p8-m-you">这个按钮由你自己点</b><span class="p8-m-note">Claude 帮你准备订单时不会点它。</span></div>`,
      why: '这一步只有你自己做：看过参数、料号、预览，确认没问题，再付款。带贴片的订单必须先付款，不能“审核通过再付”，因为一下单就会占用元件库存。付款以后，工厂审核文件、生产、发货。',
      facts: () => [['谁来点', '你自己'], ['贴片单', '先付款，再审核'], ['只做光板', '可以选审核通过再付款'], ['QB12 实付（10-27）', 'PCB ¥73.74 + SMT ¥559.84，极性选工程师协助另加 ¥10'], ['价格', '以后以下单页为准']] }
  ];
  const rail = $('o-rail');
  rail.innerHTML = STEPS.map((s, i) => `<button class="p8-pill" data-i="${i}" aria-pressed="false"><b>${i + 1}</b>${s.name}</button>`).join('');
  let cur = 0;
  const mock = $('o-mock');
  function go(i) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i));
    const s = STEPS[cur];
    rail.querySelectorAll('.p8-pill').forEach((b, k) => { b.setAttribute('aria-pressed', String(k === cur)); b.classList.toggle('done', k < cur); });
    mock.innerHTML = s.mock();
    mock.classList.remove('p8-in'); void mock.offsetWidth; if (!RM) mock.classList.add('p8-in');
    $('o-title').textContent = `第 ${cur + 1} 步 · ${s.name}`;
    $('o-why').innerHTML = s.why;
    $('o-facts').innerHTML = states(s.facts());
    const w = $('o-warn');
    if (s.warn) { w.innerHTML = s.warn(); w.hidden = false; } else { w.hidden = true; w.innerHTML = ''; }
    const more = $('o-more'); more.href = s.href; more.textContent = `细讲：${s.secT} →`;
    $('o-lab').textContent = `${cur + 1} / ${STEPS.length}`;
    $('o-prev').disabled = cur === 0; $('o-next').disabled = cur === STEPS.length - 1;
  }
  rail.addEventListener('click', e => { const b = e.target.closest('.p8-pill'); if (b) go(+b.dataset.i); });
  $('o-prev').addEventListener('click', () => go(cur - 1));
  $('o-next').addEventListener('click', () => go(cur + 1));
  go(0);
  parHooks.push(() => { if (cur === 1) go(1); });
})();

/* ================= 8.2 板子参数 ================= */
const PB = BoardViewer.create($('pbv'), { toolbar: 'mini', panel: false, hover: true, mode: 'made', layers: [], mask: 'green', finish: 'hasl', label: 'QB12 做出来的样子，可以换阻焊颜色和表面处理' });
(function () {
  const jt = D.texts.find(t => /^JLC/.test(t.text));
  const jbox = jt ? [jt.x - jt.text.length * jt.h * 0.36 - 0.5, jt.y - jt.h * 0.75, jt.x + jt.text.length * jt.h * 0.36 + 0.5, jt.y + jt.h * 0.75].map(v => Math.round(v * 100) / 100) : null;
  function status() {
    const m = PAR.mask, f = PAR.finish, q = (ECO[m] || {})[f];
    const combo = `${MASK_ZH[m]} + ${FIN_ZH[f]}`;
    let s = q ? `<b>${combo}</b>：经济型贴片对 ${D.board.thickness} mm 板列出了这个组合，${q} 块。` :
      `<b>${combo}</b>：经济型贴片的表里没有这个组合（${MASK_ZH[m]}只列了喷锡），下单页上可能选不了。`;
    s += ` 阻焊桥：${MASK_ZH[m]}要求两个焊盘之间至少 ${DAM[m].toFixed(2)} mm 才留得住阻焊；QB12 最窄的焊盘间隙是 ${r2(minGap)} mm（${gapRef}），够。`;
    if (PAR.side === 'bottom' && jt) s += ` 框出来的是底面那行 <span class="net">${jt.text}</span>：编号的占位（字高 ${jt.h} mm）。`;
    s += ' <small>（表是从 JLC 网页上读出来的，层数那一列没显示全，以下单页为准。）</small>';
    const st = $('par-status'); st.innerHTML = s; st.className = 'status ' + (q ? 'good' : 'warn');
  }
  function apply() {
    PB.show({ mode: 'made', mask: PAR.mask, finish: PAR.finish, side: PAR.side }).clearAnnotations();
    if (PAR.side === 'bottom' && jbox) PB.annotate((g, mk) => { mk.box(jbox, ''); mk.el('text', { x: r2((jbox[0] + jbox[2]) / 2), y: r2(jbox[3] + 1.7), 'text-anchor': 'middle' }, g, '编号位置'); });
    PB.badge(`${MASK_ZH[PAR.mask]} · ${FIN_ZH[PAR.finish]} · ${PAR.side === 'top' ? '顶面' : '底面'}`);
    C.pressOne('#p8 [data-p8mask]', 'p8mask', PAR.mask);
    C.pressOne('#p8 [data-p8fin]', 'p8fin', PAR.finish);
    C.pressOne('#p8 [data-p8side]', 'p8side', PAR.side);
    status();
    parHooks.forEach(fn => fn());
  }
  document.querySelector('#p8 .p8-parbox').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p8mask) PAR.mask = b.dataset.p8mask;
    else if (b.dataset.p8fin) PAR.finish = b.dataset.p8fin;
    else if (b.dataset.p8side) PAR.side = b.dataset.p8side;
    else return;
    apply();
  });
  status();
  PB.badge('绿油 · 喷锡 · 顶面');
  const clr = D.rules.min_clearance;
  const ROWS = [
    ['层数', `${S.copper_layers} 层（系统识别）`, '顶层 + 底层两层铜。'],
    ['尺寸', `${W} × ${H} mm（系统识别）`, '从板框层算出来。和设计对不上，就是板框有问题。'],
    ['数量', '5 块', 'PCB 打样最少 5 块一档；贴几块在 SMT 那一栏另选。'],
    ['板厚', `${D.board.thickness} mm`, '最常用的标准板厚，做出来在 1.44–1.76 mm 之间都算合格。经济型贴片要求 0.8–1.6 mm，刚好在上限；QB12 走标准型，板厚不限。'],
    ['外层铜厚', '1 oz', `约 35 µm，快板默认、不加钱。第 4 课的线宽按 1 oz 算。不能随手改 2 oz：2 oz 要求线距 ≥ 0.16 mm，QB12 的最小间距是 ${clr} mm。`],
    ['阻焊颜色', '绿油（随你）', '颜色不影响电路。黑、白油的阻焊桥要求更宽；经济型贴片对某些颜色限制表面处理和块数（上面的提示）；QB12 走标准型，以下单页为准。'],
    ['表面处理', '喷锡或沉金', `两种的区别见 <a href="#p1">第 1 课</a> 1.5。QB12 最细的脚距 ${pJ1} mm（J1）、没有 BGA，两种都能做。有铅还是无铅按 RoHS 需要选；默认选哪个以下单页为准。`],
    ['客编', '指定位置：底面', `嘉立创默认在丝印层“适当位置”加一串客编，也可以下单时指定位置（收不收费以页面为准）。QB12 在底面留了位置。JLC 国际站写明 2026 年 5 月起不再提供订单号，并请大家别再在丝印上写 JLCJLCJLCJLC；在国际站下单，先把这行字删掉。`],
    ['拼板款数', '1', '一个文件里有几款不同的板，要如实填。'],
    ['确认生产稿', '第一次可以选', '工厂做好生产稿以后让你再看一眼。']
  ];
  $('par-rows').innerHTML = ROWS.map(r => `<tr><td class="p8-nw">${r[0]}</td><td class="p8-nw">${r[1]}</td><td>${r[2]}</td></tr>`).join('');
})();

/* ================= 8.3 经济型 vs 标准型（QB12 实际走标准型：经济型不贴 U1） ================= */
(function () {
  const ok = v => v === null ? '' : v ? '<b class="p8-ok">✓</b> ' : '<b class="p8-bad">✗</b> ';
  const th = D.board.thickness;
  const ROWS = [
    ['贴片面', `${TOPN} 个元件全在顶面`, ['只能贴一面', TOPN === N], ['一面或两面', true]],
    ['层数', `${S.copper_layers} 层`, ['2、4、6 层', [2, 4, 6].includes(S.copper_layers)], ['1–32 层', true]],
    ['板厚', `${th} mm`, ['0.8–1.6 mm', th >= 0.8 && th <= 1.6], ['不限', true]],
    ['ESP32 模组 U1', 'ESP32-S3-WROOM-1', ['不贴这个模组', false], ['能贴', true]],
    ['单板尺寸', `${W} × ${H} mm`, ['≥ 10 × 10 mm', W >= 10 && H >= 10], ['单板 ≥ 70 × 70 mm；小板由嘉立创加工艺边拼大', true]],
    ['最小阻容', smallest, ['0402 起', SIZES.indexOf(smallest) >= SIZES.indexOf('0402')], ['01005 起', true]],
    ['最细脚距', `${pJ1} mm（J1），${pU2} mm（U2）`, ['≥ 0.4 mm', finest >= 0.4], ['≥ 0.35 mm', finest >= 0.35]],
    ['工艺边、Mark 点', 'QB12 没画，嘉立创自动加', ['不需要', true], ['需要（嘉立创可代加）', true]],
    ['贴片要几天', '—', ['1–3 天', null], ['≥ 4 天', null]],
    ['锡膏检测（SPI）', '—', ['无', null], ['有', null]]
  ];
  $('smt-rows').innerHTML = ROWS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${ok(r[2][1])}${r[2][0]}</td><td>${ok(r[3][1])}${r[3][0]}</td></tr>`).join('');
  $('smt-warn').innerHTML = '<b>QB12 的实际下单：</b>标准型、只贴顶面、贴 2 片，嘉立创自动加工艺边，拼成约 7.0 × 6.6 cm（这个尺寸比表里写的“单板 70 × 70”略小，所以最小尺寸以下单页为准）。<br><b>几处官方写法对不上，以下单页为准：</b>经济型能贴几块（2–50 块 / 30 块以上要拼板 / “≤30（50）”）；经济型有没有 AOI 光学检测（英文站写有，中文站写无）；贴片要几天（1–3 天 / 九成订单 24 小时内）。';

  /* 同比例的尺寸图 */
  const svg = $('pan');
  const outline = (dx, dy) => 'M' + D.board.outline.map(p => r2(p[0] + dx) + ' ' + r2(p[1] + dy)).join('L') + 'Z';
  const MODES = {
    eco: `经济型：单板最小 10 × 10 mm，QB12 的 ${W} × ${H} mm 直接就能贴。`,
    std1: `标准型：单板最小 70 × 70 mm，QB12 太小，单板贴不了。`,
    auto: `标准型的办法：QB12 没画工艺边和 Mark 点，下单后嘉立创自动加，拼成约 70 × 66 mm 的一块（外框按 10-27 订单的约 7.0 × 6.6 cm 画；工艺边、Mark 点、板子怎么摆都以他们的生产稿为准，图里只画外框，QB12 单板只是同比例对照）。`
  };
  function draw(m) {
    svg.innerHTML = '';
    if (m === 'auto') {
      C.el('rect', { x: 0, y: 0, width: 70, height: 66, class: 'p8-rail' }, svg);
      C.el('path', { d: outline((70 - W) / 2, (66 - H) / 2), class: 'p8-pb' }, svg);
      C.el('text', { x: 35, y: -3.5, 'text-anchor': 'middle', class: 'p8-t' }, svg, '嘉立创加工艺边后约 70 × 66 mm（示意外框）');
      C.el('text', { x: 35, y: 33 + 1.8, 'text-anchor': 'middle', class: 'p8-t on' }, svg, `QB12 ${W} × ${H}（对照）`);
      C.el('text', { x: 35, y: 66 + 5, 'text-anchor': 'middle', class: 'p8-t sm' }, svg, '工艺边、Mark 点、摆法以生产稿为准');
    } else {
      const std = m === 'std1';
      C.el('rect', { x: 0, y: 0, width: std ? 70 : 10, height: std ? 70 : 10, class: 'p8-min' + (std ? ' bad' : ' good') }, svg);
      C.el('path', { d: outline(0, 0), class: 'p8-pb' + (std ? ' small' : '') }, svg);
      C.el('text', { x: W / 2, y: H / 2 + 1.8, 'text-anchor': 'middle', class: 'p8-t on' }, svg, `QB12 ${W} × ${H}`);
      C.el('text', { x: std ? 2 : 0, y: std ? 66 : 45, class: 'p8-t mu' }, svg, std ? '标准型单板最小 70 × 70' : '虚线小方块：经济型最小 10 × 10');
      C.el('text', { x: 0, y: -3.5, class: 'p8-t ' + (std ? 'bad' : 'good') }, svg, std ? '✗ 太小，单板贴不了' : '✓ 单板直接贴');
    }
    $('pan-cap').textContent = MODES[m] + '（图里所有尺寸同一比例）';
    C.pressOne('#p8 [data-p8pan]', 'p8pan', m);
  }
  document.querySelector('#p8-s3').addEventListener('click', e => { const b = e.target.closest('[data-p8pan]'); if (b) draw(b.dataset.p8pan); });
  draw('eco');
})();

/* ================= 8.4 BOM 和料号 ================= */
const BB = BoardViewer.create($('bbv'), { toolbar: 'mini', panel: false, hover: true, mode: 'layers', layers: ['F.Cu', 'Edge.Cuts', 'Courtyard', 'Labels'], tracks: false, label: 'QB12 顶面：BOM 里选中的元件会亮起来' });
(function () {
  $('bom-ro').innerHTML = [
    ['元件', N, `个，${TOPN === N ? '全在顶面' : `顶面 ${TOPN} 个`}`],
    ['料', KINDS.length, `种（BOM ${FAB.bom.length} 行）`],
    ['基础库', `${libK('基础').length} 种`, `${libN('基础')} 个元件，不收换料费`],
    ['扩展库', `${libK('扩展').length} 种`, `${libN('扩展')} 个元件，每种一笔换料费（优选扩展在经济型里免，QB12 走标准型，以下单页为准）`]
  ].map(([k, v, s]) => `<div class="ro"><small>${k}</small><b>${v}</b><small>${s}</small></div>`).join('');
  $('n51').textContent = N;
  $('npolar').textContent = POLAR.length;
  const holeDesc = f => { const a = f.pads.filter(p => p.t === 'pth').length, b = f.pads.filter(p => p.t === 'npth').length; return `${f.ref}（${[a ? a + ' 个金属化孔' : '', b ? b + ' 个非金属化孔' : ''].filter(Boolean).join('、')}）`; };
  $('th-txt').innerHTML = `<strong>导坐标文件时别勾错过滤选项。</strong>KiCad 的“生成布置文件”对话框（<span class="menu">文件 → 制造输出 → 元件定位文件 (.pos, .gbr)...</span>）里，勾“仅包含贴片封装”会漏掉 ${smdOnlyDrop.join('、')}（它的封装属性标的是通孔，其实是贴片脚加定位孔）；勾“排除具有通孔焊盘的所有封装”会漏掉 ${thDrop.map(holeDesc).join('、')}。漏掉的元件不在坐标文件里，就不会贴。QB12 两个都没勾，坐标文件 ${FAB.cpl.length} 行，一个不少（第 7 课）。`;
  const rows = FAB.bom.map(b => {
    const refs = b[1].split(',').map(s => s.trim());
    const f = QB.fp(refs[0]);
    return { b, refs, lib: f.lib, polar: refs.some(r => POLAR.includes(r)) };
  });
  const tb = $('bom-rows');
  tb.innerHTML = rows.map((r, i) => `<tr data-i="${i}" tabindex="0" class="${r.lib === '扩展' ? 'ext' : ''}"><td>${r.refs.join(', ')}</td><td>${r.b[0]}</td><td>${r.b[2]}</td><td><code>${r.b[4]}</code></td><td><span class="p8-lib ${r.lib === '扩展' ? 'ext' : ''}">${r.lib}</span></td></tr>`).join('');
  let filt = 'all';
  const visible = () => rows.filter(r => filt === 'all' || (filt === 'polar' ? r.polar : r.lib === filt));
  function applyFilter(f) {
    filt = f;
    C.pressOne('#p8 [data-p8f]', 'p8f', f);
    tb.querySelectorAll('tr').forEach(tr => { const r = rows[+tr.dataset.i]; tr.hidden = !(filt === 'all' || (filt === 'polar' ? r.polar : r.lib === filt)); tr.classList.remove('on'); });
    BB.clear().reset();
    if (f !== 'all') BB.highlightParts(visible().flatMap(r => r.refs));
    BB.badge(f === 'all' ? `${FAB.bom.length} 行 · ${N} 个元件` : `${visible().length} 行 · ${visible().reduce((a, r) => a + r.refs.length, 0)} 个元件`);
  }
  function pick(i) {
    const r = rows[i];
    tb.querySelectorAll('tr').forEach(tr => tr.classList.toggle('on', +tr.dataset.i === i));
    BB.clear().highlightParts(r.refs).focus(r.refs, { pad: r.refs.length > 1 ? 3 : 5 });
    BB.badge(`${r.refs.join(', ')} · ${r.b[4]} · ${r.lib}库`);
  }
  tb.addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) pick(+tr.dataset.i); });
  tb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const tr = e.target.closest('tr'); if (tr) { e.preventDefault(); pick(+tr.dataset.i); } } });
  document.querySelector('#p8 .p8-bombox .ctrls').addEventListener('click', e => { const b = e.target.closest('[data-p8f]'); if (b) applyFilter(b.dataset.p8f); });
  BB.badge(`${FAB.bom.length} 行 · ${N} 个元件`);
})();

/* ================= 8.5 找出转错的元件 ================= */
const GAME = ['LED1', 'D1', 'Q1', 'U3', 'U4', 'U5'];
const gameApi = (function () {
  const box = $('tiles');
  let errs = [], picked = [], checked = false;
  const DESC = { LED1: '红色 LED · 0603', D1: '二极管 SS34 · SMA', Q1: 'P-MOS · SOT-23', U3: '3.3V 稳压 · SOT-23-5', U4: 'TP4056 · ESOP-8', U5: 'USB 保护 · SOT-23-6' };
  function render() {
    box.innerHTML = GAME.map((ref, i) => {
      const f = QB.fp(ref);
      return `<button class="p8-tile" data-i="${i}" aria-pressed="${picked[i]}" aria-label="${ref}，${DESC[ref] || f.value}">${tileSVG(ref, errs[i])}<span class="p8-tcap"><b>${ref}</b>${DESC[ref] || f.value} · ${((f.rot % 360) + 360) % 360}°</span><span class="p8-tverd"></span></button>`;
    }).join('');
  }
  function start(preset) {
    checked = false;
    if (preset) errs = GAME.map(r => preset[r] || 0);
    else {
      const sym = GAME.filter(r => geo(r).sym), asym = GAME.filter(r => !geo(r).sym);
      const sh = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
      const wrong = new Map();
      const s = sh(sym), a = sh(asym);
      wrong.set(s[0], 180);                                     // 至少一个对称的转了 180°
      if (Math.random() < 0.6) wrong.set(s[1], 180);
      wrong.set(a[0], [90, 180, 270][Math.floor(Math.random() * 3)]);
      errs = GAME.map(r => wrong.get(r) || 0);
    }
    picked = GAME.map(() => false);
    render();
    $('g-lab').textContent = `转错的有 ${errs.filter(Boolean).length} 个`;
    const st = $('g-status'); st.className = 'status'; st.textContent = '点格子选中你觉得转错的，再点一次取消。';
    box.classList.remove('checked');
  }
  box.addEventListener('click', e => {
    const t = e.target.closest('.p8-tile'); if (!t || checked) return;
    const i = +t.dataset.i; picked[i] = !picked[i]; t.setAttribute('aria-pressed', String(picked[i]));
  });
  $('g-check').addEventListener('click', () => {
    checked = true; box.classList.add('checked');
    let hit = 0, fa = 0, miss = [];
    box.querySelectorAll('.p8-tile').forEach((t, i) => {
      const wrong = !!errs[i], right = wrong === picked[i];
      if (wrong && picked[i]) hit++; if (!wrong && picked[i]) fa++; if (wrong && !picked[i]) miss.push(GAME[i]);
      t.classList.toggle('wrong', wrong); t.classList.toggle('right', !wrong);
      t.classList.toggle('miss', !right);
      t.querySelector('.p8-tverd').textContent = verdict(GAME[i], errs[i]);
    });
    const n = errs.filter(Boolean).length;
    const st = $('g-status');
    const subtle = miss.filter(r => geo(r).sym);
    st.className = 'status ' + (hit === n && !fa ? 'good' : 'warn');
    st.innerHTML = `找对 ${hit} / ${n} 个转错的${fa ? `，多选了 ${fa} 个其实没错的` : ''}。` +
      (subtle.length ? ` 漏掉的 ${subtle.join('、')} 是对称封装：脚都在焊盘上，只能看标记。` : hit === n && !fa ? ' 全对。真下单时也这样一个个看。' : '');
  });
  $('g-new').addEventListener('click', () => start());
  start({ LED1: 180, U3: 180, U5: 180 });
  return { start };
})();

/* ================= 8.6 钱、时间、寄来的东西 ================= */
(function () {
  const extK = libK('扩展').length;
  const fix = ['工程费', '钢网（不随货发）', `换料费：扩展库 ${extK} 种，每种一笔（优选扩展在经济型里免；QB12 走标准型，以下单页为准）`, '确认贴片位置（可选）', '运费（按地址和快递方式）', '只有标准型才有：治具、手续费（QB12 走标准型，要付）'];
  $('cost-fix').innerHTML = fix.map(t => `<li>${t}</li>`).join('');
  const sl = $('qty');
  function upd() {
    const q = +sl.value;
    $('qty-v').textContent = q;
    $('cost-var').innerHTML = [
      `PCB 板费：按块数和面积（${W} × ${H} mm）`,
      `焊点费：每块 ${S.smd_pads} 个贴片焊盘，${q} 块共 <b>${S.smd_pads * q}</b> 个（怎么数以报价为准）`,
      `元件费：每块 ${N} 个元件，${q} 块共 <b>${N * q}</b> 个；有的料有最小用量和损耗备料`,
      '手工焊人工费：有需要手焊的件才有'
    ].map(t => `<li>${t}</li>`).join('');
  }
  sl.addEventListener('input', upd); upd();
  const TL = [['付款', '你自己点'], ['PCB 生产', '1–2 天左右'], ['SMT 贴片', '1–3 天左右'], ['发货', ''], ['物流', '国际站参考：DHL 约 3–5 天，平邮约 15–25 天；国内站看快递选项']];
  $('tl').innerHTML = TL.map(([a, b], i) => `<li style="--i:${i}"><b>${a}</b>${b ? `<span>${b}</span>` : ''}</li>`).join('');
  $('bare').textContent = `${S.smd_pads} 个贴片焊盘要自己焊，最细的是 J1 的 ${pJ1} mm 和 U2 的 ${pU2} mm 脚距`;
  $('n51b').textContent = N;
  const conn = ['J2', 'J3', 'J4'].map(r => QB.fp(r));
  $('pack-yes').textContent = `贴好 ${N} 个元件的板子：元件全在顶面，USB-C 口、拨动开关、两个按键、三个插座都焊好了。`;
  $('pack-diy').innerHTML = `3 根 PH2.0 两芯插头线：板上的 ${conn.map(f => f.ref).join('、')} 是插座（${conn[0].value}），配对的插头不在 BOM 里；1 节<strong>带保护板</strong>的 1S 锂电池（PH2.0 插头）：板上只有充电芯片，没有过放、短路保护，这些全靠电池自带的保护板（QB12_BOM.xlsx 的备注里也写了）；插头的正负要和背面丝印的 + − 对上，板上<strong>没有防反接</strong>，插反了电压直接加在 TP4056 的 BAT 脚上，可能把它烧掉；2 个电机，每个电机两端焊一颗 <strong>0.1 µF 瓷片电容</strong>（不在 BOM 里，电路课第 8 课）；一根能传数据的 USB-C 线；固件（电路课第 9 课）。`;

  /* 插头示意图：板子轮廓、元件外框、三个插座的位置都来自设计文件 */
  const svg = $('plug'), OX = 40, OY = 2;
  C.el('path', { d: 'M' + D.board.outline.map(p => r2(p[0] + OX) + ' ' + r2(p[1] + OY)).join('L') + 'Z', class: 'p8-pcb' }, svg);
  FPS.forEach(f => {
    const [x0, y0, x1, y1] = f.bbox;
    const isJ = /^J[234]$/.test(f.ref);
    C.el('rect', { x: r2(Math.max(x0, 0) + OX), y: r2(Math.max(y0, 0) + OY), width: r2(Math.min(x1, W) - Math.max(x0, 0)), height: r2(Math.min(y1, H) - Math.max(y0, 0)), rx: 0.3, class: isJ ? 'p8-sock' : f.ref === 'U1' ? 'p8-mod' : 'p8-part' }, svg);
  });
  C.el('text', { x: OX + 44, y: OY + 29.6, 'text-anchor': 'middle', class: 'p8-t2 on' }, svg, 'QB12 顶面');
  const LBL = { J3: '左电机', J4: '右电机', J2: '电池' };
  conn.forEach(f => {
    const pins = f.pads.filter(p => p.n === '1' || p.n === '2').sort((a, b) => a.y - b.y);
    const cy = (f.bbox[1] + f.bbox[3]) / 2 + OY;
    const isBat = f.ref === 'J2';
    const ix = isBat ? 30 : 27.4;                     // 线的另一头（电池 / 电机）
    C.el('rect', { x: OX - 4.2, y: r2(cy - 2.4), width: 4.6, height: 4.8, rx: 0.5, class: 'p8-plugh' }, svg);
    pins.forEach((p, k) => {
      const y = r2(p.y + OY), ey = r2(cy + (k ? 1.1 : -1.1));
      const col = isBat ? (p.n === '1' ? 'p8-wr' : 'p8-wb') : (k ? 'p8-wb2' : 'p8-wr2');
      C.el('path', { d: `M${OX - 4.2} ${y} C ${OX - 7} ${y}, ${ix + 2.5} ${ey}, ${ix} ${ey}`, class: 'p8-wire ' + col }, svg);
    });
    if (isBat) {
      const p1 = pins.find(p => p.n === '1'), p2 = pins.find(p => p.n === '2');
      C.el('rect', { x: 18, y: r2(cy - 4), width: 12, height: 8, rx: 1.2, class: 'p8-bat' }, svg);
      C.el('text', { x: 24, y: r2(cy + 1.1), 'text-anchor': 'middle', class: 'p8-t2' }, svg, '1S');
      const up = Math.min(p1.y, p2.y) + OY - 2.6, dn = Math.max(p1.y, p2.y) + OY + 3.9, p1Up = p1.y < p2.y;
      C.el('text', { x: OX - 1.9, y: r2(p1Up ? up : dn), 'text-anchor': 'middle', class: 'p8-t2 pm' }, svg, '+');
      C.el('text', { x: OX - 1.9, y: r2(p1Up ? dn : up), 'text-anchor': 'middle', class: 'p8-t2 pm' }, svg, '−');
    } else {
      C.el('circle', { cx: 24, cy: r2(cy), r: 3.3, class: 'p8-mot' }, svg);
      C.el('circle', { cx: 24, cy: r2(cy), r: 0.9, class: 'p8-motc' }, svg);
    }
    C.el('text', { x: 0.5, y: r2(cy + 1.1), class: 'p8-t2' }, svg, `${LBL[f.ref]} ${f.ref}`);
  });
  const j1 = QB.fp('J1');
  const ux = (j1.bbox[0] + j1.bbox[2]) / 2 + OX, uy = j1.bbox[3] + OY;
  C.el('rect', { x: r2(ux - 2.6), y: r2(uy - 0.6), width: 5.2, height: 4, rx: 0.8, class: 'p8-plugh' }, svg);
  C.el('path', { d: `M${r2(ux)} ${r2(uy + 3.4)} V 51`, class: 'p8-wire p8-usb' }, svg);
  C.el('text', { x: r2(ux - 3.6), y: 49.5, 'text-anchor': 'end', class: 'p8-t2 mu' }, svg, 'USB-C 数据线');
})();

/* ================= 8.7 到货检查 + 表笔放哪 ================= */
const TB = BoardViewer.create($('tbv'), { toolbar: 'mini', panel: false, hover: true, mode: 'made', layers: [], mask: 'green', finish: 'hasl', label: 'QB12 板子：标出量电阻时红、黑表笔放在哪' });
const PROBES = ['VBUS', 'VSYS', '3V3', 'BAT+'].map(n => {
  const cap = probeCap(n), ni = QB.netIndex(n), gi = QB.netIndex('GND');
  return { n, cap, red: cap.pads.find(p => p.net === ni), blk: cap.pads.find(p => p.net === gi), paths: netPaths(n) };
});
const probeApi = (function () {
  $('probe-btns').innerHTML = PROBES.map(p => `<button class="btn" data-p8pr="${p.n}" aria-pressed="false">${p.n} 对 GND</button>`).join('');
  function show(n) {
    const P = PROBES.find(p => p.n === n); if (!P) return;
    C.pressOne('#p8 [data-p8pr]', 'p8pr', n);
    TB.clear().clearAnnotations();
    TB.highlightNet(n);
    const c = P.cap, cx = (c.bbox[0] + c.bbox[2]) / 2, cy = (c.bbox[1] + c.bbox[3]) / 2;
    const VW = 22;                                       // 视野宽 22 mm
    TB.focus([cx - VW / 2, cy - VW / 3, cx + VW / 2, cy + VW / 3], { pad: 0, animate: false });
    const ppm = (TB.stage.clientWidth || 600) / TB.vb[2];   // 每毫米多少像素：标注字号按屏幕像素算
    const fs = Math.max(0.4, Math.min(1.4, 14 / ppm)), mr = Math.max(0.45, Math.min(1.1, 12 / ppm));
    TB.annotate((g, mk) => {
      const vert = Math.abs(P.red.x - P.blk.x) < 0.05;
      [[P.red, 'red', `红笔 ${n}`], [P.blk, 'blk', '黑笔 GND']].forEach(([p, k, t]) => {
        mk.el('circle', { cx: p.x, cy: p.y, r: r2(mr), class: 'p8-pm ' + k, style: `stroke-width:${r2(mr * 0.28)}px` }, g);
        mk.el('circle', { cx: p.x, cy: p.y, r: r2(mr * 0.3), class: 'p8-pc ' + k }, g);
        const other = k === 'red' ? P.blk : P.red;
        let tx, ty, anc;
        if (vert) { tx = p.x + mr * 1.5; ty = p.y + (p.y > other.y ? fs * 0.9 : -fs * 0.15); anc = 'start'; }
        else { const left = p.x < other.x; tx = p.x + (left ? -mr * 1.3 : mr * 1.3); ty = p.y - mr * 1.35; anc = left ? 'end' : 'start'; }
        mk.el('text', { x: r2(tx), y: r2(ty), 'text-anchor': anc, class: 'p8-pt ' + k, style: `font-size:${r2(fs)}px;stroke-width:${r2(fs * 0.24)}px` }, g, t);
      });
    });
    TB.badge(`${n} 对 GND · 表笔放在 ${c.ref} 两端`);
    $('pr-title').textContent = `量 ${n} 对 GND（不通电）`;
    const sw = P.paths.sw;
    const slide = sw.filter(([, k]) => k.kind !== 'sw'), btn = sw.filter(([, k]) => k.kind === 'sw');
    $('pr-facts').innerHTML = states([
      ['红笔', `${c.ref} 接 ${n} 的那一端`],
      ['黑笔', `${c.ref} 的另一端（GND），或者 USB-C 外壳`],
      ['万用表', '电阻档（或蜂鸣档）'],
      ...(slide.length ? [['先做', `${slide.map(([, k]) => k.ref).join('、')} 拨到 OFF`]] : []),
      ...(btn.length ? [['别碰', btn.map(([, k]) => `${k.ref}（${k.desc.replace(' 按键', '')}）`).join('、')]] : [])
    ]);
    const nn = QB.net(n);
    const refs = uniq(nn.pads.map(p => p.split('.')[0])).sort(natural);
    $('pr-net').innerHTML = `${net(n)} 连着 ${refs.length} 个元件、${nn.pads.length} 个焊盘（查看器里亮着的）：${refs.join('、')}。这些焊盘上任何一个都能当红笔的落点。`;
    const pa = P.paths;
    let calc = '<b>从网表算：</b>';
    const parts = pa.direct.map(f => `${f.ref} ${f.value}（${dsc(f)}）`).concat(pa.series.map(([a, b, x]) => `${a.ref} + ${b.ref} = ${fmtR(parseR(a.value) + parseR(b.value))}（经 ${x}）`));
    if (parts.length) calc += `${n} 和 GND 之间直接有电阻：${parts.join('；')}。并起来约 <b>${fmtR(pa.req)}</b>，所以读数<strong>不会高于这个数</strong>（芯片内部的通路没算，实测可能更低）。`;
    else calc += `没有电阻从 ${n} 直接通到地，最后停在多少要看芯片内部，不同的表读数不同。`;
    calc += ` 对地电容一共 ${fmtC(pa.ctot)}（${pa.caps.map(f => f.ref).join('、')}）：表笔刚接上时读数会从小往上爬，电容越大爬得越慢。`;
    slide.forEach(([a, k]) => { calc += ` <b>${k.ref} 拨到 ON 时</b>，${a.ref} ${a.value}（${dsc(a)}）经开关接到地，读数会停在 ${fmtR(parseR(a.value))} 左右，看着像漏电，所以先拨到 OFF。`; });
    if (btn.length) calc += ` 按着 ${btn.map(([a, k]) => `${k.desc.replace(' 按键', '')}（${k.ref}）时 ${a.ref} ${a.value} 会接到地`).join('；按着 ')}，量的时候别碰按键。`;
    $('pr-calc').innerHTML = calc;
    const ok = $('pr-ok'); ok.className = 'status good';
    ok.innerHTML = '<b>正常：</b>读数从小往上爬，不会一直停在几欧以下。<b>短路：</b>几欧以下不动、蜂鸣档长响，先别通电，看下面的“出了问题怎么办”。几块板子量同一处，读数应该差不多。';
  }
  document.querySelector('#p8 .p8-probebox .ctrls').addEventListener('click', e => { const b = e.target.closest('[data-p8pr]'); if (b) show1(b.dataset.p8pr); });
  let shown = false;
  const show1 = n => { shown = true; show(n); };
  C.onVisible(document.querySelector('#p8 .p8-probebox'), () => { if (!shown) show1('VBUS'); }, '300px');
  return { show: show1 };
})();

/* 上电清单（勾选存在本机浏览器里） */
(function () {
  const KEY = 'qb12pcb-p8-checklist';
  const ITEMS = [
    { t: '看：缺件、连锡、转错', d: `不通电。对照 8.4 的 BOM 和 3D 图一块块看，最好用放大镜或手机微距。重点：J1 的 ${pJ1} mm 细脚、U2 的 ${pU2} mm 细脚有没有连锡；LED、D1 和各个芯片的方向标记对不对（8.5）；USB-C 口的外壳脚焊牢没有；三个插座开口朝板边。` },
    { t: '量 VBUS 对 GND', probe: 'VBUS', d: '不通电。万用表电阻档，红笔接电源那一端，黑笔接地。' },
    { t: '量 VSYS 对 GND', probe: 'VSYS', d: '不通电。电容最多的一路，读数爬得最慢，等几秒再看。' },
    { t: '量 3V3 对 GND', probe: '3V3', d: '不通电。量的时候别碰 BOOT、RESET 两个按键。' },
    { t: '量 BAT+ 对 GND', probe: 'BAT+', d: '不通电，SW1 先拨到 OFF。' },
    { t: '只插 USB，第一次通电', d: '不接电池、不接电机。有 USB 电流表就串上，有可调电源就先把限流调低。插上后电流应该很快稳定在一个小数；一直顶在很高、或者有元件烫手，马上拔掉。各路电压应该是多少：电路课第 9 课上电清单第 3 步。' },
    { t: '电脑认板，烧一个闪灯程序', d: '电路课第 9 课上电清单第 4、5 步。LED3 由程序控制，烧程序之前不亮不算故障。' },
    { t: '接电池', d: '电池必须带保护板：板上没有过放、短路保护。板上也没有防反接，插反了，电压直接加在 TP4056 的 BAT 脚上（手册允许最低只到 −0.3 V），可能烧掉它。所以先看清电池插头：不同卖家的 PH2.0 电池线红黑顺序不统一，红线要对着背面丝印的 +（J2 的 1 号脚），拿不准就用万用表量插头。SW1 拨 OFF 插上，再拨 ON。之后照电路课第 9 课第 6–8 步。' },
    { t: '接电机（先别装桨）', d: '<strong>先拔掉 USB，只用电池。</strong>固件检测到插着 USB 会禁用电机：USB 这一路的走线扛不住电机电流（评审里算过，插着 USB 开电机，VBUS 最坏约 1.9 A），所以插着 USB 电机不会转，别当成故障，也别想着绕过去。每个电机两端先焊好一颗 0.1 µF 瓷片电容（不在 BOM 里），不然一加速板子可能重启。然后照电路课第 9 课第 9 步。转向反了，在程序里改，或者把这个电机的插头线对调。' },
    { t: '连手柄，水盆试航', d: '电路课第 9 课第 10、11 步。没有手柄、或者手柄连不上时，固件还有手机模式：长按板上 BOOT 键（SW2）1.5 秒，LED 快闪后重启，开机 LED 闪 2 下就是手机模式；手机连船开出来的 Wi‑Fi 热点（QB12-XXXX），浏览器打开 192.168.4.1，网页上一个摇杆。再长按 1.5 秒切回手柄模式。' }
  ];
  const list = $('clist');
  list.innerHTML = ITEMS.map((it, i) => `<li><label><input type="checkbox" data-i="${i}" aria-label="第 ${i + 1} 步完成：${it.t}"><span class="p8-cn">${i + 1}</span><b>${it.t}</b></label><p>${it.d}${it.probe ? ` <button class="show" data-p8cp="${it.probe}">在板上标出表笔位置</button>` : ''}</p></li>`).join('');
  const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { saved = []; }
  if (!Array.isArray(saved)) saved = [];
  boxes.forEach((b, i) => { b.checked = !!saved[i]; });
  function prog(save) {
    const n = boxes.filter(b => b.checked).length;
    $('c-prog').textContent = `已完成 ${n} / ${boxes.length}`;
    $('c-bar').style.width = (n / boxes.length * 100).toFixed(1) + '%';
    boxes.forEach(b => b.closest('li').classList.toggle('done', b.checked));
    if (save) { try { localStorage.setItem(KEY, JSON.stringify(boxes.map(b => b.checked))); } catch (e) { /* 浏览器不让存就算了 */ } }
  }
  list.addEventListener('change', () => prog(true));
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-p8cp]'); if (!b) return;
    probeApi.show(b.dataset.p8cp);
    scrollTo(document.querySelector('#p8 .p8-probebox'));
  });
  $('c-reset').addEventListener('click', () => { boxes.forEach(b => { b.checked = false; }); prog(true); });
  prog(false);
})();

/* 出了问题怎么办 */
(function () {
  const FIX = {
    short: `<p><b>先别通电。</b>先确认不是表笔同时碰到了两个焊盘。</p><ol>
      <li>上面“表笔放哪”会把这个网络上的元件都亮出来。拿放大镜一个个看，细脚最容易连锡：J1（${pJ1} mm）、U2（${pU2} mm）、U3 和 U5（${pU3} mm）。</li>
      <li>手上有几块板，就量同一处对比：只有一块读数不对，问题就在那一块上。</li>
      <li>还是找不到：用可调电源，电压调到不超过这个网络平时的电压、限流调低，接上去以后摸哪颗元件先热，短路点多半就在它下面。</li>
      <li>看着像工厂焊的问题（连锡、贴歪），先拍清楚照片再动烙铁。连锡用烙铁加助焊剂拖开。</li></ol>`,
    missing: `<ol><li>对照 8.4 的 BOM 表，找出是哪个位号、什么料。</li>
      <li>回下单页的元件确认表看：没打勾确认的元件不会贴，哪怕 BOM 里有。</li>
      <li>0603、0805 的阻容自己补焊不难：镊子夹住，烙铁先焊一头，再焊另一头。芯片和细脚的件用热风枪更稳。</li></ol>`,
    rot: `<ol><li>对照 8.5：红点（或色带）和丝印上的点（或杠）不在同一头，就是转了。</li>
      <li>后果看是哪个件：LED 反了不亮；D1 反了，USB 的电进不了 VSYS；芯片转 180° 每个脚都接错，通电可能烧掉它。所以<strong>先别通电，先改</strong>。</li>
      <li>两个脚的件拆下来掉个头再焊；芯片用热风枪拆下来重新焊。</li>
      <li>下次下单前在预览里逐个核对；丝印的极性标记画清楚，工厂对不上时按丝印贴。</li></ol>`,
    volt: `<p>电路课第 9 课上电清单的每一步都有一列“不对时先查”，按那一列查。板子这一侧先确认两件事：</p><ol>
      <li>表笔放对了地方：用上面的“表笔放哪”核对。</li>
      <li>这一路上元件的方向对：VSYS 不对先看 D1、Q1、Q2；3V3 不对先看 U3。</li></ol>`
  };
  const box = $('fix');
  function show(k) { box.innerHTML = FIX[k]; C.pressOne('#p8 [data-p8fix]', 'p8fix', k); }
  document.querySelector('#p8 .p8-fixbox .ctrls').addEventListener('click', e => { const b = e.target.closest('[data-p8fix]'); if (b) show(b.dataset.p8fix); });
  show('short');
})();

/* ================= 8.8 自测 + 回顾 ================= */
(function () {
  $('q1').innerHTML = `最关键的一条：经济型不贴 ESP32 模组 U1。要么用经济型、自己手焊 U1（它底部有焊盘，要用热风枪），要么选标准型让工厂一起贴好，QB12 选了后者。标准型的门槛是工艺边和 Mark 点，板子 ${W} × ${H} mm 比单板最小 70 × 70 mm 小，QB12 没画，这一项由嘉立创自动加，拼成约 7.0 × 6.6 cm。其余几项经济型其实都够得着：${TOPN} 个元件全在顶面，只贴顶面就行；${S.copper_layers} 层、${D.board.thickness} mm 板厚；最小的阻容是 ${smallest}，最细的脚距 ${pJ1} mm。代价是费用里多出治具这些标准型才有的项。QB12 这一单：贴 2 片，PCB ¥73.74 + SMT ¥559.84，极性选工程师协助另加 ¥10。`;
  const L = geo('U4').land(180).filter(x => x.q && x.q.net !== x.l.net && PIN_KEY.test(x.l.name));
  $('q2').innerHTML = `TP4056 是左右对称的 8 脚封装，转 180° 以后每个脚都还落在焊盘上，焊出来整整齐齐，看外观发现不了。可每个脚都接错了网络：${L.map(x => `${x.l.name} 脚（${x.l.n}）落在了 ${net(x.q.net)} 上`).join('，')}，通电可能把它烧掉。发现它只能靠预览里的红点：红点和丝印上的点不在同一头。工厂遇到丝印和坐标文件冲突时按丝印贴，所以丝印的 1 脚标记一定要画清楚。`;
  const bat = PROBES.find(p => p.n === 'BAT+'), sl = bat.paths.sw.find(([, k]) => k.kind !== 'sw');
  $('q3').innerHTML = `四处，都是不通电、量电阻：${PROBES.map(p => `${net(p.n)} 对 GND（${p.cap.ref} 两端）`).join('、')}。` +
    (sl ? `SW1 拨到 ON 时，${sl[0].ref} ${sl[0].value}（${dsc(sl[0])}）经开关接到地，BAT+ 对地会读到 ${fmtR(parseR(sl[0].value))} 左右，看着像漏电；拨到 OFF 这条路就断了，读到的才是 BAT+ 本身。` : '');
  document.querySelectorAll('#p8 [data-p8q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p8q;
    if (q === '1') scrollTo($('s3').querySelector('.tbl'));
    else if (q === '2') { gameApi.start({ U4: 180, Q1: 90 }); scrollTo(document.querySelector('#p8 .p8-gamebox')); }
    else { probeApi.show('BAT+'); scrollTo(document.querySelector('#p8 .p8-probebox')); }
  }));
  const REC = [
    [0, '全景', '九步：原理图 → 封装 → 布局 → 走线 → 铺铜 → DRC → 生产文件 → 下单 → 到货。'],
    [1, 'PCB 是什么做的', `${S.copper_layers} 层铜、整板 ${S.thickness} mm 厚：中间是 FR-4 基材，外面是阻焊和丝印。`],
    [2, '封装：从符号到焊盘', `${N} 个封装、${S.pads} 个焊盘，每个元件配一个立创编号。`],
    [3, '板框与布局', `${W} × ${H} mm；接口靠边，天线靠角，电容贴着芯片。`],
    [4, '走线', `${S.tracks} 段线，${minW}–${maxW} mm，电流越大线越粗。`],
    [5, '过孔与铺铜', `${S.vias} 个过孔，两面整片铺地。`],
    [6, '检查：DRC 与 3D', `${D.drc.errors} 个错误、${D.drc.unconnected} 处没连上，再在 3D 里看一遍。`],
    [7, '出生产文件', `${gerbN} 层 Gerber + ${drlN} 个钻孔文件 + BOM ${FAB.bom.length} 行 + 坐标 ${FAB.cpl.length} 行。`],
    [8, '下单与到货', '标准型贴片（经济型不贴 U1 模组），预览里核对方向；到货先看、再量、最后通电。']
  ];
  $('recap').innerHTML = REC.map(([n, t, d]) => `<li><a href="#p${n}"><b>第 ${n} 课</b>${t}</a><span>${d}</span></li>`).join('');
})();
