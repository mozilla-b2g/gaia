
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
    
    function menuShow() {
        footerStyle.MozTransform = "translateY(0)";
    }
    
    function menuHide() {
        footerStyle.MozTransform = "translateY(75px)";
    }

    var footerStyle = document.getElementById("footer").style;
    footerStyle.MozTransition = "-moz-transform .3s ease";
    
    function getMenuHeight() {
        return document.getElementById("footer").offsetHeight;
    }
    
    function getApps() {
        return Applications.getAll();
    }
    
    function getAppIcon(app) {
        return Applications.getIcon(app.origin);
    }
    function getAppName(app) {
        return Applications.getName(app.origin);
    }

    return {
        openApp: openApp,

        addBookmark: addBookmark,

        isAppInstalled: function isAppInstalled(url) {
            return Applications.isInstalled(url);
        },
        getApps: getApps,
        getAppIcon: getAppIcon,
        getAppName: getAppName,

        openUrl: openUrl,
        
        menuShow: menuShow,
        menuHide: menuHide,
        getMenuHeight: getMenuHeight
    };
}());

var EvmeApp = function createEvmeApp(params) {
    Bookmark.call(this, params);
};

extend(EvmeApp, Bookmark);
