
'use strict';

var EvmeManager = (function() {

  function openApp(params) {
    var url = params.url;

    var evmeApp = new EvmeApp({
      url: url,
      name: params.title,
      icon: params.icon
    });

    //TODO Evme guys will provide both URLs (specific search and bookmark URLs)
    if (url.indexOf('?') !== -1) {
      url = url.substring(0, url.indexOf('?'));
    }

    if (!Applications.isInstalled(url)) {
      evmeApp.manifest.bookmarkURL = url;
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
