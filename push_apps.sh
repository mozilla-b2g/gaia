#!/bin/bash

# Quick & dirty converter of packaged -> unpackaged apps.

HERE=`pwd`

NOFTU=1 PRODUCTION=1 make profile

if [ ! -d profile/webapps ]; then
  echo "No profile/webapps directory!"
  exit -1
fi

adb shell stop b2g

mkdir -p profile/apps
rm -rf profile/apps/*

cd profile/webapps
cp webapps.json $HERE/profile/apps

for app in *
do
  if [ -d $app ]; then
    echo "Installing $app"
    cd $HERE/profile/apps
    mkdir $app
    cd $app
    unzip -qq $HERE/profile/webapps/$app/application.zip

    cd ..
    adb push $app /system/b2g/apps/$app

    cd $HERE/profile/webapps
  else
    if [ $app = "webapps.json" ]; then
      adb push $app /system/b2g/apps/$app
    fi
  fi
done

cd $HERE

adb push profile/defaults/pref/user.js /system/b2g/defaults/pref

adb shell start b2g
