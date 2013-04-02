'use strict';

/*
 * This is Music Application of Gaia
 */

// strings for localization
var musicTitle;
var playlistTitle;
var artistTitle;
var albumTitle;
var unknownAlbum;
var unknownArtist;
var unknownTitle;
var shuffleAllTitle;
var highestRatedTitle;
var recentlyAddedTitle;
var mostPlayedTitle;
var leastPlayedTitle;

// The MediaDB object that manages the filesystem and the database of metadata
// See init()
var musicdb;

// We get a localized event when the application is launched and when
// the user switches languages.
window.addEventListener('localized', function onlocalized() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // Get prepared for the localized strings, these will be used later
  musicTitle = navigator.mozL10n.get('music');
  playlistTitle = navigator.mozL10n.get('playlists');
  artistTitle = navigator.mozL10n.get('artists');
  albumTitle = navigator.mozL10n.get('albums');
  unknownAlbum = navigator.mozL10n.get('unknownAlbum');
  unknownArtist = navigator.mozL10n.get('unknownArtist');
  unknownTitle = navigator.mozL10n.get('unknownTitle');
  shuffleAllTitle = navigator.mozL10n.get('playlists-shuffle-all');
  highestRatedTitle = navigator.mozL10n.get('playlists-highest-rated');
  recentlyAddedTitle = navigator.mozL10n.get('playlists-recently-added');
  mostPlayedTitle = navigator.mozL10n.get('playlists-most-played');
  leastPlayedTitle = navigator.mozL10n.get('playlists-least-played');

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('invisible');

  // The first time we get this event we start running the application.
  // But don't re-initialize if the user switches languages while we're running.
  if (!musicdb)
    init();
});

// We use this flag when switching views. We want to hide the scan progress
// bar (to show the titlebar) when we enter sublist mode or player mode
var displayingScanProgress = false;

function init() {
  // Here we use the mediadb.js which gallery is using (in shared/js/)
  // to index our music contents with metadata parsed.
  // So the behaviors of musicdb are the same as the MediaDB in gallery
  musicdb = new MediaDB('music', metadataParserWrapper, {
    indexes: ['metadata.album', 'metadata.artist', 'metadata.title',
              'metadata.rated', 'metadata.played', 'date'],
    batchSize: 1,
    autoscan: false, // We call scan() explicitly after listing music we know
    version: 2
  });

  function metadataParserWrapper(file, onsuccess, onerror) {
    LazyLoader.load('js/metadata_scripts.js', function() {
      parseAudioMetadata(file, onsuccess, onerror);
    });
  }

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  musicdb.onunavailable = function(event) {
    var why = event.detail;
    if (why === MediaDB.NOCARD)
      showOverlay('nocard');
    else if (why === MediaDB.UNMOUNTED)
      showOverlay('pluggedin');

    // stop and reset the player then back to tiles mode to avoid crash
    PlayerView.stop();
    ModeManager.start(MODE_TILES);
    TilesView.hideSearch();
  };

  musicdb.onready = function() {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (currentOverlay === 'nocard' || currentOverlay === 'pluggedin')
      showOverlay(null);

    // Display music that we already know about
    showCurrentView(function() {
      // Hide the  spinner once we've displayed the initial screen
      document.getElementById('spinner-overlay').classList.add('hidden');
    });

    // Concurrently, start scanning for new music
    musicdb.scan();
  };

  var filesDeletedWhileScanning = 0;
  var filesFoundWhileScanning = 0;
  var filesFoundBatch = 0;
  var scanning = false;
  var SCAN_UPDATE_BATCH_SIZE = 25; // Redisplay after this many new files

  var scanProgress = document.getElementById('scan-progress');
  var scanCount = document.getElementById('scan-count');
  var scanArtist = document.getElementById('scan-artist');
  var scanTitle = document.getElementById('scan-title');

  // When musicdb scans, let the user know
  musicdb.onscanstart = function() {
    scanning = true;
    displayingScanProgress = false;
    filesFoundWhileScanning = 0;
    filesFoundBatch = 0;
    filesDeletedWhileScanning = 0;
  };

  // And hide the throbber when scanning is done
  musicdb.onscanend = function() {
    scanning = false;
    if (displayingScanProgress) {
      scanProgress.classList.add('hidden');
      displayingScanProgress = false;
    }
    if (filesFoundBatch > 0 || filesDeletedWhileScanning > 0) {
      filesFoundWhileScanning = 0;
      filesFoundBatch = 0;
      filesDeletedWhileScanning = 0;
      showCurrentView();
    }
  };

  // When MediaDB finds new files, it sends created events. During
  // scanning we may get lots of them. Bluetooth file transfer can
  // also result in created events. The way the app is currently
  // structured, all we can do is rebuild the entire UI with the
  // updated list of files. We don't want to do this for every new file
  // but we do want to redisplay every so often.
  musicdb.oncreated = function(event) {
    var currentMode = ModeManager.currentMode;
    if (scanning && !displayingScanProgress &&
        (currentMode === MODE_TILES || currentMode === MODE_LIST))
    {
      displayingScanProgress = true;
      scanProgress.classList.remove('hidden');
    }
    var n = event.detail.length;

    filesFoundWhileScanning += n;
    filesFoundBatch += n;

    scanCount.textContent = filesFoundWhileScanning;

    var metadata = event.detail[0].metadata;
    scanArtist.textContent = metadata.artist || '';
    scanTitle.textContent = metadata.title || '';

    if (filesFoundBatch > SCAN_UPDATE_BATCH_SIZE) {
      filesFoundBatch = 0;
      showCurrentView();
    }
  };

  // For deletions, we just set a flag and redisplay when the scan is done.
  // This means that there is a longer window of time when the app might
  // display music that is no longer available.  But the only way to prevent
  // this is to refuse to display any music until the scan completes.
  musicdb.ondeleted = function(event) {
    filesDeletedWhileScanning += event.detail.length;
  };
}

