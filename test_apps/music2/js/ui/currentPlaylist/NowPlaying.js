var NowPlaying = function(){
  Utils.loadDomIds(this, [
    "nowPlayingControls",
    "nowPlayingTogglePlay",

    'nowPlayingControls',
    "nowPlayingText",
    "nowPlayingNotificationText",
    "nowPlayingSourceImg"
  ]);

  this.router = new Router(this);

  this.router.declareRoutes([
    'togglePlaying',
  ]);

  Utils.onButtonTap(this.dom.nowPlayingTogglePlay, this.router.route('togglePlaying'));
}

NowPlaying.prototype = {
  name: "NowPlaying",
  show: function(){
    if (this.dom.nowPlayingControls.classList.contains('hidden')){
      this.dom.nowPlayingControls.classList.remove('hidden');
    }
  },
  hide: function(){
    this.dom.nowPlayingControls.classList.add('hidden');
  },
  setSource: function(){

  },
  temporarilyShowText: function(text, time){
    this.dom.nowPlayingNotificationText.textContent = text;
    setTimeout(function(){
      this.dom.nowPlayingNotificationText.classList.add('in');
      this.dom.nowPlayingText.classList.add('out');
    }.bind(this), 0);
    setTimeout(function(){
      this.dom.nowPlayingNotificationText.classList.remove('in');
      this.dom.nowPlayingText.classList.remove('out');
    }.bind(this), time);
  },
  setPlaying: function(){
    this.dom.nowPlayingTogglePlay.classList.add('pause');
  },
  setPaused: function(){
    this.dom.nowPlayingTogglePlay.classList.remove('pause');
  }
}
