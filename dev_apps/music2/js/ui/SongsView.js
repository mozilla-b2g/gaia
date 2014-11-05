'use strict';

function SongsView() {
  Utils.loadDomIds(this, [
    'view-songs'
  ]);

  this.router = new Router(this);
  this.router.declareRoutes([
    'requestPlaySongs',
    'switchPlayingToIndex',
    'showBack'
  ]);

  this.list = new List();
  this.dom.viewSongs.appendChild(this.list.dom.list);

  this.dom.viewSongs.classList.add('noSublist');

  this._populateSongs();
}

SongsView.prototype = {
  name: 'SongsView',
  //============== API ===============
  show: function() {
    if (!this.dom.viewSongs.classList.contains('noSublist')) {
      this.router.route('showBack')();
    }
  },
  hide: function() {

  },
  back: function() {
    this.dom.viewSongs.classList.add('noSublist');
  },
  //============== helpers ===============
  _populateSongs: function(songs) {
    var genre = '*';
    var artist = '*';
    var album = '*';
    window.musicLibrary.musicDB.getSongs(genre, artist, album, function(songs) {
      songs.forEach(this._addSong.bind(this));
    }.bind(this));
  },
  _addSong: function(song) {
    this.list.addItem({
      option: 'title',
      metadata: song.metadata,
      getImgUrl: function(done) {
        window.musicLibrary.musicDB.getAlbumArtAsURL(song, function(url) {
          done(url);
        });
      },
      onclick: function() {
        // TODO
      }.bind(this)
    });
  }
};
