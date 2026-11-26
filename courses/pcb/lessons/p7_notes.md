# 第 7 课 出生产文件 — notes for video makers and the fact-checker

Files: `lessons/p7.html`, `p7.css`, `p7.js`, `tools/test_p7.py`. No new assets (uses kicad_plot_gerber, kicad_drill, kicad_pos, kicad_gerbview).
All numbers are computed in `p7.js` from `QB.board` (mainly `fab`, `stats`, `footprints[].pads`, `vias`, `drc`). Values below are what the page shows today.
Abbreviation: `F` = `QB.board.fab`, `S` = `QB.board.stats`.

**2026-10-20 按 KiCad 10.0.6 更新**：交付的 Gerber/钻孔改由 KiCad 10.0.6 导出（10-20 版，zip 78 408 字节）；export_jlc.sh 行号变成 9–15 / 23–25（第 4 行加了 `source tools/kicad_env.sh`，命令改用 `"$KCLI"`）；7.2/7.3/7.5 的对话框步骤按 `facts_kicad10.md` §5 改成 10.0.6 的界面名（过孔盖油挪到 电路板配置 → 阻焊/锡膏；绘制前检查填充区填充内容；对椭圆孔使用备选钻孔模式 / 单位: / 零点: / 原点: / 生成映射: / 生成；生成包含正面和背面定位的单个文件 / 生成坐标文件）。4 张截图（kicad_plot_gerber / kicad_drill / kicad_pos / kicad_gerbview）还是 8.0.9 的，图注暂未改。

## Sections

| § | title | content |
|---|---|---|
| 7.1 | 工厂要的不是 .kicad_pcb，是一叠“图”和“表” | why: each machine needs one picture or one list. Readout tiles + file→station widget |
| 7.2 | Gerber：一层一张胶片 | what Gerber is; 11-file film browser; annotated excerpt of the real QB12-F_Cu.gtl; howto + kicad_plot_gerber; tip: screenshots use absolute origin, QB12 used aux origin |
| 7.3 | 钻孔文件：两张孔表 | Excellon, PTH vs NPTH, slots; tool table ↔ drill viewer; full text of the real QB12-NPTH.drl (clickable coordinates); howto + kicad_drill |
| 7.4 | BOM 和坐标文件：买什么、贴在哪 | real BOM (25 rows) and CPL (51 rows) tables ↔ viewer; column meanings; 5 consistency checks; howto (BOM from schematic; QB12 from make_bom.py) |
| 7.5 | 坐标：原点在左下，Y 朝上 | click-a-part coordinate widget (aux vs absolute origin); rotation widget (library 0° → board, optional “JLC differs by 90°” illustration); what to check on the order page; howto + kicad_pos + the two filter traps |
| 7.6 | 导出设置：JLC 要什么，QB12 的脚本做了什么 | export_jlc.sh lines 9–15 + 23–25 with clickable flags ↔ 16 setting cards (✓/⚠/○); X2 warning tip; Fabrication Toolkit card + LCSC-field sentence; why QB12 used scripts |
| 7.7 | 上传前：把 zip 打开看一遍 | 6-item checklist driving a viewer; howto GerbView + JLC viewer + JLCDFM + kicad_gerbview |
| 7.8 | 自测三题 | PTH/NPTH; J1 Mid Y; U2 looks rotated in preview. Each has a “show” button |
| 下一课 | .next card → #p8 |

## Widgets and their states

1. **7.1 file → station** (`#p7-fl-*`). 13 chips (11 files in the zip from `F.gerbers` + BOM + CPL) and 12 stations: CAM 审核, 钻孔, 沉铜·电镀, 线路成像·蚀刻, AOI, 阻焊, 字符, 成型 (PCB) | 钢网·刷锡膏, 备料·上料, 贴片机, 回流焊 (SMT).
   Click file → stations using it light up, card shows type / stations / size. Click station → its files light up, card explains the step.
   Mapping: Gerber+drill → CAM; PTH+NPTH → 钻孔; PTH → 沉铜电镀; F/B_Cu → 蚀刻, AOI; F/B_Mask → 阻焊; F/B_Silkscreen → 字符; Edge_Cuts → 成型; F/B_Paste → 钢网; BOM → 备料; CPL+BOM → 贴片机; 回流焊 → no file.
   “▶ 按工序走一遍” steps through all 12 stations, 1.7 s each. On ≤ 900 px the card sits above the station grid.
