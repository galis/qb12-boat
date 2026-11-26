/* 第 1 课：PCB 是什么做的。QB12 的数字都从 QB.board（真实设计文件抽出来的数据）现算；外部事实的出处见 p1_notes.md。 */
const D = QB.board, S = D.stats, RU = D.rules;
const $ = id => document.getElementById('p1-' + id);
const RMx = C.RM;
const wait = ms => new Promise(r => setTimeout(r, ms));
const r3 = v => Math.round(v * 1000) / 1000;
const nf = (v, d) => (+v).toLocaleString('zh-CN', { maximumFractionDigits: d == null ? 2 : d });
const pct = (a, b, d) => nf(a / b * 100, d == null ? 0 : d);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GF = suf => (D.fab.gerbers.find(g => g.file.endsWith(suf)) || {}).file || '';
const GB = suf => (D.fab.gerbers.find(g => g.file.endsWith(suf)) || {}).bytes || 0;
const kb = b => (b / 1024 < 10 ? nf(b / 1024, 1) : nf(b / 1024, 0)) + ' KB';
const polyD = rings => rings.map(r => 'M' + r.map(p => r3(p[0]) + ' ' + r3(p[1])).join('L') + 'Z').join('');
const OUTLINE = 'M' + D.board.outline.map(p => p.join(' ')).join('L') + 'Z';
const BW = D.board.w, BH = D.board.h;

/* KiCad 10.0.6 给 QB12 的默认物理叠层（和 8.0.9 一样）。QB12.kicad_pcb 里没有存叠层（只有 (general (thickness 1.6))），
   打开 电路板配置 → 物理叠层 时 KiCad 按 1.6 mm 自动给出下面这组数（用 pcbnew 存一份带叠层的副本核对过，见 p1_notes.md）。 */
const STK = { mask: 0.01, cu: 0.035, core: 1.51, er: 4.5, mat: 'FR4' };
const TH = D.board.thickness;

/* ---------- 从 QB.board 现算的数 ---------- */
const PADS = D.footprints.flatMap(f => f.pads.map(p => Object.assign({ ref: f.ref }, p)));
const openF = PADS.filter(p => (p.mask || '').includes('F'));
const openB = PADS.filter(p => (p.mask || '').includes('B'));
const smdN = PADS.filter(p => p.t === 'smd').length;
const holeOpenF = openF.filter(p => p.t !== 'smd').length;
const pasteF = PADS.filter(p => p.paste && p.cu.includes('F')).length;
const pthN = D.fab.pth.reduce((a, t) => a + t.n, 0), npthN = D.fab.npth.reduce((a, t) => a + t.n, 0);
const refsShown = D.footprints.filter(f => f.refShown).length;
const backTexts = D.texts.filter(t => t.layer === 'B.Silkscreen');
const drcT = Object.fromEntries(D.drc.by_type.map(t => [t.type, t]));
const area = S.area, aF = S.gnd_area['F.Cu'], aB = S.gnd_area['B.Cu'];
const sizeTxt = `${S.size[0]} × ${S.size[1]} mm`;
const dlist = arr => {           // 钻孔表：按孔径合并
  const m = new Map();
  arr.forEach(t => { const k = t.d; const o = m.get(k) || { d: k, n: 0, slots: 0 }; o.n += t.n; o.slots += t.slots; m.set(k, o); });
  return [...m.values()].sort((a, b) => a.d - b.d).map(o => `${o.d} mm × ${o.n}${o.slots ? `（槽孔）` : ''}`).join('、');
};
function padBox(p) {
  if (p.poly) { const xs = p.poly[0].map(q => q[0]), ys = p.poly[0].map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  const a = Math.round((((p.a || 0) % 180) + 180) % 180);
  if (a !== 0 && a !== 90) return null;
  const w = a ? p.h : p.w, h = a ? p.w : p.h;
  return [p.x - w / 2, p.y - h / 2, p.x + w / 2, p.y + h / 2];
}
const boxGap = (A, B) => { const dx = Math.max(B[0] - A[2], A[0] - B[2], 0), dy = Math.max(B[1] - A[3], A[1] - B[3], 0); return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy); };
// 阻焊桥：同一个元件里，两个不同网络的开窗之间最窄的那条油（阻焊扩展 = 0，开窗和焊盘一样大）
const DAM = (function () {
  let best = { g: 9, ref: '' };
  D.footprints.forEach(f => {
    const ps = f.pads.filter(p => p.t !== 'npth' && (p.mask || '').includes('F')).map(p => [p, padBox(p)]).filter(x => x[1]);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      if (ps[i][0].net === ps[j][0].net) continue;
      const g = boxGap(ps[i][1], ps[j][1]);
      if (g > 0 && g < best.g - 1e-6) best = { g: r3(g), ref: f.ref };
    }
  });
  return best;
})();
// 脚距：同一个元件里，同样大小、排成一排的贴片焊盘中心距
function pitchOf(f) {
  let best = 99;
  const ps = f.pads.filter(p => p.t === 'smd' && !p.poly && Math.min(p.w, p.h) > 0.05).map(p => [p, padBox(p)]).filter(x => x[1]);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const [p, a] = ps[i], [q, b] = ps[j];
    if (Math.abs((a[2] - a[0]) - (b[2] - b[0])) > 1e-3 || Math.abs((a[3] - a[1]) - (b[3] - b[1])) > 1e-3) continue;
    const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y);
    if (dy < 0.01 && dx > 0.05) best = Math.min(best, dx);
    if (dx < 0.01 && dy > 0.05) best = Math.min(best, dy);
  }
  return r3(best);
}
const PITCH = D.footprints.map(f => ({ ref: f.ref, p: pitchOf(f) })).sort((a, b) => a.p - b.p);
const minPitch = PITCH[0], pitchU2 = PITCH.find(x => x.ref === 'U2').p;
const cuPct = pct(2 * STK.cu, TH, 1), corePct = pct(STK.core, TH, 1);
const thLo = r3(TH * 0.9), thHi = r3(TH * 1.1);
// 过孔没有单独开窗（盖油），但落在焊盘开窗范围里的（U2、U4 散热焊盘里的散热过孔）顶面会跟着露出来
const VIN = D.vias.filter(v => openF.some(p => { const b = padBox(p); return b && v.x >= b[0] - 1e-6 && v.x <= b[2] + 1e-6 && v.y >= b[1] - 1e-6 && v.y <= b[3] + 1e-6; }));
const VINref = [...new Set(VIN.map(v => openF.find(p => { const b = padBox(p); return b && v.x >= b[0] - 1e-6 && v.x <= b[2] + 1e-6 && v.y >= b[1] - 1e-6 && v.y <= b[3] + 1e-6; }).ref))].join('、');
const tentTxt = `过孔都没有单独开窗；${D.vias.length - VIN.length} 个两面盖油，${VIN.length} 个散热过孔在 ${VINref} 散热焊盘的开窗里，顶面露着`;

/* ---------- 共用：画焊盘 ---------- */
function padEl(p) {
  if (p.s === 'circle') return `<circle cx="${p.x}" cy="${p.y}" r="${r3(p.w / 2)}"/>`;
  if (p.poly) return `<path d="${polyD(p.poly)}"/>`;
  const w = p.w, h = p.h, rx = p.s === 'oval' ? Math.min(w, h) / 2 : p.s === 'roundrect' ? (p.rr || 0) : 0;
  const t = p.a ? ` transform="rotate(${-p.a} ${p.x} ${p.y})"` : '';
  return `<rect x="${r3(p.x - w / 2)}" y="${r3(p.y - h / 2)}" width="${w}" height="${h}"${rx ? ` rx="${r3(rx)}"` : ''}${t}/>`;
}
function copperArt(side) {        // side 'F' / 'B'：铺铜 + 走线 + 焊盘 + 过孔（板子坐标 mm）
  const L = side === 'F' ? 'F.Cu' : 'B.Cu', li = side === 'F' ? 0 : 1;
  const z = D.zones.filter(q => !q.rule && q.fill[L]).map(q => `<path fill-rule="evenodd" d="${q.fill[L].polys.map(polyD).join('')}"/>`).join('');
  const t = D.tracks.filter(q => q[1] === li).map(q => `<line x1="${q[3]}" y1="${q[4]}" x2="${q[5]}" y2="${q[6]}" stroke-width="${q[2]}"/>`).join('');
  const p = PADS.filter(q => q.t !== 'npth' && q.cu.includes(side)).map(padEl).join('');
  const v = D.vias.map(q => `<circle cx="${q.x}" cy="${q.y}" r="${r3(q.d / 2)}"/>`).join('');
  return `<g stroke="none">${z}</g><g fill="none" stroke-linecap="round">${t}</g><g stroke="none">${p}${v}</g>`;
}
const HOLES = (function () {
  let s = D.vias.map(v => `<circle cx="${v.x}" cy="${v.y}" r="${r3(v.drill / 2)}"/>`).join('');
  PADS.forEach(p => {
    if (!p.drill) return;
    const [w, h] = p.drill;
    if (Math.abs(w - h) < 1e-6) { s += `<circle cx="${p.x}" cy="${p.y}" r="${r3(w / 2)}"/>`; return; }
    const ln = Math.abs(w - h), th = Math.min(w, h), ang = -((w > h ? p.a : p.a + 90) || 0) * Math.PI / 180;
    const ca = Math.cos(ang) * ln / 2, sa = Math.sin(ang) * ln / 2;
    s += `<line x1="${r3(p.x - ca)}" y1="${r3(p.y - sa)}" x2="${r3(p.x + ca)}" y2="${r3(p.y + sa)}" stroke-width="${th}" stroke-linecap="round"/>`;
  });
  return s;
})();

/* ===================================================================
   1.1 拆开看：每一层用 QB12 的真实图形画，斜着摆开
   =================================================================== */
