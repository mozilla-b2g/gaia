/* global threads, View */
'use strict';

var debug = 1 ? (...args) => console.log('[PlaylistDetailView]', ...args) : () => {};

var PlaylistDetailView = View.extend(function PlaylistDetailView() {
  View.call(this); // super();

  this.content = document.getElementById('content');

  this.client = threads.client('music-service', window.parent);
  this.client.on('databaseChange', () => this.update());

  this.update();
});

PlaylistDetailView.prototype.update = function() {
  this.getPlaylist().then((playlist) => {
    this.playlist = playlist;
    this.render();
  });
};

PlaylistDetailView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlaylistDetailView.prototype.title = 'Playlists';

PlaylistDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  var html = '';

  this.playlist.songs.forEach((song) => {
    var template =
`<a is="music-list-item"
    href="/player?id=${song.name}"
    title="${song.title}">
</a>`;

    html += template;
  });

  this.content.innerHTML = html;
};

PlaylistDetailView.prototype.getPlaylist = function() {
  return fetch('/api/playlists/' + this.params.id).then(response => response.json());
};

window.view = new PlaylistDetailView();
