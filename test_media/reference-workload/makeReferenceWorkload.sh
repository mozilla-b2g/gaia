#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then
  echo "Must provide size parameter (light/medium/heavy/x-heavy)"
  exit
fi

if ! type adb > /dev/null 2>&1; then
  echo "adb required to run reference-workloads"
  exit
fi

echo "Waiting for device to be connected..."
adb wait-for-device
echo "Device connected"

case $1 in

  empty)
    IMAGE_COUNT=0
    MUSIC_COUNT=0
    VIDEO_COUNT=0
    CONTACT_COUNT=0
    SMS_COUNT=0
    DIALER_COUNT=0
    CAL_COUNT=0
  ;;

  light)
    IMAGE_COUNT=20
    MUSIC_COUNT=20
    VIDEO_COUNT=5
    CONTACT_COUNT=200
    SMS_COUNT=200
    DIALER_COUNT=50
    CAL_COUNT=900
  ;;

  medium)
    IMAGE_COUNT=50
    MUSIC_COUNT=50
    VIDEO_COUNT=10
    CONTACT_COUNT=500
    SMS_COUNT=500
    DIALER_COUNT=100
    CAL_COUNT=1300
  ;;

  heavy)
    IMAGE_COUNT=100
    MUSIC_COUNT=100
    VIDEO_COUNT=20
    CONTACT_COUNT=1000
    SMS_COUNT=1000
    DIALER_COUNT=200
    CAL_COUNT=2400
  ;;

  x-heavy)
    IMAGE_COUNT=250
    MUSIC_COUNT=250
    VIDEO_COUNT=50
    CONTACT_COUNT=2000
    SMS_COUNT=2000
    DIALER_COUNT=500
    CAL_COUNT=3200
  ;;

  *)
    echo "Size parameter must be one of (empty/light/medium/heavy/x-heavy)"
    exit

esac

echo "Populate Databases - $1 Workload"

adb shell stop b2g
APPS=${APPS:-${APP}}

IDB_BASE=
for dir in /data/local/storage/persistent /data/local/indexedDB; do
  if [ -n "$(adb shell "test -d $dir/chrome && echo found")" ]; then
    IDB_BASE=$dir
    break
  fi
done
if [ -z "$IDB_BASE" ]; then
  echo "Can't find indexedDB base dir" >&2
  exit 1
fi
echo "IndexedDB base dir: $IDB_BASE"
IDB_PRESENT=$(adb shell "ls -l $IDB_BASE/chrome/" | grep '^d.*idb')
if [ -z "$IDB_PRESENT" ]; then
  echo "idb directory not present"
  IDB_PATH=""
else
  echo "idb directory present"
  IDB_PATH="/idb"
fi

if [ -z "$APPS" ]; then
  APPS="gallery music video communications/contacts sms communications/dialer calendar"
fi

SUMMARY="Summary:\n"

