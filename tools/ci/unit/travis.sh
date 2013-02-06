#!/bin/bash

RETRY=10
FIREFOX_URL=http://ftp.mozilla.org/pub/mozilla.org/firefox/releases/18.0.1/linux-i686/en-US/firefox-18.0.1.tar.bz2
TESTAGENT_URL=http://test-agent.gaiamobile.org:8080/

function waiting_port {
  for i in $(seq 1 $RETRY); do
    nc -z localhost $1
    if [ $? -eq 0 ]; then return; fi
    sleep 1
  done
  echo "Waiting for server on port $1 failed."
  exit 1
}

# Download Firefox and install all test-agent-server dependencies
curl "$FIREFOX_URL" | tar jx
make common-install

# Make gaia for test-agent environment
DEBUG=1 WGET_OPTS=-nv make

# Start test-agent-server and waiting for server to start on port 8789
make test-agent-server &
waiting_port 8789

# Start firefox
firefox/firefox -profile `pwd`/profile "$TESTAGENT_URL" &
waiting_port 8080
sleep 5

make test-agent-test
RESULT_STATUS=$?

exit $RESULT_STATUS;
