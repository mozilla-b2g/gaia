#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo Must provide number of iterations
fi

adb push ${SCRIPT_DIR}/MasterVideo.3gp /mnt/sdcard/Movies/VID_0001.3gp

COUNT=1
while [ ${COUNT} -lt $1 ]; do
  let INDEX=COUNT+1
  FILENAME=VID_$(printf "%04d" $INDEX).3gp
  adb shell 'cat /sdcard/Movies/VID_0001.3gp > '/sdcard/Movies/${FILENAME}
  let COUNT=COUNT+1
done


