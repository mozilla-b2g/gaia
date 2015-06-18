#!/bin/bash

set -e

SCRIPT_DIR=$(cd $(dirname $0); pwd)

json=$BUILD_CONFIG
prop='ADB'

function jsonval {
  temp=`echo $json | sed 's/\\\\\//\//g' | sed 's/[{}]//g' | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\:\"/\|/g' | sed 's/[\,]/ /g' | sed 's/\"//g' | grep -w $prop| cut -d":" -f2| sed -e 's/^ *//g' -e 's/ *$//g'`
  echo ${temp##*|}
}

ADB=$(jsonval)

if [ -z "$1" ]; then
  echo "Must provide size parameter (light/medium/heavy/x-heavy)"
  exit 1
fi

echo "Waiting for device to be connected..."
$ADB wait-for-device
echo "Device connected"

case $1 in

  empty)
    IMAGE_COUNT=0
    MUSIC_COUNT=0
    VIDEO_COUNT=0
    CONTACT_COUNT=0
    SMS_COUNT=0
    DIALER_COUNT=0
  ;;

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
    echo "Size parameter must be one of (empty/light/medium/heavy/x-heavy)"
    exit 1

esac

echo "Populate Databases - $1 Workload"

$ADB shell stop b2g
APPS=${APPS:-${APP}}

IDB_BASE=
for dir in /data/local/storage/permanent /data/local/storage/persistent /data/local/indexedDB; do
  if [ -n "$($ADB shell "test -d $dir/chrome && echo found")" ]; then
    IDB_BASE=$dir

    if [ "$IDB_BASE" == "/data/local/storage/permanent" ]; then
      IDB_DEFAULT_BASE=/data/local/storage/default
    else
      IDB_DEFAULT_BASE="$IDB_BASE"
    fi

    break
  fi
done
if [ -z "$IDB_BASE" ]; then
  echo "Can't find indexedDB base dir" >&2
  exit 1
fi
echo "IndexedDB base dir: $IDB_BASE"
IDB_PRESENT=$($ADB shell "ls -l $IDB_BASE/chrome/" | grep '^d.*idb')
if [ -z "$IDB_PRESENT" ]; then
  echo "idb directory not present"
  IDB_PATH=""
else
  echo "idb directory present"
  IDB_PATH="/idb"
fi

if [ -z "$APPS" ]; then
  APPS="gallery music video communications/contacts sms communications/dialer"
fi

# Convert comma-separate APPS to space-separated
APPS=${APPS//,/ }

SUMMARY="Summary:\n"

for app in $APPS; do

  LINE=
  case $app in
    communications/dialer)
      echo "Starting dialer"
      $ADB pull /data/local/webapps/webapps.json $SCRIPT_DIR/webapps.json || exit 1
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
        $ADB push  $SCRIPT_DIR/dialerDb-$DIALER_COUNT.sqlite $IDB_DEFAULT_BASE/$DIALER_DIR$IDB_PATH/2584670174dsitanleecreR.sqlite || exit 1
        LINE=" Dialer History: $(printf "%4d" $DIALER_COUNT)"
      fi
      ;;

    gallery)
      echo "Starting gallery"
      $SCRIPT_DIR/generateImages.sh $IMAGE_COUNT || exit 1
      LINE=" Gallery:        $(printf "%4d" $IMAGE_COUNT)"
      ;;

    music)
      echo "Starting music"
      $SCRIPT_DIR/generateMusicFiles.sh $MUSIC_COUNT || exit 1
      LINE=" Music:          $(printf "%4d" $MUSIC_COUNT)"
      ;;

    video)
      echo "Starting video"
      $SCRIPT_DIR/generateVideos.sh $VIDEO_COUNT || exit 1
      LINE=" Videos:         $(printf "%4d" $VIDEO_COUNT)"
      ;;

    communications/contacts)
      echo "Starting contacts"
      # Accross versions, we can have various names for the attachment
      # directory, so let's delete all of them
      $ADB shell "rm -r $IDB_BASE/chrome$IDB_PATH/*csotncta*"
      $ADB push  $SCRIPT_DIR/contactsDb-$CONTACT_COUNT.sqlite $IDB_BASE/chrome$IDB_PATH/3406066227csotncta.sqlite || exit 1
      ATTACHMENT_DIR=$SCRIPT_DIR/contactsDb-$CONTACT_COUNT
      tar -xvzf $SCRIPT_DIR/ContactPictures-$CONTACT_COUNT.tar.gz -C $SCRIPT_DIR
      # In recent builds, the directory will be automatically renamed to
      # 3406066227csotncta.files when B2G starts up.
      $ADB push  $SCRIPT_DIR/contactsDb-$CONTACT_COUNT/ $IDB_BASE/chrome$IDB_PATH/3406066227csotncta/ || exit 1
      rm -rf $ATTACHMENT_DIR/
      LINE=" Contacts:       $(printf "%4d" $CONTACT_COUNT)"
      ;;

    sms)
      echo "Starting sms"
      # Accross versions, we can have various names for the attachment
      # directory, so let's delete all of them
      $ADB shell "rm -r $IDB_BASE/chrome$IDB_PATH/*ssm*"
      $ADB push  $SCRIPT_DIR/smsDb-$SMS_COUNT.sqlite $IDB_BASE/chrome$IDB_PATH/226660312ssm.sqlite || exit 1
      ATTACHMENT_DIR=$SCRIPT_DIR/smsDb-$SMS_COUNT
      tar -xvzf $SCRIPT_DIR/Attachments-$SMS_COUNT.tar.gz -C $SCRIPT_DIR
      # In recent builds, the directory will be automatically renamed to
      # 226660312ssm.files when B2G starts up.
      $ADB push  $SCRIPT_DIR/smsDb-$SMS_COUNT/ $IDB_BASE/chrome$IDB_PATH/226660312ssm/ || exit 1
      rm -rf $ATTACHMENT_DIR/
      LINE=" Sms Messages:   $(printf "%4d" $SMS_COUNT)"
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

$ADB shell start b2g

echo "Done"
