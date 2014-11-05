'use strict';

function MixView() {
  Utils.loadDomIds(this, [
    'view-mix'
  ]);
  var genre = '*';
  var artist = '*';
  window.musicLibrary.musicDB.getAlbums(
    genre, artist, this._populate.bind(this)
  );

  this.router = new Router(this);
  this.router.declareRoutes([
    'requestPlaySongs'
  ]);

  this.nextTileIndex = 0;
}

MixView.prototype = {
  name: 'MixView',
  //============== API ===============
  show: function() {

  },
  hide: function() {

  },
  //============== helpers ===============
  _populate: function(albums) {
    albums.forEach(this._addTile.bind(this));
  },
  _addTile: function(album) {
    var tile = document.createElement('div');
    tile.classList.add('tile');
    window.musicLibrary.musicDB.getAlbumArtAsURL(album, function(url) {
      tile.style.backgroundImage = 'url(' + url + ')';
    });

    tile.classList.add('left');

    tile.addEventListener('click', function() {
      window.musicLibrary.musicDB.getSongs(
        '*', '*', album.metadata.album,
        function(items) {
          this.router.route('requestPlaySongs')(
            album.metadata.album, items
          );
        }.bind(this));
    }.bind(this));

    this.dom.viewMix.appendChild(tile);
    this.nextTileIndex += 1;
  }
};
