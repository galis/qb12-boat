# 第 5 课 过孔与铺铜 — notes for video makers and the fact-checker

Files: `lessons/p5.html`, `p5.css`, `p5.js`, `tools/test_p5.py`. No new assets (all drawings are SVG / canvas built in JS).
KiCad screenshots used (once each): `kicad_predef_sizes` (5.1), `kicad_bcu_view` (5.3), `kicad_zones_unfilled` + `kicad_zone_props` (5.4), `kicad_keepout_props` (5.6).
2026-10-20 按 KiCad 10.0.6 更新：howto 里的菜单名、快捷键、对话框字段、过孔盖油位置按 `facts_kicad10.md` 改；5 张 KiCad 截图还是 8.0.9 的，说明文字暂未改（等重拍）。
All QB12 numbers are computed at runtime from `QB.board` (variables named below); the values in brackets are what they evaluate to today.

## Sections

### 5.1 过孔：在板上打一口“电梯井”
Widget (via anatomy):
* Left SVG `#p5-xs`: cross-section (示意: horizontal 150 px/mm to scale, thickness exaggerated). FR-4 core, top track from the left into the top pad, bottom track leaving to the right, drilled hole, plating (barrel), mask top/bottom. Dots flow top track → down the barrel → bottom track. Dimension lines: 焊环 (top, yellow; orange if < QB12 rule or < position tolerance), 外径, 孔径.
* Right SVG `#p5-tv`: top view, pad + 0.2 mm track, hole, dashed circle = hole shifted by the position tolerance 0.075 mm; turns orange + "钻破焊盘边" when ring < 0.075.
* Sliders: 外径 0.25–1.2, 孔径 0.15–0.6 (step 0.05). Presets: 0.6/0.3 (QB12 ×170), 0.8/0.4 (QB12 ×7), 0.25/0.15 (JLC 最小), 0.4/0.3 (焊环太窄).
* Toggle 盖油 / 开窗 (mask over the via or an opening of pad size).
* Readouts: ring = (d − h)/2; d − h; barrel copper cross-section expressed as an equivalent 1 oz track width = π·h·18 µm / 35 µm (0.3 mm hole → 0.48 mm).
* 5 check cards: QB12 rules (`D.rules.min_via_diameter 0.5`, `min_through_hole_diameter 0.3`, `min_via_annular_width 0.1`); JLC can make it (hole ≥ 0.15, d ≥ 0.25, d − h ≥ 0.1 [S01][S02]); JLC recommended (hole ≥ 0.2, d − h ≥ 0.15 [S01][S02]); extra cost (JLCPCB only: hole 0.1/0.15, or hole 0.2/0.25 with d < 0.45 [S01], "以下单页为准"); breakout if ring < hole position tolerance ±0.075 mm [S01] (geometric derivation, marked 推导).
Text numbers: `S.via_sizes` [170 × 0.6/0.3, 7 × 0.8/0.4]; rings 0.15 / 0.20; nets with 0.8/0.4 vias computed [VSYS, VBUS, BAT+]; `cls('Batt').via` [0.8/0.4]; `S.gnd_vias` [149], `D.process.gnd.via` [0.6/0.3] (route_b.py line 16 `VIA_D, VIA_H = 0.6, 0.3`); `S.vias` [177]; `S.pads` [217].
Facts: KiCad 10 default netclass via 0.6/0.3 (same as 8, facts_kicad10 #109), not extra-cost at JLC [facts §1.3, S34, S01]; netclass sizes are defaults not limits [§6.2, S30]; average hole copper 18 µm [§1.1, S01]; 1 oz ≈ 35 µm [§3.2, S19]; 嘉立创 “过孔不管控公差” [§1.1, S03].
Tenting (local fact, verified 2026-10-19; re-checked 2026-10-20 on the KiCad 10 board): `out/QB12.kicad_pcb` setup `(tenting (front yes) (back yes))` (KiCad 8 file had pcbplotparams `(viasonmask no)`); `jlc/gerber/QB12-F_Mask.gts` has 217 flashes = 217 pads, `B_Mask.gbs` 12 flashes (J1 4 shell + 2 NPTH, SW1 2 NPTH, U2's 4 footprint holes) → all 177 vias covered both sides. KiCad 10.0.6 Gerbers (2026-10-20) give the same 217 / 12.
howto: Board Setup → 约束 / 网络类 / 预设尺寸 [§6.1]; 最小过孔外径 / 最小钻孔孔径 [facts_kicad10 screenshot #9]; `'` / `\` via size, `Q` custom [§6.1]; tenting since KiCad 9 in 电路板配置 → 电路板叠层 → 阻焊/锡膏 → 过孔盖油: 顶层 / 底层, per-via 走线与过孔属性 → 阻焊覆盖: (IPC-4761; option names 来自规则 / 双面盖油 (Type I-b) / 双面塞孔 (Type III-b) from the 10.0.6 zh_CN .mo) [facts_kicad10 #6, #114].
Screenshot caption checked against the real image: 预设尺寸 page shows tracks 0.2/0.3/0.4/0.5/0.8, vias 直径/孔径 0.6/0.3 and 0.8/0.4, 差分对 empty.

### 5.2 177 个过孔，五种用途
Widget: buttons per role (counts from `S.via_roles`: signal 28, fanout 32, stitch 102, thermal 11, module 4, 全部 177) → viewer `#p5-bv1` (`B.highlightVias(role)`, yellow rings) + card. Clickable stacked bar under it (same counts) + “谁打的” line.
Per role (viewer state → card facts):
* signal: board view, layers F.Cu B.Cu Vias Drill Edge.Cuts. Sizes 21 × 0.6/0.3 + 7 × 0.8/0.4; 12 nets (computed); Freerouting 25, script 3 locked (2 VBUS under J1 + 1 BAT_SW). Sub: “只看 7 个大孔” (filter d=0.8), “看底层的 VBUS” (highlightNet VBUS + its vias, focus usb).
* fanout: board + Zones. 0.72–1.20 mm from pad centre (computed nearest GND SMD pad). Placed by route_b.py fanout mode before routing, locked. Sub: “看 C6 的地” (C6 + its fanout via, zoom). Fact: Espressif ground via next to capacitor ground pad [§8.7, S46].
* stitch: board + Zones. Grid `process.gnd.stitch_step` 2.5 mm, staggered rows, start (1.5, 1.5) (route_b.py §3) → 330 candidate points (computed in JS from the same loop); kept if ≥ `stitch_clearance` 0.45 mm from other-net copper, off pads/edge/keepouts, and inside the fill on both layers (route_b.py lines 274–337). λ/20 at 2.4 GHz ≈ 3.4–6.2 mm [§8.8, S24 + facts' own calculation]. Sub: “天线下面那一排” — 7 stitch vias just below the antenna keepout (computed: x > 34, 7.4 < y < 9.9), keepouts shown.
* thermal: zoom U2 with EP box. U2: 5 script vias (plus pattern, route_b.py line 170) + 4 footprint PTH holes (pads `17`, 0.61/0.3, cyan rings) = 9; EP 2.74 × 2.74 mm. U4: 6 (3 × 2), EP 3.3 × 2.4 mm. Sub buttons U2 / U4. Facts: TI thermal vias to opposite-side copper [§8.4, S48 drv.txt:971–981]; TP4056 vias to backside copper “useful”, EP soldered to ground [§8.5, S49 tp.txt:618–660]; via-in-pad wicks solder, JLC produces anyway and emails [§4.5, S07 #17].
* module: zoom module keepout. 4 vias between U1's 3 × 3 pad-41 GND pads (route_b.py §2). Facts: EPAD to ground “not a must”, helps heat [§8.3, S47 esp.txt:2972–2975]; ground pads in full contact with pour [§8.7, S46].
* all: 149 GND / 28 signal.
“谁打的”: pre-routing locked `S.locked_vias` 46 (fanout 32 + thermal 11 + 3), Freerouting 25, post-routing 106 (stitch 102 + module 4). Same split as p0.
howto facts: X / V [§6.1, §6.2]; Ctrl+Shift+X 放置 → 放置过孔; net: on a zone → zone's net, auto-update off; on a track/pad → “通过网自动更新” (“Automatically update via nets”, same in 10.0.6 .mo) on [facts_kicad10 #66, #92]; Ctrl+T 创建阵列 [§6.1, §8.8]; no stitching command in 10; Via Stitching 4.0.0 needs KiCad 10, IPC plugin, 偏好设置 → 插件 → 启用 KiCad API [facts_kicad10 #43, #46].

### 5.3 电流要“回家”：回路越小越好
Widget `#p5-loop` (示意 model, 10 px = 1 mm): 60 × 22 mm ground plane, 48 mm top trace between 发送端 / 接收端, ground vias at both chips. Slider = length of a slot cut by another net's bottom track, 0–21 mm from the top edge (trace sits 11 mm down). States:
* slot doesn't reach the trace → return straight under the trace (status good).
* slot crosses → return detours around the slot end (drawn bezier); extra area shaded yellow.
* button “缝两边打缝合孔” → a top-layer patch + 2 stitching vias next to the trace; the model takes whichever of (detour, via bridge) encloses less area — for short overhangs the detour is still smaller and the text says so.
Readouts: extra return length; loop area = 48 mm × 1.5 mm (core thickness, facts §3.4 [S28]) = 72 mm² + shaded area; ratio to intact plane. Tip box says the model is illustrative.
Text (computed): bottom-layer non-GND tracks `bTr` [45 segments, 12 nets, 207.4 mm]; longest per net [BAT_SW 37.8, VBAT_ADC 22.4, nFAULT 19.9, VBUS 18.6 mm].
Facts: pour reduces loop area [§8.8, S24]; HF return under the trace / loop antenna = first principles; Espressif USB: continuous reference plane, minimise layer changes, a pair of ground vias at each change [§8.2, S46].
howto: Appearance panel → right-click → “隐藏除当前工作层的所有层” (msgid “Hide All Layers But Active”; same in the 8.0.9 and 10.0.6 zh_CN .mo; not in facts.md). Screenshot `kicad_bcu_view` checked: B.Cu only, slots from bottom tracks, antenna + module keepouts hatched; status bar 217 / 177 / 391 / 36 / 0 matches board.json.

### 5.4 铺铜：把空地全变成地
Widget: 6 step buttons → viewer `#p5-bv2` + card; readout tiles (F 1212 mm² 57 %, B 1724 mm² 81 % of `S.area` 2124.6; clearance 0.3; min width 0.25; solid; islands always — all from `zones[]`).
1. 画外框: B.Cu + vias, dashed hatched outline from `ZB.outline` (0.3 mm inset = `rules.min_copper_edge_clearance` 0.3), 55.4 × 37.4 mm. Card + `kicad_zones_unfilled` caption: “未布线 154” with zones unfilled — NOT in board.json; verified 2026-10-19 with python3.12 + pcbnew (load `pcb/out/QB12.kicad_pcb`, BuildConnectivity → GetUnconnectedCount = 0; UnFill() both GND zones → 154; only GND zones exist, so all 154 are GND connections). Hard-coded as `UNROUTED_UNFILLED` in p5.js; matches the screenshot's status bar. KiCad 10.0.6 gives the same 154 (facts_kicad10 screenshot #17).
2. 填充底层: `B.reveal('Zones')` on B.Cu; 1 polygon with 10 holes (`fill['B.Cu'].polys`).
3. 底层的缝: bottom non-GND tracks drawn in yellow over the B.Cu fill (45 segments, 207.4 mm; top 345 segments 472.1 mm).
4. 填充顶层: F.Cu fill, 6 polygons; islands removed / bridge-via pass in route_b.py §5.
5. 两层缝在一起: both layers, 149 GND vias ringed.
6. 放大看间隙: zoom to the midpoint of the longest bottom segment (VBAT_ADC, 0.2 mm) with a 0.3 mm dimension line.
Facts: why pour (lower ground impedance, interference, voltage drop, loop area) [§8.8, S24]; copper = heat sink (TP4056) / more copper more dissipation (DRV8833) [§8.5 S49, §8.4 S48]; uniform copper → even plating [§2 step 6, S19]; KiCad 10 defaults 0.5 / 0.25 / always (unchanged, facts_kicad10 #103); 放置 → 绘制填充区 (Ctrl+Shift+Z, mac ⌥Z), 覆铜区属性 tab 间距与焊盘连接, 栅格填充 checkbox, priority in 填充区管理器, B 填充所有填充区 / Ctrl+B 取消填充所有填充区, auto-refill 偏好设置 → PCB 编辑器 → 编辑选项 → 其他 → 自动重新对填充区填充, “绘制前检查填充区填充内容” [facts_kicad10 #5, #68, #69, #94–#106].
Screenshot captions: `kicad_zone_props` checked against the real image (F.Cu, GND, 电气间隙 0.3, 最小宽度 0.25, 焊盘连接 实心, 填充类型 实心填充, 死铜移除 总是启用). `kicad_zones_unfilled` (real, top-left zoom, F.Cu active, status bar 未布线 154) checked.

### 5.5 焊盘怎么接到铺铜上：实心还是花焊盘
Widget: two canvases (60 × 40 cells, 0.1 mm/cell, a 6 × 4 mm pour with a 0.8 × 1.0 mm pad; relief = 0.5 mm gap (KiCad default [§6.3]) + 4 spokes 0.4 mm) + SVG chart of pad temperature vs time. Explicit 2-D diffusion, edges tied to “rest of board”. Buttons: 用烙铁焊 (heat only the pad; runs automatically the first time the widget is seen) / 进回流炉 (everything heated). Results today: iron → relief melts ≈ 4.5× sooner than solid; oven → both within ~1 %. No units (示意, stated in the tip). Reduced motion: the whole run is computed at once and the end state drawn.
Text: QB12 zones solid (`zones[].pad_connection` 'solid', route_b.py line 321 `ZONE_CONNECTION_FULL`); 51 parts all JLC-placed (`D.fab.cpl.length` 51); EP heat path; Espressif full contact [§8.7, S46]; 嘉立创 recommends 十字焊盘 because copper conducts heat fast [§6.3, S24]. Cost: rework with an iron is harder (first principles).
howto: zone dialog options (实心 / 缓释热焊盘 (花焊盘) / 在电镀孔上 (PTH) 使用缓释热焊盘 (花焊盘) / 无), gap and spoke width 0.5 defaults, min spoke count 2, DRC message “缓释热焊盘 (花焊盘) 与填充区的连接不完整” [§6.3, facts_kicad10 #98, #103–#105]; pad-level override “连接到填充区的焊盘” (10.0.6 translation of “Pad connection to zones:”; 8.0.9 said 连接到域的焊盘; not in facts.md).

### 5.6 禁布区：哪里不许有铜
Widget: 3 buttons (antenna / module / usb, from `zones[]` with `rule:true`) → viewer `#p5-bv3` zoomed to the keepout + card with the five flags from `zones[].keepout` and size/position from `bbox` (clipped to the board).
* antenna: F.Cu + B.Cu, tracks/vias/pour forbidden; 22 × 7.4 mm, x 34–56, y 0–7.4; 7 stitch vias 1.60 mm below its edge ringed. Facts: antenna area ≈ 6 mm deep on the module land pattern [§8.3, S47 esp.txt:3353–3374]; Espressif: antenna outside the board or cut the board under/beside it; 15 mm clearance in an enclosure; enough ground copper and dense ground vias near the antenna [§8.3, S46]. Honest: QB12 does not cut the board.
* module: both layers, tracks only; 5.2 × 5.2 mm; 4 module vias ringed (route_a.py MOD comment).
* usb: F.Cu only, tracks only; 8.4 × 4.2 mm on the board; USB nets highlighted. Reason (route_a.py “USB-C 金属壳底下：顶层不走线”) explained as a derivation: shell is metal + grounded, mask ≥ 10 µm [§1.1, S01].
howto: 放置 → 绘制规则域 Ctrl+Shift+K, 规则域属性 checkboxes 禁止放置走线 / 禁止放置过孔 / 禁止填充填充区 (10.0.6 translation) [facts_kicad10 #70, screenshot #18]. Caption checked against the real `kicad_keepout_props` image (F.Cu + B.Cu, 禁止放置走线 / 过孔 / 填充 (铺铜) checked).

### 5.7 自测三题 + next card (#p6)
1. Ring of 0.6/0.3 = 0.15; 0.4/0.3 → 0.05, d − h = 0.1 (JLC floor, below recommendation), QB12 DRC errors, ring < 0.075 tolerance. Button sets the slider to 0.4/0.3.
2. Why top pour + 102 stitch vias although the bottom is almost solid: bottom tracks cut slots (45 segs, 207.4 mm), stitching + λ/20. Button: stitch vias in the 5.2 viewer.
3. U2 EP holes: 4 + 5 = 9; solid because of the heat path and reflow assembly; cost = hard rework. Button: thermal vias in the 5.2 viewer.

## Things the fact-checker should look at
* “隐藏除当前工作层的所有层” and “连接到填充区的焊盘” come from the 10.0.6 .mo, not facts.md.
* “在板角点下第一点，弹出 覆铜区属性 / 规则域属性” — KiCad behaviour (dialog opens after the first click), not in facts.md.
* The heat and loop widgets are qualitative models (labelled 示意); no number from them is a claim about QB12.

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
