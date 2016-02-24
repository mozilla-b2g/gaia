#!/bin/bash

# Quick & dirty converter of packaged -> unpackaged apps.

HERE=`pwd`

GAIA_DISTRIBUTION_DIR=distros/pine NOFTU=1 PRODUCTION=1 make profile

if [ ! -d profile/webapps ]; then
  echo "No profile/webapps directory!"
  exit -1
fi

function push_app {
  app=$1
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
}

adb shell stop b2g

mkdir -p profile/apps
rm -rf profile/apps/*

cd profile/webapps
cp webapps.json $HERE/profile/apps

if [ $# -eq 1 ]; then
  push_app $1
else
  for app in *
  do
    push_app $app
  done
fi

cd $HERE

adb push profile/defaults/pref/user.js /system/b2g/defaults/pref
adb push profile/defaults/settings.json /system/b2g/defaults/

adb shell start b2g
