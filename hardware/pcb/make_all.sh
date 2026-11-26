#!/bin/bash
# 一键：生成板子 -> 扇出 -> 导出 DSN -> 自动布线 -> 回灌布线、打地孔铺地 -> 收尾 -> DRC -> 下单文件 -> BOM -> 工程包
# 用 KiCad 10（路径见 ../../tools/kicad_env.sh）。
#   ./make_all.sh                    重新跑 Freerouting（每次结果不同）
#   SES=r3/QB12.ses ./make_all.sh    用现成的布线结果，结果可复现（和交付板一致）
set -e
P=$(cd "$(dirname "$0")" && pwd)
source "$P/../../tools/kicad_env.sh"
cd "$P"
"$KPY" build_board.py lib/QB12.pretty board/QB12.kicad_pcb | tail -2
cp board/QB12_template.kicad_pro board/QB12.kicad_pro
"$KPY" route_b.py board/QB12.kicad_pcb - board/QB12_fan.kicad_pcb fanout | tail -2
cp board/QB12_template.kicad_pro board/QB12_fan.kicad_pro
"$KPY" route_a.py board/QB12_fan.kicad_pcb r3/QB12.dsn | tail -1
if [ -z "$SES" ]; then
  r3/run19.sh
  SES=r3/QB12.ses
fi
grep -c "(wire" "$SES" || true
"$KPY" route_b.py board/QB12_fan.kicad_pcb "$SES" board/QB12_routed.kicad_pcb
cp board/QB12_template.kicad_pro board/QB12_routed.kicad_pro
./drc.sh board/QB12_routed.kicad_pcb
"$KPY" finalize.py board/QB12_routed.kicad_pcb board/QB12_final.kicad_pcb
cp board/QB12_template.kicad_pro board/QB12_final.kicad_pro
./drc.sh board/QB12_final.kicad_pcb
cp board/QB12_final.kicad_pcb out/QB12.kicad_pcb
cp board/QB12_final.kicad_pro out/QB12.kicad_pro
./drc.sh out/QB12.kicad_pcb
./export_jlc.sh out/QB12.kicad_pcb jlc
"$VPY" make_bom.py .
./make_pkg.sh
