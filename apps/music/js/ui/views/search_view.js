/* exported SearchView */
/* global Normalizer, createListElement, App, musicdb, ModeManager,
          MODE_PLAYER, PlayerView, TYPE_SINGLE, TYPE_LIST, SubListView,
          MODE_SUBLIST */
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
    return document.getElementById('search');
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
  },

  search: function sv_search(query) {
    this.clearSearch();
    if (!query) {
      return;
    }

    // Convert to lowercase and replace accented characters
    var queryLowerCased = query.toLocaleLowerCase();
    query = Normalizer.toAscii(queryLowerCased);

    var lists = { artist: this.searchArtistsView,
                  album: this.searchAlbumsView,
                  title: this.searchTitlesView };
    var numResults = { artist: 0, album: 0, title: 0 };

    function sv_showResult(option, result) {
      /* jshint validthis:true */
      if (result === null) {
        this.searchHandles[option] = null;
        return;
      }
      var resultLowerCased = result.metadata[option].toLocaleLowerCase();
      if (Normalizer.toAscii(resultLowerCased).indexOf(query) !== -1) {
        this.dataSource.push(result);

        numResults[option]++;
        lists[option].classList.remove('hidden');
        lists[option].getElementsByClassName('search-result-count')[0]
                     .textContent = numResults[option];
        lists[option].getElementsByClassName('search-results')[0].appendChild(
          createListElement(option, result, this.dataSource.length - 1, query)
        );
      }

      var totalFound = numResults.artist + numResults.album + numResults.title;
      this.showNoResult(totalFound === 0);
    }

    // Only shows the search results of tracks when it's in picker mode
    if (!App.pendingPick) {
      if (this.searchContext === this.context.ALL ||
          this.searchContext === this.context.ARTISTS) {
        this.searchHandles.artist = musicdb.enumerate(
          'metadata.artist', null, 'nextunique',
          sv_showResult.bind(this, 'artist')
        );
      }
      if (this.searchContext === this.context.ALL ||
          this.searchContext === this.context.ALBUMS) {
        this.searchHandles.album = musicdb.enumerate(
          'metadata.album', null, 'nextunique',
          sv_showResult.bind(this, 'album')
        );
      }
    }

    if (this.searchContext === this.context.ALL ||
        this.searchContext === this.context.SONGS) {
      this.searchHandles.title = musicdb.enumerate(
        'metadata.title',
        sv_showResult.bind(this, 'title')
      );
    }
  },

  clearSearch: function sv_clearSearch() {
    for (var option in this.searchHandles) {
      var handle = this.searchHandles[option];
      if (handle) {
        musicdb.cancelEnumeration(handle);
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

  handleEvent: function sv_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'click':
        if (!target) {
          return;
        }

        if (target.dataset.index) {
          var handler;
          var index = target.dataset.index;

          var option = target.dataset.option;
          var keyRange = target.dataset.keyRange;
          var data = this.dataSource[index];
          handler = sv_openResult.bind(this, option, data, index, keyRange);

          target.addEventListener('transitionend', handler);
        }
        break;

      default:
        return;
    }

    function sv_openResult(option, data, index, keyRange) {
      /* jshint validthis:true */
      if (option === 'title') {
        ModeManager.push(MODE_PLAYER, function() {
          if (App.pendingPick) {
            PlayerView.setSourceType(TYPE_SINGLE);
            PlayerView.dataSource = this.dataSource;
            PlayerView.play(index);
          } else {
            PlayerView.setSourceType(TYPE_LIST);
            PlayerView.dataSource = [data];
            PlayerView.play(0);
          }
        }.bind(this));
      } else {
        SubListView.activate(option, data, index, keyRange, 'next', function() {
          ModeManager.push(MODE_SUBLIST);
        });
      }

      target.removeEventListener('transitionend', handler);
    }
  }
};
