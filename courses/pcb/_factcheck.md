# QB12 PCB 课 — 独立事实核查

Done 2026-10-19 ~07:15 UTC. Read-only: no course file edited. Rendered text checked from `_preview.html` built 06:50 (p0–p4 re-rendered at the end: no change to the flagged text; all flagged phrases re-grepped in lessons/p*.html|js and still present). Work scripts and outputs in S/fc/ (gt.py, gt2.py, mask.py, edge.py, gaps.py, dump.py, zq.py; rN*.txt = rendered lesson text; drc1/, kz/ = DRC runs; gz/ vs gzold/ = new vs X2 Gerbers).

## Summary

Counts (rows below): **WRONG 1 · MISLEADING 7 · UNSOURCED 3 · OK-but-note 20**, plus 9 bulk “OK” rows that list the several hundred numbers / UI strings that checked out. All headline numbers (sizes, counts, lengths, widths, vias, DRC 180 / 132, mask/paste, drill table, CPL/BOM, IPC-2221 currents, USB timing) match the real .kicad_pcb, the delivered files and recomputation. KiCad zh_CN names match `kicad.mo` except where noted. No invented prices; facts.md §10 uncertain items are hedged in every lesson.

Top 10 fixes (most important first):
1. **P8-1 (safety)** p8 “你自己准备的”: say the 1S battery must have a **protection board** — QB12 has none on board (QB12_BOM.xlsx says so; circuit course says so; p8 never does). Add P8-2 (no reverse-polarity protection → reversed battery hits TP4056 BAT, abs max −0.3 V) and P8-3 (0.1 µF caps on the motors).
2. **P2-1 (WRONG)** p2 “U2 的 4 个小孔……去掉了钢网开口” + quiz 2: the EP's own 1.92 mm paste opening still covers all 4 holes (and the centre thermal via), so paste is printed over them.
3. **P7-1** p7 says 18 parts to check orientation (incl. SW2/SW3), p8 says 16 — different filters (p7.js:42 vs p8.js:28). SW2/SW3 use diagonal pads, rotation-proof → use 16 in both.
4. **P3-1** p3: placing the grid origin does not change coordinate display (needs 原点和轴 → 显示原点), and QB12's file has the grid origin at bottom-left (finalize.py), contradicting “和 QB12 的坐标表一样”; align with p7 (P7-2).
5. **P5-1** p5 says solid vs relief pads “差不多同时化锡” in reflow — contradicts p2's (correct) tombstoning explanation; soften.
6. **P3-2** p3 “0.3 mm 正好是 JLC 对经济型贴片的建议值”: JLC says traces **and components** > 0.3 mm; QB12 is at 0.30 and J1/SW1 overhang on purpose — say so (p6 already words it better).
7. **P0-1 / P2-2** J1's 0.1 mm local clearance: reason is not in the script, and the 0.15 constraint is a hard floor (pour sits at 0.150 mm) — p6 quiz 3 already says this; make p0/p2 agree.
8. **P3-3** ESD: the 144 V is L·di/dt added to the clamp voltage, not the protector being “来不及”.
9. **P5-2 / P4-1 / P7-3** design reasons presented as fact (three reasons for solid pads; “宽度就是这么来的”; why no plugin) — mark as inference.
10. **P6-1** “唯一一项规则比工厂建议还松” — 孔到孔 0.25 is below JLC's 0.45 for pad holes (closest pair 0.41 mm, U2 footprint hole ↔ via) and edge 0.3 is not “> 0.3”.

Smaller notes worth one pass: P0-3/P5-4 antenna wording (“蓝牙天线”, “吸收”), P0-2 “3V3 = 3.30V” → ≈3.3 V (原 ME6211 ±1 %；现 AP2112K ±1.5 %), P0-4/P4-2 “每个接地焊盘就近打孔”, P1-1 B.Mask openings include U2's 4 holes, P2-3 pad-17 table row, P5-3 zh DRC message, P6-2/P6-3/P6-4.

## Ground truth verified (used by all lessons)
- `python3.12 S/fc/gt.py` on S/pcb/out/QB12.kicad_pcb: 56.1×38.1 frame, 1.6 mm, 2 Cu; rules 0.15/0.15/via 0.5/drill 0.3/edge 0.3/h2h 0.25/hole-clr 0.25/annular 0.1/silk text h 0.8; netclasses Default 0.2/clr 0.18/0.6-0.3, Batt 0.8/0.2/0.8-0.4, Motor 0.4, Power 0.5, Rail 0.3; 391 segs (F 345 / B 46, 472.11 + 211.42 mm), 0 arcs, 177 vias (170×0.6/0.3, 7×0.8/0.4), 149 GND vias, 49 locked tracks, 46 locked vias; 51 fps all top; 217 pads (205 SMD, 8 PTH, 4 NPTH); GND fill F 1212.09 / B 1723.60 mm²; keepouts antenna (34–56, 0–7.4, F+B, no tracks/vias/pour), module (39.9–45.1, 13–18.2, F+B, no tracks), USB (22.3–30.7, 33.8–38, F only, no tracks).
- `kicad-cli pcb drc` (bare folder, S/fc/drc1): 0 errors, 0 unconnected, 180 warnings = 87 silk_overlap + 51 lib_footprint_issues + 38 silk_over_copper + 4 silk_edge_clearance. (Delivered zip in GUI = 132, per kicad_shots.md.)
- Mask (S/fc/mask.py): F.Mask 217 pad openings, B.Mask 12; 0 vias on mask (`viasonmask no`); narrowest bridge 0.200 mm (J1 pads). Gerber zip: F_Mask 217 flashes, B_Mask 12, F_Paste 209; U2/U4 EP paste 1.918² / 2.31×1.68 (= 49 % area).
- KiCad 8.0.9 new-board defaults (pcbnew + /usr/share/kicad/template/kicad.kicad_pro): silk line 0.1, silk text 1.0 / 0.1, edge clr 0.5, Default netclass 0.2/0.2/0.6/0.3, Constraints min clearance 0.0.
- Freerouting log S/pcb/r3/fr19.log: v1.9.0, "Auto-routing was completed in 5.49 seconds", "Route optimization … 1 minute(s) 9.39 seconds … improved the design by ~52.95%", `-mp 40` (run19.sh).

