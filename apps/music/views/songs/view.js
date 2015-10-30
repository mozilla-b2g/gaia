/* global View */
'use strict';

var SongsView = View.extend(function SongsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.list = document.getElementById('list');

  this.client.on('databaseChange', () => this.update());

  this.setupSearch();
  this.setupList();
  this.update();
});

SongsView.prototype.setupSearch = function() {
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
};

SongsView.prototype.setupList = function() {
  View.prototype.setupList.call(this);

  // Triggers player service to begin playing the track.
  // This works for now, but we might have the PlayerView
  // take care of this task as it's a big more webby :)
  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueSong(link.dataset.filePath);
    }
  });
};

SongsView.prototype.update = function() {
  return this.getSongs().then((songs) => {
    this.songs = songs;
    return this.render();
  });
};

SongsView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

SongsView.prototype.render = function() {
  View.prototype.render.call(this); // super();
  return this.list.setModel(this.songs)
    .then(() => this.list.cache());
};

SongsView.prototype.getSongs = function() {
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
