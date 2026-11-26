# p4 status log

- [x] Read AUTHORS.md, README.md, p0.*, facts §1, §6, §7, §8, §9, §10
- [x] Data survey: classes, stats.widths, locked tracks (49), neckdown 0.49 at U3, route_a/route_b/build_board pre-tracks, fr19.log
- [x] Check zh_CN menu names (msgunfmt) -> scratchpad/p4_zh.po
- Findings: 45 locked pre-drawn + 342 Freerouting + 4 T-splits (all on locked VBUS/VSYS) = 391 (p4tmp/tcount.py, pcbnew).
  79 GND keepouts in DSN = 36 locked GND tracks + 43 locked GND vias. Min track gap 0.181 AIN1/AIN2 B.Cu.
  Battery path J2->Q2 14.42 (BAT+), Q2->Q1 3.30 (BAT_SW), Q1->U2.12 28.04 (VSYS). 0.49 = U3 pad width (neckdown).
  Detours: CC1 2.15x, PROG 2.05x, MR- 2.0x.
- [ ] Write p4.html / p4.css / p4.js
- [ ] Build + test, screenshots in _shots/p4/
- [ ] p4_notes.md
- [x] p4.html/css/js written; build strict OK; tools/test_p4.py passes desk/phone/RM (2026-10-19)
- [x] reviewed desk/phone/RM screenshots, fixed layout (SVG max-width, phone fonts, responsive class table, timing labels)
- [x] p4_notes.md written; captions matched to delivered screenshots (05:29)
- [x] final: build --only 4 --strict 0 warnings; tools/test_p4.py and tools/test.py --page _preview_p4.html both pass. DONE.
- [x] 2026-10-20 按 KiCad 10.0.6 更新：网络检查面板路径、Specctra DSN...、取消填充所有填充区、KiCad 10 文档；截图说明待重拍后再改（p4.html:47/48/179/180）。
