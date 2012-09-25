
'use strict';

var EvmeManager = (function() {

  function openApp(params) {
    // TODO Evme guys will provide both URLs (specific search and origin)
    // params.origin is null currently, only specific search url
    var origin = params.origin || params.url;
    if (origin.indexOf('?') !== -1) {
      origin = origin.substring(0, origin.indexOf('?'));
    }

    var evmeApp = new EvmeApp({
      url: origin,
      name: params.title,
      icon: params.icon
    });

    if (!Applications.isInstalled(origin)) {
      evmeApp.manifest.addBookmarkActivity = true;
    }

    evmeApp.launch(params.url);
    setVisibilityChange(false);
  }

  function addBookmark(params) {
    var origin = params.url;
    // TODO Evme guys will provide the origin here -> This code should be
    // removed
    if (origin.indexOf('?') !== -1) {
      origin = origin.substring(0, origin.indexOf('?'));
    }

    new MozActivity({
      name: 'save-bookmark',
      data: {
        type: 'url',
        url: origin,
        name: params.title,
        icon: params.icon
      }
    });
  }

  function setVisibilityChange(visible) {
    Evme.visibilityChange(visible);
  }

  var footerStyle = document.querySelector('#footer').style;
  footerStyle.MozTransition = '-moz-transform .3s ease';

  document.querySelector('#evmePage').addEventListener('contextmenu',
    function longPress(evt) {
      evt.stopImmediatePropagation();
    }
  );

  return {
    openApp: openApp,

    addBookmark: addBookmark,

    show: function doShow() {
      footerStyle.MozTransform = 'translateY(75px)';
      Evme.setOpacityBackground(1);
    },

    hide: function doHide() {
      footerStyle.MozTransform = 'translateY(0)';
      Evme.setOpacityBackground(0);
    }
  };

}());

var EvmeApp = function createEvmeApp(params) {
  Bookmark.call(this, params);
  this.manifest.wrapperMode = 'reuse';
};

extend(EvmeApp, Bookmark);
