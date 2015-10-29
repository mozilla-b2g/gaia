/* global View */
'use strict';

var ArtistsView = View.extend(function ArtistsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.list = document.getElementById('list');

  this.client.on('databaseChange', () => this.update());
  this.configureSearch();
  this.configureList();
  this.update();
});

ArtistsView.prototype.configureList = function() {

  // Scroll search out of view, even when
  // there aren't enough list items to scroll.
  this.list.scrollTop = this.searchBox.HEIGHT;
  this.list.minScrollHeight = `calc(100% + ${this.searchBox.HEIGHT}px)`;

  this.list.configure({
    getItemImageSrc: (item) => this.getThumbnail(item.name)
  });

  // Show the view only when list has something
  // rendered, this prevents Gecko painting unnecessarily.
  this.once(this.list, 'rendered', () => document.body.hidden = false);
};

ArtistsView.prototype.configureSearch = function() {
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
};

ArtistsView.prototype.update = function() {
  this.getArtists().then((artists) => {
    this.artists = artists;
    this.render();
  });
};

ArtistsView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

ArtistsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.artists;
  this.list.cache();
};

ArtistsView.prototype.getArtists = function() {
  return document.l10n.formatValue('unknownArtist')
    .then((unknownArtist) => {
      return this.fetch('/api/artists/list')
        .then(response => response.json())
        .then((artists) => {
          return artists.map((artist) => {
            return {
              name:   artist.name,
              url:    '/artist-detail?id=' + encodeURIComponent(artist.name),
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
