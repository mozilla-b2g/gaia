#!/bin/sh

###############################################################################

# Fetch libraries needed for NGA and rename by using bower and browserify.
# Please make sure this script is executed in sms app root folder.


###############################################################################
# variables
bower_path="bower_components"
threads_repo="gaia-components/threads#master"
threads_index="$bower_path/threads/index.js"
threads_name="bridge"
threads_path="lib/$threads_name.js"
sww_repo="gaia-components/serviceworkerware#master"
sww_dist="$bower_path/serviceworkerware/dist/sww.js"
sww_path="lib/sww.js"

###############################################################################
# Main script

if [ ! -x "`which bower`" -o ! -x "`which browserify`" ] ; then
  echo "Please install bower and browserify to use this script."
  exit 1
fi

bower install $threads_repo $sww_repo

browserify $threads_index --standalone $threads_name > $threads_path

cp $sww_dist $sww_path
