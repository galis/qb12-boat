# QB12 PCB 课 — brief for the lesson authors (lessons 1–8)

You write ONE lesson of an interactive course page. Read this whole file, then `README.md` (framework, splice rules, viewer
API), then `lessons/p0.*` (lesson 0, already written — copy its tone, density and widget style), then the facts you need
from `facts.md`. The page is the sequel to the user's circuit course `../circuit/qb12-circuit-course.html` (open
`../circuit/l8.html` / `l8.js` to see what a finished lesson there looks like).

## The reader
* The owner of Boat QB12 (an RC catamaran). Just finished the 10-lesson circuit course, so they know what every part on the
  board does electrically (USB-C/CC, TP4056 charger, AP2112K LDO, ESP32-S3 module, DRV8833 H-bridge, buttons, LEDs).
  They have never designed a PCB. Explain from first principles, concretely, with QB12 as the running example.
* **Everything the reader sees is Simplified Chinese.** Technical names stay as they are (KiCad, Gerber, F.Cu, DRC…),
  the first time with a short Chinese gloss.
* They like animations and pictures. Every section should have something to look at: the board viewer, a drawn SVG
  diagram, a KiCad screenshot, or a small simulation. Text is short paragraphs (`.txt`, ≤ ~4 sentences each).

## What the user asked for
"以 QB12 为例讲全过程 · 设计思路 + KiCad 操作". So every lesson does three things, in this order, section by section:
1. **道理** — why this step exists and what can go wrong (first principles, numbers).
2. **QB12 实际怎么做的** — the real board, shown in the BoardViewer, with numbers computed from `QB.board`.
3. **KiCad 8 里自己怎么做** — a `.howto` box with menu paths in `<span class="menu">…</span>` and hotkeys in `<kbd>`,
   plus the matching real KiCad screenshot where one exists (see "KiCad screenshots").

Be honest about how QB12 was really made: by Python scripts driving KiCad 8.0.9 (`../../hardware/pcb/netlist.py`, `build_board.py`,
`route_a.py`, Freerouting 1.9.0, `route_b.py`, `finalize.py`, `export_jlc.sh`), not by clicking. `QB.board.process` lists
the pipeline. QB12 has **no KiCad schematic** (the netlist lives in `netlist.py`; the PDF schematic was drawn from it by
`draw_schematic.py`). Teach the normal hand workflow and say what the scripts did instead. Lesson 0 already explains this
once (its “诚实说明” card) — don't repeat the whole story, refer to it in a sentence.

## Lesson list (titles are fixed in build.py)
| N | title | subtitle |
|---|---|---|
| 1 | PCB 是什么做的 | 铜、基材、阻焊、丝印 |
| 2 | 封装：从符号到焊盘 | 焊盘、间距、立创编号 |
| 3 | 板框与布局 | 板子多大、元件放哪 |
| 4 | 走线 | 线宽、间距、自动布线 |
| 5 | 过孔与铺铜 | 换层、接地、散热 |
| 6 | 检查：DRC 与 3D | 规则、报告、看实物 |
| 7 | 出生产文件 | Gerber、钻孔、BOM、坐标 |
| 8 | 下单与到货 | 嘉立创 SMT、上电检查 |

Neighbouring lessons must not duplicate each other: stay inside your title. If something belongs to another lesson, one
sentence + a link (`<a href="#p5">第 5 课</a>`) is enough.

## Size and shape
* 5–8 `.sec` sections (N.1, N.2 …), at least 3 interactive widgets (buttons that step through states, toggles, sliders,
  viewer calls), ending with the 3-question quiz (`.quiz > details`, same markup as p0) and a `.next` card to lesson N+1
  (lesson 8: back to `#p0`).
