/* 第 0 课：全景。所有数字都从 QB.board（真实设计文件抽出来的数据）现算，不手写。 */
const D = QB.board, S = D.stats;
const $ = id => document.getElementById('p0-' + id);
const RMx = C.RM;
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('zh-CN');
const pct = (a, b) => Math.round(a / b * 100);
const net = n => `<span class="net ${QB.netCls(n) === 's' ? 's' : QB.netCls(n) === 'p' ? 'p' : ''}">${n}</span>`;
const cls = name => D.classes.find(c => c.name === name);
const nFpKinds = new Set(D.footprints.map(f => f.fp)).size;
const lockedT = D.tracks.filter(t => t[7]);
const gndI = QB.netIndex('GND');
const lockedGndT = lockedT.filter(t => t[0] === gndI).length;
const freeT = S.tracks - S.locked_tracks;
const R = S.via_roles;
const preVias = S.locked_vias;                         // 布线前脚本打的（锁定）
const frVias = R.signal - D.vias.filter(v => v.role === 'signal' && v.locked).length;  // Freerouting 打的信号孔
const postVias = R.stitch + R.module;                  // 布线后脚本补的
const gerbN = D.fab.gerbers.filter(g => !g.file.endsWith('.drl')).length;
const drlN = D.fab.gerbers.length - gerbN;
const pthN = D.fab.pth.reduce((a, t) => a + t.n, 0), npthN = D.fab.npth.reduce((a, t) => a + t.n, 0);
const area = S.area, aF = S.gnd_area['F.Cu'], aB = S.gnd_area['B.Cu'];
const fr = D.process.tools.freerouting;
const minTrack = D.rules.min_track_width, minClr = D.rules.min_clearance, minHole = D.rules.min_through_hole_diameter, edgeClr = D.rules.min_copper_edge_clearance;
const drcT = Object.fromEntries(D.drc.by_type.map(t => [t.type, t.n]));
const dp = QB.net('USB_DP'), dn = QB.net('USB_DN');

/* ================= 0.1 数字 + 尺寸对比 ================= */
(function () {
  const tiles = [
    ['板子大小', `${S.size[0]} × ${S.size[1]}`, 'mm，圆角 R' + S.corner_r],
    ['板厚 · 铜层', `${S.thickness} mm · ${S.copper_layers} 层`, '顶层 + 底层'],
    ['元件', S.footprints, `个，全部在顶面`],
    ['焊盘', S.pads, `个，贴片焊盘 ${S.smd_pads} 个`],
    ['网络', S.nets, '个（同一网络的脚要连通）'],
    ['走线', S.tracks, `段，共 ${fmt1(S.track_len)} mm`],
    ['过孔', S.vias, `个，接地的 ${S.gnd_vias} 个`],
    ['DRC', `${D.drc.errors} 错误`, `${D.drc.unconnected} 处没连上`]
  ];
  const box = $('nums');
  box.innerHTML = tiles.map(([k, v, s], i) => `<div class="ro"><small>${k}</small><b data-i="${i}">${v}</b><small>${s}</small></div>`).join('');
  const nums = [...box.querySelectorAll('b')].filter(b => /^\d+$/.test(b.textContent));
  C.onVisible(box, () => nums.forEach(b => C.countUp(b, +b.textContent, { dur: 1.2 })), '0px');
  // 尺寸对比（1 mm = 1.25 px）
  const svg = $('size'), k = 1.25;
  const card = [85.6, 53.98];
  C.el('rect', { x: 8, y: 8, width: card[0] * k, height: card[1] * k, rx: 3.18 * k, class: 'p0-card-o' }, svg);
  C.el('text', { x: 8 + card[0] * k - 6, y: 8 + card[1] * k - 8, 'text-anchor': 'end', class: 'p0-t mu' }, svg, '银行卡 85.6 × 54');
  C.el('rect', { x: 8, y: 8, width: S.size[0] * k, height: S.size[1] * k, rx: S.corner_r * k, class: 'p0-board-o' }, svg);
  C.el('text', { x: 14, y: 26, class: 'p0-t' }, svg, 'QB12');
  C.el('text', { x: 14, y: 40, class: 'p0-t mu' }, svg, '56 × 38 mm');
  const x2 = 8 + card[0] * k + 26;
  C.el('text', { x: x2, y: 36, class: 'p0-t' }, svg, `面积 ${Math.round(area)} mm²`);
  C.el('text', { x: x2, y: 54, class: 'p0-t mu' }, svg, `约银行卡的 ${pct(area, card[0] * card[1] - (4 - Math.PI) * 3.18 * 3.18)}%`);
  C.el('text', { x: x2, y: 80, class: 'p0-t' }, svg, `顶层铺地 ${pct(aF, area)}%`);
  C.el('text', { x: x2, y: 98, class: 'p0-t' }, svg, `底层铺地 ${pct(aB, area)}%`);
})();

