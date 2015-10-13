/* global View */
'use strict';

var AlbumsView = View.extend(function AlbumsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.list = document.getElementById('list');

  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));

  this.searchResults.addEventListener('open', () => {
    this.client.method('searchOpen');
  });

  this.searchResults.addEventListener('close', () => {
    this.client.method('searchClose');
    this.list.scrollTop = this.searchBox.HEIGHT;
  });

  this.searchResults.addEventListener('resultclick', (evt) => {
    var link = evt.detail;
    if (link) {
      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.searchResults.getItemImageSrc = (item) => this.getThumbnail(item.name);

  this.list.scrollTop = this.searchBox.HEIGHT;
  this.list.minScrollHeight = `calc(100% - ${this.searchBox.HEIGHT}px)`;

  this.list.configure({
    getItemImageSrc: (item) => {
      return this.getThumbnail(item.name);
    }
  });

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
