# 第 4 课「走线」— notes for video makers and the fact-checker

Files: `lessons/p4.html`, `p4.css`, `p4.js`, tests `tools/test_p4.py`, screenshots `_shots/p4/`.
All QB12 numbers are computed at runtime in `p4.js` from `QB.board` (data/board.json). Values below are what the
page shows today (2026-10-19). External facts cite `facts.md` sections and `[Sxx]` sources.

## Sections
| # | title | what it teaches |
|---|---|---|
| 4.1 | 一根线就是一个小电阻，也是一根发热丝 | R = ρL/A, 35 µm copper, IPC-2221 current vs width, heat and voltage drop |
| 4.2 | 网络类：先给每类网络定好规矩 | QB12's 5 net classes, why each width, what was actually drawn (8 widths) |
| 4.3 | 间距：两根线之间要留多宽的缝 | JLC 0.10 vs rule 0.15 vs class 0.18/0.2, ±20 % width tolerance, narrowest real gaps |
| 4.4 | 两层板：大部分线走顶层，底层留给地 | F.Cu vs B.Cu counts/lengths, why (all SMD on top, bottom = GND plane) → 第 5 课 |
| 4.5 | 自动布线：QB12 的线是怎么来的 | the real pipeline (pre-drawn locked tracks, DSN edits, Freerouting 1.9.0, T-junction split, pour + DRC), what a human checks, Freerouting in KiCad |
| 4.6 | USB 的 D+ / D−：老实说，没按差分对走 | 90 Ω theory, real lengths, why OK at 12 Mbit/s, KiCad diff-pair routing |
| 4.7 | KiCad 里手动布线：X、W、V | router modes (示意 animation), hotkeys, width priority |
| 4.8 | 自测三题 + `.next` → #p5 | |

## Widgets (and what the viewer shows at each step)
1. **4.1 线宽计算器** (`#p4-wsvg`, slider `#p4-w` 0.1–2.0 mm step 0.05, chips for the 5 class widths, 5 current chips).
   SVG: top view of a 10 mm trace drawn to scale (30 px/mm, width too), current dots (speed ∝ I), copper colour shifts to
   orange with temperature rise, a thermometer 0–120 °C (10 °C tick highlighted); cross-section 示意 with thickness ×10.
   Readouts: 截面积 w×0.035; 每 10 mm 电阻; IPC-2221 current at ΔT 10 °C (+ at width −20 %); ΔT at the chosen current
   (inverse formula); drop + heat if the whole 45.8 mm battery→VM path had this width; drop on the *real* path.
   Default state 0.8 mm / 2 A → 9.6 °C, 56 mV (uniform) / 59 mV (real, incl. 1.9 mm of 0.35 mm). 0.2 mm / 2 A → 94 °C (bad).
2. **4.2 网络类表** (`#p4-cls`, generated). On ≤700 px it turns into stacked cards (no horizontal scroll).
3. **4.2 线宽 + 电流的路** (viewer `#p4-bv`, toolbar mini + net dropdown, info panel). Viewer's own width chips are hidden
   by CSS; the lesson's chips (`#p4-wchips`, all 8 widths from `stats.widths`) call `B.highlightWidth(w)`, zoom to the
   tracks if ≤ 6 segments, and fill the card with which nets/why. Route buttons (`#p4-routes`):
   - 电池 → 电机驱动: `animateRoute('BAT+',{from:'J2'})` → `'BAT_SW'` from Q2 → `'VSYS'` from Q1 (earlier legs kept glowing
     via `annotate`), then `highlightNet([BAT+,BAT_SW,VSYS])`. Card: 14.4 + 3.3 + 28.0 = 45.8 mm, 29.6 mΩ, 59 mV @ 2 A.
   - 电机线: `animateRoute([ML+,ML-,MR+,MR-],{from:'U2'})`. Card: 8.2 / 6.2 / 4.4 / 11.3 mm; MR− 14.1 mΩ, 14 mV @ 1 A.
   - 3V3 from U3 → `selectNet('3V3')`. Card: U3→U1 pin 2 path 28.9 mm (partly B.Cu), 47.3 mΩ, 14 mV @ 0.3 A, 8 pads.
   - VBUS from J1 → `selectNet('VBUS')`. Card: J1→D1 15.0 mm of which 11.9 mm on B.Cu, 12 pads.
   - nSLEEP from U1 → `selectNet('nSLEEP')`. Card: 37.4 mm, 12 segs, 3 pads, ~92 mΩ.
