#!/bin/bash

cd $GAIA_PATH;

# start test agent server put it in the background
make -C $GAIA_PATH test-agent-server &

# wait for emulator to connect to ws server
sleep 4

AGENT=./tools/test-agent/node_modules/test-agent/bin/js-test-agent


echo "Running tests"
echo $OUTPUT_FILE;
echo $AGENT;

if [ "$TEST_OUTPUT" == 'stdout' ];
then
  $AGENT test \
    --reporter $REPORTER \
    --server $TEST_AGENT_SERVER
else
  rm -f $TEST_OUTPUT;
  $AGENT test \
    --reporter $REPORTER \
    --server $TEST_AGENT_SERVER >$TEST_OUTPUT;
fi


EXIT_STATUS=$?

# kill background server
kill %1;
exit $EXIT_STATUS;
