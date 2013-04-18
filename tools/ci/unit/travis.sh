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
  echo ${GREEN_COLOR}`seq -s= $(expr ${#1} + 1)|tr -d '[:digit:]'`${NORMAL_COLOR}
}

echo
section_echo 'Preparing test environment'

echo 'Downloading and installing closure linter'
sudo easy_install $GJSLINT_PACKAGE_URL &> /dev/null

echo 'Downloading Firefox'
curl -s "$FIREFOX_URL" | tar jx &> /dev/null

echo 'Downloading & installing node dependencies'
make common-install &> /dev/null

# Make gaia for test-agent environment
echo 'Downloading xulrunner-sdk and making profile for testing (more than 5 minutes)'
DEBUG=1 WGET_OPTS=-nv make &> /dev/null

echo 'Starting test-agent-server and waiting for server to start on port 8789'
make test-agent-server &> /dev/null &
waiting_port 8789

echo 'Starting Firefox'
firefox/firefox -profile `pwd`/profile "$TESTAGENT_URL" &> /dev/null &
waiting_port 8080
sleep 5

echo
section_echo 'make lint'
make lint
LINT_RESULT_STATUS=$?
echo

section_echo 'make test-agent-test'
make test-agent-test REPORTER=Min
TEST_RESULT_STATUS=$?
echo

[ $LINT_RESULT_STATUS -ne 0 ] &&\
echo ${RED_COLOR}Lint error. Scroll up to see the output.${NORMAL_COLOR}

exit `expr $LINT_RESULT_STATUS + $TEST_RESULT_STATUS`;