const ITEMS = [
  { id: 'F.Paste', kc: 'F.Paste', zh: '钢网（不在板上）', board: '不在板上：做贴片钢网',
    why: '它不是板子上的一层。贴片时用一张薄钢片，按这一层的形状开孔，把锡膏刷到焊盘上（钢网另做，不和 PCB 粘在一起）。',
    f: [['材料', '不锈钢片（钢网）'], ['KiCad 层', 'F.Paste'], ['导出成', `${GF('F_Paste.gtp')}`], ['QB12', `${pasteF} 个开口，都在顶面；底面没有贴片，B.Paste 是空的`]],
    more: '钢网开口和焊盘的关系：<a href="#p2">第 2 课</a>；刷锡膏、贴片：<a href="#p8">第 8 课</a>' },
  { id: 'F.SilkS', kc: 'F.Silkscreen', zh: '顶层丝印', board: '白字、元件外框、极性点',
    why: '印在阻焊上面的字和框：位号、极性点、外框。只给人看，和电路无关；开窗的地方会被裁掉，免得油墨印到焊盘上。',
    f: [['材料', '白色油墨'], ['KiCad 层', 'F.Silkscreen（老名字 F.SilkS）'], ['导出成', GF('F_Silkscreen.gto')], ['QB12', `${refsShown} 个位号印出来，${S.refs_hidden.length} 个放不下隐藏了（${S.refs_hidden.join('、')}）`]],
    more: '丝印的字号和 JLC 的要求：本课 1.3' },
  { id: 'F.Mask', kc: 'F.Mask', zh: '顶层阻焊', board: '绿油；这一层画的地方开窗',
    why: '盖住整面铜的一层油，只在焊盘处开窗。它让铜不氧化，也挡住焊锡，不让它在挨着的焊盘之间连成一片。KiCad 里这一层画的是“洞”，不是油。',
    f: [['材料', '感光阻焊油墨（LPI），颜色下单时选'], ['厚度', `JLC 写至少 10 µm；KiCad 默认叠层填 ${STK.mask} mm`], ['KiCad 层', 'F.Mask（画的是开窗）'], ['导出成', GF('F_Mask.gts')], ['QB12', `${openF.length} 个开窗：${smdN} 个贴片焊盘 + ${holeOpenF} 个通孔；${tentTxt}`]],
    more: '开窗、阻焊桥在真板上的样子：本课 1.3' },
  { id: 'F.Cu', kc: 'F.Cu', zh: '顶层铜', board: '顶面的走线、焊盘、铺铜',
    why: '导电的那一层：走线、焊盘、铺铜都在这里。工厂先让整面都是铜，再把不要的部分蚀刻掉，剩下的就是导线。',
    f: [['材料', '铜箔 + 电镀铜'], ['厚度', `1 oz ≈ 35 µm（KiCad 默认叠层 ${STK.cu} mm）`], ['KiCad 层', 'F.Cu'], ['导出成', GF('F_Cu.gtl')], ['QB12', `${S.tracks_F} 段走线、${smdN} 个贴片焊盘，GND 铺铜 ${Math.round(aF)} mm²（板面的 ${pct(aF, area)}%）`]],
    more: '线宽、间距：<a href="#p4">第 4 课</a>；铺铜：<a href="#p5">第 5 课</a>' },
  { id: 'core', kc: '（介质 core）', zh: 'FR-4 芯板', board: '中间的硬板',
    why: '中间那块硬板：绝缘，把整块板撑起来。双层板就是一张两面贴了铜的芯板，不用像多层板那样再压别的层。',
    f: [['材料', '玻璃纤维布 + 环氧树脂（FR-4，阻燃）'], ['厚度', `${STK.core} mm（KiCad 默认叠层），介电常数 ${STK.er}`], ['KiCad 层', '不能在上面画东西；物理叠层 表里叫“介质 1”，类型“Core”（10.0.6 中文界面这里没翻译）'], ['导出成', '没有文件：板材、板厚在下单页选'], ['QB12', `${sizeTxt}，板厚 ${TH} mm`]],
    more: '有多厚、Tg 是什么：本课 1.2' },
  { id: 'B.Cu', kc: 'B.Cu', zh: '底层铜', board: '底面的走线、铺铜',
    why: '底面那层铜。QB12 的元件全在顶面，底面主要是一整片接地铜，加上少数换层过来的走线。',
    f: [['厚度', `1 oz ≈ 35 µm（KiCad ${STK.cu} mm）`], ['KiCad 层', 'B.Cu'], ['导出成', GF('B_Cu.gbl')], ['QB12', `${S.tracks_B} 段走线，GND 铺铜 ${Math.round(aB)} mm²（板面的 ${pct(aB, area)}%）`]],
    more: '为什么底面整片接地：<a href="#p5">第 5 课</a>' },
  { id: 'B.Mask', kc: 'B.Mask', zh: '底层阻焊', board: '底面的绿油',
    why: `底面也整面盖油。QB12 底面没有贴片元件，所以开窗很少：只有 ${openB.length} 个通孔开窗，USB-C 外壳脚、定位孔，以及 U2 散热焊盘里封装自带的 4 个孔。`,
    f: [['KiCad 层', 'B.Mask'], ['导出成', GF('B_Mask.gbs')], ['QB12', `${openB.length} 个开窗，全是通孔；底面没有贴片焊盘`]] },
  { id: 'B.SilkS', kc: 'B.Silkscreen', zh: '底层丝印', board: '底面的说明文字',
    why: '底面的字。它是镜像写进文件的，板子翻过来看才是正的。',
    f: [['KiCad 层', 'B.Silkscreen'], ['导出成', GF('B_Silkscreen.gbo')], ['QB12', `${backTexts.length} 条：${backTexts.filter(t => t.text.length > 3).slice(0, 4).map(t => t.text).join('、')} 等，插线时翻过来看`]],
    more: '每一条写的什么：本课 1.3 第⑤步' },
  { id: 'Edge.Cuts', kc: 'Edge.Cuts', zh: '板框', board: '板子的外形',
    why: '板子的外形线。工厂最后按这条线把板子从大板上锣下来。它不是一层材料，只是一条“切这里”的线。',
    f: [['KiCad 层', 'Edge.Cuts（中文界面叫“板框”）'], ['导出成', GF('Edge_Cuts.gm1')], ['QB12', `${sizeTxt} 圆角矩形，圆角 R${S.corner_r}`]],
    more: '板子多大、怎么画板框：<a href="#p3">第 3 课</a>' },
  { id: 'Drill', kc: '（钻孔）', zh: '钻孔', board: '穿过整块板的孔',
    why: '穿过整块板的孔。孔壁镀了铜的叫金属化孔（PTH），把两层铜连起来，过孔就是这种；不镀铜的叫非金属化孔（NPTH），只用来定位。',
    f: [['KiCad 层', '不是一层：来自过孔和通孔焊盘'], ['导出成', `${GF('-PTH.drl')}、${GF('NPTH.drl')}`], ['QB12', `${S.holes} 个孔：金属化 ${pthN} 个（其中过孔 ${S.vias} 个）、非金属化 ${npthN} 个`]],
    more: '过孔：<a href="#p5">第 5 课</a>；钻孔文件：<a href="#p7">第 7 课</a>' }
];
const SLABS = ['F.Paste', 'F.SilkS', 'F.Mask', 'F.Cu', 'core', 'B.Cu', 'B.Mask', 'B.SilkS'];
const LBL = { 'F.Paste': ['F.Paste', '钢网（不在板上）'], 'F.SilkS': ['F.Silkscreen', '顶层丝印'], 'F.Mask': ['F.Mask', '顶层阻焊'], 'F.Cu': ['F.Cu', '顶层铜'],
  core: ['FR-4', '芯板'], 'B.Cu': ['B.Cu', '底层铜'], 'B.Mask': ['B.Mask', '底层阻焊'], 'B.SilkS': ['B.Silkscreen', '底层丝印'] };

