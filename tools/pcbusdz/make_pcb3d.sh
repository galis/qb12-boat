#!/bin/bash
# PCB 3D：KiCad 10 导出 GLB -> 绿色 / 黑色阻焊 USDZ -> 预览 GLB 和渲染图
#   ./make_pcb3d.sh [输出目录]     默认 hardware/pcb/out/3d
# 用 pkg/QB12_KiCad 里的板子（3D 模型路径是 ${KIPRJMOD}，解压即用）；先跑 hardware/pcb/make_pkg.sh
# KiCad 10 要加 --subst-models（用同名 STEP 代替 VRML）和 --include-pads（焊盘铜），和 KiCad 8 的默认行为一致
set -e
T=$(cd "$(dirname "$0")" && pwd)
source "$T/../kicad_env.sh"
PRJ=$(cd "$T/../.." && pwd)
OUT=${1:-$PRJ/hardware/pcb/out/3d}
mkdir -p "$OUT"
"$KCLI" pcb export glb --subst-models --include-tracks --include-zones --include-pads \
  -o "$OUT/QB12.glb" "$PRJ/hardware/pcb/pkg/QB12_KiCad/QB12.kicad_pcb" 2>&1 | grep -v NSCocoa | tail -1
for m in green black; do
  MASK=$m "$VPY" "$T/glb2usdz.py" "$OUT/QB12.glb" "$OUT" "$PRJ/courses/pcb/data/board.json" | tail -1
done
cp "$OUT/QB12_PCB_merged_green.glb" "$PRJ/viewer/pcb_preview.glb"
"$VPY" "$PRJ/viewer/shoot_pcb.py" "$PRJ/viewer" "$OUT" render_pcb.html | grep -E "ok|timeout|fail"
"$VPY" "$PRJ/hardware/pcb/prev/shoot.py" "$PRJ/hardware/pcb/prev" "$OUT" | grep -E "ok|fail" | cut -c1-20
ls -la "$OUT"
