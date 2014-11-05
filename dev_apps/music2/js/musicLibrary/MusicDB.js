'use strict';

var MusicDB = function() {

  this.router = new Router(this);

  this.mediaDB = new MediaDB('music', parseAudioMetadata, {
    // MediaDB indexes the date by default.
    indexes: ['metadata.album', 'metadata.artist', 'metadata.title',
              'metadata.genre', 'metadata.played', 'metadata.favorited'],
    batchSize: 1,
    autoscan: false, // We call scan() explicitly after listing music we know
    version: 2
  });

  this.router.declareRoutes([
    'isReady',
    'musicChanged',
    'musicDeleted',
    'musicCreated'
  ]);

  this.getFile = this.mediaDB.getFile.bind(this.mediaDB);

  this.cache = {};

  this.ready = false;

  this.mediaDB.onunavailable = this.router.route('noMusic');
  //this.mediaDB.oncardremoved = function(event){ console.log('removed'); };

  this.numberCreated = 0;
  this.numberDeleted = 0;

  this.mediaDB.oncreated = (function(event) {
    //console.log('created');
    this.numberCreated += 1;
    this.router.route('musicCreated')(event);
  }.bind(this));
  this.mediaDB.ondeleted = (function(event) {
    //console.log('deleted');
    this.numberDeleted += 1;
    this.router.route('musicDeleted')(event);
  }.bind(this));

  this.mediaDB.onready = (function() {
    //console.log('ready');
    this.ready = true;
    this.mediaDB.scan();
    this.router.route('isReady')();
  }.bind(this));

  //this.mediaDB.onscanstart = function() { console.log('scanstart'); };

  this.mediaDB.onscanend = (function() {
    //console.log('scanend');
    if (this.numberCreated > 0 ||
        this.numberDeleted > 0) {
      this.cache = {};
      this.router.route('musicChanged')(this.numberCreated, this.numberDeleted);
    }
  }.bind(this));

  this.favoriteChangeListeners = {};
};

