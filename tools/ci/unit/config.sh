#!/bin/bash

# Location of the B2G REPO
if [ -z "$B2G_HOME" ];
then
  echo "B2G_HOME must be set";
  exit 1;
fi

# Websocket server location: 
# example: ws://localhost:8789
if [ -z "$TEST_AGENT_SERVER" ];
then
  echo "TEST_AGENT_SERVER must be set";
  exit 1;
fi

if [ -z "$EMULATOR_TYPE" ];
then
  EMULATOR_TYPE="x86";
fi

if [ -z "$GAIA_PATH" ];
then
  GAIA_PATH=`cd $CI_TOOLS/../../../; pwd`
fi

if [ -z "$REPORTER" ];
then
  REPORTER='XUnit';
fi

if [ -z "$GAIA_DOMAIN" ];
then
  GAIA_DOMAIN=trunk.gaiamobile.org
fi

if [ -z "$GAIA_PORT" ];
then
  GAIA_PORT=''
fi

if [ -z "$GAIA_SKIP_HOSTS" ];
then
  GAIA_SKIP_HOSTS=0;
fi
# File to use for test output
if [ -z "$TEST_OUTPUT" ];
then
  TEST_OUTPUT=$B2G_HOME/test-output.xml;
fi

EMULATOR_PATH="$B2G_HOME/out/target/product"
if [ "$EMULATOR_TYPE" == 'x86' ]
then
  EMULATOR_PATH="$EMULATOR_PATH/generic_x86";
else
  EMULATOR_PATH="$EMULATOR_PATH/generic";
fi

if [ -z "$ADB" ];
then
  #TODO: don't hard code it
  ADB="$B2G_HOME/out/host/linux-x86/bin/adb";
fi

if [ -z "$B2G_SCRIPTS" ];
then
  B2G_SCRIPTS="$GAIA_PATH/tools/test-agent/node_modules/b2g-scripts/bin/b2g-scripts";
fi

export ADB &&
export TEST_OUTPUT &&
export REPORTER &&
export GAIA_DOMAIN &&
export GAIA_PORT &&
export GAIA_PATH &&
export B2G_HOME &&
export TEST_FAST &&
export EMULATOR_TYPE &&
export EMULATOR_PATH &&
export B2G_SCRIPTS &&
export TEST_AGENT_SERVER;