/* ================= 0.2 九步流水线 ================= */
const B = BoardViewer.create($('bv'), {
  toolbar: false, panel: false, hover: true, lazy: false,
  layers: ['F.Cu', 'B.Cu', 'Courtyard', 'Labels'], tracks: false,
  label: '一步步搭起来的 QB12 板子'
});
const FILMS = [
  ['F.Cu', 'QB12-F_Cu.gtl', '顶层铜'], ['B.Cu', 'QB12-B_Cu.gbl', '底层铜'], ['F.Mask', 'QB12-F_Mask.gts', '顶层阻焊开窗'],
  ['B.Mask', 'QB12-B_Mask.gbs', '底层阻焊开窗'], ['F.SilkS', 'QB12-F_Silkscreen.gto', '顶层丝印'], ['B.SilkS', 'QB12-B_Silkscreen.gbo', '底层丝印'],
  ['F.Paste', 'QB12-F_Paste.gtp', '顶层钢网'], ['Edge.Cuts', 'QB12-Edge_Cuts.gm1', '板框'], ['Drill', 'QB12-PTH.drl + NPTH.drl', '钻孔']
];
const IMG = {
  sch: ['@@ASSET:schematic.webp@@', 'QB12 原理图 Rev A（和电路课是同一张）。它只说明谁和谁连在一起，不管元件放在哪。'],
  top: ['@@ASSET:pcb3d_top.webp@@', '③ 贴片、回流焊之后（3D 渲染，不是照片）'],
  hero: [null, '到手的样子（3D 渲染）。先看、再量、最后才通电。']
};
const leftBV = $('bv'), fig = $('imgfig'), img = $('img'), imgcap = $('imgcap');
function showImg(key) {
  const [src, cap] = IMG[key];
  img.src = src || $('hero-img').src; img.alt = cap; imgcap.textContent = cap;
  fig.hidden = false; leftBV.style.display = 'none';
}
function showBV() { fig.hidden = true; leftBV.style.display = ''; }
const PILE = BoardViewer.pileLayout();
let token = 0;
const alive = t => t === token;

