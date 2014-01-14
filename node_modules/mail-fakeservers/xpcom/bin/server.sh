#!/bin/bash

# Determine current location
SOURCE="${BASH_SOURCE[0]}"
if [ -h "$SOURCE" ];
then
  ORIG_SOURCE=$SOURCE;
  while [ -h "$SOURCE" ] ; do SOURCE="$(readlink "$SOURCE")"; done
  DIR="$( cd "$(dirname $ORIG_SOURCE)" && cd -P "$( dirname "$SOURCE" )" && pwd )"
else
  DIR="$( cd "$( dirname "$SOURCE" )" && pwd )"
fi

DIR=`cd $DIR/../ && pwd`
echo $DIR;
ROOT=`dirname $DIR/`

which xpcshell 2>&1 1> /dev/null

if [ "$?" != "0" ]
then
  echo "xpcshell must be in your path";
  exit 1;
fi

CONFIG="const _ARGV=\"$@\";"
CONFIG="$CONFIG const _ROOT='$ROOT/';"

`which run-mozilla.sh` `which xpcshell` -w -e "$CONFIG" -f "$1"
