'use strict';

var PlayingPlaylist = function() {
  this.playlist = null;
  this.index = null;

  this.playlistId = null;

  this.state = null;

  this.router = new Router(this);

  this.router.declareRoutes([
    'savePlaylistToPlaylists',
    'playSong',
    'pauseSong',
    'stopSong',
    'requestSourceFromSong',
    'playlistUpdated',
    'songStateUpdated',
    'becameSavable',
    'becameNotSavable',
    'save',
    'cantGoPrev',
    'cantGoNext',
    'canGoPrev',
    'canGoNext',
    'modeUpdated'
  ]);

  this.mode = null;
  this._updateMode('simple');

};

PlayingPlaylist.prototype = {
  name: 'playingPlaylist',
  //============== API ===============
  switchToPlaylist: function(playlist, playlistId) {
    this.playlist = playlist.copy();
    this.playlistId = playlistId;
    this.stop();
    this._updateMode('playlist');
    this._setPlaylist();
  },
  togglePlaylist: function(playlist, playlistId) {
    this.stop();
    if (this._playlistMatchesThis(playlistId))
      this.switchToSimpleMode();
    else
      this.switchToPlaylist(playlist, playlistId);
  },
  switchToSources: function(title, sources) {
    this.stop();
    sources = sources.map(function(song) {
      return this.router.route('requestSourceFromSong')(song);
    }.bind(this));
    this.playlist = new Playlist(title);
    for (var i = 0; i < sources.length; i++) {
      this.playlist.appendAudioSource(sources[i]);
    }
    this._updateMode('simple');
    this._setPlaylist();
    this.playlistId = null;
    this.play();
  },
  enqueue: function(title, songs) {
    if (this.playlist === null) {
      this.switchToSources(title, songs);
      this._save();
      this.stop();
    }
    else {
      songs = songs.map(function(song) {
        return this.router.route('requestSourceFromSong')(song);
      }.bind(this));
      var oldlength = this.playlist.list.length;
      this.playlist.list.push.apply(this.playlist.list, songs);
      if (oldlength === 0)
        this.stop();
      this._setPlaylist(); // TODO inefficient
      this._save();
    }
  },
  clearPlaylist: function() {
    this.stop();
    if (this.playlist.length > 0)
      this._save();
    this.playlist.list = [];
    this.index = null;
    this._setPlaylist();
  },
  shufflePlaylist: function() {
    var song = null;
    if (!this._atEnd() && !this._atBegin()) {
      song = this.playlist.list[this.index];
    }
    Utils.shuffleArray(this.playlist.list);
    for (var i = 0; i < this.playlist.list.length; i++) {
      if (this.playlist.list[i] === song) {
        this.index = i;
        break;
      }
    }
    if (this.playlist.list.length > 0)
      this._save();
    this._setPlaylist();
  },
  renamePlaylist: function(title) {
    this.playlist.title = title;
    this._save();
    this._setPlaylist(); //TODO inefficient
  },
  deleteItem: function(index) {

    if (this.index === index) {
      this.playNext();
    }
    else if (index < this.index) {
      this.index -= 1;
    }
    this.playlist.remove(index);
    this._save();
  },
  deletedPlaylist: function(playlistId) {
    if (this._playlistIdsMatch(playlistId)) {
      this.switchToSimpleMode();
    }
  },
  deletePlaylist: function() {
    this.router.route('becameNotSavable')();
    this.switchToSimpleMode();
  },
  simpleToPlaylist: function(title) {
    this.playlist.title = title;
    this._updateMode('playlist');
    this.router.route('becameSavable')();
    this._setPlaylist();
  },
  switchToSimpleMode: function() {
    this.stop();
    this.playlist.list = [];
    this.index = null;
    this.playlistId = null;
    this.state = null;
    this._updateMode('simple');
    this._setPlaylist();
  },
  renamedPlaylist: function(playlistId, newTitle) {
    if (this._playlistMatchesThis(playlistId)) {
      this.renamePlaylist(newTitle);
    }
  },
  createdPlaylist: function(playlist, playlistId) {
    if (this.mode !== 'playlist')
      this.switchToPlaylist(playlist, playlistId);
  },
  shuffledPlaylist: function(playlist, playlistId) {
    if (this._playlistMatchesThis(playlistId)) {
      var song = this.playlist.list[this.index];
      this.playlist = playlist.copy();
      if (this.playlist.list[this.index] !== song)
        this.index = this.playlist.list.indexOf(song);
      this._setPlaylist();
    }
  },
  deletedItemFromPlaylist: function(playlistId, index) {
    if (this._playlistMatchesThis(playlistId)) {
      this.deleteItem(index);
    }
  },
  addedToPlaylist: function(playlistId, playlist) {
    if (this._playlistMatchesThis(playlistId)) {
      var song = this.playlist.list[this.index];
      this.playlist = playlist.copy();
      if (this.playlist.list[this.index] !== song)
        this.index = this.playlist.list.indexOf(song);
      this._setPlaylist();
      this._songStateChanged();
    }
  },
  savePlaylist: function() {
    this.playlistId =
      this.router.route('savePlaylistToPlaylists')(this.playlist, null);
    this._setPlaylist();
    this.router.route('becameNotSavable')();
  },
  movedItemInPlaylist:
    function(playlistId, source, relativeSource, relativeDir) {
      if (this._playlistMatchesThis(playlistId)) {
        this.moveItem(playlistId, source, relativeSource, relativeDir);
      }
  },
  switchToItem: function(index) {
    if (index === this.index) {
      this.togglePlay();
    }
    else {
      this.stop();
      this.index = index;
      this.play();
    }
  },
  moveItem: function(playlistId, source, relativeSource, relativeDir) {
    var setIndex = this.playlist.list[this.index] === source;

    var sourceIndex = this.playlist.list.indexOf(source);
    if (sourceIndex < this.index)
      this.index -= 1;
    this.playlist.remove(sourceIndex);

    var relativeSourceIndex = this.playlist.list.indexOf(relativeSource);
    if (relativeDir === 'above') {
      if (this.index >= relativeSourceIndex)
        this.index += 1;
      this.playlist.list.splice(relativeSourceIndex, 0, source);
    }
    else if (relativeDir === 'below') {
      if (this.index > relativeSourceIndex)
        this.index += 1;
      this.playlist.list.splice(relativeSourceIndex + 1, 0, source);
    }
    if (setIndex) {
      this.index = this.playlist.list.indexOf(source);
    }

    this._save();
    this._setPlaylist(); //TODO inefficient
  },
  play: function() {
    if (this._atBegin() || this._atEnd()) {
      this.index = 0;
    }
    this.router.route('playSong')(this.playlist.list[this.index]);
    this.state = 'playing';
    this._songStateChanged();
  },
  togglePlay: function() {
    if (this.state === 'playing')
      this.pause();
    else
      this.play();
  },
  pause: function() {
    this.router.route('pauseSong')(this.playlist.list[this.index]);
    this.state = 'paused';
    this._songStateChanged();
  },
  stop: function(dontUpdateInfo) {
    if (this.playlist === null)
      return;
    this.router.route('stopSong')(this.playlist.list[this.index]);
    this.state = 'stopped';
    this._songStateChanged(dontUpdateInfo);
  },
  playNext: function() {
    var wasPlaying = this.state === 'playing';
    this.stop(true);
    if (!this._atEnd()) {
      this.index += 1;
    }
    if (!this._atEnd()) {
      if (wasPlaying)
        this.play();
      else
        this.pause();
    }
    else {
      this._songStateChanged();
    }
  },
  playPrev: function() {
    this.stop();
    if (!this._atBegin()) {
      this.index -= 1;
    }
    if (!this._atBegin()) {
      this.play();
    }
    else {
      this._songStateChanged();
    }
  },
  //============== helpers ===============
  _setPlaylist: function() {
    if (this.mode === 'simple')
      this.router.route('playlistUpdated')(this.playlist, null);
    else
      this.router.route('playlistUpdated')(this.playlist, this.playlistId);
  },
  _playlistMatchesThis: function(playlistId) {
    return this._playlistIdsMatch(playlistId);
  },
  _playlistIdsMatch: function(playlistId) {
    return '' + this.playlistId === '' + playlistId;
  },
  _save: function() {
    if (this.playlistId !== null) {
      this._setPlaylist(); //TODO inefficient
      this.router.route('save')(this.playlist, this.playlistId);
    }
  },
  _updateMode: function(mode) {
    if (this.mode !== mode) {
      this.mode = mode;
      this.router.route('modeUpdated')(this.mode);
    }
  },
  _songStateChanged: function(dontUpdateInfo) {
    var song;
    if (this.playlist.list.length !== 0) {
      if (this._atEnd() || this._atBegin())
        song = this.playlist.list[0];
      else
        song = this.playlist.list[this.index];
      this.router.route('songStateUpdated')(
        song, this.index, this.state, dontUpdateInfo
      );
    }
    if (this._atEnd()) {
      this.router.route('cantGoNext')();
    }
    else {
      this.router.route('canGoNext')();
    }
    if (this._atBegin()) {
      this.router.route('cantGoPrev')();
    }
    else {
      this.router.route('canGoPrev')();
    }
  },
  _atEnd: function() {
    if (this.index === null)
      return this.playlist.list.length === 0;
    return this.index >= this.playlist.list.length;
  },
  _atBegin: function() {
    return this.index === null || this.index < 0;
  }
};
