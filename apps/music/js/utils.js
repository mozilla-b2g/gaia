/* exported formatTime, createListElement */
/* global AlbumArtCache, LazyLoader, Normalizer, musicdb */
'use strict';

var playlistArray = [
  { metadata: { l10nId: 'playlists-shuffle-all' }, option: 'shuffleAll' },
  { metadata: { l10nId: 'playlists-highest-rated' }, option: 'rated' },
  { metadata: { l10nId: 'playlists-recently-added' }, option: 'date' },
  { metadata: { l10nId: 'playlists-most-played' }, option: 'played' },
  { metadata: { l10nId: 'playlists-least-played' }, option: 'played' },
  // update ListView with null result to hide the scan progress
  null
];

function updatePlaylists(ListView, option) {
  playlistArray.forEach(function(playlist, idx, playlists) {
    //Don't give bottom border to last element. We use -2 here,
    //because the array's last element is null
    var noborder = (idx === playlists.length - 2);
    ListView.update(option, playlist, noborder);
  });

  ListView.update('my-playlists-header');
  ListView.update('create-playlist');

  musicdb.getAllPlaylists(function(playlists) {
    playlists.forEach(function(playlist) {
      ListView.update(option, playlist);
    });
  });
}

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

// In Music, visually we have three styles of list
// Here we use one function to create different style lists
function createListElement(opts) {
  var option = opts.option;
  var data = opts.data;
  var index = opts.index;
  var highlight = opts.highlight;
  var noborder = opts.noborder;
  var editMode = opts.editMode;

  var li = document.createElement('li');
  li.className = 'list-item';
  li.setAttribute('role', 'presentation');

  var a = document.createElement('a');
  a.dataset.index = index;
  a.dataset.option = option;
  a.setAttribute('role', 'option');

  var titleBdi;

  if (editMode) {
    var div = document.createElement('div');
    div.style.padding = '0 0 0 1rem';
    div.style.float = 'left';
    div.style.width = '2rem';

    var checkbox = document.createElement('input');
    checkbox.className = "checkbox";
    checkbox.type = "checkbox";
    checkbox.name = "selected";
    checkbox.value = index;
    checkbox.id = "cb-" + index;
    div.appendChild(checkbox);

    var label = document.createElement('label');
    label.setAttribute("for", "cb-" + index);

    div.appendChild(label);
    li.appendChild(div);
  }

  a.style.float = 'right';
  li.appendChild(a);

  var div = document.createElement('div');
  div.style.clear = 'both';
  li.appendChild(div);

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
    case 'my-playlists-header':
      titleSpan = document.createElement('span');
      titleSpan.className = 'my-playlists-header';
      titleSpan.textContent = navigator.mozL10n.get('my-playlists-header');

      li.appendChild(titleSpan);

      break;

    case 'create-playlist':
      titleSpan = document.createElement('span');
      titleSpan.className = 'list-playlist-title';
      titleSpan.textContent = navigator.mozL10n.get('create-playlist');

      li.appendChild(titleSpan);

      var icon = document.createElement('div');
      icon.className = 'list-playlist-icon';
      icon.dataset.icon = 'add';
      li.appendChild(icon);

      break;

    case 'playlist':
      titleBdi = document.createElement('bdi');
      titleBdi.className = 'list-playlist-title';

      if (noborder) {
        titleSpan.className += ' noborder';
      }

      a.dataset.keyRange = 'all';
      a.dataset.option = data.option;

      if (data.metadata) {
        if (data.metadata.l10nId) {
          titleBdi.textContent = navigator.mozL10n.get(data.metadata.l10nId);
          titleBdi.dataset.l10nId = data.metadata.l10nId;
        } else {
          titleBdi.textContent =
            data.metadata.title || navigator.mozL10n.get('unknownTitle');
          titleBdi.dataset.l10nId =
            data.metadata.title ? '' : 'unknownTitle';
        }
      } else if (data.name) {
        //custom playlists.
        titleBdi.textContent = data.name;
        a.dataset.option = data.name;
        li.id = "pl-" + data.name;
      }

      a.appendChild(titleBdi);

      if (index === 0) {
        var shuffleIcon = document.createElement('div');
        shuffleIcon.className = 'list-playlist-icon';
        shuffleIcon.dataset.icon = 'shuffle';
        shuffleIcon.setAttribute('data-l10n-id', 'shuffle-toggle');
        a.appendChild(shuffleIcon);
      }

      break;

    case 'artist':
    case 'album':
    case 'title':
      var artistBdi;
      var albumImg;

      albumImg = document.createElement('img');
      albumImg.className = 'list-album-art';
      li.appendChild(albumImg);

      LazyLoader.load('js/metadata/album_art_cache.js').then(() => {
        return AlbumArtCache.getThumbnailURL(data);
      }).then((url) => {
        showImage(albumImg, url);
      });

      if (option === 'artist') {
        artistBdi = document.createElement('bdi');
        artistBdi.className = 'list-single-title';
        artistBdi.textContent =
          data.metadata.artist || navigator.mozL10n.get('unknownArtist');
        artistBdi.dataset.l10nId =
          data.metadata.artist ? '' : 'unknownArtist';

        // Highlight the text when the highlight argument is passed
        // This should only happens when we are creating searched results
        if (highlight) {
          highlightText(artistBdi, highlight);
        }

        a.appendChild(artistBdi);
      } else {
        var albumOrTitleBdi = document.createElement('bdi');
        artistBdi = document.createElement('bdi');
        albumOrTitleBdi.className = 'list-main-title';
        artistBdi.className = 'list-sub-title';
        if (option === 'album') {
          albumOrTitleBdi.textContent =
            data.metadata.album || navigator.mozL10n.get('unknownAlbum');
          albumOrTitleBdi.dataset.l10nId =
            data.metadata.album ? '' : 'unknownAlbum';
        } else {
          albumOrTitleBdi.textContent =
            data.metadata.title || navigator.mozL10n.get('unknownTitle');
          albumOrTitleBdi.dataset.l10nId =
            data.metadata.title ? '' : 'unknownTitle';
        }
        artistBdi.textContent =
          data.metadata.artist || navigator.mozL10n.get('unknownArtist');
        artistBdi.dataset.l10nId =
          data.metadata.artist ? '' : 'unknownArtist';

        // Highlight the text when the highlight argument is passed
        // This should only happens when we are creating searched results
        if (highlight) {
          highlightText(albumOrTitleBdi, highlight);
        }

        a.appendChild(albumOrTitleBdi);
        a.appendChild(artistBdi);
      }

      a.dataset.keyRange = data.metadata[option];
      a.dataset.option = option;

      break;

    case 'song':
    case 'song-index':
      var songTitle =
        data.metadata.title || navigator.mozL10n.get('unknownTitle');

      var indexBdi = document.createElement('bdi');
      indexBdi.className = 'list-song-index';
      // 'song-index' mean we want the index and not the track #
      if (option === 'song-index') {
        indexBdi.textContent = index + 1;
      } else {
        var trackNum = data.metadata.tracknum;
        if (data.metadata.discnum && data.multidisc) {
          trackNum = data.metadata.discnum + '.' +
            (trackNum < 10 ? '0' + trackNum : trackNum);
        }
        indexBdi.textContent = trackNum;
      }

      titleBdi = document.createElement('bdi');
      titleBdi.className = 'list-song-title';
      titleBdi.textContent = songTitle;
      titleBdi.dataset.l10nId = data.metadata.title ? '' : 'unknownTitle';

      var lengthBdi = document.createElement('bdi');
      lengthBdi.className = 'list-song-length';

      a.appendChild(indexBdi);
      a.appendChild(titleBdi);
      a.appendChild(lengthBdi);

      break;
  }

  return li;
}

function showImage(image, url, option) {
  // Reset the image element.
  image.classList.remove(option);
  image.src = '';
  // We could probably have several animation options.
  // Add them here in the future.
  if (option === 'fadeIn') {
    image.style.opacity = 0;
  }

  image.addEventListener('load', handler);

  function handler(evt) {
    /* jshint validthis:true */
    evt.target.removeEventListener('load', handler);
    image.classList.add(option);
  }

  image.src = url;
}
