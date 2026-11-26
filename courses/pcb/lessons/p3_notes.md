# 第 3 课 · 板框与布局 — notes for video makers and the fact-checker

- 2026-10-20 按 KiCad 10.0.6 更新：正文 “KiCad 8” → 10；绘制线 → 绘制线条（Ctrl+Shift+L）；Home 补 mac ⌘0；check_place.py 用 pcbnew 10.0.6 重跑，输出不变。4 张截图仍是 8.0.9，图注未改（等重拍）。

Files: `lessons/p3.html`, `p3.css`, `p3.js`, test `tools/test_p3.py`, screenshots `_shots/p3/`.
All QB12 numbers are computed at runtime in `p3.js` from `QB.board` (values below are what the current
`data/board.json` gives). HTML placeholders `<span data-n="…">` are filled by JS (table `N` in p3.js), so the raw
HTML shows empty spans on purpose.

## Sections

| # | title | content |
|---|---|---|
| 3.1 | 板子多大：56 × 38 是怎么来的 | why size matters; honest note (build_board.py only has `BW, BH = 56.0, 38.0`, no reason given) → three derived views; fab/assembly size thresholds; boat bay |
| 3.2 | 板框：Edge.Cuts 层上一条闭合的线 | what the outline is, closed shape, R2 corners, real script excerpt; copper-to-edge clearance slider |
| 3.3 | 摆元件：从一堆到各就各位 | ratsnest, placement order as a 9-state story with reasons; PLACE table excerpt; v1 vs final |
| 3.4 | 自己挪一颗：元件外框、距离和“只贴一面” | courtyards, try-it widget, check_place.py output, hidden refs, single-side SMT + bottom view |
| 3.5 | KiCad 里自己做：导入、规则、画框、摆放 | 4 tabs with the 4 screenshots, hotkey practice widget |
| 3.6 | 自测三题 | 3 `details` questions with "show" buttons |
| 3.7 | 下一课 | `.next` card → `#p4` |

## Widgets and their states

