/* 第 7 课：出生产文件。所有数字都从 QB.board（真实设计文件和交付文件抽出来的数据）现算，不手写。 */
const D = QB.board, S = D.stats, F = D.fab;
const $ = id => document.getElementById('p7-' + id);
const RMx = C.RM;
const BW = D.board.w, BH = D.board.h;
const nf = v => Number(v).toLocaleString('zh-CN');
const kb = b => (b / 1024).toFixed(1) + ' KB';
const f3 = v => (Math.round(v * 1000) / 1000).toFixed(3);
const f1 = v => String(Math.round(v * 1000) / 1000);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const natural = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });
const mod360 = a => ((Math.round(a) % 360) + 360) % 360;
const near = (a, b, t) => Math.abs(a - b) < (t || 1e-6);
const outlineD = 'M' + D.board.outline.map(p => p.join(' ')).join('L') + 'Z';
const lazy = (el, init) => { const o = { done: false }; C.onVisible(el, () => { if (!o.done) { o.done = true; init(); } }, '600px'); return o; };
const ALLPADS = [];
D.footprints.forEach(f => f.pads.forEach(p => ALLPADS.push(Object.assign({ ref: f.ref }, p))));

/* ---------- 交付文件里的数字 ---------- */
const fkey = name => name.replace(/^QB12-/, '').replace(/\.\w+$/, '');
const GB = Object.fromEntries(F.gerbers.map(g => [fkey(g.file), g]));
const gbTotal = F.gerbers.reduce((a, g) => a + g.bytes, 0);
const gerbN = F.gerbers.filter(g => !g.file.endsWith('.drl')).length;
const drlN = F.gerbers.length - gerbN;
const pthN = F.pth.reduce((a, t) => a + t.n, 0), npthN = F.npth.reduce((a, t) => a + t.n, 0);
const slotN = F.pth.reduce((a, t) => a + t.slots, 0) + F.npth.reduce((a, t) => a + t.slots, 0);
const viaHoleN = F.pth.filter(t => t.kind === 'ViaDrill').reduce((a, t) => a + t.n, 0);
const maskF = ALLPADS.filter(p => p.mask && p.mask.includes('F')).length;
// 落在顶面焊盘开窗里的过孔（U2、U4 散热焊盘上的散热过孔）：没有单独开窗，但顶面跟着焊盘露出来
const viaInEP = D.vias.filter(v => ALLPADS.some(p => { if (!(p.mask && p.mask.includes('F') && p.cu.includes('F'))) return false; const r = Math.abs(Math.round(p.a || 0)) % 180 === 90, w = r ? p.h : p.w, h = r ? p.w : p.h; return Math.abs(v.x - p.x) <= w / 2 + 1e-6 && Math.abs(v.y - p.y) <= h / 2 + 1e-6; })).length;
const maskB = ALLPADS.filter(p => p.mask && p.mask.includes('B')).length;
const pasteF = ALLPADS.filter(p => p.paste).length;
const pasteB = ((QB.layers['B.Paste'] || '').match(/<(path|circle|rect|polygon)/g) || []).length;
const epPads = ALLPADS.filter(p => p.pasteRatio != null);
const epK = epPads.length ? 1 + 2 * epPads[0].pasteRatio : 1;           // 钢网开口边长 / 焊盘边长
const bomQty = F.bom.reduce((a, r) => a + (+r[3]), 0);
const bomRefs = F.bom.flatMap(r => r[1].split(','));
const cplRefs = F.cpl.map(r => r[0]);
const refsShown = D.footprints.filter(f => f.refShown).length;
const hiddenRefs = S.refs_hidden || D.footprints.filter(f => !f.refShown).map(f => f.ref);
const kindOf = ref => QB.fp(ref).kind;
// 要核对方向的：除电阻、电容和两个按键以外的全部（SW2、SW3 只用对角两个脚，怎么转都通，见 build_board.py）
const POLAR = D.footprints.filter(f => !['r', 'c', 'sw'].includes(f.kind)).map(f => f.ref).sort(natural);
const SWD = D.footprints.filter(f => f.kind === 'sw').map(f => f.ref).sort(natural);
const silkCut = (D.drc.by_type.find(t => t.type === 'silk_over_copper') || { n: 0, zh: '' });

/* 锚点离焊盘中心多远（KiCad 导出的是锚点） */
function padCenter(f) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  f.pads.forEach(p => {
    if (p.t === 'npth') return;
    if (p.poly) { p.poly[0].forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); return; }
    const a = (p.a || 0) * Math.PI / 180, ex = Math.abs(p.w / 2 * Math.cos(a)) + Math.abs(p.h / 2 * Math.sin(a)), ey = Math.abs(p.w / 2 * Math.sin(a)) + Math.abs(p.h / 2 * Math.cos(a));
    x0 = Math.min(x0, p.x - ex); x1 = Math.max(x1, p.x + ex); y0 = Math.min(y0, p.y - ey); y1 = Math.max(y1, p.y + ey);
  });
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}
const anchorOff = D.footprints.map(f => { const c = padCenter(f); return [f.ref, Math.hypot(c[0] - f.x, c[1] - f.y)]; }).sort((a, b) => b[1] - a[1]);

