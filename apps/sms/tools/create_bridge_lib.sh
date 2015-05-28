#!/bin/sh

###############################################################################

# Fetch threads library and rename by using bower and browserify.
# Please make sure this script is executed in sms app root folder.


###############################################################################
# variables
bower_path="bower_components"
threads_repo="gaia-components/threads#master"
threads_index="$bower_path/threads/index.js"
module_name="bridge"
module_path="lib/$module_name.js"


###############################################################################
# Main script

if [ ! -x "`which bower`" -o ! -x "`which browserify`" ] ; then
  echo "Please install bower and browserify to use this script."
  exit 1
fi

bower install $threads_repo

browserify $threads_index --standalone $module_name > $module_path