2. **7.2 Gerber film browser** (`#p7-gbv`, film mode, one layer at a time). 11 buttons with size bars. Default: F_Cu.
   Per file the card shows layer, what black / blank mean, which station, bytes, and a note:
   - F_Cu: black = copper kept. Note: 345 top tracks (`S.tracks_F`), 205 SMD pads (`S.smd_pads`), 1212 mm² GND pour (`S.gnd_area`), the largest file.
   - B_Cu: 46 tracks, 1724 mm² pour; every layer is drawn as seen from the top, so it is left–right reversed vs. the flipped board.
   - F_Mask: black = opening. 217 openings = 205 SMD pads + 12 hole pads (pads with `mask` incl. F); 0 of 177 vias opened (tented).
   - B_Mask: 12 openings (J1 shell legs 4, U2 thermal-pad holes 4, J1 + SW1 locating holes 4).
   - F_Silkscreen: 48 refs printed, 3 hidden (`S.refs_hidden` = LED2, Q1, SW1); “subtract soldermask” clips strokes on pads.
   - B_Silkscreen: 14 back texts (`texts[]`), mirrored on the film; “JLCJLCJLCJLC” = order-number position placed by finalize.py, deferred to L8.
   - F_Paste: 209 apertures (pads with `paste`); U2/U4 thermal pads: `pasteRatio` −0.15 → 70 % side, ≈ 49 % area.
   - B_Paste: empty (485 bytes in the 10-20 KiCad 10 file, header only); JLC tutorial still ticks it [S11].
   - Edge_Cuts: 56 × 38 mm, R2, 4 lines + 4 arcs (checked in the real .gm1), `.gm1` extension.
   - PTH: 185 holes, 177 vias, 4 slots; hollow circles are NPTH (viewer draws both). NPTH: only the 4 NPTH holes (drawn by the lesson as annotations) with orange rings.
   Dashed grey outline in every film = board position, reference only.
3. **7.2 annotated F_Cu excerpt** (verbatim lines of QB12-F_Cu.gtl) with a version toggle: “10-13 第一版（带 X2）” (default; from `../../hardware/pcb/jlc/QB12_Gerber_X2旧版_1013.zip.bak`) and “10-20 交付版（KiCad 10，无 X2）” (the current file, KiCad 10.0.6: %TF lines become `G04 #@! TF…*` comments, %TO lines gone; KiCad 10 renumbered the apertures — 0.806×0.864 is D15 (was D10), 0.3 mm circle is D46 (was D45); all 44 aperture shapes and every flash/draw outside regions are the same set as the 8.0.9 export, only order differs; pours refilled). Until 10-20 v2 was the 10-19 KiCad 8.0.9 file. Lines: %TF X2 attributes, %FSLAX46Y46*%, %MOMM*%, %ADD10R,0.806000X0.864000*% (0603 resistor pad), %ADD45C,0.300000*%, D10*, %TO.P,R17,1*% / %TO.N,VBUS*% (X2 netlist attributes, shown yellow), X31850000Y9800000D03* (R17 pad 1 at (31.85, 9.8) aux = board (31.85, 28.2)), D02/D01 track, G36/G37 region, M02*.
4. **7.3 drill table ↔ viewer** (`#p7-drv`). Rows from `F.pth` + `F.npth`: PTH T1 0.30 ×170 (vias 0.6/0.3: stitch 102, fanout 32, signal 21, thermal 11, module 4), T2 0.30 ×4 (U2 thermal-pad holes), T3 0.40 ×7 (vias 0.8/0.4, signal 7), T4 0.80 ×4, 4 slots (J1 shell legs); NPTH T1 0.60 ×2 (J1 pegs), T2 0.90 ×2 (SW1 pegs). Holes are matched in JS (vias by drill, pads by type + min drill) and the counts equal the table. Sum 185 + 4 = 189 = `S.holes` ✓.
   Row click → orange rings on those holes, zoom (all if > 20 holes). Toggle “只看钻孔胶片 / 叠上铜层”.
