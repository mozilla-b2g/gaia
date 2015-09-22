/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[AlbumsView]', ...args) : () => {};

var AlbumsView = View.extend(function AlbumsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search');
  this.list = document.getElementById('list');

  this.searchBox.addEventListener('open', () => window.parent.onSearchOpen());
  this.searchBox.addEventListener('close', () => window.parent.onSearchClose());
  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));

  this.list.configure({
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

AlbumsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.albums;
};

AlbumsView.prototype.getAlbums = function() {
  return this.fetch('/api/albums/list')
    .then(response => response.json())
    .then(albums => clean(albums));
};

AlbumsView.prototype.search = function(query) {
  return this.fetch('/api/search/album/' + query).then((response) => {
    return response.json();
  }).then((results) => {
    this.searchBox.setResults(results);
  });
};

function clean(items) {
  debug('clean', items);
  return items.map(item => {
    if (!item.metadata.album) item.metadata.album = '?';
    return item;
  });
}

window.view = new AlbumsView();
