/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[SongsView]', ...args) : () => {};

var SongsView = View.extend(function SongsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search');
  this.list = document.getElementById('list');

  this.searchBox.addEventListener('open', () => window.parent.onSearchOpen());
  this.searchBox.addEventListener('close', () => window.parent.onSearchClose());
  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));

  this.list.configure({
    model: this.getCache(),

    getSectionName(item) {
      var title = item.metadata.title;
      return title ? title[0].toUpperCase() : '?';
    },

    // We won't need this after <gaia-fast-list>
    // gets proper dynamic <template> input
    populateItem: function(el, i) {
      var data = this.getRecordAt(i);

      var link = el.querySelector('a');
      var title = el.querySelector('h3');
      var subtitle = el.querySelector('p');

      link.href = `/player?id=${data.name}`;
      link.dataset.filePath = data.name;

      title.firstChild.data = data.metadata.title;
      subtitle.firstChild.data = data.metadata.artist;
    }
  });

  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueSong(link.dataset.filePath);
    }
  });

  View.preserveListScrollPosition(this.list);

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
  return this.fetch('/api/search/title/' + query).then((response) => {
    return response.json();
  }).then((results) => {
    this.searchBox.setResults(results);
  });
};

window.view = new SongsView();
