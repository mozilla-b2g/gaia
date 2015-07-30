#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then
  echo Must provide number of iterations
  exit 1
fi

if [ "$1" != "0" ]; then
# REMOTE_DIR="/sdcard/Movies"
  REMOTE_DIR=
  for dir in /sdcard /storage/sdcard /storage/sdcard0; do
    if [ -n "$($ADB_REF shell "test -d $dir && echo found")" ]; then
      REMOTE_DIR=$dir
      break
    fi
  done
  if [ -z "$REMOTE_DIR" ]; then
    echo "Can't find remote dir" >&2
    exit 1
  fi
  $ADB_REF push ${SCRIPT_DIR}/MasterVideo.3gp ${REMOTE_DIR}/Movies/VID_0001.3gp || exit 1

  for i in `seq -f '%04g' 2 $1` ; do
    FILENAME=VID_$i.3gp
    $ADB_REF shell "cat ${REMOTE_DIR}/Movies/VID_0001.3gp > ${REMOTE_DIR}/Movies/${FILENAME}"
  done

fi
