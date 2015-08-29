/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[PlaylistsView]', ...args) : () => {};

var PlaylistsView = View.extend(function PlaylistsView() {
  View.call(this); // super();

  this.search = document.getElementById('search');
  this.list = document.getElementById('list');

  this.search.addEventListener('open', () => window.parent.onSearchOpen());
  this.search.addEventListener('close', () => window.parent.onSearchClose());

  this.list.configure({
    itemKeys: {
      link: data => `/playlist-detail?id=${data.id}`,
      title: 'title'
    }
  });

  View.preserveListScrollPosition(this.list);

  this.client = bridge.client({ service: 'music-service', endpoint: window.parent });
  this.client.on('databaseChange', () => this.update());

  this.update();
});

PlaylistsView.prototype.update = function() {
  this.getPlaylists().then((playlists) => {
    this.playlists = playlists;
    this.render();
  });
};

PlaylistsView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlaylistsView.prototype.title = 'Playlists';

PlaylistsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.playlists;
};

PlaylistsView.prototype.getPlaylists = function() {
  return fetch('/api/playlists').then(response => response.json());
};

window.view = new PlaylistsView();