//
// Web Activities
//

// Use Web Activities to share files
function shareFile(filename) {
  musicdb.getFile(filename, function(file) {
    // We try to fix Bug 814323 by using
    // current workaround of bluetooth transfer
    // so we will pass both filenames and filepaths
    // The filepaths can be removed after Bug 811615 is fixed
    var name = filename.substring(filename.lastIndexOf('/') + 1);

    var a = new MozActivity({
      name: 'share',
      data: {
        type: file.type,
        number: 1,
        blobs: [file],
        filenames: [name],
        filepaths: [filename]
      }
    });

    a.onerror = function(e) {
      console.warn('share activity error:', a.error.name);
    };
  });
}

//
// Overlay messages
//
var currentOverlay;  // The id of the current overlay or null if none.

//
// If id is null then hide the overlay. Otherwise, look up the localized
// text for the specified id and display the overlay with that text.
// Supported ids include:
//
//   nocard: no sdcard is installed in the phone
//   pluggedin: the sdcard is being used by USB mass storage
//   empty: no songs found
//
// Localization is done using the specified id with "-title" and "-text"
// suffixes.
//
function showOverlay(id) {
  currentOverlay = id;

  if (id === null) {
    document.getElementById('overlay').classList.add('hidden');
    return;
  }

  var title = navigator.mozL10n.get(id + '-title');
  var text = navigator.mozL10n.get(id + '-text');

  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-text').textContent = text;
  document.getElementById('overlay').classList.remove('hidden');
}

// We need handles here to cancel enumerations for
// tilesView, listView, sublistView and playerView
var tilesHandle = null;
var listHandle = null;
var sublistHandle = null;
var playerHandle = null;

function showCurrentView(callback) {
  // Enumerate existing song entries in the database
  // List them all, and sort them in ascending order by album.
  // Use enumerateAll() here so that we get all the results we want
  // and then pass them synchronously to the update() functions.
  // If we do it asynchronously, then we'll get one redraw for
  // every song.
  if (ModeManager.currentMode === MODE_LIST) {
    listHandle =
      musicdb.enumerateAll('metadata.' + TabBar.option, null, 'nextunique',
                           function(songs) {
                             ListView.clean();
                             songs.forEach(function(song) {
                               ListView.update(TabBar.option, song);
                             });
                           });
  }

  tilesHandle = musicdb.enumerateAll('metadata.album', null, 'nextunique',
                                     function(songs) {
                                       // Add null to the array of songs
                                       // this is a flag that tells update()
                                       // to show or hide the 'empy' overlay
                                       songs.push(null);
                                       TilesView.clean();

                                       // We will need getThumbnailURL()
                                       // to display thumbnails in TilesView
                                       // it's possibly not loaded so load it
                                       LazyLoader.load('js/metadata_scripts.js',
                                         function() {
                                           songs.forEach(function(song) {
                                             TilesView.update(song);
                                           });
                                           if (callback)
                                             callback();
                                         }
                                       );
                                    });

}

// This Application has five modes: TILES, SEARCH, LIST, SUBLIST, and PLAYER
// Search has two "modes", depending on whether we came from TILES or LIST.
//
// Before the Music app is launched we use display: none to hide the modes so
// that Gecko will not try to apply CSS styles on those elements which seems are
// actions that slows down the startup time we will remove display: none on
// elements when we need to display them.
var MODE_TILES = 1;
var MODE_LIST = 2;
var MODE_SUBLIST = 3;
var MODE_PLAYER = 4;
var MODE_SEARCH_FROM_TILES = 5;
var MODE_SEARCH_FROM_LIST = 6;