4. **4.3 间距模拟** (`#p4-gsvg`, 示意 ×250): design gap 0.10 / 0.15 / 0.18 / 0.20 × made width −20 % / 0 / +20 %.
   Two 0.2 mm traces (dashed = drawing, filled = as made), a hatched band = JLC 0.10 mm; overlap of the band turns orange.
   Gap made = g − 0.2·e (each trace grows e·w/2 per side). 0.10 + wide → 0.060 mm (bad); 0.18 + wide → 0.140 mm (good).
5. **4.3 最窄的缝** (viewer `#p4-gapbv`): JS computes for every pair of segments on the same layer and different nets the
   capsule distance (centre-line distance − half widths). Top 3 net pairs + the narrowest Batt-class pair:
   AIN1/AIN2 0.181 mm B.Cu; BIN2/VCP 0.182 mm F.Cu; BOOT/LED_STAT 0.190 mm F.Cu; VBUS/BAT+ 0.206 mm F.Cu.
   Each button: show only that layer, highlight both nets, zoom ±2.6 × ±1.6 mm, draw the gap line + label. Track-to-pad
   gaps are not included (the text says “两根走线之间”).
6. **4.4 两层** (bars + viewer `#p4-lbv`): 两层都看 / 只看顶层 / 只看底层 / 换层的 28 个过孔 (`highlightVias('signal')`).
7. **4.5 自动布线 5 步** (viewer `#p4-arbv`, ▶ 从头播放 + step buttons):
   ① tracks hidden; locked tracks (49) and locked vias (46) drawn by `annotate` in copper colours with a glow; Courtyard on.
   ② Keepouts layer on; GND locked stubs (36) and GND locked vias (43) drawn as orange keepout blobs (+0.2 mm, as route_a.py);
      non-GND locked tracks drawn; ratsnest lines of the 35 non-GND nets (示意, from `ratsnest[]`).
   ③ `animateRoute(<35 non-GND nets>, {style:'layer'})`, then locked + 25 Freerouting vias drawn.
   ④ all tracks; boxes on the 4 T-junctions (detected in JS: an endpoint where two collinear locked same-net same-width
      segments meet and a non-locked track ends), zoomed to them.
   ⑤ `reveal('Vias')`, `reveal('Zones')`, badge DRC 0 / 0.
   **人工复查** buttons (same viewer, card + status updated): CC1 ×2.1 (8.8 vs 4.1 mm), PROG ×2.1 (11.2 vs 5.4 mm),
   MR− ×2.0 (11.3 vs 5.7 mm) = top 3 of route length ÷ pad-to-pad straight distance over 2-pad nets; “U3 旁收窄到 0.49 mm”
   = `highlightWidth(0.49)` + focus U3.
8. **4.6 USB** (viewer `#p4-usbbv`): 画出 D+ / D− (`animateRoute` from J1), D+ / D− 网络卡 (`selectNet`). Readouts.
   **时间尺** (`#p4-tsvg`): 全速 (4 ns edge drawn, critical length 61 mm, green) vs 高速 (0.5 ns edge, 7.6 mm, orange);
   yellow bar = flight time of D− (0.11 ns); length ruler with D+/D− bars.
9. **4.7 布线器模式** (`#p4-msvg`, 示意): a new red track from 起点 to 终点 meets a blue U-shaped track of another net with a
   grey clearance band. 高亮碰撞: goes straight, red circles at the 2 crossings. 推挤: goes straight, the U is pushed up
   while the head approaches. 绕走: new track detours below, the U does not move. Reduced motion: final frame.
10. **4.8 quiz** buttons: Q1 → `#p4-bv` + 0.8 mm chip; Q2 → `#p4-gapbv` narrowest gap; Q3 → `#p4-usbbv` D+/D− animation.

## Numbers and where they come from
QB12 (all from `QB.board` at runtime unless noted):
- `stats`: tracks 391, tracks_F 345 / tracks_B 46, track_len_F 472.1 / B 211.4 mm (avg 1.4 / 4.6 mm), widths histogram
  (0.2×191, 0.8×56, 0.4×55, 0.5×46, 0.3×34, 0.49×5, 0.35×3, 0.25×1), locked_tracks 49, vias 177, gnd_vias 149,
  via_roles.signal 28, footprints 51, smd_pads 205 (JS also checks all are on F.Cu), pth pads 8 (counted from pads[]).
- `classes[]`: Default 0.2/0.18/0.6-0.3 (25 nets), Power 0.5/0.18/0.8-0.4 (GND, VBUS), Motor 0.4/0.18/0.8-0.4, Rail 0.3/0.18/0.6-0.3,
  Batt 0.8/0.2/0.8-0.4. `rules.min_clearance` 0.15.
