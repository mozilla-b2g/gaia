#!/bin/bash

# Helper script to gather reordering logs for application.zip files.

GAIA_BASE=`dirname $0`/..

JAR_LOG=/data/local/tmp/jarloader.log

adb remount
adb shell stop b2g
adb shell rm ${JAR_LOG}
echo "Restarting in ordering mode"
adb shell setprop moz.jar.log 1
adb shell start b2g
echo "Start the applications you want to reorder, and press [Enter] once done."
read foo
echo "Restarting in standard mode"
adb shell stop b2g
adb pull ${JAR_LOG} && adb shell rm ${JAR_LOG}
adb shell setprop moz.jar.log ""
adb shell start b2g

# Entries in the log file look like:
# file:///system/b2g/omni.ja chrome/chrome.manifest
# file:///data/local/webapps/system.gaiamobile.org/application.zip index.html

APPS=`cut -f 1 -d ' ' jarloader.log | sort -u | grep gaiamobile | cut -c 8-`
for app in $APPS ;
do
	APPNAME=`echo "$app" | sed 's/\([a-z]*\/\)\([a-z]*.gaiamobile.org\)\(\/application.zip\)/\1 \2 \3/' | cut -f 2 -d ' ' | cut -f 1 -d '.'`
	grep $app jarloader.log | cut -f 2 -d ' ' > ${GAIA_BASE}/apps/${APPNAME}/application.zip.log
done
