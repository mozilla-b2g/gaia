#!/bin/bash

# push the images to the sdcard of the attached device.
# push them in reverse numerical order and give them timestamps that
# are one second apart, so that when Gallery lists them from newest to
# oldest, we'll see image 01 first and image 65 last.
(( t = `date +%s` ))
for i in `ls ??.{jpg,png,gif,bmp} x??.{jpg,png,gif,bmp} | sort -r`; do
  adb push $i /storage/sdcard0/TestImages/$i
  (( t += 1 ))
  adb shell touch -t $t /storage/sdcard0/TestImages/$i
done

