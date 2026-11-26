#!/bin/bash
# 不同布线遍数轮流试，找到 DRC 全通过的那一版
P=$(cd "$(dirname "$0")" && pwd)
source "$P/../../tools/kicad_env.sh"
cd "$P"
for mp in "$@"; do
  sed -i '' "s/-mp [0-9]*/-mp $mp/" r3/run19.sh
  r3/run19.sh
  "$KPY" route_b.py board/QB12_fan.kicad_pcb r3/QB12.ses board/QB12_routed.kicad_pcb > /dev/null 2>&1
  cp board/QB12_template.kicad_pro board/QB12_routed.kicad_pro
  r=$(./drc.sh board/QB12_routed.kicad_pcb)
  u=$(echo "$r" | grep "^unconnected" | awk '{print $2}')
  e=$(echo "$r" | grep -c "'error'")
  echo "mp=$mp unconnected=$u errors_lines=$e"
  echo "$r" | grep UNCONN | head -3
  if [ "$u" = "0" ] && [ "$e" = "0" ]; then cp r3/QB12.ses r3/QB12_ok.ses; echo "OK at mp=$mp"; break; fi
done
