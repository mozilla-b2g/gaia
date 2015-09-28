/* global View */
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
  this.getPlaylist().then((songs) => {
    this.songs = songs;
    this.render();
  });
};

PlaylistDetailView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlaylistDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.songs;
};

PlaylistDetailView.prototype.getPlaylist = function() {
  return this.fetch('/api/playlists/info/' + this.params.id)
    .then(response => response.json())
    .then(songs => {
      songs.forEach((song, index) => song.index = index + 1);

      return songs;
    });
};

PlaylistDetailView.prototype.queuePlaylist = function(filePath) {
  this.fetch('/api/queue/playlist/' + this.params.id + '/song/' + filePath);
};

window.view = new PlaylistDetailView();
