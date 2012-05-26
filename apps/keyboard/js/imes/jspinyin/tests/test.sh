#!/bin/bash

# get a copy of SpiderMonkey Javascript Shell to run this file
# http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-trunk/

JSSHELL=js
cwd=`dirname $0`
for i in `find $cwd/test*.js`
do
  $JSSHELL -U $i
done