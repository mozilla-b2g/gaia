
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

    var footerStyle = document.querySelector("#footer").style;
    footerStyle.MozTransition = "-moz-transform .3s ease";

    var page = document.querySelector("#evmePage");
    page.addEventListener("contextmenu", function longPress(evt) {
        evt.stopImmediatePropagation();
    });

    page.addEventListener("pageshow", function onPageShow() {
        footerStyle.MozTransform = "translateY(75px)";
        Evme.setOpacityBackground(1);
    });

    page.addEventListener("pagehide", function onPageHide() {
        footerStyle.MozTransform = "translateY(0)";
        Evme.setOpacityBackground(0);
    });

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

// Initialize Evme
window.addEventListener("load", function() {
    Evme.init();
});