const STEPS = [
  { key: 'sch', name: '原理图', sub: `${S.nets} 个网络`, lesson: 2,
    why: '原理图只回答一个问题：谁和谁连在一起。它不管元件多大、放在哪。把所有连接整理成一张表，就叫<strong>网表</strong>：每个元件的每个脚接到哪个网络。同一个网络里的脚，后面都要用铜连起来。',
    facts: [['元件', `${S.footprints} 个`], ['网络', `${S.nets} 个`], ['网表从哪来', 'netlist.py（原理图 PDF、BOM 也由它生成）']],
    kicad: '在原理图编辑器里画图，给每个符号填好封装（Footprint 字段），然后点 <span class="menu">工具 → 从原理图更新 PCB</span>（<kbd>F8</kbd>），元件和飞线就进到 PCB 编辑器里了。',
    run: async () => { showImg('sch'); } },
  { key: 'fp', name: '封装', sub: `${nFpKinds} 种封装`, lesson: 2,
    why: '原理图里的符号只是示意。<strong>封装</strong>是元件在板子上的“脚印”：每个焊盘多大、离多远、要不要打孔。封装和实物差一点，元件就放不上去，或者焊不牢。刚导进 PCB 时，所有封装堆在一起，就像图里这样。',
    facts: [['封装种类', `${nFpKinds} 种`], ['焊盘', `${S.pads} 个，贴片焊盘 ${S.smd_pads} 个`], ['最密的脚', 'USB-C，0.5 mm 一个脚'], ['从哪来', '立创 EasyEDA 库（3D 模型上印着 LCEDA 标志）']],
    kicad: '常用件直接用 KiCad 自带的封装库；立创商城的件可以用 easyeda2kicad 这类工具按立创编号转换；都没有就在 <span class="menu">封装编辑器</span> 里照数据手册自己画。',
    run: async (t) => {
      showBV(); B.clear().badge(`${S.footprints} 个封装 · ${S.pads} 个焊盘`).reset({ animate: false });
      B.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'B.Cu', 'Courtyard', 'Labels'], tracks: false });
      await B.offsetParts(PILE, { duration: 0.9 });
    } },
  { key: 'place', name: '板框布局', sub: `${S.size[0]}×${S.size[1]} mm`, lesson: 3,
    why: '先在 Edge.Cuts 层画出板子的外形，工厂按这条线把板子切下来。再把元件一个个摆进去。摆放决定了后面好不好走线：连线多的放一起，接口放板边，天线放在角上、远离铜，大电流走的路尽量短。白色细线叫<strong>飞线</strong>，表示“这两个焊盘还没连，但应该连”。',
    facts: [['外形', `${S.size[0]} × ${S.size[1]} mm 圆角矩形，圆角 R${S.corner_r}`], ['面积', `${Math.round(area)} mm²`], ['元件在哪面', `${S.footprints} 个全在顶面，只需贴一面`], ['坐标从哪来', 'build_board.py 里的一张坐标表']],
    kicad: '切到 Edge.Cuts 层（中文界面叫“板框”），用 <span class="menu">放置 → 绘制线条</span> 或 <span class="menu">绘制矩形</span> 画外形；元件按 <kbd>M</kbd> 移动、<kbd>R</kbd> 旋转，边摆边看飞线越来越短、越来越不交叉。',
    run: async (t) => {
      showBV(); B.clear().reset({ animate: false });
      B.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'B.Cu', 'Courtyard', 'Labels'], tracks: false });
      if (!B.offsets || !Object.keys(B.offsets).length) await B.offsetParts(PILE, { duration: 0 });
      B.badge('① 画板框');
      await B.reveal('Edge.Cuts', { duration: 0.6 });
      if (!alive(t)) return;
      B.badge('② 摆元件');
      await B.offsetParts(null, { duration: 1.0, stagger: 0.022 });
      if (!alive(t)) return;
      B.badge('③ 飞线：哪些焊盘要连');
      await B.reveal('Ratsnest', { duration: 0.8 });
    } },
  { key: 'route', name: '走线', sub: `${S.tracks} 段`, lesson: 4,
    why: '走线就是把飞线变成真的铜线。同一个网络的焊盘要连通，不同网络之间要留够间距。电流越大线越粗：线太细，电阻就大，会发热、掉电压。图里红色是顶层的线，蓝色是底层的线。',
    facts: [['走线', `${S.tracks} 段，共 ${fmt1(S.track_len)} mm`], ['顶层 / 底层', `${S.tracks_F} 段 / ${S.tracks_B} 段`],
      ['线宽', `电池 ${cls('Batt').track} · USB 5V ${cls('Power').track} · 电机 ${cls('Motor').track} · 3V3 ${cls('Rail').track} · 信号 ${cls('Default').track} mm`],
      ['谁画的', `${freeT} 段 Freerouting 自动布线，${S.locked_tracks} 段脚本预先画好`]],
    kicad: '先在 <span class="menu">文件 → 电路板配置... → 设计规则 → 网络类</span> 里给电源网络设好线宽；然后按 <kbd>X</kbd> 开始布线，点到目标焊盘结束；布线途中按 <kbd>V</kbd> 放一个过孔并换到另一层。',
    run: async (t) => {
      showBV(); B.clear().badge('布线中…').reset({ animate: false });
      await B.offsetParts(null, { duration: 0 });
      B.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'B.Cu', 'Edge.Cuts', 'F.SilkS'], tracks: false });
      const ok = await B.animateRoute('*', { style: 'layer', duration: 3.4 });
      if (ok && alive(t)) B.badge(`${S.tracks} 段，${fmt1(S.track_len)} mm`);
    } },
  { key: 'pour', name: '过孔铺铜', sub: `${S.vias} 个孔`, lesson: 5,
    why: '两层板上，线有时得从顶层换到底层：打一个孔壁镀了铜的小孔，叫<strong>过孔</strong>。剩下的空地铺成一整片铜，接到 GND，叫<strong>铺铜</strong>。这样所有电流回来的路又宽又短，还能帮忙散热、挡干扰。',
    facts: [['过孔', S.via_sizes.map(([d, h, n]) => `${n} 个 ${d}/${h} mm`).join('，')], ['接地过孔', `${S.gnd_vias} 个：缝合 ${R.stitch}、扇出 ${R.fanout}、散热 ${R.thermal}、模组接地 ${R.module}`],
      ['铺地', `顶层 ${Math.round(aF)} mm²，底层 ${Math.round(aB)} mm²`], ['挖空', '天线下面两层都不铺']],
    kicad: '<span class="menu">放置 → 绘制填充区</span>（<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>，Mac 上是 <kbd>⌥</kbd>+<kbd>Z</kbd>），网络选 GND，沿板框画一圈；改完线以后按 <kbd>B</kbd>（填充所有填充区）重新铺。',
    run: async (t) => {
      showBV(); B.clear().badge('打过孔').reset({ animate: false });
      await B.offsetParts(null, { duration: 0 });
      B.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'B.Cu', 'Edge.Cuts', 'F.SilkS', 'Keepouts'], tracks: true });
      await B.reveal('Vias', { duration: 1.3 });
      if (!alive(t)) return;
      B.toggle('Drill', true); B.badge('两面铺地');
      await B.reveal('Zones', { duration: 1.0 });
    } },
  { key: 'drc', name: 'DRC 检查', sub: `${D.drc.errors} 错误`, lesson: 6,
    why: 'DRC（设计规则检查）让电脑把整块板逐条核对一遍：线够不够宽、两根线离得够不够远、孔离板边够不够远、有没有该连没连上的。再打开 3D 视图，看元件会不会撞在一起、方向对不对。',
    facts: [['规则', `线宽 ≥ ${minTrack} mm，间距 ≥ ${minClr} mm，孔 ≥ ${minHole} mm，铜离板边 ≥ ${edgeClr} mm`], ['结果', `${D.drc.errors} 个错误，${D.drc.unconnected} 处没连上`],
      ['警告', `${D.drc.warnings} 条：` + D.drc.by_type.map(t => `${t.zh} ${t.n}`).join('、')], ['图里', '每个黄圈是一条警告的位置，大多在丝印上']],
    kicad: '<span class="menu">检查 → 设计规则检查</span>，点 <span class="menu">运行 DRC</span>，点列表里的一条，板上会标出那个位置；看 3D：<span class="menu">视图 → 3D 查看器</span>（<kbd>Alt</kbd>+<kbd>3</kbd>）。',
    run: async (t) => {
      showBV(); B.clear().reset({ animate: false });
      await B.offsetParts(null, { duration: 0 });
      B.show({ mode: 'layers', side: 'top', layers: ['F.Cu', 'B.Cu', 'Vias', 'Zones', 'Drill', 'Edge.Cuts', 'F.SilkS'], tracks: true });
      B.badge(`${D.drc.errors} 错误 · ${D.drc.unconnected} 未连接 · ${D.drc.warnings} 警告`);
      await B.reveal('DRC', { duration: 1.2, sweep: 'rand' });
    } },
  { key: 'fab', name: '生产文件', sub: `${D.fab.gerbers.length} 个文件`, lesson: 7,
    why: '工厂不用 KiCad，只认通用格式。每一层导出一张 <strong>Gerber</strong>（可以想成一张底片），再加<strong>钻孔文件</strong>告诉钻机在哪打多大的孔。要贴片的话还要两张表：<strong>BOM</strong>（买哪些元件）和<strong>坐标文件</strong>（每个元件贴在哪、转多少度）。点下面的文件名看它画的是什么。',
    facts: [['Gerber', `${gerbN} 层：顶 / 底铜、阻焊、丝印、钢网，加板框`], ['钻孔', `${drlN} 个文件：金属化孔 ${pthN} 个，非金属化孔 ${npthN} 个`], ['BOM', `${D.fab.bom.length} 行（同型号合并）`], ['坐标文件', `${D.fab.cpl.length} 行，原点在板子左下角`]],
    files: true,
    kicad: '<span class="menu">文件 → 制造输出 → Gerbers (.gbr)...</span>，勾选要导出的层；钻孔用同一个菜单里的 <span class="menu">钻孔文件 (.drl)...</span>；坐标文件是 <span class="menu">元件定位文件 (.pos, .gbr)...</span>。',
    run: async (t) => {
      showBV(); B.clear().reset({ animate: false });
      await B.offsetParts(null, { duration: 0 });
      for (let round = 0; round < 99 && alive(t); round++) {
        for (const [l, file, zh] of FILMS) {
          if (!alive(t) || filmPinned) return;
          B.show({ mode: 'film', side: 'top', layers: [l] }).badge(`${file} · ${zh}`);
          markFilm(l);
          await wait(1100);
        }
        if (playing) return;
      }
    } },
  { key: 'smt', name: '下单 SMT', sub: `${S.footprints} 个元件`, lesson: 8,
    why: '板厂先做光板：钻孔、孔壁镀铜、把铜箔蚀刻成线路、刷阻焊油（盖住不该焊的铜）、印丝印、给露出来的焊盘做表面处理（喷锡或沉金），最后按板框切下来。然后 SMT 贴片：用钢网往焊盘上刷锡膏，贴片机把元件放上去，过回流焊炉把锡膏熔化。',
    facts: [['上传', 'Gerber 压缩包 + BOM + 坐标文件'], ['贴片面', '只有顶面，一次贴完'], ['钢网', 'F.Paste 层的开口；U2、U4 的散热焊盘开口缩到约一半，免得锡太多把芯片顶起来'], ['图里', '光板 → 刷锡膏 → 贴完（3D 渲染）']],
    kicad: '这一步不在 KiCad 里，在嘉立创的下单页面：上传 Gerber 压缩包，打开 SMT 贴片，再上传 BOM 和坐标文件，最后在预览里逐个核对元件的位置和方向。',
    run: async (t) => {
      showBV(); B.clear().reset({ animate: false });
      await B.offsetParts(null, { duration: 0 });
      B.show({ mode: 'made', side: 'top', layers: [], finish: 'hasl', mask: 'green' }).badge('① 光板（这里画成绿油、白字、喷锡）');
      await wait(1800); if (!alive(t)) return;
      B.show({ layers: ['F.Paste'] }).badge('② 钢网刷锡膏（灰色就是锡膏）');
      await wait(2000); if (!alive(t)) return;
      showImg('top');
    } },
  { key: 'check', name: '到货检查', sub: '先看再量', lesson: 8,
    why: '板子到手先别急着插电池：先用眼睛看（有没有连锡、元件方向对不对），再用万用表量电源和地之间有没有短路，最后一路一路通电。每一步只多加一样东西，出了问题马上知道是哪一块。',
    facts: [['清单', '电路课 9.4 节：11 步，从“看”到“水盆试航”'], ['先量短路', `${['VSYS', '3V3', 'BAT+'].join('、')} 对 GND`], ['先插 USB', '不接电池，VBUS ≈ 5V，3V3 ≈ 3.3V（3.27–3.33V 都正常）']],
    kicad: '这一步用不到 KiCad。量的时候打开这页的查看器，点元件就能查到每个脚接哪个网络、在板上哪个位置。',
    run: async () => { showImg('hero'); } }
];