/* ================= 7.1 文件 → 工序 ================= */
const FILES = [
  { k: 'F_Cu', zh: '顶层铜', kind: 'img' }, { k: 'B_Cu', zh: '底层铜', kind: 'img' },
  { k: 'F_Mask', zh: '顶层阻焊', kind: 'img' }, { k: 'B_Mask', zh: '底层阻焊', kind: 'img' },
  { k: 'F_Silkscreen', zh: '顶层丝印', kind: 'img' }, { k: 'B_Silkscreen', zh: '底层丝印', kind: 'img' },
  { k: 'F_Paste', zh: '顶层钢网', kind: 'img' }, { k: 'B_Paste', zh: '底层钢网', kind: 'img' },
  { k: 'Edge_Cuts', zh: '板框', kind: 'img' }, { k: 'PTH', zh: '金属化孔', kind: 'drl' }, { k: 'NPTH', zh: '非金属化孔', kind: 'drl' },
  { k: 'BOM', zh: '物料清单', kind: 'tab', file: 'QB12_BOM_嘉立创SMT.csv' }, { k: 'CPL', zh: '坐标文件', kind: 'tab', file: 'QB12_CPL_坐标文件.csv' }
].map(x => Object.assign(x, { file: x.file || (GB[x.k] && GB[x.k].file), bytes: GB[x.k] ? GB[x.k].bytes : null }));
const FI = Object.fromEntries(FILES.map(f => [f.k, f]));
const GERB = FILES.filter(f => f.kind !== 'tab').map(f => f.k);
const ICON = {
  cam: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><circle cx="11" cy="10" r="3"/><path d="M13.2 12.2l2.6 2.6"/>',
  drill: '<path d="M12 2v4M9 6h6l-1 4h-4zM12 10v6l-2 2 2 2 2-2-2-2"/><path d="M4 22h16"/>',
  plate: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M10 4v16M14 4v16"/><path d="M10.9 4v16M13.1 4v16" stroke-width="2.4" opacity=".55"/>',
  etch: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6 8h6v5h6M6 16h4"/><circle cx="18" cy="13" r="1.2"/><circle cx="12" cy="8" r="1.2"/>',
  aoi: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  mask: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5" opacity=".7"/><path d="M3 16l9 5 9-5" opacity=".45"/>',
  silk: '<path d="M5 20L11 4h2l6 16M8 14h8"/>',
  route: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M2 12h2M20 12h2M12 2v2M12 20v2" /><circle cx="19" cy="5" r="2"/>',
  stencil: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 9h2v2H7zM11 9h2v2h-2zM15 9h2v2h-2zM7 13h2v2H7zM15 13h2v2h-2z"/>',
  feed: '<circle cx="9" cy="12" r="7"/><circle cx="9" cy="12" r="2"/><path d="M9 19h12M16 17v4M19 17v4"/>',
  pnp: '<path d="M10 2h4v7h-4zM11 9h2v4h-2z"/><path d="M12 13v3"/><rect x="8" y="17" width="8" height="4" rx="1"/>',
  reflow: '<path d="M6 20c-2-3 2-5 0-8M12 20c-2-3 2-5 0-8M18 20c-2-3 2-5 0-8"/><path d="M3 6h18"/>'
};
const STATIONS = [
  { id: 'cam', sec: 'PCB', name: 'CAM 审核', files: GERB,
    what: '工厂先把文件读进 CAM 软件，检查线宽线距、焊盘、孔径、铜到板边、阻焊开窗、外形、层对位能不能做。设计规则一开始就按厂家能力设，这一步才不会被退回或被工程师改稿。' },
  { id: 'drill', sec: 'PCB', name: '钻孔', files: ['PTH', 'NPTH'],
    what: `CNC 钻机按钻孔文件逐个打孔，几台同时钻，板上盖一块铝板帮助散热。QB12 一共 ${pthN + npthN} 个孔、${F.pth.length + F.npth.length} 种钻头。` },
  { id: 'plate', sec: 'PCB', name: '沉铜 · 电镀', files: ['PTH'],
    what: '先清掉孔壁的树脂残渣，化学沉一层薄铜，再电镀加厚，孔壁就导电了。只有 PTH 孔要这样；NPTH 孔被干膜封住，孔周 0.2 mm 的铜会被掏掉。' },
  { id: 'etch', sec: 'PCB', name: '线路成像 · 蚀刻', files: ['F_Cu', 'B_Cu'],
    what: '板面贴感光干膜，照着铜层的图形曝光、显影（传统用菲林，现在 JLC 用 LDI 激光直接成像），再把不要的铜蚀刻掉。最小线宽线距就受这一步限制。' },
  { id: 'aoi', sec: 'PCB', name: 'AOI 光学检测', files: ['F_Cu', 'B_Cu'],
    what: '拍高分辨率照片，和你的 Gerber 对比，找开路、短路、缺铜、多铜。它拿 Gerber 当标准答案，所以 Gerber 本身画错了，它查不出来。' },
  { id: 'mask', sec: 'PCB', name: '阻焊', files: ['F_Mask', 'B_Mask'],
    what: '整板涂感光阻焊油墨，照着阻焊层曝光、显影，焊盘露出来，其余地方盖油，再烘烤固化。' },
  { id: 'silk', sec: 'PCB', name: '字符（丝印）', files: ['F_Silkscreen', 'B_Silkscreen'],
    what: '把位号、极性标记、说明文字印上去，再固化。字太细会印不清：JLC 要求线宽 ≥ 0.15 mm、字高 ≥ 1 mm。' },
  { id: 'route', sec: 'PCB', name: '成型', files: ['Edge_Cuts'],
    what: '数控铣刀（锣边）沿板框把一块块板子从大板上切下来，普通锣边公差 ±0.2 mm。所以铜要离板边至少 0.2 mm，QB12 的规则是 0.3 mm。' },
  { id: 'stencil', sec: 'SMT', name: '钢网 · 刷锡膏', files: ['F_Paste', 'B_Paste'],
    what: `按钢网层在一张薄钢片上开孔，把锡膏刷过去，锡膏只从孔里漏到焊盘上。QB12 顶面 ${pasteF} 个开孔，底面 ${pasteB} 个，所以只需要顶面一张钢网。` },
  { id: 'feed', sec: 'SMT', name: '备料 · 上料', files: ['BOM'],
    what: `按 BOM 里的立创编号从元件库取料，装上贴片机的料站。基础库的料一直装在固定料站上；扩展库的料要人工上料，每种另收换料费（第 8 课）。QB12 一共 ${F.bom.length} 种料。` },
  { id: 'pnp', sec: 'SMT', name: '贴片机', files: ['CPL', 'BOM'],
    what: `吸嘴按坐标文件，把每个元件放到它的 (Mid X, Mid Y)、转到它的 Rotation。BOM 告诉它这个位号用哪种料。QB12 一共贴 ${F.cpl.length} 个，全在顶面。` },
  { id: 'reflow', sec: 'SMT', name: '回流焊', files: [],
    what: '过回流焊炉，锡膏熔化又凝固，元件就焊牢了。这一步不需要你给任何文件。' }
];
const FILE_WHAT = {
  F_Cu: '顶层铜箔的图形：焊盘、走线、整片铺地。', B_Cu: '底层铜箔的图形。', F_Mask: '顶面哪里不刷阻焊油（露出焊盘）。', B_Mask: '底面哪里不刷阻焊油。',
  F_Silkscreen: '顶面印什么字、什么框。', B_Silkscreen: '底面印什么字。', F_Paste: '顶面钢网在哪开孔、刷锡膏。', B_Paste: '底面钢网（QB12 是空的）。',
  Edge_Cuts: '板子的外形线，铣刀沿它切。', PTH: '要镀铜的孔：钻头尺寸 + 每个孔的坐标。', NPTH: '不镀铜的孔：钻头尺寸 + 坐标。',
  BOM: `每种料一行，共 ${F.bom.length} 行：型号、位号、封装、数量、立创编号。`, CPL: `每个元件一行，共 ${F.cpl.length} 行：位号、坐标、哪一面、角度。`
};
const KIND_ZH = { img: '一张图（Gerber）', drl: '一张孔表（Excellon）', tab: '一张表（CSV）' };
const KIND_COL = { img: 'var(--sig)', drl: 'var(--pow)', tab: 'var(--c3)' };
(function () {
  $('nums').innerHTML = [
    ['Gerber 压缩包', nf(F.zip_bytes), `字节；${F.gerbers.length} 个文件解开是 ${nf(gbTotal)}`],
    ['Gerber', gerbN, '张，每层一张'],
    ['钻孔文件', drlN, `个：PTH ${pthN} 孔，NPTH ${npthN} 孔`],
    ['BOM · CPL', `${F.bom.length} · ${F.cpl.length}`, `BOM ${F.bom.length} 种料，CPL ${F.cpl.length} 个元件`]
  ].map(([k, v, s]) => `<div class="ro"><small>${k}</small><b>${v}</b><small>${s}</small></div>`).join('');

  const chips = $('fl-files');
  chips.innerHTML = FILES.map(f => `<button class="p7-fchip ${f.kind}" data-f="${f.k}" aria-pressed="false" title="${esc(f.file)}"><i style="background:${KIND_COL[f.kind]}"></i>${esc(f.k === 'BOM' || f.k === 'CPL' ? f.k : f.file.replace('QB12-', ''))}</button>`).join('');
  const stEl = $('fl-st');
  stEl.innerHTML = STATIONS.map((s, i) => `<li class="p7-st" data-s="${s.id}" tabindex="0" role="button" aria-pressed="false"><span class="p7-sth"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[s.id]}</svg><span><span class="p7-stn">${String(i + 1).padStart(2, '0')} · ${s.sec === 'PCB' ? '板厂' : '贴片'}</span><br><b>${s.name}</b></span></span><span class="p7-stf">${s.files.length ? (s.files.length > 6 ? '全部 Gerber + 钻孔' : s.files.map(k => FI[k].kind === 'tab' ? k : FI[k].file.replace('QB12-', '')).join(' · ')) : '不需要文件'}</span></li>`).join('');
  const T = $('fl-title'), Wt = $('fl-what'), Fa = $('fl-facts'), lab = $('fl-lab');
  let playing = false, tok = 0;
  function mark(fileKeys, stIds, pressedFile, curSt) {
    chips.classList.toggle('focus', !!(fileKeys || pressedFile));
    chips.querySelectorAll('[data-f]').forEach(b => {
      b.classList.toggle('used', !!fileKeys && fileKeys.includes(b.dataset.f));
      b.setAttribute('aria-pressed', String(b.dataset.f === pressedFile));
    });
    stEl.classList.toggle('focus', !!stIds);
    stEl.querySelectorAll('[data-s]').forEach(li => {
      const on = !!stIds && stIds.includes(li.dataset.s);
      li.classList.toggle('on', on); li.classList.toggle('cur', li.dataset.s === curSt);
      li.setAttribute('aria-pressed', String(li.dataset.s === curSt));
    });
  }
  function showFile(k) {
    const f = FI[k], sts = STATIONS.filter(s => s.files.includes(k));
    mark(null, sts.map(s => s.id), k, null);
    T.textContent = f.file;
    Wt.textContent = FILE_WHAT[k];
    Fa.innerHTML = [['是什么', KIND_ZH[f.kind]], ['交给', sts.map(s => s.name).join('、')], f.bytes != null ? ['大小', `${nf(f.bytes)} 字节`] : ['行数', k === 'BOM' ? `${F.bom.length} 行` : `${F.cpl.length} 行`]]
      .map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
    lab.textContent = `${f.file} 交给 ${sts.length} 道工序。`;
  }
  function showSt(id, i) {
    const s = STATIONS.find(x => x.id === id);
    mark(s.files, [id], null, id);
    T.textContent = `${String(STATIONS.indexOf(s) + 1).padStart(2, '0')} · ${s.name}`;
    Wt.textContent = s.what;
    Fa.innerHTML = [['在哪', s.sec === 'PCB' ? '板厂（做光板）' : 'SMT 贴片线'], ['用的文件', s.files.length ? (s.files.length > 6 ? `全部 ${s.files.length} 个 Gerber 和钻孔文件` : s.files.map(k => FI[k].kind === 'tab' ? k : FI[k].file).join('、')) : '不需要']]
      .map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
    if (i == null) lab.textContent = `${s.name}：${s.files.length ? `用 ${s.files.length > 6 ? '全部' : s.files.length + ' 个'}文件` : '不需要文件'}。`;
  }
  const stop = () => { playing = false; tok++; $('fl-play').textContent = '▶ 按工序走一遍'; };
  chips.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { stop(); showFile(b.dataset.f); } });
  const stAct = li => { stop(); showSt(li.dataset.s); };
  stEl.addEventListener('click', e => { const li = e.target.closest('[data-s]'); if (li) stAct(li); });
  stEl.addEventListener('keydown', e => { const li = e.target.closest('[data-s]'); if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); stAct(li); } });
  $('fl-play').addEventListener('click', async () => {
    if (playing) { stop(); return; }
    playing = true; const my = ++tok; $('fl-play').textContent = '■ 停止';
    for (let i = 0; i < STATIONS.length; i++) {
      if (my !== tok) return;
      showSt(STATIONS[i].id, i);
      lab.textContent = `第 ${i + 1} / ${STATIONS.length} 道工序`;
      await new Promise(r => setTimeout(r, 1700));
    }
    if (my === tok) stop();
  });
  showSt('cam');
  lab.textContent = '点一个文件，看它交给哪几道工序；或者点一道工序，看它用哪些文件。';
})();

