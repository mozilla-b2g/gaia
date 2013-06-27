#!/bin/bash
DIR=`cd $(dirname ${BASH_SOURCE[0]}); pwd`;

TYPE=$1

PID_FILE="$DIR/$GAIA_DOMAIN-$GAIA_PORT-server.pid";

if [ -s $PID_FILE ];
then
  # make sure its dead
  echo "Cleaning up dead server."
  kill `cat $PID_FILE`
  rm $PID_FILE;
else
 echo "Is clean continue."
fi

$DIR/../../test-agent/node_modules/b2g-scripts/bin/b2g-scripts server \
  --port $GAIA_PORT --gaia $DIR/../../../ &

SERVER_PID=`jobs -p | tail -n 1`;
echo $SERVER_PID > $PID_FILE;

SCRIPT=$TYPE.sh;

$DIR/$SCRIPT
echo "$DIR/$SCRIPT"

EXIT_STATUS=$?;

kill $SERVER_PID;
exit $EXIT_STATUS;

