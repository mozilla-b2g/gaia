/* exported SearchView */
/* global App, createListElement, Database, ListView, ModeManager, MODE_LIST,
          MODE_PLAYER, MODE_SEARCH_FROM_TILES, MODE_SUBLIST, MODE_TILES,
          PlaybackQueue, PlayerView, SubListView, TabBar, TilesView */
'use strict';

var SearchView = {
  context: {
    ALL: 'ALL',
    ARTISTS: 'ARTISTS',
    ALBUMS: 'ALBUMS',
    SONGS: 'SONGS',
  },

  searchContext: 'ALL',

  get view() {
    return document.getElementById('views-search');
  },

  get searchInput() {
    return document.getElementById('views-search-input');
  },

  get searchArtistsView() {
    return document.getElementById('views-search-artists');
  },

  get searchAlbumsView() {
    return document.getElementById('views-search-albums');
  },

  get searchTitlesView() {
    return document.getElementById('views-search-titles');
  },

  showNoResult: function sv_showNoResult(show) {
    var view = document.getElementById('views-search-no-result');
    view.classList.toggle('hidden', !show);
  },

  init: function sv_init() {
    this.dataSource = [];
    this.searchHandles = { artist: null, album: null, title: null };

    this.view.addEventListener('click', this);
    this.view.addEventListener('touchend', this);
    this.searchInput.addEventListener('focus', this);
    this.searchInput.addEventListener('input', this);
    this.searchInput.addEventListener('keypress', this);
  },

  switchContext: function sv_switchContext() {
    switch (TabBar.option) {
      case 'mix':
      case 'playlist':
        this.searchContext = SearchView.context.ALL;
        break;
      case 'artist':
        this.searchContext = SearchView.context.ARTISTS;
        break;
      case 'album':
        this.searchContext = SearchView.context.ALBUMS;
        break;
      case 'title':
        this.searchContext = SearchView.context.SONGS;
        break;
    }
  },

  search: function sv_search(query) {
    this.clear();
    if (!query) {
      return;
    }

    var lists = { artist: this.searchArtistsView,
                  album: this.searchAlbumsView,
                  title: this.searchTitlesView };
    var numResults = { artist: 0, album: 0, title: 0 };

    function sv_showResult(option, result) {
      /* jshint validthis:true */
      if (result === null) {
        this.searchHandles[option] = null;
        var totalFound = numResults.artist + numResults.album +
                         numResults.title;
        this.showNoResult(totalFound === 0);
        return;
      }

      this.dataSource.push(result);
      numResults[option]++;
      lists[option].classList.remove('hidden');
      lists[option].getElementsByClassName('search-result-count')[0]
                   .textContent = numResults[option];
      lists[option].getElementsByClassName('search-results')[0].appendChild(
        createListElement(option, result, this.dataSource.length - 1, query)
      );
      this.showNoResult(false);
    }

    // Only shows the search results of tracks when it's in picker mode
    if (!App.pendingPick) {
      if (this.searchContext === this.context.ALL ||
          this.searchContext === this.context.ARTISTS) {
        this.searchHandles.artist = Database.search(
          'artist', query, sv_showResult.bind(this, 'artist')
        );
      }
      if (this.searchContext === this.context.ALL ||
          this.searchContext === this.context.ALBUMS) {
        this.searchHandles.album = Database.search(
          'album', query, sv_showResult.bind(this, 'album')
        );
      }
    }

    if (this.searchContext === this.context.ALL ||
        this.searchContext === this.context.SONGS) {
      this.searchHandles.title = Database.search(
        'title', query, sv_showResult.bind(this, 'title')
      );
    }
  },

  clear: function sv_clear() {
    for (var option in this.searchHandles) {
      var handle = this.searchHandles[option];
      if (handle) {
        Database.cancelEnumeration(handle);
      }
    }

    var views = [this.searchArtistsView, this.searchAlbumsView,
                 this.searchTitlesView];
    views.forEach(function(view) {
      view.getElementsByClassName('search-results')[0].innerHTML = '';
      view.classList.add('hidden');
    });
    this.showNoResult(false);
    this.dataSource = [];
  },

  hide: function sv_hide() {
    this.searchInput.value = '';
    this.clear();

    if (ModeManager.currentMode === MODE_SEARCH_FROM_TILES) {
      ModeManager.start(MODE_TILES, function() {
        TilesView.hideSearch();
      });
    } else {
      ModeManager.start(MODE_LIST, function() {
        ListView.hideSearch();
      });
    }
  },

  openResult: function sv_openResult(target) {
    var index = target.dataset.index;

    var option = target.dataset.option;
    var keyRange = target.dataset.keyRange;
    var data = this.dataSource[index];

    if (option === 'title') {
      ModeManager.push(MODE_PLAYER, () => {
        PlayerView.activate(new PlaybackQueue.StaticQueue([data]));
        PlayerView.start();
      });
    } else {
      // SubListView needs to prepare the songs data before entering it,
      // So here we initialize the SubListView before push the view.
      ModeManager.waitForView(MODE_SUBLIST, () => {
        SubListView.activate(option, data, index, keyRange, 'next', () => {
          ModeManager.push(MODE_SUBLIST);
        });
      });
    }
  },

  handleEvent: function sv_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'touchend':
        if (target.id === 'views-search-clear') {
          evt.preventDefault();
          this.searchInput.value = '';
          this.clear();
        }

        break;

      case 'click':
        if (!target) {
          return;
        }

        if (target.id === 'views-search-close') {
          evt.preventDefault();
          this.hide();
        }

        if (target.dataset.index) {
          this.openResult(target);
        }

        break;

      case 'focus':
        this.switchContext();
        break;

      case 'input':
        if (target.id === 'views-search-input') {
          this.search(target.value);
        }

        break;

      case 'keypress':
        if (target.id === 'views-search-input') {
          if (evt.keyCode === evt.DOM_VK_RETURN) {
            evt.preventDefault();
          }
        }
        break;

      default:
        return;
    }
  }
};
