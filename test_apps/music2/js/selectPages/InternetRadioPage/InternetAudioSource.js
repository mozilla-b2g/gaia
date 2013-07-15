var InternetAudioSource = function(station, url){
  this.station = station;
  this.url = url;
  this.loaded = false;
  this.state = 'stop';
}

InternetAudioSource.prototype = {
  load: function(audioPlayer, done){
    audioPlayer.src = this.url;
    this.loaded = true;
    done();
  },
  //=============================
  //  API
  //=============================
  play: function(audioPlayer){
    if (!this.loaded){
      this.load(audioPlayer, function(){
        audioPlayer.play();
      });
    }
    else {
      audioPlayer.play();
    }
    this.state = 'play';
  },
  pause: function(audioPlayer){
    audioPlayer.pause();
    this.state = 'pause';
  },
  stop: function(audioPlayer){
    if (this.state === 'stop')
      return;
    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    this.loaded = false;
    this.state = 'stop';
  },
  setInfo: function(infoDiv){
    var urlDiv = document.createElement('div');
    urlDiv.innerHTML = this.station.title;
    infoDiv.appendChild(urlDiv);
  },
  setAlbumArt: function(img){
    img.src = '';
  },
  getState: function(){
    return this.state;
  },
  getSerializable: function(){
    return {  'data': { 'url': this.url, 'station': this.station },
              'parentPageName': 'Internet Radio'
    };

  }
}

