/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[AlbumsView]', ...args) : () => {};

var AlbumsView = View.extend(function AlbumsView() {
  View.call(this); // super();

  this.search = document.getElementById('search');
  this.list = document.getElementById('list');

  this.search.addEventListener('open', () => window.parent.onSearchOpen());
  this.search.addEventListener('close', () => window.parent.onSearchClose());

  this.list.configure({
    model: [],
    getSectionName(item) {
      var album = item.metadata.album;
      return album ? album[0].toUpperCase() : '?';
    },

    itemKeys: {
      link: data => `/album-detail?id=${data.name}`,
      title: 'metadata.album'
    }
  });

  View.preserveListScrollPosition(this.list);

  this.client = bridge.client({ service: 'music-service', endpoint: window.parent });
  this.client.on('databaseChange', () => this.update());

  this.update();
});

AlbumsView.prototype.update = function() {
  this.getAlbums().then((albums) => {
    this.albums = albums;
    this.render();
  });
};

AlbumsView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

AlbumsView.prototype.title = 'Albums';

AlbumsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.albums;
};

AlbumsView.prototype.getAlbums = function() {
  return fetch('/api/albums/list')
    .then(response => response.json())
    .then(albums => clean(albums));
};

function clean(items) {
  debug('clean', items);
  return items.map(item => {
    if (!item.metadata.album) item.metadata.album = '?';
    return item;
  });
}

window.view = new AlbumsView();
