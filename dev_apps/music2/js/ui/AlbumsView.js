'use strict';

function AlbumsView() {
  Utils.loadDomIds(this, [
    'view-albums'
  ]);

  this.router = new Router(this);
  this.router.declareRoutes([
    'requestPlaySongs',
    'switchPlayingToIndex',
    'showBack'
  ]);

  this.list = new List();
  this.dom.viewAlbums.appendChild(this.list.dom.list);

  this.sublist = new SubList();
  this.dom.viewAlbums.appendChild(this.sublist.dom.list);

  this.dom.viewAlbums.classList.add('noSublist');

  this._populateAlbums();
}

AlbumsView.prototype = {
  name: 'AlbumsView',
  //============== API ===============
  show: function() {
    if (!this.dom.viewAlbums.classList.contains('noSublist')) {
      this.router.route('showBack')();
    }
  },
  hide: function() {

  },
  back: function() {
    this.dom.viewAlbums.classList.add('noSublist');
  },
  //============== helpers ===============
  _populateAlbums: function(albums) {
    var genre = '*';
    var artist = '*';
    window.musicLibrary.musicDB.getAlbums(genre, artist, function(albums) {
      albums.forEach(this._addAlbum.bind(this));
    }.bind(this));
  },
  _addAlbum: function(album) {
    this.list.addItem({
      option: 'album',
      metadata: album.metadata,
      getImgUrl: function(done) {
        window.musicLibrary.musicDB.getAlbumArtAsURL(album, function(url) {
          done(url);
        });
      },
      onclick: function() {
        this.gotoSubList(album);
      }.bind(this)
    });
  },
  gotoSubList: function(album) {
    this.dom.viewAlbums.classList.remove('noSublist');
    this.router.route('showBack')();
    this._populateAlbum(album);
  },
  _populateAlbum: function(album) {
    var genre = '*';
    var artist = '*';
    window.musicLibrary.musicDB.getSongs(genre, artist, album.metadata.album,
      function(songs) {
        songs.forEach(function(song) {
          this._addSong(song, songs);
        }.bind(this));
      }.bind(this)
    );
    window.musicLibrary.musicDB.getAlbumArtAsURL(album, function(url) {
      this.sublist.setImage(url);
    }.bind(this));
    this.sublist.setTitle(album.metadata.album);
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
