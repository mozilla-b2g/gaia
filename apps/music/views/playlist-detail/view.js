/* global View, IntlHelper */
'use strict';

var PlaylistDetailView = View.extend(function PlaylistDetailView() {
  View.call(this); // super();

  this.list = document.getElementById('list');

  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queuePlaylist(link.dataset.filePath);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

PlaylistDetailView.prototype.update = function() {
  return this.getPlaylist().then((songs) => {
    this.songs = songs;
    return this.render();
  });
};

PlaylistDetailView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlaylistDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();
  return this.list.setModel(this.songs);
};

PlaylistDetailView.prototype.getPlaylist = function() {
  var unpaddedIndex = IntlHelper.get('unpaddedIndex');

  return this.fetch('/api/playlists/info/' + this.params.id)
    .then(response => response.json())
    .then(songs => {
      return songs.map((song, index) => {
        return {
          index: unpaddedIndex.format(index + 1),
          name: song.name,
          title: song.metadata.title,
          artist: song.metadata.artist
        };
      });
    });
};

PlaylistDetailView.prototype.queuePlaylist = function(filePath) {
  this.fetch('/api/queue/playlist/' + this.params.id + '/song/' + filePath);
};

IntlHelper.define('unpaddedIndex', 'number', {
  style: 'decimal',
  useGrouping: false,
  minimumIntegerDigits: 1
});

window.view = new PlaylistDetailView();
