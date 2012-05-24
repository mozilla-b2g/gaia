#!/bin/bash

# get a copy of SpiderMonkey Javascript Shell to run this file
# http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-trunk/

JSSHELL=js

$JSSHELL -U `dirname $0`/test*.js 
