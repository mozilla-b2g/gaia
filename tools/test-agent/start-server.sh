#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
START_CMD="$DIR/node_modules/test-agent/bin/js-test-agent server -c $DIR/test-agent-server.js --http-path $DIR/../../ --growl"

type node > /dev/null 2> /dev/null
echo $(which type);

if [ $? -eq 0 ]; 
then
  echo "Check - node is present!"
else
  echo "Please Install NodeJS -- (use aptitude on linux or homebrew on osx)"
  exit;
fi

type node-waf > /dev/null 2> /dev/null

if [ $? -eq 0 ]; 
then
  echo "Check - node-waf is present!"
else
  echo "Node js is installed but node-waf is not. Please install nodejs-dev or the equivalent for your os"
  exit;
fi


type npm > /dev/null 2> /dev/null

if [ $? -eq 0 ]
then
  echo "Check - NPM is present"
else
  echo "Please install NPM (node package manager) -- http://npmjs.org/"
  exit;
fi



cd $DIR && npm install $DIR

echo "Check - js-test-agent is present -- starting:"
$START_CMD
