function ViewVisibility() {
  Utils.loadDomIds(this, [
      'selectPageContentOverlay',
      'currentMusicContentOverlay',
      'settingsDrawer',
      'sourcesMetaDrawer',
      'settingsMetaDrawer',
      'playlistDrawer',
      'currentMusicPage',
      'currentMusicPageHeaderTitle',
      'selectMusicPage',

      'gotoCurrentMusicPage',
      'gotoSelectMusicPage',
      'toggleMetaDrawer',
      'togglePlaylistDrawer',
      'gotoSettings',
      'gotoSources',

      'toggleCurrentMusicPageView',
      'currentSourceView',
      'currentPlaylistView',

      'mediaLibraryPagePanelItems'
  ]);
}

ViewVisibility.prototype = {
  showCurrentMusicPage: function(){
    if (this.locked)
      return;
    this.locked = true;

    var slide = function(){

      this.dom.selectMusicPage.classList.remove('center');
      this.dom.selectMusicPage.classList.add('left');

      this.dom.currentMusicPage.classList.remove('right');
      this.dom.currentMusicPage.classList.add('center');

      Utils.runEventOnce(this.dom.currentMusicPage, 'transitionend', function(){
        if (this.dom.currentSourceView.classList.contains('hidden'))
          this.dom.currentPlaylistView.classList.remove('hidden');
        TransitionUtils.fadeOut(this.dom.currentMusicContentOverlay, function(){
          this.locked = false;
        }.bind(this));
      }.bind(this));
    }.bind(this);

    TransitionUtils.fadeIn(this.dom.selectPageContentOverlay, function(){
      this.dom.currentMusicContentOverlay.classList.remove('hidden');
      this.dom.mediaLibraryPagePanelItems.classList.add('hidden');
      setTimeout(slide, 100);
    }.bind(this));



  },
  showSelectMusicPage: function(){
    if (this.locked)
      return;
    this.locked = true;

    var slide = function(){

      this.dom.selectMusicPage.classList.remove('left');
      this.dom.selectMusicPage.classList.add('center');

      this.dom.currentMusicPage.classList.remove('center');
      this.dom.currentMusicPage.classList.add('right');

      Utils.runEventOnce(this.dom.selectMusicPage, 'transitionend', function(){
        this.dom.mediaLibraryPagePanelItems.classList.remove('hidden');
        TransitionUtils.fadeOut(this.dom.selectPageContentOverlay, function(){
          this.locked = false;
        }.bind(this));
      }.bind(this));

    }.bind(this);

    TransitionUtils.fadeIn(this.dom.currentMusicContentOverlay, function(){
      this.dom.selectPageContentOverlay.classList.remove('hidden');
      this.dom.currentPlaylistView.classList.add('hidden');
      setTimeout(slide, 100);
    }.bind(this));

  },
  toggleSettingsDrawer: function(){
    if (this.locked)
      return;
    this.locked = true;

    var wasVisible = this.dom.selectMusicPage.classList.contains('partialRight');

    var slide = function(){
      this.dom.settingsDrawer.classList.toggle('in');
      this.dom.settingsDrawer.classList.toggle('out');

      this.dom.selectMusicPage.classList.toggle('center');
      this.dom.selectMusicPage.classList.toggle('partialRight');

      Utils.runEventOnce(this.dom.settingsDrawer, 'transitionend', function(){
        if (wasVisible){
          this.dom.mediaLibraryPagePanelItems.classList.remove('hidden');
          TransitionUtils.fadeOut(this.dom.selectPageContentOverlay, function(){
            this.locked = false;
          }.bind(this));
        }
        else {
          this.locked = false;
        }
      }.bind(this));
    }.bind(this);
    
    if (!wasVisible){
      TransitionUtils.fadeIn(this.dom.selectPageContentOverlay, function(){
        this.dom.mediaLibraryPagePanelItems.classList.add('hidden');
        setTimeout(slide, 100);
      }.bind(this));
    }
    else {
      slide();
    }
  },
  togglePlaylistDrawer: function(){
    if (this.locked)
      return;
    this.locked = true;

    var wasVisible = this.dom.currentMusicPage.classList.contains('partialLeft');

    var slide = function(){
      this.dom.playlistDrawer.classList.toggle('in');
      this.dom.playlistDrawer.classList.toggle('out');

      this.dom.currentMusicPage.classList.toggle('center');
      this.dom.currentMusicPage.classList.toggle('partialLeft');

      Utils.runEventOnce(this.dom.playlistDrawer, 'transitionend', function(){
        if (wasVisible){
          if (this.dom.currentSourceView.classList.contains('hidden'))
            this.dom.currentPlaylistView.classList.remove('hidden');
          TransitionUtils.fadeOut(this.dom.currentMusicContentOverlay, function(){
            this.locked = false;
          }.bind(this));
        }
        else {
          this.locked = false;
        }
      }.bind(this));
    }.bind(this);

    if (!wasVisible){
      TransitionUtils.fadeIn(this.dom.currentMusicContentOverlay, function(){
        this.dom.currentPlaylistView.classList.add('hidden');
        setTimeout(slide, 100);
      }.bind(this));
    }
    else {
      slide();
    }

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
  }
}

