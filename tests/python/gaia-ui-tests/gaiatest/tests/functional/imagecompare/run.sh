#!/bin/bash -v
timestamp=$(date +'%Y-%m-%d-%H-%M')
flashlog=$timestamp'_flash.log'
runlog=$timestamp'_run.log'
comparelog=$timestamp'_compare.log'
zipfile=$timestamp'_zipped.zip'
virtualenvname=default
gaiahome=~/ImgCmpTest/gaia/tests/python/gaia-ui-tests
username=npark@mozilla.com
password=A2mw9q01mozilla
config=b2g-7.json


# go to the flash tool and flash a new master build to the device
cd ~/B2G-flash-tool
git pull
./flash_pvt.py -v central -d hamachi -g -G --eng -u $username -p $password >  $flashlog

# zip the contents of the shots folder and save elsewhere
rm $gaiahome/shots/*

# sleep for 5 minutes, give time until the phone boots up
sleep 5m

# go to the gaia folder, and setup adb and execute the manifest
cd $gaiahome
git pull
adb forward tcp:2828 tcp:2828
workon $virtualenvname
gaiatest --address=localhost:2828 --testvars=gaiatest/$config --restart  --type=b2g gaiatest/tests/functional/imagecompare/manifest.ini > $runlog


# copy all data into the shots folders
mv ~/B2G-flash-tool/$flashlog $gaiahome/shots/
mv $gaiahome/$runlog $gaiahome/shots/
zip -r $zipfile $gaiahome/shots/*