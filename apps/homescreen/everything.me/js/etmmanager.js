
'use strict';

var EvmeManager = (function() {
  var currentWindow = null;

  function openApp(params) {
    var evmeApp = new EvmeApp({
      url: params.originUrl,
      name: params.title,
      icon: params.icon
    });

    if (currentWindow) {
      currentWindow.close();
    }
    currentWindow = evmeApp.launch(true);
    setVisibilityChange(false);
  }

  function addBookmark(params) {
    var data = {
      url: params.originUrl,
      name: params.title,
      icon: params.icon
    }

    function success() {
      Applications.installBookmark(new Bookmark(data));
    }

    function error() {
      // Anything to do in case of error?
    }

    HomeState.saveBookmark(data, success, error);
  }

  function setVisibilityChange(visible) {
    Evme.visibilityChange(visible);
  }
  
  function openUrl(url) {
    new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    });
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
    },
    
    isAppInstalled: function(url) {
        return Applications.isInstalled(url);
    },
    
    openUrl: openUrl
  };

}());

var EvmeApp = function createEvmeApp(params) {
  Bookmark.call(this, params);
  this.manifest.wrapperMode = 'reuse';
};

extend(EvmeApp, Bookmark);

// Initialize Evme
window.addEventListener("load", function() {
//document.addEventListener("DOMContentLoaded", function() {
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  Evme.init({
      "gaiaDomain": domain
  }); 
});
