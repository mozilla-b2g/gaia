/* exported TilesView */
/* global AlbumArtCache, Database, IDBKeyRange, LazyLoader, ModeManager,
          MODE_PLAYER, MODE_SEARCH_FROM_TILES, PlaybackQueue, PlayerView,
          SearchView, showImage */
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
    this.searchInput.addEventListener('focus', this);
  },

  clean: function tv_clean() {
    this.dataSource = [];
    this.index = 0;
    this.anchor.innerHTML = '';
  },

  hideSearch: function tv_hideSearch() {
    this.searchInput.value = '';
    // XXX: we probably want to animate this...
    if (this.view.scrollTop < this.searchBox.offsetHeight) {
      this.view.scrollTop = this.searchBox.offsetHeight;
    }
  },

  activate: function tv_activate(callback) {
    // Enumerate existing song entries in the database. List them all, and
    // sort them in ascending order by album. Use enumerateAll() here so that
    // we get all the results we want and then pass them synchronously to the
    // _addItem() function. If we did it asynchronously, then we'd get one
    // redraw for every song.

    // Cancel a pending enumeration before starting a new one.
    if (this.handle) {
      Database.cancelEnumeration(this.handle);
    }

    this.handle = Database.enumerateAll('metadata.album', null, 'nextunique',
                                        function(songs) {
      TilesView.clean();
      songs.forEach(function(song) {
        TilesView._addItem(song);
      });

      // Display the TilesView once the UI has been populated.
      document.getElementById('views-tiles').classList.remove('hidden');

      if (callback) {
        callback(songs);
      }
    });
  },

  _addItem: function tv_addItem(result) {
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
    titleBar.appendChild(albumName);

    // There are 6 tiles in one group
    // and the first tile is the main-tile
    // so we mod 6 to find out who is the main-tile
    if (this.index % 6 === 0) {
      tile.classList.add('main-tile');
      artistName.classList.add('main-tile-title');
    } else {
      tile.classList.add('sub-tile');
      artistName.classList.add('sub-tile-title');
      albumName.classList.add('sub-tile-title');
    }

    var index = this.index;
    LazyLoader.load('js/metadata/album_art_cache.js').then(() => {
      var NUM_INITIALLY_VISIBLE_TILES = 8;
      var INITIALLY_HIDDEN_TILE_WAIT_TIME_MS = 1000;

      var setTileBackgroundClosure = function(url) {
        showImage(albumArt, url);
      };

      if (index <= NUM_INITIALLY_VISIBLE_TILES) {
        // Load this tile's background now, because it's visible.
        AlbumArtCache.getThumbnailURL(result).then(setTileBackgroundClosure);
      } else {
        // Defer loading hidden tiles until the visible ones are done.
        setTimeout(function() {
          AlbumArtCache.getThumbnailURL(result).then(setTileBackgroundClosure);
        }, INITIALLY_HIDDEN_TILE_WAIT_TIME_MS);
      }
    });

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
    var target = evt.target;
    if (!target) {
      return;
    }

    switch (evt.type) {
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
            ModeManager.start(MODE_SEARCH_FROM_TILES, function() {
              // Let the search view gets the focus.
              SearchView.searchInput.focus();
            });
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
        Database.enumerateAll(key, range, direction, (dataArray) => {
          PlayerView.activate(new PlaybackQueue.StaticQueue(dataArray));
          PlayerView.start();
        });
      });
    }
  }
};
