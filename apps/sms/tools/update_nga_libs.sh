#!/bin/bash

###############################################################################

# Fetch libraries needed for NGA and rename by using bower and browserify.
# Please make sure this script is executed in sms app root folder.


###############################################################################
# variables
bower_path="bower_components"

bridge_repo="fxos-components/bridge#master"

bridge_source="$bower_path/bridge"
bridge_plugins="$bridge_source/plugins"
bridge_libs=( "service.js" "service.min.js" "client.js" "client.min.js" )
bridge_destination="lib/bridge"

sww_repo="fxos-components/serviceworkerware#master"
sww_dist="$bower_path/serviceworkerware/dist/sww.js"
sww_path="lib/sww.js"

###############################################################################
# Main script

if [ ! -x "`which bower`" -o ! -x "`which browserify`" ] ; then
  echo "Please install bower and browserify to use this script."
  exit 1
fi

bower install $bridge_repo $sww_repo

# Bridge lib preparing.
[ -d "$bridge_destination" ] || mkdir "$bridge_destination"

# Copy all required Bridge libs.
for lib in "${bridge_libs[@]}"
do
  cp "$bridge_source/$lib" "$bridge_destination/$lib"
done

cp -r "$bridge_plugins" "$bridge_destination"

# ServiceWorkerWare lib preparing.
cp "$sww_dist" "$sww_path"
