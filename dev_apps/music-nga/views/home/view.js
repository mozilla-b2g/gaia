/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[HomeView]', ...args) : () => {};

var HomeView = View.extend(function HomeView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search');
  this.tiles = document.getElementById('tiles');

  this.searchBox.addEventListener('open', () => window.parent.onSearchOpen());
  this.searchBox.addEventListener('close', () => window.parent.onSearchClose());
  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));

  this.tiles.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueAlbum(link.dataset.filePath);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

HomeView.prototype.update = function() {
  this.getAlbums().then((albums) => {
    this.albums = albums;
    this.render();
  });
};

HomeView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

HomeView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  Promise.all([
    document.l10n.formatValue('unknownArtist'),
    document.l10n.formatValue('unknownAlbum')
  ]).then(([unknownArtist, unknownAlbum]) => {
    var html = '';

    this.albums.forEach((album) => {
      var template =
`<a class="tile"
    href="/player?id=${album.name}"
    data-artist="${album.metadata.artist || unknownArtist}"
    data-album="${album.metadata.album || unknownAlbum}"
    data-file-path="${album.name}">
  <img>
</a>`;

      html += template;
    });

    this.tiles.innerHTML = html;

    [].forEach.call(this.tiles.querySelectorAll('.tile'), (tile) => {
      this.getSongThumbnail(tile.dataset.filePath)
        .then(blob => tile.querySelector('img').src = URL.createObjectURL(blob));
    });
  });
};

HomeView.prototype.getAlbums = function() {
  return this.fetch('/api/albums/list').then(response => response.json());
};

HomeView.prototype.getSongThumbnail = function(filePath) {
  return this.fetch('/api/artwork/thumbnail/' + filePath).then(response => response.blob());
};

HomeView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

HomeView.prototype.search = function(query) {
  // XXX: Search all fields
  return this.fetch('/api/search/title/' + query).then((response) => {
    return response.json();
  }).then((results) => {
    this.searchBox.setResults(results);
  });
};

window.view = new HomeView();
