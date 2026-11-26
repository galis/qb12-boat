#!/bin/bash
# 导出嘉立创下单文件：Gerber + 钻孔（打包 zip）、坐标文件 CPL、BOM
set -e
source "$(dirname "$0")/../../tools/kicad_env.sh"
PCB=$1          # 布好线的 .kicad_pcb
OUT=$2          # 输出目录
mkdir -p "$OUT/gerber"
rm -f "$OUT/gerber/"*
"$KCLI" pcb export gerbers --output "$OUT/gerber/" \
  --layers F.Cu,B.Cu,F.Paste,B.Paste,F.Silkscreen,B.Silkscreen,F.Mask,B.Mask,Edge.Cuts \
  --subtract-soldermask --use-drill-file-origin --no-x2 --no-netlist "$PCB" > /dev/null
"$KCLI" pcb export drill --output "$OUT/gerber/" --format excellon --excellon-separate-th \
  --generate-map --map-format gerberx2 --drill-origin plot --excellon-units mm "$PCB" > /dev/null
(cd "$OUT/gerber" && rm -f ../QB12_Gerber.zip && zip -q ../QB12_Gerber.zip $(ls | grep -v drl_map | grep -v gbrjob))
"$KCLI" pcb export pos --output "$OUT/pos_raw.csv" --format csv --units mm --side front --use-drill-file-origin "$PCB" > /dev/null
python3 - "$OUT" <<'PY'
import csv, sys, os
out = sys.argv[1]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else '.')
rows = list(csv.DictReader(open(f"{out}/pos_raw.csv")))
with open(f"{out}/QB12_CPL_坐标文件.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["Designator", "Mid X", "Mid Y", "Layer", "Rotation"])
    for r in rows:
        w.writerow([r["Ref"], f'{float(r["PosX"]):.3f}mm', f'{float(r["PosY"]):.3f}mm', "Top", f'{float(r["Rot"]) % 360:.0f}'])
print("CPL rows:", len(rows))
PY
ls -la "$OUT"
