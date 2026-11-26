#!/bin/bash
cd /tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/pcb/board
rm -f alt.ses alt.log
timeout 2400 xvfb-run -a java -jar /tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/tools/freerouting-1.9.0.jar -de /tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/pcb/board/alt.dsn -do /tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/pcb/board/alt.ses -mp 25 > /tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/pcb/board/alt.log 2>&1
