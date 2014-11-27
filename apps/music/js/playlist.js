/* exported Playlist */
/* m3u parsing. */
/*
 * http://tools.ietf.org/html/draft-pantos-http-live-streaming-14
 * http://en.wikipedia.org/wiki/M3U
 * http://forums.winamp.com/showthread.php?threadid=65772
 * http://schworak.com/blog/e39/m3u-play-list-specification/
 */
'use strict';


/*
 * API defined:
 * Playlist a class that encapsulate a playlist as well as its serialisation
 *
 * Constructor Playlist(path)
 *
 * Playlist.parse(path): contruct and parse a playlist from file.
 * Return a promise for it.
 */
function Playlist(path) {
  this._songs = [];
  this._directory = null;

  if (path) {
    this._directory = path;
    var idx = this._directory.lastIndexOf('/');
    if (idx !== -1) {
      this._directory = this._directory.slice(0, idx + 1);
    }
  }
}

Playlist.parse = function(path) {

  var promise = new Promise(
    function(resolve, reject) {
      var storage = navigator.getDeviceStorage('music');

      var request = storage.get(path);

      request.onsuccess = function() {
        var reader = new FileReader();
        var file = request.result;
        reader.readAsText(file);
        reader.onerror = function() {
          reject(new Error('Error reading: ' + path + ': ' + this.error));
        };
        reader.onload = function() {
          var pl = new Playlist(path);
          pl.fromString(reader.result);
          resolve(pl);
        };
      };

      request.onerror = function() {
        reject(new Error('Couldn\'t get path: ' + path + ': ' + this.error));
      };
    });

  return promise;
};

Playlist.isUrl = function(path) {
  var re = /^(https?|ftp|file|mms|rtmp):\//;

  return re.test(path);
};

Playlist.prototype = {

  get songs() {
    return this._songs;
  },

  get directory() {
    return this._directory;
  },

  // m3u state that path is either absolute or relative to the playlist
  _makeAbsolutePath: function(path) {
    if (!this._directory || Playlist.isUrl(path)) {
      return path;
    }

    if (path[0] === '/') {
      return path;
    }

    return this._directory + path;
  },

  /*
   * song is a path string.
   * index is the index to insert the song at. If -1 or undefined
   *  song is added at the end if the array.
   */
  addSong: function(song, index) {
    if (!song) {
      throw new Error('invalid');
    }
    var absPath = this._makeAbsolutePath(song);
    if (index === undefined || index === -1 || index >= this._songs.length) {
      this._songs.push(absPath);
    } else {
      this._songs.splice(index, 0, absPath);
    }
  },

  removeSong: function(path) {
    var absPath = this._makeAbsolutePath(path);
    var idx = this._songs.indexOf(absPath);
    if (idx != -1) {
      this._songs.splice(idx, 1);
    }
  },

  removeSongAt: function(index) {
    this._songs.splice(index, 1);
  },

  toString: function() {
    var content = '';
    content += '#EXTM3U\n';

    var entry;
    for (entry of this._songs) {
      content += entry + '\n';
    }
    return content;
  },

  fromString: function(content) {
    var lines = content.toString().split('\n');

    for (var i = 0; i < lines.length; i++){
      var line = lines[i].trim();
      if (line === '' || line.startsWith('#')) {
        continue;
      }

      this._songs.push(this._makeAbsolutePath(line));
    }
  }

};