/* ================= 7.2 Gerber 胶片 ================= */
const LAYER_OF = { F_Cu: 'F.Cu', B_Cu: 'B.Cu', F_Mask: 'F.Mask', B_Mask: 'B.Mask', F_Silkscreen: 'F.SilkS', B_Silkscreen: 'B.SilkS', F_Paste: 'F.Paste', B_Paste: 'B.Paste', Edge_Cuts: 'Edge.Cuts', PTH: 'Drill', NPTH: 'Drill' };
const npthPads = ALLPADS.filter(p => p.t === 'npth');
const bMaskGroups = (() => {
  const NAME = { 'J1|pth': 'J1 外壳脚', 'U2|pth': 'U2 散热焊盘里的孔' };
  const g = {}; ALLPADS.filter(p => p.mask && p.mask.includes('B')).forEach(p => { const k = p.t === 'npth' ? p.ref + ' 定位孔' : (NAME[p.ref + '|pth'] || p.ref + ' 孔'); g[k] = (g[k] || 0) + 1; });
  return Object.entries(g).map(([k, n]) => `${k} ${n} 个`).join('、');
})();
const backTexts = D.texts.filter(t => /^B\./.test(t.layer));
const GBI = {
  F_Cu: { black: '要留下的铜：焊盘、走线、整片铺地', clear: '要蚀刻掉的铜，露出基材', st: '线路成像、蚀刻、AOI',
    note: `顶层 ${S.tracks_F} 段走线、${S.smd_pads} 个贴片焊盘，再加 ${Math.round(S.gnd_area['F.Cu'])} mm² 的接地铺铜。铺铜是一块块带洞的大多边形，坐标点很多，所以这个文件是整套里最大的。` },
  B_Cu: { black: '要留下的铜', clear: '要蚀刻掉的铜', st: '线路成像、蚀刻、AOI',
    note: `底层只有 ${S.tracks_B} 段走线，几乎整面是地（${Math.round(S.gnd_area['B.Cu'])} mm²）。注意左右：所有层都是从顶面往下“透视”着画的，所以和你把板子翻过来看到的样子左右相反。` },
  F_Mask: { black: '阻焊开窗：这里不刷油，露出焊盘', clear: '刷阻焊油（绿油、黑油……）', st: '阻焊',
    note: `${maskF} 个开窗：${S.smd_pads} 个贴片焊盘，加上 ${maskF - S.smd_pads} 个穿板的孔。${S.vias} 个过孔一个都没有单独开窗，这就是“过孔盖油”；只有 ${viaInEP} 个散热过孔落在 U2、U4 散热焊盘的开窗里，跟着焊盘露出来。` },
  B_Mask: { black: '阻焊开窗', clear: '刷阻焊油', st: '阻焊',
    note: `只有 ${maskB} 个开窗：底面没有贴片焊盘，只剩穿过板子的孔（${bMaskGroups}）。` },
  F_Silkscreen: { black: '印字符油墨的地方：位号、元件外框、1 脚标记', clear: '不印', st: '字符',
    note: `${refsShown} 个位号印在板上，${hiddenRefs.length} 个（${hiddenRefs.join('、')}）旁边放不下，藏起来了。导出时勾了“剔除阻焊开窗中的丝印”，压到焊盘上的笔画会被剪掉。` },
  B_Silkscreen: { black: '印字符油墨的地方', clear: '不印', st: '字符',
    note: `背面 ${backTexts.length} 条说明文字（接口名、BOOT、RESET、版本号……）。胶片上的字是反的，因为是从顶面透视着画的。中间那行 JLCJLCJLCJLC 是 finalize.py 留的订单号位置，第 8 课再说。` },
  F_Paste: { black: '钢网开孔：锡膏从这里漏到焊盘上', clear: '钢片挡住，不上锡膏', st: '钢网 · 刷锡膏',
    note: `${pasteF} 个开孔，基本和焊盘一样大。例外是 ${epPads.map(p => p.ref).join('、')} 的散热焊盘：开孔边长只有焊盘的 ${Math.round(epK * 100)}%，面积约 ${Math.round(epK * epK * 100)}%，锡膏太多会把芯片顶起来。` },
  B_Paste: { black: '钢网开孔', clear: '钢片', st: '钢网',
    note: `空的：${nf(GB.B_Paste.bytes)} 字节只有文件头，底面没有要贴的元件，也就不用底面钢网。JLC 的教程照样让你勾上这一层导出。` },
  Edge_Cuts: { black: '板子外形：铣刀沿这条线走', clear: '—', st: '成型',
    note: `${BW} × ${BH} mm，四角圆角 R${D.board.corner_r}，一整圈封闭的线（4 段直线 + 4 段圆弧）。用 Protel 扩展名时，这一层的后缀是 .gm1。` },
  PTH: { black: '每个点是一个要镀铜的孔', clear: '不钻', st: '钻孔、沉铜电镀',
    note: `${pthN} 个孔，其中 ${viaHoleN} 个是过孔；${slotN} 个是椭圆槽孔（J1 外壳脚）。图上的空心圈是 NPTH，在另一个文件里。钻孔文件是一张表，不是 Gerber，这里画成点方便看。` },
  NPTH: { black: '只钻不镀的孔', clear: '不钻', st: '钻孔',
    note: `只有 ${npthN} 个：${[...new Set(npthPads.map(p => p.ref))].map(r => `${r} 的 ${npthPads.filter(p => p.ref === r).length} 个定位柱孔（${npthPads.find(p => p.ref === r).drill[0]} mm）`).join('、')}，橙圈标着。整张胶片上就这 ${npthN} 个点。` }
};
const GORDER = ['F_Cu', 'B_Cu', 'F_Mask', 'B_Mask', 'F_Silkscreen', 'B_Silkscreen', 'F_Paste', 'B_Paste', 'Edge_Cuts', 'PTH', 'NPTH'];
const GBV = BoardViewer.create($('gbv'), { mode: 'film', layers: ['F.Cu'], toolbar: false, panel: false, hover: false, label: 'QB12 的 Gerber 胶片：一次只显示一个文件' });
let gbCur = null;
function ghost(V) { V.annotate(`<path class="p7-ghost" d="${outlineD}"/>`); }
function ringsFilm(V, list, label) {
  V.annotate(g => {
    list.forEach(h => { const r = h.r; const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', h.x); c.setAttribute('cy', h.y); c.setAttribute('r', r); c.setAttribute('class', 'p7-ring'); g.appendChild(c); });
  });
}
function gbView(k) {
  const f = FI[k], l = LAYER_OF[k];
  // 查看器的 Drill 层把 PTH 和 NPTH 画在一起；NPTH 文件只有 4 个孔，自己画
  GBV.clear().clearAnnotations().show({ mode: 'film', side: 'top', layers: k === 'NPTH' ? [] : [l] }).badge(`${f.file} · ${f.zh}`);
  if (k !== 'Edge_Cuts') ghost(GBV);
  if (k === 'NPTH') {
    GBV.annotate(npthPads.map(p => `<circle cx="${p.x}" cy="${p.y}" r="${p.drill[0] / 2}" class="p7-ink"/>`).join(''));
    ringsFilm(GBV, npthPads.map(p => ({ x: p.x, y: p.y, r: p.drill[0] / 2 + 0.45 })));
  }
}
let gbLazy = null;
function showGerber(k, textOnly) {
  gbCur = k;
  const f = FI[k], I = GBI[k], l = LAYER_OF[k];
  if (!textOnly) { if (gbLazy) gbLazy.done = true; gbView(k); }
  $('gb-list').querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === k)));
  $('gb-title').textContent = f.file;
  $('gb-facts').innerHTML = [['层', `${l === 'Drill' ? (k === 'PTH' ? 'PTH 钻孔' : 'NPTH 钻孔') : l} · ${f.zh}`], ['胶片上的黑', I.black], ['空白', I.clear], ['交给', I.st], ['大小', `${nf(f.bytes)} 字节`]]
    .map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
  $('gb-note').textContent = I.note;
}
(function () {
  const max = Math.max(...F.gerbers.map(g => g.bytes));
  $('gb-list').innerHTML = GORDER.map(k => { const f = FI[k]; return `<button class="p7-gbf" data-g="${k}" aria-pressed="false"><span>${esc(f.file.replace('QB12-', ''))}</span><small>${kb(f.bytes)}</small><span class="p7-bar"><i style="width:${Math.max(1.5, f.bytes / max * 100).toFixed(1)}%"></i></span></button>`; }).join('');
  $('gb-list').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) showGerber(b.dataset.g); });
  showGerber('F_Cu', true);
  gbLazy = lazy($('gbv'), () => gbView(gbCur));
  // F_Cu 原文摘录（逐字取自 QB12-F_Cu.gtl，… 表示中间省略）。v1 = 10-13 第一版（KiCad 8.0.9，X2），v2 = 10-20 交付版（KiCad 10.0.6，--no-x2 --no-netlist）
  const L = [
    // [第一版, 交付版（1 = 同第一版，null = 这一行删掉了）, 注释, 标记, 交付版的注释（不写 = 同第一版）]
    ['%TF.GenerationSoftware,KiCad,Pcbnew,8.0.9-8.0.9-0~ubuntu24.04.1*%', 'G04 #@! TF.GenerationSoftware,KiCad,Pcbnew,10.0.6*', '谁生成的', 'x2'],
    ['%TF.FileFunction,Copper,L1,Top*%', 'G04 #@! TF.FileFunction,Copper,L1,Top*', '这是第 1 层铜，顶层', 'x2'],
    ['%TF.FilePolarity,Positive*%', 'G04 #@! TF.FilePolarity,Positive*', '正片：画出来的地方 = 有铜', 'x2'],
    ['%FSLAX46Y46*%', 1, '坐标格式 4.6：整数 4 位、小数 6 位'],
    ['G04 Gerber Fmt 4.6, Leading zero omitted, Abs format (unit mm)*', 1, 'G04 开头是注释'],
    ['%MOMM*%', 1, '单位：毫米'],
    ['…'],
    ['%ADD10R,0.806000X0.864000*%', '%ADD15R,0.806000X0.864000*%', '定义 10 号光圈：0.806 × 0.864 mm 的矩形（0603 电阻的焊盘）', null, '定义 15 号光圈：0.806 × 0.864 mm 的矩形（0603 电阻的焊盘；第一版是 10 号）'],
    ['…'],
    ['%ADD45C,0.300000*%', '%ADD46C,0.300000*%', '45 号光圈：直径 0.3 mm 的圆（画 3V3 线用）', null, '46 号光圈：直径 0.3 mm 的圆（画 3V3 线用；第一版是 45 号）'],
    ['…'],
    ['D10*', 'D15*', '拿起 10 号光圈', null, '拿起 15 号光圈'],
    ['%TO.P,R17,1*%', null, 'X2 网表属性：下一个焊盘是 R17 的 1 脚', 'x2'],
    ['%TO.N,VBUS*%', null, 'X2 网表属性：网络 VBUS', 'x2'],
    ['X31850000Y9800000D03*', 1, '在 (31.85, 9.8) 盖一下（D03 = 闪一下）'],
    ['…'],
    ['D45*', 'D46*', '换 45 号光圈', null, '换 46 号光圈'],
    ['%TO.N,3V3*%', null, 'X2 网表属性：网络 3V3', 'x2'],
    ['X24550000Y19069200D02*', 1, '抬笔移到起点（D02）'],
    ['X26887700Y19069200D01*', 1, '落笔画到终点（D01）：一段 0.3 mm 的 3V3 线'],
    ['…'],
    ['G36*', 1, '开始填充一块区域：铺铜'],
    ['…'],
    ['G37*', 1, '区域结束'],
    ['…'],
    ['M02*', 1, '文件结束']
  ];
  const gtl = v => {
    $('gtl').innerHTML = L.map(([c1, c2, a, x, a2]) => {
      if (c1 === '…') return '<span class="p7-ln gap">…</span>';
      const c = v === 1 ? c1 : (c2 === 1 ? c1 : c2);
      if (c == null) return '';
      const cls = x ? (v === 1 ? 'p7-x2' : 'p7-x2c') : '';
      const ann = x ? (v === 1 ? (a.startsWith('X2') ? a : 'X2 属性：' + a) : '变成 G04 注释：' + a) : (v === 2 && a2 ? a2 : a);
      return `<span class="p7-ln"><span class="${cls}">${esc(c)}</span>${ann ? `  <span class="p7-ann">← ${esc(ann)}</span>` : ''}</span>`;
    }).join('') + (v === 2 ? `<span class="p7-ln gap">（第一版里的 %TO 网表属性行全删掉了。KiCad 10 给光圈重新编了号（10 → 15、45 → 46），44 种光圈的形状尺寸不变；焊盘和走线的每一笔坐标都和第一版相同，只是先后顺序变了；铺铜重新填充过）</span>` : '');
    $('gtl-v1').setAttribute('aria-pressed', String(v === 1)); $('gtl-v2').setAttribute('aria-pressed', String(v === 2));
  };
  $('gtl-v1').addEventListener('click', () => gtl(1));
  $('gtl-v2').addEventListener('click', () => gtl(2));
  gtl(1);
})();

