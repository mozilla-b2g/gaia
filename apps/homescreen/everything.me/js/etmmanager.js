
'use strict';

var EvmeManager = (function() {

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

  var footerStyle = document.querySelector('#footer').style;
  footerStyle.MozTransition = '-moz-transform .3s ease';

  return {
    openApp: openApp,

    addBookmark: addBookmark,

    show: function doShow() {
      footerStyle.MozTransform = 'translateY(75px)';
      Core.goToPage(1, 0);
    },

    hide: function doHide() {
      footerStyle.MozTransform = 'translateY(0)';
      Core.goToPage(0, 1);
    }
  };

}());

var EvmeApp = function createEvmeApp(params) {
  Bookmark.call(this, params);
  this.manifest.wrapperMode = 'reuse';
};

extend(EvmeApp, Bookmark);
