var ViewEvents = function(){

  Utils.loadDomIds(this, [
      'selectPageContentOverlay',
      'currentMusicContentOverlay',

      'gotoSelectMusicPage',

      'toggleCurrentMusicPageView',

      'nowPlayingInfo',

      'nowPlayingControls',
  ]);

  this.router = new Router(this);

  this.router.declareRoutes([
    'gotoCurrentMusicPage',
    'gotoSelectMusicPage',
    'toggleCurrentMusicPageView',

    'startDragCurrentMusicPage',
    'dragCurrentMusicPage',
    'snapPositionCurrentMusicPage'
  ]);

  Utils.onButtonTap(this.dom.toggleCurrentMusicPageView, this.router.route('toggleCurrentMusicPageView'));
  Utils.onButtonTap(this.dom.nowPlayingInfo, this.router.route('gotoCurrentMusicPage'));
  Utils.onButtonTap(this.dom.gotoSelectMusicPage, this.router.route('gotoSelectMusicPage'));

  var dragManager = new DragManager(this.dom.nowPlayingControls);

  Router.proxy(dragManager, this, {
    'start': 'startDragCurrentMusicPage',
    'drag': 'dragCurrentMusicPage',
    'end': 'snapPositionCurrentMusicPage'
  });

  var dragManager = new DragManager(this.dom.gotoSelectMusicPage);

  Router.proxy(dragManager, this, {
    'start': 'startDragCurrentMusicPage',
    'drag': 'dragCurrentMusicPage',
    'end': 'snapPositionCurrentMusicPage'
  });
}

ViewEvents.prototype = {
  name: "ViewEvents",

}
