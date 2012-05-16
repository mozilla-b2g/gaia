CI_TOOLS=$PWD;

source $PWD/config.sh

echo "Building Profile";

cd $B2G_HOME;

rm -f gaia/profile.tar.gz

./build.sh GAIA_DOMAIN=trunk.gaiamobile.org DEBUG=1 GAIA_PORT=''

DOMAIN=http://test-agent.trunk.gaiamobile.org/index.html#?websocketUrl=$TEST_AGENT_SERVER

echo "Starting Emulator";
./gecko/testing/marionette/client/marionette/runemu.sh \
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

echo "Done output file: $TEST_OUTPUT"
kill $PID;