5. **7.3 NPTH.drl full text** (22 verbatim lines). Click a coordinate line → ring + zoom on that hole; text converts e.g. X1.85Y15.9 → (1.85, 38 − 15.9 = 22.1) → SW1 locating hole 0.9 mm.
6. **7.4 BOM / CPL tables ↔ viewer** (`#p7-bmv`). Tabs BOM (25 rows, `F.bom_header`) / CPL (51 rows, `F.cpl_header`). BOM row → parts glow, CPL tab filtered to those refs (“显示全部” resets). CPL row → part selected + zoom, badge shows the CSV row. Clicking a part on the board marks its row. Checks: BOM qty 51 = 51 footprints ✓; refs unique 51/51 ✓; BOM ↔ CPL refs 51/51 ✓; BOM LCSC = footprint `lcsc` 51/51 ✓; 51 Top ✓. Viewer column is sticky on desktop, above the table on phone.
7. **7.5 coordinate widget** (`#p7-cov`). Click any part (or quick picks U1 J1 SW1 U2 R9 LED3). Aux mode: axes from (0, 38), dashed Mid X / Mid Y, card: board-local (x, y), KiCad internal (100 + x, 100 + y), Mid X = x, Mid Y = 38 − y, rotation mod 360, the real CPL row and “一字不差 ✓” (string compare with `F.cpl`). Absolute mode: PosX = 100 + x, PosY = −(100 + y) (e.g. J1 126.500 / −133.600, U1 144.000 / −116.800 — verified with kicad-cli in scratch). Note: anchor vs pad-centre distance; max over 51 parts = SW1 0.21 mm.
8. **7.5 rotation widget** (`#p7-rot`, own SVG from real pads). Panel ① library 0° (board pads rotated back by the KiCad angle), panel ② as placed; “▶” animates 0 → KiCad angle (1.3 s). Yellow pad = pad 1 (J1: A1B12) or, for diodes / LEDs, the cathode (pad whose net ≠ anode net, same convention as the viewer). Toggle “假设 JLC 的 0° 差 90°（示意）” adds a dashed outline rotated 90° more — labelled 示意; no per-part offsets claimed. Picks: the 18 non-R/C parts. Default U2 (KiCad −90 → CPL 270).
9. **7.6 script ↔ cards**. Clickable flags in export_jlc.sh (10-20 version, lines 9–15, commands shown verbatim as `"$KCLI" pcb export …`): --layers, --subtract-soldermask, --no-x2, --no-netlist, --use-drill-file-origin / --drill-origin plot, --format excellon / --excellon-units mm, --excellon-separate-th, --generate-map --map-format gerberx2, the zip filter, pos flags, Python CPL writer, plus a marked course note listing kicad-cli defaults. 16 cards; “✓ 已改” on X2 and netlist attributes (“第一版没写 --no-x2（带 X2）；10-19 已加上重导”), ○ on drill map. The X2 tip tells the history: first version 10-13 had X2, re-exported 10-19 with the same geometry; current zip size from `F.zip_bytes` (78 408 since the 10-20 KiCad 10 export; was 80 774).
10. **7.7 checklist** (`#p7-ckv`): 1 size/layers (made mode, badge 56 × 38 mm · 2 层), 2 Edge.Cuts film, 3 drill on copper zoomed to J1, 4 F.Mask film with grey via circles (none opened), 5 F.SilkS + F.Mask on the motor region, 6 F.Paste zoomed on U2 with the pad outline dashed. Each click ticks the item; all 6 → status (reminds to re-export without X2 first).
11. **Quiz buttons**: 1 → drill viewer shows the 4 NPTH holes; 2 → coordinate widget on J1; 3 → rotation widget on U2, animated.