let cur = 0, playing = false, filmPinned = false;
const card = { title: $('st-title'), why: $('st-why'), facts: $('st-facts'), kicad: $('st-kicad'), more: $('st-more') };
const LESSON_TITLE = ['', 'PCB 是什么做的', '封装：从符号到焊盘', '板框与布局', '走线', '过孔与铺铜', '检查：DRC 与 3D', '出生产文件', '下单与到货'];
function markFilm(l) { card.facts.querySelectorAll('[data-film]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.film === l))); }
function fillCard(i) {
  const s = STEPS[i];
  card.title.textContent = `第 ${i + 1} 步 · ${s.name}`;
  card.why.innerHTML = s.why;
  card.facts.innerHTML = s.facts.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('') +
    (s.files ? `<div class="p0-files">${FILMS.map(([l, f]) => `<button class="bv-chip" data-film="${l}" aria-pressed="false">${f}</button>`).join('')}</div>` : '');
  card.kicad.innerHTML = s.kicad;
  card.more.href = '#p' + s.lesson;
  card.more.textContent = `第 ${s.lesson} 课细讲：${LESSON_TITLE[s.lesson]} →`;
  $('steplab').textContent = `${i + 1} / ${STEPS.length}`;
}
card.facts.addEventListener('click', e => {
  const b = e.target.closest('[data-film]'); if (!b) return;
  stopPlay(); filmPinned = true; token++;
  const f = FILMS.find(x => x[0] === b.dataset.film);
  B.show({ mode: 'film', side: 'top', layers: [f[0]] }).badge(`${f[1]} · ${f[2]}`); markFilm(f[0]);
});

/* 流程条：宽屏一排九个，窄屏 3 × 3 蛇形 */
const flowSvg = $('flow');
let flowLayout = null, flowDots = null, nodes = [];
function drawFlow() {
  const w = flowSvg.parentNode.clientWidth || 800;
  const narrow = w < 640;
  if (flowLayout === narrow && nodes.length) return;
  flowLayout = narrow;
  flowSvg.innerHTML = '';
  let pts, vb, nw, nh;
  if (!narrow) {
    nw = 98; nh = 74; const gap = (1000 - 9 * nw) / 8;
    pts = STEPS.map((_, i) => [i * (nw + gap) + nw / 2, 50]); vb = '0 0 1000 100';
  } else {
    nw = 104; nh = 74;
    const cx = [60, 180, 300], cy = [48, 148, 248];
    pts = STEPS.map((_, i) => { const r = Math.floor(i / 3), c = i % 3; return [cx[r % 2 ? 2 - c : c], cy[r]]; });
    vb = '0 0 360 296';
  }
  flowSvg.setAttribute('viewBox', vb);
  flowSvg.dataset.layout = narrow ? 'snake' : 'row';
  flowSvg._pts = pts;
  C.el('path', { d: 'M' + pts.map(p => p.join(' ')).join('L'), class: 'p0-track' }, flowSvg);
  flowSvg._prog = C.el('path', { d: 'M0 0', class: 'p0-prog' }, flowSvg);
  flowSvg._dots = C.el('g', {}, flowSvg);
  nodes = STEPS.map((s, i) => {
    const [x, y] = pts[i];
    const g = C.el('g', { class: 'p0-node', role: 'button', tabindex: 0, 'aria-label': `第 ${i + 1} 步 ${s.name}` }, flowSvg);
    C.el('rect', { x: x - nw / 2, y: y - nh / 2, width: nw, height: nh, rx: 11 }, g);
    C.el('text', { x: x - nw / 2 + 9, y: y - nh / 2 + 16, class: 'p0-n' }, g, String(i + 1).padStart(2, '0'));
    C.el('text', { x, y: y + 6, 'text-anchor': 'middle', class: 'p0-nm' }, g, s.name);
    C.el('text', { x, y: y + 25, 'text-anchor': 'middle', class: 'p0-sb' }, g, s.sub);
    g.addEventListener('click', () => { stopPlay(); go(i); });
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopPlay(); go(i); } });
    return g;
  });
  markFlow();
}
function markFlow() {
  nodes.forEach((g, i) => { g.classList.toggle('on', i === cur); g.classList.toggle('done', i < cur); g.setAttribute('aria-pressed', String(i === cur)); });
  const pts = flowSvg._pts.slice(0, cur + 1);
  const d = 'M' + pts.map(p => p.join(' ')).join('L');
  flowSvg._prog.setAttribute('d', pts.length > 1 ? d : 'M0 0');
  if (flowDots) { flowDots.remove(); flowDots = null; }
  if (pts.length > 1 && !RMx) flowDots = C.flow(flowSvg._dots, d, 'p0-dot', 70, 30, 3.6);
}
async function go(i, auto) {
  cur = Math.max(0, Math.min(STEPS.length - 1, i));
  const my = ++token; filmPinned = false;
  fillCard(cur); markFlow();
  try { await STEPS[cur].run(my); } catch (e) { console.error(e); }
  if (playing && alive(my)) {
    await wait(cur === 6 ? 300 : 2200);
    if (!playing || !alive(my)) return;
    if (cur < STEPS.length - 1) go(cur + 1, true); else stopPlay();
  }
}
const playBtn = $('play');
function stopPlay() { playing = false; playBtn.textContent = '▶ 从头播放'; }
playBtn.addEventListener('click', () => {
  if (playing) { stopPlay(); return; }
  playing = true; playBtn.textContent = '■ 停止'; go(0, true);
});
$('prev').addEventListener('click', () => { stopPlay(); go(cur - 1); });
$('next').addEventListener('click', () => { stopPlay(); go(cur + 1); });
drawFlow();
let rzT = 0;
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(drawFlow, 120); });
fillCard(0);
go(0);