/* ================= 7.3 钻孔 ================= */
const DRV = BoardViewer.create($('drv'), { mode: 'film', layers: ['Drill'], toolbar: false, panel: false, hover: false, label: 'QB12 的钻孔：PTH 和 NPTH' });
const OWN = {
  'J1|pth': 'USB-C 外壳的 4 个固定脚（椭圆槽孔）', 'U2|pth': 'U2 散热焊盘里封装自带的孔', 'J1|npth': 'USB-C 的 2 个塑料定位柱', 'SW1|npth': '拨动开关的 2 个定位柱'
};
function holesOf(t, plated) {
  if (t.kind === 'ViaDrill') return D.vias.filter(v => near(v.drill, t.d)).map(v => ({ x: v.x, y: v.y, r: v.d / 2 + 0.3, via: v }));
  return ALLPADS.filter(p => p.drill && (plated ? p.t === 'pth' : p.t === 'npth') && near(Math.min(p.drill[0], p.drill[1]), t.d))
    .map(p => ({ x: p.x, y: p.y, r: Math.max(p.drill[0], p.drill[1]) / 2 + 0.35, pad: p }));
}
const DRT = [...F.pth.map(t => Object.assign({ file: 'PTH' }, t)), ...F.npth.map(t => Object.assign({ file: 'NPTH' }, t))].map(t => {
  const hs = holesOf(t, t.file === 'PTH');
  let who;
  if (t.kind === 'ViaDrill') {
    const v0 = hs[0].via, roles = {};
    hs.forEach(h => { roles[h.via.role] = (roles[h.via.role] || 0) + 1; });
    who = `过孔 ${v0.d}/${t.d} mm：` + Object.entries(roles).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${(BoardViewer.roles[r] || r).replace('过孔', '')} ${n}`).join('、');
  } else {
    const refs = [...new Set(hs.map(h => h.pad.ref))];
    who = refs.map(r => OWN[r + '|' + (t.file === 'PTH' ? 'pth' : 'npth')] || r).join('；');
  }
  return Object.assign(t, { hs, who });
});
let drSel = -1, drMode = 'film';
function drShow() {
  DRV.clearAnnotations();
  if (drMode === 'film') DRV.show({ mode: 'film', side: 'top', layers: ['Drill'] });
  else DRV.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'B.Cu', 'Vias', 'Drill', 'Edge.Cuts'], tracks: true });
  if (drMode === 'film') ghost(DRV);
  C.pressOne('#p7 [data-drm]', 'drm', drMode);
}
let drLazy = null;
function drPick(i, focus, textOnly) {
  drSel = i;
  if (!textOnly) { if (drLazy) drLazy.done = true; drShow(); }
  $('dr-tbl').querySelectorAll('tbody tr').forEach((tr, j) => tr.classList.toggle('on', j === i));
  if (i < 0) { if (!textOnly) DRV.badge(`${pthN + npthN} 个孔 · ${DRT.length} 种钻头`).reset(); $('dr-note').textContent = '点表里的一行，板上标出用这个钻头的孔。'; return; }
  const t = DRT[i];
  ringsFilm(DRV, t.hs);
  DRV.badge(`QB12-${t.file}.drl · T${t.tool} · ${t.d} mm × ${t.n}`);
  const xs = t.hs.map(h => h.x), ys = t.hs.map(h => h.y);
  if (focus !== false) { if (t.n > 20) DRV.reset(); else DRV.focus([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { pad: 3 }); }
  $('dr-note').innerHTML = `<b>T${t.tool}C${t.d.toFixed(3)}</b>（${t.file}）：${t.n} 个孔${t.slots ? `，其中 ${t.slots} 个是槽孔` : ''}。${esc(t.who)}。` +
    (t.slots ? ' 槽孔在文件里写成 “X…Y…G85X…Y…”：从一点铣到另一点（椭圆孔的“备选钻孔模式”）。' : '') +
    (t.kind === 'ViaDrill' ? ' 过孔的孔壁镀铜，把顶层和底层连起来（第 5 课）。' : '');
}
(function () {
  $('dr-tbl').querySelector('tbody').innerHTML = DRT.map((t, i) => `<tr tabindex="0" data-i="${i}"><td>${t.file}</td><td>T${t.tool}</td><td class="num">${t.d.toFixed(2)}</td><td class="num">${t.n}${t.slots ? `<br><small>槽 ${t.slots}</small>` : ''}</td><td style="font-family:var(--f-body)">${esc(t.who)}</td></tr>`).join('');
  const sumOK = pthN + npthN === S.holes;
  $('dr-sum').textContent = `合计 ${pthN} + ${npthN} = ${pthN + npthN} 个孔${sumOK ? '，和板上的孔数一致 ✓' : ''}`;
  const tb = $('dr-tbl').querySelector('tbody');
  tb.addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) drPick(+tr.dataset.i); });
  tb.addEventListener('keydown', e => { const tr = e.target.closest('tr'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); drPick(+tr.dataset.i); } });
  $('dr-film').dataset.drm = 'film'; $('dr-cu').dataset.drm = 'cu';
  $('dr-film').addEventListener('click', () => { drMode = 'film'; drPick(drSel, false); });
  $('dr-cu').addEventListener('click', () => { drMode = 'cu'; drPick(drSel, false); });
  drPick(-1, false, true);
  drLazy = lazy($('drv'), () => { drShow(); DRV.badge(`${pthN + npthN} 个孔 · ${DRT.length} 种钻头`); });
  // NPTH 全文（逐字取自交付的 QB12-NPTH.drl，2026-10-20 KiCad 10.0.6 版；和 8.0.9 导出的旧版只差生成软件和日期这几行）
  const N = [
    ['M48', '文件头开始'],
    ['; DRILL file KiCad 10.0.6 date 2026-10-20T19:00:04'],
    ['; FORMAT={-:-/ absolute / metric / decimal}', '绝对坐标、公制、十进制'],
    ['; #@! TF.CreationDate,2026-10-20T19:00:04+08:00'],
    ['; #@! TF.GenerationSoftware,Kicad,Pcbnew,10.0.6'],
    ['; #@! TF.FileFunction,NonPlated,1,2,NPTH', '非金属化，从第 1 层钻到第 2 层'],
    ['FMAT,2'],
    ['METRIC', '单位毫米'],
    ['; #@! TA.AperFunction,NonPlated,NPTH,ComponentDrill'],
    ['T1C0.600', '1 号钻头 0.6 mm'],
    ['; #@! TA.AperFunction,NonPlated,NPTH,ComponentDrill'],
    ['T2C0.900', '2 号钻头 0.9 mm'],
    ['%', '文件头结束'],
    ['G90'], ['G05'],
    ['T1', '换 1 号钻头'],
    ['X23.6Y5.61', null, [23.6, 5.61]], ['X29.4Y5.61', null, [29.4, 5.61]],
    ['T2', '换 2 号钻头'],
    ['X1.85Y15.9', null, [1.85, 15.9]], ['X1.85Y12.9', null, [1.85, 12.9]],
    ['M30', '程序结束']
  ];
  const pre = $('npth');
  pre.innerHTML = N.map(([c, a, xy]) => {
    const cm = c.startsWith(';');
    const body = xy ? `<span class="p7-cl" role="button" tabindex="0" data-x="${xy[0]}" data-y="${xy[1]}">${esc(c)}</span>` : `<span class="${cm ? 'cm' : ''}">${esc(c)}</span>`;
    return `<span class="p7-ln">${body}${a ? `  <span class="p7-ann">← ${esc(a)}</span>` : ''}</span>`;
  }).join('');
  const act = el => {
    const X = +el.dataset.x, Y = +el.dataset.y, y = Math.round((BH - Y) * 1000) / 1000;
    const p = npthPads.slice().sort((a, b) => Math.hypot(a.x - X, a.y - y) - Math.hypot(b.x - X, b.y - y))[0];
    pre.querySelectorAll('.p7-cl').forEach(s => s.classList.toggle('on', s === el));
    drSel = -1; if (drLazy) drLazy.done = true; drShow();
    $('dr-tbl').querySelectorAll('tbody tr').forEach(tr => tr.classList.remove('on'));
    ringsFilm(DRV, [{ x: p.x, y: p.y, r: p.drill[0] / 2 + 0.45 }]);
    DRV.badge(`${el.textContent} → (${f1(X)}, ${f1(y)})`).focus([p.x - 4, p.y - 3, p.x + 4, p.y + 3], { pad: 0 });
    const rd = $('npth-read'); rd.classList.add('on');
    rd.innerHTML = `<b>${esc(el.textContent)}</b>：文件里的坐标从板子左下角量、Y 向上。换回本课坐标：x = ${f1(X)}，y = ${BH} − ${f1(Y)} = ${f1(y)}。那里是 <b>${p.ref}</b> 的定位柱孔，直径 ${p.drill[0]} mm。`;
    const r = $('drv').getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) $('drv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });
  };
  pre.addEventListener('click', e => { const s = e.target.closest('.p7-cl'); if (s) act(s); });
  pre.addEventListener('keydown', e => { const s = e.target.closest('.p7-cl'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); act(s); } });
})();

/* ================= 7.4 BOM 和 CPL ================= */
const BMV = BoardViewer.create($('bmv'), { mode: 'layers', layers: ['F.Cu', 'Edge.Cuts', 'Courtyard', 'Labels'], tracks: false, toolbar: false, panel: false, hover: true, label: 'QB12 顶面元件：点一下看它在 BOM 和 CPL 里的哪一行' });
const COLS = {
  bom: [['Comment', '型号或数值。JLC 必需的列'], ['Designator', '位号。同一种料的位号写在一格，逗号隔开'], ['Footprint', '封装。JLC 必需的列'], ['Quantity', '数量。JLC 样例里没有，QB12 加上方便核对'], ['LCSC Part #', '立创编号，JLC 按它在元件库里找料']],
  cpl: [['Designator', '位号，和 BOM 对上'], ['Mid X / Mid Y', '元件坐标，带 mm 后缀；原点在板子左下角（7.5 节）'], ['Layer', '哪一面：Top / Bottom（QB12 全是 Top）'], ['Rotation', '角度 0–359（7.5 节）']]
};
let tbTab = 'bom', tbFilter = null, tbSel = null;
function tbRender() {
  const t = $('tb-t'), isB = tbTab === 'bom';
  const head = isB ? F.bom_header : F.cpl_header;
  let rows = (isB ? F.bom : F.cpl).map((r, i) => [r, i]);
  if (!isB && tbFilter) rows = rows.filter(([r]) => tbFilter.includes(r[0]));
  t.parentNode.classList.toggle('cpl', !isB);
  t.querySelector('thead').innerHTML = '<tr>' + head.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>';
  t.querySelector('tbody').innerHTML = rows.map(([r, i]) => `<tr tabindex="0" data-i="${i}" data-refs="${esc(isB ? r[1] : r[0])}">` +
    r.map((c, j) => `<td${(isB && j === 3) ? ' class="num"' : ''}>${isB && j === 1 ? esc(c).replace(/,/g, ',<wbr>') : esc(c)}</td>`).join('') + '</tr>').join('');
  C.pressOne('#p7 [data-tb]', 'tb', tbTab);
  $('tb-cols').innerHTML = COLS[tbTab].map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('');
  $('tb-all').hidden = !(tbFilter && !isB);
  $('tb-lab').textContent = !isB && tbFilter ? `只显示 ${rows.length} 行：${tbFilter.join(', ')}` : (isB ? `${F.bom.length} 种料，数量合计 ${bomQty}` : `${F.cpl.length} 个元件`);
  markRows();
}
function markRows() {
  $('tb-t').querySelectorAll('tbody tr').forEach(tr => {
    const refs = tr.dataset.refs.split(',');
    tr.classList.toggle('on', !!tbSel && refs.some(r => tbSel.includes(r)));
  });
}
let bmLazy = null;
function bmView(i) { const r = F.bom[i], refs = r[1].split(','); BMV.clear().highlightParts(refs); BMV.badge(`${r[0]} · ${r[4]} · ${refs.length} 个`); }
function tbBomRow(i, textOnly) {
  const r = F.bom[i], refs = r[1].split(',');
  tbSel = refs; tbFilter = refs;
  if (!textOnly) { if (bmLazy) bmLazy.done = true; bmView(i); }
  markRows();
  $('tb-lab').textContent = `${r[0]}：${refs.length} 个（${refs.join(', ')}）。切到 CPL，只看这 ${refs.length} 行坐标。`;
}
function tbPart(ref) {
  tbSel = [ref];
  if (tbTab === 'cpl') { tbFilter = null; tbRender(); }
  else markRows();
  const row = (tbTab === 'bom' ? F.bom.find(r => r[1].split(',').includes(ref)) : F.cpl.find(r => r[0] === ref));
  const c = F.cpl.find(r => r[0] === ref);
  BMV.badge(c ? c.join(', ') : ref);
  const tr = [...$('tb-t').querySelectorAll('tbody tr')].find(t => t.dataset.refs.split(',').includes(ref));
  if (tr) { const box = tr.closest('.p7-scroll'); box.scrollTop = tr.offsetTop - box.clientHeight / 2; }
  return row;
}
(function () {
  $('tb-bom').dataset.tb = 'bom'; $('tb-cpl').dataset.tb = 'cpl';
  $('tb-bom').textContent = `BOM · ${F.bom.length} 行`; $('tb-cpl').textContent = `CPL · ${F.cpl.length} 行`;
  $('tb-bom').addEventListener('click', () => { tbTab = 'bom'; tbRender(); });
  $('tb-cpl').addEventListener('click', () => { tbTab = 'cpl'; tbRender(); });
  $('tb-all').addEventListener('click', () => { tbFilter = null; tbRender(); });
  const tb = $('tb-t').querySelector('tbody');
  const act = tr => {
    if (tbTab === 'bom') { tbBomRow(+tr.dataset.i); }
    else { const ref = tr.dataset.refs; tbSel = [ref]; markRows(); if (bmLazy) bmLazy.done = true; BMV.clear(); BMV.select(ref); BMV.focus(ref, { pad: 4 }); BMV.badge(F.cpl[+tr.dataset.i].join(', ')); }
  };
  tb.addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) act(tr); });
  tb.addEventListener('keydown', e => { const tr = e.target.closest('tr'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); act(tr); } });
  BMV.on('select', ({ ref }) => { if (bmLazy) bmLazy.done = true; tbPart(ref); });
  // 核对
  const uniq = new Set(bomRefs).size === bomRefs.length;
  const same = bomRefs.length === cplRefs.length && bomRefs.every(r => cplRefs.includes(r));
  const lcscOK = F.bom.reduce((a, r) => a + r[1].split(',').filter(ref => QB.fp(ref) && QB.fp(ref).lcsc === r[4]).length, 0);
  const top = F.cpl.filter(r => r[3] === 'Top').length;
  const tile = (k, v, ok, s) => `<div class="ro"><small>${k}</small><b class="${ok ? 'good' : 'bad'}">${v}${ok ? ' ✓' : ' ✗'}</b><small>${s}</small></div>`;
  $('tb-chk').innerHTML = [
    tile('BOM 数量合计', bomQty, bomQty === S.footprints, `板上 ${S.footprints} 个封装`),
    tile('位号不重复', `${new Set(bomRefs).size} / ${bomRefs.length}`, uniq, 'BOM 里每个位号只出现一次'),
    tile('BOM ↔ CPL', `${cplRefs.filter(r => bomRefs.includes(r)).length} / ${cplRefs.length}`, same, '两张表的位号一一对上'),
    tile('编号和板上一致', `${lcscOK} / ${bomQty}`, lcscOK === bomQty, '封装 LCSC 字段 = BOM 编号'),
    tile('贴片面', `${top} Top`, top === F.cpl.length, '全在顶面，只贴一面')
  ].join('');
  tbRender();
  tbBomRow(0, true);
  bmLazy = lazy($('bmv'), () => bmView(0));
})();

/* ================= 7.5 坐标与角度 ================= */
const COV = BoardViewer.create($('cov'), { mode: 'layers', layers: ['F.Cu', 'Edge.Cuts', 'Courtyard', 'Labels'], tracks: false, toolbar: 'mini', panel: false, hover: true, label: 'QB12：点一个元件，看它的坐标怎么变成 CPL 里的一行' });
let coOrg = 'aux', coRef = null;
const PICKS = ['U1', 'J1', 'SW1', 'U2', 'R9', 'LED3'];
let coLazy = null;
function coDraw(ref, textOnly) {
  coRef = ref;
  const f = QB.fp(ref), x = f.x, y = f.y, yc = Math.round((BH - y) * 1000) / 1000;
  const row = F.cpl.find(r => r[0] === ref);
  const rot = mod360(f.rot);
  if (!textOnly) { if (coLazy) coLazy.done = true; COV.clearAnnotations(); COV.annotate((g, mk) => {
    const L = (d, c) => mk.el('path', { d, class: c });
    if (coOrg === 'aux') {
      L(`M0 ${BH}L${BW + 1.2} ${BH}M${BW + 0.3} ${BH - 0.6}L${BW + 1.2} ${BH}L${BW + 0.3} ${BH + 0.6}`, 'p7-ax');
      L(`M0 ${BH}L0 -1.2M-0.6 -0.3L0 -1.2L0.6 -0.3`, 'p7-ax');
      mk.el('circle', { cx: 0, cy: BH, r: 0.55, class: 'p7-org' });
      mk.el('text', { x: BW - 0.6, y: BH - 0.6, class: 'p7-axt' }, null, 'X');
      mk.el('text', { x: 0.7, y: 0.3, class: 'p7-axt' }, null, 'Y');
      mk.el('text', { x: 0.7, y: BH - 0.6, class: 'p7-axt' }, null, '原点 (0, 0)');
      L(`M0 ${BH}L${x} ${BH}`, 'p7-dim'); L(`M${x} ${BH}L${x} ${y}`, 'p7-dim');
      mk.el('text', { x: Math.max(x / 2 - 2.5, 9), y: BH + 1.15, class: 'p7-dt' }, null, `Mid X = ${f3(x)}`);
      mk.el('text', { x: x + 0.5, y: (y + BH) / 2, class: 'p7-dt' }, null, `Mid Y = ${f3(yc)}`);
    } else {
      L(`M0 0L-1.2 -1.2M-1.2 -1.2L-0.35 -1.05M-1.2 -1.2L-1.05 -0.35`, 'p7-ax');
      mk.el('text', { x: 0.6, y: -0.4, class: 'p7-axt' }, null, '图纸原点在左上方 (−100, −100)，不在图里');
      L(`M0 0L${x} 0`, 'p7-dim'); L(`M${x} 0L${x} ${y}`, 'p7-dim');
    }
    L(`M${x - 1.2} ${y}L${x + 1.2} ${y}M${x} ${y - 1.2}L${x} ${y + 1.2}`, 'p7-cross');
    mk.el('circle', { cx: x, cy: y, r: 0.5, class: 'p7-cross' });
  }); }
  const off = Math.hypot(...padCenter(f).map((v, i) => v - [x, y][i]));
  $('co-title').textContent = `${ref} · ${f.value}`;
  const rows = [
    ['本课坐标', `(${f1(x)}, ${f1(y)})`],
    ['KiCad 内部', `(${f1(100 + x)}, ${f1(100 + y)})`]
  ];
  let extra;
  if (coOrg === 'aux') {
    rows.push(['Mid X = x', `<span class="hl">${f3(x)} mm</span>`], ['Mid Y = 38 − y', `${BH} − ${f1(y)} = <span class="hl">${f3(yc)} mm</span>`],
      ['Rotation', `KiCad ${f1(f.rot)}° → <span class="hl">${rot}</span>`]);
    const mine = [ref, f3(x) + 'mm', f3(yc) + 'mm', 'Top', String(rot)].join(',');
    const real = row ? row.join(',') : '';
    extra = `<div class="row">${esc(real)}</div><span class="${mine === real ? 'ok' : ''}">${mine === real ? '✓ 和交付的 QB12_CPL_坐标文件.csv 这一行一字不差' : '与交付文件不一致'}</span>`;
  } else {
    rows.push(['PosX = 100 + x', `<span class="hl">${f3(100 + x)}</span>`], ['PosY = −(100 + y)', `<span class="hl">${f3(-(100 + y))}</span>`], ['Rotation', `<span class="hl">${rot}</span>（角度和原点无关）`]);
    extra = `<span>按 JLC 教程（Gerber、钻孔都用绝对原点）导出，${ref} 就会是这两个数：Y 是负的，因为 KiCad 把 Y 取反了。只要三份文件都用这种原点，也完全没问题。交付文件用的是左下角原点。</span>`;
  }
  $('co-math').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('') + extra;
  $('co-note').textContent = `KiCad 导出的是封装的锚点，不一定是焊盘的正中。${ref} 的锚点离焊盘中心 ${off.toFixed(2)} mm；QB12 全部 ${S.footprints} 个封装里最大的是 ${anchorOff[0][0]}，${anchorOff[0][1].toFixed(2)} mm。锚点偏得多的封装（常见于连接器），贴片预览里会整体偏开，要用插件或改坐标修正。`;
  C.pressOne('#p7 [data-copick]', 'copick', ref);
}
function coSel(ref, scroll) {
  if (coLazy) coLazy.done = true;
  COV.clear(); COV.highlightParts([ref]);
  coDraw(ref);
  if (scroll) $('cov').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });
}
(function () {
  $('co-picks').innerHTML = PICKS.map(r => `<button class="btn" data-copick="${r}" aria-pressed="false">${r}</button>`).join('');
  $('co-picks').addEventListener('click', e => { const b = e.target.closest('[data-copick]'); if (b) coSel(b.dataset.copick); });
  $('co-aux').dataset.coo = 'aux'; $('co-abs').dataset.coo = 'abs';
  const setOrg = o => { coOrg = o; C.pressOne('#p7 [data-coo]', 'coo', o); if (coRef) { if (coLazy && !coLazy.done) coSel(coRef); else coDraw(coRef); } };
  $('co-aux').addEventListener('click', () => setOrg('aux'));
  $('co-abs').addEventListener('click', () => setOrg('abs'));
  COV.on('select', ({ ref }) => coDraw(ref));
  coDraw('U1', true);
  coLazy = lazy($('cov'), () => coSel('U1'));
  // 定位文件对话框的两个坑（用 kicad-cli 在草稿目录试过：--smd-only 少 SW1，--exclude-fp-th 少 J1、SW1、U2）
  const thFp = D.footprints.filter(f => f.pads.some(p => p.t === 'pth' || p.t === 'npth')).map(f => f.ref).sort(natural);
  const smdOut = D.footprints.filter(f => f.tht).map(f => f.ref);
  $('pos-trap').innerHTML = `<strong>别勾</strong> <span class="menu">仅包含贴片封装</span> 和 <span class="menu">排除具有通孔焊盘的所有封装</span>。QB12 上试过：勾前一个，${smdOut.join('、')} 会从文件里消失（它的封装属性是“通孔”，虽然焊盘是贴片的）；勾后一个，${thFp.join('、')} 都没了（它们有穿板的孔）。坐标文件里没有的元件，贴片机就不知道往哪放。`;
})();

/* ---- 角度：库里的 0° → 板上 ---- */
const NS = 'http://www.w3.org/2000/svg';
const rotSvg = $('rot');
let rotRef = 'U2', rotJlc = false, rotRaf = 0, rotLayout = null;
function padSvg(p, cls) {
  if (p.t === 'npth') return `<circle cx="${p.x}" cy="${p.y}" r="${p.drill[0] / 2}" class="p7-rhole"/>`;
  if (p.s === 'circle') return `<circle cx="${p.x}" cy="${p.y}" r="${p.w / 2}" class="${cls}"/>`;
  if (p.poly) return `<path d="${p.poly.map(r => 'M' + r.map(q => q.join(' ')).join('L') + 'Z').join('')}" class="${cls}"/>`;
  const rx = p.s === 'oval' ? Math.min(p.w, p.h) / 2 : p.s === 'roundrect' ? (p.rr || 0) : 0;
  return `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" rx="${rx}" transform="rotate(${-(p.a || 0)} ${p.x} ${p.y})" class="${cls}"/>`;
}
const isDiode = f => f.kind === 'd' || f.kind === 'led';
const anodeNet = f => f.pins[0] && f.pins[0][2];            // 和查看器同一个约定：pins 第一项的网络 = 阳极
const padNet = p => (p.net >= 0 ? D.nets[p.net].name : null);
// 要标出来的焊盘：二极管 / LED 标阴极 K，其余标 1 号焊盘（J1 是 A1B12）
const markPad = f => isDiode(f) ? f.pads.find(p => p.t !== 'npth' && padNet(p) && padNet(p) !== anodeNet(f)) : f.pads.find(p => p.n === '1' || (f.ref === 'J1' && p.n === 'A1B12'));
function fpGroup(f) {
  let s = '';
  const mp = markPad(f);
  if (f.crt) s += `<polygon points="${f.crt.map(q => q.join(',')).join(' ')}" class="p7-rcrt"/>`;
  f.pads.forEach(p => { s += padSvg(p, 'p7-rpad' + (p === mp ? ' one' : '')); });
  return s;
}
function rotLayoutFor() { const w = rotSvg.parentNode.clientWidth || 640; return w < 560 ? 'col' : 'row'; }
function rotDraw(phi) {
  const f = QB.fp(rotRef), lay = rotLayout;
  const ext = f.crt ? Math.max(...f.crt.map(q => Math.hypot(q[0] - f.x, q[1] - f.y))) : 3;
  const P = lay === 'row' ? [[160, 152], [480, 152]] : [[140, 152], [140, 456]];
  const R = 92, s = R / ext;
  const g = (cx, cy, svgRot, cls) => `<g class="${cls || ''}" transform="translate(${cx} ${cy}) scale(${s}) rotate(${svgRot}) translate(${-f.x} ${-f.y})">${fpGroup(f)}</g>`;
  // 1 号焊盘 / 阴极 的文字位置（随旋转一起转，但字保持正立）
  const T = (cx, cy, svgRot, px, py) => { const a = svgRot * Math.PI / 180, dx = px - f.x, dy = py - f.y; return [cx + s * (dx * Math.cos(a) - dy * Math.sin(a)), cy + s * (dx * Math.sin(a) + dy * Math.cos(a))]; };
  const diode = isDiode(f), mp = markPad(f);
  const aPad = diode ? f.pads.find(p => padNet(p) === anodeNet(f)) : null;
  const tag = (cx, cy, rr, p, t) => { if (!p) return ''; const [lx, ly] = T(cx, cy, rr, p.x, p.y); return `<text x="${lx.toFixed(1)}" y="${(ly + 4.5).toFixed(1)}" text-anchor="middle" class="p7-rt pin">${t}</text>`; };
  const lab = (cx, cy, rr) => diode ? tag(cx, cy, rr, mp, 'K') + tag(cx, cy, rr, aPad, 'A') : tag(cx, cy, rr, mp, '1');
  const rot = f.rot;                       // KiCad 角度（从顶面看，逆时针为正）
  const libRot = rot;                      // SVG 的 rotate 顺时针为正：板上的样子反转 rot 就是库里的样子
  const curRot = rot - phi;                // phi 从 0 走到 rot
  const W0 = lay === 'row' ? 640 : 280, H0 = lay === 'row' ? 284 : 590;
  rotSvg.setAttribute('viewBox', `0 0 ${W0} ${H0}`);
  const box = (cx, cy) => `<rect x="${cx - 112}" y="${cy - 104}" width="224" height="208" rx="12" class="p7-rpanel"/><path d="M${cx - 8} ${cy}H${cx + 8}M${cx} ${cy - 8}V${cy + 8}" class="p7-rcross"/>`;
  let h = box(...P[0]) + box(...P[1]);
  h += g(P[0][0], P[0][1], libRot) + lab(P[0][0], P[0][1], libRot);
  if (rotJlc) h += g(P[1][0], P[1][1], curRot - 90, 'p7-rghost');
  h += g(P[1][0], P[1][1], curRot) + lab(P[1][0], P[1][1], curRot);
  const ttl = (cx, cy, a, b) => `<text x="${cx - 110}" y="${cy - 134}" class="p7-rt">${a}</text><text x="${cx - 110}" y="${cy - 114}" class="p7-rt mu">${b}</text>`;
  h += ttl(...P[0], '① 封装库里的 0°', 'CPL 写 0 时就是这个方向');
  h += ttl(...P[1], '② 贴在板上', `KiCad ${f1(rot)}° · CPL 写 ${mod360(rot)}`);
  h += rotJlc ? `<text x="${P[1][0] - 110}" y="${P[1][1] + 124}" class="p7-rt mu c3">虚线 = 假设 JLC 差 90°（示意）</text>`
    : `<text x="${P[1][0] - 110}" y="${P[1][1] + 124}" class="p7-rt mu">十字 = 锚点，CPL 坐标就是它</text>`;
  if (lay === 'row') {
    const done = Math.abs(phi - rot) < 0.5;
    h += `<path d="M300 152h40M332 144l8 8-8 8" class="p7-rarrow"/><text x="320" y="132" text-anchor="middle" class="p7-rt big">${Math.round(phi)}°</text>` +
      (done && rot < 0 ? `<text x="320" y="184" text-anchor="middle" class="p7-rt mu">= ${mod360(rot)}°</text>` : '') + `<text x="320" y="${done && rot < 0 ? 202 : 184}" text-anchor="middle" class="p7-rt mu">逆时针为正</text>`;
  }
  rotSvg.innerHTML = h;
}
function rotStatus() {
  const f = QB.fp(rotRef), r = mod360(f.rot);
  const dir = r === 0 ? '和库里一样，不用转' : r === 90 ? '逆时针转 90°' : r === 180 ? '转 180°' : r === 270 ? '逆时针转 270°，也就是顺时针转 90°' : `逆时针转 ${r}°`;
  $('rot-st').innerHTML = `<b>${rotRef}</b> · ${esc(f.value)} · ${esc(f.pkg)}：从库里的 0° ${dir}，就是板上的样子；CPL 里写 <b>${r}</b>。黄色焊盘是 ${isDiode(f) ? '阴极 K（二极管的丝印极性标记画在阴极这头）' : '1 号焊盘'}。` +
    (rotJlc ? ' 紫色虚线是假设 JLC 库里这颗料的 0° 和你的差 90° 时，预览里会画出来的样子。这只是示意：QB12 每颗料实际差不差，要在下单页的贴片预览里看。' : '');
}
function rotPlay() {
  cancelAnimationFrame(rotRaf);
  const f = QB.fp(rotRef), target = f.rot;
  if (RMx || !target) { rotDraw(target); rotStatus(); return; }
  const t0 = performance.now(), dur = 1300;
  rotDraw(0);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    rotDraw(target * e);
    if (k < 1) rotRaf = requestAnimationFrame(step);
  };
  rotRaf = requestAnimationFrame(step);
  rotStatus();
}
function rotPick(ref, play) {
  rotRef = ref;
  C.pressOne('#p7 [data-rot]', 'rot', ref);
  if (play) rotPlay(); else { rotDraw(QB.fp(ref).rot); rotStatus(); }
}
(function () {
  $('rot-picks').innerHTML = POLAR.map(r => `<button class="btn" data-rot="${r}" aria-pressed="false">${r}</button>`).join('');
  $('rot-picks').addEventListener('click', e => { const b = e.target.closest('[data-rot]'); if (b) rotPick(b.dataset.rot, true); });
  $('rot-play').addEventListener('click', rotPlay);
  $('rot-jlc').addEventListener('click', () => { rotJlc = !rotJlc; $('rot-jlc').setAttribute('aria-pressed', String(rotJlc)); cancelAnimationFrame(rotRaf); rotDraw(QB.fp(rotRef).rot); rotStatus(); });
  rotLayout = rotLayoutFor();
  rotPick('U2', false);
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const l = rotLayoutFor(); if (l !== rotLayout) { rotLayout = l; cancelAnimationFrame(rotRaf); rotDraw(QB.fp(rotRef).rot); } }, 150); });
  const nRC = D.footprints.length - POLAR.length;
  $('rot-check').innerHTML = `打开贴片预览，逐个看<strong>有方向的 ${POLAR.length} 个</strong>：${POLAR.join('、')}。看元件上的红点（JLC 叫方向标记，不一定就是 1 脚）有没有对上板上丝印的点或 1 脚标记；二极管看 “+” 阳极、“−” 阴极。${SWD.join('、')} 两个按键只用对角的两个脚，怎么转都通。剩下 ${nRC - SWD.length} 个电阻和陶瓷电容两头一样，转 180° 没关系，只要别横过来（差 90° 会横跨在焊盘上，一眼就看得出）。`;
})();

