'use strict';

/*
 * This is Music Application of Gaia
 */

// Here we use the MediaDB.js which gallery is using
// to index our music contents with metadata parsed.
// So the behaviors of musicdb are the same as the MediaDB in gallery
var musicdb = new MediaDB('music', metadataParser, {
  indexes: ['metadata.album', 'metadata.artist', 'metadata.title'],
  // mp3 mediaType: 'audio/mpeg'
  // ogg mediaType: 'video/ogg'
  // empty mediaType: no mp3 mediaType on B2G device
  // desktop build does not has this issue
  mimeTypes: ['audio/mpeg', 'video/ogg', '']
});
musicdb.onready = function() {
  buildUI();  // List files we already know about
  musicdb.scan();  // Go look for more.

  // Since DeviceStorage doesn't send notifications yet, we're going
  // to rescan the files every time our app becomes visible again.
  // Eventually DeviceStorage will do notifications and MediaDB will
  // report them so we don't need to do this.
  document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      musicdb.scan();
    }
  });
};
musicdb.onchange = function(type, files) {
  rebuildUI();
};

function buildUI() {
  // Enumerate existing song entries in the database
  // List the all, and sort them in ascending order by artist.
  var option = 'artist';

  musicdb.enumerate('metadata.' + option, null, 'nextunique',
    ListView.update.bind(ListView, option));
}

//
// XXX
// This is kind of a hack. Our onchange handler is dumb and just
// tears down and rebuilds the UI on every change. But rebuilding
// does an async enumerate, and sometimes we get two changes in
// a row, so these flags prevent two enumerations from happening in parallel.
// Ideally, we'd just handle the changes individually.
//
var buildingUI = false;
var needsRebuild = false;
function rebuildUI() {
  if (buildingUI) {
    needsRebuild = true;
    return;
  }

  buildingUI = true;
  ListView.clean();
  // This is asynchronous, but will set buildingUI to false when done
  buildUI();

}

// This Application has four modes, TILES, LIST, SUBLIST and PLAYER
var MODE_TILES = 1;
var MODE_LIST = 2;
var MODE_SUBLIST = 3;
var MODE_PLAYER = 4;
var currentMode;