## Real-file facts used (all read on 2026-10-19; 2026-10-20 KiCad 10 re-check below)

- 2026-10-20: `outputs/QB12/QB12_Gerber.zip` = 78 408 bytes, 11 files, 321 312 bytes unpacked; F_Cu header `G04 #@! TF.GenerationSoftware,KiCad,Pcbnew,10.0.6*`; NPTH.drl header `; DRILL file KiCad 10.0.6 date 2026-10-20T19:00:04` / `; #@! TF.GenerationSoftware,Kicad,Pcbnew,10.0.6`, still 22 lines, same holes; PTH.drl still 4 G85 slots. kicad-cli 10.0.6 `--help`: defaults unchanged (Protel on, precision 6, oval alternate, zeros decimal, drill units mm); gerbers has no tenting flag — tenting comes from the board (`(tenting (front yes) (back yes))` in out/QB12.kicad_pcb). The bullets below are the 8.0.9-era facts.

- `/mnt/user-data/outputs/QB12/QB12_Gerber.zip` = `pcb/jlc/QB12_Gerber.zip` (same md5; re-exported by the lead 2026-10-19 06:19 UTC with `--no-x2 --no-netlist`, 80 774 bytes), 11 files, sizes = `F.gerbers`; `F.gerber_format` describes the change. NPTH.drl text on the page is the 10-19 file (only the two date lines differ from 10-13). Job file and drill maps are generated but filtered out of the zip (export_jlc.sh line 13).
- export_jlc.sh lines 8–14: kicad-cli 8.0.9 gerbers / drill / pos with the flags quoted on the page; lines 15–26 rename .pos columns to Designator, Mid X, Mid Y, Layer, Rotation, add “mm”, Layer Top, Rot % 360.
- kicad-cli 8.0.9 defaults (from `--help`): Protel extensions on unless `--no-protel-ext`; X2 on unless `--no-x2`; netlist attributes on unless `--no-netlist`; precision 6; drill oval format alternate; zeros decimal; pos units default inch (script passes mm).
- **History: the first delivered Gerbers (10-13) contained X2 attributes** (%TF/%TA/%TD lines; F_Cu has 574 such lines, incl. %TO netlist attributes). Re-export in scratch (`p7tmp/x/`): default flags reproduce the delivered files byte-for-byte except dates; adding `--no-x2 --no-netlist` leaves every image command identical (diff = 0 after stripping attribute/comment lines), only attributes become G04 comments or vanish.
- Vias tented: F_Mask has 217 flashes = all pad openings, none for vias.
- `kicad-cli pcb export pos --smd-only` drops SW1; `--exclude-fp-th` drops J1, SW1, U2 (tested in scratch).
- Aux origin: `(aux_axis_origin 100 138)` = board-local (0, 38), set by finalize.py (`SetAuxOrigin(P(0, BH))`, grid origin too). The stored plot params in the KiCad file are KiCad defaults (`useauxorigin no`, X2 yes, Protel no) — the script's flags override them.
- BOM: `make_bom.py` groups `netlist.py` PARTS by (value, lcsc, fp); CSV header `Comment,Designator,Footprint,Quantity,LCSC Part #`, UTF-8 BOM, CRLF.
- KiCad screenshots (lead's catalog `assets/kicad_shots.md`): dialogs were set to JLC tutorial values with **absolute** origin; QB12's real export used the aux origin. Said in a tip under the Gerber screenshot and in each caption. Drill dialog's 孔数量 (金属化焊盘 8, 非金属化焊盘 4, 通孔 177) matches J1 + U2 holes, NPTH and vias.

## External facts (facts.md)

- Factory steps and what each needs: CAM, drilling with aluminium entry sheet, desmear + electroless Cu, imaging (film → LDI since 2025-06), etching, AOI uses Gerber as reference, mask, legend, routing ±0.2 mm, e-test only finds deviations from the design — §2 [S21][S22][S02][S01].
- NPTH: dry-film tenting, 0.2 mm copper removed around the hole — §1.1 [S01][S03].
- Silk ≥ 0.15 mm, height ≥ 1 mm — §1.1/§10.10 [S01][S03]; copper to edge ≥ 0.2 mm (routing) — [S01].
- Basic parts stay on feeders, extended need manual loading with a per-type fee (amount not stated) — §4.2 [S06].
- BOM required columns Comment, Designator, Footprint; refs upper-cased; sample header with JLCPCB Part # (optional); course uses `LCSC Part #` — §4.4 [S08][S09][S13].
- CPL columns Designator, Mid X, Mid Y, Layer, Rotation, mm, sample has “mm” suffix and Top/Bottom — §4.4 [S10][S13].
- Rotation: your 0° may differ from JLC's; only rule: library 0° = tape orientation; red dot is a direction mark, not pin 1; diode “+” anode “−” cathode; silkscreen wins on conflict; engineers fix by silkscreen; unconfirmed parts are not placed — §4.5 [S07].
- KiCad .pos exports the footprint anchor, flips Y; Ref/PosX/PosY/Rot/Side renamed — §5.4 [S34][S13].
- Gerber export settings (9 layers; plot refdes, footprint text, check zone fills, tent vias, Protel extensions, subtract soldermask; no X2, no netlist attrs, no job file; 4.6 mm) and DRC before export — §5.1 [S11]; 嘉立创 accepts only RS-274-X, not X2 — §1.1/§5.1 [S03].
- Drill: Excellon, no mirror, no minimal header, PTH/NPTH separate, alternate oval mode, mm, decimal; drill map highly recommended — §5.2 [S11][S30].
- Origin: Gerber / drill / CPL must share one origin; JLC tutorial = absolute; QB12 = aux — §5.3 [S30][S33][S53].
- Fabrication Toolkit: in the official PCM, toolbar button, one click → Gerber zip, bom.csv (Designator, Footprint, Quantity, Value, LCSC Part #), positions.csv, automatic rotation corrections; recognises LCSC Part #, LCSC PN, … — §4.4/§5.5 [S12][S13][S36][S37].
- Upload: size and layer count detected automatically, Gerber Viewer; JLCDFM free, 5 modules — §4.7 [S15][S26]. JLC tutorial checklist for the viewer (outline closed, slots, drills aligned, vias tented, silk) — §4.7 [S11].
- Menu names (8.0.9 zh_CN, also checked against the installed kicad.mo): 文件 → 制造输出 → Gerbers (.gbr)... / 钻孔文件 (.drl)... / 元件定位文件 (.pos, .gbr)...; 放置 → 钻孔/定位 文件原点; 放置 → 栅格原点; 工具 → 生成物料清单... [S31]; 检查 → 设计规则检查; Gerber 查看器 → 文件 → 打开 Zip 归档文件...; dialog labels (使用 Protel Gerber 文件扩展名, 使用 Gerber X2 格式(推荐), 包含网表特性, 生成 Gerber 作业文件, 过孔盖油, 剔除阻焊开窗中的丝印, 绘制前检查域填充, 最少钻头种类, 合并金属化孔 (PTH) 和非金属化 (NPTH) 到单个文件中, 使用备选钻孔模式, 十进制格式(推荐), 毫米 (mm), 仅包含贴片封装, 排除具有通孔焊盘的所有封装, 独立的电路板文件, 生成定位文件; position dialog title 生成布置文件) — §6 [S33] + `msgunfmt` of the installed 8.0.9 kicad.mo + lead's screenshot catalog.

## Not from facts.md (general format knowledge, flag if the checker wants sources)

- Gerber command meanings in the excerpt (D01 draw, D02 move, D03 flash, G36/G37 region, %FS 4.6, %MO, %AD aperture, M02 end) and Excellon (M48 header, METRIC, TnC tool, % end of header, M30 end).
- “All Gerber layers are drawn as seen from the top, so bottom-layer text is mirrored on the film.”
- “光绘” etymology (photo-plotting films).

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
