/* global View, IntlHelper */
'use strict';

var ArtistDetailView = View.extend(function ArtistDetailView() {
  View.call(this); // super();

  this.list = document.getElementById('list');

  // Triggers player service to begin playing the track.
  // This works for now, but we might have the PlayerView
  // take care of this task as it's a big more webby :)
  this.list.addEventListener('click', evt => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueArtist(link.dataset.filePath);
    }
  });

  this.list.configure({
    getSectionName: item => item.section
  });

  this.client.on('databaseChange', () => this.update());
  this.update();
});

ArtistDetailView.prototype.update = function() {
  return this.getArtist().then(songs => {
    this.songs = songs;
    return this.render();
  });
};

ArtistDetailView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

ArtistDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();
  return this.list.setModel(this.songs);
};

ArtistDetailView.prototype.getArtist = function() {
  var unpaddedIndex = IntlHelper.get('unpaddedIndex');

  return this.fetch('/api/artists/info/' + decodeURIComponent(this.params.id))
    .then(response => response.json())
    .then(songs => {
      return songs.map(song => {
        return {
          index:   song.metadata.tracknum ?
            unpaddedIndex.format(song.metadata.tracknum) : '',
          name:    song.name,
          title:   song.metadata.title,
          section: song.metadata.album
        };
      });
    });
};

ArtistDetailView.prototype.queueArtist = function(filePath) {
  this.fetch('/api/queue/artist/' + filePath);
};

IntlHelper.define('unpaddedIndex', 'number', {
  style: 'decimal',
  useGrouping: false,
  minimumIntegerDigits: 1
});

window.view = new ArtistDetailView();
