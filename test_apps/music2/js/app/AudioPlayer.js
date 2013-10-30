var AudioPlayer = function(){
  this.audioPlayer = document.getElementById('audioPlayer');

  this.router = new Router(this);

  this.router.declareRoutes([
    'isPlaying',
    'isStopped',
    'isEnded',
    'isPaused',
    'timeUpdated'
  ]);


  this.audioPlayer.addEventListener('play', this.router.route('isPlaying'));
  this.audioPlayer.addEventListener('pause', this.router.route('isPaused'));
  this.audioPlayer.addEventListener('timeupdate', this.timeupdateEvent.bind(this));
  this.audioPlayer.addEventListener('ended', this.router.route('isEnded'));
}

AudioPlayer.prototype = {
  name: "AudioPlayer",
  play: function(source){
    if (source !== undefined){
      source.play(this.audioPlayer);
    }
  },
  stop: function(source){
    if (source !== undefined){
      source.stop(this.audioPlayer);
      this.router.route('isStopped')();
    }
  },
  pause: function(source){
    if (source !== undefined)
      source.pause(this.audioPlayer);
  },
  setTime: function(time){
    if (this.audioPlayer.src)
      this.audioPlayer.currentTime = time;
  },
  timeupdateEvent: function(){
    this.router.route('timeUpdated')(Math.round(this.audioPlayer.currentTime), Math.round(this.audioPlayer.duration));
  },
}
