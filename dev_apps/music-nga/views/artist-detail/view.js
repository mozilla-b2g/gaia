/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[ArtistDetailView]', ...args) : () => {};

var ArtistDetailView = View.extend(function ArtistDetailView() {
  View.call(this); // super();

  this.list = document.getElementById('list');

  // Triggers player service to begin playing the track.
  // This works for now, but we might have the PlayerView
  // take care of this task as it's a big more webby :)
  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueArtist(link.dataset.filePath);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

ArtistDetailView.prototype.update = function() {
  this.getArtist().then((songs) => {
    this.songs = songs;
    this.render();
  });
};

ArtistDetailView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

ArtistDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.songs;
};

ArtistDetailView.prototype.getArtist = function() {
  return this.fetch('/api/artists/info/' + this.params.id)
    .then(response => response.json())
    .then(songs => {
      var maxDiscNumber = Math.max(
        songs[songs.length - 1].metadata.disccount,
        songs[songs.length - 1].metadata.discnum
      );

      songs.forEach((song) => {
        song.index = maxDiscNumber > 1 && song.metadata.tracknum ?
          song.metadata.discnum + '.' + formatNumber(song.metadata.tracknum, 2) :
          song.metadata.tracknum;
      });

      return songs;
    });
};

ArtistDetailView.prototype.queueArtist = function(filePath) {
  this.fetch('/api/queue/artist/' + filePath);
};

function formatNumber(number, size) {
  if (!number && number !== 0) {
    return '';
  }

  number = '' + number;

  while (number.length < size) {
    number = '0' + number;
  }

  return number;
}

window.view = new ArtistDetailView();
