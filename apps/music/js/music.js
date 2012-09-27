'use strict';

/*
 * This is Music Application of Gaia
 */

var unknownAlbum;
var unknownArtist;
var unknownTitle;
// The MediaDB object that manages the filesystem and the database of metadata
// See init()
var musicdb;
var isEmpty = true;

function init() {
  // Here we use the mediadb.js which gallery is using (in shared/js/)
  // to index our music contents with metadata parsed.
  // So the behaviors of musicdb are the same as the MediaDB in gallery
  musicdb = new MediaDB('music', parseAudioMetadata, {
    indexes: ['metadata.album', 'metadata.artist', 'metadata.title']
  });

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  musicdb.onunavailable = function(why) {
    if (why === 'unavailable')
      showOverlay('nocard');
    else if (why === 'shared')
      showOverlay('cardinuse');
  }

  musicdb.onready = function() {
    // Hide the nocard overlay if it is displayed
    if (currentOverlay === 'nocard')
      showOverlay(null);

    showCurrentView();  // Display song covers we know about

    // Each time we become ready there may be an entirely new set of
    // music in device storage (new SD card, or USB mass storage transfer)
    // so we have to rescan each time.
    scan();
  };

  // Since DeviceStorage doesn't send notifications yet, we're going
  // to rescan the files every time our app becomes visible again.
  // Eventually DeviceStorage will do notifications and MediaDB will
  // report them so we don't need to do this.
  document.addEventListener('mozvisibilitychange', function vc() {
    if (!document.mozHidden && musicdb.ready) {
      // Users may change system language, so re-set localization here
      setLocalization();

      scan();
    }
  });

  // Notification of files that are added or deleted.
  // Eventually device storage will let us know about these.
  // For now we have to call scan(), which will trigger this function.
  musicdb.onchange = function(type, files) {
    if (type === 'deleted') {
      // TODO handle deleted files
      showCurrentView();
    }
    else if (type === 'created') {
      // TODO handle new files
      showCurrentView();
    }
  };
}