var ModeManager = {
  _modeStack: [],
  playerTitle: null,
  sublistTitle: null,

  get currentMode() {
    return this._modeStack[this._modeStack.length - 1];
  },

  start: function(mode, callback) {
    this._modeStack = [mode];
    this._updateMode(callback);
  },

  push: function(mode, callback) {
    this._modeStack.push(mode);
    this._updateMode(callback);
  },

  pop: function() {
    if (this._modeStack.length <= 1)
      return;
    this._modeStack.pop();
    this._updateMode();
  },

  updateTitle: function() {
    var title;

    switch (this.currentMode) {
      case MODE_TILES:
        title = this.playerTitle || musicTitle;
        break;
      case MODE_LIST:
        switch (TabBar.option) {
          case 'playlist':
            title = playlistTitle;
            break;
          case 'artist':
            title = artistTitle;
            break;
          case 'album':
            title = albumTitle;
            break;
        }

        this.sublistTitle = title;
        break;
      case MODE_SUBLIST:
        title = this.sublistTitle;
        break;
      case MODE_PLAYER:
        title = this.playerTitle;
        break;
    }

    // if title doesn't exist, that should be the first time launch
    // so we can just ignore changeTitleText()
    // because the title is already localized in HTML
    // And if title does exist, it should be the localized "Music"
    // so it will be just fine to update changeTitleText() again
    if (title)
      TitleBar.changeTitleText(title);
  },

  _updateMode: function(callback) {
    var mode = this.currentMode;
    var playerLoaded = (typeof PlayerView != 'undefined');

    this.updateTitle();

    if (mode === MODE_PLAYER) {
      // Here if Player is not loaded yet and we are going to play
      // load Player.js then we can use the PlayerView object
      document.getElementById('views-player').classList.remove('hidden');
      LazyLoader.load('js/Player.js', function() {
        if (!playerLoaded)
          PlayerView.init(true);

        if (callback)
          callback();
      });
    } else {
      if (mode === MODE_LIST)
        document.getElementById('views-list').classList.remove('hidden');
      else if (mode === MODE_SUBLIST)
        document.getElementById('views-sublist').classList.remove('hidden');
      else if (mode === MODE_SEARCH_FROM_TILES ||
               mode === MODE_SEARCH_FROM_LIST)
        document.getElementById('search').classList.remove('hidden');

      if (callback)
        callback();
    }

    // Remove all mode classes before applying a new one
    var modeClasses = ['tiles-mode', 'list-mode', 'sublist-mode', 'player-mode',
                       'search-from-tiles-mode', 'search-from-list-mode'];

    modeClasses.forEach(function resetMode(targetClass) {
      document.body.classList.remove(targetClass);
    });

    document.body.classList.add(modeClasses[mode - 1]);

    // Don't display scan progress if we're in sublist or player mode.
    // In these modes the user needs to see the regular titlebar so they
    // can use the back button. If the user returns to tiles or list
    // mode and we get more scan results we'll resume the progress display.
    if (displayingScanProgress &&
        (mode === MODE_SUBLIST || mode === MODE_PLAYER)) {
      document.getElementById('scan-progress').classList.add('hidden');
      displayingScanProgress = false;
    }
  }
};

// Title Bar
var TitleBar = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('title');
  },

  get titleText() {
    delete this._titleText;
    return this._titleText = document.getElementById('title-text');
  },

  get playerIcon() {
    delete this._playerIcon;
    return this._playerIcon = document.getElementById('title-player');
  },

  init: function tb_init() {
    this.view.addEventListener('click', this);
  },

  changeTitleText: function tb_changeTitleText(content) {
    this.titleText.textContent = content;
  },

  handleEvent: function tb_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'click':
        if (!target)
          return;

        switch (target.id) {
          case 'title-back':
            ModeManager.pop();

            break;
          case 'title-player':
            // We cannot to switch to player mode
            // when there is no song in the dataSource of player
            if (PlayerView.dataSource.length != 0)
              ModeManager.push(MODE_PLAYER);

            break;
        }

        break;

      default:
        return;
    }
  }
};