/* ================= 0.3 真板导览 ================= */
const TB = BoardViewer.create($('tourbv'), { toolbar: true, nets: true, panel: true, hover: true, label: 'QB12 真板导览：可缩放，点元件看引脚和网络' });
const STOPS = [
  { t: '左边一排插座', f: 'connectors', a: () => TB.highlightNet(['ML+', 'ML-', 'MR+', 'MR-', 'BAT+']),
    x: `三个 2 mm 间距的 PH2.0 插座排在左边一条边上：J3 接左电机、J4 接右电机、J2 接电池。线都从同一侧进来，不会横穿整块板。电机线是 ${cls('Motor').track} mm（Motor 网络类），电池正极 ${net('BAT+')} 是 ${cls('Batt').track} mm（Batt 网络类），电流越大线越粗。切到<span class="menu">底面</span>能看到背面丝印写着 L MOTOR、R MOTOR、BATTERY 1S，翻过来插线不会插错。` },
  { t: '主控 ESP32-S3 模组', f: 'mcu', a: () => { TB.highlightParts(['U1', 'C5', 'C6']); TB.highlightNet('3V3', { keep: true }); },
    x: `U1 是一整块模组，芯片、Flash、晶振和天线都在模组里，板子只负责给它供电、把引脚接出去。左边一列贴着它：C6（100nF）和 C5（10µF）挨着 3V3 脚（2 号脚），R7 + C7 是 EN 上电延时，R10 是 nFAULT 上拉。亮着的是 ${net('3V3')} 网络：${cls('Rail').track} mm 线，${QB.net('3V3').segs} 段，共 ${fmt1(QB.net('3V3').len)} mm。模组肚子下面有 3 × 3 块接地焊盘（41 号），中间的 ${R.module} 个过孔把地接到底层。` },
  { t: '天线：下面不许有铜', f: 'antenna', a: () => { TB.toggle('Keepouts', true); },
    x: '模组最上面丝印画着的那段弯弯曲曲的线，就是模组里 2.4 GHz 天线（Wi‑Fi 和蓝牙共用）的位置。天线附近有铜会让天线失谐、把电磁波挡回去，所以从板子上边缘往下 7.4 mm、横向从 34 mm 到板边这一块是<strong>禁布区</strong>：两层都不走线、不打孔、不铺铜（橙色斜线）。切到<span class="menu">底面</span>，能看到底层整面的地在这里留了一个缺口。' },
  { t: '电源开关与自动切换', f: 'switch', a: () => TB.highlightNet(['BAT+', 'BAT_SW', 'VSYS']),
    x: `拨动开关 SW1 只管 Q2 的栅极，走的是细线；真正的电池电流从 J2 出来，经过 Q2、Q1（两颗 AO3401A），再进 ${net('VSYS')}。这条大电流的路用 ${cls('Batt').track} mm 粗线。Q2 漏极到 Q1 漏极那一小段 ${net('BAT_SW')} 是脚本预先画好的 0.8 mm 直连。原理见电路课第 4、5 课。` },
  { t: '储能电容、二极管和 3.3V 稳压', f: 'power', a: () => { TB.highlightParts(['C9', 'C10', 'C14', 'C15', 'D1', 'U3']); TB.highlightNet('VSYS', { keep: true }); },
    x: `四颗 22µF（C9、C10、C14、C15）是电机电源的“小水库”，电机一启动先从它们这里取电。C9 和 C14 之间有一段脚本预先画好的 0.8 mm ${net('VSYS')} 短接线，让大电容就近给电机驱动供电。D1（SS34）是 USB 供电进 VSYS 的二极管；U3 是 3.3V 稳压芯片，C3、C4 是它两边的电容。` },
  { t: '电机驱动 DRV8833', f: 'motor', a: () => { TB.highlightNet(['ML+', 'ML-', 'MR+', 'MR-', 'ISENA', 'ISENB']); TB.highlightVias('thermal', { keep: true }); },
    x: `U2 的脚距只有 0.65 mm，肚子底下有一块 2.74 mm 见方的散热焊盘。焊盘里一共 9 个孔（封装自带 4 个，脚本又补了 5 个，加了圈的那些），把热量导到底层整面的地上。R15、R16 是 0.2Ω 的限流采样电阻，用比 0603 大的 1206 封装。电机线 ${cls('Motor').track} mm。VM 脚（12 号）只有 0.35 mm 宽，所以先用 0.35 mm 细线引出 1.9 mm，再接粗电源线。` },
  { t: '锂电池充电 TP4056', f: 'charge', a: () => { TB.highlightParts(['U4', 'R3', 'LED1', 'LED2']); TB.highlightVias(v => v.role === 'thermal' && v.y > 25, { keep: true }); },
    x: `U4 底下也有一块 3.3 × 2.4 mm 的散热焊盘，打了 3 × 2 = 6 个散热过孔。线性充电时，多出来的电压全部变成热，所以要导走。R3（2kΩ）决定充电电流；LED1 红灯 = 充电中，LED2 绿灯 = 充满。` },
  { t: 'USB-C 接口', f: 'usb', a: () => { TB.toggle('Keepouts', true); TB.highlightNet(['USB_DP', 'USB_DN', 'CC1', 'CC2', 'VBUS']); },
    x: `J1 卡在下边缘，插口伸出板外一点。它的 12 个贴片焊盘里，中间 8 个脚中心只隔 0.5 mm。脚本给 J1 的焊盘单独写了 ${QB.fp('J1').pads.find(p => p.clr).clr} mm 的间距覆盖值（网络类默认 ${cls('Default').clearance} mm，脚本没写原因）；约束里的最小间距 ${minClr} mm 是硬下限，所以实际按 ${minClr} mm 检查和铺铜。两个 ${net('VBUS')} 焊盘各往上打一个过孔，在底层用 0.5 mm 线连起来。金属外壳下面顶层不走线（禁布区）。紧挨着的 U5 是 ESD 保护，R1、R2 是 CC 下拉。${net('USB_DP')} / ${net('USB_DN')} 是 0.2 mm 的普通线，长 ${fmt1(dp.len)} / ${fmt1(dn.len)} mm；ESP32-S3 的 USB 是全速 12 Mbit/s，这么短没有按差分阻抗来控制，第 4 课讲什么时候必须控。` },
  { t: '按键、状态灯和电压检测', f: 'buttons', a: () => { TB.highlightParts(['SW2', 'SW3', 'LED3']); TB.highlightNet(['VBAT_ADC', 'USB_DET'], { keep: true }); },
    x: `SW2（BOOT）和 SW3（RESET）放在下边缘，背面丝印印着 BOOT、RESET。R11、R12 加 C8 把电池电压分一半送进 IO1（${net('VBAT_ADC')}）；R17、R18 用同样的办法检测 USB 有没有插着（${net('USB_DET')}）；LED3 + R6 是状态灯。` }
];
let stop = 0;
const stopsEl = $('stops');
const SHORT = ['插座', '主控', '天线', '电源开关', '储能与稳压', '电机驱动', '充电', 'USB-C', '按键与检测'];
stopsEl.innerHTML = STOPS.map((s, i) => `<button class="btn" data-stop="${i}" aria-pressed="false">${i + 1} ${SHORT[i]}</button>`).join('');
function goStop(i) {
  stop = (i + STOPS.length) % STOPS.length;
  const s = STOPS[stop];
  C.pressOne('#p0-stops [data-stop]', 'stop', stop);
  $('stop-n').textContent = `第 ${stop + 1} 站 / ${STOPS.length}`;
  $('stop-title').textContent = s.t;
  $('stop-text').innerHTML = s.x;
  TB.clear();
  if (s.f !== 'antenna' && s.f !== 'usb') TB.toggle('Keepouts', false);
  s.a();
  TB.focus(s.f, { pad: 2.5 });
}
stopsEl.addEventListener('click', e => { const b = e.target.closest('[data-stop]'); if (b) goStop(+b.dataset.stop); });
$('stop-prev').addEventListener('click', () => goStop(stop - 1));
$('stop-next').addEventListener('click', () => goStop(stop + 1));
goStop(0);