## Progress log
- [x] p0 [x] p1 [x] p2 [x] p3 [x] p4 [x] p5 [x] p6 [x] p8 [x] p7 (last) — complete

---

## p0 全景

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P0-1 | p0.js STOPS[7] (0.3 第 8 站 USB-C) | “中间 8 个只隔 0.5 mm，所以单独给 J1 的焊盘设了 0.1 mm 间距（网络类默认 0.18 mm）” | MISLEADING | build_board.py: `pad.SetLocalClearance(FromMM(0.1))` — no comment giving a reason. J1 pads 0.3 mm wide at 0.5 mm pitch → pad-to-pad gap 0.2 mm, already > 0.18, so the “所以” is the author's inference. KiCad 8 doc raw/pcbnew8.txt:605 “Any minimum value set here is an absolute minimum and cannot be overridden”, :675 → Constraints min 0.15 applies, so the effective clearance is 0.15, not 0.1. | “脚本给 J1 的焊盘单独写了 0.1 mm 的焊盘间距覆盖值（脚本没写原因）。约束里的最小间距 0.15 mm 是硬下限，所以实际按 0.15 mm 检查和铺铜。中间 8 个脚中心距 0.5 mm、焊盘宽 0.3 mm，脚与脚之间只剩 0.2 mm 的缝。” |
| P0-2 | p0.js STEPS[8] 到货检查 facts | “先插 USB：不接电池，VBUS ≈ 5V，3V3 = 3.30V” | OK-but-note | ds/me.txt:12 “高输出精度：±1％” → 3.27–3.33 V; a beginner reading “= 3.30V” may think 3.28 V is a fault. | “3V3 ≈ 3.3 V（3.27–3.33 V 都正常）” |
| P0-3 | p0.js STOPS[2] + quiz 2 | “模组里 2.4 GHz 蓝牙天线”；“铜会挡住、吸收电磁波……蓝牙距离就会变短” | OK-but-note | ESP32-S3 module antenna is shared by Wi-Fi and BLE (ds/esp.txt). Copper near a PCB antenna mainly detunes it and blocks/reflects radiation; “吸收” is loose. facts §8.3 [S46]. | “2.4 GHz 天线（Wi‑Fi 和蓝牙共用）”；“天线附近有铜会让天线失谐、把电磁波挡回去，距离就变短” |
| P0-4 | p0.js quiz 3 | “扇出孔 32 个：每个接地焊盘就近打一个孔下到底层的地” | OK-but-note | route_b.py step 1: `if ref == "U1": continue`; pads of chips with a GND exposed pad (U2, U4) get a 0.3 mm track inward to the EP instead of a via; pads already touched by a GND track are skipped. | “大多数接地贴片焊盘（模组 U1 和 U2、U4 的接地脚除外）就近打一个孔……” |
| P0-5 | p0.js 0.4 bar-v tooltip | “脚本（布线前）… 预留 3” | OK-but-note | The 3 are build_board.py `pre_via`: 2 × VBUS (J1) + 1 × BAT_SW escape, not reserved spares. | tooltip “预画走线的过孔 3（VBUS 2、BAT_SW 1）” |
| P0-6 | p0.html 0.5 card 第 6 课 | “这 180 条警告逐类过一遍” | OK-but-note | 180 = bare-folder kicad-cli run (verified). The delivered KiCad zip opened in KiCad shows 132 (kicad_shots.md, kicad_drc). Check p6 explains both; if it does, fine. | “这 180 条警告（打开交付的工程是 132 条）逐类过一遍” |
| P0-7 | all other numbers in 0.1/0.2/0.3/0.6 | 56×38 R2, 2125 mm², 46 % of card, 57 % / 81 % pour, 51 / 217 / 205 / 36 / 391 / 683.5 / 177 / 149, 17 种封装, 11 个文件, 0.8 mm × 56 (BAT+ 17, BAT_SW 1, VSYS 38), keepout 7.4 mm × 34 mm…, 102/32/11/4/28 vias, U2 EP 2.74 mm with 4+5 holes, U4 EP 3.3×2.4 + 6 vias, VM pad 0.35 mm / 1.9 mm lead, USB_DP/DN 16.75/18.6 mm, Freerouting 5.49 s / 1:09.39 / 53 % | OK | gt.py / gt2.py outputs; route_b.py (step 2.5, offsets), build_board.py pre_track; fr19.log. Area check: 56·38 − (4−π)·2² = 2124.57. Card 85.6×53.98 R3.18 → 46.0 %. | — |

