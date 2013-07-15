var Playlist = function(title, temporary){
  this.list = [];
  this.title = title;
  this.currentIndex = null;
  this.temporary = temporary;
}

Playlist.prototype = {
  appendAudioSource: function(source){
    this.list.push(source);
  },
  getCurrentSource: function(){
    if (this.currentIndex === null)
      return null;
    return this.list[this.currentIndex];
  },
  stop: function(audioPlayer){
    if (this.currentIndex === null)
      return;
    audioPlayer.stop(this.list[this.currentIndex]);
  },
  play: function(audioPlayer){
    if (this.atBegin() || this.atEnd())
      this.currentIndex = 0;
    audioPlayer.play(this.list[this.currentIndex]);
  },
  pause: function(audioPlayer){
    if (this.currentIndex === null)
      return;
    audioPlayer.pause(this.list[this.currentIndex]);
  },
  atEnd: function(){
    if (this.currentIndex === null)
      this.list.length === 0;
    return this.currentIndex >= this.list.length;
  },
  atBegin: function(){
    return this.currentIndex === null;
  },
  deleteSource: function(source){
    var sourceIndex = this.list.indexOf(source);
    if (sourceIndex === -1)
      return;
    if (sourceIndex < this.currentIndex)
      this.currentIndex -= 1;
    this.list.splice(sourceIndex, 1);
  },
  insertSourceRelative: function(source, relativeSource, relativeDir){
    var relativeSourceIndex = this.list.indexOf(relativeSource);
    if (relativeSourceIndex === -1)
      return;
    if (relativeDir === 'above'){
      if(this.currentIndex >= relativeSourceIndex)
        this.currentIndex += 1;
      this.list.splice(relativeSourceIndex, 0, source);
    }
    else if (relativeDir === 'below'){
      if (this.currentIndex > relativeSourceIndex)
        this.currentIndex += 1;
      this.list.splice(relativeSourceIndex+1, 0, source);
    }
    else {
      console.warn('relativeDir in bad state: ' + relativeDir);
    }
  },
  setCurrentSource: function(source){
    var sourceIndex = this.list.indexOf(source);
    if (sourceIndex === -1)
      return;
    this.currentIndex = sourceIndex;
  },
  serialize: function(){
    var serialized = {};
    serialized.title = this.title;
    serialized.currentIndex = this.currentIndex;
    serialized.list = [];
    for (var i = 0; i < this.list.length; i++){
      serialized.list[i] = this.list[i].getSerializable();
    }
    return serialized;
  }
}

Playlist.unserialize = function(serializedPlaylist){
  var playlist = new Playlist(serializedPlaylist.title);
  playlist.currentIndex = serializedPlaylist.currentIndex;
  for (var i = 0; i < serializedPlaylist.list.length; i++){
    playlist.list[i] = window.router.call('unserialize', serializedPlaylist.list[i]);
  }
  return playlist;
}
