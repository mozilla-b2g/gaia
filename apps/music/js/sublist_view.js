'use strict';

/*
 * This is the Sublist View for the Music Application of Gaia
 */


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

  setAlbumName: function slv_setAlbumName(name, l10nId) {
    this.albumName.textContent = name;
    this.albumName.dataset.l10nId = l10nId;
  },

  activate: function(option, data, index, keyRange, direction, callback) {
    var targetOption = (option === 'date') ? option : 'metadata.' + option;
    SubListView.clean();

    sublistHandle = musicdb.enumerateAll(targetOption, keyRange, direction,
                                         function lv_enumerateAll(dataArray) {
      var albumName;
      var albumNameL10nId;

      if (option === 'artist') {
        albumName = data.metadata.artist || unknownArtist;
        albumNameL10nId = data.metadata.artist ? '' : unknownArtistL10nId;
      } else if (option === 'album') {
        albumName = data.metadata.album || unknownAlbum;
        albumNameL10nId = data.metadata.album ? '' : unknownAlbumL10nId;
      } else {
        albumName = data.metadata.title || unknownTitle;
        albumNameL10nId = data.metadata.title ? '' : unknownTitleL10nId;
      }

      // Overrides l10nId.
      if (data.metadata.l10nId)
        albumNameL10nId = data.metadata.l10nId;

      SubListView.setAlbumName(albumName, albumNameL10nId);
      SubListView.setAlbumDefault(index);
      SubListView.dataSource = dataArray;

      if (data.metadata.picture)
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

