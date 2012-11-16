'use strict';

/*
 * This is Music Application of Gaia
 */

// unknown strings for localization
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

var scanning = false;
var scanningFoundChanges = false;

// We get a localized event when the application is launched and when
// the user switches languages.
window.addEventListener('localized', function onlocalized() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // Get prepared for the unknown strings, these will be used later
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

// We get headphoneschange event when the headphones is plugged or unplugged
// Note that mozAudioChannelManager is not ready yet
// The name of the interfaces might change in future
// A related Bug 809106 in Bugzilla
var acm = navigator.mozAudioChannelManager;

if (acm) {
  acm.addEventListener('headphoneschange', function onheadphoneschange() {
    if (!acm.headphones && PlayerView.isPlaying) {
      PlayerView.pause();
    }
  });
}

// We will use a wake lock later to prevent Music from sleeping
var cpuLock = null;

function init() {
  // Here we use the mediadb.js which gallery is using (in shared/js/)
  // to index our music contents with metadata parsed.
  // So the behaviors of musicdb are the same as the MediaDB in gallery
  musicdb = new MediaDB('music', parseAudioMetadata, {
    indexes: ['metadata.album', 'metadata.artist', 'metadata.title',
              'metadata.rated', 'metadata.played', 'date']
  });

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  musicdb.onunavailable = function(event) {
    var why = event.detail;
    if (why === MediaDB.NOCARD)
      showOverlay('nocard');
    else if (why === MediaDB.UNMOUNTED)
      showOverlay('pluggedin');
  }

  musicdb.onready = function() {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (currentOverlay === 'nocard' || currentOverlay === 'pluggedin')
      showOverlay(null);

    showCurrentView();  // Display song covers we know about
  };

  // When musicdb scans, let the user know
  musicdb.onscanstart = function() {
    scanning = true;
    scanningFoundChanges = false;
    showScanProgress();
  };

  // And hide the throbber when scanning is done
  musicdb.onscanend = function() {
    scanning = false;
    hideScanProgress();

    // if the scan found any changes, update the UI now
    if (scanningFoundChanges) {
      scanningFoundChanges = false;
      showCurrentView();
    }
  };

  // When MediaDB finds new or deleted files, it sends created and deleted
  // events. During scanning we may get lots of them. Bluetooth file transfer
  // can also result in created events. The way the app is currently
  // structured, all we can do is rebuild the entire UI with the updated
  // list of files. We don't want to do this while scanning, though because
  // it we may end up rebuilding it over and over. So we defer the rebuild
  // until the scan ends
  musicdb.oncreated = musicdb.ondeleted = function(event) {
    if (scanning)
      scanningFoundChanges = true;
    else
      showCurrentView();
  };
}

// show and hide scanning progress
function showScanProgress() {
  document.getElementById('progress').classList.remove('hidden');
  document.getElementById('throbber').classList.add('throb');
}

function hideScanProgress() {
  document.getElementById('progress').classList.add('hidden');
  document.getElementById('throbber').classList.remove('throb');
}

//
// Web Activities
//

// Use Web Activities to share files
function shareFile(filename) {
  musicdb.getFile(filename, function(file) {
    var a = new MozActivity({
      name: 'share',
      data: {
        type: file.type,
        number: 1,
        blobs: [file],
        filenames: [filename]
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

// We need three handles here to cancel enumerations
// for tilesView, listView and sublistView
var tilesHandle = null;
var listHandle = null;
var sublistHandle = null;

function showCurrentView() {
  TilesView.clean();
  // Enumerate existing song entries in the database
  // List the all, and sort them in ascending order by album.
  var option = 'metadata.album';

  tilesHandle = musicdb.enumerate(option, null, 'nextunique',
                                  TilesView.update.bind(TilesView));
  switch (TabBar.option) {
    case 'playlist':
      // TODO update the predefined playlists
      break;
    case 'artist':
    case 'album':
      changeMode(MODE_LIST);
      ListView.clean();

      listHandle =
        musicdb.enumerate('metadata.' + TabBar.option, null, 'nextunique',
                          ListView.update.bind(ListView, TabBar.option));
      break;
  }

}

// This Application has four modes, TILES, LIST, SUBLIST and PLAYER
var MODE_TILES = 1;
var MODE_LIST = 2;
var MODE_SUBLIST = 3;
var MODE_PLAYER = 4;
var currentMode, fromMode;

function changeMode(mode) {
  if (mode === currentMode)
    return;

  if (fromMode >= mode) {
    fromMode = mode - 1;
  } else {
    fromMode = currentMode;
  }
  currentMode = mode;

  document.body.classList.remove('tiles-mode');
  document.body.classList.remove('list-mode');
  document.body.classList.remove('sublist-mode');
  document.body.classList.remove('player-mode');

  switch (mode) {
    case MODE_TILES:
      document.body.classList.add('tiles-mode');
      break;
    case MODE_LIST:
      document.body.classList.add('list-mode');
      break;
    case MODE_SUBLIST:
      document.body.classList.add('sublist-mode');
      break;
    case MODE_PLAYER:
      document.body.classList.add('player-mode');
      break;
  }
}

// We have two types of the playing sources
// These are for player to know which source type is playing
var TYPE_MIX = 'mix';
var TYPE_LIST = 'list';

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

  init: function tb_init() {
    this.view.addEventListener('click', this);
  },

  changeTitleText: function tb_changeTitleText(content) {
    this.titleText.textContent = content;
  },

  handleEvent: function tb_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        if (!target)
          return;

        switch (target.id) {
          case 'title-back':
            changeMode(fromMode);

            break;
          case 'title-text':
            // We cannot to switch to player mode
            // when there is no song in the source of player
            if (PlayerView.audio.src)
              changeMode(MODE_PLAYER);

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
  },

  clean: function tv_clean() {
    // Cancel a pending enumeration before start a new one
    if (tilesHandle)
      musicdb.cancelEnumeration(tilesHandle);

    this.dataSource = [];
    this.index = 0;
    this.view.innerHTML = '';
    this.view.scrollTop = 0;

    showScanProgress();
  },

  setItemImage: function tv_setItemImage(item, fileinfo) {
    // Set source to image and crop it to be fitted when it's onloded
    if (!fileinfo.metadata.thumbnail)
      return;

    item.addEventListener('load', cropImage);
    createAndSetCoverURL(item, fileinfo, true);
  },

  update: function tv_update(result) {
    // if no songs in dataSource
    // disable the TabBar to prevent users switch to other page
    TabBar.setDisabled(!this.dataSource.length);

    if (result === null) {
      // The enumeration is complete, so hide the animated progress bar
      hideScanProgress();

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

      return;
    }

    this.dataSource.push(result);

    var tile = document.createElement('div');

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

    var img = document.createElement('img');
    img.className = 'tile-image';

    this.setItemImage(img, result);

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

    tile.classList.add('default-album-' + this.index % 10);

    container.dataset.index = this.index;

    container.appendChild(img);
    container.appendChild(titleBar);
    tile.appendChild(container);
    this.view.appendChild(tile);

    this.index++;
  },

  handleEvent: function tv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        if (!target)
          return;

        if (target.dataset.index) {
          var handler = tv_playSong.bind(this);

          target.addEventListener('transitionend', handler);
        }

        break;

      default:
        return;
    }

    function tv_playSong() {
      PlayerView.setSourceType(TYPE_MIX);
      PlayerView.dataSource = this.dataSource;
      PlayerView.play(target);

      changeMode(MODE_PLAYER);
      target.removeEventListener('transitionend', handler);
    }
  }
};

// View of List
var ListView = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('views-list');
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

    this.view.addEventListener('click', this);
  },

  clean: function lv_clean() {
    // Cancel a pending enumeration before start a new one
    if (listHandle)
      musicdb.cancelEnumeration(listHandle);

    this.dataSource = [];
    this.index = 0;
    this.view.innerHTML = '';
    this.view.scrollTop = 0;

    showScanProgress();
  },

  setItemImage: function lv_setItemImage(item, fileinfo) {
    // Set source to image and crop it to be fitted when it's onloded
    if (fileinfo.metadata.thumbnail) {
      item.addEventListener('load', cropImage);
      createAndSetCoverURL(item, fileinfo, true);
    }
  },

  update: function lv_update(option, result) {
    if (result === null) {
      hideScanProgress();
      return;
    }

    this.dataSource.push(result);

    var li = document.createElement('li');
    li.className = 'list-item';

    var a = document.createElement('a');
    a.href = '#';
    a.dataset.index = this.index;

    var parent = document.createElement('div');
    parent.className = 'list-image-parent';
    parent.classList.add('default-album-' + this.index % 10);
    var img = document.createElement('img');
    img.className = 'list-image';

    if (result.metadata.picture)
      parent.appendChild(img);

    this.setItemImage(img, result);

    switch (option) {
      case 'album':
        var albumSpan = document.createElement('span');
        var artistSpan = document.createElement('span');
        albumSpan.className = 'list-main-title';
        artistSpan.className = 'list-sub-title';
        albumSpan.textContent = result.metadata.album || unknownAlbum;
        artistSpan.textContent = result.metadata.artist || unknownArtist;
        a.appendChild(albumSpan);
        a.appendChild(artistSpan);

        a.dataset.keyRange = result.metadata.album;
        a.dataset.option = option;

        break;
      case 'artist':
        var artistSpan = document.createElement('span');
        artistSpan.className = 'list-single-title';
        artistSpan.textContent = result.metadata.artist || unknownArtist;
        a.appendChild(artistSpan);

        a.dataset.keyRange = result.metadata.artist;
        a.dataset.option = option;

        break;
      case 'playlist':
        var titleSpan = document.createElement('span');
        titleSpan.className = 'list-single-title';
        titleSpan.textContent = result.metadata.title || unknownTitle;
        a.appendChild(titleSpan);

        a.dataset.keyRange = 'all';
        a.dataset.option = result.option;

        break;
      default:
        return;
    }

    li.appendChild(a);
    li.appendChild(parent);

    this.view.appendChild(li);

    this.index++;
  },

  handleEvent: function lv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        if (!target)
          return;

        var option = target.dataset.option;
        if (option) {
          SubListView.clean();

          var index = target.dataset.index;
          var data = this.dataSource[index];

          SubListView.setAlbumDefault(index);

          if (data.metadata.thumbnail)
            SubListView.setAlbumSrc(data);

          if (option === 'artist') {
            SubListView.setAlbumName(data.metadata.artist || unknownArtist);
          } else if (option === 'album') {
            SubListView.setAlbumName(data.metadata.album || unknownAlbum);
          } else {
            SubListView.setAlbumName(data.metadata.title || unknownTitle);
          }

          var targetOption =
            (option === 'date') ? option : 'metadata.' + option;
          var keyRange = (target.dataset.keyRange != 'all') ?
            IDBKeyRange.only(target.dataset.keyRange) : null;
          var direction =
           (data.metadata.title === mostPlayedTitle ||
            data.metadata.title === recentlyAddedTitle ||
            data.metadata.title === highestRatedTitle) ? 'prev' : 'next';

          sublistHandle =
            musicdb.enumerate(targetOption, keyRange, direction,
                              SubListView.update.bind(SubListView));

          changeMode(MODE_SUBLIST);
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
  },

  init: function slv_init() {
    this.dataSource = [];
    this.index = 0;
    this.backgroundIndex = 0;
    this.isContextmenu = false;

    this.albumDefault = document.getElementById('views-sublist-header-default');
    this.albumImage = document.getElementById('views-sublist-header-image');
    this.albumName = document.getElementById('views-sublist-header-name');
    this.playAllButton = document.getElementById('views-sublist-controls-play');
    this.shuffleButton =
      document.getElementById('views-sublist-controls-shuffle');

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

    showScanProgress();
  },

  shuffle: function slv_shuffle() {
    var list = this.dataSource;
    shuffle(list);
    this.dataSource = [];
    this.index = 0;
    this.anchor.innerHTML = '';
    for (var i = 0; i < list.length; i++)
      this.update(list[i]);

    // shuffle the elements of array a in place
    // http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    function shuffle(a) {
      for (var i = a.length - 1; i >= 1; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        if (j < i) {
          var tmp = a[j];
          a[j] = a[i];
          a[i] = tmp;
        }
      }
    }

  },

  setAlbumDefault: function slv_setAlbumDefault(index) {
    var realIndex = index % 10;

    this.albumDefault.classList.remove('default-album-' + this.backgroundIndex);
    this.albumDefault.classList.add('default-album-' + realIndex);
    this.backgroundIndex = realIndex;
  },

  setAlbumSrc: function slv_setAlbumSrc(fileinfo) {
    // Set source to image and crop it to be fitted when it's onloded
    createAndSetCoverURL(this.albumImage, fileinfo, true);
    this.albumImage.classList.remove('fadeIn');
    this.albumImage.addEventListener('load', slv_showImage.bind(this));

    function slv_showImage(evt) {
      // Don't register multiple copies
      evt.target.removeEventListener('load', slv_showImage);
      cropImage(evt);
      this.albumImage.classList.add('fadeIn');
    };
  },

  setAlbumName: function slv_setAlbumName(name) {
    this.albumName.textContent = name;
  },

  update: function slv_update(result) {
    if (result === null) {
      hideScanProgress();
      return;
    }

    this.dataSource.push(result);

    var li = document.createElement('li');
    li.className = 'list-song-item';

    var a = document.createElement('a');
    a.href = '#';

    var songTitle = (result.metadata.title) ?
      result.metadata.title : unknownTitle;

    a.dataset.index = this.index;

    var titleSpan = document.createElement('span');
    titleSpan.className = 'list-song-title';
    titleSpan.textContent = (this.index + 1) + '. ' + songTitle;
    a.appendChild(titleSpan);

    li.appendChild(a);

    this.anchor.appendChild(li);

    this.index++;
  },

  handleEvent: function slv_handleEvent(evt) {
    var target = evt.target;

    switch (evt.type) {
      case 'click':
        if (this.isContextmenu) {
          this.isContextmenu = false;
          return;
        }

        if (target === this.shuffleButton) {
          this.shuffle();
          break;
        }

        if (target === this.playAllButton) {
          // Clicking the play all button is the same as clicking
          // on the first item in the list.
          target = this.view.querySelector('li > a[data-index="0"]');
        }

        if (target && target.dataset.index) {
          PlayerView.setSourceType(TYPE_LIST);
          PlayerView.dataSource = this.dataSource;
          PlayerView.play(target, this.backgroundIndex);

          changeMode(MODE_PLAYER);
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

// Repeat option for player
var REPEAT_OFF = 0;
var REPEAT_LIST = 1;
var REPEAT_SONG = 2;

// Key for store options of repeat and shuffle
var SETTINGS_OPTION_KEY = 'settings_option_key';

// View of Player
var PlayerView = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('views-player');
  },

  get audio() {
    delete this._audio;
    return this._audio = document.getElementById('player-audio');
  },

  get isPlaying() {
    return this._isPlaying;
  },

  set isPlaying(val) {
    this._isPlaying = val;
  },

  get dataSource() {
    return this._dataSource;
  },

  set dataSource(source) {
    this._dataSource = source;
  },

  init: function pv_init() {
    this.artist = document.getElementById('player-cover-artist');
    this.album = document.getElementById('player-cover-album');

    this.timeoutID;
    this.cover = document.getElementById('player-cover');
    this.coverImage = document.getElementById('player-cover-image');

    this.repeatButton = document.getElementById('player-album-repeat');
    this.shuffleButton = document.getElementById('player-album-shuffle');

    this.ratings = document.getElementById('player-album-rating').children;

    this.seekBar = document.getElementById('player-seek-bar-progress');
    this.seekElapsed = document.getElementById('player-seek-elapsed');
    this.seekRemaining = document.getElementById('player-seek-remaining');

    this.playControl = document.getElementById('player-controls-play');

    this.isPlaying = false;
    this.dataSource = [];
    this.currentIndex = 0;
    this.backgroundIndex = 0;

    asyncStorage.getItem(SETTINGS_OPTION_KEY, this.setOptions.bind(this));

    this.view.addEventListener('click', this);

    // Seeking audio too frequently causes the Desktop build hangs
    // A related Bug 739094 in Bugzilla
    this.seekBar.addEventListener('mousemove', this);

    this.audio.addEventListener('timeupdate', this);
    this.audio.addEventListener('ended', this);

    // A timer we use to work around
    // https://bugzilla.mozilla.org/show_bug.cgi?id=783512
    this.endedTimer = null;
  },

  setSourceType: function pv_setSourceType(type) {
    this.sourceType = type;
  },

  // This function is for the animation on the album art (cover).
  // The info (album, artist) will initially show up when a song being played,
  // if users does not tap the album art (cover) again,
  // then it will be disappeared after 5 seconds
  // however, if a user taps before 5 seconds ends,
  // then the timeout will be cleared to keep the info on screen.
  showInfo: function pv_showInfo() {
    this.cover.classList.add('slideOut');

    if (this.timeoutID)
      window.clearTimeout(this.timeoutID);

    this.timeoutID = window.setTimeout(
      function pv_hideInfo() {
        this.cover.classList.remove('slideOut');
      }.bind(this),
      5000
    );
  },

  setCoverBackground: function pv_setCoverBackground(index) {
    var realIndex = index % 10;

    this.cover.classList.remove('default-album-' + this.backgroundIndex);
    this.cover.classList.add('default-album-' + realIndex);
    this.backgroundIndex = realIndex;
  },

  setCoverImage: function pv_setCoverImage(fileinfo) {
    // Reset the image to be ready for fade-in
    this.coverImage.src = '';
    this.coverImage.classList.remove('fadeIn');

    // Set source to image and crop it to be fitted when it's onloded
    if (fileinfo.metadata.picture) {
      createAndSetCoverURL(this.coverImage, fileinfo);
      this.coverImage.addEventListener('load', pv_showImage);
    }

    function pv_showImage(evt) {
      evt.target.removeEventListener('load', pv_showImage);
      cropImage(evt);
      evt.target.classList.add('fadeIn');
    };
  },

  setOptions: function pv_setOptions(settings) {
    var repeatOption = (settings && settings.repeat) ?
      settings.repeat : REPEAT_OFF;
    var shuffleOption = (settings && settings.shuffle) ?
      settings.shuffle : false;

    this.setRepeat(repeatOption);
    this.setShuffle(shuffleOption);
  },

  setRepeat: function pv_setRepeat(value) {
    var repeatClasses = ['repeat-off', 'repeat-list', 'repeat-song'];

    // Remove all repeat classes before applying a new one
    repeatClasses.forEach(function pv_resetRepeat(targetClass) {
      this.repeatButton.classList.remove(targetClass);
    }.bind(this));

    this.repeatOption = value;
    this.repeatButton.classList.add(repeatClasses[this.repeatOption]);
  },

  setShuffle: function pv_setShuffle(value) {
    this.shuffleOption = value;

    if (this.shuffleOption) {
      this.shuffleButton.classList.add('shuffle-on');
    } else {
      this.shuffleButton.classList.remove('shuffle-on');
    }
  },

  setRatings: function pv_setRatings(rated) {
    for (var i = 0; i < 5; i++) {
      var rating = this.ratings[i];

      if (i < rated) {
        rating.classList.add('star-on');
      } else {
        rating.classList.remove('star-on');
      }
    }
  },

  play: function pv_play(target, backgroundIndex) {
    this.isPlaying = true;

    // Hold a wake lock to prevent from sleeping
    if (!cpuLock)
      cpuLock = navigator.requestWakeLock('cpu');

    if (this.endedTimer) {
      clearTimeout(this.endedTimer);
      this.endedTimer = null;
    }

    this.showInfo();

    if (target) {
      var targetIndex = parseInt(target.dataset.index);
      var songData = this.dataSource[targetIndex];

      TitleBar.changeTitleText(songData.metadata.title || unknownTitle);
      this.artist.textContent = songData.metadata.artist || unknownArtist;
      this.album.textContent = songData.metadata.album || unknownAlbum;
      this.currentIndex = targetIndex;

      // backgroundIndex is from the index of sublistView
      // for playerView to show same default album art (same index)
      if (backgroundIndex || backgroundIndex === 0) {
        this.setCoverBackground(backgroundIndex);
      }

      // We only update the default album art when source type is MIX
      if (this.sourceType === TYPE_MIX) {
        this.setCoverBackground(targetIndex);
      }

      this.setCoverImage(songData);

      // set ratings of the current song
      this.setRatings(songData.metadata.rated);

      // update the metadata of the current song
      songData.metadata.played++;
      musicdb.updateMetadata(songData.name, songData.metadata);

      musicdb.getFile(songData.name, function(file) {
        // An object URL must be released by calling URL.revokeObjectURL()
        // when we no longer need them
        var url = URL.createObjectURL(file);
        this.audio.src = url;
        this.audio.onloadeddata = function(evt) { URL.revokeObjectURL(url); };

        // when play a new song, reset the seekBar first
        // this can prevent showing wrong duration
        // due to b2g cannot get some mp3's duration
        // and the seekBar can still show 00:00 to -00:00
        this.setSeekBar(0, 0, 0);
      }.bind(this));
    } else {
      this.audio.play();
    }

    this.playControl.classList.remove('is-pause');
  },

  pause: function pv_pause() {
    this.isPlaying = false;

    // We can go to sleep if music pauses
    if (cpuLock) {
      cpuLock.unlock();
      cpuLock = null;
    }

    this.audio.pause();

    this.playControl.classList.add('is-pause');
  },

  next: function pv_next(isAutomatic) {
    var songElements = (this.sourceType === TYPE_MIX) ?
      TilesView.view.children : SubListView.anchor.children;

    // We only repeat a song automatically. (when the song is ended)
    // If users click skip forward, player will go on to next one
    if (this.repeatOption === REPEAT_SONG && isAutomatic) {
      this.play(songElements[this.currentIndex].firstElementChild);
      return;
    }

    // If it's a last song and repeat list is OFF, ignore it.
    // but if repeat list is ON, player will restart from the first song
    if (this.currentIndex >= this.dataSource.length - 1) {
      if (this.repeatOption === REPEAT_LIST) {
        this.currentIndex = 0;
      } else {
        return;
      }
    } else {
      this.currentIndex++;
    }

    this.play(songElements[this.currentIndex].firstElementChild);
  },

  previous: function pv_previous() {
    var songElements = (this.sourceType === TYPE_MIX) ?
      TilesView.view.children : SubListView.anchor.children;

    // If a song starts more than 3 (seconds),
    // when users click skip backward, it will restart the current song
    // otherwise just skip to the previous song
    if (this.audio.currentTime > 3) {
      this.play(songElements[this.currentIndex].firstElementChild);
      return;
    }

    // If it's a first song and repeat list is ON, go to the last one
    // or just restart from the beginning when repeat list is OFF
    if (this.currentIndex <= 0) {
      this.currentIndex = (this.repeatOption === REPEAT_LIST) ?
        this.dataSource.length - 1 : 0;
    } else {
      this.currentIndex--;
    }

    this.play(songElements[this.currentIndex].firstElementChild);
  },

  updateSeekBar: function pv_updateSeekBar() {
    if (this.isPlaying) {
      this.seekAudio();
    }
  },

  seekAudio: function pv_seekAudio(seekTime) {
    if (seekTime)
      this.audio.currentTime = seekTime;

    // mp3 returns in microseconds
    // ogg returns in seconds
    // note this may be a bug cause mp3 shows wrong duration in
    // gecko's native audio player
    // A related Bug 740124 in Bugzilla
    var startTime = this.audio.startTime;

    var originalEndTime =
      (this.audio.duration && this.audio.duration != 'Infinity') ?
      this.audio.duration :
      this.audio.buffered.end(this.audio.buffered.length - 1);

    // now mp3 returns in seconds, but keep this checking to prevent bugs
    var endTime = (originalEndTime > 1000000) ?
      Math.floor(originalEndTime / 1000000) :
      Math.floor(originalEndTime);

    var currentTime = this.audio.currentTime;

    this.setSeekBar(startTime, endTime, currentTime);
  },

  setSeekBar: function pv_setSeekBar(startTime, endTime, currentTime) {
    this.seekBar.min = startTime;
    this.seekBar.max = endTime;
    this.seekBar.value = currentTime;

    this.seekElapsed.textContent = formatTime(currentTime);
    this.seekRemaining.textContent = '-' + formatTime(endTime - currentTime);
  },

  handleEvent: function pv_handleEvent(evt) {
    var target = evt.target;
      if (!target)
        return;

    switch (evt.type) {
      case 'click':
        switch (target.id) {
          case 'player-cover':
          case 'player-cover-image':
            this.showInfo();

            break;

          case 'player-seek-bar-progress':
            // target is the seek bar, and evt.layerX is the clicked position
            var seekTime = evt.layerX / target.clientWidth * target.max;
            this.seekAudio(seekTime);

            break;

          case 'player-controls-previous':
            this.previous();

            break;

          case 'player-controls-play':
            if (this.isPlaying) {
              this.pause();
            } else {
              this.play();
            }

            break;

          case 'player-controls-next':
            this.next();

            break;

          case 'player-album-repeat':
            this.showInfo();

            var newValue = ++this.repeatOption % 3;
            // Store the option when it's triggered by users
            asyncStorage.setItem(SETTINGS_OPTION_KEY, {
              repeat: newValue,
              shuffle: this.shuffleOption
            });

            this.setRepeat(newValue);

            break;

          case 'player-album-shuffle':
            this.showInfo();

            var newValue = !this.shuffleOption;
            // Store the option when it's triggered by users
            asyncStorage.setItem(SETTINGS_OPTION_KEY, {
              repeat: this.repeatOption,
              shuffle: newValue
            });

            this.setShuffle(newValue);

            break;
        }

        if (target.dataset.rating) {
          this.showInfo();

          var songData = this.dataSource[this.currentIndex];
          songData.metadata.rated = parseInt(target.dataset.rating);

          musicdb.updateMetadata(songData.name, songData.metadata,
            this.setRatings.bind(this, parseInt(target.dataset.rating)));
        }

        break;
      case 'mousemove':
        // target is the seek bar, and evt.layerX is the moved position
        var seekTime = evt.layerX / target.clientWidth * target.max;
        this.seekAudio(seekTime);
        break;
      case 'timeupdate':
        this.updateSeekBar();

        // Since we don't always get reliable 'ended' events, see if
        // we've reached the end this way.
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
        // If we're within 1 second of the end of the song, register
        // a timeout to skip to the next song one second after the song ends
        if (this.audio.currentTime >= this.audio.duration - 1 &&
            this.endedTimer == null) {
          var timeToNext = (this.audio.duration - this.audio.currentTime + 1);
          this.endedTimer = setTimeout(function() {
                                         this.endedTimer = null;
                                         this.next(true);
                                       }.bind(this),
                                       timeToNext * 1000);
        }
        break;
      case 'ended':
        // Because of the workaround above, we have to ignore real ended
        // events if we already have a timer set to emulate them
        if (!this.endedTimer)
          this.next(true);
        break;

      default:
        return;
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
            changeMode(MODE_TILES);

            break;
          case 'tabs-playlists':
            changeMode(MODE_LIST);
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
            changeMode(MODE_LIST);
            ListView.clean();

            listHandle =
              musicdb.enumerate('metadata.' + this.option, null,
                                'nextunique',
                                ListView.update.bind(ListView, this.option));

            break;
          case 'tabs-more':

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
  PlayerView.init();
  TabBar.init();

  changeMode(MODE_TILES);

  window.addEventListener('keyup', function keyPressHandler(evt) {
    if (evt.keyCode == evt.DOM_VK_ESCAPE) {
      switch (currentMode) {
        case MODE_TILES:
          break;
        case MODE_LIST:
          changeMode(MODE_TILES);
          evt.preventDefault();
          break;
        case MODE_SUBLIST:
          changeMode(MODE_LIST);
          evt.preventDefault();
          break;
        case MODE_PLAYER:
          changeMode(MODE_SUBLIST);
          evt.preventDefault();
          break;
      }
    }
  });
});