function scan() {
  //
  // XXX: is it too intrusive to display the scan overlay every time?
  //
  // Can I do it on first launch only and after that
  // display some smaller scanning indicator that does not prevent
  // the user from using the app right away?
  //
  showOverlay('scanning');   // Tell the user we're scanning
  musicdb.scan(function() {  // Run this function when scan is complete
    if (isEmpty)
      showOverlay('nosongs');
    else
      showOverlay(null);     // Hide the overlay
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
//   cardinuse: the sdcard is being used by USB mass storage
//   nosongs: no songs found
//   scanning: the app is scanning for new photos
//
// Localization is done using the specified id with "-title" and "-text"
// suffixes.
//
function showOverlay(id) {
  currentOverlay = id;

  var title = navigator.mozL10n.get(id + '-title');
  var text = navigator.mozL10n.get(id + '-text');

  if (id === null) {
    document.getElementById('overlay').classList.add('hidden');
    return;
  }

  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-text').textContent = text;
  document.getElementById('overlay').classList.remove('hidden');
}

// We need two handles here to cancel enumerations
// one is for tilesView, another one is for listView
var tilesHandle = null;
var listHandle = null;
var sublistHandle = null;

function showCurrentView() {
  TilesView.clean();
  // Enumerate existing song entries in the database
  // List the all, and sort them in ascending order by artist.
  var option = 'artist';

  tilesHandle = musicdb.enumerate('metadata.' + option, null, 'nextunique',
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

    isEmpty = true;
    showOverlay('nosongs');
  },

  setItemImage: function tv_setItemImage(item, fileinfo) {
    // Set source to image and crop it to be fitted when it's onloded
    if (!fileinfo.metadata.picture)
      return;

    item.addEventListener('load', cropImage);
    createAndSetCoverURL(item, fileinfo);
  },

  update: function tv_update(result) {
    if (result === null)
      return;

    // If we were showing the 'no songs' overlay, hide it
    if (currentOverlay === 'nosongs')
      showOverlay(null);

    isEmpty = false;

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
  },

  setItemImage: function lv_setItemImage(item, fileinfo) {
    // Set source to image and crop it to be fitted when it's onloded
    if (fileinfo.metadata.picture) {
      item.addEventListener('load', cropImage);
      createAndSetCoverURL(item, fileinfo);
    }
  },

  update: function lv_update(option, result) {
    if (result === null)
      return;

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
        albumSpan.textContent = result.metadata.album;
        artistSpan.textContent = result.metadata.artist;
        a.appendChild(albumSpan);
        a.appendChild(artistSpan);

        a.dataset.keyRange = result.metadata.album;
        a.dataset.option = option;

        break;
      case 'artist':
        var artistSpan = document.createElement('span');
        artistSpan.className = 'list-single-title';
        artistSpan.textContent = result.metadata.artist;
        a.appendChild(artistSpan);

        a.dataset.keyRange = result.metadata.artist;
        a.dataset.option = option;

        break;
      case 'playlist':
        var titleSpan = document.createElement('span');
        titleSpan.className = 'list-single-title';
        titleSpan.textContent = result.metadata.title;
        a.appendChild(titleSpan);

        a.dataset.keyRange = 'all';
        a.dataset.option = 'title';

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

          if (data.metadata.picture)
            SubListView.setAlbumSrc(data);

          if (option === 'artist') {
            SubListView.setAlbumName(data.metadata.artist);
          } else if (option === 'album') {
            SubListView.setAlbumName(data.metadata.album);
          } else {
            SubListView.setAlbumName(data.metadata.title);
          }

          var keyRange = (target.dataset.keyRange != 'all') ?
            IDBKeyRange.only(target.dataset.keyRange) : null;

          sublistHandle =
            musicdb.enumerate('metadata.' + option, keyRange, 'next',
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

    this.albumDefault = document.getElementById('views-sublist-header-default');
    this.albumImage = document.getElementById('views-sublist-header-image');
    this.albumName = document.getElementById('views-sublist-header-name');
    this.playAllButton = document.getElementById('views-sublist-controls-play');
    this.shuffleButton =
      document.getElementById('views-sublist-controls-shuffle');

    this.view.addEventListener('click', this);
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
    createAndSetCoverURL(this.albumImage, fileinfo);
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
    if (result === null)
      return;

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
    switch (evt.type) {
      case 'click':
        var target = evt.target;

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

      default:
        return;
    }
  }
};

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

    this.seekBar = document.getElementById('player-seek-bar-progress');
    this.seekElapsed = document.getElementById('player-seek-elapsed');
    this.seekRemaining = document.getElementById('player-seek-remaining');

    this.playControl = document.getElementById('player-controls-play');

    this.isPlaying = false;
    this.playingFormat = '';
    this.dataSource = [];
    this.currentIndex = 0;
    this.backgroundIndex = 0;

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

  play: function pv_play(target, backgroundIndex) {
    this.isPlaying = true;

    if (this.endedTimer) {
      clearTimeout(this.endedTimer);
      this.endedTimer = null;
    }

    this.showInfo();

    if (target) {
      var targetIndex = parseInt(target.dataset.index);
      var songData = this.dataSource[targetIndex];

      TitleBar.changeTitleText((songData.metadata.title) ?
        songData.metadata.title : unknownTitle);
      this.artist.textContent = (songData.metadata.artist) ?
        songData.metadata.artist : unknownArtist;
      this.album.textContent = (songData.metadata.album) ?
        songData.metadata.album : unknownAlbum;
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

      musicdb.getFile(this.dataSource[targetIndex].name, function(file) {
        // On B2G devices, file.type of mp3 format is missing
        // use file extension instead of file.type
        this.playingFormat = file.name.slice(-4);

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

    this.playControl.innerHTML = '||';
  },

  pause: function pv_pause() {
    this.isPlaying = false;

    this.audio.pause();

    this.playControl.innerHTML = '&#9654;';
  },

  next: function pv_next() {
    var songElements = (this.sourceType === TYPE_MIX) ?
      TilesView.view.children : SubListView.anchor.children;

    if (this.currentIndex >= this.dataSource.length - 1)
      return;

    this.currentIndex++;

    this.play(songElements[this.currentIndex].firstElementChild);
  },

  previous: function pv_previous() {
    var songElements = (this.sourceType === TYPE_MIX) ?
      TilesView.view.children : SubListView.anchor.children;

    if (this.currentIndex <= 0)
      return;

    this.currentIndex--;

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
                                         this.next();
                                       }.bind(this),
                                       timeToNext * 1000);
        }
        break;
      case 'ended':
        // Because of the workaround above, we have to ignore real ended
        // events if we already have a timer set to emulate them
        if (!this.endedTimer)
          this.next();
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

  handleEvent: function tab_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        this.option = target.dataset.option;
        if (!target)
          return;

        switch (target.id) {
          case 'tabs-mix':
            changeMode(MODE_TILES);

            break;
          case 'tabs-playlists':
            changeMode(MODE_LIST);
            ListView.clean();

            var data = {
              metadata: {
                title: 'All Songs'
              }
            };

            ListView.update(this.option, data);
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

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
function setLocalization() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // Get prepared for the unknown strings, these will be used later
  unknownAlbum = navigator.mozL10n.get('unknownAlbum');
  unknownArtist = navigator.mozL10n.get('unknownArtist');
  unknownTitle = navigator.mozL10n.get('unknownTitle');
}

window.addEventListener('localized', function showBody() {
  setLocalization();

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('invisible');

  init();
});