/* ================= 0.4 谁画的 ================= */
(function () {
  const bar = (el, parts) => {
    const tot = parts.reduce((a, p) => a + p[1], 0);
    el.innerHTML = parts.filter(p => p[1] > 0).map(([lab, n, col, tip]) => `<div style="flex:${n};background:${col}" title="${tip}"><span>${n}</span></div>`).join('');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', parts.map(p => `${p[0]} ${p[1]}`).join('，') + `，共 ${tot}`);
  };
  const cFr = 'color-mix(in srgb,var(--sig) 70%,var(--panel2))', cPre = 'color-mix(in srgb,var(--pow) 65%,var(--panel2))', cPost = 'color-mix(in srgb,var(--c3) 65%,var(--panel2))';
  bar($('bar-t'), [['Freerouting', freeT, cFr, 'Freerouting 自动布线'], ['脚本（布线前）', S.locked_tracks, cPre, `脚本预先画好并锁定：其中 ${lockedGndT} 段是接地扇出短线`]]);
  bar($('bar-v'), [['脚本（布线前）', preVias, cPre, `接地扇出 ${R.fanout}、散热 ${R.thermal}、预画走线用的 ${preVias - R.fanout - R.thermal}（VBUS 2、BAT_SW 1）`], ['Freerouting', frVias, cFr, '换层用的信号过孔'], ['脚本（布线后）', postVias, cPost, `缝合 ${R.stitch}、模组接地 ${R.module}`]]);
  $('bar-leg').innerHTML = `<span><i style="background:${cFr}"></i>Freerouting 自动布线</span><span><i style="background:${cPre}"></i>脚本，布线前画好并锁定</span><span><i style="background:${cPost}"></i>脚本，布线后补的</span>`;
  $('frv').textContent = `${fr.version}（布线 ${fr.route_s} 秒，再优化 ${fr.optimize.replace(' minute(s) ', ' 分 ').replace(' seconds', ' 秒')}，日志说优化让设计改善了约 ${Math.round(fr.improved_pct)}%）`;
  $('pipe').innerHTML = D.process.steps.map(s => `<li><span class="net">${s.script}</span>${s.what}</li>`).join('');
})();

