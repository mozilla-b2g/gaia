var ViewEvents = function(){
  Utils.loadDomIds(this, [
      'selectPageContentOverlay',
      'currentMusicContentOverlay',

      'gotoCurrentMusicPage',
      'gotoSelectMusicPage',

      'toggleSettingsDrawer',
      'togglePlaylistDrawer',

      'toggleCurrentMusicPageView',

      'nowPlayingInfo'
  ]);

  Utils.setupPassParent(this, 'gotoCurrentMusicPage');
  Utils.setupPassParent(this, 'gotoSelectMusicPage');

  Utils.setupPassParent(this, 'toggleSettingsDrawer');
  Utils.setupPassParent(this, 'togglePlaylistDrawer');

  Utils.setupPassParent(this, 'toggleCurrentMusicPageView');

  Utils.onButtonTap(this.dom.gotoCurrentMusicPage, this.gotoCurrentMusicPage);
  Utils.onButtonTap(this.dom.gotoSelectMusicPage, this.gotoSelectMusicPage);

  Utils.onButtonTap(this.dom.toggleSettingsDrawer, this.toggleSettingsDrawer);
  Utils.onButtonTap(this.dom.togglePlaylistDrawer, this.togglePlaylistDrawer);

  Utils.onButtonTap(this.dom.toggleCurrentMusicPageView, this.toggleCurrentMusicPageView);

  Utils.onButtonTap(this.dom.nowPlayingInfo, this.gotoCurrentMusicPage);


  Utils.onButtonTap(this.dom.selectPageContentOverlay, this.toggleSettingsDrawer.bind(this));
  Utils.onButtonTap(this.dom.currentMusicContentOverlay, this.togglePlaylistDrawer.bind(this));

}

ViewEvents.prototype = {

}
