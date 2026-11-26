#!/usr/bin/env bash
# 用法：./build.sh                编译
#       ./build.sh upload PORT    编译并烧录
set -euo pipefail
cd "$(dirname "$0")"
export ARDUINO_DIRECTORIES_DATA="$PWD/.arduino/data" ARDUINO_DIRECTORIES_DOWNLOADS="$PWD/.arduino/dl" ARDUINO_DIRECTORIES_USER="$PWD/.arduino/user"
URL=https://raw.githubusercontent.com/ricardoquesada/esp32-arduino-lib-builder/master/bluepad32_files/package_esp32_bluepad32_index.json
FQBN='esp32-bluepad32:esp32:esp32s3:CDCOnBoot=cdc'
arduino-cli core list --additional-urls "$URL" | grep -q esp32-bluepad32 || {
  arduino-cli core update-index --additional-urls "$URL"
  arduino-cli core install esp32-bluepad32:esp32 --additional-urls "$URL"; }
arduino-cli compile --fqbn "$FQBN" --additional-urls "$URL" --output-dir build qb12_boat
[ "${1:-}" = upload ] && arduino-cli upload --fqbn "$FQBN" -p "${2:?要给串口}" --input-dir build qb12_boat
true
