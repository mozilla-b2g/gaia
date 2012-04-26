#! /usr/bin/env sh
APP_DIR=./apps
APP_DIR_LEN=`expr $APP_DIR : '.*'`
APP_WEBAPPS=$APP_DIR/webapps.json
APP_DESKTOP_CACHE=$APP_DIR/homescreen/apps-manifest-fallback.json

## Truncate
cat < /dev/null > $APP_DESKTOP_CACHE

echo "Creating Desktop App Manifest Shim ($APP_DESKTOP_CACHE)"

echo "{\"webapps\": \n $(cat $APP_WEBAPPS), \"manifests\": { \n" >> $APP_DESKTOP_CACHE

APP_ARR_LEN=0
APP_MANIFEST_ARR=();

for APP_LOC in `find $APP_DIR -type d -depth 1`
do
  APP_NAME=${APP_LOC:(($APP_DIR_LEN+1))}
  APP_MANIFEST_FILE=$APP_LOC/manifest.json
  if [ -f $APP_MANIFEST_FILE ];
  then
    APP_MANIFEST_ARR[$APP_ARR_LEN]="\"$APP_NAME\": $(cat $APP_MANIFEST_FILE)"
    APP_ARR_LEN=$(($APP_ARR_LEN+1))
  fi
done

SAVE_IFS=$IFS
IFS=","
echo "${APP_MANIFEST_ARR[*]}" >> $APP_DESKTOP_CACHE
echo "}}" >> $APP_DESKTOP_CACHE
IFS=$SAVE_IFS

echo "Done"
