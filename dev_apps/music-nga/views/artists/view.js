/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[ArtistsView]', ...args) : () => {};

var ArtistsView = View.extend(function ArtistsView() {
  View.call(this); // super();

  this.search = document.getElementById('search');
  this.list = document.getElementById('list');

  this.search.addEventListener('open', () => window.parent.onSearchOpen());
  this.search.addEventListener('close', () => window.parent.onSearchClose());

  this.list.configure({
    getSectionName(item) {
      return item.metadata.artist[0].toUpperCase();
    },

    itemKeys: {
      link: data => `/artist-detail?id=${data.name}`,
      title: 'metadata.artist'
    }
  });

  View.preserveListScrollPosition(this.list);

  this.client = bridge.client({ service: 'music-service', endpoint: window.parent });
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

ArtistsView.prototype.title = 'Artists';

ArtistsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.artists;
};

ArtistsView.prototype.getArtists = function() {
  return fetch('/api/artists/list').then(response => response.json());
};

window.view = new ArtistsView();