/* ================= 7.6 导出设置 ================= */
(function () {
  const k = (id, t) => `<span class="p7-k" data-k="${id}" role="button" tabindex="0">${esc(t)}</span>`;
  const c = t => `<span class="cm">${esc(t)}</span>`;
  const lines = [
    c('# export_jlc.sh 第 9–15 行（原文，2026-10-20 版；$KCLI 是第 4 行 source 的 tools/kicad_env.sh 里定义的 KiCad 10 kicad-cli）'),
    `"$KCLI" pcb export gerbers --output "$OUT/gerber/" \\`,
    `  ${k('layers', '--layers F.Cu,B.Cu,F.Paste,B.Paste,F.Silkscreen,B.Silkscreen,F.Mask,B.Mask,Edge.Cuts')} \\`,
    `  ${k('sub', '--subtract-soldermask')} ${k('origin', '--use-drill-file-origin')} ${k('x2', '--no-x2')} ${k('net', '--no-netlist')} "$PCB" > /dev/null`,
    `"$KCLI" pcb export drill --output "$OUT/gerber/" ${k('exc', '--format excellon')} ${k('sep', '--excellon-separate-th')} \\`,
    `  ${k('map', '--generate-map --map-format gerberx2')} ${k('origin', '--drill-origin plot')} ${k('exc', '--excellon-units mm')} "$PCB" > /dev/null`,
    `(cd "$OUT/gerber" && rm -f ../QB12_Gerber.zip && zip -q ../QB12_Gerber.zip $(ls | ${k('zip', 'grep -v drl_map | grep -v gbrjob')}))`,
    `"$KCLI" pcb export pos --output "$OUT/pos_raw.csv" ${k('pos', '--format csv --units mm --side front')} ${k('origin', '--use-drill-file-origin')} "$PCB" > /dev/null`,
    c('# …第 23–25 行：把 KiCad 的 .pos 改成 JLC 的 CPL'),
    `    w.writerow(${k('cpl', '["Designator", "Mid X", "Mid Y", "Layer", "Rotation"]')})`,
    `    for r in rows:`,
    `        w.writerow([r["Ref"], ${k('cpl', `f'{float(r["PosX"]):.3f}mm', f'{float(r["PosY"]):.3f}mm', "Top", f'{float(r["Rot"]) % 360:.0f}'`)}])`,
    '',
    `<span class="p7-k note" data-k="def" role="button" tabindex="0">${esc('# ← 课程注：没写的参数用 kicad-cli 默认值：Protel 扩展名 开、坐标精度 6（4.6 格式）、椭圆孔 alternate、零格式 decimal；过孔盖油直接用板上的设置（电路板配置 → 阻焊/锡膏，QB12 两面都盖）')}</span>`
  ];
  $('sh').innerHTML = lines.map(l => `<span class="p7-ln">${l || ' '}</span>`).join('');
  const tick = '✓ 符合', fixed = '✓ 已改', opt = '○ 可选';
  const SET = [
    { k: 'layers', n: '导出哪些层', st: tick, jlc: '双层板 9 层：铜、钢网、丝印、阻焊各两层，加 Edge.Cuts', ui: '包含层', qb: `--layers 正好这 9 层，zip 里 ${gerbN} 个 Gerber` },
    { k: 'def', n: 'Protel 扩展名', st: tick, jlc: 'JLC 偏好 Protel 扩展名（.gtl .gbl …）', ui: '使用 Protel Gerber 文件扩展名', qb: 'kicad-cli 默认就开（没写 --no-protel-ext）' },
    { k: 'x2', n: 'Gerber X2 格式', st: fixed, jlc: '嘉立创：只收 RS-274-X，不支持 X2；JLC 教程也不勾', ui: '使用 Gerber X2 格式 (推荐) → 不勾', qb: '第一版没写 --no-x2（带 X2）；10-19 已加上重导' },
    { k: 'net', n: '网表属性', st: fixed, jlc: 'JLC 教程不勾', ui: '包含网表特性 → 不勾', qb: '第一版没写 --no-netlist（焊盘带 %TO 属性）；10-19 已加上重导' },
    { k: 'sub', n: '剔除焊盘上的丝印', st: tick, jlc: 'JLC 教程勾选', ui: '剔除阻焊开窗中的丝印', qb: '--subtract-soldermask' },
    { k: 'def', n: '过孔盖油', st: tick, jlc: 'JLC 教程勾选', ui: '电路板配置 → 电路板叠层 → 阻焊/锡膏 → 过孔盖油: 顶层 / 底层（KiCad 9 起不在绘制对话框里）', qb: `板上设置两面都盖油，kicad-cli 绘图时直接用它；阻焊层里 ${maskF} 个开窗全是焊盘和孔，${S.vias} 个过孔没有开窗` },
    { k: 'def', n: '坐标格式', st: tick, jlc: '4.6，单位 mm', ui: '坐标格式', qb: '默认精度 6 → 文件头 %FSLAX46Y46*% %MOMM*%' },
    { k: 'exc', n: '钻孔格式与单位', st: tick, jlc: 'Excellon、毫米、十进制', ui: '格式: Excellon / 单位: / 零点:', qb: '--format excellon --excellon-units mm，零格式默认 decimal' },
    { k: 'sep', n: 'PTH、NPTH 分开', st: tick, jlc: '分成两个文件（不合并）', ui: '将电镀孔 (PTH) 和非电镀孔 (NPTH) 到合并单个文件中 → 不勾', qb: `--excellon-separate-th → PTH.drl + NPTH.drl` },
    { k: 'def', n: '椭圆孔', st: tick, jlc: '使用备选钻孔模式', ui: '对椭圆孔使用备选钻孔模式 → 勾', qb: `kicad-cli 默认 alternate，${slotN} 个槽孔写成 G85` },
    { k: 'origin', n: '原点', st: tick, jlc: '三份文件用同一个原点；JLC 教程全用绝对原点', ui: '使用 钻孔/定位 文件原点 / 原点:', qb: 'Gerber、钻孔、坐标都用左下角辅助原点，没有混用' },
    { k: 'map', n: '钻孔图', st: opt, jlc: 'JLC 强烈建议生成（标明金属化和槽孔）', ui: '生成映射:（选 Gerber X2）', qb: '生成了（Gerber X2 格式），但没放进 zip' },
    { k: 'zip', n: 'zip 里放什么', st: tick, jlc: 'Gerber + 钻孔；JLC 教程不生成作业文件', ui: '生成 Gerber 作业文件 → 不勾', qb: `去掉钻孔图和 .gbrjob，zip 里正好 ${F.gerbers.length} 个文件` },
    { k: 'pos', n: '坐标文件', st: tick, jlc: 'CSV、毫米；列名 Designator, Mid X, Mid Y, Rotation, Layer', ui: '元件定位文件：格式 / 单位 / 生成包含正面和背面定位的单个文件', qb: '--format csv --units mm --side front（只导顶面）' },
    { k: 'cpl', n: 'CPL 列名和格式', st: tick, jlc: '样例坐标带 mm 后缀，Layer 写 Top / Bottom', ui: '（KiCad 不管，要自己改表头）', qb: `Python 改列名、加 mm、写 Top、角度取 360 的余数，${F.cpl.length} 行` },
    { k: 'none', n: '导出前', st: tick, jlc: '再跑一次 DRC；绘制前检查铺铜填充', ui: '检查 → 设计规则检查 / 绘制前检查填充区填充内容', qb: 'finalize.py 最后重新铺铜，drc.sh 跑的就是这块板（第 6 课）' }
  ];
  const grid = $('set');
  grid.innerHTML = SET.map((s, i) => `<div class="p7-set" role="listitem" tabindex="0" data-si="${i}" data-k="${s.k}"><div class="p7-seth"><b>${esc(s.n)}</b><span class="p7-tag ${s.st === tick ? 'ok' : s.st === fixed ? 'fix' : 'opt'}">${s.st}</span></div>` +
    `<div><span>JLC 要求</span><span>${esc(s.jlc)}</span></div><div><span>对话框里</span><span>${esc(s.ui)}</span></div><div><span>QB12</span><span>${esc(s.qb)}</span></div></div>`).join('');
  const hi = (key, si) => {
    $('sh').querySelectorAll('.p7-k').forEach(e => e.classList.toggle('on', e.dataset.k === key));
    grid.querySelectorAll('.p7-set').forEach(e => e.classList.toggle('on', si != null ? +e.dataset.si === si : e.dataset.k === key));
  };
  const onKey = (e, fn) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
  $('sh').addEventListener('click', e => { const s = e.target.closest('.p7-k'); if (s) { hi(s.dataset.k); const c0 = grid.querySelector(`.p7-set[data-k="${s.dataset.k}"]`); if (c0 && window.matchMedia('(max-width:900px)').matches) c0.scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'nearest' }); } });
  $('sh').addEventListener('keydown', e => { const s = e.target.closest('.p7-k'); if (s) onKey(e, () => hi(s.dataset.k)); });
  grid.addEventListener('click', e => { const s = e.target.closest('.p7-set'); if (s) hi(s.dataset.k, +s.dataset.si); });
  grid.addEventListener('keydown', e => { const s = e.target.closest('.p7-set'); if (s) onKey(e, () => hi(s.dataset.k, +s.dataset.si)); });
  hi('x2', 2);
  $('x2tip').innerHTML = `<b>QB12 在这一项上改过一次。</b>10-13 的第一版脚本没写 <span class="net">--no-x2</span> 和 <span class="net">--no-netlist</span>，Gerber 开头是 <span class="net">%TF…</span> 属性行，焊盘上还带着 <span class="net">%TO…</span> 网表属性（7.2 节摘录切到“第一版”能看到）。嘉立创《下单前必看》写明只接受 RS-274-X、不支持 Gerber X2，JLC 的教程截图里也没勾，所以 10-19 加上这两个参数重新导出：9 个 Gerber 的画图命令逐字节相同，只是 %TF 行变成了 G04 注释、网表属性去掉了；两个钻孔文件只有日期行不同。10-20 改用 KiCad 10.0.6、同样的参数再导出一次，现在交付的 QB12_Gerber.zip（${nf(F.zip_bytes)} 字节）就是这一版，旧版留了备份。你自己在对话框里导出时，取消勾选 <span class="menu">使用 Gerber X2 格式 (推荐)</span> 和 <span class="menu">包含网表特性</span> 就行。`;
})();

