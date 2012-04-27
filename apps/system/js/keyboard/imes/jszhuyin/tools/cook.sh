#!/bin/bash

# get a copy of SpiderMonkey Javascript Shell to run this file
# http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-trunk/

JSSHELL=js

if [ -z $1 ]; then
  echo 'Convert data.txt from McBopomofo'
  echo
  echo Usage: $0 [data.txt]
  exit
fi

if [ ! -f $1 ]; then
  echo 'Error: data.txt not found.'
  exit
fi

echo 'Cooking words.json ...'

cat $1 | \
$JSSHELL -U `dirname $0`/cook.js words > `dirname $0`/../words.json

echo 'Cooking phrases.json ...'
cat $1 | \
$JSSHELL -U `dirname $0`/cook.js phrases > `dirname $0`/../phrases.json
