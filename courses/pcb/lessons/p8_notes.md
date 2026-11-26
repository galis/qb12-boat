# 第 8 课 · 下单与到货 — notes for video makers and the fact-checker

Files: `lessons/p8.html`, `p8.css`, `p8.js`, `tools/test_p8.py` (screenshots in `_shots/p8/p8_*.png`). No new assets: every picture is SVG/HTML drawn at runtime from `QB.board`.
All QB12 numbers are computed in `p8.js` from `QB.board` (names below are the JS expressions). External facts cite `facts.md` source IDs.

## Sections and widgets

### 8.1 下单页走一遍（`#p8-s1`）
* Rule tip (yellow): Claude prepares the order, stops at step 7, the user clicks pay (AUTHORS.md L8 rule).
* **Widget 1 — 8-step order stepper.** Rail of 8 pills + prev/next. Left: wireframe "下单页 · 示意图" (generic grey frame, no branding). Right: card (why / QB12 facts / ⚠ / link).
  1. 上传 Gerber — zip `QB12_Gerber.zip` `fab.zip_bytes/1024` = 77 KB（2026-10-20 KiCad 10.0.6 重导，78 408 B，和 outputs/QB12/QB12_Gerber.zip 一致）; `fab.gerbers` 9 Gerber + 2 drill; detected `stats.copper_layers` 2 layers, `stats.size` 56 × 38 (system detects size and layers [S15]). Mini outline from `board.outline`.
     ⚠ **X2 check item**: the first zip (2026-10-13) had X2 attributes in all 9 Gerbers (`export_jlc.sh` lacked `--no-x2`); the lead re-exported it on 2026-10-19 06:19 UTC with `--no-x2 --no-netlist` (geometry identical, `fab.gerber_format`, zip then 80 774 B = 79 KB; 2026-10-20 KiCad 10.0.6 重导后 78 408 B = 77 KB，仍是 RS-274X). The card keeps it as a check for the user's own boards: 嘉立创 accepts RS-274-X only, not X2 [S03]; JLC KiCad 8 tutorial leaves X2 unticked [S11]; JLC 的 KiCad 9 教程勾了 X2（facts_kicad10 #14，只看过摘要），课程继续教不勾 (facts §1.1, §5.1).
  2. 板子参数 — mock reflects 8.2's mask/finish choice. PCB min 5 pcs [S14][S15]; 1.6 mm `board.thickness`; 1 oz [S19][S20]; 拼板款数 如实填 [S03]; 客编 chips (§10.4).
  3. 打开 SMT — economic; `stats.footprints_top` 51 / `stats.footprints` 51 on top. Quantity "以页面为准" (§10.5).
  4. BOM + 坐标 — `fab.bom.length` 25 rows, `fab.cpl.length` 51 rows, BOM qty sum (`fab.bom[][3]`) 51; header/first row shown from `fab.bom_header`, `fab.cpl_header`. "Process BOM & CPL" flow [S06 #9][S13].
  5. 核对料号 — 25 kinds (unique `footprints[].lcsc`), 基础 16 kinds / 39 parts, 扩展 9 kinds / 12 parts (`footprints[].lib`); 换料费 per kind [S05][S06]; unconfirmed parts not placed [S07 #7].
  6. 贴片预览 — two static preview tiles (U5, D1, correct). 16 polarized parts = kinds led/d/ic. Rotation rules [S07 #1 #2 #10].
  7. 自己再查一遍 — JLCDFM free, zip ≤ 50 MB, 5 modules, PDF report [S26]; 确认生产稿 [S25][S03]; Confirm Parts Placement fee item exists [S05] (no amount). "Claude stops here".
  8. 付款 · 你来点 — SMT orders must be paid first (stock is reserved) [S07 #9]; PCB-only can "Review Before Payment" [S15]; price 以下单页为准.

### 8.2 板子参数（`#p8-s2`）
* **Widget 2 — mask / finish / side + viewer `p8-pbv`** (mode `made`). Buttons 绿/黑/蓝 油, 喷锡/沉金, 顶面/底面. Status line: economic-SMT combos for 1.6 mm from facts §4.1 table [S04] — green: HASL (leaded/lead-free) or ENIG 2–50; black: HASL 2–50; blue: HASL 5–30; others "表里没有" (+ note that the table's layer column didn't render). Solder-mask dam 1 oz: green/blue ≥ 0.10, black ≥ 0.13 mm [S01]; QB12 smallest pad gap computed by `pitchGap()` = 0.2 mm at J1 (0.5 mm pitch − 0.3 mm pad).
  Bottom view: dashed box around `texts[]` "JLCJLCJLCJLC" (B.SilkS, 44.0/25.0, h 0.8, placed by `finalize.py`) labelled 编号位置.
* Table of 10 options: layers, size (detected), qty 5, thickness 1.6 (tolerance 1.44–1.76 [S01]; economic 0.8–1.6 [S04]), 1 oz ≈ 35 µm default [S19][S20] — 2 oz needs ≥ 0.16 mm spacing [S01] vs QB12 `rules.min_clearance` 0.15; mask colour; finish HASL vs ENIG [S16], finest pitch J1 0.5 mm, no BGA, default finish not stated (§10.3); 客编 [S03] + **JLC international: "Order Number is not available since May 2026. Please DO NOT add JLCJLCJLCJLC"** — from `raw/How-to-mark-on-PCB.txt` line 164 [S25] (this sentence is NOT in facts.md); 拼板款数 [S03]; 确认生产稿.
* howto: 文件 → 电路板配置... → 电路板叠层 → 物理叠层 (path per `assets/kicad_shots.md`); KiCad default 1.6 mm [S34]（KiCad 10 新建板同样是 1.6，facts_kicad10 #113）.

### 8.3 经济型还是标准型（`#p8-s3`）
* Table with ✓/✗ computed: top side 51/51; layers 2 (econ 2/4/6); thickness 1.6 (0.8–1.6); size 56 × 38 (econ ≥ 10 × 10, std ≥ 70 × 70 ✗); smallest passive `0603` from `footprints[].pkg` (econ 0402, std 01005); finest pitch J1 0.5 / U2 0.65 / (U3 0.95) from pad geometry (econ ≥ 0.4, std ≥ 0.35); rails/Mark (econ not needed, std needed); build time 1–3 / ≥ 4 days; SPI none / yes. All limits [S04] facts §4.1.
* **Widget 3 — to-scale SVG** `#p8-pan`, 3 buttons: 经济型单板 (10 × 10 dashed square), 标准型单板 (70 × 70 square, ✗), 标准型 2 × 2 拼板 (示意): 2 mm spacing (mouse-bite spacing 1.6/2 mm [S01]), 5 mm rails, 1 mm Mark at 3.85 mm from panel edge, 2 mm tooling holes [S01][S02] §1.2 → 114 × 88 mm = 2·56+2 by 2·38+2+2·5.
* ⚠ conflicts: econ quantity (2–50 / >30 panelize / ≤30(50)) §10.5; AOI EN yes / CN no §10.6; SMT lead time §10.8.

### 8.4 BOM、坐标和料号（`#p8-s4`）
* Readout: 51 parts, 25 kinds, basic 16/39, extended 9/12 (preferred-extended free in economic [S06 #7]).
* **Widget 4 — BOM table + viewer `p8-bbv`** (layers mode, F.Cu + courtyard + labels, no tracks). Filters 全部 / 基础库 (16 rows) / 扩展库 (9 rows) / 有方向的 (rows containing kinds led/d/ic). Click row → `highlightParts(refs)` + focus. Table content = `fab.bom`; lib column from `footprints[].lib` (netlist.py comment: checked on 立创商城 2026-10-13).
* Three counts must match: BOM qty 51 = CPL 51 rows = 51 parts.
* **CPL filter pitfall (verified with kicad-cli 8.0.9 on `pcb/out/QB12.kicad_pcb`；10.0.6 结果相同，facts_kicad10 #38)**: `--smd-only` ("仅包含贴片封装") gives 50 rows — drops SW1 (attribute through-hole, `footprints[].tht`); `--exclude-fp-th` ("排除具有通孔焊盘的所有封装") gives 48 rows — drops J1 (4 PTH + 2 NPTH), U2 (4 PTH in EP), SW1 (2 NPTH). The JS computes the same lists from `tht` and `pads[].t`. Dialog title 生成布置文件 (kicad_shots.md)；10 里导出按钮叫 生成坐标文件（facts_kicad10 #35）.
* LCSC single source = netlist.py; 22 stale `LCSC Part` fields fixed 2026-10-19 (AUTHORS L2). Stock changes [S06]; MOQ / attrition, unused parts discarded — `raw/pcb-assembly-faqs-part-2.txt` line 140 [S07] (not in facts.md).
* howto: `LCSC Part #` header [S08][S13]; Fabrication Toolkit in 扩展内容管理器 (PCM) → Gerber zip, bom.csv, positions.csv [S13][S37]; kicad-jlcpcb-tools searches JLC library / assigns numbers [S35].

### 8.5 找出转错的元件（`#p8-s5`）
* **Widget 5 — "spot the wrong rotation" game**, 6 tiles: LED1, D1, Q1, U3, U4, U5. Pads = real `footprints[].pads` around the footprint centre in board orientation; silkscreen mark (示意): dot beside pin 1 / bar beyond the cathode pad (cathode = netlist pin 2: CHRG for LED1, VSYS = pad 1 for D1); body (示意) built in footprint-local coordinates (body size parsed from the footprint name `_L…-W…`), rotated by `rot + err`. Legs land on pads only when err = 0, or 180° for symmetric packages.
  First round: LED1 180°, U3 180°, U5 180° wrong. "再来一局": ≥ 1 symmetric part at 180° (+ maybe a second), 1 asymmetric part at 90/180/270°. Verdicts computed by `verdict()`: off-pad leg count; or the 2 most important mismatched pins, e.g. U5 180°: "GND 脚落在了 VBUS 上，VBUS 脚落在了 GND 上"; U4 180°: GND(3) → CHRG, BAT(5) → GND; U3 180°: 1 leg on bare board; LED: reversed, doesn't light; D1: VBUS→VSYS path blocked.
* Rules: red dot = orientation mark, not "pin 1" [S07 #1]; JLC 0° may differ [S07 #2]; engineers fix by silkscreen; conflict → silkscreen wins [S07 #10]; diode marking advice (facts §4.5).
* howto: 视图 → 3D 查看器 Alt+3 [S30]; `FT Rotation Offset` (positive = CCW) [S36]; Bouni rotation table [S35].

### 8.6 钱、时间、寄来的东西（`#p8-s6`）
* **Widget 6 — cost structure slider** (2–50 boards): per-order items (engineering fee, stencil not shipped, 9 extended kinds, confirm placement (optional), shipping, std-only fixture/handling [S05]) vs per-board items (PCB fee, solder joints = `stats.smd_pads` 205 × q, components 51 × q + MOQ/attrition, hand-solder labour [S05]). **No amounts anywhere**; "以下单页为准" (§4.3, §10.1–2).
* Timeline (示意, CSS pulse): pay → PCB 1–2 d → SMT 1–3 d → ship → DHL 3–5 d / airmail 15–25 d (international) [S14][S04][S15] §4.6; 24 h only for ≤ 100 × 100 mm, 5 pcs, baseline [S14] §10.8.
* Payment: SMT must be prepaid [S07 #9]; PCB-only review-before-pay [S15].
* Bare vs assembled: bare = 205 SMD pads to hand-solder, finest J1 0.5 / U2 0.65 mm, EP under U2/U4 unreachable with an iron.
* **SVG "what plugs where"**: board outline, every footprint's courtyard bbox, J2/J3/J4 at real positions; plugs, wires, motors, battery, USB cable are 示意. Battery +/− next to J2 pin 1 (BAT+) / pin 2 (GND) from pads.
* Pack cards: arrives = 51 parts on top; not shipped = stencil [S05], unplaced parts [S07 #15]; you provide = 3 PH2.0 2-pin plugs (board has `WAFER-PH2.0-2PWB` SMD sockets, mating plugs not in BOM — netlist.py), 1S battery, 2 motors, data USB-C cable, firmware (电路课第 9 课).
* howto: 检查 → 显示电路板统计报告（10.0.6 的名字，facts_kicad10 #81；8.0.9 叫 显示电路板统计信息）.

### 8.7 到货（`#p8-s7`）
* **Widget 7 — 10-step checklist**, `localStorage['qb12pcb-p8-checklist']` in try/catch, progress bar, colour stripe green (no power) / yellow (USB only) / orange (battery, motors). Steps 2–5 have "在板上标出表笔位置" buttons → probe widget. Electrical values and firmware are delegated to 电路课第 9 课 9.4 (steps 3–11 there).
* **Widget 8 — "表笔放哪" viewer `p8-tbv`** (made mode): buttons VBUS / VSYS / 3V3 / BAT+ 对 GND. `highlightNet(net)`; red marker on the net pad and black marker on the GND pad of `probeCap(net)` = biggest-pad cap between net and GND: VBUS → C1, VSYS → C9, 3V3 → C4, BAT+ → C2. Card computed by `netPaths()` from footprints pins/values:
  - VBUS: R13 10 kΩ (Q1 gate pull-down) ∥ R17 + R18 = 200 kΩ (via USB_DET) ≈ **9.5 kΩ upper bound**; C1 10 µF.
  - VSYS: no resistor to GND; caps C3, C9, C10, C11, C14, C15 = 89.1 µF.
  - 3V3: no resistor to GND; buttons SW2 (BOOT) + R8 10 kΩ, SW3 (RESET) + R7 10 kΩ; caps 20.1 µF.
  - BAT+: SW1 ON → R14 100 kΩ to GND (SW1 pin ON = GND, COM = PWR_EN_N); C2 10 µF.
  Net pad lists from `nets[].pads`.
* No test points on QB12 → probe on capacitor ends; suggest test pads next time (design advice).
* **Widget 9 — "出了问题怎么办"**: short / missing / reversed / wrong voltage. Pitches J1 0.5, U2 0.65, U3/U5 0.95 computed. Missing: unconfirmed parts not placed [S07 #7]. Wrong voltage → circuit-course table (VSYS: D1, Q1, Q2; 3V3: U3).
* howto: Highlight Net `` ` `` / Clear ~ — KiCad 8.0 action table (`raw/pcbnew8_rows.tsv`, [S30]); zh names 高亮网络 / 清除网络高亮 from the 8.0.9 .mo; kicad_shots.md confirms ` . 10.0.6 不变（facts_kicad10 #84）.

### 8.8 自测 + 回顾（`#p8-s8`）
* Q1 why economic (all computed numbers above) → button scrolls to the 8.3 table.
* Q2 U4 180° (computed mismatches GND→CHRG, BAT→GND) → button starts a game round with U4 180° + Q1 90°.
* Q3 four measurements + SW1/R14 → button shows BAT+ in the probe viewer.
* Recap card (9 lessons, numbers from `stats`, `drc`, `fab`) + `.next` card → `#p0`.

## Unsourced / judgement items (please check)
* Practical advice without a facts.md source: PH2.0 battery leads' red/black order varies by seller; current-limited supply "find the warm part" method; compare several boards; take photos before reworking; 0603 hand-soldering; "LED3 不亮 before firmware" (from netlist: LED3 driven by IO2).
* The original X2 finding (since fixed by the lead) and the kicad-cli filter results are my own checks on the real files (commands above).

## 2026-10-20 按 KiCad 10.0.6 更新
* 页面改了 4 处：板厚默认值说法 KiCad 8 → 10；坐标文件对话框补上按钮名 生成坐标文件；显示电路板统计信息 → 显示电路板统计报告；X2 提示改成「JLC 的 KiCad 8 教程没勾 X2，9 的教程勾了；国内站不收 X2，所以还是不勾」。
* Gerber 压缩包大小由 `fab.zip_bytes` 现算，现在 78 408 B = 77 KB；9 个 Gerber + 2 个钻孔文件不变。
* p8 没有用 kicad_*.webp 截图；视频 ep08 用的 4 张截图（kicad_stackup、kicad_pos、kicad_3d_top、kicad_net_highlight）的说明没改，等重拍。

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
