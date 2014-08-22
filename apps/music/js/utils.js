'use strict';

function formatTime(secs) {
  if (isNaN(secs))
    return;

  secs = Math.floor(secs);

  var formatedTime;
  var seconds = secs % 60;
  var minutes = Math.floor(secs / 60) % 60;
  var hours = Math.floor(secs / 3600);

  if (hours === 0) {
    formatedTime =
      (minutes < 10 ? '0' + minutes : minutes) + ':' +
      (seconds < 10 ? '0' + seconds : seconds);
  } else {
    formatedTime =
      (hours < 10 ? '0' + hours : hours) + ':' +
      (minutes < 10 ? '0' + minutes : minutes) + ':' +
      (seconds < 10 ? '0' + seconds : seconds);
  }

  return formatedTime;
}

// The Javascript implementation of Java’s String.hashCode() method.
function hash(str) {
  var hash = 0;
  if (str.length === 0) return hash;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

function generateDefaultThumbnailURL(metadata) {
  // If metadata does not contain both album and artist, then use title instead.
  var infoForHash = (!metadata.album && !metadata.artist) ?
    metadata.title : metadata.album + metadata.artist;
  var hashedNumber = (Math.abs(hash(infoForHash)) % 10) + 1;

  return '/style/images/AlbumArt' + hashedNumber + '_small.png';
}

// Fetch the cover art for a given file and return it as a Blob. If there's no
// embedded cover art, grab the appropriate placeholder image instead. XXX: This
// function is a bit convoluted, and we could stand to simplify things here,
// e.g. by merging placeholder art with embedded art and/or storing cover art
// on the sdcard.
function getAlbumArtBlob(fileinfo, callback) {
  var getBlob = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onload = function() {
      callback(null, xhr.response);
    };
    // I don't think onerror usually gets called, but let's play it safe.
    xhr.onerror = function() {
      callback('error', null);
    };

    // Bad local URLs throw in send() for some reason.
    try {
      xhr.send();
    } catch (e) {
      callback(e, null);
    }
  };

  if ('picture' in fileinfo.metadata) {
    getThumbnailURL(fileinfo, function(url) {
      if (!url)
        return callback(null, null);
      getBlob(url, callback);
    });
  }
  else {
    var url = generateDefaultThumbnailURL(fileinfo.metadata);
    getBlob(url, callback);
  }
}

//The .ogg and .3gp audio files have video mimetype but we force them to be
//audio mimetype because the audio files are shown as video when user shares
//while playing and through pick activity to SMS composer which is very
//confusing to user.This change is for UX improvement and good user experience
function getAudioTypeBlob(file) {
  var map = {
    'video/ogg': 'audio/ogg',
    'video/3gpp': 'audio/3gpp'
    // Probably more here?
  };

  if (file.type.indexOf('audio') === -1 && map[file.type]) {
    return new Blob([file], {type: map[file.type]});
  } else {
    // Is it possible to be some other audio types?
    return file;
  }
}
