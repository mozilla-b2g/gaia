#!/bin/bash
# This script is originally from the main Gaia Makefile.  It was moved
# to a standalone script because it grew to be 70 lines of oddly escaped bash
# inside of a Makefile

# Sadly, the exit code of this script isn't checked in the Makefile stanza.
# Things like files not being in the shared/*/ directories don't cause failure
#set -xe

GAIA_APP_SRCDIRS=$1 ; shift
BUILD_APP_NAME=$1 ; shift
GAIA_DOMAIN=$1 ; shift
pwd
rm -rf apps/system/camera
cp -r apps/camera apps/system/camera
rm apps/system/camera/manifest.webapp
mkdir -p profile/webapps
for appdir in $(find -L $GAIA_APP_SRCDIRS -mindepth 1 -maxdepth 1 -type d) ; do 
    if [ -f $appdir/manifest.webapp ]; then 
        appname=$(basename $appdir)
        if [ "$BUILD_APP_NAME" = "$appname" -o "$BUILD_APP_NAME" = "*" ]; then 
            dirname="$appname.$GAIA_DOMAIN"
            mkdir -p profile/webapps/$dirname

            # include shared JS scripts 
            for f in $(grep -r shared/js $appdir) ; do 

                if [[ "$f" == *shared/js* ]] ; then 
                    if [[ "$f" == */shared/js* ]] ; then 
                        file_to_copy=$(echo "$f" | cut -d'/' -f 4 | cut -d'"' -f1 | cut -d"'" -f1;) 
                    else 
                        file_to_copy=$(echo "$f" | cut -d'/' -f 3 | cut -d'"' -f1 | cut -d"'" -f1;)
                    fi
                    mkdir -p $appdir/shared/js
                    cp shared/js/$file_to_copy $appdir/shared/js/
                fi 
            done; 

            # include shared l10n resources
            for f in $(grep -r shared/locales $appdir) ; do 
                if [[ "$f" == *shared/locales* ]] ; then 
                    if [[ "$f" == */shared/locales* ]] ; then 
                        locale_name=$(echo "$f" | cut -d'/' -f 4 | cut -d'.' -f1)
                    else 
                        locale_name=$(echo "$f" | cut -d'/' -f 3 | cut -d'.' -f1)
                    fi
                    mkdir -p $appdir/shared/locales/$locale_name
                    cp shared/locales/$locale_name.ini $appdir/shared/locales/
                    cp shared/locales/$locale_name/* $appdir/shared/locales/$locale_name
                fi
            done

            # include shared building blocks
            for f in $(grep -r shared/style $appdir) ; do 
                if [[ "$f" == *shared/style* ]] ; then 
                    if [[ "$f" == */shared/style* ]] ; then 
                        style_name=$(echo "$f" | cut -d'/' -f 4 | cut -d'.' -f1)
                    else 
                        style_name=$(echo "$f" | cut -d'/' -f 3 | cut -d'.' -f1)
                    fi
                    mkdir -p $appdir/shared/style/$style_name ;
                    cp shared/style/$style_name.css $appdir/shared/style/
                    cp -R shared/style/$style_name $appdir/shared/style/
                    rm -f $appdir/shared/style/$style_name/*.html
                fi 
            done
 
            # zip application
            (cd $appdir && zip -r application.zip *)
            mv $appdir/application.zip profile/webapps/$dirname/application.zip
        fi
    fi
done
