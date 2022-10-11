#!/bin/sh
set -e
set -v

function make_filter() {
  echo "--gtest_filter=InstancingPerfBenchmark.Run/$1*:BufferSubDataBenchmark.Run/$1*:PointSpritesBenchmark.Run/$1*"
}

filter="$(make_filter $1)"

sudo ./out/Release/angle_perftests --verbose "$filter"
sudo ANGLE_PREFERRED_DEVICE=Intel ./out/Release/angle_perftests --verbose "$filter"
