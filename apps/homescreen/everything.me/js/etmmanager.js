
'use strict';

var EvmeManager = (function() {

  function openApp(params) {
    var evmeApp = new EvmeApp({
      url: params.url,
      name: params.title,
      icon: params.icon
    });

    if (!Applications.isInstalled(params.url)) {
      evmeApp.manifest.bookmarkFeature = true;
    }

    evmeApp.launch();
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
  }

  function setVisibilityChange(visible) {
    window.postMessage(JSON.stringify({
      type: 'visibilitychange',
      data: { hidden: !visible }
    }), '*');
  }

  var footerStyle = document.querySelector('#footer').style;
  footerStyle.MozTransition = '-moz-transform .3s ease';

  document.querySelector('#etmPage').addEventListener('contextmenu',
    function longPress(evt) {
      evt.stopImmediatePropagation();
    }
  );

  return {
    openApp: openApp,

    addBookmark: addBookmark,

    show: function doShow() {
      footerStyle.MozTransform = 'translateY(75px)';
      Core.setOpacityBackground(1);
    },

    hide: function doHide() {
      footerStyle.MozTransform = 'translateY(0)';
      Core.setOpacityBackground(0);
    }
  };

}());

var EvmeApp = function createEvmeApp(params) {
  Bookmark.call(this, params);
  this.manifest.wrapperMode = 'reuse';
};

extend(EvmeApp, Bookmark);