/* ================= 0.5 后面八课 ================= */
(function () {
  const L = [
    [1, 'PCB 是什么做的', '一块板从下到上：FR-4 基材、铜箔、阻焊、丝印、焊盘表面处理。用“层叠视图”和“成品样子”对照着看每一层。'],
    [2, '封装：从符号到焊盘', '符号的脚怎么对上封装的焊盘；焊盘尺寸、脚距、散热焊盘；立创编号和封装怎么对上。'],
    [3, '板框与布局', '56 × 38 mm 怎么定；接口靠边、天线靠角、去耦电容贴着芯片；KiCad 里画板框、摆元件、看飞线。'],
    [4, '走线', '线宽按电流算；间距和网络类；Freerouting 自动布线和手工布线各自怎么做；USB 线要不要控阻抗。'],
    [5, '过孔与铺铜', '过孔的尺寸和种类；缝合孔、散热孔、扇出孔；整面铺地、孤岛、禁布区。'],
    [6, '检查：DRC 与 3D', '规则怎么设、报告怎么看；这 143 条警告（打开交付的工程是 95 条）逐类过一遍；3D 视图查碰撞和方向。'],
    [7, '出生产文件', '9 层 Gerber 和 2 个钻孔文件各画了什么；BOM、坐标文件、原点和旋转角。'],
    [8, '下单与到货', '嘉立创下单的每个选项；SMT 核对元件方向；到货先看、再量、再上电。']
  ];
  $('next8').innerHTML = L.map(([n, t, d]) => `<a class="card" href="#p${n}" style="text-decoration:none;color:inherit"><b>第 ${n} 课</b><h4>${t}</h4><p>${d}</p></a>`).join('');
})();

