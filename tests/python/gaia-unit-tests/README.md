Python testrunner for Gaia unit tests

Gaia runner CLI:

````sh
cd gaia-unit-tests
python gaia-unit-tests --help

Usage: main.py [options] <test_file> <test_file> ...

Options:
  -h, --help         show this help message and exit
  --binary=BINARY    path to B2G desktop build binary
  --profile=PROFILE  path to gaia profile directory
````

if &lt;test_file> is omitted, all tests will be run.  Otherwise, &lt;test_file> should
be specified relative to gaia's 'apps' dir.
