# p7 status log

- [x] Read AUTHORS.md, README.md, p0.*, facts §1–2, §4.4–4.7, §5, §6, §9, §10
- [x] Read board.json fab, export_jlc.sh, real Gerber/drill/CPL/BOM files, kicad-cli defaults
- [x] Finding: delivered Gerbers contain X2 attributes (%TF/%TA/%TO) — script lacks --no-x2/--no-netlist; 嘉立创 [S03] says no X2
- [x] Verify --no-x2 re-export diff (scratch only, p7tmp/x): default re-export == delivered; --no-x2 --no-netlist: image commands identical, only attribute lines change
- [x] Verified: --smd-only drops SW1; --exclude-fp-th drops J1, SW1, U2; absolute origin pos = (100+x, -(100+y))
- [x] Found: B.Silk has JLCJLCJLCJLC (finalize.py); raw S25 says not supported since May 2026 (not in facts.md) -> report to lead
- [x] Plan sections (7.1 files→machines, 7.2 Gerber films, 7.3 drill, 7.4 BOM/CPL, 7.5 coords+rotation, 7.6 settings/script, 7.7 viewer check, 7.8 quiz)
- [x] Write p7.html / p7.css / p7.js
- [x] Build + test (both test.py and test_p7.py pass), screenshots in _shots/p7/ — still reviewing phone shots
- [x] p7_notes.md
- [x] Lead update: zip re-exported without X2 on 10-19 → excerpt toggle (v1/v2), NPTH dates, script line 10, cards, tip, checklist text
- [x] Final report sent
- [x] Lead corrections (screenshot catalog): origin tip near screenshots, drill/pos/Gerber captions fixed
- [x] Final report sent
- [x] 2026-10-20 按 KiCad 10.0.6 更新：7.2/7.3/7.5 对话框步骤、Gerber/NPTH 摘录（10-20 交付版）、export_jlc.sh 行号 9–15 / 23–25、7.6 卡片的界面名；4 张截图的图注等重拍后再改
