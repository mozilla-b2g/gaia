'use strict';

/*
 * This is Music Application of Gaia
 */

// Hard-coded ogg files as testing songs
var songs = [
  {
    file: 'audio/jonobacon-freesoftwaresong2.ogg',
    title: 'The Free Software Song',
    artist: 'Jono Bacon'
  },
  {
    file: 'audio/b2g.ogg',
    title: 'Boot to Gecko',
    artist: 'Brendan Eich'
  },
  {
    file: 'audio/Salt_Creek.ogg',
    title: 'Salt Creek',
    artist: 'The Rogue Bluegrass Band'
  },
  {
    file: 'audio/treasure_island_01-02_stevenson.ogg',
    title: 'Treasure Island',
    artist: 'Read by Adrian Praetzellis'
  }
];

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

    this.view.addEventListener('click', this);

    this.updateList(songs);
  },

  updateList: function lv_updateList(source) {
    var content = '';
    var index = 0;

    source.forEach(function(song) {
      content += '<li class="song">' +
                 '  <a href="#" id="' + escapeHTML(song.file, true) + '" ' +
                 '   data-title="' + escapeHTML(song.title, true) + '" ' +
                 '   data-artist="' + escapeHTML(song.artist, true) + '" ' +
                 '   data-index="' + index + '" ' + '>' +
                 '    ' + escapeHTML(song.title) + ' - ' +
                          escapeHTML(song.artist) +
                 '  </a>' +
                 '</li>';
      index++;
    });
    this.view.innerHTML = content;

    this.dataSource = source;
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
      this.title.textContent = target.dataset.title;
      this.artist.textContent = target.dataset.artist;
      this.audio.src = target.id;
      this.currentIndex = parseInt(target.dataset.index);
    } else {
      this.audio.play();
    }

    this.playControl.textContent = 'Pause';
  },

  pause: function pv_pause() {
    this.isPlaying = false;

    this.audio.pause();

    this.playControl.textContent = 'Play';
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

    var endTime =
      Math.floor(this.audio.buffered.end(this.audio.buffered.length - 1));
    var startTime = Math.floor(this.audio.startTime);
    var currentTime = Math.floor(this.audio.currentTime);

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
