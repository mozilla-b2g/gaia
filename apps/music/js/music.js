'use strict';

/*
 * This is Music Application of Gaia
 */
var songs = [];

var musicdb = new MediaDB('music', metadataParser, {
  indexes: ['metadata.album', 'metadata.artist'],
  mimeTypes: ['audio/mpeg', 'video/ogg', '']
});
musicdb.onready = function() {
  document.getElementById('nosongs').style.display = 'none';
  // List files we already know about
  musicdb.scan();    // Go look for more.

  // Since DeviceStorage doesn't send notifications yet, we're going
  // to rescan the files every time our app becomes visible again.
  // This means that if we switch to camera and take a photo, then when
  // we come back to gallery we should be able to find the new photo.
  // Eventually DeviceStorage will do notifications and MediaDB will
  // report them so we don't need to do this.
  document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      musicdb.scan();
    }
  });
};
musicdb.onchange = function(type, files) {
  //rebuildUI();
};

// This App. has three modes, TILES, LIST and PLAYER
var MODE_TILES = 1;
var MODE_LIST = 2;
var MODE_PLAYER = 3;
var currentMode;

function changeMode(mode) {
  currentMode = mode;

  document.body.classList.remove('tiles-mode');
  document.body.classList.remove('list-mode');
  document.body.classList.remove('player-mode');

  switch (mode) {
    case MODE_TILES:
      document.body.classList.add('tiles-mode');
      break;
    case MODE_LIST:
      document.body.classList.add('list-mode');
      break;
    case MODE_PLAYER:
      document.body.classList.add('player-mode');
      break;
  }
}

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
            changeMode(MODE_LIST);

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

  init: function tv_init() {
    this.view.addEventListener('click', this);
  },

  handleEvent: function tv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        if (!target)
          return;

        changeMode(MODE_LIST);

        break;

      default:
        return;
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

    this.dataSource = songs;
  },

  cleanList: function lv_cleanList() {
    this.view.innerHTML = '';
  },

  updateList: function lv_updateList(data, option) {
    var li = document.createElement('li');
    li.className = 'song';

    var a = document.createElement('a');
    a.href = '#';

    switch (option) {
      case 'album':
        a.textContent = data.album;
        a.dataset.keyRange = data.album;
        a.dataset.option = option;

        break;
      case 'artist':
        a.textContent = data.artist;
        a.dataset.keyRange = data.artist;
        a.dataset.option = option;

        break;
      case 'playlist':

        break;
      case 'song':
        var songTitle = (data.title) ? data.title :
          navigator.mozL10n.get('unknownTitle');

        a.dataset.index = this.index;
        a.textContent = (this.index + 1) + '. ' + songTitle;

        this.index++;

        break;
    }
    
    li.appendChild(a);

    this.view.appendChild(li);
  },

  handleEvent: function lv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        if (!target)
          return;

        var option = target.dataset.option;
        if (option) {
          ListView.cleanList();
          this.index = 0;
          
          var keyRange = IDBKeyRange.only(target.dataset.keyRange);

          var addListItem = function(result) {
            if (result === null)
              return;

            ListView.updateList(result.metadata, 'song');
          };

          musicdb.enumerate('metadata.' + option, keyRange, 'next', addListItem);
        } else {
          changeMode(MODE_PLAYER);

          PlayerView.dataSource = this.dataSource;
          PlayerView.play(target);

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
    this.caption = document.getElementById('player-cover-caption');
    this.coverControl = document.getElementById('player-cover-buttons');

    this.seekBar = document.getElementById('player-seek-bar-progress');
    this.seekElapsed = document.getElementById('player-seek-elapsed');
    this.seekRemaining = document.getElementById('player-seek-remaining');

    this.playControl = document.getElementById('player-controls-play');

    this.isPlaying = false;
    this.playingFormat = '';
    this.dataSource = [];
    this.currentIndex = 0;

    this.view.addEventListener('click', this);

    // Seeking audio too frequently causes the Desktop build hangs
    // A related Bug 739094 in Bugzilla
    this.seekBar.addEventListener('mousemove', this);

    this.audio.addEventListener('timeupdate', this);
  },

  // This function is for the animation on the album art (cover).
  // The info (album, artist) will initially show up when a song being played,
  // if users does not tap the album art (cover) again,
  // then it will be disappeared after 5 seconds
  // however, if a user taps before 5 seconds ends,
  // then the timeout will be cleared to keep the info on screen.
  showInfo: function pv_showInfo() {
    this.caption.classList.remove('resetSilde');
    this.caption.classList.add('slideDown');

    this.coverControl.classList.remove('resetSilde');
    this.coverControl.classList.add('slideUp');

    if (this.timeoutID)
      window.clearTimeout(this.timeoutID);

    this.timeoutID = window.setTimeout(
      function pv_hideInfo() {
        this.caption.classList.remove('slideDown');
        this.caption.classList.add('resetSilde');

        this.coverControl.classList.remove('slideUp');
        this.coverControl.classList.add('resetSilde');
      }.bind(this),
      5000
    );
  },

  play: function pv_play(target) {
    this.isPlaying = true;

    this.showInfo();

    if (target) {
      var targetIndex = parseInt(target.dataset.index);
      var songData = songs[targetIndex];

      TitleBar.changeTitleText((songData.title) ?
        songData.title : navigator.mozL10n.get('unknownTitle'));
      this.artist.textContent = (songData.artist) ?
        songData.artist : navigator.mozL10n.get('unknownArtist');
      this.album.textContent = (songData.album) ?
        songData.album : navigator.mozL10n.get('unknownAlbum');
      this.currentIndex = targetIndex;

      // An object URL must be released by calling window.URL.revokeObjectURL()
      // when we no longer need them
      this.audio.onloadeddata = function(evt) {
        window.URL.revokeObjectURL(this.src);
      }

      storages[songData.storageIndex].get(songData.name).onsuccess =
        function(evt) {
          // On B2G devices, file.type of mp3 format is missing
          // use file extension instead of file.type
          this.playingFormat = evt.target.result.name.slice(-4);

          this.audio.src = window.URL.createObjectURL(evt.target.result);

          // when play a new song, reset the seekBar first
          // this can prevent showing wrong duration
          // due to b2g cannot get some mp3's duration
          // and the seekBar can still show 00:00 to -00:00
          this.setSeekBar(0, 0, 0);
        }.bind(this);
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
    var songElements = ListView.view.children;

    if (this.currentIndex >= this.dataSource.length - 1)
      return;

    this.currentIndex++;

    this.play(songElements[this.currentIndex].firstElementChild);
  },

  previous: function pv_previous() {
    var songElements = ListView.view.children;

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
    this.view.addEventListener('click', this);
  },

  handleEvent: function tab_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        if (!target)
          return;

        switch (target.id) {
          case 'tabs-mix':
            changeMode(MODE_TILES);

            break;
          case 'tabs-playlists':
          case 'tabs-artists':
          case 'tabs-albums':
            changeMode(MODE_LIST);
            ListView.cleanList();
            
            var option = target.dataset.option;
            
            var addListItem = function(result) {
              if (result === null)
                return;
              
              ListView.updateList(result.metadata, option);
            };
            
            musicdb.enumerate('metadata.' + option, null, 'nextunique', addListItem);

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
        case MODE_PLAYER:
          changeMode(MODE_LIST);
          evt.preventDefault();
          break;
      }
    }
  });
});

window.addEventListener('localized', function showBody() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
