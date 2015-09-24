/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[ArtistsView]', ...args) : () => {};

var ArtistsView = View.extend(function ArtistsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search');
  this.list = document.getElementById('list');

  var searchHeight = this.searchBox.offsetHeight;

  this.searchBox.addEventListener('open', () => window.parent.onSearchOpen());
  this.searchBox.addEventListener('close', () => {
    this.list.scrollTop = searchHeight;
    window.parent.onSearchClose();
  });
  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));
  this.searchBox.addEventListener('resultclick', (evt) => {
    var link = evt.detail;
    if (link) {
      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.searchBox.getItemImageSrc = (item) => {
    return this.getThumbnail(item.name);
  };

  this.list.scrollTop = searchHeight;
  this.list.minScrollHeight = `calc(100% - ${searchHeight}px)`;

  this.list.configure({
    getSectionName: (item) => {
      var artist = item.metadata.artist;
      return artist ? artist[0].toUpperCase() : '?';
    },

    getItemImageSrc: (item) => {
      return this.getThumbnail(item.name);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

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
};

ArtistsView.prototype.getArtists = function() {
  return this.fetch('/api/artists/list').then(response => response.json());
};

ArtistsView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/thumbnail/' + filePath)
    .then(response => response.blob())
    .then((blob) => {
      var url = URL.createObjectURL(blob);
      setTimeout(() => URL.revokeObjectURL(url), 1);

      return url;
    });
};

ArtistsView.prototype.search = function(query) {
  return document.l10n.formatValue('unknownArtist').then((unknownArtist) => {
    return this.fetch('/api/search/artist/' + query)
      .then(response =>  response.json())
      .then((artists) => {
        artists.forEach((artist) => {
          artist.title    = artist.metadata.artist || unknownArtist;
          artist.subtitle = ''
          artist.section  = 'artists';
          artist.url      = '/artist-detail?id=' + artist.name;
        });

        this.searchBox.setResults(artists);
        return artists;
      });
  });
};

window.view = new ArtistsView();
