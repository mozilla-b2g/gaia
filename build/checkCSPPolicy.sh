#!/bin/bash

PATH_BASE=`pwd`
DIR_APPS=profile/webapps

EVENTS="onclick ondblclick onmousedown onmousemove onmouseover onmouseout onmouseup onkeydown onkeypress onkeyup onabort onerror onload onresize onscroll onunload onblur onchange onfocus onreset onselect onsubmit ondragdrop onmove"  

#********************************************************************************#
# helper functions                             
#********************************************************************************#


function addCarriageReturn {

  if [ "${searchResult}" != "" ];then
    searchResult="${searchResult}\n"
  fi
}

function lookupScript {
  
  scr="";
  src=`grep -En "<[[:space:]]*script.*>" $1 |grep -vE "[[:space:]]+src[[:space:]]*="` 
  
  addCarriageReturn

  if [ "${src}" != "" ];then
    searchResult="${searchResult}--------------\nINLINE SCRIPTS\n--------------\n${src}"
  fi
}

function lookupEvents {

  allEvent="";  

  for i in ${EVENTS}; do
    event=`grep -in "${i}[[:space:]]*=" $1`
    if [ "${event}" != "" ];then
      if [ "${event}" != "" ];then
        allEvent="${allEvent}\n${event}"
      else
        allEvent=${event}
      fi
    fi
  done

  addCarriageReturn

  if [ "${allEvent}" != "" ];then
    searchResult="${searchResult}---------------------\nINLINE EVENTS MANAGER\n---------------------\n${allEvent}"
  fi
}

function lookupURLjavascript {

  url=""
  url=`grep -in "javascript:" $1`

  addCarriageReturn

  if [ "${url}" != "" ];then
    searchResult="${searchResult}---------------\nJAVASCRIPT HREF\n---------------\n${url}"
  fi
}

function inflateApps {

  cd ${PATH_BASE}/${DIR_APPS}
  for unz in *.org maps marketplace maketplace-staging; do
    if [ -d $unz -a -f "$unz/application.zip" ]; then
      cd $unz;
      mkdir tmp  2>&1 > /dev/null;
      cp application.zip tmp  2>&1 > /dev/null;
      cd tmp  2>&1 > /dev/null;
      unzip -o application.zip 2>&1 > /dev/null;
      cd ../..; 
    fi
  done; 
}

function deleteUnzip {

  cd ${PATH_BASE}/${DIR_APPS}
  for dunz in *.org maps marketplace marketplace-staging; do 
    if [ -d $dunz -a -f "$dunz/application.zip" ]; then
      cd $dunz;
      rm -rf tmp;
      cd ..;
    fi
  done
}

function  showResult {
  
  if [ "${searchResult}" != "" ]; then
    echo "################################################################################";
    echo "APPLICATION: `echo ${1} | cut -d "/" -f 2`"
    echo "FILE: `echo ${1} | cut -d "/" -f 4-`"
    echo "${searchResult}" | sed -E 's/\\n/\n/g'
  fi
}

############################################
# MAIN
############################################


echo "SEARCH EXECUTED ON: ${PATH_BASE}/${DIR_APPS}"
if [ ! -d "${PATH_BASE}/${DIR_APPS}" ]; then
  echo "$0 must be executed on parent directory of ${DIR_APPS}"
  exit 1;
fi
cd ${PATH_BASE}/${DIR_APPS}

export searchResult="";

inflateApps;

for fich in `find . -name *.html`; do
  searchResult="";
  lookupEvents ${PATH_BASE}/${DIR_APPS}/${fich}
  lookupScript ${PATH_BASE}/${DIR_APPS}/${fich}
  lookupURLjavascript ${PATH_BASE}/${DIR_APPS}/${fich}
  showResult ${fich}
done

deleteUnzip;

