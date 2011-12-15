var Music = {
  playingSong: false,

  init: function musicInit() {
    var db = this.db;
    db.open(this.buildSongList);

    var self = this;
    var songList = document.getElementById('songs');
    songList.addEventListener('click', function songListClick(evt) {
      var target = evt.target;
      if (!target)
        return;

      db.getSong(target.id, function playSong(song) {
        self.playSong(song);
      });
    });

    window.addEventListener('keypress', function keyPressHandler(evt) {
      if (Music.playingSong && evt.keyCode == evt.DOM_VK_ESCAPE) {
        self.stopSong();
        self.showSongList();
        evt.preventDefault();
      }
    });

    self.showSongList();
  },

  buildSongList: function musicBuildSongList(songs) {
    var content = '';
    songs.forEach(function showMetadata(song) {
      content += '<li class="song">' +
                 '  <a id="' + song.id + '" href="#">' +
                 '    ' + song.title + ' - ' + song.artist +
                 '  </a>' +
                 '</li>';
    });
    document.getElementById('songs').innerHTML = content;
  },

  showSongList: function musicShowSongList(songs) {
    ['songs', 'musicHeader'].forEach(function hideElement(id) {
      document.getElementById(id).classList.remove('hidden');
    });

    ['player'].forEach(function showElement(id) {
      document.getElementById(id).classList.add('hidden');
    });

   this.playingSong = false;
  },

  playSong: function musicPlaySong(song) {
    ['songs', 'musicHeader'].forEach(function hideElement(id) {
      document.getElementById(id).classList.add('hidden');
    });

    ['player'].forEach(function showElement(id) {
      document.getElementById(id).classList.remove('hidden');
    });

    var playerAudio = document.getElementById('playerAudio');
    var src = 'data:audio/ogg;base64,' + song.data;
    playerAudio.setAttribute('src', src);

    Music.playingSong = true;
  },

  stopSong: function musicStopSong(song) {
    var playerAudio = document.getElementById('playerAudio');
    playerAudio.pause();
  }
};

Music.db = {
  _db: null,

  open: function dbOpen(callback) {
    const DB_NAME = 'music';
    var request = window.mozIndexedDB.open(DB_NAME, 5);

    var empty = false;
    request.onupgradeneeded = (function onUpgradeNeeded(evt) {
      this._db = evt.target.result;
      this._initialiseDB();
      empty = true;
    }).bind(this);

    request.onsuccess = (function onSuccess(evt) {
      this._db = evt.target.result;
      if (empty)
        this._fillDB();

      this.getSongList(callback);
    }).bind(this);

    request.onerror = (function onDatabaseError(error) {
      console.log('Database error: ', error);
    }).bind(this);
  },

  _initialiseDB: function dbInitialzeDB() {
    var db = this._db;
    var stores = ['metadata', 'audio'];
    stores.forEach(function createStore(store) {
      if (db.objectStoreNames.contains(store))
        db.deleteObjectStore(store);
      db.createObjectStore(store, { keyPath: 'id' });
    });
  },

  _fillDB: function dbFillDB() {
    var stores = ['metadata', 'audio'];
    var transaction = this._db.transaction(stores, IDBTransaction.READ_WRITE);

    var samples = [sample_metadata, sample_audio];
    stores.forEach(function populateStore(store, index) {
      var objectStore = transaction.objectStore(store);

      var sample = samples[index];
      for (var song in sample) {
        var request = objectStore.put(sample[song]);

        request.onsuccess = function onsuccess(e) {
          console.log('Added a new song to ' + store);
        }

        request.onerror = function onerror(e) {
          console.log('Error while adding an element to: ' + store);
        }
      }
    });
  },

  getSongList: function dbGetSongList(callback) {
    var transaction = this._db.transaction(['metadata'],
                                           IDBTransaction.READ_ONLY);
    var store = transaction.objectStore('metadata');
    var cursorRequest = store.openCursor(IDBKeyRange.lowerBound(0));

    var songList = [];
    cursorRequest.onsuccess = function onsuccess(e) {
      var result = e.target.result;
      if (!result) {
        callback(songList);
        return;
      }

      songList.push(result.value);
      result.continue();
    };

    cursorRequest.onerror = function onerror(e) {
      console.log('Error getting music metadata');
    };
  },

  getSong: function dbGetSong(id, callback) {
    var transaction = this._db.transaction(['audio'], IDBTransaction.READ_ONLY);
    var request = transaction.objectStore('audio').get(id);
    request.onsuccess = function onsuccess(e) {
      callback(e.target.result);
    };

    request.onerror = function onerror(e) {
      console.log('Error retrieving audio: ' + e);
    };
  }
};

window.addEventListener('DOMContentLoaded', function MusicInit() {
  Music.init();
});