// View of Tiles
var TilesView = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('views-tiles');
  },

  get anchor() {
    delete this._anchor;
    return this._anchor = document.getElementById('views-tiles-anchor');
  },

  get searchBox() {
    delete this._searchBox;
    return this._searchBox = document.getElementById('views-tiles-search');
  },

  get searchInput() {
    delete this._searchInput;
    return this._searchInput = document.getElementById(
      'views-tiles-search-input');
  },

  get dataSource() {
    return this._dataSource;
  },

  set dataSource(source) {
    this._dataSource = source;
  },

  init: function tv_init() {
    this.dataSource = [];
    this.index = 0;

    this.view.addEventListener('click', this);
    this.view.addEventListener('input', this);
    this.searchInput.addEventListener('focus', this);
  },

  clean: function tv_clean() {
    // Cancel a pending enumeration before start a new one
    if (tilesHandle)
      musicdb.cancelEnumeration(tilesHandle);

    this.dataSource = [];
    this.index = 0;
    this.anchor.innerHTML = '';
    this.view.scrollTop = 0;
    this.hideSearch();
  },

  hideSearch: function tv_hideSearch() {
    this.searchInput.value = '';
    // XXX: we probably want to animate this...
    if (this.view.scrollTop < this.searchBox.offsetHeight)
      this.view.scrollTop = this.searchBox.offsetHeight;
  },

  update: function tv_update(result) {
    // if no songs in dataSource
    // disable the TabBar to prevent users switch to other page
    TabBar.setDisabled(!this.dataSource.length);

    if (result === null) {
      // If we don't know about any songs, display the 'empty' overlay.
      // If we do know about songs and the 'empty overlay is being displayed
      // then hide it.
      if (this.dataSource.length > 0) {
        if (currentOverlay === 'empty')
          showOverlay(null);
      }
      else {
        showOverlay('empty');
      }

      // Display the TilesView after when finished updating the UI
      document.getElementById('views-tiles').classList.remove('hidden');
      return;
    }

    this.dataSource.push(result);

    var tile = document.createElement('div');
    tile.className = 'tile';

    var container = document.createElement('div');
    container.className = 'tile-container';

    var titleBar = document.createElement('div');
    titleBar.className = 'tile-title-bar';
    var artistName = document.createElement('div');
    artistName.className = 'tile-title-artist';
    var albumName = document.createElement('div');
    albumName.className = 'tile-title-album';
    artistName.textContent = result.metadata.artist || unknownArtist;
    albumName.textContent = result.metadata.album || unknownAlbum;
    titleBar.appendChild(artistName);

    // There are 6 tiles in one group
    // and the first tile is the main-tile
    // so we mod 6 to find out who is the main-tile
    if (this.index % 6 === 0) {
      tile.classList.add('main-tile');
      artistName.classList.add('main-tile-title');
      titleBar.appendChild(albumName);
    } else {
      tile.classList.add('sub-tile');
      artistName.classList.add('sub-tile-title');
    }

    // Since 6 tiles are in one group
    // the even group will be floated to left
    // the odd group will be floated to right
    if (Math.floor(this.index / 6) % 2 === 0) {
      tile.classList.add('float-left');
    } else {
      tile.classList.add('float-right');
    }

    var NUM_INITIALLY_VISIBLE_TILES = 8;
    var INITIALLY_HIDDEN_TILE_WAIT_TIME_MS = 1000;

    var placeholderBackgroundClass = 'default-album-' + this.index % 10;
    var setTileBackgroundClosure = function(url) {
      if (url) {
        tile.style.backgroundImage = 'url(' + url + ')';
      } else {
        tile.classList.add(placeholderBackgroundClass);
      }
    };

    if (this.index <= NUM_INITIALLY_VISIBLE_TILES) {
      // Load this tile's background now, because it's visible.
      getThumbnailURL(result, setTileBackgroundClosure);
    } else {
      // Defer loading hidden tiles until the visible ones are done.
      setTimeout(function() {
          getThumbnailURL(result, setTileBackgroundClosure);
        },
        INITIALLY_HIDDEN_TILE_WAIT_TIME_MS);
    }

    container.dataset.index = this.index;

    // The tile info(album/artist) shows only when the cover does not exist
    if (!result.metadata.picture)
      container.appendChild(titleBar);

    tile.appendChild(container);
    this.anchor.appendChild(tile);

    this.index++;
  },

  handleEvent: function tv_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'click':
        if (!target)
          return;

        if (target.id === 'views-tiles-search-close') {
          if (ModeManager.currentMode === MODE_SEARCH_FROM_TILES) {
            ModeManager.pop();
          }
          this.hideSearch();
          evt.preventDefault();
        } else if (target.dataset.index) {
          var handler;
          var index = target.dataset.index;

          var data = this.dataSource[index];
          handler = tv_playAlbum.bind(this, data, index);

          target.addEventListener('transitionend', handler);
        }

        break;

      case 'focus':
        if (target.id === 'views-tiles-search-input') {
          if (ModeManager.currentMode !== MODE_SEARCH_FROM_TILES) {
            ModeManager.push(MODE_SEARCH_FROM_TILES);
            SearchView.search(target.value);
          }
        }

        break;

      case 'input':
        if (target.id === 'views-tiles-search-input') {
          SearchView.search(target.value);
        }

        break;

      default:
        return;
    }

    function tv_playAlbum(data, index) {
      var backgroundIndex = index % 10;

      var key = 'metadata.album';
      var range = IDBKeyRange.only(data.metadata.album);
      var direction = 'next';

      ModeManager.push(MODE_PLAYER, function() {
        PlayerView.clean();

        // When an user tap an album on the tilesView
        // we have to get all the song data first
        // because the shuffle option might be ON
        // and we have create shuffled list and play in shuffle order
        playerHandle = musicdb.enumerateAll(key, range, direction,
          function tv_enumerateAll(dataArray) {
            PlayerView.setSourceType(TYPE_LIST);
            PlayerView.dataSource = dataArray;

            if (PlayerView.shuffleOption) {
              PlayerView.setShuffle(true);
              PlayerView.play(PlayerView.shuffledList[0], backgroundIndex);
            } else {
              PlayerView.play(0, backgroundIndex);
            }
          }
        );
      });

      target.removeEventListener('transitionend', handler);
    }
  }
};