/* ================= 7.7 上传前检查 ================= */
const CKV = BoardViewer.create($('ckv'), { mode: 'made', side: 'top', layers: [], toolbar: false, panel: false, hover: false, label: '上传前检查：查看器切到每一项要看的层' });
const j1 = QB.fp('J1'), u2 = QB.fp('U2');
const CK = [
  { t: '尺寸和层数', s: '上传后下单页会自动识别', x: `下单页上传 zip 后会自动识别板子尺寸和层数，应该显示 ${BW} × ${BH} mm、${S.copper_layers} 层。对不上就先别往下走，回头查板框层和导出的层。`,
    run: () => { CKV.show({ mode: 'made', side: 'top', layers: [], mask: 'green', finish: 'hasl' }).reset().badge(`${BW} × ${BH} mm · ${S.copper_layers} 层`); } },
  { t: '外形是一整圈', s: 'Edge_Cuts.gm1', x: '板框必须是一圈首尾相接的线，有缺口工厂就不知道沿哪切。开槽、挖孔也画在这一层（QB12 没有）。',
    run: () => { CKV.show({ mode: 'film', layers: ['Edge.Cuts'] }).reset().badge('QB12-Edge_Cuts.gm1 · 4 段直线 + 4 段圆弧'); } },
  { t: '钻孔对得上焊盘', s: 'PTH.drl / NPTH.drl + 铜层', x: `钻孔和 Gerber 是两套文件，原点设错了，孔会整体偏开。放大看几处：每个孔都应该落在焊盘或过孔正中。这里放大的是 J1：${F.pth.find(t => t.slots) ? F.pth.find(t => t.slots).slots : 0} 个槽孔 + 2 个定位孔。`,
    run: () => { CKV.show({ mode: 'layers', layers: ['F.Cu', 'B.Cu', 'Vias', 'Drill', 'Edge.Cuts'], tracks: true }).focus('J1', { pad: 1.5 }).badge('J1 · 槽孔和定位孔'); } },
  { t: '过孔盖了油', s: 'F_Mask.gts', x: `阻焊胶片上，黑的是开窗。灰色小圈是 ${S.vias} 个过孔的位置：除了 U2、U4 散热焊盘开窗里的 ${viaInEP} 个散热过孔，其余 ${S.vias - viaInEP} 个都在白色区域里，说明盖着油。`,
    run: () => { CKV.show({ mode: 'film', layers: ['F.Mask'] }).reset().badge(`F_Mask · ${maskF} 个开窗，过孔单独开窗 0 个`); CKV.annotate(`<path class="p7-ghost" d="${outlineD}"/>` + D.vias.map(v => `<circle cx="${v.x}" cy="${v.y}" r="${v.d / 2}" class="p7-vdot"/>`).join('')); } },
  { t: '丝印清楚、不压焊盘', s: 'F_Silkscreen.gto + F_Mask.gts', x: `导出时剪掉了压在焊盘开窗上的丝印笔画；剪掉一半的字就看不清了。第 6 课 DRC 报的 ${silkCut.n} 条“${silkCut.zh}”就是这类。看一眼位号和 1 脚标记还完整不完整。`,
    run: () => { CKV.show({ mode: 'layers', layers: ['F.Mask', 'F.SilkS', 'Edge.Cuts'] }).focus('motor', { pad: 1 }).badge('丝印（黄）+ 阻焊开窗（紫）'); } },
  { t: '钢网（QB12 加的一项）', s: 'F_Paste.gtp', x: `钢网开孔基本和焊盘一样大。U2 散热焊盘的开孔只有 ${Math.round(epK * 100)}% × ${Math.round(epK * 100)}%（虚线是焊盘本身），U4 也一样。底面的 B_Paste 是空的。`,
    run: () => {
      CKV.show({ mode: 'film', layers: ['F.Paste'] }).focus('U2', { pad: 1.2 }).badge('F_Paste · U2 散热焊盘');
      CKV.annotate(epPads.map(p => `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" class="p7-box"/>`).join(''));
    } }
];
(function () {
  const ol = $('ck'), done = new Set();
  ol.innerHTML = CK.map((c, i) => `<li data-i="${i}"><button aria-pressed="false"><b>${i + 1}. ${c.t}</b><small>${c.s}</small><span>${c.x}</span></button></li>`).join('');
  const st = $('ck-st');
  const upd = () => {
    st.className = 'status' + (done.size === CK.length ? ' good' : '');
    st.textContent = done.size === CK.length ? `${CK.length} 项都看过了。文件可以上传了：第 8 课。` : `已看 ${done.size} / ${CK.length} 项。`;
  };
  const go = (i, mark) => {
    CKV.clear().clearAnnotations();
    CK[i].run();
    ol.querySelectorAll('li').forEach((li, j) => li.querySelector('button').setAttribute('aria-pressed', String(j === i)));
    if (mark !== false) { done.add(i); ol.children[i].classList.add('done'); }
    upd();
  };
  ol.addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    go(+li.dataset.i);
    const r = $('ckv').getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) $('ckv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'nearest' });
  });
  CKV.show({ mode: 'made' }).badge('点右边的第一项开始');
  ol.querySelector('li button').setAttribute('aria-pressed', 'false');
  upd();
})();

