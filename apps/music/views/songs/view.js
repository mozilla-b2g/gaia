/* global View */
'use strict';

var SongsView = View.extend(function SongsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.list = document.getElementById('list');

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
      this.queueSong(link.dataset.filePath);

      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.searchResults.getItemImageSrc = (item) => this.getThumbnail(item.name);

  this.list.scrollTop = this.searchBox.HEIGHT;
  this.list.minScrollHeight = `calc(100% + ${this.searchBox.HEIGHT}px)`;

  this.list.configure({
    getItemImageSrc: (item) => {
      return this.getThumbnail(item.name);
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
  return document.l10n.formatValues('unknownTitle', 'unknownArtist')
    .then(([unknownTitle, unknownArtist]) => {
      return this.fetch('/api/songs/list')
        .then(response => response.json())
        .then((songs) => {
          return songs.map((song) => {
            return {
              name:   song.name,
              title:  song.metadata.title  || unknownTitle,
              artist: song.metadata.artist || unknownArtist,
            };
          });
        });
    });
};

SongsView.prototype.queueSong = function(filePath) {
  this.fetch('/api/queue/song/' + filePath);
};

SongsView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/url/thumbnail/' + filePath)
    .then(response => response.json());
};

SongsView.prototype.search = function(query) {
  if (!query) {
    return Promise.resolve(this.searchResults.clearResults());
  }

  return document.l10n.formatValues(
    'unknownTitle', 'unknownArtist'
  ).then(([unknownTitle, unknownArtist]) => {
    return this.fetch('/api/search/title/' + query)
      .then(response => response.json())
      .then((songs) => {
        var results = songs.map((song) => {
          return {
            name:     song.name,
            title:    song.metadata.title  || unknownTitle,
            subtitle: song.metadata.artist || unknownArtist,
            section:  'songs',
            url:      '/player'
          };
        });

        return this.searchResults.setResults(results);
      });
  });
};

window.view = new SongsView();
