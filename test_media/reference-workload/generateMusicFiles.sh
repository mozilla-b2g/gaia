#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)

if [ -z "$1" ]; then 
  echo "Must provide number of iterations"
  exit
fi

if ! type mid3v2 > /dev/null 2>&1; then
  echo "mid3v2 required to load music - install with |sudo apt-get install python-mutagen|"
  echo "No music loaded"
  exit
fi

ALBUM=1
TRACK=1
ARTIST=1
SONG_NAME=MasterSong.mp3

# remove all the ID3 tags from the song
mid3v2 -D ${SCRIPT_DIR}/${SONG_NAME}

# We start with 1 track per album, and increment that up to 10, and then cycle between 5 and 10
TRACKS_PER_ALBUM=1
REMOTE_DIR="/sdcard/Music"

for i in `seq -f '%04g' 2 $1` ; do
  FILENAME=SONG_$i.mp3

  mid3v2 -t "Song ${i}" -a "Artist ${ARTIST}" -A "Album ${ALBUM}" -T "${TRACK}" ${SCRIPT_DIR}/${SONG_NAME}
  adb push ${SCRIPT_DIR}/${SONG_NAME} ${REMOTE_DIR}/${FILENAME}

  let TRACK=TRACK+1
  if [ ${TRACK} -gt ${TRACKS_PER_ALBUM} ]; then
    let TRACK=1
    let ALBUM=ALBUM+1
    let TRACKS_PER_ALBUM=TRACKS_PER_ALBUM+1
    if [ ${TRACKS_PER_ALBUM} -gt 10 ]; then
      let TRACKS_PER_ALBUM=5
      let ARTIST=ARTIST+1
    fi
  fi
done

# remove all the ID3 tags from the song (again)
mid3v2 -D ${SCRIPT_DIR}/${SONG_NAME}
