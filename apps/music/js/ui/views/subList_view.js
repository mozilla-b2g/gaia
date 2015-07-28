/* exported SubListView */
/* global AlbumArtCache, createListElement, Database, LazyLoader, ModeManager,
          MODE_PLAYER, PlayerView, showImage, TabBar, TYPE_LIST */
'use strict';

var SubListView = {
  get view() {
    return document.getElementById('views-sublist');
  },

  get dataSource() {
    return this._dataSource;
  },

  get anchor() {
    return document.getElementById('views-sublist-anchor');
  },

  set dataSource(source) {
    this._dataSource = source;

    // At the same time we also check how many songs in an album
    // Shuffle button is not necessary when an album only contains one song
    this.shuffleButton.disabled = (this._dataSource.length < 2);
  },

  init: function slv_init() {
    this.albumImage = document.getElementById('views-sublist-header-image');
    this.albumName = document.getElementById('views-sublist-header-name');
    this.playAllButton = document.getElementById('views-sublist-controls-play');
    this.shuffleButton =
      document.getElementById('views-sublist-controls-shuffle');

    this.handle = null;
    this.dataSource = [];
    this.index = 0;

    this.view.addEventListener('click', this);
  },

  clean: function slv_clean() {
    // Cancel a pending enumeration before start a new one
    if (this.handle) {
      Database.cancelEnumeration(this.handle);
    }

    this.dataSource = [];
    this.index = 0;
    this.anchor.innerHTML = '';
    this.view.scrollTop = 0;
  },

  setAlbumSrc: function slv_setAlbumSrc(fileinfo) {
    // See if we are viewing the predefined playlists, if so, then replace the
    // fileinfo with the first record in the dataSource to display the first
    // album art for every predefined playlist.
    if (TabBar.playlistArray.indexOf(fileinfo) !== -1) {
      fileinfo = this.dataSource[0];
    }

    LazyLoader.load('js/metadata/album_art_cache.js').then(() => {
      return AlbumArtCache.getThumbnailURL(fileinfo);
    }).then((url) => {
      showImage(this.albumImage, url);
    });
  },

  setAlbumName: function slv_setAlbumName(name, l10nId) {
    this.albumName.textContent = name;

    if (l10nId) {
      this.albumName.dataset.l10nId = l10nId;
    }
  },

  activate: function(option, data, index, keyRange, direction, callback) {
    var targetOption = (option === 'date') ? option : 'metadata.' + option;
    this.clean();

    this.handle = Database.enumerateAll(targetOption, keyRange, direction,
                                        function lv_enumerateAll(dataArray) {
      var albumName;
      var albumNameL10nId;
      var maxDiscNum = 1;

      if (option === 'album') {
        dataArray.sort(function(e1, e2) {
          return (e1.metadata.discnum - e2.metadata.discnum) ||
            (e1.metadata.tracknum - e2.metadata.tracknum);
        });

        maxDiscNum = Math.max(
          dataArray[dataArray.length - 1].metadata.disccount,
          dataArray[dataArray.length - 1].metadata.discnum
        );
      }

      if (option === 'artist') {
        albumName =
          data.metadata.artist || navigator.mozL10n.get('unknownArtist');
        albumNameL10nId = data.metadata.artist ? '' : 'unknownArtist';
      } else if (option === 'album') {
        albumName =
          data.metadata.album || navigator.mozL10n.get('unknownAlbum');
        albumNameL10nId = data.metadata.album ? '' : 'unknownAlbum';
      } else {
        albumName =
          data.metadata.title || navigator.mozL10n.get('unknownTitle');
        albumNameL10nId = data.metadata.title ? '' : 'unknownTitle';
      }

      // Overrides l10nId.
      if (data.metadata.l10nId) {
        albumNameL10nId = data.metadata.l10nId;
      }

      this.dataSource = dataArray;
      this.setAlbumName(albumName, albumNameL10nId);
      this.setAlbumSrc(data);

      var inPlaylist = (option !== 'artist' &&
                        option !== 'album' &&
                        option !== 'title');

      dataArray.forEach(function(songData) {
        songData.multidisc = (maxDiscNum > 1);
        this.update(songData, inPlaylist);
      }.bind(this));

      if (callback) {
        callback();
      }
    }.bind(this));
  },

  // Set inPlaylist to true if you want the index instead of the track #
  // By default it is the track #
  update: function slv_update(result, useIndexNumber) {
    if (result === null) {
      return;
    }

    var option = useIndexNumber ? 'song-index' : 'song';
    this.anchor.appendChild(createListElement(option, result, this.index));

    this.index++;
  },

  activatePlaylist: function(data, callback) {
    this.clean();
    document.getElementById('empty-playlist-overlay').classList.add('hidden');

    this.dataSource = data.songs;
    this.setAlbumName(data.name, null);

    //Don't keep previous image.
    this.albumImage.classList.remove('fadeIn');

    data.songs.forEach(function(songData) {
      this.update(songData);
    }.bind(this));

    if (data.songs.length === 0) {
      document.getElementById('empty-playlist-overlay').classList.remove('hidden');
    } else {
      document.getElementById('empty-playlist-overlay').classList.add('hidden');
    }

    if (callback) {
      callback();
    }
  },

  handleEvent: function slv_handleEvent(evt) {
    var target = evt.target;

    if (!target) {
      return;
    }

    switch (evt.type) {
      case 'click':
        if (target === this.shuffleButton) {
          ModeManager.push(MODE_PLAYER, function() {
            PlayerView.clean();
            PlayerView.setSourceType(TYPE_LIST);
            PlayerView.dataSource = this.dataSource;
            PlayerView.setShuffle(true);
            PlayerView.play(PlayerView.shuffledList[0]);
          }.bind(this));
          return;
        }

        if (target.dataset.index || target === this.playAllButton) {
          ModeManager.push(MODE_PLAYER, function() {
            PlayerView.clean();
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

            var targetIndex = parseInt(target.dataset.index, 10);

            if (PlayerView.shuffleOption) {
              // Shuffled list maybe not exist yet
              // because shuffleOption might be set by callback of asyncStorage.
              // We are unable to create one since
              // there is no playing dataSource when an user first launch Music.
              // Here we need to create a new shuffled list
              // and start from the song which a user clicked.
              PlayerView.shuffleList(targetIndex);
              PlayerView.play(PlayerView.shuffledList[0]);
            } else {
              PlayerView.play(targetIndex);
            }
          }.bind(this));
        }
        break;

      default:
        return;
    }
  }
};
