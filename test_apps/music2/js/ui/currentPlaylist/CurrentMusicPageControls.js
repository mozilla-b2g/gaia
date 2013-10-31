var CurrentMusicPageControls = function(){
  Utils.loadDomIds(this, [
    "playPrev",
    "togglePlay",
    "playNext",
  ]);

  this.router = new Router(this);
  this.seekBar = new SeekBar();

  this.nowPlaying = new NowPlaying();

  this.router.declareRoutes([
    'play',
    'pause',
    'playPrev',
    'playNext',
  ]);

  Utils.onButtonTap(this.dom.playPrev, this.router.route('playPrev'));
  Utils.onButtonTap(this.dom.playNext, this.router.route('playNext'));

  this.nowPlaying.router.when('togglePlaying', [this, 'togglePlaying']);

  Utils.onButtonTap(this.dom.togglePlay, this.togglePlaying.bind(this));
}

CurrentMusicPageControls.prototype = {
  name: "CurrentMusicPageControls",
  togglePlaying: function(){
    if (this.dom.togglePlay.classList.contains('pause')){
      this.router.route('pause')();
    }
    else {
      this.router.route('play')();
    }
  },
  setPlaying: function(){
    this.dom.togglePlay.classList.add('pause');
    this.nowPlaying.setPlaying();
    this.seekBar.enable();
  },
  setPaused: function(){
    this.dom.togglePlay.classList.remove('pause');
    this.nowPlaying.setPaused();
  },
  disable: function(){
    this.dom.togglePlay.classList.add('disabled');
    this.dom.playPrev.classList.add('disabled');
    this.dom.playNext.classList.add('disabled');

    this.dom.togglePlay.disabled = true;
    this.dom.playPrev.disabled = true;
    this.dom.playNext.disabled = true;
    this.seekBar.disable();

  },
  enable: function(){
    this.dom.togglePlay.classList.remove('disabled');
    this.dom.playPrev.classList.remove('disabled');
    this.dom.playNext.classList.remove('disabled');

    this.dom.togglePlay.disabled = false;
    this.dom.playPrev.disabled = false;
    this.dom.playNext.disabled = false;
  },
  disablePrev: function(){
    this.dom.playPrev.classList.add('disabled');
    this.dom.playPrev.disabled = true;
  },
  disableNext: function(){
    this.dom.playNext.classList.add('disabled');
    this.dom.playNext.disabled = true;
  },
  enablePrev: function(){
    this.dom.playPrev.classList.remove('disabled');
    this.dom.playPrev.disabled = false;
  },
  enableNext: function(){
    this.dom.playNext.classList.remove('disabled');
    this.dom.playNext.disabled = false;
  }
}

