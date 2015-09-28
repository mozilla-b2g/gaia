/* global View */
'use strict';

var AlbumsView = View.extend(function AlbumsView() {
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
      var album = item.metadata.album;
      return album ? album[0].toUpperCase() : '?';
    },

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
  return this.fetch('/api/albums/list')
    .then(response => response.json())
    .then(albums => clean(albums));
};

AlbumsView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/thumbnail/' + filePath)
    .then(response => response.blob())
    .then((blob) => {
      var url = URL.createObjectURL(blob);
      setTimeout(() => URL.revokeObjectURL(url), 1);

      return url;
    });
};

AlbumsView.prototype.search = function(query) {
  return Promise.all([
    document.l10n.formatValue('unknownAlbum'),
    document.l10n.formatValue('unknownArtist')
  ]).then(([unknownAlbum, unknownArtist]) => {
    return this.fetch('/api/search/album/' + query)
      .then(response => response.json())
      .then((albums) => {
        var results = albums.map((album) => {
          return {
            name:     album.name,
            title:    album.metadata.album  || unknownAlbum,
            subtitle: album.metadata.artist || unknownArtist,
            section:  'albums',
            url:      '/album-detail?id=' + album.name
          };
        });

        this.searchBox.setResults(results);
        return results;
      });
  });
};

function clean(items) {
  console.log('[AlbumsView] clean', items);
  return items.map(item => {
    if (!item.metadata.album) item.metadata.album = '?';
    return item;
  });
}

window.view = new AlbumsView();
