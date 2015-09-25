/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[SongsView]', ...args) : () => {};

var SongsView = View.extend(function SongsView() {
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
      this.queueSong(link.dataset.filePath);

      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.list.scrollTop = searchHeight;
  this.list.minScrollHeight = `calc(100% - ${searchHeight}px)`;

  this.list.configure({
    model: this.getCache(),

    getSectionName(item) {
      var title = item.metadata.title;
      return title ? title[0].toUpperCase() : '?';
    }
  });

  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueSong(link.dataset.filePath);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

SongsView.prototype.update = function() {
  this.getSongs().then((songs) => {
    this.songs = songs;
    this.render();
  });
};

SongsView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

SongsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.songs;
};

SongsView.prototype.getSongs = function() {
  console.time('getSongs');
  return this.fetch('/api/songs/list')
    .then(response => response.json())
    .then(songs => {
      console.timeEnd('getSongs');
      this.setCache(songs.slice(0, 10));
      return songs;
    });
};

SongsView.prototype.queueSong = function(filePath) {
  this.fetch('/api/queue/song/' + filePath);
};

SongsView.prototype.setCache = function(items) {
  setTimeout(() => {
    localStorage.setItem('cache:songs', JSON.stringify(items));
  });
};

SongsView.prototype.getCache = function() {
  return JSON.parse(localStorage.getItem('cache:songs')) || [];
};

SongsView.prototype.search = function(query) {
  return Promise.all([
    document.l10n.formatValue('unknownTitle'),
    document.l10n.formatValue('unknownArtist')
  ]).then(([unknownTitle, unknownArtist]) => {
    return this.fetch('/api/search/title/' + query)
      .then(response => response.json())
      .then((songs) => {
        var results = songs.map((song) => {
          return {
            name:     song.name,
            title:    song.metadata.title  || unknownTitle,
            subtitle: song.metadata.artist || unknownArtist,
            section:  'songs',
            url:      '/player?id=' + song.name
          };
        });

        this.searchBox.setResults(results);
        return results;
      });
  });
};

window.view = new SongsView();
