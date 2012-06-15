#!/bin/bash

cd $GAIA_PATH;

# start test agent server put it in the background
make -C $GAIA_PATH test-agent-config
make -C $GAIA_PATH test-agent-server &
AGENT_PID=`jobs -p | tail -n 1`;

# wait for emulator to connect to ws server
sleep 5

AGENT=./tools/test-agent/node_modules/test-agent/bin/js-test-agent


echo "Running tests"
echo $OUTPUT_FILE;
echo $AGENT;

if [ "$TEST_OUTPUT" == 'stdout' ];
then
  $AGENT test --reporter $REPORTER --server $TEST_AGENT_SERVER --wait-for-event="test data" --event-timeout="30000"
else
  rm -f $TEST_OUTPUT;
  echo $TEST_AGENT_SERVER
  echo $REPORTER
  $AGENT test --reporter $REPORTER --server $TEST_AGENT_SERVER --wait-for-event="test data" --event-timeout="30000" > $TEST_OUTPUT
fi

EXIT_STATUS=$?

if [ "$EXIT_STATUS" == "0" ];
then
  echo "GAIA: TESTS PASS";
else
  echo "GAIA: TESTS FAIL";
fi

# kill background server
kill $AGENT_PID;
exit $EXIT_STATUS;
