/* global View */
'use strict';

var AlbumsView = View.extend(function AlbumsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.list = document.getElementById('list');

  this.client.on('databaseChange', () => this.update());

  this.setupSearch();
  this.setupList();

  this.update();
});

AlbumsView.prototype.update = function() {
  return this.getAlbums().then((albums) => {
    this.albums = albums;
    return this.render();
  });
};

AlbumsView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

AlbumsView.prototype.render = function() {
  View.prototype.render.call(this); // super();
  return this.list.setModel(this.albums)
    .then(() => this.list.cache());
};

AlbumsView.prototype.getAlbums = function() {
  return document.l10n.formatValues('unknownAlbum', 'unknownArtist')
    .then(([unknownAlbum, unknownArtist]) => {
      return this.fetch('/api/albums/list')
        .then(response => response.json())
        .then((albums) => {
          return albums.map((album) => {
            return {
              name:   album.name,
              url:    '/album-detail?id=' + encodeURIComponent(album.name),
              album:  album.metadata.album  || unknownAlbum,
              artist: album.metadata.artist || unknownArtist
            };
          });
        });
    });
};

AlbumsView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/url/thumbnail/' + filePath)
    .then(response => response.json());
};

AlbumsView.prototype.search = function(query) {
  if (!query) {
    return Promise.resolve(this.searchResults.clearResults());
  }

  return document.l10n.formatValues(
    'unknownAlbum', 'unknownArtist'
  ).then(([unknownAlbum, unknownArtist]) => {
    return this.fetch('/api/search/album/' + query)
      .then(response => response.json())
      .then((albums) => {
        var results = albums.map((album) => {
          return {
            name:     album.name,
            title:    album.metadata.album  || unknownAlbum,
            subtitle: album.metadata.artist || unknownArtist,
            section:  'albums',
            url:      '/album-detail?id=' + encodeURIComponent(album.name)
          };
        });

        return this.searchResults.setResults(results);
      });
  });
};

window.view = new AlbumsView();