MusicDB.prototype = {
  name: 'MusicDB',
  toggleSongFavorited: function(song) {
    this.setSongFavorited(song, !song.metadata.favorited);
  },
  setSongFavorited: function(song, isFavorite) {
    song.metadata.favorited = isFavorite;
    this.mediaDB.updateMetadata(song.name, song.metadata);
    var key = this._songToKey(song);
    if (this.favoriteChangeListeners[key]) {
      this.favoriteChangeListeners[key].forEach(function(listener) {
        listener(isFavorite);
      });
    }
  },
  registerSongFavoriteChangeListener: function(song, fn) {
    var key = this._songToKey(song);
    if (this.favoriteChangeListeners[key])
      this.favoriteChangeListeners[key].push(fn);
    else {
      this.favoriteChangeListeners[key] = [fn];
    }
    return function() {
      var i = this.favoriteChangeListeners[key].indexOf(fn);
      this.favoriteChangeListeners[key].splice(i, 1);
    }.bind(this);
  },
  getFavorited: function(done) {
    // TODO TODO TODO for some reason couldn't get this working directly
    var disableCache = true;
    this.getWithFilter(
      'metadata.title', null, { favorited: true }, done, disableCache
    );

    // this.mediaDB.enumerateAll('metadata.favorited', null, 'next',
      // function(items){
        // console.log("+======", items.length);
        // done(items);
      // }
    // );
  },
  getGenres: function(done) {
    if (!this.ready) {
      setTimeout(function() { this.getGenres(done); }.bind(this), 100);
      return;
    }
    this.mediaDB.enumerateAll('metadata.genre', null, 'nextunique',
      function(items) {
        var genres = [];
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          genres.push(item);
        }
        done(genres);
      }.bind(this));
  },
  returnCache: function(key, done) {
    if (this.cache[key]) {
      var cached = this.cache[key];
      setTimeout(function() {
        done(cached);
      }, 0);
      return true;
    }
    return false;
  },
  getArtists: function(genre, done) {
    if (!this.ready) {
      setTimeout(function() { this.getArtists(genre, done); }.bind(this), 100);
      return;
    }
    var cacheKey = '__artists<' + genre + '>';
    if (this.returnCache(cacheKey, done))
      return;
    this.mediaDB.enumerateAll('metadata.artist', null, 'nextunique',
      function(items) {
        var artists = [];
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          if (genre === '*' || item.metadata.genre === genre) {
            artists.push(item);
          }
        }
        this.cache[cacheKey] = artists;
        done(artists);
      }.bind(this)
    );
  },
  getAlbums: function(genre, artist, done) {
    if (!this.ready) {
      setTimeout(function() {
        this.getAlbums(genre, artist, done);
      }.bind(this), 100);
      return;
    }
    var cacheKey = '__albums<' + genre + '><' + artist + '>';
    if (this.returnCache(cacheKey, done))
      return;
    this.mediaDB.enumerateAll('metadata.album', null, 'nextunique',
      function(items) {
        var albums = [];
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          if ((genre === '*' || item.metadata.genre === genre) &&
              (artist === '*' || item.metadata.artist === artist))
          {
            albums.push(item);
          }
        }
        this.cache[cacheKey] = albums;
        done(albums);
      }.bind(this)
    );
  },
  getSongs: function(genre, artist, album, done) {
    if (!this.ready) {
      setTimeout(function() {
        this.getSongs(genre, artist, album, done);
      }.bind(this), 100);
      return;
    }

    var filter = {
      genre: genre,
      artist: artist,
      album: album
    };

    if (album !== '*') {
      this.getWithFilter('metadata.album', album, filter, done);
    }
    else if (artist !== '*') {
      this.getWithFilter('metadata.artist', artist, filter, done);
    }
    else if (genre !== '*') {
      this.getWithFilter('metadata.genre', genre, filter, done);
    }
    else {
      this.getWithFilter('metadata.title', null, filter, done);
    }
  },
  getSong: function(title, done) {
    if (!this.ready) {
      setTimeout(function() { this.getSong(title, done); }.bind(this), 100);
      return;
    }
    this.getWithFilter('metadata.title', title, {}, function(results) {
      done(results[0]);
    });
  },
  search: function(search, done) {
    search = search.toLowerCase().trim();
    this.getSongs('*', '*', '*', function(items) {
      var artists = {};
      var albums = {};
      var songs = {};
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.metadata.genre.toLowerCase().indexOf(search) !== -1) {
          artists[item.metadata.artist] = item;
        }
        if (item.metadata.artist.toLowerCase().indexOf(search) !== -1) {
          artists[item.metadata.artist] = item;
        }
        if (item.metadata.album.toLowerCase().indexOf(search) !== -1) {
          albums[item.metadata.album] = item;
        }
        if (item.metadata.title.toLowerCase().indexOf(search) !== -1) {
          songs[item.metadata.title] = item;
        }
      }
      var results = {
        artists: [],
        albums: [],
        songs: []
      };
      for (var artist in artists)
        results.artists.push(artists[artist]);
      for (var album in albums)
        results.albums.push(albums[album]);
      for (var song in songs)
        results.songs.push(songs[song]);
      done(results);
    }.bind(this));
  },
  getWithFilter: function(index, key, filter, done, disableCache) {
    var cacheKey =
      '__songs<' + index + '><' + key + '><' + JSON.stringify(filter) + '>';
    if (!disableCache && this.returnCache(cacheKey, done))
      return;
    var store = this.mediaDB.db.transaction('files').objectStore('files');
    store = store.index(index);
    var range = undefined;
    if (key !== null)
      range = IDBKeyRange.only(key);
    var results = [];
    store.openCursor(range).onsuccess = (function(event) {
      var cursor = event.target.result;
      if (cursor) {
        for (var prop in filter) {
          if (filter[prop] !== '*' &&
              cursor.value.metadata[prop] !== filter[prop]) {
            cursor.continue();
            return;
          }
        }
        results.push(cursor.value);
        cursor.continue();
      }
      else {
        this.cache[cacheKey] = results;
        done(results);
      }
    }.bind(this));
  },
  getAlbumArtAsURL: function(song, done) {
    if (!this.ready) {
      setTimeout(function() {
        this.getAlbumArtAsURL(song, done);
      }.bind(this), 100);
      return;
    }
    getThumbnailURL(song, function(url) {
      if (!url) {
        var infoForHash = song.metadata.album + song.metadata.artist;
        var hashedNumber = (Math.abs(this._hash(infoForHash)) % 10) + 1;

        url = '/style/images/AlbumArt' + hashedNumber + '_small.png';
      }
      done(url);
    }.bind(this));
  },
  _hash: function(str) {
    var hash = 0;
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    return hash;
  },
  _songToKey: function(song) {
    var key = '<' + song.metadata.genre + '>' +
              '<' + song.metadata.artist + '>' +
              '<' + song.metadata.album + '>' +
              '<' + song.metadata.title + '>';
    return key;
  },
  logError: function(event) {
      console.warn('ERROR:', event);
  }
};
