# p2 status (lesson 2 封装：从符号到焊盘)

## 2026-10-19
- Read AUTHORS.md, README.md, p0.*, facts.md (§1, §4.2, §4.5, §5.4, §6, §8.3–8.5, §10), viewer API.
- Verified locally:
  - stale `LCSC Part`: pcb/pkg/QB12_KiCad/QB12.kicad_pcb (and out/QB12.kicad_pcb.bak_lcsc): 22/51 differ; all are
    C0603 (lib default C14663) and R0603 (lib default C23186) — library property from pcb/lib/QB12.pretty/*.kicad_mod.
  - U2/U4 EP paste opening = 0.70 × pad each side (F.Paste layer), area 49 %; mask opening = pad (expansion 0).
  - kicad-cli 8.0.9 pos export on out/QB12.kicad_pcb: default 51 rows; --smd-only drops SW1; --exclude-fp-th drops J1, SW1, U2.
  - kicad-cli DRC --severity-all on delivered project copy (kzip/chk): no lib_footprint_issues; 3 lib_footprint_mismatch (SW1, J1, U2).
  - zh_CN strings checked with msgunfmt; dialog labels checked against the real screenshots (封装类型, 间距重写, 工艺层).
- Wrote p2.html / p2.css / p2.js / p2_notes.md / tools/test_p2.py. Sections 2.1–2.8 as planned.
- Fixes after looking at screenshots: focus = pads ∪ courtyard (J1 pads were cut off), dimension lines sized by view width and kept
  in view, pad numbers hidden for holes/made steps, gallery viewer + readout side by side, legend for 2.4, phone tables fit,
  stroke-linecap:round workaround for mask/paste/silk layer SVGs (viewer bug, reported).
- Tests: build --only 2 --strict OK (0 warnings); tools/test_p2.py all pass (desk dark, phone light, reduced motion);
  tools/test.py --page _preview_p2.html: only failure was my wide tables on phone → fixed, re-running.

- Lead corrections applied (kicad_shots.md): fp_editor alt/caption uses QB12:TSSOP-16_…-BL-EP + title/info bar; 管理封装库 / dialog
  封装库 (tab renamed); assign_fp captioned as 演示工程 R1/D1/J1; board copy vs library copy (检查 → 将封装与库比较,
  工具 → 从库中更新封装...) added to 2.2 caption and 2.7; no 电路板设置 in p2.
- framework tools/test.py --page _preview_p2.html: all pass (after phone-table fix).

## Progress
- [x] p2.html  - [x] p2.css  - [x] p2.js  - [x] p2_notes.md  - [x] test_p2.py  - [x] screenshots checked

## 2026-10-20 按 KiCad 10.0.6 更新
- 按 `facts_kicad10.md` 改 p2.js 的界面名：存在差异 → 存在不一致（2 处）；新建封装... → 新建封装；“特性” → “制造特性”；从定位文件中移除 → 从坐标文件中移除；
  工艺层 → 技术层；阻焊层扩展 → 阻焊扩展；焊盘类型 非金属化孔 → 非电镀孔 (NPTH), 机械；坐标文件筛选注释改成 kicad-cli 10.0.6（结果和 8.0.9 一样）。
- p2.html 只有截图图注提到界面，截图还是 8.0.9 拍的，图注暂不改（待重拍：kicad_assign_fp、kicad_fp_editor、kicad_fp_props、kicad_pad_props、kicad_fp_lib_table）。
- p2_notes.md 同步版本、DRC 数字（silk_over_copper 38 → 2）和译名。

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
