# KiCad 10 的路径（被 hardware/pcb 下的脚本 source）。KiCad 装在别处时，先 export KICAD_APP=/path/KiCad.app 再运行。
KICAD_APP=${KICAD_APP:-$HOME/Applications/KiCad/KiCad.app}
[ -d "$KICAD_APP" ] || KICAD_APP=/Applications/KiCad/KiCad.app
KPY="$KICAD_APP/Contents/Frameworks/Python.framework/Versions/Current/bin/python3"   # 带 pcbnew
# 优先用仓库里的 .venv-kicad（KiCad 的 Python + shapely，见 requirements-kicad.txt）
_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)
[ -x "$_ROOT/.venv-kicad/bin/python" ] && KPY="$_ROOT/.venv-kicad/bin/python"
# 不需要 pcbnew 的脚本（make_bom.py 要 openpyxl）用仓库的 .venv
VPY="$_ROOT/.venv/bin/python"; [ -x "$VPY" ] || VPY=python3
KCLI="$KICAD_APP/Contents/MacOS/kicad-cli"
# Freerouting 1.9.0 要 Java；用 Homebrew 的 openjdk@21（keg-only，不链接到全局）
JAVA=${JAVA:-$(ls /opt/homebrew/opt/openjdk@21/bin/java 2>/dev/null || command -v java)}
