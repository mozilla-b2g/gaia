
'use strict';

var EvmeManager = (function() {

  var footerStyle = document.querySelector('#footer').style;
  var previousPage = GridManager.landingPageIndex;
  var everythingMeIndex = 0;

  var goToPageEventName = "goToPage";

  document.querySelector('#etmPage').addEventListener('transitionend', function transitionEnd(e) {
    var currentPage = GridManager.pageHelper.getCurrentPageNumber();

    if (previousPage !== currentPage) {
      if (currentPage === everythingMeIndex) {
        footerStyle.MozTransform = 'translateY(7.5rem)';
      } else {
        footerStyle.MozTransform = 'translateY(0)';
      }
      footerStyle.MozTransition = '-moz-transform .2s ease';
    }

    previousPage = currentPage;
  });

  function openApp(params) {
    (new EvmeApp({
      url: params.url,
      name: params.title,
      icon: params.icon
    })).launch();

    setVisibilityChange(false);
  }

  function addBookmark(params) {
    new MozActivity({
      name: 'save-bookmark',
      data: {
        type: 'url',
        url: params.url,
        name: params.title,
        icon: params.icon
      }
    });

    Core.detachBackground();
  }

  function setVisibilityChange(visible) {
    window.postMessage(JSON.stringify({
      type: 'visibilitychange',
      data: { hidden: !visible }
    }), '*');
  }

  return {
    openApp: openApp,

    addBookmark: addBookmark
  };

}());

var EvmeApp = function createEvmeApp(params) {
  Bookmark.call(this, params);
  this.manifest.wrapperMode = 'reuse';
};

extend(EvmeApp, Bookmark);