// In Music, visually we have three styles of list
// Here we use one function to create different style lists
function createListElement(option, data, index) {
  var li = document.createElement('li');
  li.className = 'list-item';

  var a = document.createElement('a');
  a.href = '#';
  a.dataset.index = index;
  a.dataset.option = option;

  li.appendChild(a);

  switch (option) {
    case 'playlist':
      var titleSpan = document.createElement('span');
      titleSpan.className = 'list-playlist-title';
      titleSpan.textContent = data.metadata.title || unknownTitle;

      a.dataset.keyRange = 'all';
      a.dataset.option = data.option;

      li.appendChild(titleSpan);

      if (index === 0) {
        var shuffleIcon = document.createElement('div');
        shuffleIcon.className = 'list-playlist-icon';
        li.appendChild(shuffleIcon);
      }

      break;

    case 'artist':
    case 'album':
    case 'title':
      var parent = document.createElement('div');
      parent.className = 'list-image-parent';
      parent.classList.add('default-album-' + index % 10);
      var img = document.createElement('img');
      img.className = 'list-image';

      if (data.metadata.picture) {
        parent.appendChild(img);
        displayAlbumArt(img, data);
      }

      if (option === 'artist') {
        var artistSpan = document.createElement('span');
        artistSpan.className = 'list-single-title';
        artistSpan.textContent = data.metadata.artist || unknownArtist;
        li.appendChild(artistSpan);
      } else {
        var albumOrTitleSpan = document.createElement('span');
        var artistSpan = document.createElement('span');
        albumOrTitleSpan.className = 'list-main-title';
        artistSpan.className = 'list-sub-title';
        if (option === 'album') {
          albumOrTitleSpan.textContent = data.metadata.album || unknownAlbum;
        } else {
          albumOrTitleSpan.textContent = data.metadata.title || unknownTitle;
        }
        artistSpan.textContent = data.metadata.artist || unknownArtist;
        li.appendChild(albumOrTitleSpan);
        li.appendChild(artistSpan);
      }

      li.appendChild(parent);

      a.dataset.keyRange = data.metadata[option];
      a.dataset.option = option;

      break;

    case 'song':
      var songTitle = data.metadata.title || unknownTitle;

      var indexSpan = document.createElement('span');
      indexSpan.className = 'list-song-index';
      indexSpan.textContent = index + 1;

      var titleSpan = document.createElement('span');
      titleSpan.className = 'list-song-title';
      titleSpan.textContent = songTitle;

      var lengthSpan = document.createElement('span');
      lengthSpan.className = 'list-song-length';

      li.appendChild(indexSpan);
      li.appendChild(titleSpan);
      li.appendChild(lengthSpan);

      break;
  }

  return li;
}

