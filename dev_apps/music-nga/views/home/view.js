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
  this.searchBox.addEventListener('resultclick', (evt) => {
    var link = evt.detail;
    if (link) {
      if (link.dataset.section === 'songs') {
        this.queueSong(link.dataset.filePath);
      }

      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.searchBox.getItemImageSrc = (item) => {
    return this.getThumbnail(item.name);
  };

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
      this.getThumbnail(tile.dataset.filePath)
        .then(url => tile.querySelector('img').src = url);
    });
  });
};

HomeView.prototype.getAlbums = function() {
  return this.fetch('/api/albums/list').then(response => response.json());
};

HomeView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/thumbnail/' + filePath)
    .then(response => response.blob())
    .then((blob) => {
      var url = URL.createObjectURL(blob);
      setTimeout(() => URL.revokeObjectURL(url), 1);

      return url;
    });
};

HomeView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

HomeView.prototype.queueSong = function(filePath) {
  this.fetch('/api/queue/song/' + filePath);
};

HomeView.prototype.search = function(query) {
  var results = [];

  return Promise.all([
    document.l10n.formatValue('unknownTitle'),
    document.l10n.formatValue('unknownArtist'),
    document.l10n.formatValue('unknownAlbum')
  ]).then(([unknownTitle, unknownArtist, unknownAlbum]) => {
    var albums = this.fetch('/api/search/album/' + query)
      .then(response =>  response.json())
      .then((albums) => {
        albums.forEach((album) => {
          album.title    = album.metadata.album  || unknownAlbum;
          album.subtitle = album.metadata.artist || unknownArtist;
          album.section  = 'albums';
          album.url      = '/album-detail?id=' + album.name;
        });

        results = results.concat(albums);

        this.searchBox.setResults(results);
        return albums;
      });

    var artists = this.fetch('/api/search/artist/' + query)
      .then(response =>  response.json())
      .then((artists) => {
        artists.forEach((artist) => {
          artist.title    = artist.metadata.artist || unknownArtist;
          artist.subtitle = ''
          artist.section  = 'artists';
          artist.url      = '/artist-detail?id=' + artist.name;
        });

        results = results.concat(artists);

        this.searchBox.setResults(results);
        return artists;
      });

    var songs = this.fetch('/api/search/title/' + query)
      .then(response =>  response.json())
      .then((songs) => {
        songs.forEach((song) => {
          song.title    = song.metadata.title  || unknownTitle;
          song.subtitle = song.metadata.artist || unknownArtist;
          song.section  = 'songs';
          song.url      = '/player?id=' + song.name;
        });

        results = results.concat(songs);

        this.searchBox.setResults(results);
        return songs;
      });

    return Promise.all([albums, artists, songs]).then(() => results);
  });
};

window.view = new HomeView();