**W1 尺寸视图** (`#p3-sizebv`, BoardViewer, layers F.Cu pads + Courtyard + Edge.Cuts + Labels, no tracks)
- 按区域看: boxes = `QB.board.regions[].bbox` (antenna region skipped), short labels 插座/主控模组/开关/电源/电机驱动/充电/USB/按键与检测. Readout: 56 × 38 mm, area 2125 mm² (`stats.area`), courtyard sum 874 mm² = 41 % (shoelace of every `footprints[].crt`), biggest part 18.0 × 25.5 (U1 `crt`), 51 parts all top.
- 竖着量: left-edge courtyard boxes J3 8.1, J4 8.1, SW1 6.7, J2 8.1 = 31.0 mm (`bbox` heights), rest 7.0 mm; right column U1 25.5 + divider row (R18 R11 R12 C8 R8) 0.9 + buttons SW2/SW3 5.2 = 31.6 mm; dimension line 0…38.
- 横着量: full-height bands: connectors 7.7 (J2–J4 bbox), motor+power+charge 17.5 (union of those regions' refs), module caps 0.9 (mcu region minus U1), module 18.0 (U1 crt) → 44.0 mm; gaps 12.0 mm; module right margin 3.0 mm.

**W2 尺寸门槛** (`#p3-tier`, own SVG, 1 mm = 1.4 px, all to scale)
- 经济型贴片: 10 × 10 min square + QB12 [S04].
- 标准型贴片: 70 × 70 min square + 2 × 2 panel ghost of QB12, 2 mm gap → 114 × 78 mm (示意) [S04][S01].
- 打样常见一档: 100 × 100 square; QB12 area = 21 % of it (`stats.area` / 10000) [S14][S15] (no price stated).
- 放进船舱: electronics bay polygon from `../../hardware/hull/build_model.py` line 149 `bay_poly` = 144 × 76 mm (incl. bow point); board position inside is 示意.

**W3 板框动画** (`#p3-ol`, own SVG in mm)
- ▶ 按脚本画一遍: the 8 pieces in build_board.py order (4 `seg` then 4 `arc`, lines 219–223), labels ①–⑧, yellow = line, orange = arc; R2 marker; board fill appears when closed. Plays once when scrolled into view.
- 去掉一段: piece ⑥ (bottom-right arc) removed, two red circles at loose ends, status = DRC message “电路板的外框形状有问题” (8.0.9 and 10.0.6 zh_CN translation of "Board has malformed outline", unchanged) + JLC advice to check closure [S11].
- Code box: real build_board.py lines (one statement per line), numbers from `board.w/h/corner_r`.

**W4 铜离板边** (`#p3-ec` slider 0.05–0.80, default 0.30; `#p3-ecsvg` 示意 zoom of the edge)
- Hatched band = outline tolerance ±0.2 mm (CNC 锣边 normal) [S01]; white line = actual cut, drifting inside the band (reduced motion: fixed at the worst case +0.2 mm, label 最坏的切边); copper block at distance d; yellow = copper the cutter removes.
- Axis zones: red < 0.2, yellow 0.2–0.3, green ≥ 0.3. Status text by d: <0.2 below JLC 锣边 0.2 mm [S01]; 0.2–0.3 OK for JLC but economic SMT advises > 0.3 mm (分板公差约 0.2 mm) [S07 #14]; 0.3–0.4 QB12 rule = `rules.min_copper_edge_clearance` 0.3 = JLC economic recommendation (facts §1.3); 0.4–0.5 V-cut ≥ 0.4 mm [S01]; ≥0.5 KiCad new-project default 0.5 mm [S34] (facts §6.4).
- Side card "QB12 实际": nearest copper to the outline computed over pads (rotated rect corners / poly / circle), tracks (end points − w/2), vias, zone fill vertices, against the rounded-rect outline: pour 0.30, pad 0.32 (J2), track 0.42, via 0.45 mm. DRC copper-edge items 0 (`drc.by_type` has none), only 4 “丝印离板边太近” (silk_edge_clearance) warnings.

**W5 摆放故事** (`#p3-storybv`, BoardViewer + own ratsnest overlay; buttons ▶ / ← / → / GND toggle / 9 chips)
Ratsnest = Prim MST per net over all non-NPTH pads at current positions (same algorithm as `board.json.ratsnest`; final total matches it, 737.2 mm, 135 lines). Pile = `BoardViewer.pileLayout()` (示意). Parts fly per frame with `offsetParts(map,{duration:0})`; unplaced parts drawn at 30 % opacity; lines touching the active group are yellow; crossings = pairs of lines of different nets that properly intersect. Readouts: total length, crossings, placed n/51.
| state | parts | card facts (computed) | source of the reason |
|---|---|---|---|
| 0 一堆 | — | 51 parts, 36 nets, 135 lines, 1461 mm, 363 crossings | — |
| 1 贴边 | J3 J4 J2 J1 SW1 | connectors 0.6 mm from left edge (bbox x0); J1 overhangs bottom 0.7 (bbox y1 38.735); SW1 overhangs left 1.0 (bbox x0 −0.985) | derived (stated as such) |
| 2 模组 | U1 | module 18.0 × 25.5; antenna end 0.4 mm from top edge (crt y0 0.415); antenna keepout 22.0 × 7.4 both layers (`zones` id antenna); module datasheet antenna area ≈ 6 mm; 23.9 mm from J1 to the keepout | [S46] antenna outside board / feed near edge / cut board / no copper / USB+UART away; [S47] 6 mm. Honest: QB12 neither overhangs nor cuts the board, it only removes copper |
| 3 电源路径 | Q1 Q2 R13 R14 C9 C10 C14 C15 D1 U3 C3 C4 | J2→Q2 9.0, Q2 D→Q1 D 3.3, Q1→C9 5.9 mm (pad-centre distances); old table J2→Q2 30.1 mm | quotes of build_board.py comments (Q2→Q1 0.8 mm direct; C9→C14 short); `V1` = build_board_v1.py lines 84–88 (SW1 25.5/3.7/180, Q2 25.0/8.6, R14 28.4/8.6/90, Q1 25.0/12.8, R13 28.4/12.8/90); button 对比旧版 draws ghost boxes + dashed J2→old-Q2 line |
| 4 电机驱动 | U2 R15 R16 C11 C12 C13 R9 | ML±/MR± ratsnest 21.0 mm; C13 VINT→pin 14 3.9, C11 VM→pin 12 3.8, C12 VCP→pin 11 3.6 mm; note: TI wants 10 µF at VM, QB12 has 100 nF C11 there, nearest 22 µF (C14) 8.8 mm from VM | [S48] ds/drv.txt:962-968 |
| 5 充电 | U4 R3 C1 C2 LED1 LED2 R4 R5 | U4 BAT→J2 7.9, R3→PROG 5.4, C1→VCC 2.7, C2→BAT 2.6 mm | [S49] ds/tp.txt:604-660 |
| 6 USB | U5 R1 R2 R17 | U5→J1 D+ 2.4 / D− 2.4, R1→CC1 4.1, R2→CC2 2.4 mm | [S50] ds/usb.txt:316-318, 187-199 (6 nH, 144 V) |
| 7 模组周边 | C5 C6 C7 R7 R10 | C6→U1 pin 2 3.8, C5→pin 2 4.2, R7→EN 4.3 mm; values 100 nF / 10 µF / 10 kΩ / 1 µF from `footprints[].value` | [S46] decoupling + ground via; [S47] ds/esp.txt:2977-2979 EN RC 10 kΩ + 1 µF |
| 8 按键和灯 | SW2 SW3 R6 LED3 R8 R11 R12 C8 R18 | buttons 0.4 mm from bottom edge; 1461 → 737 mm (−50 %); 363 → 90 crossings; 51/51 on top | derived |
Group membership comes from `QB.board.regions` (connectors+J1+SW1, U1, switch−SW1+power, motor, charge, usb−J1, mcu−U1, buttons); leftovers would go to the last group (there are none).
Code box: PLACE excerpt generated from `footprints[]` (x, y, rot normalised to 0–359) in build_board.py's order; offgrid list = J2 y 32.65; rotations 0/90/180/270.

**W6 自己挪一颗** (`#p3-trybv`; pick C6 / U5 / R3; ↑←→↓ = 0.5 mm; mouse/pen drag snaps to 0.1 mm; 放回原位)
- Target distance: C6 3V3 pads → U1 pin 2 (home 3.8 mm); U5 D± pads → J1 D± pads (home 2.4); R3 PROG → U4 pin 2 (home 5.4). Colour good ≤ home+0.6, warn ≤ home+4, else bad.
- Whole-board ratsnest length (home 737 mm) and delta.
- Courtyard overlap = bbox intersection > 0.01 mm (like check_place.py), red boxes; off-board check.
- Reasons: C6 [S46]; U5 [S50]; R3 [S49].
- check_place.py box: literal output of `python3.12 check_place.py out/QB12.kicad_pcb` run on 2026-10-19 with pcbnew 8.0.9, re-run 2026-10-20 with pcbnew 10.0.6 (.venv-kicad): identical (`出板 SW1 (-1.3,19.4)-(4.9,27.8)`, `出板 J1 (21.6,30.5)-(31.4,38.8)`, `overlaps: 0`); margin 0.15 mm and the 56/38 limits are in the script. Hidden refs 3 (LED2, Q1, SW1) = `stats.refs_hidden`; finalize.py comment “放不下就隐藏”.

**W7 顶面 / 底面** (`#p3-sidebv`, made mode, green mask): bottom = no parts; silk words from `texts[]` (B. layer, uppercase, JLC order-number text excluded). Facts: economic SMT single side only, standard single/double with separate (higher) double-side setup + stencil fees [S04][S05] (no amounts); Espressif 2-layer: no components on bottom [S46]; QB12 CPL exported top only [S53].

**W8 KiCad 四步** (tabs) — screenshots kicad_update_pcb (demo project R1/D1/J1), kicad_constraints, kicad_edge_only (Edge.Cuts + F.Courtyard only), kicad_pcb_main. Menu names: 工具 → 从原理图更新 PCB... F8 (greyed out in QB12's PCB editor, needs project-manager project), 更新 PCB, 文件 → 电路板配置... → 设计规则 → 约束, 铜箔到板边间距, 外观 → 层, 放置 → 绘制线条 Ctrl+Shift+L (10.0.6 name; 8.0.9 was 绘制线; menu shows Shift+Ctrl+L on Windows/Linux, ⇧⌘L on mac), 放置 → 绘制矩形, 形状修改 → 圆角线..., 放置 → 栅格原点, M, R / Shift+R, F 换面 / 翻转, Shift+M 精确移动..., N / Shift+N, Alt+1 / Alt+2, Home 视图 → 自适应缩放 (mac ⌘0), 检查 → 设计规则检查, DRC item 元件外框重叠 [S30][S33][S34] + zh_CN .mo (10.0.6, checked against facts_kicad10.md) + kicad_shots.md. Screenshots are still 8.0.9 (not re-shot); their captions were left as 8.0.9 on purpose. KiCad file position of U1 (144, 116.8) = board.json (44.0, 16.8) + build_board.py `OX, OY = 100.0`.

**W9 快捷键练习** (`#p3-keysvg`): Q2 (SOT-23, 3 pads from `footprints[Q2].pads`, courtyard from `crt`) on a 示意 grid list 1 / 0.5 / 0.25 mm, grid-origin cross. Buttons + keyboard (when focused): arrows = one grid step with snapping, r / Shift+R ±90°, f flip (mirror, pads blue), n / Shift+N grid, Shift+M exact-move form (no snapping), 复位. Readout x/y from the origin, angle, side, grid.

**Quiz**: Q1 numbers = left stack 31.0 mm, module 25.5 mm, widths 7.7 + 17.5 + 18.0 = 43.1 mm (unrounded sum) (button → W1 竖着量). Q2 C6 3.8 mm from pin 2 [S46] (button → W6 with C6 moved −6 mm). Q3 economic single side, standard double-side fees, standard min 70 × 70 [S04][S05] (button → W7 bottom).

## Things not from facts.md (general KiCad behaviour, flagged)
- F8 again keeps already-placed footprints; new footprints arrive as a group attached to the cursor.
- 圆角线... lives in the right-click 形状修改 submenu (both strings exist in the 8.0.9 and 10.0.6 translations; position in the menu not verified on screen).
- Grid list in W9 is illustrative only.

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
