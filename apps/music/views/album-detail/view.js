/* global View, IntlHelper */
'use strict';

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
  return this.getAlbum().then((songs) => {
    this.songs = songs;
    return this.render();
  });
};

AlbumDetailView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

AlbumDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();
  this.list.setModel(this.songs);
};

AlbumDetailView.prototype.getAlbum = function() {
  var unpaddedIndex = IntlHelper.get('unpaddedIndex');
  var paddedIndex = IntlHelper.get('paddedIndex');

  return this.fetch('/api/albums/info/' + decodeURIComponent(this.params.id))
    .then(response => response.json())
    .then(songs => {
      var maxDiscNumber = Math.max(
        songs[songs.length - 1].metadata.disccount,
        songs[songs.length - 1].metadata.discnum
      );

      return songs.map((song) => {
        return {
          index: maxDiscNumber > 1 &&
            song.metadata.discnum && song.metadata.tracknum ?
              unpaddedIndex.format(song.metadata.discnum) + '.' +
                paddedIndex.format(song.metadata.tracknum) :
              (song.metadata.tracknum ?
                unpaddedIndex.format(song.metadata.tracknum) : ''),
          name:  song.name,
          title: song.metadata.title
        };
      });

    });
};

AlbumDetailView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

IntlHelper.define('unpaddedIndex', 'number', {
  style: 'decimal',
  useGrouping: false,
  minimumIntegerDigits: 1
});

IntlHelper.define('paddedIndex', 'number', {
  style: 'decimal',
  useGrouping: false,
  minimumIntegerDigits: 2
});

window.view = new AlbumDetailView();
