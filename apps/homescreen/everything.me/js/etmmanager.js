
'use strict';

var EvmeManager = (function() {

  function openApp(params) {
    var evmeApp = new EvmeApp({
      url: params.originUrl,
      name: params.title,
      icon: params.icon
    });

    if (!Applications.isInstalled(params.originUrl)) {
      evmeApp.manifest.addBookmarkActivity = true;
    }

    evmeApp.launch(params.url);
    setVisibilityChange(false);
  }

  function addBookmark(params) {
    new MozActivity({
      name: 'save-bookmark',
      data: {
        type: 'url',
        url: params.originUrl,
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

// Initialize Evme
document.addEventListener("DOMContentLoaded", function() {
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  Evme.init({
      "gaiaDomain": domain
  }); 
});
