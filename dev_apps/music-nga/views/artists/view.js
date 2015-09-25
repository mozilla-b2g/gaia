/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[ArtistsView]', ...args) : () => {};

var ArtistsView = View.extend(function ArtistsView() {
  View.call(this); // super();

  this.search = document.getElementById('search');
  this.list = document.getElementById('list');

  var searchHeight = this.search.offsetHeight;

  this.search.addEventListener('open', () => window.parent.onSearchOpen());
  this.search.addEventListener('close', () => {
    this.list.scrollTop = searchHeight;
    window.parent.onSearchClose();
  });

  this.list.scrollTop = searchHeight;
  this.list.minScrollHeight = `calc(100% - ${searchHeight}px)`;

  this.list.configure({
    getSectionName(item) {
      var artist = item.metadata.artist;
      return artist ? artist[0].toUpperCase() : '?';
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

window.view = new ArtistsView();
