/* exported formatTime, simpleHash, generateDefaultThumbnailURL,
            getAlbumArtBlob, getAlbumArtBlob, createListElement */
/* global getThumbnailURL, Normalizer */
'use strict';

function formatTime(secs) {
  if (isNaN(secs)) {
    return;
  }

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
function simpleHash(str) {
  var hash = 0;
  if (str.length === 0) {
    return hash;
  }

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
  var hashedNumber = (Math.abs(simpleHash(infoForHash)) % 10) + 1;

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
      if (!url) {
        return callback(null, null);
      }
      getBlob(url, callback);
    });
  }
  else {
    var url = generateDefaultThumbnailURL(fileinfo.metadata);
    getBlob(url, callback);
  }
}

// In Music, visually we have three styles of list
// Here we use one function to create different style lists
function createListElement(option, data, index, highlight) {
  var li = document.createElement('li');
  li.className = 'list-item';

  var a = document.createElement('a');
  a.dataset.index = index;
  a.dataset.option = option;

  var titleSpan;

  li.appendChild(a);

  function highlightText(result, text) {
    var textContent = result.textContent;
    var textLowerCased = textContent.toLocaleLowerCase();
    var index = Normalizer.toAscii(textLowerCased).indexOf(text);

    if (index >= 0) {
      var innerHTML = textContent.substring(0, index) +
                      '<span class="search-highlight">' +
                      textContent.substring(index, index + text.length) +
                      '</span>' +
                      textContent.substring(index + text.length);

      result.innerHTML = innerHTML;
    }
  }

  switch (option) {
    case 'playlist':
      titleSpan = document.createElement('span');
      titleSpan.className = 'list-playlist-title';
      if (data.metadata.l10nId) {
        titleSpan.textContent = navigator.mozL10n.get(data.metadata.l10nId);
        titleSpan.dataset.l10nId = data.metadata.l10nId;
      } else {
        titleSpan.textContent =
          data.metadata.title || navigator.mozL10n.get('unknownTitle');
        titleSpan.dataset.l10nId =
          data.metadata.title ? '' : 'unknownTitle';
      }

      a.dataset.keyRange = 'all';
      a.dataset.option = data.option;

      li.appendChild(titleSpan);

      if (index === 0) {
        var shuffleIcon = document.createElement('div');
        shuffleIcon.className = 'list-playlist-icon';
        shuffleIcon.dataset.icon = 'shuffle';
        li.appendChild(shuffleIcon);
      }

      break;

    case 'artist':
    case 'album':
    case 'title':
      var artistSpan;
      // Use background image instead of creating img elements can reduce
      // the amount of total elements in the DOM tree, it can save memory
      // and gecko can render the elements faster as well.
      var setBackground = function(url) {
        url = url || generateDefaultThumbnailURL(data.metadata);
        li.style.backgroundImage = 'url(' + url + ')';
      };

      getThumbnailURL(data, setBackground);

      if (option === 'artist') {
        artistSpan = document.createElement('span');
        artistSpan.className = 'list-single-title';
        artistSpan.textContent =
          data.metadata.artist || navigator.mozL10n.get('unknownArtist');
        artistSpan.dataset.l10nId =
          data.metadata.artist ? '' : 'unknownArtist';

        // Highlight the text when the highlight argument is passed
        // This should only happens when we are creating searched results
        if (highlight) {
          highlightText(artistSpan, highlight);
        }

        li.appendChild(artistSpan);
      } else {
        var albumOrTitleSpan = document.createElement('span');
        artistSpan = document.createElement('span');
        albumOrTitleSpan.className = 'list-main-title';
        artistSpan.className = 'list-sub-title';
        if (option === 'album') {
          albumOrTitleSpan.textContent =
            data.metadata.album || navigator.mozL10n.get('unknownAlbum');
          albumOrTitleSpan.dataset.l10nId =
            data.metadata.album ? '' : 'unknownAlbum';
        } else {
          albumOrTitleSpan.textContent =
            data.metadata.title || navigator.mozL10n.get('unknownTitle');
          albumOrTitleSpan.dataset.l10nId =
            data.metadata.title ? '' : 'unknownTitle';
        }
        artistSpan.textContent =
          data.metadata.artist || navigator.mozL10n.get('unknownArtist');
        artistSpan.dataset.l10nId =
          data.metadata.artist ? '' : 'unknownArtist';

        // Highlight the text when the highlight argument is passed
        // This should only happens when we are creating searched results
        if (highlight) {
          highlightText(albumOrTitleSpan, highlight);
        }

        li.appendChild(albumOrTitleSpan);
        li.appendChild(artistSpan);
      }

      a.dataset.keyRange = data.metadata[option];
      a.dataset.option = option;

      break;

    case 'song':
      var songTitle =
        data.metadata.title || navigator.mozL10n.get('unknownTitle');

      var indexSpan = document.createElement('span');
      indexSpan.className = 'list-song-index';
      var trackNum = data.metadata.tracknum;
      if (data.metadata.discnum && data.multidisc) {
        trackNum = data.metadata.discnum + '.' +
          (trackNum < 10 ? '0' + trackNum : trackNum);
      }
      indexSpan.textContent = trackNum;

      titleSpan = document.createElement('span');
      titleSpan.className = 'list-song-title';
      titleSpan.textContent = songTitle;
      titleSpan.dataset.l10nId = data.metadata.title ? '' : 'unknownTitle';

      var lengthSpan = document.createElement('span');
      lengthSpan.className = 'list-song-length';

      li.appendChild(indexSpan);
      li.appendChild(titleSpan);
      li.appendChild(lengthSpan);

      break;
  }

  return li;
}
