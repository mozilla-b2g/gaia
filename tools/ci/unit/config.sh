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

if [ -z "$GAIA_TEST_FAST" ];
then
  GAIA_TEST_FAST=0;
fi

# File to use for test output
if [ -z "$TEST_OUTPUT" ];
then
  TEST_OUTPUT=$B2G_HOME/test-output.xml;
fi

export TEST_OUTPUT &&
export REPORTER &&
export GAIA_DOMAIN &&
export GAIA_PORT &&
export GAIA_PATH &&
export B2G_HOME &&
export TEST_FAST &&
export TEST_AGENT_SERVER;
