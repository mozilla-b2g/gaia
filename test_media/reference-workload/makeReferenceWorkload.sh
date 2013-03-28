#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then
  echo "Must provide size parameter (light/medium/heavy/x-heavy)"
  exit
fi

case $1 in

  light)
    IMAGE_COUNT=20
    MUSIC_COUNT=20
    VIDEO_COUNT=5
    CONTACT_COUNT=200
    SMS_COUNT=200
    DIALER_COUNT=50
  ;;

  medium)
    IMAGE_COUNT=50
    MUSIC_COUNT=50
    VIDEO_COUNT=10
    CONTACT_COUNT=500
    SMS_COUNT=500
    DIALER_COUNT=100
  ;;

  heavy)
    IMAGE_COUNT=100
    MUSIC_COUNT=100
    VIDEO_COUNT=20
    CONTACT_COUNT=1000
    SMS_COUNT=1000
    DIALER_COUNT=200
  ;;

  x-heavy)
    IMAGE_COUNT=250
    MUSIC_COUNT=250
    VIDEO_COUNT=50
    CONTACT_COUNT=2000
    SMS_COUNT=2000
    DIALER_COUNT=500
  ;;

  *)
    echo "Size parameter must be one of (light/medium/heavy/x-heavy)"
    exit

esac

echo "Populate Databases - $1 Workload"

adb pull /data/local/webapps/webapps.json $SCRIPT_DIR/webapps.json
DIALER_INFO=$(python $SCRIPT_DIR/readJSON.py $SCRIPT_DIR/webapps.json "communications.*/localId")

IFS='/' read -a DIALER_PARTS <<< "$DIALER_INFO"
DIALER_DOMAIN=${DIALER_PARTS[0]}
DIALER_ID=${DIALER_PARTS[1]}
DIALER_DIR="$DIALER_ID+f+app+++$DIALER_DOMAIN"
rm $SCRIPT_DIR/webapps.json

adb shell stop b2g
$SCRIPT_DIR/generateImages.sh $IMAGE_COUNT
$SCRIPT_DIR/generateMusicFiles.sh $MUSIC_COUNT
$SCRIPT_DIR/generateVideos.sh $VIDEO_COUNT
adb push  $SCRIPT_DIR/contactsDb-$CONTACT_COUNT.sqlite /data/local/indexedDB/chrome/3406066227csotncta.sqlite
adb push  $SCRIPT_DIR/smsDb-$SMS_COUNT.sqlite /data/local/indexedDB/chrome/226660312ssm.sqlite
if [ -z "$DIALER_ID" ]; then
  echo "Unable to determine communications application ID - skipping dialer history..."
else
  adb push  $SCRIPT_DIR/dialerDb-$DIALER_COUNT.sqlite /data/local/indexedDB/$DIALER_DIR/2584670174dsitanleecreR.sqlite
fi
adb shell start b2g

echo ""
echo "Images:         $(printf "%4d" $IMAGE_COUNT)"
echo "Songs:          $(printf "%4d" $MUSIC_COUNT)"
echo "Videos:         $(printf "%4d" $VIDEO_COUNT)"
echo "Contacts:       $(printf "%4d" $CONTACT_COUNT)"
echo "Sms Messages:   $(printf "%4d" $SMS_COUNT)"
echo "Dialer History: $(printf "%4d" $DIALER_COUNT)"

echo "Done"
