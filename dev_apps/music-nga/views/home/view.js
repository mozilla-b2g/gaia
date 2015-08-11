/* global threads, View */

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
      this.play(link.dataset.filePath);
    }
  });

  this.client = threads.client('music-service', window.parent);

  this.client.on('databaseChange', () => this.update());

  this.update();
});

HomeView.prototype.update = function() {
  this.getAlbums().then((albums) => {
    this.albums = albums;
    this.render();
  });
};

// HomeView.prototype.destroy = function() {
//   View.prototype.destroy.call(this); // super(); // Always call *last*
// };

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
  <img src="/api/artwork/original${album.name}"
</a>`;

    html += template;
  });

  this.tiles.innerHTML = html;
};

HomeView.prototype.getAlbums = function() {
  return fetch('/api/albums').then(response => response.json());
};

HomeView.prototype.play = function(filePath) {
  fetch('/api/audio/play' + filePath);
};

window.view = new HomeView();
