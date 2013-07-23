var CurrentMusicPageControls = function(){
  Utils.loadDomIds(this, [
      "playPrev",
      "togglePlay",
      "playNext",
      "nowPlayingControls",
      "nowPlayingTogglePlay"
  ]);
  this.seekBar = new SeekBar();

  Utils.setupPassParent(this, 'playPrev');
  Utils.setupPassParent(this, 'playNext');

  Utils.onButtonTap(this.dom.playPrev, this.playPrev);
  Utils.onButtonTap(this.dom.playNext, this.playNext);

  Utils.onButtonTap(this.dom.togglePlay, this.onTogglePlayTapped.bind(this));
  Utils.onButtonTap(this.dom.nowPlayingTogglePlay, this.onTogglePlayTapped.bind(this));
}

CurrentMusicPageControls.prototype = {
  onTogglePlayTapped: function(){
    if (this.dom.togglePlay.classList.contains('pause')){
      if (this.onpause)
        this.onpause();
    }
    else {
      if (this.onplay)
        this.onplay();
    }
  },
  setPlaying: function(){
    this.dom.togglePlay.classList.add('pause');
    this.dom.nowPlayingTogglePlay.classList.add('pause');
    this.seekBar.enable();
  },
  setPaused: function(){
    this.dom.togglePlay.classList.remove('pause');
    this.dom.nowPlayingTogglePlay.classList.remove('pause');
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
  }
}