for app in $APPS; do

  LINE=
  case $app in
    communications/dialer)
      echo "Starting dialer"
      adb pull /data/local/webapps/webapps.json $SCRIPT_DIR/webapps.json
      DIALER_INFO=$(python $SCRIPT_DIR/readJSON.py $SCRIPT_DIR/webapps.json "communications.*/localId")
      IFS='/' read -a DIALER_PARTS <<< "$DIALER_INFO"
      DIALER_DOMAIN=${DIALER_PARTS[0]}
      DIALER_ID=${DIALER_PARTS[1]}
      DIALER_DIR="$DIALER_ID+f+app+++$DIALER_DOMAIN"
      rm -f $SCRIPT_DIR/webapps.json
      if [ -z "$DIALER_ID" ]; then
        echo "Unable to determine communications application ID - skipping dialer history..."
        LINE=" Dialer History: skipped"
      else
        adb push  $SCRIPT_DIR/dialerDb-$DIALER_COUNT.sqlite $IDB_BASE/$DIALER_DIR$IDB_PATH/2584670174dsitanleecreR.sqlite
        LINE=" Dialer History: $(printf "%4d" $DIALER_COUNT)"
      fi
      ;;

    gallery)
      echo "Starting gallery"
      $SCRIPT_DIR/generateImages.sh $IMAGE_COUNT
      LINE=" Gallery:        $(printf "%4d" $IMAGE_COUNT)"
      ;;

    music)
      echo "Starting music"
      $SCRIPT_DIR/generateMusicFiles.sh $MUSIC_COUNT
      LINE=" Music:          $(printf "%4d" $MUSIC_COUNT)"
      ;;

    video)
      echo "Starting video"
      $SCRIPT_DIR/generateVideos.sh $VIDEO_COUNT
      LINE=" Videos:         $(printf "%4d" $VIDEO_COUNT)"
      ;;

    communications/contacts)
      echo "Starting contacts"
      adb push  $SCRIPT_DIR/contactsDb-$CONTACT_COUNT.sqlite $IDB_BASE/chrome$IDB_PATH/3406066227csotncta.sqlite
      ATTACHMENT_DIR=$SCRIPT_DIR/contactsDb-$CONTACT_COUNT
      tar -xvzf $SCRIPT_DIR/ContactPictures-$CONTACT_COUNT.tar.gz -C $SCRIPT_DIR
      adb shell "rm $IDB_BASE/chrome$IDB_PATH/3406066227csotncta/*"
      adb push  $SCRIPT_DIR/contactsDb-$CONTACT_COUNT/ $IDB_BASE/chrome$IDB_PATH/3406066227csotncta/
      rm -rf $ATTACHMENT_DIR/
      LINE=" Contacts:       $(printf "%4d" $CONTACT_COUNT)"
      ;;

    sms)
      echo "Starting sms"
      adb push  $SCRIPT_DIR/smsDb-$SMS_COUNT.sqlite $IDB_BASE/chrome$IDB_PATH/226660312ssm.sqlite
      ATTACHMENT_DIR=$SCRIPT_DIR/smsDb-$SMS_COUNT
      tar -xvzf $SCRIPT_DIR/Attachments-$SMS_COUNT.tar.gz -C $SCRIPT_DIR
      adb shell "rm $IDB_BASE/chrome$IDB_PATH/226660312ssm/*"
      adb push  $SCRIPT_DIR/smsDb-$SMS_COUNT/ $IDB_BASE/chrome$IDB_PATH/226660312ssm/
      rm -rf $ATTACHMENT_DIR/
      LINE=" Sms Messages:   $(printf "%4d" $SMS_COUNT)"
      ;;

    calendar)
	  echo "Starting calendar"
      if [ -z "$IDB_PRESENT" ]; then
        echo "Can't push calendar to b2g18 phone..."
        LINE=" Calendar: skipped"
      else
        adb pull /data/local/webapps/webapps.json $SCRIPT_DIR/webapps.json
        CAL_INFO=$(python $SCRIPT_DIR/readJSON.py $SCRIPT_DIR/webapps.json "calendar.*/localId")
        IFS='/' read -a CAL_PARTS <<< "$CAL_INFO"
        CAL_DOMAIN=${CAL_PARTS[0]}
        CAL_ID=${CAL_PARTS[1]}
        CAL_DIR="$CAL_ID+f+app+++$CAL_DOMAIN"
        rm -f $SCRIPT_DIR/webapps.json
        if [ -z "$CAL_ID" ]; then
          echo "Unable to determine calendar application ID - skipping calendar..."
          LINE=" Calendar: skipped"
        else
          adb push  $SCRIPT_DIR/calendarDb-$CAL_COUNT.sqlite $IDB_BASE/$CAL_DIR$IDB_PATH/125582036br2agd-nceal.sqlite
          LINE=" Calendar:   $(printf "%4d" $CAL_COUNT)"
        fi
      fi
      ;;

    *)
      echo "APPS includes unknown application name ($app) - ignoring..."
      LINE=" $app: unknown application name"
  esac

  if [ -n "$LINE" ]; then
    SUMMARY="$SUMMARY$LINE\n"
  fi

done

echo ""
echo -e "$SUMMARY"

adb shell start b2g

echo "Done"
