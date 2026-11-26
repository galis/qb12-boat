#!/bin/bash
# 打 KiCad 工程包：out/ 的板子 + 封装库 + 3D 模型 -> pkg/QB12_KiCad/ 和 pkg/QB12_KiCad工程.zip
# 包里的 3D 路径改成 ${KIPRJMOD}/QB12.3dshapes/，解压到哪里都能打开
set -e
P=$(cd "$(dirname "$0")" && pwd)
cd "$P"
D=pkg/QB12_KiCad
rm -rf "$D" && mkdir -p "$D"
cp out/QB12.kicad_pcb out/QB12.kicad_pro "$D/"
[ -f out/QB12.kicad_prl ] && cp out/QB12.kicad_prl "$D/"
cp -R lib/QB12.pretty lib/QB12.3dshapes "$D/"
for f in "$D/QB12.kicad_pcb" "$D"/QB12.pretty/*.kicad_mod; do
  sed -i '' 's|(model "${KIPRJMOD}/../lib/QB12.3dshapes/|(model "${KIPRJMOD}/QB12.3dshapes/|' "$f"
done
cat > "$D/fp-lib-table" <<'T'
(fp_lib_table
  (version 7)
  (lib (name "QB12")(type "KiCad")(uri "${KIPRJMOD}/QB12.pretty")(options "")(descr "Boat QB12 footprints from LCSC/EasyEDA"))
)
T
(cd pkg && rm -f QB12_KiCad工程.zip && zip -qr QB12_KiCad工程.zip QB12_KiCad -x '*.DS_Store')
echo "pkg: $(du -sh pkg/QB12_KiCad工程.zip | cut -f1)"
