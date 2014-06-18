#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo Must provide number of iterations
  exit
fi

if [ "$1" != "0" ]; then
#  REMOTE_DIR="/sdcard/DCIM/100MZLLA"
  REMOTE_DIR=
  for dir in /sdcard /storage/sdcard0; do
    if [ -n "$(adb shell "test -d $dir && echo found")" ]; then
      REMOTE_DIR=$dir
      break
    fi
  done

  adb push ${SCRIPT_DIR}/MasterGalleryImage.jpg ${REMOTE_DIR}/DCIM/100MZLLA/IMG_0001.jpg

  for i in `seq -f '%04g' 2 $1` ; do
    FILENAME=IMG_$i.jpg
    adb shell "cat ${REMOTE_DIR}/DCIM/100MZLLA/IMG_0001.jpg > ${REMOTE_DIR}/DCIM/100MZLLA/${FILENAME}"
  done
fi
