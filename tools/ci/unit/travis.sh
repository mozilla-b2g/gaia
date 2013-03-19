#!/bin/bash

RETRY=10
FIREFOX_URL=http://ftp.mozilla.org/pub/mozilla.org/firefox/releases/18.0.1/linux-x86_64/en-US/firefox-18.0.1.tar.bz2
TESTAGENT_URL=http://test-agent.gaiamobile.org:8080/

RED_COLOR=$(printf "\x1b[31;1m")
GREEN_COLOR=$(printf "\x1b[32;1m")
NORMAL_COLOR=$(printf "\x1b[0m")

GJSLINT_PACKAGE_URL=http://closure-linter.googlecode.com/files/closure_linter-latest.tar.gz

function waiting_port {
  for i in $(seq 1 $RETRY); do
    nc -z localhost $1
    if [ $? -eq 0 ]; then return; fi
    sleep 1
  done
  echo "Waiting for server on port $1 failed."
  exit 1
}

function section_echo {
  echo ${GREEN_COLOR}$1${NORMAL_COLOR}
}

section_echo 'Download and install closure linter'
sudo easy_install $GJSLINT_PACKAGE_URL
echo

section_echo 'make lint'
make lint
LINT_RESULT_STATUS=$?
echo

section_echo 'Download Firefox and install all test-agent-server dependencies'
curl "$FIREFOX_URL" | tar jx
make common-install
echo

# Make gaia for test-agent environment
DEBUG=1 WGET_OPTS=-nv make

section_echo 'Start test-agent-server and waiting for server to start on port 8789'
make test-agent-server &
waiting_port 8789

section_echo 'Start Firefox'
firefox/firefox -profile `pwd`/profile "$TESTAGENT_URL" &
waiting_port 8080
sleep 5

section_echo 'make test-agent-test'
make test-agent-test
TEST_RESULT_STATUS=$?
echo

[ $LINT_RESULT_STATUS -ne 0 ] &&\
echo ${RED_COLOR}Lint error. Scroll up to see the output.${NORMAL_COLOR}

exit `expr $LINT_RESULT_STATUS + $TEST_RESULT_STATUS`;
