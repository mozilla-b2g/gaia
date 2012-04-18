#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
START_CMD="js-test-agent server -c $DIR/test-agent-server.js --http-path $DIR/../../"

type node > /dev/null 2> /dev/null

if [ $? == 0 ]
then
  echo "Check - Node is present!"
else
  echo "Please Install NodeJS -- (use aptitude on linux or homebrew on osx)"
  exit;
fi

type npm > /dev/null 2> /dev/null

if [ $? == 0 ]
then
  echo "Check - NPM is present"
else
  echo "Please install NPM (node package manager) -- http://npmjs.org/"
  exit;
fi

type js-test-agent > /dev/null 2> /dev/null

if [ $? == 0 ]
then
  echo "Check - js-test-agent is present -- starting:"
  $START_CMD
else
  echo "Warn: js-test-agent is missing -- installing"
  npm install -g test-agent
  $START_CMD
fi
