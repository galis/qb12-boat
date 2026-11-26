# p1 status log

- [x] Read AUTHORS.md, README.md, p0.*, facts.md §1–3, §6, §10, raw S30 (stackup/appearance), raw S16, raw S25
- [x] Read src.html, boardviewer.js API, board.json stats
- [x] Verified: QB12.kicad_pcb has NO (stackup) block, only (general (thickness 1.6)); KiCad 8.0.9 default stackup
      for it (pcbnew save with m_HasStackup=True into scratchpad/p1tmp/stk.kicad_pcb): mask 0.01, Cu 0.035, core 1.51 FR4 er 4.5, finish None
- [x] Verified: F_Mask.gts has 217 flashes = 205 SMD + 12 holes → all 177 vias tented; B_Mask 12
- [x] finalize.py: refs 0.8 mm high / 0.15 mm thick; back texts thickness max(0.15, 0.15h); JLCJLCJLCJLC at 0.8 mm
- [x] S25 raw: "Order Number is not available since May 2026 … DO NOT add JLCJLCJLCJLC" (NOT in facts.md → report)
- [x] Write p1.html / p1.css / p1.js
- [x] Build + test, screenshots in _shots/p1/
- [x] p1_notes.md
- [x] Final report

## Plan (6 sections)
1.1 拆开看 — iso exploded stack of real QB12 layer art (拆开/合上, 实物色/KiCad 色, click → card) + layer table + kicad_layers_panel
1.2 有多厚 — side-view thickness (示意/真实比例 + magnifier) + 1 oz/2 oz checker + Tg ruler + kicad_stackup
1.3 阻焊和丝印 — viewer: 铜 / +开窗 / 成品 / 丝印 / 底面
1.4 工厂怎么做 — 11-step stepper: cross-section SVG + made-mode viewer (成品色 / KiCad 色)
1.5 下单时选什么 — viewer at USB-C, finish × mask colour checker + recommendation table
1.6 自测三题 + next → #p2

## 2026-10-19 progress
- [x] p1.html / p1.css / p1.js written; build --strict clean; tools/test_p1.py all pass (desk dark, phone light, RM)
- [x] fixes after first screenshots: phone layouts (thickness narrow geometry, cross-section big fonts), responsive tables, mask widget wider view
- [x] re-checked screenshots (desk dark / phone light / RM) in _shots/p1/p1_*.png
- [x] fixed: 11 thermal vias sit inside U2/U4 EP openings → "all vias tented" corrected everywhere (computed VIN)
- [x] lead's message: captions checked against assets/kicad_shots.md; no 电路板设置, no "menus stay English" claim
- [x] p1_notes.md written
- [x] build --only 1 --strict clean; tools/test.py --page _preview_p1.html passes (flaky p0 timing under load 15–20 seen twice, passes on rerun); tools/test_p1.py passes
- DONE — final report sent

## 2026-10-20 按 KiCad 10.0.6 更新
- [x] p1.html：Ctrl+H → H；“线宽”错译改成 8.0.9 和 10.0.6 都有；阻焊层扩展 → 阻焊扩展，补过孔盖油位置（阻焊/锡膏 → 过孔盖油: 顶层 / 底层）
- [x] p1.js：STK 注释版本号；芯板类型 核心 → Core；工序卡来源 KiCad 8 → KiCad 10
- [x] 用 pcbnew 10.0.6 重读默认叠层（scratchpad/k10/p1tmp/stk.kicad_pcb）：mask 0.01、Cu 0.035、core 1.51 FR4 er 4.5、finish None，和 8.0.9 一样
- [x] 截图 kicad_layers_panel、kicad_stackup 重拍后改 p1.html 两处 alt / figcaption 里的 “KiCad 8.0.9”（以及 stackup alt 里的 “类型 核心” → Core）

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
