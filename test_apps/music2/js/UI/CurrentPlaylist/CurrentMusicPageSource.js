var CurrentMusicPageSource = function(){
  Utils.loadDomIds(this, [
      "currentSourceView",
      "currentSourceInfo",
      "currentSourceImg",

      "nowPlayingText",
      "nowPlayingSourceImg"
  ]);

  Router.route(this, [
    'hideCurrentSourceView',
    'showCurrentSourceView',
  ]);

  var imgTapManager = new TapManager(this.dom.currentSourceImg);

  imgTapManager.ontap = this.toggleInfoVisibility.bind(this);
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
    }
    else {
      this.dom.currentSourceInfo.classList.remove('hidden');
      Utils.putOnEventQueue(function(){
        this.dom.currentSourceInfo.style.transform = 'translateY(0px)';
      }.bind(this));
    }
  },
  setInfo: function(source, state){
    Utils.empty(this.dom.currentSourceInfo);
    Utils.empty(this.dom.nowPlayingText);
    this.dom.currentSourceImg.src = '';
    this.dom.nowPlayingSourceImg.src = '';

    source.setInfo(this.dom.currentSourceInfo);
    source.setAlbumArt(this.dom.currentSourceImg);

    source.setInfo(this.dom.nowPlayingText);
    source.setAlbumArt(this.dom.nowPlayingSourceImg);

    if (state === 'stopped'){
      this.hideCurrentSourceView();
    }
    else {
      this.showCurrentSourceView();
    }
  },
}


