/* global threads, View */

var debug = 1 ? (...args) => console.log('[ArtistDetailView]', ...args) : () => {};

var ArtistDetailView = View.extend(function ArtistDetailView() {
  View.call(this); // super();

  this.list = document.getElementById('list');

  this.list.configure({

    // We won't need this after <gaia-fast-list>
    // gets proper dynamic <template> input
    populateItem: function(el, i) {
      var data = this.getRecordAt(i);
      var els = {};

      els.link = el.firstChild;
      els.div = els.link.firstChild;
      els.title = els.div.firstChild;
      els.body = els.title.nextSibling;

      els.link.href = `/player?id=${data.name}`;
      els.link.dataset.filePath = data.name;

      els.title.firstChild.data = data.metadata.title;
    }
  });

  // Triggers player service to begin playing the track.
  // This works for now, but we might have the PlayerView
  // take care of this task as it's a big more webby :)
  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.play(link.dataset.filePath);
    }
  });

  View.preserveListScrollPosition(this.list);

  this.client = threads.client('music-service', window.parent);
  this.client.on('databaseChange', () => this.update());

  this.update();
});

ArtistDetailView.prototype.update = function() {
  this.getArtist().then((songs) => {
    this.songs = songs;
    this.render();
  });
};

// ArtistDetailView.prototype.destroy = function() {
//   View.prototype.destroy.call(this); // super(); // Always call *last*
// };

ArtistDetailView.prototype.title = 'Artists';

ArtistDetailView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.songs;
};

ArtistDetailView.prototype.getArtist = function() {
  return fetch('/api/artists/info' + this.params.id).then(response => response.json());
};

ArtistDetailView.prototype.play = function(filePath) {
  fetch('/api/audio/play' + filePath);
};

window.view = new ArtistDetailView();