- `tracks[]` (locked flag): locked GND 36 (32×0.4 + 3×0.3 + 1×0.5 B.Cu), VBUS 5, VSYS 6 (1×0.35 + 5×0.8), BAT_SW 2 (0.8 + 0.25).
  Locked GND vias 43, other locked vias 3 (2 VBUS + 1 BAT_SW). Freerouting tracks = 391 − 49 = 342; Freerouting vias = signal
  vias not locked = 25.
- Pre-drawn 45 = 49 − 4 T-junction pieces. Cross-checked with pcbnew: loading `pcb/board/QB12_fan.kicad_pcb` gives 45 locked
  tracks; after `ImportSpecctraSES(r3/QB12.ses)` 387 tracks; route_b.py's `split_t_junctions` logic adds 4 (2 VSYS, 2 VBUS, all
  locked) → 391 / 49 locked (script `scratchpad/p4tmp/tcount.py`, read-only).
- 79 keepout shapes = 36 + 43; confirmed in `pcb/r3/QB12.dsn` (`gfan0` … `gfan78`) + antenna / module / usbbody keepouts.
- DSN classes (`pcb/r3/QB12.dsn`): widths 800/500/400/300/200 µm, clearance 200 (Batt) / 180 µm; GND removed (route_a.py).
- Path lengths (JS Dijkstra over track endpoints, pads matched by shape): BAT+ J2→Q2 14.4, BAT_SW Q2→Q1 3.3, VSYS Q1→U2.12 28.0
  (incl. the 1.9 mm 0.35 mm neck) = 45.8 mm; 3V3 U3→U1 28.9 mm; VBUS J1→D1 15.0 mm (11.9 on B.Cu). Python cross-check
  `scratchpad/p4tmp/path.py` gives the same 14.42 / 3.30 / 28.04 / 28.9.
- Net lengths/segs from `nets[]`: USB_DP 16.75 mm / 11 segs, USB_DN 18.60 mm / 14 segs, 0 vias, 5 pads each; ML± MR± 8.2 / 6.2 /
  4.4 / 11.3; nSLEEP 37.4 / 12 segs. (KiCad Net Inspector screenshot shows 16.7461 / 18.6008 — same.)
- Pad widths: U2 pins 5, 12 = 0.35 mm; U3 pads = 0.49 mm (so the 0.49 / two of the 0.35 segments are neck-downs; inference,
  they are unlocked tracks, i.e. drawn by Freerouting, and their width equals the pad width).
- `process.tools.freerouting`: 1.9.0, passes 40, route 5.49 s, optimize “1 minute(s) 9.39 seconds”, improved 52.95 % (shown ≈53 %).
  Same numbers in `pcb/r3/fr19.log`. `-mp 40` from `pcb/r3/run19.sh`.
- `drc`: 0 errors, 0 unconnected.
- Pre-drawn reasons: comments in `pcb/build_board.py` (VBUS “自动布线很难从两侧同时接进去”, VM 0.35 mm neck, Q2→Q1 0.8 mm,
  C9→C14 0.8 mm, BAT_SW 0.25 mm sense escape) and `pcb/route_b.py` (GND fanout, 0.3 mm EP links, 4 mm B.Cu GND spine,
  T-junction split “避免悬空线头警告”).
Physics (first principles, computed in JS): ρ_Cu = 1.72e-8 Ω·m (20 °C), t = 0.035 mm → R□ = 0.49 mΩ/□ (agrees with JLC blog
0.48 mΩ/□ [S19], facts §3.2). R = R□·L/w. Drop = I·R, heat = I²R.
Estimates: propagation 6.15 ps/mm from εeff ≈ 3.4 (the estimate value facts §8.8 uses) → D− 114 ps, ΔL 1.85 mm → 11 ps.
High-speed critical length 7.6 mm = 61 mm × 0.5 ns / 4 ns — **my scaling** of Altium's rule (labelled “按同一判据推算”).

## External facts used
- 1 oz ≈ 35 µm; R□ 0.48 mΩ/□ — facts §3.2 [S19].
- IPC-2221 external formula k 0.048, b 0.44, c 0.725, 1 oz = 1.378 mil; range ≤35 A, 10–100 °C, 0.5–3 oz; “very conservative”;
  IPC-2152 debate; 10–15 % spread between calculators; 2 A → 0.78 mm — facts §8.1 [S42][S43][S19][S20].
- Width tolerance ±20 % (0.1 mm → 0.08–0.12) — facts §1.1 [S01]; JLC min trace/space 0.10/0.10 mm (1 oz, 1–2 layers) [S01][S02];
  etching under-etch leaves shorting copper — facts §2 step 7 [S21]; CAM/DFM check — facts §2 step 0 [S21].
