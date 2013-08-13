var MusicDB = function(){
  this.mediaDB = new MediaDB('music', parseAudioMetadata, {
    indexes: ['metadata.album', 'metadata.artist', 'metadata.title', 'metadata.genre',
              'metadata.rated', 'metadata.played', 'date'],
    batchSize: 1,
    autoscan: false, // We call scan() explicitly after listing music we know
    version: 2
  });

  Router.route(this, [
    'isReady',
    'musicChanged',
    'musicDeleted',
    'musicCreated',
  ]);

  this.getFile = this.mediaDB.getFile.bind(this.mediaDB);

  this.cache = {};

  this.ready = false;

  this.mediaDB.onunavailable = function(event) { console.log('unavailable'); };
  this.mediaDB.oncardremoved = function(event){ console.log('removed'); };

  this.numberCreated = 0;
  this.numberDeleted = 0;

  this.mediaDB.oncreated = function(event) {
    console.log('created'); 
    this.numberCreated += 1;
    this.musicCreated(event);
  }.bind(this);
  this.mediaDB.ondeleted = function(event) {
    console.log('deleted'); 
    this.numberDeleted += 1;
    this.musicDeleted(event);
  }.bind(this);

  this.mediaDB.onready = function() {
    console.log('ready');
    this.ready = true;
    this.mediaDB.scan();
    this.isReady();
  }.bind(this);

  this.mediaDB.onscanstart = function() { console.log('scanstart'); };

  this.mediaDB.onscanend = function() {
    console.log('scanend');
    if (this.numberCreated > 0 ||
        this.numberDeleted > 0){
      this.cache = {};
      this.musicChanged(this.numberCreated, this.numberDeleted);
    }
  }.bind(this);

}

MusicDB.prototype = {
  name: "MusicDB",
  getGenres: function(done){
    if (!this.ready){
      setTimeout(function(){ this.getGenres(done); }.bind(this), 100);
      return;
    }
    this.mediaDB.enumerateAll('metadata.genre', null, 'nextunique', 
        function(items){
          var genres = [];
          for (var i = 0; i < items.length; i++){
            var item = items[i];
            genres.push(item);
          }
          done(genres);
        }.bind(this));
  },
  returnCache: function(key, done){
    if (this.cache[key]){
      var cached = this.cache[key];
      setTimeout(function(){
        done(cached);
      }, 0);
      return true;
    }
    return false;
  },
  getArtists: function(genre, done){
    if (!this.ready){
      setTimeout(function(){ this.getArtists(genre, done); }.bind(this), 100);
      return;
    }
    var cacheKey = '__artists<' + genre + '>';
    if (this.returnCache(cacheKey, done))
      return;
    this.mediaDB.enumerateAll('metadata.artist', null, 'nextunique', 
        function(items){
          var artists = [];
          for (var i = 0; i < items.length; i++){
            var item = items[i];
            if (genre === '*' || item.metadata.genre === genre){
              artists.push(item);
            }
          }
          this.cache[cacheKey] = artists;
          done(artists);
        }.bind(this));
  },
  getAlbums: function(genre, artist, done){
    if (!this.ready){
      setTimeout(function(){ this.getAlbums(genre, artist, done); }.bind(this), 100);
      return;
    }
    var cacheKey = '__albums<' + genre + '><' + artist + '>';
    if (this.returnCache(cacheKey, done))
      return;
    this.mediaDB.enumerateAll('metadata.album', null, 'nextunique', 
        function(items){
          var albums = [];
          for (var i = 0; i < items.length; i++){
            var item = items[i];
            if (
              (genre === '*' || item.metadata.genre === genre) &&
              (artist === '*' || item.metadata.artist === artist)
            ){
              albums.push(item);
            }
          }
          this.cache[cacheKey] = albums;
          done(albums);
        }.bind(this));

  },
  getSongs: function(genre, artist, album, done){
    if (!this.ready){
      setTimeout(function(){ this.getSongs(genre, artist, album, done); }.bind(this), 100);
      return;
    }

    var filter = {
      genre: genre,
      artist: artist,
      album: album
    }

    if (album !== '*'){
      this.getWithFilter('metadata.album', album, filter, done);
    }
    else if (artist !== '*'){
      this.getWithFilter('metadata.artist', artist, filter, done);
    }
    else if (genre !== '*'){
      this.getWithFilter('metadata.genre', genre, filter, done);
    }
    else {
      this.getWithFilter('metadata.title', null, filter, done);
    }
  },
  getSong: function(title, done){
    if (!this.ready){
      setTimeout(function(){ this.getSong(title, done); }.bind(this), 100);
      return;
    }
    this.getWithFilter('metadata.title', title, {}, function(results){
      done(results[0]);
    });
  },
  search: function(search, done){
    search = search.toLowerCase().trim();
    this.getSongs('*', '*', '*', function(items){
      var artists = {};
      var albums = {};
      var songs = {};
      for (var i = 0; i < items.length; i++){
        var item = items[i];
        if (item.metadata.genre.toLowerCase().indexOf(search) !== -1){
          artists[item.metadata.artist] = item;
        }
        if (item.metadata.artist.toLowerCase().indexOf(search) !== -1){
          artists[item.metadata.artist] = item;
        }
        if (item.metadata.album.toLowerCase().indexOf(search) !== -1){
          albums[item.metadata.album] = item;
        }
        if (item.metadata.title.toLowerCase().indexOf(search) !== -1){
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
  getWithFilter: function(index, key, filter, done){
    var cacheKey = '__songs<' + index + '><' + key + '><' + JSON.stringify(filter) + '>';
    if (this.returnCache(cacheKey, done))
      return;
    var store = this.mediaDB.db.transaction('files').objectStore('files');
    store = store.index(index);
    var range = undefined;
    if (key !== null)
      range = IDBKeyRange.only(key);
    var results = [];
    store.openCursor(range).onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        for (prop in filter){
          if (filter[prop] !== '*' &&
              cursor.value.metadata[prop] !== filter[prop]){
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
    }.bind(this);
  },
  getAlbumArtAsURL: function(song, done){
    if (!this.ready){
      setTimeout(function(){ this.getAlbumArtAsURL(song, done); }.bind(this), 100);
      return;
    }
    getThumbnailURL(song, function(url){
      if (!url){
        url = 'style/images/AlbumArt10_small.png';
      }
      done(url); 
    });
  },
  logError: function(event){
      console.warn('ERROR:', event);
  }
}
