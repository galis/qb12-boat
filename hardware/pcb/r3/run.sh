#!/bin/bash
D=/tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad
cd $D/pcb/r3
rm -f QB12.ses fr.log fr.done
date > fr.start
timeout 2400 java -Djava.awt.headless=true -jar $D/tools/freerouting-2.1.0.jar --gui.enabled=false \
  -de $D/pcb/r3/QB12.dsn -do $D/pcb/r3/QB12.ses -mp 25 -mt 1 > fr.log 2>&1
echo "exit $?" > fr.done
date >> fr.done
