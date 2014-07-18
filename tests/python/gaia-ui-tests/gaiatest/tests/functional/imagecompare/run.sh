#!/bin/bash
flashlog=$(date +'%Y-%m-%d-%H-%M')_flash.log
runlog=$(date +'%Y-%m-%d-%H-%M')_run.log
comparelog=$(date +'%Y-%m-%d-%H-%M')_compare.log
virtualenvname=demo-gaiatest
gaiahome=~/GitRepo/gaia/tests/python/gaia-ui-tests
username=npark@mozilla.com
password=A2mw9q01mozilla
config=b2g-7.json


# go to the flash tool and flash a new master build to the device
cd ~/B2G-flash-tool
git pull
./flash_pvt.py -v central -d hamachi -g -G --eng -u $username -p $password >  $flashlog

# delete the contents in the shots folder
rm $gaiahome/shots/*

# go to the gaia folder, and setup adb and execute the manifest
cd $gaiahome
adb forward tcp:2828 tcp:2828
workon $virtualenvname
gaiatest --address=localhost:2828 --testvars=gaiatest/$config --restart  --type=b2g gaiatest/tests/functional/imagecompare/manifest.ini > $runlog


