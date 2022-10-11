# angle-perftest-scripts

Some scripts to help compare different optimizations in ANGLE's perf tests.

## Usage

1. Make one or more git branched with different optimizations
2. Make a branch called `perf-tweaks` that makes any needed changes to the `angle_perftests` tests.
3. Edit `run-perf-variations.sh`
4. For each branch, add a `build_and_run <name-of-branch> <api>` line
   where `<api>` is either "metal" or "gl"
5. Reboot your machine
6. Open a terminal and cd to your angle folder
7. Run `top` and wait for your machine to settle down. On my work laptop this takes around 3 minutes for various virus scanners to stop.
8. Run like this

   ```sh
   caffeinate -disu $T/run-perf-variations.sh > output.txt 2>&1
   ```

   The scripts will, indirectly, ask for your sudo password as the perf tests
   want to try to set the process priority higher to make the test results more
   reproducible.

9. To see the results use this command

   ```sh
   node $T/parse-perftest-output.js --txt output.txt
   ```

   You can use `--csv` instead of `--txt` if you want csv

   Note: if you don't have node installed I suggest 
   [`nvm`](https://github.com/nvm-sh/nvm) 
   or [`nvm-windows`](https://github.com/coreybutler/nvm-windows)

## Notes:

* The scripts should maybe be changed to take a list of branches on the command line. 
* The scripts are hard coded to run the tests once with no options and again with `ANGLE_PREFERRED_DEVICE=Intel`. This is really only useful on a dual GPU machine. Maybe the script should check if that's needed
* Which tests are run is hardcoded in `run-perf-tests.sh`
* `parse-perftest-output.js` attempts to parse stdout/stderr from the tests and average the test results across runs. The test itself runs each test 3 times by default.
