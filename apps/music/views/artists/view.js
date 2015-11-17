/* global View */
'use strict';

var ArtistsView = View.extend(function ArtistsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.list = document.getElementById('list');

  this.client.on('databaseChange', () => this.update());

  this.setupSearch();
  this.setupList();
  this.update();
});

ArtistsView.prototype.update = function() {
  return this.getArtists().then((artists) => {
    this.artists = artists;
    return this.render();
  });
};

ArtistsView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

ArtistsView.prototype.render = function() {
  View.prototype.render.call(this); // super();
  return this.list.setModel(this.artists)
    .then(() => this.list.cache());
};

ArtistsView.prototype.getArtists = function() {
  return document.l10n.formatValue('unknownArtist')
    .then((unknownArtist) => {
      return this.fetch('/api/artists/list')
        .then(response => response.json())
        .then((artists) => {
          return artists.map((artist) => {
            return {
              name: artist.name,
              url: '/artist-detail?id=' + encodeURIComponent(artist.name),
              artist: artist.metadata.artist || unknownArtist
            };
          });
        });
    });
};

ArtistsView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/url/thumbnail/' + filePath)
    .then(response => response.json());
};

ArtistsView.prototype.search = function(query) {
  if (!query) {
    return Promise.resolve(this.searchResults.clearResults());
  }

  return document.l10n.formatValue('unknownArtist').then((unknownArtist) => {
    return this.fetch('/api/search/artist/' + query)
      .then(response => response.json())
      .then((artists) => {
        var results = artists.map((artist) => {
          return {
            name:     artist.name,
            title:    artist.metadata.artist || unknownArtist,
            subtitle: '',
            section:  'artists',
            url:      '/artist-detail?id=' + encodeURIComponent(artist.name)
          };
        });

        return this.searchResults.setResults(results);
      });
  });
};

window.view = new ArtistsView();
