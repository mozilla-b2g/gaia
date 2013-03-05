#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo Must provide number of iterations
fi

adb push ${SCRIPT_DIR}/MasterGalleryImage.jpg /mnt/sdcard/DCIM/100MZLLA/IMG_0001.jpg

COUNT=1
while [ ${COUNT} -lt $1 ]; do
  let INDEX=COUNT+1
  FILENAME=IMG_$(printf "%04d" $INDEX).jpg
  adb shell 'cat /sdcard/DCIM/100MZLLA/IMG_0001.jpg > '/sdcard/DCIM/100MZLLA/${FILENAME}
  let COUNT=COUNT+1
done

