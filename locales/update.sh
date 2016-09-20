#!/bin/bash

# Fetch or update Gaia language repositories.
# Invoke as ./update.sh or ./update.sh your_language_file.json

# Base url for localization repositories.
# This is the default for the master branch.
# For other branches append a version, e.g.:
# BASE_URL=https://hg.mozilla.org/releases/gaia-l10n/v2_1/
BASE_URL=https://hg.mozilla.org/gaia-l10n/

if test -f "$1"; then
  BASE_LANGUAGES=$1
else
  BASE_LANGUAGES=$(dirname $0)/languages_all.json
fi

locales=$(cat ${BASE_LANGUAGES} | awk '/".*"/ {print $1}' | sed 's/"//g')
for lc in ${locales}; do
  if test -d ${lc}; then
    echo "Updating ${lc}..."
    pushd ${lc}
    hg pull -u
    popd
  else
    echo "Fetching ${lc}..."
    hg clone ${BASE_URL}${lc}
  fi
done