const iso = (function () {
  const svg = $('iso');
  const AX = [0.9, 0.2], AY = [-0.55, 0.28];          // 板子 x 轴、y 轴在屏幕上的方向
  const L = QB.layers;
  const st = { open: true, kicad: false, sel: null, hov: null, wide: null };
  // 每层的内容（板子坐标）
  const art = {
    'F.Paste': `<path class="p1-r p1-steel" d="${OUTLINE}" mask="url(#p1-imP)"/><g class="p1-k" style="color:var(--bv-fpaste)">${L['F.Paste']}</g>`,
    'F.SilkS': `<path class="p1-r p1-plate" d="${OUTLINE}"/><g class="p1-silk p1-silkF" mask="url(#p1-imF)">${L['F.SilkS']}</g>`,
    'F.Mask': `<path class="p1-r p1-msheet" d="${OUTLINE}" mask="url(#p1-imF)"/><g class="p1-k" style="color:var(--bv-fmask)">${L['F.Mask']}</g>`,
    'F.Cu': `<g class="p1-cu p1-cuF">${copperArt('F')}</g><g class="p1-holes">${HOLES}</g>`,
    core: `<path class="p1-r p1-fr4" d="${OUTLINE}"/><path class="p1-k p1-kcore" d="${OUTLINE}"/><g class="p1-holes p1-r">${HOLES}</g>`,
    'B.Cu': `<g class="p1-cu p1-cuB">${copperArt('B')}</g><g class="p1-holes">${HOLES}</g>`,
    'B.Mask': `<path class="p1-r p1-msheet" d="${OUTLINE}" mask="url(#p1-imB)"/><g class="p1-k" style="color:var(--bv-bmask)">${L['B.Mask']}</g>`,
    'B.SilkS': `<path class="p1-r p1-plate" d="${OUTLINE}"/><g class="p1-silk p1-silkB" mask="url(#p1-imB)">${L['B.SilkS']}</g>`
  };
  const mdef = (id, frag) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="-3" y="-3" width="${BW + 6}" height="${BH + 6}"><rect x="-3" y="-3" width="${BW + 6}" height="${BH + 6}" fill="#fff"/><g style="color:#000;fill:#000">${frag}</g></mask>`;
  svg.innerHTML = `<defs>${mdef('p1-imF', L['F.Mask'])}${mdef('p1-imB', L['B.Mask'])}${mdef('p1-imP', L['F.Paste'])}</defs><g class="p1-slabs"></g><g class="p1-labels"></g>`;
  const gS = svg.querySelector('.p1-slabs'), gL = svg.querySelector('.p1-labels');
  const slabs = {};
  // 画的顺序：从最下面一层画起，上面的盖住下面的
  SLABS.slice().reverse().forEach(id => {
    const g = C.el('g', { class: 'p1-slab', 'data-l': id }, gS);
    const m = C.el('g', { class: 'p1-m' }, g);
    m.innerHTML = `<path class="p1-ol" d="${OUTLINE}"/>` + art[id] + `<path class="p1-hit" d="${OUTLINE}"/>`;
    if (id === 'core') { g.insertAdjacentHTML('afterbegin', '<g class="p1-side"><polygon class="p1-sf1"/><polygon class="p1-sf2"/></g>'); }
    slabs[id] = g;
    g.addEventListener('click', () => select(st.sel === id ? null : id));
    g.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { st.hov = id; paint(); } });
    g.addEventListener('pointerleave', () => { if (st.hov === id) { st.hov = null; paint(); } });
  });
  let geo = null;
  function layout() {
    const w = svg.parentNode.clientWidth || 600;
    const wide = w >= 540;
    const k = wide ? 6 : 6.6, mx = 10;
    const ox = mx + k * BH * -AY[0], oy = 8;
    const sw = k * (BW * AX[0] - BH * AY[0]), sh = k * (BW * AX[1] + BH * AY[1]);
    const coreT = st.open ? 16 : 12;
    const yo = {};
    if (st.open) {
      let y = 0; yo['F.Paste'] = y; y += 64;
      ['F.SilkS', 'F.Mask', 'F.Cu', 'core', 'B.Cu', 'B.Mask', 'B.SilkS'].forEach(id => { yo[id] = y; y += 44 + (id === 'core' ? coreT : 0); });
    } else {
      const y0 = 205;
      yo['F.Paste'] = y0 - 70; yo['F.SilkS'] = y0; yo['F.Mask'] = y0 + 1.5; yo['F.Cu'] = y0 + 3; yo.core = y0 + 4.5;
      yo['B.Cu'] = y0 + 4.5 + coreT; yo['B.Mask'] = y0 + 6 + coreT; yo['B.SilkS'] = y0 + 7.5 + coreT;
    }
    const H = 64 + 6 * 44 + 16 + sh + oy + 12;
    const W = wide ? ox + k * BW * AX[0] + 200 : ox + k * BW * AX[0] + mx;
    svg.setAttribute('viewBox', `0 0 ${r3(W)} ${r3(H)}`);
    const P = (x, y) => [ox + k * (x * AX[0] + y * AY[0]), oy + k * (x * AX[1] + y * AY[1])];
    const mtx = `matrix(${r3(k * AX[0])} ${r3(k * AX[1])} ${r3(k * AY[0])} ${r3(k * AY[1])} ${r3(ox)} ${r3(oy)})`;
    for (const id of SLABS) {
      const g = slabs[id];
      g.querySelector('.p1-m').setAttribute('transform', mtx);
      g.style.transform = `translate(0px, ${r3(yo[id])}px)`;
      if (id === 'core') {
        const a = P(0, BH), b = P(BW, BH), c = P(0, 0);
        const pts = q => q.map(p => p.map(r3).join(',')).join(' ');
        g.querySelector('.p1-sf1').setAttribute('points', pts([a, b, [b[0], b[1] + coreT], [a[0], a[1] + coreT]]));
        g.querySelector('.p1-sf2').setAttribute('points', pts([c, a, [a[0], a[1] + coreT], [c[0], c[1] + coreT]]));
      }
    }
    gL.innerHTML = '';
    if (wide) {
      const tr = P(BW, 0);
      for (const id of SLABS) {
        const y = tr[1] + yo[id];
        const g = C.el('g', { class: 'p1-lab', 'data-l': id }, gL);
        C.el('line', { x1: r3(tr[0] + 3), y1: r3(y), x2: r3(tr[0] + 22), y2: r3(y) }, g);
        const t = C.el('text', { x: r3(tr[0] + 27), y: r3(y + 4.5) }, g);
        C.el('tspan', { class: 'p1-lk' }, t, LBL[id][0] + ' ');
        C.el('tspan', {}, t, LBL[id][1]);
        g.addEventListener('click', () => select(st.sel === id ? null : id));
      }
      gL.style.display = st.open ? '' : 'none';
    }
    geo = { wide, k };
    st.wide = wide;
  }
  function paint() {
    const s = st.sel, h = st.hov;
    svg.classList.toggle('kicad', st.kicad);
    svg.classList.toggle('shut', !st.open);
    svg.classList.toggle('p1-edge', s === 'Edge.Cuts');
    svg.classList.toggle('p1-drill', s === 'Drill');
    for (const id of SLABS) {
      const g = slabs[id];
      const dim = s && s !== 'Edge.Cuts' && !(s === 'Drill' && ['F.Cu', 'core', 'B.Cu'].includes(id)) && s !== id;
      g.classList.toggle('dim', !!dim);
      g.classList.toggle('on', s === id);
      g.classList.toggle('hov', h === id && s !== id);
    }
    gL.querySelectorAll('.p1-lab').forEach(g => g.classList.toggle('on', g.dataset.l === s));
    // 实物颜色时，丝印被开窗裁掉（和导出时“剔除阻焊开窗中的丝印”一样）
    svg.querySelectorAll('.p1-silk').forEach(g => {
      if (st.kicad) g.removeAttribute('mask'); else g.setAttribute('mask', g.classList.contains('p1-silkF') ? 'url(#p1-imF)' : 'url(#p1-imB)');
    });
    $('isocap').textContent = st.kicad
      ? 'KiCad 的颜色：F.Mask（紫）、B.Mask（青绿）画的是开窗的位置，不是油；FR-4 芯板在 KiCad 里没有图层，只画了一圈虚线。层间距是示意。'
      : '示意：层与层之间的距离和厚度都没按比例，真实厚度见 1.2。图形是 QB12 每一层的真实图形；丝印在开窗处被裁掉。';
  }
  const chips = $('isochips');
  chips.innerHTML = ITEMS.map(it => `<button class="btn" data-p1l="${it.id}" aria-pressed="false">${it.kc.startsWith('（') ? it.zh : `<span class="p1-mono">${it.kc}</span> ${it.zh.replace('（不在板上）', '')}`}</button>`).join('');
  chips.addEventListener('click', e => { const b = e.target.closest('[data-p1l]'); if (b) select(st.sel === b.dataset.p1l ? null : b.dataset.p1l); });
  function card() {
    const it = ITEMS.find(x => x.id === st.sel);
    if (!it) {
      $('il-t').textContent = '图里 8 层：7 层在板上，1 层是钢网';
      $('il-why').textContent = '真正在板子上的是 7 层：丝印、阻焊、铜、FR-4 芯板、铜、阻焊、丝印。最上面的钢网是贴片时用的工具。另外两样在 KiCad 里也算“层”，其实是位置：板框（切这里）和钻孔（钻这里）。点一层看它是什么。';
      $('il-facts').innerHTML = [['板子', `${sizeTxt}，${S.copper_layers} 层铜`], ['板厚', `${TH} mm`], ['铜', `两层，各约 35 µm`], ['FR-4 芯板', `${STK.core} mm`]].map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
      $('il-more').innerHTML = '';
      return;
    }
    $('il-t').textContent = `${it.kc.startsWith('（') ? '' : it.kc + ' · '}${it.zh}`;
    $('il-why').textContent = it.why;
    $('il-facts').innerHTML = it.f.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
    $('il-more').innerHTML = it.more || '';
  }
  function select(id) {
    st.sel = id;
    C.pressOne('#p1-isochips [data-p1l]', 'p1l', id || '');
    paint(); card();
  }
  document.querySelectorAll('#p1 [data-p1iso]').forEach(b => b.addEventListener('click', () => {
    st.open = b.dataset.p1iso === 'open'; C.pressOne('#p1 [data-p1iso]', 'p1iso', b.dataset.p1iso); layout(); paint();
  }));
  document.querySelectorAll('#p1 [data-p1col]').forEach(b => b.addEventListener('click', () => {
    st.kicad = b.dataset.p1col === 'kicad'; C.pressOne('#p1 [data-p1col]', 'p1col', b.dataset.p1col); paint();
  }));
  layout(); paint(); card();
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const w = (svg.parentNode.clientWidth || 600) >= 540; if (w !== st.wide) layout(); }, 150); });
  return { select, st };
})();

/* 对照表 */
(function () {
  const rows = [
    ['F.Cu', '顶层铜', '顶面的走线、焊盘、铺铜', GF('F_Cu.gtl')], ['B.Cu', '底层铜', '底面的走线、铺铜', GF('B_Cu.gbl')],
    ['F.Mask', '顶层阻焊', '绿油；这层画的地方开窗、露铜', GF('F_Mask.gts')], ['B.Mask', '底层阻焊', '底面的绿油和开窗', GF('B_Mask.gbs')],
    ['F.Silkscreen', '顶层丝印', '顶面的白字和外框', GF('F_Silkscreen.gto')], ['B.Silkscreen', '底层丝印', '底面的白字', GF('B_Silkscreen.gbo')],
    ['F.Paste', '顶层钢网', '不在板上：用来做钢网', GF('F_Paste.gtp')], ['B.Paste', '底层钢网', `不在板上；QB12 底面没有贴片，文件是空的（${kb(GB('B_Paste.gbp'))}）`, GF('B_Paste.gbp')],
    ['Edge.Cuts', '板框', '板子的外形（切这里）', GF('Edge_Cuts.gm1')], ['（过孔、通孔）', '钻孔', '穿过整块板的孔', `${GF('-PTH.drl')}、${GF('NPTH.drl')}`]
  ];
  $('ltab').querySelector('tbody').innerHTML = rows.map(r => `<tr><td class="p1-mono">${r[0]}</td><td data-l="是什么">${r[1]}</td><td data-l="在成品板上">${r[2]}</td><td class="p1-mono p1-file" data-l="导出成">${r[3]}</td></tr>`).join('');
  $('ncu').textContent = `设计文件里的铜层数就是 ${S.copper_layers}`;
})();

/* ===================================================================
   1.2 厚度：示意 / 按真实比例
   =================================================================== */
const thick = (function () {
  const svg = $('thsvg');
  const Y0 = 34, PXMM = 240 / TH;
  const SCH = { m: 12, c: 22, core: 150 };
  const REAL = { m: STK.mask * PXMM, c: STK.cu * PXMM, core: STK.core * PXMM };
  svg.innerHTML = `<defs><clipPath id="p1-magc"><circle/></clipPath>
    <pattern id="p1-weave" patternUnits="userSpaceOnUse" width="14" height="10"><rect width="14" height="10" fill="var(--p1-fr4)"/><path d="M0 2.5h14M0 7.5h14" stroke="var(--p1-fr4d)" stroke-width="1.2" opacity=".55"/><path d="M3.5 0v10M10.5 0v10" stroke="var(--p1-fr4d)" stroke-width=".8" opacity=".35"/></pattern></defs>
    <g class="p1-tb"></g><g class="p1-tl"></g><g class="p1-tmag"></g><g class="p1-tdim"></g>`;
  const gB = svg.querySelector('.p1-tb'), gLb = svg.querySelector('.p1-tl'), gM = svg.querySelector('.p1-tmag'), gD = svg.querySelector('.p1-tdim');
  const clip = svg.querySelector('#p1-magc circle');
  let cur = Object.assign({}, SCH), mode = 'sch', G = null;
  // 宽屏：板子剖面在左、标签在右；窄屏（手机）：整个图画窄一点、标签写短一点，字才不会太小
  function geom() {
    const n = (svg.parentNode.clientWidth || 600) < 520;
    const g = n ? { n, W: 360, X0: 34, X1: 180, labX: 200, dimX: 20, mag: [106, 154, 52, 10] } : { n, W: 640, X0: 40, X1: 300, labX: 352, dimX: 22, mag: [200, 152, 62, 12] };
    const f = (a, b) => [g.X0 + a * (g.X1 - g.X0), g.X0 + b * (g.X1 - g.X0)];
    g.OPEN = f(0.085, 0.246); g.GAPT = f(0.385, 0.492); g.GAPB = f(0.6, 0.7); g.BOX = f(0.56, 0.71);
    return g;
  }
  const rect = (g, x, y, w, h, cls) => C.el('rect', { x: r3(x), y: r3(y), width: r3(Math.max(0, w)), height: r3(Math.max(0, h)), class: cls }, g);
  function draw(hh) {
    const { X0, X1, OPEN, GAPT, GAPB, labX, dimX, n } = G;
    gB.innerHTML = '';
    const m = hh.m, c = hh.c, co = hh.core;
    const yCuT = Y0 + m, yCore = yCuT + c, yCuB = yCore + co, yMB = yCuB + c, yEnd = yMB + m;
    rect(gB, X0, yCore, X1 - X0, co, 'p1-xfr4w');
    // 顶层铜（中间留一道缝，缝里填着阻焊）+ 顶层阻焊（焊盘处开窗）
    rect(gB, X0, yCuT, GAPT[0] - X0, c, 'p1-xcu'); rect(gB, GAPT[1], yCuT, X1 - GAPT[1], c, 'p1-xcu');
    rect(gB, GAPT[0], yCuT, GAPT[1] - GAPT[0], c, 'p1-xmask');
    rect(gB, X0, Y0, OPEN[0] - X0, m, 'p1-xmask'); rect(gB, OPEN[1], Y0, X1 - OPEN[1], m, 'p1-xmask');
    rect(gB, X0, yCuB, GAPB[0] - X0, c, 'p1-xcu'); rect(gB, GAPB[1], yCuB, X1 - GAPB[1], c, 'p1-xcu');
    rect(gB, GAPB[0], yCuB, GAPB[1] - GAPB[0], c, 'p1-xmask');
    rect(gB, X0, yMB, X1 - X0, m, 'p1-xmask');
    gLb.innerHTML = '';
    const rows = n ? [
      [Y0 + m / 2, 24, '阻焊', '≥10 µm'], [yCuT + c / 2, 56, '铜', '35 µm'], [yCore + co / 2, 150, 'FR-4', `${STK.core} mm`],
      [yCuB + c / 2, 240, '铜', '35 µm'], [yMB + m / 2, 272, '阻焊', '≥10 µm']
    ] : [
      [Y0 + m / 2, 24, '阻焊', `至少 10 µm（KiCad ${STK.mask} mm）`], [yCuT + c / 2, 58, '铜 1 oz', `≈ 35 µm（KiCad ${STK.cu} mm）`],
      [yCore + co / 2, 148, 'FR-4 芯板', `${STK.core} mm`], [yCuB + c / 2, 238, '铜 1 oz', '≈ 35 µm'], [yMB + m / 2, 272, '阻焊', '至少 10 µm']
    ];
    rows.forEach(([ya, yl, a, b]) => {
      C.el('path', { d: `M${X1 + 2} ${r3(ya)} L${X1 + 10} ${r3(ya)} L${labX - 12} ${yl - 5} L${labX - 4} ${yl - 5}`, class: 'p1-lead' }, gLb);
      const t = C.el('text', { x: labX, y: yl, class: 'p1-tt' }, gLb);
      C.el('tspan', { class: 'p1-tth' }, t, a + ' ');
      C.el('tspan', {}, t, b);
    });
    C.el('text', { x: r3((OPEN[0] + OPEN[1]) / 2), y: Y0 - 8, 'text-anchor': 'middle', class: 'p1-ts' }, gLb, '开窗');
    gD.innerHTML = '';
    C.el('path', { d: `M${dimX - 4} ${Y0}H${dimX + 4}M${dimX} ${Y0}V${r3(yEnd)}M${dimX - 4} ${r3(yEnd)}H${dimX + 4}`, class: 'p1-dim' }, gD);
    const yc = r3((Y0 + yEnd) / 2);
    C.el('text', { x: dimX - 9, y: yc, class: 'p1-ts', transform: `rotate(-90 ${dimX - 9} ${yc})`, 'text-anchor': 'middle' }, gD, mode === 'real' ? `${TH} mm（按比例）` : `${TH} mm（示意）`);
  }
  function drawMag(on) {
    gM.innerHTML = '';
    if (!on) return;
    const [cx, cy, r, M] = G.mag, B = G.BOX;
    clip.setAttribute('cx', cx); clip.setAttribute('cy', cy); clip.setAttribute('r', r);
    const ym = cy - r * 0.74, hm = STK.mask * PXMM * M, hc = STK.cu * PXMM * M;
    const s = r3(0.1 * PXMM);
    rect(gM, B[0], Y0 - 3, B[1] - B[0], s + 6, 'p1-magbox');
    C.el('path', { d: `M${r3(B[0])} ${Y0 + s + 3}L${r3(cx - r * 0.7)} ${r3(cy - r * 0.7)}M${r3(B[1])} ${Y0 + s + 3}L${r3(cx + r * 0.7)} ${r3(cy - r * 0.7)}`, class: 'p1-lead' }, gM);
    const g = C.el('g', { 'clip-path': 'url(#p1-magc)' }, gM);
    rect(g, cx - r, cy - r, 2 * r, ym - (cy - r), 'p1-magbg');
    rect(g, cx - r, ym, 2 * r, hm, 'p1-xmask');
    rect(g, cx - r, ym + hm, 2 * r, hc, 'p1-xcu');
    rect(g, cx - r, ym + hm + hc, 2 * r, cy + r - (ym + hm + hc), 'p1-xfr4w');
    C.el('circle', { cx, cy, r, class: 'p1-magc' }, gM);
    C.el('text', { x: cx, y: r3(ym + hm / 2 + 4.5), 'text-anchor': 'middle', class: 'p1-tm' }, gM, '阻焊 10 µm');
    C.el('text', { x: cx, y: r3(ym + hm + hc / 2 + 5), 'text-anchor': 'middle', class: 'p1-tm' }, gM, '铜 35 µm');
    C.el('text', { x: cx, y: r3(cy + r * 0.72), 'text-anchor': 'middle', class: 'p1-tm' }, gM, `放大 ${M} 倍`);
  }
  function relayout() {
    G = geom();
    svg.setAttribute('viewBox', `0 0 ${G.W} 300`);
    svg.classList.toggle('n', G.n);
    draw(cur); drawMag(mode === 'real');
  }
  let raf = 0;
  function set(m) {
    mode = m;
    C.pressOne('#p1 [data-p1th]', 'p1th', m);
    const to = m === 'real' ? REAL : SCH, from = Object.assign({}, cur);
    $('thlab').textContent = m === 'real' ? '按真实比例：铜只剩一条细线，要放大才看得清' : '示意：铜和阻焊画厚了很多，不然看不见';
    cancelAnimationFrame(raf);
    drawMag(false);
    if (RMx) { cur = Object.assign({}, to); draw(cur); drawMag(m === 'real'); return; }
    const t0 = performance.now();
    const step = now => {
      const q = Math.min(1, (now - t0) / 700), e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      for (const k in to) cur[k] = from[k] + (to[k] - from[k]) * e;
      draw(cur);
      if (q < 1) raf = requestAnimationFrame(step); else drawMag(m === 'real');
    };
    raf = requestAnimationFrame(step);
  }
  document.querySelectorAll('#p1 [data-p1th]').forEach(b => b.addEventListener('click', () => set(b.dataset.p1th)));
  relayout(); set('sch');
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (geom().n !== G.n) relayout(); }, 150); });
  $('thro').innerHTML = [
    ['板厚（QB12 设计）', `${TH} mm`, ''], ['做出来的合格范围', `${thLo}–${thHi} mm`, '±10%'],
    ['两层铜', `2 × 35 µm`, `占板厚 ${cuPct}%`], ['FR-4 芯板', `${STK.core} mm`, `占板厚 ${corePct}%`], ['两层阻焊', '2 × 10 µm', 'KiCad 默认叠层']
  ].map(([a, b, c]) => `<div class="ro"><small>${a}</small><b>${b}</b>${c ? `<small>${c}</small>` : ''}</div>`).join('');
  $('th').textContent = `${TH} mm`;
  $('stkhonest').innerHTML = `QB12 的板文件里只写了板厚 ${TH} mm，没有存叠层（脚本没设过），所以打开这一页看到的是 KiCad 按 ${TH} mm 自动给的默认叠层：阻焊 ${STK.mask}、铜 ${STK.cu}、芯板 ${STK.core} mm（${STK.mat}，介电常数 ${STK.er}），加起来正好 ${r3(2 * STK.mask + 2 * STK.cu + STK.core)} mm。`;
  return { set };
})();

/* 铜厚 1 oz / 2 oz */
(function () {
  const svg = $('ozsvg');
  function draw(oz) {
    svg.innerHTML = '';
    C.el('rect', { x: 0, y: 70, width: 360, height: 26, class: 'p1-xfr4w' }, svg);
    const h = oz === 2 ? 30 : 15, und = oz === 2 ? 9 : 4, gap = oz === 2 ? 64 : 40, top = 70 - h, w = 70;
    const xA = 180 - gap / 2 - w, xB = 180 + gap / 2;
    const trap = x => `M${x - und} 70L${x} ${top}L${x + w} ${top}L${x + w + und} 70Z`;
    C.el('path', { d: trap(xA), class: 'p1-xcu' }, svg);
    C.el('path', { d: trap(xB), class: 'p1-xcu' }, svg);
    C.el('path', { d: `M${xA + w + und} 18V${top - 4}M${xB - und} 18V${top - 4}M${xA + w + und} 22H${xB - und}`, class: 'p1-dim' }, svg);
    C.el('text', { x: 180, y: 14, 'text-anchor': 'middle', class: 'p1-ts' }, svg, oz === 2 ? '线距 ≥ 0.16 mm' : '线距 ≥ 0.10 mm');
    C.el('text', { x: xA - und - 6, y: 66, 'text-anchor': 'end', class: 'p1-ts' }, svg, oz === 2 ? '70 µm' : '35 µm');
  }
  const ck = (cls, t) => `<div class="p1-ck ${cls}"><i>${cls === 'good' ? '✓' : cls === 'bad' ? '✗' : '!'}</i><span>${t}</span></div>`;
  function set(oz) {
    C.pressOne('#p1 [data-p1oz]', 'p1oz', oz);
    draw(oz);
    const mw = S.min_track, cl = RU.min_clearance;
    $('ozck').innerHTML = oz === 1
      ? ck('good', `JLC 1 oz 双层板：最小线宽 / 线距 0.10 / 0.10 mm。QB12 最细的线 ${mw} mm、规则最小间距 ${cl} mm，都够。`) +
        ck('good', `阻焊桥：绿油至少 0.10 mm、黑白油 0.13 mm。QB12 最窄的一条在 ${DAM.ref}，${DAM.g} mm。`) +
        ck('good', 'JLC 博客说 1 oz 是绝大多数快板订单的默认外层铜厚。')
      : ck(mw >= 0.16 ? 'good' : 'bad', `2 oz：最小线宽 / 线距 0.16 / 0.16 mm。QB12 最细的线 ${mw} mm，够。`) +
        ck(cl >= 0.16 ? 'good' : 'bad', `但 QB12 的规则允许间距小到 ${cl} mm，比 0.16 mm 还小：要先把规则改大、重跑 DRC，看哪里不够。`) +
        ck(DAM.g > 0.2 ? 'good' : 'warn', `阻焊桥 2 oz 一律至少 0.20 mm，QB12 最窄的 ${DAM.g} mm（${DAM.ref}）刚好压线。`) +
        ck('warn', 'QB12 的大电流靠把线加宽到 0.8 mm 解决（第 4 课），用不着 2 oz。');
  }
  document.querySelectorAll('#p1 [data-p1oz]').forEach(b => b.addEventListener('click', () => set(+b.dataset.p1oz)));
  set(1);
})();

/* Tg 温度标尺 */
(function () {
  const svg = $('tgsvg');
  const X = T => 16 + T * (328 / 320), Y = 100;
  const band = (a, b, cls) => C.el('rect', { x: r3(X(a)), y: Y - 11, width: r3(X(b) - X(a)), height: 22, rx: 3, class: cls }, svg);
  C.el('line', { x1: X(0), y1: Y, x2: X(320), y2: Y, class: 'p1-axis' }, svg);
  for (let t = 0; t <= 300; t += 50) {
    C.el('line', { x1: X(t), y1: Y + 11, x2: X(t), y2: Y + 15, class: 'p1-axis' }, svg);
    C.el('text', { x: X(t), y: Y + 27, 'text-anchor': 'middle', class: 'p1-tn' }, svg, t + '°');
  }
  band(130, 140, 'p1-btg'); band(245, 260, 'p1-brf'); band(300, 310, 'p1-btd');
  C.el('path', { d: `M${X(25)} ${Y - 11}V${Y + 11}`, class: 'p1-room' }, svg);
  C.el('text', { x: X(25), y: Y - 24, 'text-anchor': 'middle', class: 'p1-tl2' }, svg, '室温');
  C.el('text', { x: X(135), y: Y - 40, 'text-anchor': 'middle', class: 'p1-tl2 b' }, svg, 'Tg 130–140°');
  C.el('text', { x: X(135), y: Y - 24, 'text-anchor': 'middle', class: 'p1-tl2' }, svg, '普通 FR-4 变软');
  C.el('text', { x: X(252), y: Y - 40, 'text-anchor': 'middle', class: 'p1-tl2 b' }, svg, '回流 245–260°');
  C.el('text', { x: X(252), y: Y - 24, 'text-anchor': 'middle', class: 'p1-tl2' }, svg, '无铅焊峰值');
  C.el('text', { x: X(320), y: Y - 58, 'text-anchor': 'end', class: 'p1-tl2' }, svg, '300–310° 树脂开始分解 ↓');
  C.el('text', { x: X(255), y: Y + 46, 'text-anchor': 'middle', class: 'p1-tl2' }, svg, '经济型贴片回流 255 ± 5°');
  const mk = C.el('g', { class: 'p1-tgmk' }, svg);
  C.el('path', { d: 'M-6 -20L6 -20L0 -12Z' }, mk);
  const place = T => mk.setAttribute('transform', `translate(${r3(X(T))} ${Y})`);
  place(255);
  C.onVisible(svg, () => {
    if (RMx) return;
    const t0 = performance.now();
    const step = now => {
      const q = Math.min(1, (now - t0) / 2600);
      place(q < .6 ? 25 + (255 - 25) * (q / .6) : 255);
      if (q < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, '-60px');
})();

/* ===================================================================
   1.3 阻焊与丝印（真板查看器）
   =================================================================== */
const MB = BoardViewer.create($('mkbv'), { toolbar: false, panel: false, hover: true, layers: ['F.Cu', 'Vias', 'Zones', 'Edge.Cuts'], label: 'QB12 电机驱动 U2 附近：铜、阻焊开窗、成品、丝印' });
const U2 = QB.fp('U2');
const nearVia = (function () {
  const b = QB.region('motor').bbox, cx = U2.x, cy = U2.y;
  return D.vias.filter(v => v.role !== 'thermal' && v.x > b[0] && v.x < b[2] && v.y > b[1] && v.y < b[3]).sort((a, c) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(c.x - cx, c.y - cy))[0];
})();
const motorTrk = (function () {   // 视野里一段够长的顶层走线（不在 U2 肚子底下）
  const b = [U2.bbox[0] - 3.2, U2.bbox[1] - 1.6, U2.bbox[2] + 5.2, U2.bbox[3] + 3.2], inb = (x, y) => x > b[0] + 0.8 && x < b[2] - 0.8 && y > b[1] + 0.8 && y < b[3] - 0.8;
  return D.tracks.filter(t => t[1] === 0 && Math.hypot(t[5] - t[3], t[6] - t[4]) > 1.5 && inb(t[3], t[4]) && inb(t[5], t[6]) && !(Math.abs((t[3] + t[5]) / 2 - U2.x) < 2.5 && Math.abs((t[4] + t[6]) / 2 - U2.y) < 3)).sort((p, q) => q[2] - p[2])[0];
})();
function annPx(B) {            // 板子 mm → 屏幕像素的比例（标注字号按它换算）
  const w = B.stage.getBoundingClientRect().width || 600;
  return w / B.vb[2];
}
function callouts(B, list) {   // list: [[x, y, '文字', dx, dy]]
  B.clearAnnotations();
  const k = annPx(B), fs = 13 / k;
  B.annotate((g, m) => {
    g.setAttribute('class', 'p1-ann');
    list.forEach(([x, y, t, dx, dy]) => {
      const tx = x + dx * fs, ty = y + dy * fs;
      m.el('circle', { cx: x, cy: y, r: r3(5 / k), class: 'p1-ad' });
      m.el('line', { x1: x, y1: y, x2: r3(tx), y2: r3(ty), class: 'p1-al' });
      m.el('text', { x: r3(tx + (dx < 0 ? -0.3 * fs : 0.3 * fs)), y: r3(ty + 0.35 * fs), 'text-anchor': dx < 0 ? 'end' : 'start', style: `font-size:${r3(fs)}px;stroke-width:${r3(fs * 0.34)}px` }, null, t);
    });
  });
}
const p1 = U2.pads.find(p => p.n === '1');
const MKVIEW = [U2.bbox[0] - 3.2, U2.bbox[1] - 1.6, U2.bbox[2] + 5.2, U2.bbox[3] + 3.2];   // U2 和它右边、下边的一圈
const MK = [
  { t: '① 铜：蚀刻以后剩下的样子', set: () => MB.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'Vias', 'Zones', 'Edge.Cuts'] }),
    x: `红色是顶层铜（F.Cu）：U2 的 ${U2.pads.filter(p => p.t === 'smd').length} 个贴片焊盘、走线、整片的 GND 铺铜、灰色的过孔。这时它们全是裸铜，挨得最近的两个脚只隔一点点。`,
    f: () => [['U2 脚距', `${pitchU2} mm`], ['顶层走线', `${S.tracks_F} 段`], ['顶层铺铜', `${Math.round(aF)} mm²`]], call: 1 },
  { t: '② 叠上 F.Mask：紫色就是开窗', set: () => MB.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'Vias', 'Zones', 'F.Mask', 'Edge.Cuts'] }),
    x: `紫色是 F.Mask 层画的形状：每个焊盘一块，和焊盘一样大（阻焊扩展 ${RU.solder_mask_expansion} mm）。过孔和走线上没有紫色，所以会被油盖住。U2 肚子下面的散热焊盘也开了窗，里面的散热过孔跟着露出来。`,
    f: () => [['顶面开窗', `${openF.length} 个`], ['其中贴片焊盘', `${smdN} 个`], ['单独开窗的过孔', `0 / ${D.vias.length}`], ['在焊盘开窗里露着', `${VIN.length} 个（${VINref} 散热焊盘里）`]], call: 2 },
  { t: '③ 成品：没开窗的地方全盖了油', set: () => MB.show({ mode: 'made', side: 'top', layers: [], finish: 'hasl', mask: 'green' }),
    x: `走线和过孔变成深一点的绿：油下面有铜。开窗处露出焊盘（这里画成喷锡的银色）。两个开窗之间留下的那一条油叫<strong>阻焊桥</strong>，它挡住锡，不让两个脚连在一起。`,
    f: () => [['最窄的阻焊桥', `${DAM.g} mm（${DAM.ref}）`], ['JLC 要求（1 oz）', '绿油 ≥ 0.10，黑白油 ≥ 0.13 mm'], ['U2 两脚之间', `${r3(pitchU2 - Math.min(p1.w, p1.h))} mm`]], call: 2 },
  { t: '④ 丝印：位号印在油上，碰到开窗就裁掉', set: () => MB.show({ mode: 'made', side: 'top', layers: [], finish: 'hasl', mask: 'green' }),
    x: `白字是 F.Silkscreen：位号和元件外框。QB12 的位号由 finalize.py 自动摆：字高 0.8 mm、线宽 0.15 mm。JLC 要求线宽 ≥ 0.15 mm、字高 ≥ 1.0 mm（嘉立创“高精字符”才到 0.8 mm），所以 QB12 的位号偏小，可能印得不清楚；印糊了不影响电路，想稳妥就改成 1 mm。`,
    f: () => [['印出来的位号', `${refsShown} 个（${S.refs_hidden.length} 个放不下隐藏了）`], ['QB12 规则最小字高', `${RU.min_text_height} mm（所以 DRC 不报）`], ['DRC：' + drcT.silk_over_copper.zh, `${drcT.silk_over_copper.n} 条（第 6 课）`]], call: 0 },
  { t: '⑤ 翻到底面：没有元件，只有说明', set: () => MB.show({ mode: 'made', side: 'bottom', layers: [], finish: 'hasl', mask: 'green' }),
    x: `底面几乎是一整片盖了油的地，只有通孔处开窗。丝印是 finalize.py 写的接口说明，在文件里是镜像的，翻过来看才是正的。“Boat QB12”下面那串 JLCJLCJLCJLC（0.8 mm 高）原本是告诉工厂“订单号印这里”；现在 JLC 国际站和嘉立创国内站的做法不一样，下单时再说（<a href="#p8">第 8 课</a>）。`,
    f: () => [['底面开窗', `${openB.length} 个，全是通孔`], ['底面丝印', `${backTexts.length} 条`], ['最大的字', backTexts.slice().sort((a, b) => b.h - a.h)[0].text + `（${backTexts.slice().sort((a, b) => b.h - a.h)[0].h} mm）`]], call: 0 }
];
let mkCur = -1;
function goMk(i) {
  mkCur = i;
  const s = MK[i];
  C.pressOne('#p1-mkbtns [data-p1mk]', 'p1mk', i);
  $('mkbv').dataset.mk = i;
  MB.clear(); MB.clearAnnotations(); s.set();
  if (i === 4) MB.reset({ animate: false }); else MB.focus(MKVIEW, { pad: 0, animate: false });
  $('mk-t').textContent = s.t; $('mk-x').innerHTML = s.x;
  $('mk-f').innerHTML = s.f().map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
  const mid = motorTrk ? [(motorTrk[3] + motorTrk[5]) / 2, (motorTrk[4] + motorTrk[6]) / 2] : null;
  const L = [];
  if (s.call >= 1) L.push([p1.x, p1.y, s.call === 1 ? '焊盘（裸铜）' : '开窗：露铜', -1.4, -1.6]);
  if (s.call === 2) { if (nearVia) L.push([nearVia.x, nearVia.y, '过孔：盖油', 0.9, -1.5]); if (mid) L.push([mid[0], mid[1], '走线：盖油', 1.2, -1.8]); }
  if (s.call === 1 && nearVia) L.push([nearVia.x, nearVia.y, '过孔', 0.9, -1.5]);
  if (L.length) requestAnimationFrame(() => callouts(MB, L));
}
$('mkbtns').addEventListener('click', e => { const b = e.target.closest('[data-p1mk]'); if (b) goMk(+b.dataset.p1mk); });
C.onVisible($('mkbv'), () => { if (mkCur < 0) goMk(0); }, '300px');
let mkRz = 0;
window.addEventListener('resize', () => { if (mkCur >= 0) { clearTimeout(mkRz); mkRz = setTimeout(() => goMk(mkCur), 200); } });

/* ===================================================================
   1.4 工厂工序：剖面 + QB12 本身
   =================================================================== */
const pthTxt = dlist(D.fab.pth), npthTxt = dlist(D.fab.npth);
const FSTEPS = [
  { n: '开料', kb: 'Edge.Cuts（只是位置）', layers: ['Edge.Cuts'], file: '—', lesson: 3,
    x: '把大张覆铜板（FR-4 芯板，两面贴着铜箔）裁成生产用的大板，磨边、清洁。这时整面都是铜，板框只是一条“将来切这里”的线。',
    f: [['板材', `FR-4 双面覆铜，板厚 ${TH} mm`], ['QB12 一块', sizeTxt]],
    d: '板子多大、怎么拼板，决定一张大板能排多少块，也就决定了材料成本。', src: 'JLC 工厂参观' },
  { n: '钻孔', kb: '钻孔文件', layers: ['Edge.Cuts', 'Drill'], file: `${GF('-PTH.drl')}、${GF('NPTH.drl')}`, lesson: 5,
    x: 'CNC 钻机按钻孔文件一个个打孔，好几台一起钻；板上盖一块铝板，帮助散热、钻得更准。',
    f: [['QB12 的孔', `${S.holes} 个`], ['金属化孔', pthTxt], ['非金属化孔', npthTxt]],
    d: `孔的大小、位置、孔和孔的间距在这一步定下来：JLC 孔位公差 ±0.075 mm；孔边到孔边，过孔至少 0.2 mm、焊盘孔 0.45 mm。QB12 的规则是孔到孔 ≥ ${RU.min_hole_to_hole} mm。`, src: 'JLC 工厂参观、JLC 制造能力页' },
  { n: '孔金属化', kb: '钻孔文件（同上）', layers: ['Edge.Cuts', 'Drill'], file: '（同上）', lesson: 5,
    x: '先清掉孔壁上的树脂渣，再用化学方法沉一层很薄的铜，让本来绝缘的孔壁能导电；接着整板电镀，把孔壁和表面的铜一起加厚。',
    f: [['孔壁铜厚', 'JLC 写平均 18 µm'], ['表面铜', '常见做法：0.5 oz 铜箔电镀到 1 oz'], ['QB12', `${pthN} 个金属化孔在这一步把两层连通；${npthN} 个非金属化孔最后不留铜`]],
    d: `过孔能把顶层和底层连起来，全靠这一步。孔越小、板越厚越难镀，所以 0.15 mm 的孔在嘉立创算“非常规”。QB12 最小的孔 ${RU.min_through_hole_diameter} mm。`, src: 'JLC 制造流程、JLC 铜箔说明、JLC 能力页、嘉立创工艺能力' },
  { n: '图形转移', kb: 'F.Cu、B.Cu', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias'], file: `${GF('F_Cu.gtl')}、${GF('B_Cu.gbl')}`, lesson: 4,
    x: '板面贴一层感光干膜，按铜层图形曝光，再显影：要留铜的线路露出来，其余被干膜盖住（正片工艺）。传统用菲林曝光，JLC 现在用激光直接成像（LDI）。',
    f: [['QB12 顶层', `${S.tracks_F} 段走线 + 铺铜`], ['QB12 底层', `${S.tracks_B} 段走线 + 铺铜`], ['非金属化孔', '被干膜封住']],
    d: `最小线宽 / 线距（JLC 1 oz 双层板 0.10 / 0.10 mm）就卡在成像和蚀刻的精度上。QB12 最细的线 ${S.min_track} mm、规则最小间距 ${RU.min_clearance} mm，余量很大。`, src: 'JLC 制造流程、JLC 能力页、嘉立创工艺能力' },
  { n: '图形电镀', kb: 'F.Cu、B.Cu（同上）', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias'], file: '（同上）', lesson: 5,
    x: '在露出来的线路上再镀一层铜，接着镀一层锡。锡是临时的“保护罩”，下一步蚀刻时护住线路。',
    f: [['镀在哪', '只镀露出来的线路、焊盘、孔壁'], ['QB12 铜面', `顶层铺铜占 ${pct(aF, area)}%，底层 ${pct(aB, area)}%`]],
    d: '电镀电流在整板上分布不均匀：孤立的细线和大片铜面镀出来的厚度不一样，所以铜尽量铺得均匀。', src: 'JLC 制造流程、嘉立创工艺能力、JLC 铜箔说明' },
  { n: '蚀刻', kb: 'F.Cu、B.Cu（同上）', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias'], file: '（同上）', lesson: 4,
    x: '去掉干膜，把没有锡保护的铜蚀刻掉，再把锡退掉，露出铜线路。然后用 AOI（自动光学检测）拍照，和你的 Gerber 逐点比对，找断线、短路。',
    f: [['线宽公差', '±20%'], ['QB12 的 ' + S.min_track + ' mm 线', `做出来 ${r3(S.min_track * 0.8)}–${r3(S.min_track * 1.2)} mm 都算合格`]],
    d: '蚀刻过头线会变细，不够会留残铜短路。AOI 拿你的 Gerber 当“标准答案”：Gerber 本身画错了，AOI 查不出来。', src: 'JLC 制造流程、JLC 工厂参观、JLC 能力页' },
  { n: '阻焊', kb: 'F.Mask、B.Mask', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias', 'F.Mask'], file: `${GF('F_Mask.gts')}、${GF('B_Mask.gbs')}`, lesson: 2,
    x: '整板涂上感光阻焊油墨（LPI），曝光、显影出焊盘开窗，再烘烤固化。过孔盖油也是在这一步。',
    f: [['QB12 开窗', `顶面 ${openF.length} 个、底面 ${openB.length} 个`], ['过孔', `不单独开窗：${D.vias.length - VIN.length} 个盖油，${VIN.length} 个在散热焊盘开窗里`]],
    d: `两个开窗之间要留得住一条油（阻焊桥）：1 oz 绿油至少 0.10 mm，黑、白油 0.13 mm。QB12 最窄 ${DAM.g} mm（${DAM.ref}）。`, src: 'JLC 制造流程、JLC 能力页' },
  { n: '丝印', kb: 'F.Silkscreen、B.Silkscreen', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias', 'F.Mask', 'F.SilkS'], file: `${GF('F_Silkscreen.gto')}、${GF('B_Silkscreen.gbo')}`, lesson: 6,
    x: '把位号、极性点、文字印到阻焊上，再固化。',
    f: [['QB12 顶面', `${refsShown} 个位号`], ['QB12 底面', `${backTexts.length} 条说明`]],
    d: 'JLC 要求丝印线宽 ≥ 0.15 mm、字高 ≥ 1.0 mm、离焊盘 ≥ 0.15 mm；KiCad 新建文字默认字粗只有 0.1 mm，要改。', src: 'JLC 制造流程、JLC 能力页、KiCad 10 源码默认值' },
  { n: '表面处理', kb: '没有对应的层', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias', 'F.Mask', 'F.SilkS'], file: '没有文件：下单页选', lesson: 8,
    x: '给开窗露出来的铜盖一层保护层：喷锡（HASL）、沉金（ENIG）等，防止氧化，又好焊。KiCad 里没有这一层。',
    f: [['在哪', `只在开窗处：顶面 ${openF.length} 个、底面 ${openB.length} 个`], ['QB12 选哪种', '<a href="#p1-s5">本课 1.5</a>']], fin: true,
    d: '喷锡便宜但表面不平，不适合脚很密的芯片；沉金平整，但更贵、受金价影响。', src: 'JLC 表面处理说明' },
  { n: '电测', kb: '你的网络连接', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias', 'F.Mask', 'F.SilkS'], file: '按你的设计（网络连接）', lesson: 6,
    x: '用飞针等方法按网络逐个测：该通的通、不该通的不通。',
    f: [['QB12', `${S.nets} 个网络`], ['怎么测', '2 层板是全测还是抽测，看下单页的电测选项']],
    d: '电测只能查出“做出来的和设计不一样”。设计本身就连错了，它测不出来，所以 DRC（第 6 课）要自己做。', src: 'JLC 制造流程' },
  { n: '成型', kb: 'Edge.Cuts', layers: ['Edge.Cuts', 'Drill', 'F.Cu', 'Zones', 'Vias', 'F.Mask', 'F.SilkS'], file: GF('Edge_Cuts.gm1'), lesson: 3,
    x: '按板框用 CNC 锣刀把单板（或拼板）铣下来，拼板也可以用 V 割。之后终检、包装、出货。',
    f: [['QB12 外形', `${sizeTxt}，圆角 R${S.corner_r}`], ['外形公差', '锣边 ±0.2 mm，V 割 ±0.4 mm']],
    d: `铜要离板边至少 0.2 mm（锣边）或 0.4 mm（V 割）。QB12 的规则是铜到板边 ≥ ${RU.min_copper_edge_clearance} mm。`, src: 'JLC 制造流程、JLC 能力页' }
];
const FB = BoardViewer.create($('fbv'), { toolbar: false, panel: false, hover: false, mode: 'made', layers: [], label: '工厂每一步之后的 QB12' });
const fst = { i: 0, col: 'made', fin: 'hasl', playing: false, tok: 0 };
const LTITLE = ['', 'PCB 是什么做的', '封装：从符号到焊盘', '板框与布局', '走线', '过孔与铺铜', '检查：DRC 与 3D', '出生产文件', '下单与到货'];
$('fsteps').innerHTML = FSTEPS.map((s, i) => `<button class="btn" data-p1fs="${i}" aria-pressed="false"><span class="p1-mono">${i + 1}</span> ${s.n}</button>`).join('');

/* 剖面图 */
const XS = (function () {
  const svg = $('xsec');
  const X0 = 20, XE = 560, XP = 620, CT = 100, CB = 158;
  const TOPP = [[40, 110], [140, 165], [200, 250], [280, 425], [515, 546]];
  const BOTP = [[200, 330], [360, 445], [515, 546]];
  const VIA = [217, 233], NP = [470, 490], PAD = [40, 110];
  const el = (t, a, p, x) => C.el(t, a, p || svg, x);
  const R = (x, y, w, h, cls, p) => el('rect', { x: r3(x), y: r3(y), width: r3(Math.max(0, w)), height: r3(Math.max(0, h)), class: cls }, p);
  const inAny = (x, segs) => segs.some(s => x >= s[0] && x <= s[1]);
  function minus(span, cuts) {     // 从 [a,b] 里挖掉若干段
    let out = [span];
    cuts.forEach(([c0, c1]) => { out = out.flatMap(([a, b]) => (c1 <= a || c0 >= b) ? [[a, b]] : [[a, Math.max(a, c0)], [Math.min(b, c1), b]].filter(s => s[1] - s[0] > 0.5)); });
    return out;
  }
  function draw(i, fin) {
    svg.innerHTML = '';
    const nar = (svg.parentNode.clientWidth || 640) < 520;
    svg.classList.toggle('n', nar);
    const right = i >= 10 ? XE : XP;
    const g = el('g', { class: 'p1-xs' + (i >= 10 ? ' cut' : '') });
    const holes = i >= 1 ? [VIA, NP] : [];
    // 芯板（钻孔后挖掉孔）
    minus([X0, right], holes).forEach(([a, b]) => R(a, CT, b - a, CB - CT, 'p1-xfr4w', g));
    // 铜厚：底铜 5 → 板电 8 → 图形电镀后 14
    const base = i >= 2 ? 8 : 5, pat = i >= 4 ? 14 : base;
    const etched = i >= 5;
    // 铜：蚀刻前整面都是铜（挖掉孔），图形电镀后图形处更厚；蚀刻后只剩图形。非金属化孔周围的铺铜本来就让开了
    const copper = (segs, top) => {
      const cuts = new Set([X0, right]);
      segs.concat(holes).forEach(([a, b]) => { cuts.add(a); cuts.add(b); });
      const xs = [...cuts].filter(x => x >= X0 && x <= right).sort((a, b) => a - b);
      const runs = [];
      for (let k = 0; k < xs.length - 1; k++) {
        const a = xs[k], b = xs[k + 1], m = (a + b) / 2;
        if (holes.some(h => m > h[0] && m < h[1])) continue;
        const onPat = inAny(m, segs);
        if (etched && !onPat) continue;
        const th = onPat ? pat : base;
        const last = runs[runs.length - 1];
        if (last && Math.abs(last[1] - a) < 0.01 && last[2] === th) last[1] = b; else runs.push([a, b, th]);
      }
      runs.forEach(([a, b, th]) => { if (top) R(a, CT - th, b - a, th, 'p1-xcu', g); else R(a, CB, b - a, th, 'p1-xcu', g); });
    };
    copper(TOPP, true); copper(BOTP, false);
    // 孔壁镀铜
    if (i >= 2) {
      const w = i >= 4 ? 4 : 2.5;
      R(VIA[0], CT - pat, w, CB - CT + 2 * pat, 'p1-xcu', g); R(VIA[1] - w, CT - pat, w, CB - CT + 2 * pat, 'p1-xcu', g);
    }
    // 干膜（第 4、5 步）
    if (i === 3 || i === 4) {
      const filmT = [CT - base - 12, 12], filmB = [CB + base, 12];
      minus([X0, right], TOPP).forEach(([a, b]) => R(a, filmT[0], b - a, filmT[1], 'p1-xfilm', g));
      minus([X0, right], BOTP).forEach(([a, b]) => R(a, filmB[0], b - a, filmB[1], 'p1-xfilm', g));
      if (i === 3) {
        for (let x = 60; x < 600; x += 70) el('path', { d: `M${x} 42L${x} ${CT - base - 16}M${x - 5} ${CT - base - 24}L${x} ${CT - base - 15}L${x + 5} ${CT - base - 24}`, class: 'p1-uv' }, g);
      }
    }
    // 锡（第 5 步）
    if (i === 4) {
      TOPP.forEach(([a, b]) => minus([a, b], holes).forEach(([p, q]) => R(p, CT - pat - 4, q - p, 4, 'p1-xtin', g)));
      BOTP.forEach(([a, b]) => minus([a, b], holes).forEach(([p, q]) => R(p, CB + pat, q - p, 4, 'p1-xtin', g)));
      R(VIA[0] + 4, CT - pat, 2, CB - CT + 2 * pat, 'p1-xtin', g); R(VIA[1] - 6, CT - pat, 2, CB - CT + 2 * pat, 'p1-xtin', g);
    }
    // 钻头（第 2 步）
    if (i === 1) {
      [VIA, NP].forEach(([a, b]) => {
        const cx = (a + b) / 2, w = b - a;
        const d = el('g', { class: 'p1-drillbit' }, g);
        R(cx - w / 2, 40, w, 38, 'p1-bit', d); el('path', { d: `M${cx - w / 2} 78L${cx} 90L${cx + w / 2} 78Z`, class: 'p1-bit' }, d);
        el('path', { d: `M${cx - w / 2} 48L${cx + w / 2} 56M${cx - w / 2} 60L${cx + w / 2} 68`, class: 'p1-bitl' }, d);
      });
    }
    // 阻焊（第 7 步起）：贴着表面起伏，焊盘和非金属化孔处开窗，过孔被盖住
    const MK = 7;
    if (i >= 6) {
      const surf = (segs, top) => {
        const pts = new Set([X0, right]);
        segs.concat([PAD, VIA, NP]).forEach(([a, b]) => { pts.add(a); pts.add(b); });
        const xs = [...pts].filter(x => x >= X0 && x <= right).sort((a, b) => a - b);
        for (let k = 0; k < xs.length - 1; k++) {
          const a = xs[k], b = xs[k + 1], m = (a + b) / 2;
          if (top && m > PAD[0] && m < PAD[1]) continue;
          if (m > NP[0] && m < NP[1]) continue;
          const h = (inAny(m, segs) || (m > VIA[0] && m < VIA[1])) ? pat : 0;
          if (top) R(a, CT - h - MK, b - a, MK, 'p1-xmask', g); else R(a, CB + h, b - a, MK, 'p1-xmask', g);
        }
        // 铜的侧面也被油包住
        segs.forEach(([a, b]) => {
          [[a - MK * 0.6, a], [b, b + MK * 0.6]].forEach(([p, q]) => {
            if (top && ((p >= PAD[0] - 1 && p <= PAD[1] + 1) || (q >= PAD[0] - 1 && q <= PAD[1] + 1))) return;
            if (q > X0 && p < right) { if (top) R(p, CT - pat - MK, q - p, pat + MK, 'p1-xmask', g); else R(p, CB, q - p, pat + MK, 'p1-xmask', g); }
          });
        });
      };
      surf(TOPP, true); surf(BOTP, false);
    }
    // 丝印（第 8 步起）
    if (i >= 7) [[310, 326], [334, 346], [354, 384]].forEach(([a, b]) => R(a, CT - pat - MK - 4, b - a, 4, 'p1-xsilk', g));
    // 表面处理（第 9 步起）
    if (i >= 8) {
      if (fin === 'enig') R(PAD[0], CT - pat - 3, PAD[1] - PAD[0], 3, 'p1-xenig', g);
      else el('path', { d: `M${PAD[0]} ${CT - pat}C${PAD[0] + 8} ${CT - pat - 7} ${PAD[0] + 22} ${CT - pat - 9} ${PAD[0] + 34} ${CT - pat - 7}S${PAD[1] - 10} ${CT - pat - 4} ${PAD[1]} ${CT - pat}Z`, class: 'p1-xhasl' }, g);
    }
    // 飞针（第 10 步）
    if (i === 9) {
      const tipY = CT - pat - (fin === 'enig' ? 3 : 7);
      const pr = el('g', { class: 'p1-router' }, g);
      el('path', { d: `M20 40L${PAD[0] + 30} ${tipY}`, class: 'p1-probe' }, pr);
      el('circle', { cx: PAD[0] + 30, cy: tipY, r: 3, class: 'p1-probet' }, pr);
      el('text', { x: 130, y: 66, class: 'p1-xl' }, g, '← 飞针碰焊盘');
    }
    // 锣刀（第 11 步）
    if (i === 10) {
      const rb = el('g', { class: 'p1-router' }, g);
      R(XE + 1, 40, 16, CB - 28, 'p1-bit', rb);
      el('path', { d: `M${XE + 1} 50L${XE + 17} 60M${XE + 1} 76L${XE + 17} 86M${XE + 1} 102L${XE + 17} 112`, class: 'p1-bitl' }, rb);
    }
    // 板边线
    el('line', { x1: XE, y1: 40, x2: XE, y2: 196, class: 'p1-xedge' + (i >= 10 ? ' on' : '') });
    // 标签
    const lab = [];
    if (i >= 1) lab.push([(VIA[0] + VIA[1]) / 2, '过孔'], [(NP[0] + NP[1]) / 2, 'NPTH']);
    if (i >= 5) lab.push([75, '焊盘'], [152, '走线'], [352, '铺铜']);
    lab.push([XE, i >= 10 || nar ? '板边' : '将来的板边']);
    lab.forEach(([x, t]) => el('text', { x, y: 30, 'text-anchor': 'middle', class: 'p1-xl' + (t === '将来的板边' ? ' mu' : '') }, g, t));
    if (i === 0) el('text', { x: 290, y: 70, 'text-anchor': 'middle', class: 'p1-xl' }, g, '覆铜板：FR-4 芯板 + 两面铜箔');
    if (i === 5) el('text', { x: 290, y: 66, 'text-anchor': 'middle', class: 'p1-xl mu' }, g, '没被锡护住的铜蚀刻掉了');    // 图例
    const leg = [['p1-xfr4w', 'FR-4'], ['p1-xcu', '铜']];
    if (i === 3 || i === 4) leg.push(['p1-xfilm', '干膜']);
    if (i === 4) leg.push(['p1-xtin', '锡']);
    if (i >= 6) leg.push(['p1-xmask', '阻焊']);
    if (i >= 7) leg.push(['p1-xsilk', '丝印']);
    if (i >= 8) leg.push([fin === 'enig' ? 'p1-xenig' : 'p1-xhasl', fin === 'enig' ? '沉金' : '喷锡']);
    let lx = 20;
    const cw = nar ? 26 : 14, sq = nar ? 22 : 14;
    leg.forEach(([c, t]) => {
      R(lx, 218 - sq, sq, sq, c, g).setAttribute('rx', 3);
      el('text', { x: lx + sq + 5, y: 216, class: 'p1-xl sm' }, g, t);
      lx += sq + 5 + [...t].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? cw : cw * 0.62), 0) + (nar ? 20 : 24);
    });
  }
  return { draw };
})();

function fabCard(i) {
  const s = FSTEPS[i];
  $('f-t').textContent = `第 ${i + 1} 步 · ${s.n}`;
  $('f-x').textContent = s.x;
  $('f-f').innerHTML = [['用到的文件', s.file]].concat(s.f).map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('') +
    (s.fin ? `<div class="p1-finrow"><span>剖面里画成</span><span><button class="bv-chip" data-p1ff="hasl" aria-pressed="${fst.fin === 'hasl'}">喷锡</button> <button class="bv-chip" data-p1ff="enig" aria-pressed="${fst.fin === 'enig'}">沉金</button></span></div>` : '');
  $('f-d').innerHTML = `<b>对设计的意思：</b>${s.d}`;
  $('f-s').textContent = '出处：' + s.src;
  const l = $('f-l');
  l.href = '#p' + s.lesson; l.textContent = `第 ${s.lesson} 课：${LTITLE[s.lesson]} →`;
  $('flab').textContent = `${i + 1} / ${FSTEPS.length}`;
  C.pressOne('#p1-fsteps [data-p1fs]', 'p1fs', i);
}
$('f-f').addEventListener('click', e => {
  const b = e.target.closest('[data-p1ff]'); if (!b) return;
  fst.fin = b.dataset.p1ff; fabCard(fst.i); XS.draw(fst.i, fst.fin); fabBoard(fst.i, true);
});
function probeAnn() {
  const n = QB.net('3V3'), g = QB.net('GND');
  const at = s => { const [r, num] = s.split('.'); const f = QB.fp(r); const p = f && f.pads.find(q => q.n === num); return p ? [p.x, p.y] : null; };
  const a = at(n.pads.find(s => s.startsWith('U3'))), b = at(n.pads.find(s => s.startsWith('U1'))), c = at(g.pads.find(s => s.startsWith('U3')));
  const k = annPx(FB);
  FB.annotate((gg, m) => {
    gg.setAttribute('class', 'p1-ann');
    if (a && b) m.el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'p1-al ok' });
    if (a && c) m.el('line', { x1: a[0], y1: a[1], x2: c[0], y2: c[1], class: 'p1-al no' });
    [a, b, c].forEach(p => { if (p) m.el('circle', { cx: p[0], cy: p[1], r: r3(7 / k), class: 'p1-pt' }); });
  });
}
function fabBoard(i, quick) {
  const el = $('fbv');
  el.dataset.fs = i; el.dataset.fc = fst.col;
  FB.clear(); FB.clearAnnotations();
  const s = FSTEPS[i];
  if (fst.col === 'kicad') {
    FB.show({ mode: 'layers', side: 'top', layers: s.layers, tracks: true });
    FB.badge('这一步用：' + s.kb);
  } else {
    FB.show({ mode: 'made', side: 'top', layers: [], finish: fst.fin, mask: 'green', tracks: true });
    FB.badge(i === 9 ? '10 电测：绿线两头该通，橙虚线两头不该通' : `${i + 1} ${s.n}`);
    if (i === 1 && !quick) FB.reveal('Drill', { duration: 0.8 });
  }
  if (i === 9) requestAnimationFrame(probeAnn);
  if (i === 10) {
    FB.annotate(g => { g.setAttribute('class', 'p1-ann'); g.innerHTML = `<path d="${OUTLINE}" class="p1-cutline"/>`; });
  }
}
function goFab(i, quick) {
  fst.i = Math.max(0, Math.min(FSTEPS.length - 1, i));
  fabCard(fst.i);
  XS.draw(fst.i, fst.fin);
  const x = $('xsec');
  if (!RMx && !quick) { x.classList.remove('p1-anim'); void x.getBoundingClientRect(); x.classList.add('p1-anim'); }
  fabBoard(fst.i, quick);
}
$('fsteps').addEventListener('click', e => { const b = e.target.closest('[data-p1fs]'); if (b) { stopFab(); goFab(+b.dataset.p1fs); } });
$('fprev').addEventListener('click', () => { stopFab(); goFab(fst.i - 1); });
$('fnext').addEventListener('click', () => { stopFab(); goFab(fst.i + 1); });
document.querySelectorAll('#p1 [data-p1fc]').forEach(b => b.addEventListener('click', () => {
  fst.col = b.dataset.p1fc; C.pressOne('#p1 [data-p1fc]', 'p1fc', fst.col); fabBoard(fst.i, true);
}));
const fplay = $('fplay');
function stopFab() { fst.playing = false; fst.tok++; fplay.textContent = '▶ 播放'; }
fplay.addEventListener('click', async () => {
  if (fst.playing) { stopFab(); return; }
  fst.playing = true; const my = ++fst.tok; fplay.textContent = '■ 停止';
  for (let i = fst.i >= FSTEPS.length - 1 ? 0 : fst.i; i < FSTEPS.length; i++) {
    if (my !== fst.tok) return;
    goFab(i);
    await wait(RMx ? 1600 : 2600);
  }
  if (my === fst.tok) stopFab();
});
XS.draw(0, 'hasl'); fabCard(0);
C.onVisible($('fbv'), () => fabBoard(fst.i, true), '300px');

/* ===================================================================
   1.5 表面处理 × 阻焊颜色
   =================================================================== */
const NB = BoardViewer.create($('fnbv'), { toolbar: false, panel: false, hover: true, mode: 'made', layers: [], label: 'QB12 的 USB-C 口附近，换表面处理和阻焊颜色' });
const fsel = { fin: 'lf', mask: 'green' };
const FIN = { lf: '无铅喷锡', pb: '有铅喷锡', enig: '沉金' }, MSK = { green: '绿油', black: '黑油', blue: '蓝油' };
function finCard() {
  const { fin, mask } = fsel;
  C.pressOne('#p1 [data-p1fin]', 'p1fin', fin); C.pressOne('#p1 [data-p1msk]', 'p1msk', mask);
  NB.show({ mode: 'made', finish: fin === 'enig' ? 'enig' : 'hasl', mask });
  $('fn-t').textContent = `${FIN[fin]} + ${MSK[mask]}`;
  const ck = (cls, t) => `<div class="p1-ck ${cls}"><i>${cls === 'good' ? '✓' : cls === 'bad' ? '✗' : '!'}</i><span>${t}</span></div>`;
  let h = '';
  h += fin === 'enig' ? ck('good', `表面平整，适合脚很密的芯片。QB12 最密的是 ${minPitch.ref}（USB-C），脚距 ${minPitch.p} mm。`)
    : ck('warn', `表面不平：JLC 说喷锡不适合脚很密的芯片。QB12 最密的是 ${minPitch.ref}（USB-C），脚距 ${minPitch.p} mm；U2 是 ${pitchU2} mm。`);
  h += fin === 'pb' ? ck('bad', '含铅，不符合 RoHS 环保要求。') : ck('good', '无铅，符合 RoHS。');
  h += fin === 'enig' ? ck('warn', '更贵，价格跟着金价走；差多少看下单页。') : ck('good', '便宜。');
  const dam = mask === 'black' ? 0.13 : 0.10;
  h += ck(DAM.g >= dam ? 'good' : 'bad', `阻焊桥：${MSK[mask]}（1 oz）要求至少 ${nf(dam)} mm，QB12 最窄 ${DAM.g} mm，够。`);
  if (mask === 'green') h += ck('good', '经济型贴片 1.6 mm 绿油：无铅 / 有铅喷锡、沉金都列出来了。');
  else if (fin === 'enig') h += ck('bad', `经济型贴片 1.6 mm ${MSK[mask]}只列了喷锡，没有沉金。`);
  else h += ck('warn', `经济型贴片 1.6 mm ${MSK[mask]}只列了“喷锡”${mask === 'blue' ? '，而且数量 5–30 片' : ''}；有铅无铅看下单页。`);
  $('fn-ck').innerHTML = h + '<p class="p1-note">以上可选组合抄自 JLC 贴片能力页，随时会变，以下单页为准。</p>';
}
document.querySelectorAll('#p1 [data-p1fin]').forEach(b => b.addEventListener('click', () => { fsel.fin = b.dataset.p1fin; finCard(); }));
document.querySelectorAll('#p1 [data-p1msk]').forEach(b => b.addEventListener('click', () => { fsel.mask = b.dataset.p1msk; finCard(); }));
C.onVisible($('fnbv'), () => { NB.focus('usb', { pad: 0.4, animate: false }); finCard(); }, '300px');
$('fn-t').textContent = `${FIN.lf} + ${MSK.green}`;

/* 下单建议表 */
(function () {
  const rows = [
    ['板材', 'FR-4，普通 Tg（约 130–140 °C）', 'JLC 说消费电子、简单双层板用普通 FR-4 就够（1.2）'],
    ['层数', `${S.copper_layers} 层`, '设计就是双层板；上传 Gerber 后下单页会自己认出来'],
    ['板厚', `${TH} mm`, `设计按 ${TH} mm 画；经济型贴片要求 0.8–1.6 mm，正好在范围里`],
    ['外层铜厚', '1 oz', `规则最小间距 ${RU.min_clearance} mm 只够 1 oz（2 oz 要 0.16 mm）；大电流靠加宽线（1.2、第 4 课）`],
    ['阻焊颜色', '绿', `阻焊桥要求最低（≥ 0.10 mm，QB12 最窄 ${DAM.g} mm），经济型贴片能配的表面处理最多`],
    ['字符颜色', '白', 'JLC 交期表的基准配置就是“绿油白字”'],
    ['表面处理', '无铅：沉金（稳妥）或无铅喷锡（省钱）', `USB-C 脚距只有 ${minPitch.p} mm，喷锡不平（JLC 没写多细才算“很密”，这里按 USB-C 从稳）；差价看下单页再定。有铅喷锡不环保，不选`],
    ['以上全部', '以下单页为准', '工厂没写默认值，下单页上能选什么、价格多少都会变（第 8 课）']
  ];
  $('rec').querySelector('tbody').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td data-l="建议"><b>${r[1]}</b></td><td data-l="为什么">${r[2]}</td></tr>`).join('');
})();

