#!/bin/bash

# get a copy of SpiderMonkey Javascript Shell to run this file
# http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-trunk/

JSSHELL=js

if [ -z $1 ]; then
  echo 'Convert data.txt to json db'
  echo
  echo Usage: $0 [data.txt]
  exit
fi

if [ ! -f $1 ]; then
  echo 'Error: data.txt not found.'
  exit
fi

echo 'Cooking db.json ...'

cat $1 | \
$JSSHELL -U `dirname $0`/cook.js > `dirname $0`/../db.json
