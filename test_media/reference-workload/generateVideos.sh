#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo Must provide number of iterations
  exit
fi

if [ "$1" != "0" ]; then
  REMOTE_DIR="/sdcard/Movies"
  adb push ${SCRIPT_DIR}/MasterVideo.3gp ${REMOTE_DIR}/VID_0001.3gp

  for i in `seq -f '%04g' 2 $1` ; do
    FILENAME=VID_$i.3gp
    adb shell "cat ${REMOTE_DIR}/VID_0001.3gp > ${REMOTE_DIR}/${FILENAME}"
  done

fi
