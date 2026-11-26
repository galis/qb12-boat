#!/bin/bash
# Freerouting 1.9.0 自动布线（macOS：有桌面，不需要 xvfb）
R=$(cd "$(dirname "$0")" && pwd)
source "$R/../../../tools/kicad_env.sh"
cd "$R"
rm -f QB12.ses fr19.log fr19.done
"$JAVA" -jar "$R/../../../tools/freerouting-1.9.0.jar" \
  -de "$R/QB12.dsn" -do "$R/QB12.ses" -mp 40 > fr19.log 2>&1 &
pid=$!; ( sleep 400; kill $pid 2>/dev/null ) & w=$!
wait $pid; rc=$?; kill $w 2>/dev/null
echo "exit $rc" > fr19.done
