#!/bin/sh

###############################################################################

# Fetch libraries needed for NGA and rename by using bower and browserify.
# Please make sure this script is executed in sms app root folder.


###############################################################################
# variables
bower_path="bower_components"

threads_repo="gaia-components/threads#master"
threads_index="$bower_path/threads/index.js"
threads_plugins="$bower_path/threads/lib/plugins"

threads_alias="bridge"
threads_destination="lib/$threads_alias"
threads_index_destination="$threads_destination/$threads_alias.js"

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

# Threads lib preparing.
[ -d "$threads_destination" ] || mkdir "$threads_destination"
browserify "$threads_index" --standalone $threads_alias > "$threads_index_destination"
cp -r "$threads_plugins" "$threads_destination"

# ServiceWorkerWare lib preparing.
cp "$sww_dist" "$sww_path"