/* ================= 7.8 自测 ================= */
(function () {
  const viaN = viaHoleN;
  const by = {}; npthPads.forEach(p => { by[p.ref] = by[p.ref] || []; by[p.ref].push(p); });
  $('q1').innerHTML = `PTH 孔钻完要在孔壁镀铜（过孔、插件脚靠它把两层连起来），NPTH 只钻不镀，孔周的铜还要掏掉。分成两个文件，工厂一眼就知道哪些孔要镀铜、哪些要封住。QB12 的 NPTH 一共 ${npthN} 个：` +
    Object.entries(by).map(([r, ps]) => `${r} 的 ${ps.length} 个定位柱孔（${ps[0].drill[0]} mm）`).join('、') + `。其余 ${pthN} 个都是 PTH，其中 ${viaN} 个是过孔。`;
  const row = F.cpl.find(r => r[0] === 'J1');
  $('q2').innerHTML = `CPL 的原点在板子左下角、Y 朝上；本课坐标的原点在左上角、y 朝下。所以 Mid Y = ${BH} − ${f1(j1.y)} = ${f1(BH - j1.y)} mm（${BH} 是板子高度），Mid X 不变。交付文件里这一行是 <span class="net">${esc(row.join(','))}</span>。`;
  document.querySelectorAll('#p7 [data-p7q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p7q;
    if (q === '1') {
      $('drv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });
      drMode = 'film'; drSel = -1; if (drLazy) drLazy.done = true; drShow();
      $('dr-tbl').querySelectorAll('tbody tr').forEach(tr => tr.classList.toggle('on', DRT[+tr.dataset.i].file === 'NPTH'));
      ringsFilm(DRV, npthPads.map(p => ({ x: p.x, y: p.y, r: p.drill[0] / 2 + 0.45 })));
      DRV.reset().badge(`NPTH · ${npthN} 个孔`);
      $('dr-note').textContent = `橙圈是 ${npthN} 个 NPTH 孔。`;
    } else if (q === '2') { coOrg = 'aux'; C.pressOne('#p7 [data-coo]', 'coo', 'aux'); coSel('J1', true); }
    else { $('rot').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' }); rotPick('U2', true); }
  }));
})();
