#!/bin/bash
CI_TOOLS=`cd $(dirname ${BASH_SOURCE[0]}); pwd`;

source $CI_TOOLS/config.sh

echo "Building Profile";

cd $B2G_HOME;

DOMAIN=http://test-agent.$GAIA_DOMAIN$GAIA_PORT/index.html#?websocketUrl=$TEST_AGENT_SERVER

echo "Starting Emulator at: $DOMAIN";

./gecko/testing/marionette/client/marionette/scripts/runemu.sh \
  python --repo $B2G_HOME \
  --pidfile $B2G_HOME/emulator.pid  \
  --arch $EMULATOR_TYPE;

if [ "$?" -ne 0 ];
then
  echo "Emulator failed to start."
  exit $?
fi

PID=`cat $B2G_HOME/emulator.pid`

$ADB shell setprop net.dns1 10.0.2.3
$ADB forward tcp:2828 tcp:2828


if [ "$GAIA_SKIP_HOSTS" -eq 0 ];
then
  echo "Creating new host file."
  LOCALHOST=10.0.2.2
  # hard coding x86
  HOSTFILE=$GAIA_PATH/emu-hosts.txt
  rm -f $HOSTFILE;

  echo '127.0.0.1 localhost' >> $HOSTFILE;

  $B2G_SCRIPTS hosts \
    --gaia $GAIA_PATH \
    --domain $GAIA_DOMAIN \
    --ip $LOCALHOST >> $HOSTFILE;

  $ADB remount
  $ADB push $HOSTFILE /system/etc/hosts
fi

cd $GAIA_PATH;
make install-gaia LOCAL_DOMAINS=0 DEBUG=1 && sleep 10
cd $B2G_HOME

$B2G_SCRIPTS wait-for-marionette --timeout 20000;
if [ "$?" -ne "0" ];
then
  echo "Marionette failed to start.";
  echo $?;
fi


$B2G_SCRIPTS cmd goUrl $DOMAIN;

echo "Running tests";
$CI_TOOLS/test.sh

kill $PID;
exit $EXIT_STATUS;
