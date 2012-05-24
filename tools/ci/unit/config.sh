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

# File to use for test output
if [ -z "$TEST_OUTPUT"];
then
  TEST_OUTPUT=$B2G_HOME/test-output.xml;
fi
