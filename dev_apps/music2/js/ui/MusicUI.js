'use strict';

function MusicUI() {
  Utils.loadDomIds(this, [
    'views',
    'tabs',
    'tabs-mix',
    'tabs-playlists',
    'tabs-artists',
    'tabs-albums',
    'tabs-songs',
    'title-back',
    'title-player'
  ]);

  this.router = new Router(this);

  this.viewTable = {
    '#mix': new MixView(),
    '#playlists': new PlaylistsView(),
    '#artists': new ArtistsView(),
    '#albums': new AlbumsView(),
    '#songs': new SongsView()
  };

  this.playerView = new PlayerView();

  this._setupViewRoutes();

  this.dom.tabs = this.dom.tabs.querySelectorAll('[role="tab"]');

  this.dom.titleBack.classList.add('hidden');
  this.dom.titleBack.onclick = (function() {
    if (this.dom.views.classList.contains('player') &&
        this.orientation !== 'landscape')
    {
      this.dom.views.classList.remove('player');
      this.dom.titlePlayer.classList.remove('hidden');
      this.dom.titleBack.classList.add('hidden');
      this.currentView.show();
    } else {
      this.currentView.back();
      this.dom.titleBack.classList.add('hidden');
    }
  }).bind(this);

  this.dom.titlePlayer.classList.add('hidden');
  this.dom.titlePlayer.onclick = (function() {
    this.dom.views.classList.add('player');
    this.dom.titlePlayer.classList.add('hidden');
    this.dom.titleBack.classList.remove('hidden');
    this.currentView.hide();
  }).bind(this);

  this.orientation = null;

  window.addEventListener('hashchange', this._setView.bind(this));

  window.screen.onmozorientationchange = this._relayout.bind(this);
}

MusicUI.prototype = {
  name: 'MusicUI',

  _tabIds: {
    '#mix': 'tabsMix',
    '#playlists': 'tabsPlaylists',
    '#artists': 'tabsArtists',
    '#albums': 'tabsAlbums',
    '#songs': 'tabsSongs'
  },
  //============== API ===============
  setPlaylist: function(playlist, playlistId) {
    this.playerView.setPlaylist(playlist);
    this.dom.titlePlayer.classList.remove('hidden');
    this._relayout();
  },
  //============== helpers ===============
  _relayout: function() {
    if (!this.dom.titlePlayer.classList.contains('hidden') ||
        this.dom.views.classList.contains('player')) {
      if (window.screen.mozOrientation.indexOf('landscape') !== -1) {
        this.orientation = 'landscape';
        this.dom.views.classList.add('player');
        this.dom.titlePlayer.classList.add('hidden');
        this.dom.titleBack.classList.add('hidden');
        this.currentView.show();
      }
      else {
        this.orientation = 'portrait';
        this.dom.views.classList.remove('player');
        this.dom.titlePlayer.classList.remove('hidden');
      }
    }
  },
  _setupViewRoutes: function() {
    for (var prop in this.viewTable) {
      var view = this.viewTable[prop];
      Router.proxy([view, 'requestPlaySongs'], [this, 'requestPlaySongs']);
      Router.proxy(
        [view, 'switchPlayingToIndex'], [this, 'switchPlayingToIndex']
      );
      Router.connect(view, this, {
        'showBack': '_showBack'
      });
    }
  },
  _setView: function() {
    var hash = window.location.hash;
    if (this.currentView)
      this.currentView.hide();
    this.currentView = this.viewTable[hash];
    AccessibilityHelper.setAriaSelected(this.dom[this._tabIds[hash]],
      this.dom.tabs);
    this.dom.views.dataset.mode = hash;
    this.dom.titleBack.classList.add('hidden');
    this.currentView.show();
  },
  _showBack: function() {
    this.dom.titleBack.classList.remove('hidden');
  }
};
