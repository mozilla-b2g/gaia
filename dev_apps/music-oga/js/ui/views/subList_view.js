/* exported SubListView */
/* global AlbumArtCache, createListElement, Database, LazyLoader, ModeManager,
          MODE_PLAYER, PlaybackQueue, PlayerView, showImage, TabBar */
'use strict';

var SubListView = {
  unknownNameL10nIds: {
    'artist': 'unknownArtist',
    'album': 'unknownAlbum',
    'title': 'unknownTitle'
  },

  get view() {
    return document.getElementById('views-sublist');
  },

  get dataSource() {
    return this._dataSource;
  },

  get anchor() {
    return document.getElementById('views-sublist-anchor');
  },

  get headerImage() {
    return document.getElementById('views-sublist-header-image');
  },

  get headerName() {
    return document.getElementById('views-sublist-header-name');
  },

  get playAllButton() {
    return document.getElementById('views-sublist-controls-play');
  },

  get shuffleButton() {
    return document.getElementById('views-sublist-controls-shuffle');
  },

  set dataSource(source) {
    this._dataSource = source;

    // At the same time we also check how many songs in an album
    // Shuffle button is not necessary when an album only contains one song
    this.shuffleButton.disabled = (this._dataSource.length < 2);
  },

  init: function slv_init() {
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

  setHeaderImage: function slv_setHeaderImage(fileinfo) {
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

  setHeaderName: function slv_setHeaderName(name, l10nId) {
    this.headerName.textContent = name;
    this.headerName.dataset.l10nId = l10nId;
  },

  activate: function(option, data, index, keyRange, direction, callback) {
    var targetOption = (option === 'date') ? option : 'metadata.' + option;
    this.clean();

    this.handle = Database.enumerateAll(targetOption, keyRange, direction,
                                        (dataArray) => {
      var headerName;
      var headerNameL10nId = '';
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

      var inPlaylist = (option !== 'artist' &&
                        option !== 'album' &&
                        option !== 'title');

      headerName = data.metadata[inPlaylist ? 'title' : option];
      if (!headerName) {
        headerNameL10nId = this.unknownNameL10nIds[option];
        headerName = navigator.mozL10n.get(headerNameL10nId);
      }

      // Overrides l10nId.
      if (data.metadata.l10nId) {
        headerNameL10nId = data.metadata.l10nId;
      }

      this.dataSource = dataArray;
      this.setHeaderName(headerName, headerNameL10nId);
      this.setHeaderImage(data);

      dataArray.forEach((songData) => {
        songData.multidisc = (maxDiscNum > 1);
        this.update(songData, inPlaylist);
      });

      if (callback) {
        callback();
      }
    });
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

  handleEvent: function slv_handleEvent(evt) {
    var target = evt.target;

    if (!target) {
      return;
    }

    switch (evt.type) {
      case 'click':
        if (target === this.shuffleButton || target === this.playAllButton) {
          ModeManager.push(MODE_PLAYER, () => {
            PlayerView.clean();
            PlaybackQueue.shuffle = (target === this.shuffleButton);
            PlayerView.activate(new PlaybackQueue.StaticQueue(this.dataSource));
            PlayerView.start();
          });
        } else if (target.dataset.index) {
          ModeManager.push(MODE_PLAYER, () => {
            PlayerView.clean();
            var targetIndex = parseInt(target.dataset.index, 10);
            PlayerView.activate(new PlaybackQueue.StaticQueue(
              this.dataSource, targetIndex
            ));
            PlayerView.start();
          });
        }
        break;

      default:
        return;
    }
  }
};
