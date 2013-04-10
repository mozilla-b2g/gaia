#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo Must provide number of iterations
  exit
fi

if [ "$1" != "0" ]; then
  REMOTE_DIR="/sdcard/DCIM/100MZLLA"
  adb push ${SCRIPT_DIR}/MasterGalleryImage.jpg ${REMOTE_DIR}/IMG_0001.jpg

  for i in `seq -f '%04g' 2 $1` ; do
    FILENAME=IMG_$i.jpg
    adb shell "cat ${REMOTE_DIR}/IMG_0001.jpg > ${REMOTE_DIR}/${FILENAME}"
  done
fi
