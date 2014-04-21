'use strict';

var FileAudioSource = function(musicDB, song) {
  this.song = song;
  this.musicDB = musicDB;
  this.loaded = false;
  this.state = 'stop';
};

FileAudioSource.prototype = {
  load: function(audioPlayer, done) {
    this.loaded = true;
    this.musicDB.getFile(this.song.name, function(file) {
      var url = URL.createObjectURL(file);
      audioPlayer.removeAttribute('src');
      audioPlayer.load();
      audioPlayer.mozAudioChannelType = 'content';
      audioPlayer.src = url;
      audioPlayer.load();
      done();
    }.bind(this));
  },
  //=============================
  //  API
  //=============================
  play: function(audioPlayer) {
    if (!this.loaded) {
      this.load(audioPlayer, function() {
        if (this.state === 'play')
          audioPlayer.play();
      }.bind(this));
    }
    else {
      audioPlayer.play();
    }
    this.state = 'play';
  },
  pause: function(audioPlayer) {
    audioPlayer.pause();
    this.state = 'pause';
  },
  stop: function(audioPlayer) {
    if (this.state === 'stop')
      return;
    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    this.loaded = false;
    this.state = 'stop';
  },
  setInfo: function(infoDiv) {
    var titleDiv = document.createElement('div');
    var albumDiv = document.createElement('div');
    var artistDiv = document.createElement('div');
    titleDiv.textContent = this.song.metadata.title;
    albumDiv.textContent = this.song.metadata.album;
    artistDiv.textContent = this.song.metadata.artist;
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(albumDiv);
    infoDiv.appendChild(artistDiv);
  },
  setAlbumArt: function(img) {
    this.getAlbumArt(function(url) {
      img.src = url;
    });
  },
  getAlbumArt: function(done) {
    this.musicDB.getAlbumArtAsURL(this.song, done);
  },
  hasSameAlbumArt: function(other) {
    return this.song.metadata.album === other.song.metadata.album;
  },
  getState: function() {
    return this.state;
  },
  getSerializable: function() {
    return { 'data': this.song, 'parentPageName': 'Music Library' };
  }
};
