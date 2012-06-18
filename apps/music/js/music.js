'use strict';

/*
 * This is Music Application of Gaia
 */
var songs = [];

// When the app starts, we scan device storage for musics.
// For now, we just do this each time. But we really need to store
// filenames and audio metadata in a database.
var storages = navigator.getDeviceStorage('music');

storages.forEach(function(storage, storageIndex) {
  try {
    var cursor = storage.enumerate();

    cursor.onerror = function() {
      console.error('Error in DeviceStorage.enumerate()', cursor.error.name);
    };

    cursor.onsuccess = function() {
      if (!cursor.result)
        return;

      // If this is the first song we've found,
      // hide the "no songs" message
      if (songs.length === 0) {
        document.getElementById('nosongs').style.display = 'none';
      }

      var file = cursor.result;

      var songData = {
        storageIndex: storageIndex,
        name: file.name
      };

      // Meta-data parsing of mp3 and ogg files
      // On B2G devices, file.type of mp3 format is missing
      // use file extension instead of file.type
      var extension = file.name.slice(-4);

      if (extension === '.mp3') {

        ID3.loadTags(file.name, function() {
          var tags = ID3.getAllTags(file.name);

          songData.album = tags.album;
          songData.artist = tags.artist;
          songData.title = tags.title;

          songs.push(songData);
          ListView.updateList(songData);

          cursor.continue();
        }, {
          dataReader: FileAPIReader(file)
        });

      } else if (extension === '.ogg') {
        var oggfile = new OggFile(file, function() {

          songData.album = oggfile.metadata.ALBUM;
          songData.artist = oggfile.metadata.ARTIST;
          songData.title = oggfile.metadata.TITLE;

          songs.push(songData);
          ListView.updateList(songData);

          cursor.continue();
        });
        oggfile.parse();
      } else {
        cursor.continue();
      }
    };
  }
  catch (e) {
    console.error('Exception while enumerating files:', e);
  }
});

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

        changeMode(MODE_PLAYER);

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

  updateList: function lv_updateList(songData) {
    var songTitle = (songData.title) ? songData.title : 'Unknown';

    var li = document.createElement('li');
    li.className = 'song';

    var a = document.createElement('a');
    a.href = '#';
    a.dataset.index = this.index;
    a.textContent = (this.index + 1) + '. ' + songTitle;

    li.appendChild(a);

    this.view.appendChild(li);

    this.index++;
  },

  handleEvent: function lv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        if (!target)
          return;

        changeMode(MODE_PLAYER);

        PlayerView.dataSource = this.dataSource;
        PlayerView.play(target);

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
    this.title = document.getElementById('player-cover-title');
    this.artist = document.getElementById('player-cover-artist');

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

  play: function pv_play(target) {
    this.isPlaying = true;

    if (target) {
      var targetIndex = parseInt(target.dataset.index);
      var songData = songs[targetIndex];

      this.title.textContent = (songData.title) ? songData.title : 'Unknown';
      this.artist.textContent = (songData.artist) ? songData.artist : 'Unknown';
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
      this.audio.buffered.end(this.audio.buffered.length - 1);
    var endTime = (originalEndTime > 1000000) ?
      originalEndTime / 1000000 :
      originalEndTime;

    var currentTime = this.audio.currentTime;

    this.seekBar.min = startTime;
    this.seekBar.max = endTime;
    this.seekBar.value = currentTime;

    this.seekElapsed.textContent = formatTime(currentTime);
    this.seekRemaining.textContent = '-' + formatTime(endTime - currentTime);
  },

  updateSeekBar: function pv_updateSeekBar() {
    if (this.isPlaying) {
      this.seekAudio();
    }
  },

  handleEvent: function pv_handleEvent(evt) {
    var target = evt.target;
      if (!target)
        return;

    switch (evt.type) {
      case 'click':
        switch (target.id) {
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

// Application start from here after 'DOMContentLoaded' event is fired.
// Initialize the view objects and default mode is TILES.
window.addEventListener('DOMContentLoaded', function() {
  TitleBar.init();
  TilesView.init();
  ListView.init();
  PlayerView.init();

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