function changeMode(mode) {
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
            if (currentMode === MODE_SUBLIST) {
              changeMode(MODE_LIST);
            } else if (currentMode === MODE_PLAYER) {
              changeMode(MODE_SUBLIST);
            }

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
    for (var i = 0; i < 36; i++) {
      var tile = document.createElement('div');
      var defaultImage = document.createElement('div');
      defaultImage.innerHTML = '&#9834;';
      
      // There are 6 tiles in one group
      // and the first tile is the main-tile
      // so we mod 6 to find out who is the main-tile
      if (i % 6 === 0) {
        tile.classList.add('main-tile');
        defaultImage.classList.add('main-tile-default-image');
      } else {
        tile.classList.add('sub-tile');
        defaultImage.classList.add('sub-tile-default-image');
      }

      // Since 6 tiles are in one group
      // the even group will be floated to left
      // the odd group will be floated to right 
      if (Math.floor(i / 6) % 2 === 0) {
        tile.classList.add('float-left');
      } else {
        tile.classList.add('float-right');
      }
      
      tile.appendChild(defaultImage);
      this.view.appendChild(tile);
    }
    
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
  },

  clean: function lv_clean() {
    this.dataSource = [];
    this.index = 0;
    this.view.innerHTML = '';
    this.view.scrollTop = 0;
  },

  setItemImage: function lv_setItemImage(item, image) {
    // Set source to image and crop it to be fitted when it's onloded
    if (image) {
      item.addEventListener('load', cropImage);
      item.src = createBase64URL(image);
    }
  },

  update: function lv_update(option, result) {
    if (result === null)
      return;

    if (this.dataSource.length === 0)
      document.getElementById('nosongs').style.display = 'none';

    this.dataSource.push(result);

    var li = document.createElement('li');
    li.className = 'list-item';

    var a = document.createElement('a');
    a.href = '#';
    a.dataset.index = this.index;

    var parent = document.createElement('div');
    parent.className = 'list-image-parent';
    var div = document.createElement('div');
    div.className = 'list-default-image';
    div.innerHTML = '&#9834;';
    var img = document.createElement('img');
    img.className = 'list-image';

    parent.appendChild(div);
    parent.appendChild(img);

    var image = result.metadata.picture;
    this.setItemImage(img, image);

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
          var image = data.metadata.picture;

          if (image)
            SubListView.setAlbumSrc(createBase64URL(image));

          if (option === 'artist') {
            SubListView.setAlbumName(data.metadata.artist);
          } else if (option === 'album') {
            SubListView.setAlbumName(data.metadata.album);
          } else {
            SubListView.setAlbumName(data.metadata.title);
          }

          var keyRange = (target.dataset.keyRange != 'all') ?
            IDBKeyRange.only(target.dataset.keyRange) : null;

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

    this.albumImage = document.getElementById('views-sublist-header-image');
    this.albumName = document.getElementById('views-sublist-header-name');

    this.view.addEventListener('click', this);
  },

  clean: function slv_clean() {
    this.dataSource = [];
    this.index = 0;
    this.albumImage.src = '';
    this.anchor.innerHTML = '';
    this.view.scrollTop = 0;
  },

  setAlbumSrc: function slv_setAlbumSrc(url) {
    // Set source to image and crop it to be fitted when it's onloded
    this.albumImage.src = url;
    this.albumImage.classList.remove('fadeIn');
    this.albumImage.addEventListener('load', slv_showImage.bind(this));

    function slv_showImage(evt) {
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

    var songTitle = (result.metadata.title) ? result.metadata.title :
      navigator.mozL10n.get('unknownTitle');

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
        if (!target)
          return;

        if (target.dataset.index) {
          PlayerView.dataSource = this.dataSource;
          PlayerView.play(target);

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
    this.caption = document.getElementById('player-cover-caption');
    this.coverImage = document.getElementById('player-cover-image');
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
    this.audio.addEventListener('ended', this);
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

  setCoverImage: function pv_setCoverImage(image) {
    // Reset the image to be ready for fade-in
    this.coverImage.src = '';
    this.coverImage.classList.remove('fadeIn');

    // Set source to image and crop it to be fitted when it's onloded
    if (image) {
      this.coverImage.src = createBase64URL(image);
      this.coverImage.addEventListener('load', pv_showImage.bind(this));
    }

    function pv_showImage(evt) {
      cropImage(evt);
      this.coverImage.classList.add('fadeIn');
    };
  },

  play: function pv_play(target) {
    this.isPlaying = true;

    this.showInfo();

    if (target) {
      var targetIndex = parseInt(target.dataset.index);
      var songData = this.dataSource[targetIndex];
      var image = songData.metadata.picture;

      TitleBar.changeTitleText((songData.metadata.title) ?
        songData.metadata.title : navigator.mozL10n.get('unknownTitle'));
      this.artist.textContent = (songData.metadata.artist) ?
        songData.metadata.artist : navigator.mozL10n.get('unknownArtist');
      this.album.textContent = (songData.metadata.album) ?
        songData.metadata.album : navigator.mozL10n.get('unknownAlbum');
      this.currentIndex = targetIndex;

      this.setCoverImage(image);

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
    var songElements = SubListView.anchor.children;

    if (this.currentIndex >= this.dataSource.length - 1)
      return;

    this.currentIndex++;

    this.play(songElements[this.currentIndex].firstElementChild);
  },

  previous: function pv_previous() {
    var songElements = SubListView.anchor.children;

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
          case 'player-cover-default-image':
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
      case 'ended':
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
    this.view.addEventListener('click', this);
  },

  handleEvent: function tab_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var target = evt.target;
        var option = target.dataset.option;
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

            ListView.update(option, data);
            break;
          case 'tabs-artists':
          case 'tabs-albums':
            changeMode(MODE_LIST);
            ListView.clean();

            musicdb.enumerate('metadata.' + option, null, 'nextunique',
              ListView.update.bind(ListView, option));

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
  document.body.classList.remove('invisible');
});
