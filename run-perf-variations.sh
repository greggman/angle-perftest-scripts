#!/bin/sh
set -e
set -v
base_dir=$(dirname "$0")

if [[ `git status --porcelain`  ]]; then
  echo "there are local changes. clean them up first. aborting"
  exit 1
fi

PERF_BRANCH_NAME=perf-tweaks
#PERF_BRANCH_NAME=perf-tweaks-morethan128k
#PERF_BRANCH_NAME=perf-tweaks-near-128k

function build_and_run {
  git reset --hard $1
  git cherry-pick perf-tweaks
  goma_ctl ensure_start
  autoninja -C out/Release angle_perftests
  $base_dir/run-perf-tests.sh $2
}

sudo echo "need sudo"

git checkout -b delme-perf-test-temp

#build_and_run wait metal
build_and_run test-perf-revert gl
build_and_run test-perf-revert metal
build_and_run test-perf-before metal
#build_and_run bsd-old metal
#build_and_run buffersubdata-opt-AMD-new-buffer metal
#build_and_run buffersubdata-opt-fix metal
#build_and_run buffersubdata-opt-serial metal
#build_and_run bufsubdata-usage metal
#build_and_run bufsubdata-usage-128k metal

git checkout main
git branch -D delme-perf-test-temp