- KiCad default net class 0.2 / 0.2 mm （8 和 10 一样） — facts §6.4 [S34], facts_kicad10.md #109.
- DRV8833 1.5 A RMS / 2 A peak per bridge — facts §8.1/§8.4 [S48 ds/drv.txt:21].
- TP4056: R_PROG close to chip, small PROG capacitance — facts §8.5 [S49 ds/tp.txt:604-616].
- Espressif 2-layer guidance (bottom: no components, few traces, complete GND) — facts §8.3 [S46]; USB diff pair 90 Ω ±10 %,
  parallel equal length, GND both sides, keep away from antenna — facts §8.2/§8.3 [S46].
- USB 2.0 rates, 90 Ω ±15 % differential — facts §8.2 [S45]; ESP32-S3 full-speed — [S52]; FS edges 4–20 ns, critical length
  ≈61 mm (10 %) / 152 mm (25 %), “critical length rule is almost never correctly used” — [S44]; JLC impedance control only 4+ layers,
  2-layer not controlled — facts §1.1/§8.2 [S01][S02].
- Freerouting: DSN in / SES out, magic-wand button, `-inc` ignores net classes, plugin via PCM + Tools → External Plugins, needs Java
  (version per plugin description) — facts §7.1/§7.2 [S37][S38][S39]; Constraints not transferred, net classes are — [S40];
  no copper pour, unfill before / refill after — [S41] + facts §7.3; human check list — facts §7.3 (author's summary, “经验总结”).
- KiCad hotkeys/menus — facts §6.1/§6.2 [S30][S33][S34]: X 布线(单端), 6 布线(差分), V via + layer switch (“next layer in the
  active layer pair”), W / Shift+W, Q, Ctrl+< 交互布线设置..., Ctrl+B / B, 文件 → 电路板配置..., 设计规则 → 网络类 / 约束,
  文件 → 导出 → Specctra DSN... （8.0.9 叫 光绘 DSN...）, 文件 → 导入 → Specctra 会话..., 工具 → 外部插件, 扩展内容管理器; diff-pair suffix rule,
  ML+/ML- coincidence, V places a via pair; width priority rules; net-class width is a default, not enforced (Custom Rules).
- Chinese UI strings checked in the 8.0.9 `kicad.mo` (msgunfmt): 网络类分配:, 匹配规则, 走线: 使用网络类宽度, 过孔: 使用网络类尺寸,
  铜皮间距, 走线宽度, 过孔外径, 过孔内孔, 差分对宽度, 差分对间隙, 最小间距, 最小走线宽度, 高亮碰撞, 推挤, 绕走, 自定义规则, 网络检查.
  The real screenshots confirm 布线 (U) top menu, the two toolbar dropdowns, the Net Inspector window title “网络检查”, and the
  router status bar “模式 绕走”.

## Not from facts.md / please check
- Router mode descriptions (高亮碰撞 = route through and mark; 推挤 = push others aside, stops at pads/edges/locked; 绕走 = go
  around) — general KiCad behaviour; facts §6.2 has no text about modes. Animation is labelled 示意.
- No hotkey given for 高亮网络 or for opening 网络检查 (facts.md has none; I did not guess).
- “QB12 把间距设成 0.18 mm，比默认值稍紧，线能排得更密一点” — the effect, not a documented intent.
- Screenshot captions were written against the delivered screenshots (kicad_netclasses, kicad_net_inspector, kicad_net_highlight,
  kicad_route_live as of 05:29).

## 2026-10-20 按 KiCad 10.0.6 更新
来源：`pcbcourse/facts_kicad10.md`（#65、#69、#76、#80、#109）和本机 10.0.6 的 zh_CN `kicad.mo`（polib 读）。正文改了：
网络检查 现在是停靠面板，路径 视图 → 面板 → 网络检查（检查 菜单里没有了）；光绘 DSN... → Specctra DSN...（翻译已改对，删掉吐槽那句）；
取消填充所有域 → 取消填充所有填充区；“KiCad 8 文档” → “KiCad 10 文档”（V 的行为不变）。
在 10.0.6 的 mo 里复查过、没变的：走线: 使用网络类宽度、过孔: 使用网络类尺寸、铜皮间距、走线宽度、过孔外径、过孔内孔、差分对宽度、
差分对间隙、最小间距、最小走线宽度、高亮碰撞、推挤、绕走、自定义规则、网络类分配、布线(单端)、布线(差分)、交互布线设置...、外部插件、
扩展内容管理器、Specctra 会话...。（网络类分配 表的列头现在是“匹配规则 (支持正则表达式)”，正文泛指的“匹配规则”没改。）
QB12 的数字不变（迁移后板子逐对象一致，页面运行时从 data/board.json 算）。
还没改（截图仍是 8.0.9）：p4.html:47、48、179、180 的 figcaption / alt。Freerouting 插件在 10 上没实测（#117）。

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
