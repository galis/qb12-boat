# 第 2 课 · 封装：从符号到焊盘 — notes for video makers and the fact-checker

All QB12 numbers on the page are computed at runtime in `p2.js` from `QB.board` (= `data/board.json`), except the two
small tables copied from the library files (marked **[lib]** below). External facts carry their `facts.md` source `[Sxx]`.
"Verified locally" = I ran it on 2026-10-19 with KiCad 8.0.9 (`kicad-cli`) / Python on the real files in `../../hardware/pcb/`; re-checked 2026-10-20 with KiCad 10.0.6 (same results, see facts_kicad10.md #38 and the DRC table).

2026-10-20 按 KiCad 10.0.6 更新：界面名按 `facts_kicad10.md`（10.0.6 zh_CN .mo）改；截图还是 8.0.9 的，图注暂不改。

## Files
`lessons/p2.html`, `p2.css`, `p2.js`, `p2_notes.md`, `p2_status.md`, `tools/test_p2.py` (Playwright, screenshots in `_shots/p2/`).
No new assets. KiCad screenshots used (each once): `kicad_assign_fp` (2.1, captioned as 演示工程 R1/D1/J1), `kicad_fp_editor`, `kicad_fp_props`,
`kicad_pad_props`, `kicad_fp_lib_table` (2.7, tabs).

## [lib] data copied from `../../hardware/pcb/lib/QB12.pretty/*.kicad_mod`
* `SILK`: F.SilkS lines / circles / arcs / polys of 7 footprints (R0603, SOT-23-5, SOT-23-6, SMA, SW-SMD_4P, TSSOP-16, LED0805),
  footprint-local mm. Extracted with a small regex script (fp_arc legacy format: `start` = centre, `end` = arc start, angle > 0 = clockwise on screen).
* `LIB_PART`: the `LCSC Part` property each library footprint carries. Only C0603 (`C14663`, descr "100nF (104) ±10% 50V") and
  R0603 (`C23186`) differ from the real parts; all other 15 equal their part's LCSC number.

## Sections and widgets

### 2.1 同一个元件的两张图：符号和封装
Widget **symbol ↔ footprint** (`#p2-map`, own SVG, viewBox 420×440). Buttons R17 / U3 / D1 / SW2. Top: symbol drawn from
`footprints[].pins` (num, name, net); bottom: real pads (`loc()` = board pads un-rotated to footprint coords) + courtyard + [lib] silk.
Dashed links pin end → pad centre. Hover/click a pin or pad: pair turns yellow, status line "符号 N 脚 → 封装 M 号焊盘 · 网络 · 焊盘 w×h".
Mapping: by number when the pad with that number carries the pin's net, otherwise by net (= where `build_board.py pad_map` remapped).
* R17 100kΩ (USB_DET divider): pin1 VBUS → pad1, pin2 USB_DET → pad2; R0603 used by 16 resistors.
* U3 AP2112K: 5 pins 1:1; pins 1,2,3 bottom row, 4,5 top row (local coords); pin 4 NC still has a pad.
* D1 SS34: netlist 1 = anode VBUS, 2 = cathode VSYS; footprint pad 1 = K (silk bar at pad 1 side, `SILK`) → links cross.
  Source: `build_board.py` `pad_map` comment "网表：1 = 阳极 VBUS，2 = 阴极 VSYS；封装：1 = K，2 = A".
* SW2: 2 symbol pins → pads 1 and 4 (diagonal); pads 2, 3 net −1. Source: `pad_map` comment "对角两脚，不管内部怎么配对都成立".
Text: KiCad flow 工具 → 分配封装... / 工具 → 从原理图更新 PCB... F8 [facts §6.1, S33]; QB12 flow netlist.py → build_board.py FP table + pad_map
(J1, U1 GND 1/40/41, U2/U4 EP, D1, SW2/SW3 — read from `build_board.py`).

### 2.2 一个封装里叠着几层
Widget **layer stepper** in BoardViewer `p2-an-bv` (toolbar off). Parts U2 / U4 / R17 / J1 / SW1; steps:
① F.Cu ② F.Mask (+ yellow dimension "缝 x" between the two pitch pads) ③ F.Paste ④ F.SilkS ⑤ Courtyard ⑥ Drill + B.Cu + Vias
(viewer pad numbers hidden, footprint's own PTH ringed yellow) · 全部叠起来 · 做出来的样子 (`made`, green/HASL).
Viewer always zooms to pads ∪ courtyard (∪ dimension label). Card numbers:
* pad counts by type, size list, pitch (most common nearest distance between same-size SMD pads), gap = pitch − pad extent along the pitch axis.
  U2 0.65 / gap 0.30, J1 0.5 / 0.20, R17 centre distance 1.5.
* mask expansion `rules.solder_mask_expansion` = 0; JLC 1:1 opening, mask dam ≥ 0.10 mm (green etc.) / ≥ 0.13 mm (black, white) [S01].
* paste: U2/U4 EP `pasteRatio` −0.15 → opening (1 − 2·0.15) = 70 % per side, 49 % area; U2 2.74 → 1.92 mm.
  Verified locally against `data/layers/F.Paste.svg` (U2 EP aperture 1.918 × 1.918, U4 2.31 × 1.68). Script comment
  `build_board.py`: "大散热焊盘锡膏缩到约 50%（窗格效果），避免芯片浮起". ESP32 module EPAD: too much paste lifts the module [S47].
* silk: `drc.by_type silk_over_copper` = 2 (KiCad 10.0.6; was 38 in 8.0.9) → 第 6 课.
* courtyard: courtyard bbox vs pad extents vs name L×W (U2 courtyard 5.0 × 4.4 = L5.0-W4.4; pads 4.9 × 7.0). Chinese UI "元件外框",
  DRC item "元件外框重叠" (KiCad 8.0.9 and 10.0.6 zh_CN, same) [S33].
* holes: U2 4 own PTH (Ø0.3/0.61) + 5 vias role `thermal` inside the EP; U4 0 own + 6 thermal; J1 4 PTH shell slots + 2 NPTH;
  SW1 2 NPTH Ø0.9.
* F.Fab not exported: `export_jlc.sh` layer list has no Fab.
**Script-changes list** (`#p2-mods`, buttons switch the viewer), all read from `build_board.py`:
J1/SW1 unnumbered PTH → NPTH; U2 in-pad holes renumbered 17 + paste removed (via-in-pad solder wicking [S07]); U2/U4 EP paste −15 %;
J1 shell legs get F.Paste (pin-in-paste, "保证外壳焊牢"); J1 local clearance 0.1 mm (`pads[].clr`; Default class 0.18).
Caption: DRC of the delivered project (with lib table) gives 3 × lib_footprint_mismatch "封装与来源库中的封装存在不一致" (10.0.6 wording; 8.0.9 was 存在差异) for SW1, J1, U2
— **verified locally**: `kicad-cli pcb drc --severity-all` on a copy of `kzip/chk/QB12_KiCad/` (2026-10-19, 8.0.9; 10.0.6 gives the same 3 — facts_kicad10.md DRC table). Not in board.json.

### 2.3 QB12 用到的 17 种封装
Widget **gallery**: 17 cards (one per `footprints[].fp`), grouped 阻容 / 二极管和灯 / 晶体管、芯片、模组 / 接口和开关, thumbnail drawn from pads.
Click → BoardViewer `p2-gal-bv` zooms to the part (pads ∪ courtyard, pad 0.8 mm), dashed box + yellow pitch dimension; pad numbers
show at ≥ 4× (all parts except U1; U1 gets a button "放大到 1 号焊盘" = 6× view on pad 1). Toggle 显示走线. Readout: library name,
refs (clickable), pad counts by type, sizes, pitch with check against name `P…`, gap vs JLC mask dam [S01], name L×W vs courtyard,
pad outer span vs name `LS…` (multi-pin only), pin-1 corner from name suffix BL/BR/TL vs board rotation, LCSC + 基础/扩展.
Below: pad table (pad no., pin name, net, type, size). Tip box decodes the EasyEDA name; L/W/P/BL/EP meanings are **my reading
checked against the measured data** (e.g. P equals measured pitch on all 8 names that have P; BL/BR/TL match pad 1 position at 0°),
not an official spec. "LS = 引脚尖到尖的跨度" is the same kind of inference (pads' outer edge is wider than LS on every part).

### 2.4 焊盘为什么必须照实物画
Widget **pitch slider (示意)** `#p2-p`: U2 real pads (0.35 × 1.3, rows ±2.85 from centre), real EP + 4 holes; body 5.0 × 4.4 and lead
tips ±3.2 from the name (L5.0-W4.4, LS6.4); lead width 0.25 is illustrative (caption says so). Real pitch fixed at measured 0.65;
slider 0.50–0.80 (step 0.005), presets 0.5 / 0.6 / 0.635 (25 mil) / 0.65 / 0.8. Per lead: offset = |i − 3.5|·|p − 0.65|; status
ok (lead inside pad), part, wrong (overlaps neighbour pad), open. Readout: max offset, counts. Examples: 0.635 → 0.05 mm, 4 leads "偏";
0.5 → 0.52 mm, 8 压错 / 4 落空. Toggle "散热焊盘：漏画了" → PowerPAD must be grounded, heat path [S48].
Land-pattern example: ESP32-S3-WROOM-1 recommended land pattern 18 × 25.5 mm [S47].
Three 示意 cards: 连锡 (U2 gap 0.30, J1 0.20 computed), 虚焊, 立碑 (first principles; 嘉立创 recommends thermal-relief pads on pours
because copper conducts heat [S24]; QB12 GND pads `process.gnd.pad_connection` = solid → 第 5 课).

### 2.5 方向：封装的 0° 和 1 脚
Widget **rotation** `#p2-r`: D1 (0°), LED3 (90°), U5 (180°), U2 (270°, KiCad shows −90°). Buttons 0/90/180/270 + "QB12 实际";
animated rotation (instant under reduced motion), pads + [lib] silk + courtyard, pad 1 yellow, numbers upright. Card: current angle,
where pad 1 is now, pad 1 at 0° (name suffix), board angle (`footprints[].rot`), CPL Rotation (`fab.cpl`: D1 0, LED3 90, U5 180, U2 270).
R / Shift+R = 逆时针 / 顺时针旋转 [facts §6.1]. LED0805 pad 1 = anode (net LED3_A; silk triangle points to pad 2), SMA pad 1 = cathode.
Tip: JLC 0° may differ, tape orientation rule, preview [S07] → 第 7 / 8 课.

### 2.6 立创编号
Readout: 51 parts, 25 LCSC numbers (BOM 25 rows, `fab.bom`), 基础 16 kinds / 39 parts, 扩展 9 kinds / 12 parts, R0603: 16 resistors,
5 values. 基础 / 扩展 / 优选扩展 definitions [S06]; no fee amounts ("以下单页为准", facts §4.2, §10); classification may change [S53];
LCSC Part # column [S08][S13]. netlist.py says the 基础/扩展 split was checked on 2026-10-13.
Widget **BOM table + viewer** `p2-lc-bv`: 25 rows from `fab.bom`, filter 全部 / 基础 / 扩展 (highlight parts); row click → select / highlight.
Widget **two LCSC fields**: toggle 2026-10-13 交付时 (LCSC Part = `LIB_PART[fp]`) / 2026-10-19 修复后 (`lcsc_part_field`); 51 chips,
22 mismatches = 8 × C0603 (C14663, 100nF) + 14 × R0603 (C23186, 5.1kΩ); lucky ones C6, C8, C11, R1, R2. **Verified locally**:
`pcb/pkg/QB12_KiCad/QB12.kicad_pcb` and `pcb/out/QB12.kicad_pcb.bak_lcsc` have exactly these 22 mismatches; `out/QB12.kicad_pcb` has 0.
BOM always right: `make_bom.py` reads `netlist.PARTS`. Button "在板上标出" highlights the 22.
Widget **SW1 / position-file filters**: SW1 lib name `SW-TH_MSK12C02`, attribute through_hole (`tht`), 7 SMD pads + 2 NPTH Ø0.9;
BOM footprint `SW-SMD-MSK12C02`. Options 都不勾 (QB12, `export_jlc.sh` uses neither) / 仅包含贴片封装 / 排除具有通孔焊盘的所有封装
(zh_CN strings [S33]; options listed in facts §5.4 [S30]). JS rule: smd-only drops `tht` parts → SW1; exclude-TH drops parts with any
non-SMD pad → J1, SW1, U2. **Verified locally** with kicad-cli 8.0.9 and 10.0.6 `pcb export pos` on `out/QB12.kicad_pcb`: default 51 rows,
`--smd-only` 50 (no SW1), `--exclude-fp-th` 48 (no J1, SW1, U2).

### 2.7 在 KiCad 里看、改、画封装
Widget **4 tabs** (screenshot + howto): 封装编辑器 (Ctrl+E "在封装编辑器中打开" [facts §6.1]; 工具 → 封装编辑器; 文件 → 新建封装 (no "..." in 10.0.6);
放置 → 添加焊盘; 检查 → 封装检查器 — names from the zh_CN .mo), 封装属性 (E; fields; 制造特性 (10.0.6; 8.0.9 特性) → 封装类型 贴片/通孔/未指定;
从坐标文件中移除 (10.0.6; 8.0.9 从定位文件中移除) / 从物料清单中移除 — screenshot still 8.0.9; plugin kicad-jlcpcb-tools assigns LCSC numbers [S35]),
焊盘属性 (焊盘类型 (NPTH = 非电镀孔 (NPTH), 机械 in 10.0.6), 技术层 (8.0.9 工艺层) F.Paste / F.Mask, 间距重写 tab: 阻焊扩展 (8.0.9 阻焊层扩展), 锡膏相对间距 −15 %), 管理封装库 (设置 → 管理封装库..., dialog 封装库; 全局库 /
工程专用库; QB12 → ${KIPRJMOD}/QB12.pretty from `fp-lib-table`; `drc.by_type lib_footprint_issues` = 51 because the DRC folder
had no lib table; with it: 3 mismatch warnings, see 2.2; board copy vs library copy: 检查 → 将封装与库比较, 工具 → 从库中更新封装... — menu items from assets/kicad_shots.md).

### 2.8 自测三题 + next → #p3
Q1 D1 without pad_map → diode reversed, USB 5 V can't reach VSYS (button: gallery viewer on D1). Q2 EP paste 70 % × 70 % / 49 %,
holes without paste (button: anatomy U2 step ③). Q3 why the stale field didn't matter, one source of truth (button: highlight 22).

## Things not from facts.md (KiCad general behaviour, flagged for the fact-checker)
* KiCad assigns nets to pads by "symbol pin number = pad number" on Update PCB; symbol fields are carried to footprint fields on update.
* Courtyards should not overlap and DRC checks it (string "Courtyards overlap" exists in 8.0.9 and 10.0.6 translations).
* Double-click a pad opens 焊盘属性; menu items 文件 → 新建封装, 放置 → 添加焊盘, 检查 → 封装检查器 in the footprint editor (strings
  exist in the .mo; menu placement checked in 10.0.6 source menubar_footprint_editor.cpp); 设置 → 管理封装库... (screenshot title "封装库" agrees).
* `${KIPRJMOD}` = the project folder.
* Tombstoning / bridging / open joints explained from first principles only.

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