## p1 PCB 是什么做的

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P1-1 | p1.js ITEMS B.Mask (1.1 点“底层阻焊”) | “开窗很少，只有几个穿过整块板的插件孔和定位孔” | OK-but-note | B.Mask 12 openings = J1 4 shell PTH + J1 2 NPTH + SW1 2 NPTH + **U2's 4 thermal PTH holes** (footprint pads “17”, build_board.py adds F_Mask+B_Mask to them). Those 4 are neither 插件孔 nor 定位孔 and are bare on the bottom. | “……只有 12 个通孔开窗：USB-C 外壳脚、定位孔，以及 U2 散热焊盘里封装自带的 4 个孔” |
| P1-2 | p1.js FAB steps / table / quiz | 1.51 mm core (94.4 %), 2×35 µm (4.4 %), 1.44–1.76 mm, 0.10/0.10 & 0.16 mm, mask dam 0.10/0.13/0.20 vs QB12 0.2 (J1), Tg 130–140 / 245–260 / 300–310 / 255±5, 217/205/12 openings, 11 vias in EP openings, 209 paste openings, 189 holes, 0.8 mm / 0.15 mm ref text, JLCJLCJLCJLC May-2026, “线宽”=Thickness mistranslation, board finish only in .gbrjob, Ctrl+H | OK | mask.py; F_Mask.gts 217 flashes; kicad_stackup.webp; zh.po `'Thickness' => '线宽'`; raw/pcbnew8.txt:558-561, :235; raw/How-to-mark-on-PCB.txt:164; facts §1.1, §3.3 [S01][S18][S04]. KiCad default silk 0.1 mm confirmed in 8.0.9 template. | — |
| P1-3 | p1.js FIN checks / rec table | “表面不平：JLC 说喷锡不适合脚很密的芯片。QB12 最密的是 J1，0.5 mm”；建议沉金 | OK-but-note | raw/jlcpcb-surface-finish.txt:137 “unsuitable for fine-pitch components and BGA” — JLC gives no pitch threshold, so calling 0.5 mm “很密” and recommending ENIG is the author's judgement (it is presented as 建议, acceptable). Same page :178 says OSP “available at no additional charge” — worth one line since the table says “省钱” = 喷锡. | 在建议表“为什么”里加一句：“JLC 没写多细才算‘很密’，这里按 0.5 mm 的 USB-C 从稳。” Optionally: “JLC 还写 OSP 不加钱、表面也平（raw/jlcpcb-surface-finish.txt:177-178）”. |

