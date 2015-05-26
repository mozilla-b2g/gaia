#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo "Must provide number of iterations"
  exit 1
fi

REMOTE_DIR=
for dir in /sdcard /storage/sdcard /storage/sdcard0; do
  if [ -n "$(adb shell "test -d $dir && echo found")" ]; then
    REMOTE_DIR=$dir
    break
  fi
done

if [ -z "$REMOTE_DIR" ]; then
  echo "Can't find remote dir" >&2
  exit 1
fi

for i in `seq -f '%04g' 1 $1` ; do
  echo $i > n
  FILENAME=test$i.mp3
  cat prefix n suffix > $FILENAME

  adb push ${SCRIPT_DIR}/${FILENAME} ${REMOTE_DIR}/FakeMusic/${FILENAME} || exit 1

  rm $FILENAME
  rm n
done
