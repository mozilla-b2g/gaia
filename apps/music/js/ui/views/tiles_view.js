/* exported TilesView */
/* global musicdb, TabBar, App, AlbumArt, SearchView, ModeManager,
          MODE_SEARCH_FROM_TILES, IDBKeyRange, MODE_PLAYER, PlayerView,
          musicdb, TYPE_LIST, showImage */
'use strict';

var TilesView = {
  get view() {
    return document.getElementById('views-tiles');
  },

  get anchor() {
    return document.getElementById('views-tiles-anchor');
  },

  get searchBox() {
    return document.getElementById('views-tiles-search');
  },

  get searchInput() {
    return document.getElementById('views-tiles-search-input');
  },

  get dataSource() {
    return this._dataSource;
  },

  set dataSource(source) {
    this._dataSource = source;
  },

  init: function tv_init() {
    this.handle = null;
    this.dataSource = [];
    this.index = 0;

    this.view.addEventListener('click', this);
    this.view.addEventListener('input', this);
    this.view.addEventListener('touchend', this);
    this.searchInput.addEventListener('focus', this);
    this.searchInput.addEventListener('keypress', this);
  },

  clean: function tv_clean() {
    // Cancel a pending enumeration before start a new one
    if (this.handle) {
      musicdb.cancelEnumeration(this.handle);
    }

    this.dataSource = [];
    this.index = 0;
    this.anchor.innerHTML = '';
    this.view.scrollTop = 0;
    this.hideSearch();
  },

  hideSearch: function tv_hideSearch() {
    this.searchInput.value = '';
    // XXX: we probably want to animate this...
    if (this.view.scrollTop < this.searchBox.offsetHeight) {
      this.view.scrollTop = this.searchBox.offsetHeight;
    }
  },

  update: function tv_update(result) {
    // if no songs in dataSource
    // disable the TabBar to prevent users switch to other page
    TabBar.setDisabled(!this.dataSource.length);

    if (result === null) {
      App.showCorrectOverlay();
      // Display the TilesView after when finished updating the UI
      document.getElementById('views-tiles').classList.remove('hidden');
      // After the hidden class is removed, hideSearch can be effected
      // because the computed styles are applied to the search elements
      // And ux wants the search bar to retain its position for about
      // a half second, but half second seems to short for notifying users
      // so we use one second instead of a half second
      window.setTimeout(this.hideSearch.bind(this), 1000);
      return;
    }

    this.dataSource.push(result);

    var tile = document.createElement('div');
    tile.className = 'tile';

    var container = document.createElement('div');
    container.className = 'tile-container';
    container.setAttribute('role', 'button');

    var albumArt = document.createElement('img');
    albumArt.className = 'tile-album-art';
    container.appendChild(albumArt);

    var titleBar = document.createElement('div');
    titleBar.className = 'tile-title-bar';
    var artistName = document.createElement('div');
    artistName.className = 'tile-title-artist';
    var artistNameText = document.createElement('bdi');
    artistName.appendChild(artistNameText);
    var albumName = document.createElement('div');
    albumName.className = 'tile-title-album';
    var albumNameText = document.createElement('bdi');
    albumName.appendChild(albumNameText);
    artistNameText.textContent =
      result.metadata.artist || navigator.mozL10n.get('unknownArtist');
    artistNameText.dataset.l10nId =
      result.metadata.artist ? '' : 'unknownArtist';
    albumNameText.textContent =
      result.metadata.album || navigator.mozL10n.get('unknownAlbum');
    albumNameText.dataset.l10nId = result.metadata.album ? '' : 'unknownAlbum';
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

    var NUM_INITIALLY_VISIBLE_TILES = 8;
    var INITIALLY_HIDDEN_TILE_WAIT_TIME_MS = 1000;

    var setTileBackgroundClosure = function(url) {
      showImage(albumArt, url);
    };

    if (this.index <= NUM_INITIALLY_VISIBLE_TILES) {
      // Load this tile's background now, because it's visible.
      AlbumArt.getCoverURL(result).then(setTileBackgroundClosure);
    } else {
      // Defer loading hidden tiles until the visible ones are done.
      setTimeout(function() {
        AlbumArt.getCoverURL(result).then(setTileBackgroundClosure);
      }, INITIALLY_HIDDEN_TILE_WAIT_TIME_MS);
    }

    container.dataset.index = this.index;

    // The tile info(album/artist) shows only when the cover does not exist
    if (!result.metadata.picture) {
      container.appendChild(titleBar);
    } else {
      container.setAttribute('aria-label', artistName.textContent + ' ' + 
                                           albumName.textContent);
    }

    tile.appendChild(container);
    this.anchor.appendChild(tile);

    this.index++;
  },

  handleEvent: function tv_handleEvent(evt) {
    function tv_resetSearch(self) {
      evt.preventDefault();
      self.searchInput.value = '';
      SearchView.clearSearch();
    }
    var target = evt.target;
    if (!target) {
      return;
    }

    switch (evt.type) {
      case 'touchend':
        // Check for tap on parent form element with event origin as clear buton
        // This is workaround for a bug in input_areas BB. See Bug 920770
        if (target.id === 'views-tiles-search') {
          var id = evt.originalTarget.id;
          if (id && id !== 'views-tiles-search-input' &&
            id !== 'views-tiles-search-close') {
            tv_resetSearch(this);
            return;
          }
        }

        if (target.id === 'views-tiles-search-clear') {
          tv_resetSearch(this);
          return;
        }

        break;

      case 'click':
        if (target.id === 'views-tiles-search-close') {
          if (ModeManager.currentMode === MODE_SEARCH_FROM_TILES) {
            ModeManager.pop();
          }
          this.hideSearch();
          evt.preventDefault();
        } else if (target.dataset.index) {
          tv_playAlbum(this.dataSource[target.dataset.index],
                       target.dataset.index);
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

      case 'keypress':
        if (target.id === 'views-tiles-search-input') {
          if (evt.keyCode === evt.DOM_VK_RETURN) {
            evt.preventDefault();
          }
        }
        break;

      default:
        return;
    }

    function tv_playAlbum(data, index) {
      var key = 'metadata.album';
      var range = IDBKeyRange.only(data.metadata.album);
      var direction = 'next';

      ModeManager.push(MODE_PLAYER, function() {
        PlayerView.clean();

        // When an user tap an album on the tilesView
        // we have to get all the song data first
        // because the shuffle option might be ON
        // and we have create shuffled list and play in shuffle order
        PlayerView.handle = musicdb.enumerateAll(key, range, direction,
          function tv_enumerateAll(dataArray) {
            PlayerView.setSourceType(TYPE_LIST);
            PlayerView.dataSource = dataArray;

            if (PlayerView.shuffleOption) {
              PlayerView.setShuffle(true);
              PlayerView.play(PlayerView.shuffledList[0]);
            } else {
              PlayerView.play(0);
            }
          }
        );
      });
    }
  }
};
