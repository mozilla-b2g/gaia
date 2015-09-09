/* global bridge, View */
'use strict';

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = View.debug('PlaylistDetailView');

var PlaylistDetailView = View.extend(function PlaylistDetailView() {
  View.call(this); // super();

  this.list = document.getElementById('list');

  this.list.configure({
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
      this.queuePlaylist(link.dataset.filePath);
    }
  });

  View.preserveListScrollPosition(this.list);

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

PlaylistDetailView.prototype.title = 'Playlists';

PlaylistDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.songs;
};

PlaylistDetailView.prototype.getPlaylist = function() {
  return this.fetch('/api/playlists/info/' + this.params.id).then(response => response.json());
};

PlaylistDetailView.prototype.queuePlaylist = function(filePath) {
  this.fetch('/api/queue/playlist/' + this.params.id + '/song/' + filePath);
};

window.view = new PlaylistDetailView();
