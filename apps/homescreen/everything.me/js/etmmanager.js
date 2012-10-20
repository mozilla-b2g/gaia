
"use strict";

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
