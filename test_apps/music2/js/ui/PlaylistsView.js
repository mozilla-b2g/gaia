'use strict';

function PlaylistsView() {
  Utils.loadDomIds(this, [
    'view-playlists'
  ]);

  this.router = new Router(this);
  this.router.declareRoutes([
    'requestPlaySongs',
    'switchPlayingToIndex',
    'showBack'
  ]);

  this.list = new List();
  this.dom.viewPlaylists.appendChild(this.list.dom.list);

  this.dom.viewPlaylists.classList.add('noSublist');

  this._populatePlaylists();
}

PlaylistsView.prototype = {
  name: 'PlaylistsView',
  //============== API ===============
  show: function() {
    if (!this.dom.viewPlaylists.classList.contains('noSublist')) {
      this.router.route('showBack')();
    }
  },
  hide: function() {

  },
  back: function() {
    this.dom.viewPlaylists.classList.add('noSublist');
  },
  //============== helpers ===============
  _populatePlaylists: function(playlists) {
    var playlists = [
      {metadata: {title: 'Shuffle all'}},
      {metadata: {title: 'Highest rated'}},
      {metadata: {title: 'Recently added'}},
      {metadata: {title: 'Most played'}},
      {metadata: {title: 'Least played'}}
    ];

    playlists.forEach(this._addPlaylist.bind(this));
  },
  _addPlaylist: function(playlist) {
    this.list.addItem({
      option: 'playlist',
      metadata: playlist.metadata,
      getImgUrl: function(done) {
        // TODO
      },
      onclick: function() {
        // TODO
      }.bind(this)
    });
  }
};
