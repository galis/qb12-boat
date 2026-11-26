# p6 status log

- [x] Read AUTHORS.md, README.md, p0.*, facts.md §1, §4, §6, §8, §10, viewer API, src.html
- [x] DRC data: board.json drc (180 warnings, from ../../hardware/pcb/out/QB12_drc.json via drc.sh)
- [x] Re-ran kicad-cli DRC on a copy of ../../hardware/pcb/pkg/QB12_KiCad (scratchpad/p6work/pkgcopy): 132 warnings,
      lib_footprint_issues 51 -> 0, new lib_footprint_mismatch 3 (SW1, J1, U2 = build_board.py L155-182 edits)
- [x] zh_CN names checked (scratchpad/p6work/kicad_zh.po)
- [x] Measurements (scratchpad/p6work/gaps.py, holes.py, heights.py, silk.py, pol.py):
      cu min gap 0.150 J1.B4A9(VBUS)<->GND pour F (28.58,31.85); track-track 0.1817 AIN1/AIN2 B.Cu;
      pad-pad 0.1998 J1 B4A9/B5; edge: zone 0.2985(~0.30), pad 0.3217 J2.4 (2.25,36), track 0.418 PROG, via 0.45;
      hole-hole 0.407 U2 thermal array; refs 0.8 mm / 0.15 thick (51); 37 silk dots r0.03 w0.06;
      model heights J2-4 5.61, J1 3.25 (y to 38.65), U1 3.11 (top y 0.40), SW1 x to -0.95, SW2/3 1.55
- [x] assets/p6-low.webp made from ../../hardware/pcb/prev/pcb3d_low.png (crop top 260 px, 1000 w, q72, 27 KB)
- [x] Write p6.html / p6.css / p6.js
- [x] Build --only 6 --strict: 0 warnings; tools/test.py --page _preview_p6.html: pass; tools/test_p6.py: 0 fails (desk dark, phone light, reduced)
- [x] Screenshots in _shots/p6/ reviewed; captions checked against real KiCad screenshots + assets/kicad_shots.md
- [x] p6_notes.md
- [x] Final report sent
- [x] 2026-10-20 按 KiCad 10.0.6 更新：MEAS.pkg（95 = 86/2/4/3，10-20）、IGNORED0 7、KNAME 丝印间距 / 存在不一致、约束名 最小过孔外径 / 最小钻孔孔径、DRC 窗口的覆铜区 / 齿轮菜单选项；报告条目改成中文后的解析（near、SUB、isPolarity）。3 张截图说明待重拍后再改