* Budget per lesson: ≤ 200 KB of your own HTML+CSS+JS+new assets (KiCad screenshots don't count). Page limit is 5 MB.
* Phone 400 px light theme must work: no horizontal page scroll; wide SVGs scale (`viewBox` + `width:100%`) or go in a
  `.wscroll`. Desktop 1280 dark theme must look good. Reduced motion must show a correct static state.

## Numbers and facts (strict)
* Every number about QB12 comes from `QB.board` (computed in JS at runtime, as p0.js does) or from the real files in
  `../../hardware/pcb/` (`out/QB12.kicad_pcb`, `out/*.csv`, `jlc/`, scripts). Verify with `python3.12` + `pcbnew` or `kicad-cli`
  if you need something `board.json` lacks — don't edit `data/`; ask in your report.
* Every fact about JLC / 嘉立创 / KiCad / IPC / datasheets comes from `facts.md` (with its `[Sxx]` source). Respect its
  section 10 ("不确定") — prices, fees, minimums that conflict: describe the structure, say “以下单页为准”, no invented
  numbers. Never state a price as current fact.
* KiCad menu names: use the Chinese UI names in `facts.md` §6 (taken from the 8.0.9 zh_CN translation). The real KiCad
  8.0.9 Chinese UI shows top menus 文件 (F) 编辑 (E) 视图 (V) 放置 (P) 布线 (U) 检查 (I) 工具 (T) 设置 (R) 帮助 (H).
  When unsure, check the translation file: `msgunfmt /usr/share/kicad/internat/zh_CN/kicad.mo | grep -A1 'msgid "Board Setup'`
  (install `gettext` with apt if `msgunfmt` is missing). Write menu paths as `<span class="menu">文件 → 电路板配置...</span>`.
* If a picture is illustrative (ratsnest, parts pile, a cross-section drawn not to scale), say “示意”.

## Known facts / quirks of the real board (use them in the right lesson, honestly)
* L2: every footprint has two LCSC fields, `LCSC` (correct) and a stale `LCSC Part` inherited from the library; 22 of 51
  were wrong. **Fixed on 2026-10-19** in the delivered KiCad zip (now equal); the BOM CSV sent to JLC was always right.
  Good lesson: one source of truth (`netlist.py`) for part numbers. `board.json` now has `lcsc_part_field == lcsc_field`.
  SW1's library name says `SW-TH_MSK12C02` and its attribute is through-hole, but its pads are SMD plus 2 NPTH
  locating-peg holes (0.9 mm).
* L3: J1 (USB-C) courtyard overhangs the bottom edge to y ≈ 38.7 and SW1 (slide switch) the left edge to x ≈ −1.0 — on
  purpose, the plug mouth and the actuator have to reach the edge. Three reference designators are hidden
  (`stats.refs_hidden`). Regions: `QB.board.regions`.
* L4: net classes (`QB.board.classes`) vs widths actually used (`stats.widths`); 49 locked (pre-drawn) tracks; Freerouting
  1.9.0 ran with 40 passes (`process.tools.freerouting`); GND was not given to the autorouter. USB D+/D− are plain
  0.2 mm single tracks (lengths in `nets[]`), not a 90 Ω differential pair — acceptable for 12 Mbit/s full-speed USB at
  these lengths (`facts.md` §8.2); say so honestly. The Power class lists GND but GND is mostly pour + vias.
* L5: 177 vias with roles (`stats.via_roles`, `vias[].role`), GND zones on both layers, 3 keepouts (antenna / module /
  usb, `zones[]` with `rule:true`), thermal vias under U2 / U4 exposed pads, `process.gnd` parameters.
* L6: DRC result `QB.board.drc` (0 errors, 0 unconnected, warnings by type); no schematic parity check (no schematic).
* L7: `QB.board.fab` (Gerber list, drill tool tables, BOM rows, CPL rows, aux origin bottom-left with Y up);
  `../../hardware/pcb/export_jlc.sh` is the real export; `facts.md` §4.4–4.5, §5.
* L8: ordering (`facts.md` §1, §4, §10 and the project doc rule below), what arrives, first power-on checks. The user's
  rule: Claude prepares an order and **stops before payment; the user pays**. Don't teach "Claude will order for you";
  teach what the user does on the order page. Link to the circuit course for the electrical checks where useful (the
  circuit course is a separate page — just name it, “电路课第 9 课”, no URL).

## KiCad screenshots
A separate agent is taking real KiCad 8.0.9 (Chinese UI) screenshots of the QB12 project right now. They land in
`assets/` under fixed names; until then each file is a grey placeholder, so your build works already. Use only the ones
assigned to your lesson (each `@@ASSET:` occurrence inlines the bytes, so reference each file once):

| lesson | files (`assets/<name>.webp`) |
|---|---|
| 1 | `kicad_layers_panel` (外观面板：层列表), `kicad_stackup` (电路板配置 → 物理叠层) |
| 2 | `kicad_fp_editor` (封装编辑器：U2 HTSSOP-16-EP), `kicad_fp_props` (封装属性 U2), `kicad_pad_props` (焊盘属性), `kicad_fp_lib_table` (封装库对话框), `kicad_assign_fp` (原理图里“分配封装”工具，用一个小演示工程拍) |
| 3 | `kicad_pcb_main` (PCB 编辑器主界面), `kicad_edge_only` (只看板框层), `kicad_constraints` (设计规则 → 约束), `kicad_update_pcb` (“从原理图更新 PCB”对话框，演示工程) |
| 4 | `kicad_netclasses` (网络类), `kicad_net_highlight` (高亮 VSYS), `kicad_net_inspector` (网络检查), `kicad_route_live` (交互式布线进行中) |
| 5 | `kicad_predef_sizes` (预设尺寸), `kicad_zone_props` (覆铜区属性), `kicad_bcu_view` (只看 B.Cu), `kicad_zones_unfilled` (铺铜未填充), `kicad_keepout_props` (规则区属性) |
| 6 | `kicad_drc` (设计规则检查), `kicad_3d_top` (3D 顶视), `kicad_3d_angle` (3D 斜视) |
| 7 | `kicad_plot_gerber` (Gerber 绘图), `kicad_drill` (钻孔文件), `kicad_pos` (元件位置文件), `kicad_gerbview` (Gerber 查看器) |
| 8 | none (draw your own diagrams) |

Markup: `<figure class="fig pN-shot"><img src="@@ASSET:kicad_drc.webp@@" alt="…" loading="lazy"><figcaption>KiCad 8.0.9
截图：…</figcaption></figure>` — no width/height attributes (sizes are unknown yet), style `img{width:100%;height:auto}` in
your CSS. Write the caption from what the dialog is supposed to show; the lead will check captions against the final
screenshots. Don't depend on pixel positions inside the screenshot.

## Files you may write
* `lessons/pN.html`, `lessons/pN.css`, `lessons/pN.js` (rules in README.md).
* New images: `assets/pN-*.webp|svg|png` (only your prefix). Generate them yourself (Python/PIL, kicad-cli SVG exports,
  Playwright screenshots of your own SVG). No images downloaded from the web.
* `lessons/pN_notes.md` — REQUIRED, for the video makers and the fact-checker: section list, every widget and its steps
  (what the viewer shows at each step), every number with where it comes from, every external fact with its `[Sxx]`.
* `lessons/pN_status.md` — your running progress log (the container can restart; if you find this file already written
  when you start, resume from it instead of starting over).
* `tools/test_pN.py` — your own Playwright checks (optional but recommended).
Never edit anything else (build.py, src.html, viewer/, data/, README, other lessons, assets of others). If the viewer is
missing something or has a bug, work around it inside your lesson and describe the problem in your final report.

## Build and test (parallel-safe)
```bash
cd courses/pcb
python3 build.py --only N --strict          # writes _build_pN.html + _preview_pN.html (lesson 0 + yours only)
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test.py --page _preview_pN.html   # framework checks
```
Never run plain `python3 build.py` (other authors are building at the same time). Never run `playwright install`.
Take screenshots of your lesson at desktop 1280 dark and phone 400 light, every widget state, and LOOK at them (Read the
PNGs): overlapping labels, clipped text, unreadable colours, empty states. Check reduced motion and the console (no
errors). Put your screenshots in `_shots/pN/`.

## Final report (your last message, English is fine)
Files written; section list; widgets; anything in facts.md you could not use or found wrong; viewer bugs/requests;
anything you were unsure about. Keep it under 400 words.
