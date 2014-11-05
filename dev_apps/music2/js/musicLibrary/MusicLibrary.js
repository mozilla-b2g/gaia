'use strict';

var MusicLibrary = function() {
  this.musicDB = new MusicDB();

  this.router = new Router(this);

  this.router.declareRoutes([
    'loading',
    'doneLoading',
    'songRemoved',
    'songFound',
    'musicChanged'
  ]);

  setTimeout(function() {
    if (!this.musicDB.ready) {
      this.router.route('loading')();
    }
  }.bind(this), 1000);

  this.musicDB.router.when('musicDeleted', [this, '_musicDeleted']);
  this.musicDB.router.when('musicCreated', [this, '_musicCreated']);

  Router.proxy([this.musicDB, 'isReady'], [this, 'doneLoading']);
  Router.proxy([this.musicDB, 'musicChanged'], [this, 'musicChanged']);
  Router.proxy([this.musicDB, 'noMusic'], [this, 'noMusic']);
};

MusicLibrary.prototype = {
  name: 'MusicLibrary',
  unserializeSong: function(song) {
    return new FileAudioSource(this.musicDB, song.data);
  },
  _musicDeleted: function(event) {
    this.router.route('songRemoved')(event.detail[0]);
  },
  _musicCreated: function(event) {
    this.router.route('songFound')(event.detail[0]);
  }
};
