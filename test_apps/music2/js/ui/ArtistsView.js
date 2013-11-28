'use strict';

function ArtistsView() {
  Utils.loadDomIds(this, [
    'view-artists'
  ]);

  this.router = new Router(this);
  this.router.declareRoutes([
    'requestPlaySongs',
    'switchPlayingToIndex',
    'showBack'
  ]);

  this.list = new List();
  this.dom.viewArtists.appendChild(this.list.dom.list);

  this.sublist = new SubList();
  this.dom.viewArtists.appendChild(this.sublist.dom.list);

  this.dom.viewArtists.classList.add('noSublist');

  this._populateArtists();
}

ArtistsView.prototype = {
  name: 'ArtistsView',
  //============== API ===============
  show: function() {
    if (!this.dom.viewArtists.classList.contains('noSublist')) {
      this.router.route('showBack')();
    }
  },
  hide: function() {

  },
  back: function() {
    this.dom.viewArtists.classList.add('noSublist');
  },
  //============== helpers ===============
  _populateArtists: function(artists) {
    var genre = '*';
    window.musicLibrary.musicDB.getArtists(genre, function(artists) {
      artists.forEach(this._addArtist.bind(this));
    }.bind(this));
  },
  _addArtist: function(artist) {
    this.list.addItem({
      option: 'artist',
      metadata: artist.metadata,
      getImgUrl: function(done) {
        window.musicLibrary.musicDB.getAlbumArtAsURL(artist, function(url) {
          done(url);
        });
      },
      onclick: function() {
        this.gotoSubList(artist);
      }.bind(this)
    });
  },
  gotoSubList: function(artist) {
    this.dom.viewArtists.classList.remove('noSublist');
    this.router.route('showBack')();
    this._populateArtist(artist);
  },
  _populateArtist: function(artist) {
    var genre = '*';
    var album = '*';
    window.musicLibrary.musicDB.getSongs(genre, artist.metadata.artist, album,
      function(songs) {
        songs.forEach(function(song) {
          this._addSong(song, songs);
        }.bind(this));
      }.bind(this)
    );
    window.musicLibrary.musicDB.getAlbumArtAsURL(artist, function(url) {
      this.sublist.setImage(url);
    }.bind(this));
    this.sublist.setTitle(artist.metadata.album);
  },
  _addSong: function(song, songs) {
    this.sublist.addItem({
      title: song.metadata.title,
      onclick: function() {
        this.router.route('requestPlaySongs')(
          song.metadata.title, songs
        );
        var index = songs.indexOf(song);
        this.router.route('switchPlayingToIndex')(index);
      }.bind(this)
    });
  }
};
