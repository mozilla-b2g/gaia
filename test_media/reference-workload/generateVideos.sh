#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo Must provide number of iterations
  exit
fi

if [ "$1" != "0" ]; then
# REMOTE_DIR="/sdcard/Movies"
  REMOTE_DIR=
  for dir in /sdcard /storage/sdcard0; do
    if [ -n "$(adb shell "test -d $dir && echo found")" ]; then
      REMOTE_DIR=$dir
      break
    fi
  done
  adb push ${SCRIPT_DIR}/MasterVideo.3gp ${REMOTE_DIR}/Movies/VID_0001.3gp

  for i in `seq -f '%04g' 2 $1` ; do
    FILENAME=VID_$i.3gp
    adb shell "cat ${REMOTE_DIR}/Movies/VID_0001.3gp > ${REMOTE_DIR}/Movies/${FILENAME}"
  done

fi
