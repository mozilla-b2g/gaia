/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[AlbumDetailView]', ...args) : () => {};

var AlbumDetailView = View.extend(function AlbumDetailView() {
  View.call(this); // super();

  this.list = document.getElementById('list');

  // Triggers player service to begin playing the track.
  // This works for now, but we might have the PlayerView
  // take care of this task as it's a big more webby :)
  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueAlbum(link.dataset.filePath);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

AlbumDetailView.prototype.update = function() {
  this.getAlbum().then((songs) => {
    this.songs = songs;
    this.render();
  });
};

AlbumDetailView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

AlbumDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.songs;
};

AlbumDetailView.prototype.getAlbum = function() {
  return this.fetch('/api/albums/info/' + this.params.id)
    .then(response => response.json());
};

AlbumDetailView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

window.view = new AlbumDetailView();
