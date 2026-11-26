#!/bin/bash
# 用 KiCad 10 导出顶面贴图要的 SVG，再合成 top_tex.png（给 ../prev/pcb3d.html 用）
# KiCad 10 每层都会画孔：铜层用小孔画法（1），其余层不画（0），和 KiCad 8 导出的效果一致
set -e
T=$(cd "$(dirname "$0")" && pwd)
source "$T/../../../tools/kicad_env.sh"
PCB=${1:-$T/../out/QB12.kicad_pcb}
svg(){ "$KCLI" pcb export svg -l "$1" --black-and-white --exclude-drawing-sheet --page-size-mode 0 \
       --drill-shape-opt "$2" --mode-single -o "$T/$3.svg" "$PCB" > /dev/null; }
svg F.Cu 1 F.Cu
svg F.Cu 0 F.Cu_nodrill
svg F.Mask 0 F.Mask
svg F.Silkscreen 0 F.Silkscreen
svg Edge.Cuts 0 Edge.Cuts
"$VPY" "$T/make_tex.py" "$T"
