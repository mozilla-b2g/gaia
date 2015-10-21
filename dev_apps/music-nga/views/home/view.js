/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[HomeView]', ...args) : () => {};

var HomeView = View.extend(function HomeView() {
  View.call(this); // super();

  this.search = document.getElementById('search');
  this.tiles = document.getElementById('tiles');

  this.search.addEventListener('open', () => window.parent.onSearchOpen());
  this.search.addEventListener('close', () => window.parent.onSearchClose());

  this.tiles.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueAlbum(link.dataset.filePath);
    }
  });

  this.client = bridge.client({ service: 'music-service', endpoint: window.parent });
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

HomeView.prototype.title = 'Music';

HomeView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  var html = '';

  this.albums.forEach((album) => {
    var template =
`<a class="tile"
    href="/player?id=${album.name}"
    data-artist="${album.metadata.artist}"
    data-album="${album.metadata.album}"
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
};

HomeView.prototype.getAlbums = function() {
  return fetch('/api/albums/list').then(response => response.json());
};

HomeView.prototype.getSongThumbnail = function(filePath) {
  return fetch('/api/artwork/thumbnail' + filePath).then(response => response.blob());
};

HomeView.prototype.queueAlbum = function(filePath) {
  fetch('/api/queue/album' + filePath);
};

window.view = new HomeView();
