#!/bin/sh

###############################################################################

# Fetch libraries needed for NGA and rename by using bower and browserify.
# Please make sure this script is executed in sms app root folder.


###############################################################################
# variables
bower_path="bower_components"

bridge_repo="gaia-components/bridge#master"
bridge_plugins="$bower_path/bridge/src/plugins"
bridge_destination="lib/bridge"
bridge_index="$bower_path/bridge/bridge.js"
bridge_index_destination="$bridge_destination/bridge.js"

sww_repo="gaia-components/serviceworkerware#master"
sww_dist="$bower_path/serviceworkerware/dist/sww.js"
sww_path="lib/sww.js"

###############################################################################
# Main script

if [ ! -x "`which bower`" -o ! -x "`which browserify`" ] ; then
  echo "Please install bower and browserify to use this script."
  exit 1
fi

bower install $bridge_repo $sww_repo

# Threads lib preparing.
[ -d "$bridge_destination" ] || mkdir "$bridge_destination"
cp "$bridge_index" "$bridge_index_destination" 
cp -r "$bridge_plugins" "$bridge_destination"

# ServiceWorkerWare lib preparing.
cp "$sww_dist" "$sww_path"
