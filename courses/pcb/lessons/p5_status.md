# p5 status (lesson 5 过孔与铺铜)

- [x] read AUTHORS, README, p0.*, facts (§1, §6, §8.3–8.8, §10), board.json (vias/zones/process), route_a.py, route_b.py
- [x] verify zone/via props in out/QB12.kicad_pcb (viasonmask no; F_Mask 217 flashes = pads; B_Mask 12)
- [x] write p5.html / p5.css / p5.js (7 sections, 6 widgets)
- [x] p5_notes.md
- [x] build --only 5 --strict clean; tools/test_p5.py (desktop passes)
- [x] phone 400 light + reduced motion screenshots reviewed; framework test.py --page _preview_p5.html passes; test_p5.py passes (3 runs)
- [x] real screenshots arrived for all 5 assets; captions checked against them; "未布线 154" verified with pcbnew
- DONE (2026-10-19)
- known fixes done: loop svg no .wscroll (framework overflow check), viewer core-circle stroke workaround, keepout labels hidden in #p5 viewers, time-based heat sim
- 2026-10-20 按 KiCad 10.0.6 更新：p5.html / p5.js 的菜单名、快捷键（放置过孔 Ctrl+Shift+X）、覆铜区 / 规则域 对话框字段、过孔盖油位置（电路板配置 → 阻焊/锡膏）、插件版本；5 张截图的 figcaption 还是 8.0.9，等重拍后再改。build.py 未跑（多人同时改）。

- 2026-10-20（截图重拍后）：KiCad 截图已全部换成 KiCad 10.0.6 在 Mac 上重拍的版本（见 `pcbcourse/assets/kicad_shots.md`），图注、alt、shot() 的 view / 框 / 光标坐标和描述截图的旁白都已按新图改过；上面“截图还是 8.0.9 / 等重拍”的说法已过时。改过的旁白要重跑 TTS。
