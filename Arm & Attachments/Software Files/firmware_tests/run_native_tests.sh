#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
for board in arduino_arm arduino_wheels; do
  echo "Testing $board DRV8825"
  g++ -std=c++17 -I firmware_tests -I "$board/src" firmware_tests/test_stepper.cpp "$board/src/DRV8825.cpp" -o "/tmp/re_rassor_${board}_stepper"
  "/tmp/re_rassor_${board}_stepper"
done
