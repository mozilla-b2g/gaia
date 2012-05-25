#!/bin/bash

# get a copy of SpiderMonkey Javascript Shell to run this file
# http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-trunk/

JSSHELL=js

if [ ! -f data.txt ]; then
  echo 'Error: data.txt not found.'
  exit
fi

if [ ! -f data-tr.txt ]; then
  echo 'Error: data-tr.txt not found.'
  exit
fi

echo 'Cooking db.json ...'

cat data.txt | \
$JSSHELL -U `dirname $0`/cook.js > `dirname $0`/../db.json

echo 'Cooking db-tr.json ...'

cat data-tr.txt | \
$JSSHELL -U `dirname $0`/cook.js > `dirname $0`/../db-tr.json
