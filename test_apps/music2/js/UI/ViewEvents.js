var ViewEvents = function(){

  Utils.loadDomIds(this, [
      'selectPageContentOverlay',
      'currentMusicContentOverlay',

      'gotoSelectMusicPage',

      'toggleCurrentMusicPageView',

      'nowPlayingInfo'
  ]);

  Router.route(this, [
    'gotoCurrentMusicPage',
    'gotoSelectMusicPage',
    'toggleCurrentMusicPageView'
  ]);

  Utils.onButtonTap(this.dom.toggleCurrentMusicPageView, this.toggleCurrentMusicPageView);
  Utils.onButtonTap(this.dom.nowPlayingInfo, this.gotoCurrentMusicPage);
  Utils.onButtonTap(this.dom.gotoSelectMusicPage, this.gotoSelectMusicPage);

}

ViewEvents.prototype = {
  name: "ViewEvents",

}