// View of List
var ListView = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('views-list');
  },

  get anchor() {
    delete this._anchor;
    return this._anchor = document.getElementById('views-list-anchor');
  },

  get searchBox() {
    delete this._searchBox;
    return this._searchBox = document.getElementById('views-list-search');
  },

  get searchInput() {
    delete this._searchInput;
    return this._searchInput = document.getElementById(
      'views-list-search-input');
  },

  get dataSource() {
    return this._dataSource;
  },

  set dataSource(source) {
    this._dataSource = source;
  },

  init: function lv_init() {
    this.dataSource = [];
    this.index = 0;
    this.lastFirstLetter = null;

    this.view.addEventListener('click', this);
    this.view.addEventListener('input', this);
    this.searchInput.addEventListener('focus', this);
  },

  clean: function lv_clean() {
    // Cancel a pending enumeration before start a new one
    if (listHandle)
      musicdb.cancelEnumeration(listHandle);

    this.dataSource = [];
    this.index = 0;
    this.lastFirstLetter = null;
    this.anchor.innerHTML = '';
    this.view.scrollTop = 0;
    this.hideSearch();
  },

  hideSearch: function lv_hideSearch() {
    this.searchInput.value = '';
    // XXX: we probably want to animate this...
    if (this.view.scrollTop < this.searchBox.offsetHeight)
      this.view.scrollTop = this.searchBox.offsetHeight;
  },

  update: function lv_update(option, result) {
    if (result === null)
      return;

    this.dataSource.push(result);

    if (option === 'artist' || option === 'album') {
      var firstLetter = result.metadata[option].charAt(0);

      if (this.lastFirstLetter != firstLetter) {
        this.lastFirstLetter = firstLetter;

        var headerLi = document.createElement('li');
        headerLi.className = 'list-header';
        headerLi.textContent = this.lastFirstLetter || '?';

        this.anchor.appendChild(headerLi);
      }
    }

    this.anchor.appendChild(createListElement(option, result, this.index));

    this.index++;
  },

  handleEvent: function lv_handleEvent(evt) {
    var target = evt.target;

    switch (evt.type) {
      case 'click':
        if (!target)
          return;

        if (target.id === 'views-list-search-close') {
          if (ModeManager.currentMode === MODE_SEARCH_FROM_LIST) {
            ModeManager.pop();
          }
          this.hideSearch();
          evt.preventDefault();
        } else {
          var option = target.dataset.option;
          // When an user select "Shuffle all"
          // We just play all songs with shuffle order
          // or change mode to subList view and list songs
          if (option === 'title') {
            musicdb.getAll(function lv_getAll(dataArray) {
              ModeManager.push(MODE_PLAYER, function() {
                PlayerView.setSourceType(TYPE_MIX);
                PlayerView.dataSource = dataArray;
                PlayerView.setShuffle(true);
                PlayerView.play(PlayerView.shuffledList[0]);
              });
            });
          } else if (option) {
            var index = target.dataset.index;
            var data = this.dataSource[index];

            var keyRange = (target.dataset.keyRange != 'all') ?
              IDBKeyRange.only(target.dataset.keyRange) : null;
            var direction =
             (data.metadata.title === mostPlayedTitle ||
              data.metadata.title === recentlyAddedTitle ||
              data.metadata.title === highestRatedTitle) ? 'prev' : 'next';

            SubListView.activate(
              option, data, index, keyRange, direction, function() {
                ModeManager.push(MODE_SUBLIST);
              });
          }
        }

        break;

      case 'focus':
        if (target.id === 'views-list-search-input') {
          if (ModeManager.currentMode !== MODE_SEARCH_FROM_LIST) {
            ModeManager.push(MODE_SEARCH_FROM_LIST);
            SearchView.search(target.value);
          }
        }

        break;

      case 'input':
        if (target.id === 'views-list-search-input') {
          SearchView.search(target.value);
        }

        break;

      default:
        return;
    }
  }
};

