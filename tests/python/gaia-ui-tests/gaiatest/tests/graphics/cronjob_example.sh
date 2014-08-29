#!/bin/bash
PATH=/usr/lib/lightdm/lightdm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/home/webqa/android-sdk-linux/sdk/platform-tools:/home/webqa/android-sdk-linux/sdk/tools

TIMESTAMP=$(date +'%Y-%m-%d-%H-%M')
FLASHLOG=$TIMESTAMP'_flash.log'
RUNLOG=$TIMESTAMP'_run.log'
COMPARELOG=$TIMESTAMP'_compare.log'
ZIPFILE=$TIMESTAMP'_zipped.zip'
VENV=pathtoyourvirtualenv
GAIAHOME=~/ImgCmpTest/gaia/tests/python/gaia-ui-tests
USERNAME=putyourusername
PASSWORD=putyourpassword
TESTVAR=putyourtestvarname
SHOTS=putyourshotfolder
set -x #echo on

# go to the flash tool and flash a new master build to the device
cd ~/B2G-flash-tool
git pull
./flash_pvt.py -v mozilla-central -d flame -g -G --eng -u $USERNAME -p $PASSWORD >  $FLASHLOG

# purge previous test artifacts
rm $GAIAHOME/$SHOTS/*

# sleep for 2 minutes, give time until the phone boots up
sleep 2m

# go to the gaia folder, and setup adb and execute the manifest
cd $GAIAHOME
echo "Activating the new environment"
source ${VENV}/bin/activate
if [ ! -n "${VIRTUAL_ENV:+1}" ]; then
echo "### Failure in activating the new virtual environment: '${DIR_ENV}'"
exit 1
fi

adb forward tcp:2828 tcp:2828
gaiatest --address=localhost:2828 --testvars=gaiatest/$TESTVAR --restart  --type=b2g gaiatest/tests/functional/imagecompare/manifest.ini > $RUNLOG

# copy all data into the shots folders
mv ~/B2G-flash-tool/$FLASHLOG $GAIAHOME/$SHOTS/
mv $GAIAHOME/$RUNLOG $GAIAHOME/$SHOTS/
zip -r $ZIPFILE $GAIAHOME/$SHOTS/*
