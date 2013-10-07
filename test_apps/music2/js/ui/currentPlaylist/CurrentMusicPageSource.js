var CurrentMusicPageSource = function(){
  Utils.loadDomIds(this, [
      "currentSourceView",
      "currentSourceInfo",
      "currentSourceImg",
      "currentSourceFavorite",

      "nowPlayingText",
      "nowPlayingSourceImg",
      "nowPlayingTogglePlay"
  ]);

  this.router = new Router(this);

  this.router.declareRoutes([
    'hideCurrentSourceView',
    'showCurrentSourceView',
  ]);

  var imgTapManager = new TapManager(this.dom.currentSourceImg);

  imgTapManager.router.when('tap', [this, 'toggleInfoVisibility']);

  this.clearListener = null;

  Utils.onButtonTap(this.dom.currentSourceFavorite, this.toggleFavorite.bind(this));
}

CurrentMusicPageSource.prototype = {
  name: "CurrentMusicPageSource",
  toggleInfoVisibility: function(){
    if (!this.dom.currentSourceInfo.classList.contains('hidden')){
      var y = -this.dom.currentSourceInfo.offsetHeight;
      this.dom.currentSourceInfo.style.transform = 'translateY(' + y + 'px)';
      Utils.runEventOnce(this.dom.currentSourceInfo, 'transitionend', function(){
        this.dom.currentSourceInfo.classList.add('hidden');
      }.bind(this));

      var y = this.dom.currentSourceFavorite.offsetHeight;

      this.dom.currentSourceFavorite.style.transform = 'translateY(' + y + 'px)';
      Utils.runEventOnce(this.dom.currentSourceFavorite, 'transitionend', function(){
        this.dom.currentSourceFavorite.classList.add('hidden');
      }.bind(this));
    }
    else {
      this.dom.currentSourceInfo.classList.remove('hidden');
      Utils.putOnEventQueue(function(){
        this.dom.currentSourceInfo.style.transform = 'translateY(0px)';
      }.bind(this));

      this.dom.currentSourceFavorite.classList.remove('hidden');
      Utils.putOnEventQueue(function(){
        this.dom.currentSourceFavorite.style.transform = 'translateY(0px)';
      }.bind(this));
    }
  },
  toggleFavorite: function(){
    window.musicLibrary.musicDB.toggleSongFavorited(this.song);
  },
  setInfo: function(source, state){
    Utils.empty(this.dom.currentSourceInfo);
    Utils.empty(this.dom.nowPlayingText);

    if (this.clearListener)
      this.clearListener();

    if (source){
      this.dom.nowPlayingTogglePlay.classList.remove('hidden');

      source.setInfo(this.dom.currentSourceInfo);
      source.getAlbumArt(function(url){
        url = 'url("' + url + '")';
        this.dom.currentSourceImg.style.backgroundImage = url;
      }.bind(this));

      source.setInfo(this.dom.nowPlayingText);
      source.setAlbumArt(this.dom.nowPlayingSourceImg);

      this._updateIsFavorite(source.song.metadata.favorited);
      this.song = source.song;
      this.clearListener = window.musicLibrary.musicDB.registerSongFavoriteChangeListener(source.song, this._updateIsFavorite.bind(this));

    }
    else {
      this.dom.nowPlayingTogglePlay.classList.add('hidden');
      var titleDiv = document.createElement('div');
      titleDiv.textContent = 'playlist empty';
      this.dom.nowPlayingText.appendChild(titleDiv);

      this.dom.currentSourceImg.src = '';
      this.dom.nowPlayingSourceImg.src = '';
    }

    if (state === 'stopped'){
      this.router.route('hideCurrentSourceView')();
    }
    else {
      this.router.route('showCurrentSourceView')();
    }
  },
  _updateIsFavorite: function(isFavorite){
    if (isFavorite)
      this.dom.currentSourceFavorite.classList.add('favorited');
    else
      this.dom.currentSourceFavorite.classList.remove('favorited');
  }
}