## p2 封装

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P2-1 | p2.js MODS[1] “U2：散热焊盘里的 4 个小孔编成 17 号” + quiz 2 (#p2-q2) | “还去掉了孔上的钢网开口：孔里有锡膏，回流时锡会顺着孔流走 [S07]”；“散热焊盘里那 4 个小孔干脆不开钢网，免得锡顺着孔流走” | WRONG | build_board.py removes F.Paste only from the 4 hole *pads* (comment: “去掉这些过孔上的钢网开口（底面不出锡膏）”). But the EP's own paste opening is 1.918 mm square centred at (14.5, 11.0) → spans 13.54–15.46 × 10.04–11.96; the 4 holes sit at (14.0/15.0, 10.5/11.5), all inside it (F_Paste.gtp `%ADD36R,1.918000X1.918000*%`; PTH.drl T2 X14.0Y26.5 … in aux coords). The script's centre thermal via (14.5, 11.0) is also under paste. The 4 hole pads are open on B.Mask too (mask.py: B.Mask 12 incl. U2.17 ×4). So paste *is* printed over all of them. | 改成：“脚本把这 4 个孔焊盘自己的钢网层去掉了（脚本注释写的是‘底面不出锡膏’）。不过散热焊盘的钢网开口有 1.92 mm 见方，这 4 个孔离中心只有 0.5 mm，照样落在锡膏下面；回流时会有一些锡流进孔里，JLC 说这种焊盘上的孔可能造成虚焊、默认照常生产 [S07]。” Quiz 2 last sentence → “散热焊盘里的小孔没有单独的钢网开口，但都在缩小后的开口范围里，挡不住锡流进孔。” |
| P2-2 | p2.js MODS “J1：每个焊盘单独设 0.1 mm 间距” | “J1 中间的焊盘只隔 0.5 mm，缝只有 0.20 mm。脚本给 J1 的每个焊盘设了 0.1 mm 的局部间距” | OK-but-note | Same as P0-1: Constraints 最小间距 0.15 is an absolute floor (raw/pcbnew8.txt:605), so the override takes effect only down to 0.15. | 末尾加：“约束里的最小间距 0.15 mm 是硬下限，所以实际起作用的是 0.15 mm。” |
| P2-3 | p2.js pad table (2.3, U2 card) | row “17 ×5 · GND · 金属化孔 · Ø0.61” | OK-but-note | U2 pad 17 = 1 SMD 2.74 × 2.74 EP + 4 PTH Ø0.61 (gt2.py). Grouping by number shows only the first pad's type/size. | 分两行：“17 · GND · 贴片 · 2.74 × 2.74” 和 “17 ×4 · GND · 金属化孔 · Ø0.61” |
| P2-4 | p2.html 2.2 tip, 2.6, 2.7, 2.8 | 17 种 easyeda2kicad 封装；R0603 ×16；基础 16 种 39 个 / 扩展 9 种 12 个；22 个 LCSC Part 不一致 (8 C0603 → C14663, 14 R0603 → C23186; C6 C8 C11 R1 R2 碰巧对)；make_bom.py 只读 netlist.py；SW1 attr through_hole, 7 SMD + 2 NPTH Ø0.9；坐标文件 51 / 仅贴片 50 (−SW1) / 排除通孔 48 (−J1 SW1 U2)；交付工程 DRC 3 条 lib_footprint_mismatch = SW1 J1 U2；D1 pad 1 = K；paste −15 % → 70 % × 70 % (49 %)；U2 270° → pin 1 top-left；UI names 封装检查器 / 新建封装... / 添加焊盘 / 锡膏相对间距 / 间距重写 / 将封装与库比较 | OK | All 17 .kicad_mod line 1 `(module easyeda2kicad:…`; SW-TH_MSK12C02 `(attr through_hole`; S/fc: pcbnew on .bak_lcsc → exactly these 22; make_bom.py `from netlist import PARTS`; kicad-cli pos: 51 / `--smd-only` 50 / `--exclude-fp-th` 48; kicad-cli DRC on delivered zip → 87+38+4+3 lib_footprint_mismatch (SW1, J1, U2); F_Paste.gtp 1.918² and 2.31×1.68; zh.po lookups. | — |

## p3 板框与布局

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P3-1 | p3.html 3.5 tab ③ 画板框 | “再用 放置 → 栅格原点 点在板框左上角，元件坐标就从这个角开始算，和 QB12 的坐标表一样” | MISLEADING | raw/pcbnew8.txt:4928 “Display origin: Determines which coordinate origin is used for coordinate display” — moving the grid origin alone only moves the grid; coordinates follow the *显示原点* preference (zh: 原点和轴 → 显示原点; default page origin). Also QB12's own board file has `(grid_origin 100 138)` = bottom-left, set by finalize.py `ds.SetGridOrigin(P(0, BH))`, not the top-left the PLACE table uses. | “再用 放置 → 栅格原点 点在板框左上角，并在 偏好设置 → PCB 编辑器 → 原点和轴 里把 显示原点 选成 栅格原点，坐标才从这个角算起，和 QB12 的坐标表一样（KiCad 的 Y 默认向下）。注意交付的 QB12 文件里栅格原点被 finalize.py 设在了左下角。” |
| P3-2 | p3.js 3.2 slider status (q 0.3–0.4) + table row | “QB12 的规则就是 0.3 mm …，正好是 JLC 对经济型贴片的建议值”；table “JLC 经济型贴片建议 > 0.3 mm” | MISLEADING | raw/pcb-assembly-faqs-part-2.txt:163 “edges of the traces **and components** must be more than 0.3mm away from the edge of the board”. QB12: rule = 0.3 (not > 0.3); measured pour 0.300 mm (S/fc/edge.py), J2.4 pad 0.323; and J1 / SW1 bodies deliberately overhang (lesson's own 3.4). | “JLC 建议做经济型贴片时，走线和元件边缘都离板边**大于** 0.3 mm（分板有约 0.2 mm 公差）。QB12 的规则 0.3 mm 刚好压在这条线上；J1、SW1 还故意伸出板边，下单时留意工程师会不会提出来。” |
| P3-3 | p3.js PICK.U5.why (3.4) | “……8 kV 静电时这段线上就多出 144 V，保护管来不及把电压压住” | MISLEADING | ds/usb.txt:187-199 (facts §8.6): the 144 V is L·dI/dt across the trace inductance that *adds to* the clamp voltage (31.2 V → 319.2 V); it is not about the diode being too slow. | “……这段线上就多出 144 V，叠加在保护管的钳位电压上：芯片那头看到的不是 31 V，而是 300 多 V。” |
| P3-4 | p3 numbers | 874 mm² / 41 %, U1 18.0 × 25.5, antenna end 0.4 mm from top, keepout 22 × 7.4, edge distances 0.30 (pour) / 0.32 (J2) / 0.42 (track) / 0.45 (via), check_place output, J1 +0.7 / SW1 +1.0, C6→pin 2 3.8 mm, left column 31.0 mm, PLACE all 0.1-mm multiples except J2 y 32.65, build_board_v1.py SW1/Q2/Q1 positions, bay 144 × 76 mm, outline 8 segments R2 / 0.1 mm, “电路板的外框形状有问题”, 形状修改 → 圆角线..., 10 kΩ + 1 µF EN, 6 nH / 144 V | OK | S/fc/edge.py → pad 0.323 J2.4, track 0.418 PROG, via 0.45, zone 0.300; `python3.12 check_place.py out/QB12.kicad_pcb` identical; gt2.py courtyards (J1 y_max 38.74, SW1 x_min −0.98); build_board_v1.py:84-88; boat3d/build_model.py:149 bay_poly x 40…184, y ±38; zh.po. | — |

## p4 走线

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P4-1 | p4.html 网络类 段落 after the table | “按电流倒推，宽度就是这么来的：……2 A 正好需要约 0.78 mm，所以电池那一路取 0.8 mm” | UNSOURCED | The net-class widths come from board/QB12_template.kicad_pro (copied by make_all.sh); no script or comment says how they were chosen. The IPC numbers are right (recomputed: 0.78 mm for 2 A @ΔT 10 °C), but “就是这么来的” presents the author's reconstruction as the designer's reasoning. | “按电流倒推，能得到差不多的宽度（脚本没写线宽是怎么定的）：……2 A 约需 0.78 mm，取整就是 0.8 mm。” |
| P4-2 | p4.js “预画并锁定” card | “接地扇出 GND 短线 36 段 + 接地孔 43 个：每个接地焊盘就近打孔下到底层” | OK-but-note | 36 = 32 × 0.4 (pad→via) + 3 × 0.3 (U2/U4 GND pins → EP, no via) + 1 × 0.5 B.Cu spine (route_b.py “GND spine”); 43 = 32 fanout + 11 EP thermal. U1's GND pads are skipped. Same over-generalisation as P0-4. | “……大多数接地焊盘就近打孔；U2、U4 的接地脚直接连到散热焊盘，另有 1 段底层地线‘脊’（route_b.py）” |
| P4-3 | p4 calculator + table + quiz 1 | 0.028 mm², 6.14 mΩ/10 mm, 0.49 mΩ/□, 2.03 A (1.73 A at −20 %), 2 A → 9.6 °C, 56 mV / 112 mW over 45.8 mm, 59 mV real path, 0.74 / 1.00 / 1.23 / 1.45 / 2.03 A, 2 A on 0.2 mm → 94 °C, 225 mV; min gaps 0.181 AIN1/AIN2 (B), 0.182 BIN2/VCP, 0.190 BOOT/LED_STAT, 0.206 VBUS/BAT+; B.Cu longest BAT_SW 37.8 / VBAT_ADC 22.4 / nFAULT 19.9 / VBUS 18.6; avg 1.4 / 4.6 mm; 49 locked = 45 drawn + 4 T-splits; USB 16.7 / 18.6 mm, Δ1.9, 114 ps / 11 ps (εeff ≈ 3.4), critical 61 mm (Altium 2.4 in @4 ns), HS 7.6 mm “按同一判据推算”; router modes 高亮碰撞 / 推挤 / 绕走; 光绘 DSN... | OK | Recomputed with I = 0.048·ΔT^0.44·A^0.725 (A mil², 1 oz = 1.378 mil), ρ = 1.72e-8 Ω·m; S/fc/gaps.py (my 32-segment buffers give 0.182 for AIN1/AIN2 — same within rounding); gt2.py locked list (VSYS 0.8 ×5, VBUS ×5, …); raw/altium_usb.html “2.4 inch critical length (10% limit) … for a 4 ns rise time”; zh.po `'Specctra DSN...' => '光绘 DSN...'`. Note facts §3.2 gives the sheet resistance as 0.48 mΩ/□ [S19]; 0.49 is ρ(20 °C)/35 µm — fine. | — |
| P4-4 | p4.html 间距 note | “两根不同网络的线最近的地方只有 0.181 mm……比工厂极限宽了 81%” | OK-but-note | True for track-to-track. The tightest copper gap on the board is 0.150 mm (J1 pads A5/B5/B8/B4A9 ↔ F.Cu GND pour; S/fc/gaps.py “F any copper min”), set by J1's local clearance floored at the 0.15 constraint. Worth one clause so it matches p6 (“tightest gap 0.150 J1-pour”). | 加一句：“（线和铺铜之间最窄的是 J1 焊盘到 GND 铺铜，0.15 mm，第 6 课）” |

## p5 过孔与铺铜  (checked against _preview.html built 06:50 — integrator had already fixed the predef_sizes / zones_unfilled captions)

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P5-1 | p5 实心还是花焊盘, first paragraph + widget “▶ 进回流炉” | “但进回流炉时，整块板一起被热风加热，铺铜自己也是热的，两种接法差不多同时化锡” | MISLEADING (contradicts p2) | p2 2.4 立碑 card says, correctly, that in reflow a small R/C whose one pad sits on a big copper area heats unevenly and tombstones (“一头的焊盘接着大片铜，热被铜吸走……嘉立创建议……花焊盘 [S24]”). A solid-connected pad still lags in reflow because of the pour's thermal mass; the difference is smaller than with a soldering iron, not absent. QB12 has 24 two-pin parts (14 C, 9 R, LED3) with one pad on GND, solid to the pour. | “进回流炉时整块板一起加热，差别比烙铁小得多；但小阻容一头接整片铜、一头接细线时，两头化锡仍有先后，这就是第 2 课的立碑。” |
| P5-2 | p5 same section, “QB12 两层铺地都设成了实心…理由有三条：一……二……三……” | presented as QB12's reasons | UNSOURCED | route_b.py only has `z.SetPadConnection(pcbnew.ZONE_CONNECTION_FULL)`, no comment. Lead notes: “‘solid because machine assembled’ is reasoning”. | “脚本里只写了实心连接，没写理由。可以这样理解：一，……” |
| P5-3 | p5 焊盘连接 KiCad howto | “不够 DRC 会报“Thermal relief connection to zone incomplete”” | OK-but-note | In the 8.0.9 Chinese UI the message reads “缓释热焊盘 (花焊盘) 与域的连接不完整” (zh.po). Not covered by kicad_shots.md. | “……DRC 会报“缓释热焊盘 (花焊盘) 与域的连接不完整”（Thermal relief connection to zone incomplete）” |
| P5-4 | p5 天线禁布区 card | “铜会挡住、吸收电磁波，天线下面有铜，蓝牙距离就会变短” | OK-but-note | Same as P0-3. | same fix as P0-3 |
| P5-5 | p5 numbers / UI | via ring 0.15 / 0.20; barrel ≈ 0.48 mm trace (π·0.3·0.018 / 0.035 = 0.485); JLC 0.15/0.25/+0.1, 推荐 0.2/+0.15, no surcharge; 28 signal vias in 12 nets (21 small + 7 big; FR 25 + script 3); big vias VBUS 3 / VSYS 2 / BAT+ 2; 149 GND all 0.6/0.3; 217 mask openings = 217 pads, 11 vias exposed in EP openings, 166 tented; 45 B.Cu non-GND segs, 12 nets, 207.4 mm; zone outline 55.4 × 37.4 at 0.3 mm; unfilled → 154 unrouted; 7 stitch vias at y 9.0 (1.6 mm below keepout); zone defaults 0.5 / 0.25 / always, thermal 0.5 / 0.5, min spokes 2; 隐藏除当前工作层的所有层, 通过网自动更新, 连接到域的焊盘, 创建阵列 (Ctrl+T); λ/20 3.4–6.2 mm vs 2.5 mm grid | OK | pcbnew: `GetUnconnectedCount(True)` after `UnFill()` = 154; via list; facts §1.1 [S01][S03], §6.3 [S34], §8.8 [S24]; zh.po. | — |

## p6 检查：DRC 与 3D  (checked against _preview.html 06:50)

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P6-1 | p6.js RULES 丝印字高 text + checklist “约束页的规则和工厂能力对过” | “这是 QB12 唯一一项规则比工厂建议还松的”；“只有字高 0.8 mm 比工厂建议松” | OK-but-note | 孔到孔 rule 0.25 < JLC “Pad Hole-to-Hole Spacing 0.45mm” (raw/jlccap.txt:247-248) — p6's own h2h row quotes both; the board's tightest pair is a U2 footprint hole (a PTH *pad* “17”, Ø0.3) ↔ script thermal via, 0.407 mm edge-to-edge (S/fc hole scan). Also 铜到板边 0.3 is not “> 0.3” (p6's own edge row says so). | “字高是唯一一项明显比工厂建议松的；孔到孔 0.25 mm 只够过孔（插件孔 JLC 要 0.45 mm，QB12 的插件孔离得远，U2 焊盘里的小孔和过孔隔 0.41 mm，同一网络、同一块焊盘）；铜到板边刚好 0.3 mm。” |
| P6-2 | p6 kicad_3d_top caption | “工程里没指定阻焊颜色，3D 查看器就画成绿色” | OK-but-note | kicad_shots.md (kicad_3d_top): 外观 panel shows “使用电路板叠层颜色 ☐”. With that unchecked the 3D viewer uses its own colour settings whatever the stackup says; the stated cause is a guess. | “3D 查看器默认用自己的配色（右边‘使用电路板叠层颜色’没勾），所以画成绿色。” |
| P6-3 | p6 3D item 1/2 + checklist vs p3 3.4 | p6 “USB-C 伸出 0.65 mm，开关伸出 0.95 mm” vs p3 “J1 伸出下边 0.7 mm，SW1 伸出左边 1.0 mm” | OK-but-note | Both right on their own basis: p6 = 3D model bbox (.wrl, p6_notes MEAS), p3 = courtyard (gt2.py J1 y_max 38.74, SW1 x_min −0.98). A reader sees two numbers for the same thing. | p6 加“（按 3D 模型量；按元件外框是 0.7 / 1.0 mm，第 3 课）” |
| P6-4 | p6 6.5 height slider default | default “外壳内 5 mm … 放不下：J2 5.61 mm…” | OK-but-note | 5 mm is an arbitrary start value; the boat model's bay prism is z 32.5 → 45 mm (boat3d/build_model.py:150), i.e. ~12.5 mm deep. A first-time reader may conclude QB12 doesn't fit its own boat. | 默认值改成船舱实际深度，或状态文字先写“拖到你量出来的高度”而不是先判“放不下”。 |
| P6-5 | p6 numbers | 180 = 87 + 51 + 38 + 4 (bare run) / 132 = 87 + 38 + 4 + 3 (zip, SW1 J1 U2); 87 = 55 ref-on-line + 31 line-line + 1 text-text (“+” vs “BATTERY 1S”); 38 = 37 Ø0.06 circles + “USB-C 5V”; 4 edge = SW1 ×2, J1 ×2; tightest copper 0.15 (J1 B4A9 ↔ pour), pad-pad 0.20, AIN1/AIN2 0.18; edge 0.30 / 0.32 / 0.45; 0 schematic parity because no schematic & no `--schematic-parity`; heights 5.61 / 3.25 / 3.11; zh UI strings 排除此违规 / 忽略所有 '…' 违规 / 检查 PCB 和原理图是否一致 / 违规严重级别 / 将当前视图导出为 PNG... | OK | S/fc/drc1 + kzdrc.json (kicad-cli on bare board and on delivered zip), DRC JSON item parsing, gaps.py, edge.py, drc.sh (no parity flag), zh.po. | — |

## p8 下单与到货  (checked against _preview.html 06:50; p8.js was edited again 06:49 — re-grep before applying)

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P8-1 | p8 “包裹里有什么” → 你自己准备的 | “1 节 1S 锂电池，插头的正负要和背面丝印的 + − 对上” | MISLEADING (safety omission) | QB12 has no battery protection: netlist.py has only TP4056 (charger) + Q2 switch, no over-discharge / short-circuit / over-current cut-off. The delivered BOM states it: make_bom.py → QB12_BOM.xlsx “电池选「带保护板」的 1S 3.7V 锂电池（PH2.0 插头），板上不再做电池保护。” The circuit course 3.x says the same (“要买‘带保护板’的 1S 电池”). p8 never mentions it (grep 保护板 in p8.* → 0 hits). | “1 节**带保护板**的 1S 锂电池（PH2.0 插头）：板上只有充电芯片，没有过放、短路保护，这些全靠电池自带的保护板（QB12_BOM.xlsx 里也写了）。插头的正负要和背面丝印的 + − 对上。” |
| P8-2 | p8 到货清单 “接电池” | “先看清电池插头……红线要对着背面丝印的 +……拿不准就用万用表量插头” | OK-but-note | Advice is correct and important. Worth saying what happens if reversed: BAT+ goes straight to TP4056 pin 5 (netlist U4.5 = BAT+); ds/tp.txt:67 ABSOLUTE MAXIMUM “BAT：-0.3V～…”, and there is no reverse-polarity protection on the board (inference from netlist.py, not stated in the scripts). | 加一句：“板上没有防反接，电池插反会直接加在 TP4056 的 BAT 脚上（手册允许最低 −0.3 V），可能烧掉它。” |
| P8-3 | p8 同一处 “你自己准备的” | list omits the motor capacitors | OK-but-note | QB12_BOM.xlsx note: “电机两端各焊一颗 0.1µF 瓷片电容（不在 BOM 里，焊在电机上）”; circuit course 8.x and its 9.4 step 11 rely on them (“一加速就重启：……电机上的 0.1µF 电容”). | 在“2 个电机”后加：“（每个电机两端焊一颗 0.1 µF 瓷片电容，不在 BOM 里，电路课第 8 课）” |
| P8-4 | p8 numbers & procedure | zip 79 KB, 9 + 2 files, X2 → RS-274X re-export with identical graphics; 5 pcs; 1.6 mm (0.8–1.6 economic), 1 oz, 2 oz needs 0.16; 客编 / JLCJLCJLCJLC May 2026; economic vs standard table; 25 rows / 16 + 9 kinds / 39 + 12 parts; 51 = BOM qty = CPL rows; filter options drop SW1 / J1 SW1 U2; 205 pads → 1025 joints for 5; payment-first for SMT; DHL 3–5 / 15–25 days; probe points C1 / C9 / C4 / C2; VBUS: 12 pads on 10 parts, R13 ∥ (R17 + R18) = 9.5 kΩ, 10 µF; BAT+ reads ~100 kΩ with SW1 ON (R14 via SW1 pin 1 = GND); 180° rotation of U4 maps pin 3 → CHRG pad, pin 5 → GND pad; USBLC6 180° → GND pin on VBUS pad; ` / ~ highlight hotkeys; 检查 → 显示电路板统计信息 | OK | Old zip (.bak) has `%TF.` lines, new has none; non-attribute content of all 9 Gerbers md5-identical (S/fc/gz vs gzold); kicad-cli pos filters; netlist.py SW1 pins (1 ON = GND, 2 COM = PWR_EN_N); raw/hk8.txt:64 `Highlight Net|\``, :16 `Clear Net Highlighting|~`; facts §4.1–4.6 [S04][S05][S07][S14][S15]. Safety sequence (look → resistance unpowered → USB only with current limit → battery with SW1 OFF → motors without propeller) is sound for a beginner. | — |

## p7 出生产文件  (checked last, against _preview.html 06:50 = p7.html 06:48 / p7.js 06:44)

| id | where | claim as shown | verdict | evidence | suggested fix |
|---|---|---|---|---|---|
| P7-1 | p7.js:646 (POLAR from p7.js:42 = all non-R/C) “逐个看有方向的 18 个：… SW1、SW2、SW3 …” vs p8.html 8.5 #p8-npolar (POLAR from p8.js:28 = led/d/ic) “要逐个核对的有 16 个元件” | 18 vs 16 | MISLEADING (cross-lesson contradiction) | The two extra are SW2/SW3 (kind 'sw'). build_board.py pad_map: `if ref in ("SW2", "SW3"):  # 对角两脚，不管内部怎么配对都成立` — the circuit only uses diagonal pads 1 & 4, so any rotation of these 4-pad tact switches is electrically fine. 16 = U1–U5, Q1–Q2, D1, LED1–3, J1–J4, SW1. | p7 改成 16 个（去掉 SW2、SW3），并加一句“SW2、SW3 只用对角的两个脚，怎么转都通”；或 p8 也改 18，两课一致。剩下“33 个电阻和陶瓷电容”同步改成 35 个两端对称的件（33 阻容 + SW2、SW3）。 |
| P7-2 | p7.html 7.5 KiCad howto “先设原点” | “（QB12 的 finalize.py 把栅格原点也放在了这一点，放置 → 栅格原点 可以做同样的事）” | OK-but-note | Exports use the drill/place (aux) origin only (`--use-drill-file-origin`, `--drill-origin plot`); the grid origin does not affect them. “可以做同样的事” can be read as “the grid origin works too”. Also p3 tells readers to put the grid origin at the *top-left* (P3-1) — the two lessons should agree. | “（finalize.py 顺手把栅格原点也放在这一点，只是让屏幕上的栅格对齐；导出只认钻孔/定位原点，栅格原点不影响生产文件。）” |
| P7-3 | p7.html 7.6 “那 QB12 为什么没用插件？” | “因为整块板都是脚本做的……” | UNSOURCED (minor) | No script or note gives the reason; plausible inference. | 句首加“多半是因为”或“（推测）”。 |
| P7-4 | p7 numbers & settings | zip 80,774 B / 325,267 B unpacked, 11 files; F_Cu 135,693 B; excerpt lines (ADD10 R 0.806×0.864, ADD45 C 0.3, R17 pad X31850000Y9800000 = (31.85, 9.8), 3V3 segment 24.55→26.8877 @ y 19.0692); NPTH.drl full text 22 lines; drill table T1 0.3 ×170 (102 + 32 + 21 + 11 + 4), T2 0.3 ×4 (U2), T3 0.4 ×7, T4 0.8 ×4 slots G85, NPTH 0.6 ×2 / 0.9 ×2; 8 + 4 + 177 in drill dialog; Mid Y = 38 − y (U1 21.2, J1 4.4); anchor offsets U1 0.15 / SW1 0.21; export_jlc.sh lines 8–14 / 22–24 quoted verbatim; kicad-cli defaults (Protel ext on unless `--no-protel-ext`, precision 6, oval alternate, zeros decimal); X2 re-export: 9 Gerbers identical except attribute lines, drills identical except date lines; FT BOM columns; 生成物料清单... / 添加字段 / 打开 Zip 归档文件... | OK | S/fc/gz vs gzold diff; `grep -n` on QB12-F_Cu.gtl lines 23/128/156/616-617; kicad-cli --help; pcbnew anchor-vs-pad-bbox scan (SW1 0.206, U1 0.150, J1 0.125); export_jlc.sh; facts §4.4, §5.1–5.5 [S08][S09][S11][S13][S36]; zh.po. | — |

---

## Fact-check fixes applied (integrator, 2026-10-19 ~07:30 UTC)

Evidence re-verified before editing: make_bom.py lines 44–45 (保护板 / 0.1µF notes), netlist U4.5 = BAT+, ds/tp.txt BAT abs max −0.3 V, no protection IC in the BOM; U2 EP paste 1.918 mm vs holes at ±0.5 mm (board.json); build_board.py pre_via ×3 (VBUS ×2, BAT_SW); finalize.py SetGridOrigin(0, BH); zh.po 显示原点 / 原点和轴 / 缓释热焊盘 (花焊盘) 与域的连接不完整; closest hole pair 0.407 mm U2.17 PTH ↔ thermal via (same net); facts §8.6 (144 V per trace, 31.2 → 319.2 V); LDO ±1 %（原 ME6211；现 AP2112K 为 ±1.5 %）.

| id | file | change |
|---|---|---|
| P8-1 | p8.js pack-diy | battery must be **带保护板** (board has no over-discharge / short protection; BOM note) |
| P8-2 | p8.js pack-diy + arrival step 接电池 | no reverse-polarity protection; reversed battery hits TP4056 BAT (abs max −0.3 V) |
| P8-3 | p8.js pack-diy + arrival step 接电机 | 0.1 µF ceramic cap across each motor, not in BOM (电路课第 8 课) |
| P2-1 | p2.js MODS[U2 holes], 2.7 焊盘属性 tab, quiz 2 | holes' own paste layer removed, but EP opening (computed 1.92 mm) still covers them (computed 0.5 mm off centre) → solder can flow in; JLC via-in-pad note [S07] |
| P2-2 | p2.js MODS[J1] | 0.1 mm override has no stated reason; 0.15 mm constraint is the hard floor (from D.rules) |
| P2-3 | p2.js galPinsTable | rows grouped by number + net + type + size → U2 17 shows SMD EP and ×4 PTH separately |
| P7-1 | p7.js POLAR / rot-check | 16 parts (excl. SW2/SW3, kind 'sw'), same as p8; sentence that SW2/SW3 use diagonal pads |
| P7-2 | p7.html 7.5 howto | grid origin only aligns the grid; exports use the drill/place origin |
| P7-3 | p7.html 7.6 | “脚本里没写原因，多半是因为……” |
| P3-1 | p3.html 3.5 ③ | also set 偏好设置 → PCB 编辑器 → 原点和轴 → 显示原点 = 栅格原点; QB12 file has grid origin bottom-left (finalize.py, link to p7) |
| P3-2 | p3.js 3.2 slider + table | JLC wants traces **and components** > 0.3 mm; 0.30 now shows “warn: 刚好压线”, J1/SW1 overhang noted; 0.35 → good; table row “走线和元件 > 0.3 mm”; tools/test_p3.py expectation updated |
| P3-3 | p3.js PICK.U5.why | 144 V adds to the clamp voltage (ST example: ~31 V → 300+ V), not “来不及” |
| P5-1 | p5.html 5.5 para + p5.js reflow status | reflow difference much smaller than with an iron but not zero → tombstoning (link 第 2 课) |
| P5-2 | p5.js htxt1, quiz 3 | “脚本只写了实心，没写理由；可以这样理解” / “按常理推” |
| P5-3 | p5.html howto | zh DRC message 缓释热焊盘 (花焊盘) 与域的连接不完整 (+ English) |
| P5-4, P0-3 | p5.js antenna card, p0.js stop 3, p0.html quiz 2 | antenna shared by Wi‑Fi/BLE; copper detunes / reflects (no “吸收”) |
| P0-1 | p0.js stop J1 | no “所以”; override 0.1 has no stated reason; 0.15 floor applies |
| P0-2 | p0.js step 9 facts | 3V3 ≈ 3.3 V（3.27–3.33 V 都正常） |
| P0-4 | p0.js quiz 3 | 大多数接地贴片焊盘（U1、U2/U4 接地脚除外） |
| P0-5 | p0.js bar tooltip | “预画走线用的 3（VBUS 2、BAT_SW 1）” instead of 预留 |
| P0-6 | p0.js 0.5 card 6 | “180 条警告（打开交付的工程是 132 条）” |
| P1-1 | p1.js B.Mask item | 12 openings incl. U2's 4 footprint holes (count computed) |
| P1-3 | p1.js rec table | “JLC 没写多细才算‘很密’，这里按 USB-C 从稳” (OSP line not added) |
| P4-1 | p4.html 4.2 | widths “能推回去”, script doesn't say how they were chosen; 0.78 → 取整 0.8 |
| P4-2 | p4.js locked card | 大多数接地焊盘就近打孔; U2/U4 GND pins → EP; 1 B.Cu GND spine |
| P4-4 | p4.html 4.3 | tightest copper gap is J1 pad ↔ GND pour 0.15 mm (link 第 6 课) |
| P6-1 | p6.js text row, h2h row, checklist | 字高 = the one clearly looser rule; 孔到孔 0.25 only covers vias, U2 footprint holes ↔ via 0.41 mm (same pad / net); edge exactly 0.3 |
| P6-2 | p6.html 3D caption | green because “使用电路板叠层颜色” is unchecked |
| P6-3 | p6.js checklist conn | adds courtyard numbers 0.7 / 1.0 mm (computed) next to the 3D-model ones |
| P6-4 | p6.js height slider | neutral “先拖到你量出来的高度” until the reader moves it |

Not changed: P1-3 optional OSP sentence; P5-5, P0-7, P1-2, P2-4, P3-4, P4-3, P6-5, P7-4, P8-4 (OK rows).

Also changed by the integrator outside this table (found while integrating): p5.js / p7.js said all 177 vias are tented — corrected to “none has its own opening; 11 thermal vias inside the U2/U4 EP openings are exposed on top” (matches p1 and board.json).
