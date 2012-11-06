
"use strict";

var EvmeManager = (function() {
    var currentWindow = null;

    function openApp(params) {
        var evmeApp = new EvmeApp({
            bookmarkURL: params.originUrl,
            name: params.title,
            icon: params.icon
        });

        if (currentWindow) {
            currentWindow.close();
        }
        currentWindow = evmeApp.launch(params.url, params.urlTitle);
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

    function openUrl(url) {
        new MozActivity({
           name: "view",
            data: {
                type: "url",
                url: url
            }
        });
    }

    return {
        openApp: openApp,

        addBookmark: addBookmark,

        isAppInstalled: function isAppInstalled(url) {
            return Applications.isInstalled(url);
        },

        openUrl: openUrl
    };
}());

var EvmeApp = function createEvmeApp(params) {
    Bookmark.call(this, params);
};

extend(EvmeApp, Bookmark);

EvmeApp.prototype.launch = function evmeapp_launch(url, name) {
    var features = {
      name: this.manifest.name.replace(/\s/g, '&nbsp;'),
      icon: this.manifest.icons['60']
    };

    if (!GridManager.getIconForBookmark(this.origin)) {
      features.origin = {
        name: features.name,
        url: encodeURIComponent(this.origin)
      };
    }

    if (url && url !== this.origin && !GridManager.getIconForBookmark(url)) {
      var searchName = navigator.mozL10n.get('wrapper-search-name', {
        topic: name,
        name: this.manifest.name
      }).replace(/\s/g, '&nbsp;');

      features.name = searchName;
      features.search = {
        name: searchName,
        url: encodeURIComponent(url)
      };
    }

    // The third parameter is received in window_manager without whitespaces
    // so we decice replace them for &nbsp;
    return window.open(url || this.origin, '_blank', JSON.stringify(features));
};
