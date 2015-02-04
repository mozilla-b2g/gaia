# mocha-parallel


[![Build Status](https://travis-ci.org/gaye/mocha-parallel.png?branch=master)](https://travis-ci.org/gaye/mocha-parallel)

### Usage

```
  Usage: ./mocha-parallel \
             --cwd /path/to/cwd \
             --env "FOO=bar BAR=baz" \
             --format "some mocha command %s" \
             --parallel 10 \
             --tasks "one_test.js two_test.js three_test.js"

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -c, --cwd [cwd]        directory to execute tasks
    -e, --env [env]        environment variables
    -f, --format [format]  template for tasks
    -p, --parallel [parallel]  number of parallel tasks
    -t, --tasks [tasks]    list of tasks

```

### gaia-integration example

`GAIA=/home/gareth/Documents/gaia example/gaia-integration.sh`