/* ===================================================================
   1.6 自测
   =================================================================== */
(function () {
  $('q1').innerHTML = `没有油。F.Mask 画的是<strong>开窗</strong>：画了的地方工厂把油冲掉，露出铜焊盘；没画的地方全部盖油。QB12 顶面 ${openF.length} 个开窗（${smdN} 个贴片焊盘 + ${holeOpenF} 个通孔），底面 ${openB.length} 个。过孔都没有单独开窗（导出的 F.Mask 文件里没有它们），所以被绿油盖住，看起来是绿的；只有 ${VINref} 散热焊盘里的 ${VIN.length} 个散热过孔落在焊盘的开窗范围里，顶面跟着露出来。焊盘露在外面，做完表面处理是银色（喷锡）或金色（沉金）。`;
  $('q2').innerHTML = `约 35 µm（0.035 mm）。两层加起来 70 µm，只占 ${TH} mm 板厚的 ${cuPct}%，FR-4 芯板占 ${corePct}%。QB12 用不着 2 oz：大电流靠把线加宽到 0.8 mm 解决（第 4 课）；而且 2 oz 的最小线距是 0.16 mm，QB12 的规则允许 ${RU.min_clearance} mm，2 oz 的阻焊桥要 0.20 mm，QB12 最窄正好 ${DAM.g} mm，没有余量。`;
  $('q3').innerHTML = '先钻孔。孔钻好以后马上做孔金属化：孔壁沉铜、电镀，过孔才能把两层铜连起来。电镀要给铜通电，这时整面铜还连成一片，好镀；等线路蚀刻出来，铜被分成很多互不相连的小块，就没法这样镀了。所以顺序是：钻孔 → 孔金属化 → 图形转移 → 图形电镀 → 蚀刻。';
  document.querySelectorAll('#p1 [data-p1q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p1q;
    const go = el => el.scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });
    if (q === '1') { go($('mkbv')); goMk(1); }
    else if (q === '2') { go($('thsvg')); thick.set('real'); }
    else { go($('xsec')); stopFab(); goFab(1); }
  }));
})();