// View of SubList
var SubListView = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('views-sublist');
  },

  get dataSource() {
    return this._dataSource;
  },

  get anchor() {
    delete this._anchor;
    return this._anchor = document.getElementById('views-sublist-anchor');
  },

  set dataSource(source) {
    this._dataSource = source;

    // At the same time we also check how many songs in an album
    // Shuffle button is not necessary when an album only contains one song
    this.shuffleButton.disabled = (this._dataSource.length < 2);
  },

  init: function slv_init() {
    this.albumDefault = document.getElementById('views-sublist-header-default');
    this.albumImage = document.getElementById('views-sublist-header-image');
    this.albumName = document.getElementById('views-sublist-header-name');
    this.playAllButton = document.getElementById('views-sublist-controls-play');
    this.shuffleButton =
      document.getElementById('views-sublist-controls-shuffle');

    this.dataSource = [];
    this.index = 0;
    this.backgroundIndex = 0;
    this.isContextmenu = false;

    this.view.addEventListener('click', this);
    this.view.addEventListener('contextmenu', this);
  },

  clean: function slv_clean() {
    // Cancel a pending enumeration before start a new one
    if (sublistHandle)
      musicdb.cancelEnumeration(sublistHandle);

    this.dataSource = [];
    this.index = 0;
    this.albumImage.src = '';
    this.anchor.innerHTML = '';
    this.view.scrollTop = 0;
  },

  setAlbumDefault: function slv_setAlbumDefault(index) {
    var realIndex = index % 10;

    this.albumDefault.classList.remove('default-album-' + this.backgroundIndex);
    this.albumDefault.classList.add('default-album-' + realIndex);
    this.backgroundIndex = realIndex;
  },

  setAlbumSrc: function slv_setAlbumSrc(fileinfo) {
    // Set source to image and crop it to be fitted when it's onloded
    displayAlbumArt(this.albumImage, fileinfo);
    this.albumImage.classList.remove('fadeIn');
    this.albumImage.addEventListener('load', slv_showImage.bind(this));

    function slv_showImage(evt) {
      // Don't register multiple copies
      evt.target.removeEventListener('load', slv_showImage);
      this.albumImage.classList.add('fadeIn');
    };
  },

  setAlbumName: function slv_setAlbumName(name) {
    this.albumName.textContent = name;
  },

  activate: function(option, data, index, keyRange, direction, callback) {
    var targetOption = (option === 'date') ? option : 'metadata.' + option;
    SubListView.clean();

    sublistHandle = musicdb.enumerateAll(targetOption, keyRange, direction,
                                         function lv_enumerateAll(dataArray) {
      var albumName;

      if (option === 'artist') {
        albumName = data.metadata.artist || unknownArtist;
      } else if (option === 'album') {
        albumName = data.metadata.album || unknownAlbum;
      } else {
        albumName = data.metadata.title || unknownTitle;
      }

      SubListView.setAlbumName(albumName);
      SubListView.setAlbumDefault(index);
      SubListView.dataSource = dataArray;

      if (data.metadata.thumbnail)
        SubListView.setAlbumSrc(data);

      dataArray.forEach(function(songData) {
        SubListView.update(songData);
      });

      if (callback)
        callback();
    });
  },

  update: function slv_update(result) {
    if (result === null)
      return;

    this.anchor.appendChild(createListElement('song', result, this.index));

    this.index++;
  },

  handleEvent: function slv_handleEvent(evt) {
    var target = evt.target;

    if (!target)
      return;

    switch (evt.type) {
      case 'click':
        if (this.isContextmenu) {
          this.isContextmenu = false;
          return;
        }

        if (target === this.shuffleButton) {
          ModeManager.push(MODE_PLAYER, function() {
            PlayerView.setSourceType(TYPE_LIST);
            PlayerView.dataSource = this.dataSource;
            PlayerView.setShuffle(true);
            PlayerView.play(PlayerView.shuffledList[0], this.backgroundIndex);
          }.bind(this));
          return;
        }

        if (target.dataset.index || target === this.playAllButton) {
          ModeManager.push(MODE_PLAYER, function() {
            PlayerView.setSourceType(TYPE_LIST);
            PlayerView.dataSource = this.dataSource;

            if (target === this.playAllButton) {
              // Clicking the play all button is the same as clicking
              // on the first item in the list.
              target = this.view.querySelector('li > a[data-index="0"]');
              // we have to unshuffle here
              // because play all button should play from the first song
              PlayerView.setShuffle(false);
            }

            var targetIndex = parseInt(target.dataset.index);

            if (PlayerView.shuffleOption) {
              // Shuffled list maybe not exist yet
              // because shuffleOption might be set by callback of asyncStorage.
              // We are unable to create one since
              // there is no playing dataSource when an user first launch Music.
              // Here we need to create a new shuffled list
              // and start from the song which a user clicked.
              PlayerView.shuffleList(targetIndex);
              PlayerView.play(PlayerView.shuffledList[0], this.backgroundIndex);
            } else {
              PlayerView.play(targetIndex, this.backgroundIndex);
            }
          }.bind(this));
        }
        break;

      case 'contextmenu':
        this.isContextmenu = true;

        var targetIndex = parseInt(target.dataset.index);
        var songData = this.dataSource[targetIndex];

        shareFile(songData.name);
        break;

      default:
        return;
    }
  }
};

