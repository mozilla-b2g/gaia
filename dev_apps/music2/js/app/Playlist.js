'use strict';

var Playlist = function(title) {
  this.list = [];
  this.title = title;
};

Playlist.prototype = {
  appendAudioSource: function(source) {
    this.list.push(source);
  },
  copy: function() {
    var playlist = new Playlist(this.title);
    playlist.list = Utils.copyArray(this.list);
    return playlist;
  },
  remove: function(index) {
    this.list.splice(index, 1);
  },
  serialize: function() {
    var serialized = {};
    serialized.title = this.title;
    serialized.list = [];
    for (var i = 0; i < this.list.length; i++) {
      serialized.list[i] = this.list[i].getSerializable();
    }
    return serialized;
  }
};

Playlist.unserialize = function(serializedPlaylist) {
  var playlist = new Playlist(serializedPlaylist.title);
  for (var i = 0; i < serializedPlaylist.list.length; i++) {
    playlist.list[i] =
      window.musicLibrary.unserializeSong(serializedPlaylist.list[i]);
  }
  return playlist;
};
