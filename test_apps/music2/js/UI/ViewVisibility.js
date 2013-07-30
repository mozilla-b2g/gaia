function ViewVisibility() {
  Utils.loadDomIds(this, [
      'currentMusicContentOverlay',
      'currentMusicPage',
      'selectMusicPage',

      'toggleCurrentMusicPageView',
      'currentSourceView',
      'currentPlaylistView'
  ]);
}

ViewVisibility.prototype = {
  name: "ViewVisibility",
  showCurrentMusicPage: function(){
    if (this.locked || this.dom.currentMusicPage.classList.contains('center'))
      return;
    this.locked = true;

    var slide = function(){

      this.dom.currentMusicPage.classList.remove('bottom');
      this.dom.currentMusicPage.classList.add('center');

      Utils.runEventOnce(this.dom.currentMusicPage, 'transitionend', function(){
        if (this.dom.currentSourceView.classList.contains('hidden'))
          this.dom.currentPlaylistView.classList.remove('hidden');
        TransitionUtils.fadeOut(this.dom.currentMusicContentOverlay, function(){
          this.locked = false;
        }.bind(this));
      }.bind(this));
    }.bind(this);

    this.dom.currentMusicContentOverlay.classList.remove('hidden');
    setTimeout(slide, 100);

  },
  showSelectMusicPage: function(){
    if (this.locked || this.dom.currentMusicPage.classList.contains('bottom'))
      return;
    this.locked = true;

    var slide = function(){

      this.dom.currentMusicPage.classList.remove('center');
      this.dom.currentMusicPage.classList.add('bottom');

      Utils.runEventOnce(this.dom.currentMusicPage, 'transitionend', function(){
        this.locked = false;
      }.bind(this));

    }.bind(this);

    TransitionUtils.fadeIn(this.dom.currentMusicContentOverlay, function(){
      this.dom.currentPlaylistView.classList.add('hidden');
      setTimeout(slide, 100);
    }.bind(this));

  },
  toggleCurrentMusicPageView: function(){
    if (this.locked)
      return;
    this.locked = true;

    if (this.dom.toggleCurrentMusicPageView.classList.contains('switchSong')){
      this.dom.currentSourceView.classList.remove('hidden');
      this.dom.currentPlaylistView.classList.add('hidden');
    }
    else {
      this.dom.currentSourceView.classList.add('hidden');
      this.dom.currentPlaylistView.classList.remove('hidden');
    }
    this.dom.toggleCurrentMusicPageView.classList.toggle('switchSong');

    this.locked = false;
  },
  showCurrentMusicPlaylistView: function(){
    if (!this.dom.toggleCurrentMusicPageView.classList.contains('switchSong')){
      this.toggleCurrentMusicPageView();
    }
  }
}