var SearchView = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('search');
  },

  get searchArtistsView() {
    delete this._searchArtists;
    return this._searchArtists = document.getElementById(
      'views-search-artists');
  },

  get searchAlbumsView() {
    delete this._searchAlbums;
    return this._searchAlbums = document.getElementById(
      'views-search-albums');
  },

  get searchTitlesView() {
    delete this._searchTitles;
    return this._searchTitles = document.getElementById(
      'views-search-titles');
  },

  init: function sv_init() {
    this.dataSource = [];
    this.searchHandles = { artist: null, album: null, title: null };

    this.view.addEventListener('click', this);
  },

  search: function sv_search(query) {
    this.clearSearch();
    if (!query)
      return;

    query = query.toLocaleLowerCase();

    var lists = { artist: this.searchArtistsView,
                  album: this.searchAlbumsView,
                  title: this.searchTitlesView };
    var numResults = { artist: 0, album: 0, title: 0 };

    function sv_showResult(option, result) {
      if (result === null) {
        this.searchHandles[option] = null;
        return;
      }

      if (result.metadata[option].toLocaleLowerCase().indexOf(query) !== -1) {
        this.dataSource.push(result);

        numResults[option]++;
        lists[option].classList.remove('hidden');
        lists[option].getElementsByClassName('search-result-count')[0]
                     .textContent = numResults[option];
        lists[option].getElementsByClassName('search-results')[0].appendChild(
          createListElement(option, result, this.dataSource.length - 1)
        );
      }
    }

    this.searchHandles.artist = musicdb.enumerate(
      'metadata.artist', null, 'nextunique',
      sv_showResult.bind(this, 'artist')
    );
    this.searchHandles.album = musicdb.enumerate(
      'metadata.album', null, 'nextunique',
      sv_showResult.bind(this, 'album')
    );
    this.searchHandles.title = musicdb.enumerate(
      'metadata.title',
      sv_showResult.bind(this, 'title')
    );
  },

  clearSearch: function sv_clearSearch() {
    for (var option in this.searchHandles) {
      var handle = this.searchHandles[option];
      if (handle)
        musicdb.cancelEnumeration(handle);
    }

    var views = [this.searchArtistsView, this.searchAlbumsView,
                 this.searchTitlesView];
    views.forEach(function(view) {
      view.getElementsByClassName('search-results')[0].innerHTML = '';
      view.classList.add('hidden');
    });
    this.dataSource = [];
  },

  handleEvent: function sv_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'click':
        if (!target)
          return;

        if (target.dataset.index) {
          var handler;
          var index = target.dataset.index;

          var option = target.dataset.option;
          var keyRange = target.dataset.keyRange;
          var data = this.dataSource[index];
          handler = sv_openResult.bind(this, option, data, index, keyRange);

          target.addEventListener('transitionend', handler);
        }
        break;

      default:
        return;
    }

    function sv_openResult(option, data, index, keyRange) {
      if (option === 'title') {
        ModeManager.push(MODE_PLAYER, function() {
          PlayerView.setSourceType(TYPE_LIST);
          PlayerView.dataSource = [data];
          PlayerView.play(0, index % 10);
        });
      } else {
        SubListView.activate(option, data, index, keyRange, 'next', function() {
          ModeManager.push(MODE_SUBLIST);
        });
      }

      target.removeEventListener('transitionend', handler);
    }
  }
};

// Tab Bar
var TabBar = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('tabs');
  },

  init: function tab_init() {
    this.option = '';
    this.view.addEventListener('click', this);
  },

  setDisabled: function tab_setDisabled(option) {
    this.disabled = option;
  },

  handleEvent: function tab_handleEvent(evt) {
    if (this.disabled)
      return;

    switch (evt.type) {
      case 'click':
        var target = evt.target;

        if (!target)
          return;

        // if users click same option, ignore it
        if (this.option === target.dataset.option) {
          return;
        } else {
          this.option = target.dataset.option;
        }

        switch (target.id) {
          case 'tabs-mix':
            ModeManager.start(MODE_TILES);
            TilesView.hideSearch();

            break;
          case 'tabs-playlists':
            ModeManager.start(MODE_LIST);
            ListView.clean();

            // this array is for automated playlists
            var playlistArray = [
              {metadata: {title: shuffleAllTitle}, option: 'title'},
              {metadata: {title: highestRatedTitle}, option: 'rated'},
              {metadata: {title: recentlyAddedTitle}, option: 'date'},
              {metadata: {title: mostPlayedTitle}, option: 'played'},
              {metadata: {title: leastPlayedTitle}, option: 'played'},
              // update ListView with null result to hide the scan progress
              null
            ];

            playlistArray.forEach(function(playlist) {
              ListView.update(this.option, playlist);
            }.bind(this));

            break;
          case 'tabs-artists':
          case 'tabs-albums':
            ModeManager.start(MODE_LIST);
            ListView.clean();

            listHandle =
              musicdb.enumerate('metadata.' + this.option, null,
                                'nextunique',
                                ListView.update.bind(ListView, this.option));

            break;
        }

        break;

      default:
        return;
    }
  }
};

// Application start from here after 'DOMContentLoaded' event is fired.
// Initialize the view objects and default mode is TILES.
window.addEventListener('DOMContentLoaded', function() {
  TitleBar.init();
  TilesView.init();
  ListView.init();
  SubListView.init();
  SearchView.init();
  TabBar.init();

  ModeManager.start(MODE_TILES);
});
