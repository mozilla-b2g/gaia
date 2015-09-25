/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[PlaylistsView]', ...args) : () => {};

var PlaylistsView = View.extend(function PlaylistsView() {
  View.call(this); // super();

  this.list = document.getElementById('list');

  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-shuffle="true"]');
    if (link) {
      evt.preventDefault();
      evt.stopPropagation();

      this.queuePlaylist(link.dataset.id);

      this.client.method('navigate', '/player');
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

PlaylistsView.prototype.update = function() {
  this.getPlaylists().then((playlists) => {
    Promise.all(playlists.map(p => document.l10n.formatValue('playlists-' + p.id)))
      .then((titles) => {
        titles.forEach((title, index) => {
          playlists[index].title = title;
        });

        this.playlists = playlists;
        this.render();
      });
  });
};

PlaylistsView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlaylistsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.playlists;
};

PlaylistsView.prototype.getPlaylists = function() {
  return this.fetch('/api/playlists/list').then(response => response.json());
};

PlaylistsView.prototype.queuePlaylist = function(id) {
  this.fetch('/api/queue/playlist/' + id + '/shuffle');
};

window.view = new PlaylistsView();
