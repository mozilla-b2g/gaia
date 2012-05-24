#!/bin/bash

cd $B2G_HOME/gaia

# start test agent server put it in the background
make -C $B2G_HOME/gaia test-agent-server &

# wait for emulator to connect to ws server
sleep 4

AGENT=$B2G_HOME/gaia/tools/test-agent/node_modules/test-agent/bin/js-test-agent

rm -f $B2G_HOME/test-output.xml

echo "Running tests"
$AGENT test \
  --reporter XUnit \
  --server $TEST_AGENT_SERVER > $B2G_HOME/test-output.xml

# kill background server
kill %1
