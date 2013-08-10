var MusicLibrary = function(){
  this.musicDB = new MusicDB();

  Router.route(this, [
    'loading',
    'doneLoading',
    'songRemoved',
    'songFound',
    'musicChanged',
  ]);

  setTimeout(function(){
    if (!this.musicDB.ready){
      this.loading();
    }
  }.bind(this), 1000);

  this.musicDB.onisReady = function(){
    this.doneLoading();
  }.bind(this);

  this.musicDB.onmusicDeleted = function(event){
    this.songRemoved(event.detail[0]);
  }.bind(this);

  this.musicDB.onmusicCreated = function(event){
    this.songFound(event.detail[0]);
  }.bind(this);

  this.musicDB.onmusicChanged = this.musicChanged.bind(this);
}

MusicLibrary.prototype = {
  name: "MusicLibrary",
  unserializeSong: function(song){
    return new FileAudioSource(this.musicDB, song.data);
  },
}