/* ================= 0.6 自测 ================= */
(function () {
  const w08 = D.nets.filter(n => n.widths['0.8']).map(n => `${net(n.name)} ${n.widths['0.8']} 段`).join('、');
  const n08 = D.tracks.filter(t => t[2] === 0.8).length;
  $('q1').innerHTML = `0.8 mm，一共 ${n08} 段：${w08}。它们是电池到电机驱动的那条大电流路。两个电机一起启动要 2A 左右（电路课第 0 课），线越宽电阻越小，发热和压降就越小。第 4 课会算这个宽度怎么来。`;
  $('q3').innerHTML = `${S.gnd_vias} 个。缝合孔 ${R.stitch} 个：按 2.5 mm 的网格交错排开，把顶层和底层的地连成一整块；扇出孔 ${R.fanout} 个：大多数接地贴片焊盘（模组 U1 和 U2、U4 的接地脚除外）就近打一个孔下到底层的地；散热孔 ${R.thermal} 个：在 U2、U4 的散热焊盘里，把热导到底层；模组接地孔 ${R.module} 个：在 ESP32 模组肚子下的接地焊盘之间。剩下 ${R.signal} 个是信号线换层用的。`;
  document.querySelectorAll('#p0 [data-p0q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.p0q;
    $('tourbv').scrollIntoView({ behavior: RMx ? 'auto' : 'smooth', block: 'center' });
    TB.clear();
    if (q === '1') { TB.reset(); TB.highlightWidth(0.8); }
    else if (q === '2') { TB.show({ mode: 'layers' }); TB.toggle('Keepouts', true); TB.focus('antenna', { pad: 3 }); }
    else { TB.reset(); TB.highlightVias(['stitch', 'fanout', 'thermal', 'module']); }
  }));
})();
