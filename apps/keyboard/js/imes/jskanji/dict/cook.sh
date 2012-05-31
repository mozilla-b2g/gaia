#!/bin/bash

# get a copy of SpiderMonkey Javascript Shell to run this file
# http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-trunk/

JSSHELL=js #~/Downloads/jsshell-mac/js

if [ -z $1 ]; then
  echo 'Convert origin dict to json'
  echo
  echo Usage: $0 origin_dict_file
  exit
fi

if [ ! -f $1 ]; then
  echo 'Error: origin dict file is not found.'
  exit
fi

echo 'Cooking dict ...'

cat $1 | \
$JSSHELL -U `dirname $0`/cook.js > ../dict.json

echo 'Done'
