#!/bin/bash
CI_TOOLS=`cd $(dirname ${BASH_SOURCE[0]}); pwd`;

source $CI_TOOLS/config.sh

echo "Building Profile";

rm -f $GAIA_PATH/profile.tar.gz

# Prevent failures from missing dirs

mkdir -p $GAIA_PATH/profile/OfflineCache

cd $B2G_HOME;

if [ "$TEST_FAST" -eq '1' ];
then
  echo 'Skipping build step.';
else
  echo "Creating new host file."
  LOCALHOST=10.0.2.2
  # hard coding x86
  HOSTFILE=$B2G_HOME/out/target/product/generic_x86/system/etc/hosts

  rm -f $HOSTFILE;

  echo '127.0.0.1 localhost' >> $HOSTFILE;

  $GAIA_PATH/tools/test-agent/node_modules/b2g-scripts/bin/b2g-scripts hosts \
    --gaia $GAIA_PATH --ip $LOCALHOST >> $HOSTFILE --domain $GAIA_DOMAIN;

  ./build.sh GAIA_DOMAIN=$GAIA_DOMAIN \
    DEBUG=1 GAIA_PORT=$GAIA_PORT GAIA_PATH=$GAIA_PATH
fi

DOMAIN=http://test-agent.$GAIA_DOMAIN:$GAIA_PORT/index.html#?websocketUrl=$TEST_AGENT_SERVER

echo "Starting Emulator";

Xvfb :89 &

export DISPLAY=:89;

./gecko/testing/marionette/client/marionette/scripts/runemu.sh \
  python --repo $B2G_HOME \
  --pidfile $B2G_HOME/emulator.pid  \
  --url $DOMAIN;

if [ "$?" -ne "0" ];
then
  echo "Emulator failed to start."
  exit $?
fi

PID=`cat $B2G_HOME/emulator.pid`

echo "Running tests";
$CI_TOOLS/test.sh

# kill xvfb
kill %1;

echo "Done output file: $TEST_OUTPUT"
if [ "$EXIT_STATUS" == "0" ];
then
  echo "TESTS PASS";
else
  echo "TESTS FAIL";
fi

kill $PID;
exit $EXIT_STATUS;
