var CurrentMusicPageSource = function(){
  Utils.loadDomIds(this, [
      "currentSourceView",
      "currentSourceInfo",
      "currentSourceImg",

      "nowPlayingText",
      "nowPlayingSourceImg"
  ]);
  window.router.on('setInfo', this.setInfo.bind(this));

  Utils.setupPassParent(this, 'hideCurrentSourceView');
  Utils.setupPassParent(this, 'showCurrentSourceView');

  var imgTapManager = new TapManager(this.dom.currentSourceImg);

  imgTapManager.ontap = this.toggleInfoVisibility.bind(this);
}

CurrentMusicPageSource.prototype = {
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
  setInfo: function(source){
    Utils.empty(this.dom.currentSourceInfo);
    Utils.empty(this.dom.nowPlayingText);
    this.dom.currentSourceImg.src = '';
    this.dom.nowPlayingSourceImg.src = '';

    if (source === null || source === undefined){
      this.hideCurrentSourceView();
      return;
    }
    source.setInfo(this.dom.currentSourceInfo);
    source.setAlbumArt(this.dom.currentSourceImg);

    source.setInfo(this.dom.nowPlayingText);
    source.setAlbumArt(this.dom.nowPlayingSourceImg);

    this.showCurrentSourceView();
  },
}


